// Gera os dados do site a partir do TSE.
//   node scripts/gerar-dados.mjs historico [ano ...] [--forcar]   → public/data/historico/ANO-tTURNO.json (commitado, nunca mais muda)
//   node scripts/gerar-dados.mjs atual                            → public/data/atual/ANO-tTURNO.json (gerado pelo workflow, não commitado)
// Para cada ciclo tenta a API de resultados do TSE; se ela não tiver o ano (404), baixa o CSV dos
// Dados Abertos e agrega aqui mesmo.
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { API, CDN, getJson, paralelo, baixar, splitLine, lerCsvDoZip, pad } from './lib/tse.mjs';

const UF = 'PB';
const CARGOS = ['1', '3', '5', '6', '7'];          // presidente, governador, senador, deputado federal e estadual
const COM_2_TURNO = ['1', '3'];                    // só presidente e governador têm 2º turno
const ANOS_HISTORICO = ['2014', '2018', '2022'];   // eleições gerais anteriores
const TMP = 'tmp';
const TSE_IBGE = JSON.parse(await readFile('public/data/tse-ibge-pb.json', 'utf8'));
const ibgeDe = cd => TSE_IBGE[String(parseInt(cd, 10))] || null;

const [modo, ...resto] = process.argv.slice(2);
const forcar = resto.includes('--forcar');
const anosArg = resto.filter(a => /^\d{4}$/.test(a));

// ---------- API de resultados (dados por município e cargo) ----------
async function viaApi(ano) {
  const cfg = await getJson(`${API}/comum/config/ele-c.json`);
  const elei = (cfg?.pl || []).filter(p => p.c === `ele${ano}`).flatMap(p => p.e).filter(e => e.tp === '1' || e.tp === '8');
  if (!elei.length) return null;                   // a API só guarda o ciclo atual e o anterior
  const ref = elei.find(e => e.tp === '1') || elei[0];
  const cm = await getJson(`${API}/ele${ano}/${ref.cd}/config/mun-e${pad(ref.cd, 6)}-cm.json`);
  const mu = cm?.abr?.find(a => a.cd === UF.toLowerCase())?.mu;
  if (!mu?.length) return null;

  const porTurno = {};
  for (const e of elei) {
    const cargos = (e.abr?.[0]?.cp || []).map(c => c.cd).filter(c => CARGOS.includes(c));
    for (const [turno, ele] of [['1', e.cd], ['2', e.cdt2]]) {
      if (!ele) continue;
      for (const cargo of cargos.filter(c => turno === '1' || COM_2_TURNO.includes(c))) {
        const base = `${API}/ele${ano}/${ele}/dados/${UF.toLowerCase()}`;
        const arq = (sufixo) => `${base}/${UF.toLowerCase()}${sufixo}-c${pad(cargo, 4)}-e${pad(ele, 6)}-u.json`;
        const uf = await getJson(arq(''));
        if (!uf) continue;                         // ainda não existe (por exemplo, 2º turno que não aconteceu)
        const ds = porTurno[turno] ||= { cands: new Map(), tot: {}, final: true, atualizadoEm: null };
        ds.final &&= uf.and === 'f'; ds.atualizadoEm = `${uf.dg?.split('/').reverse().join('-')}T${uf.hg}`;
        await paralelo(mu, 6, async m => {
          const j = await getJson(arq(m.cd));
          const car = j?.carg?.[0]; if (!car) return;
          const tk = `${ano}|${turno}|${cargo}`;
          for (const agr of car.agr || []) for (const par of agr.par || []) for (const c of par.cand || []) {
            const v = parseInt(c.vap, 10) || 0; if (!v) continue;
            const key = `${tk}|${c.sqcand}`;
            let k = ds.cands.get(key);
            if (!k) { k = { key, ano, turno, cargo, cargoNome: car.nmn, nr: c.n, urna: c.nmu, nome: c.nm, partido: par.sg || '', sit: c.st || '', total: 0, mun: {} }; ds.cands.set(key, k); }
            k.mun[m.cdi] = (k.mun[m.cdi] || 0) + v; k.total += v;
            (ds.tot[tk] ||= {})[m.cdi] = (ds.tot[tk][m.cdi] || 0) + v;
          }
        });
        console.log(`  API ${ano} t${turno} cargo ${cargo}: ok`);
      }
    }
  }
  return Object.keys(porTurno).length ? { fonte: 'api', porTurno } : null;
}

// ---------- CSV dos Dados Abertos (votação nominal por município e zona) ----------
async function viaCsv(ano) {
  const zip = `${TMP}/munzona-${ano}.zip`;
  if (!await baixar(`${CDN}/votacao_candidato_munzona/votacao_candidato_munzona_${ano}.zip`, zip)) return null;
  const porTurno = {}; let ix = null, vk = null; const semMun = new Set();
  const REQ = ['ANO_ELEICAO', 'NR_TURNO', 'SG_UF', 'CD_MUNICIPIO', 'CD_CARGO', 'DS_CARGO', 'SQ_CANDIDATO', 'NR_CANDIDATO', 'NM_URNA_CANDIDATO', 'SG_PARTIDO'];
  await lerCsvDoZip(zip, new RegExp(`_${UF}\\.csv$`, 'i'), (l, cab) => {
    if (cab) {
      const h = splitLine(l).map(x => x.trim().toUpperCase()); ix = Object.fromEntries(h.map((k, i) => [k, i]));
      vk = h.includes('QT_VOTOS_NOMINAIS_VALIDOS') ? 'QT_VOTOS_NOMINAIS_VALIDOS' : 'QT_VOTOS_NOMINAIS';
      const falta = REQ.filter(k => ix[k] == null); if (falta.length || ix[vk] == null) throw new Error(`Colunas ausentes no CSV de ${ano}: ${falta.concat(ix[vk] == null ? [vk] : []).join(', ')}`);
      return;
    }
    const c = splitLine(l);
    const cargo = c[ix.CD_CARGO];
    if (c[ix.SG_UF] !== UF || !CARGOS.includes(cargo) || c[ix.ANO_ELEICAO] !== ano) return;
    const ibge = ibgeDe(c[ix.CD_MUNICIPIO]); if (!ibge) { semMun.add(c[ix.CD_MUNICIPIO]); return; }
    const v = parseInt(c[ix[vk]], 10) || 0, turno = c[ix.NR_TURNO], tk = `${ano}|${turno}|${cargo}`, key = `${tk}|${c[ix.SQ_CANDIDATO]}`;
    const ds = porTurno[turno] ||= { cands: new Map(), tot: {}, final: true, atualizadoEm: null };
    let k = ds.cands.get(key);
    if (!k) { k = { key, ano, turno, cargo, cargoNome: c[ix.DS_CARGO], nr: c[ix.NR_CANDIDATO], urna: c[ix.NM_URNA_CANDIDATO], nome: ix.NM_CANDIDATO != null ? c[ix.NM_CANDIDATO] : '', partido: c[ix.SG_PARTIDO], sit: '', total: 0, mun: {} }; ds.cands.set(key, k); }
    const sit = ix.DS_SIT_TOT_TURNO != null ? c[ix.DS_SIT_TOT_TURNO] : '';
    if (sit && !/^#/.test(sit)) k.sit = sit;
    k.mun[ibge] = (k.mun[ibge] || 0) + v; k.total += v;
    (ds.tot[tk] ||= {})[ibge] = (ds.tot[tk][ibge] || 0) + v;
  });
  if (semMun.size) console.warn(`  CSV ${ano}: municípios sem correspondência IBGE: ${[...semMun].join(', ')}`);
  return Object.keys(porTurno).length ? { fonte: 'csv', porTurno } : null;
}

// ---------- Votos por local de votação (CSV por seção; só traz o nome do local de 2018 em diante) ----------
const MIN_DIG = { '1': 2, '3': 2, '5': 3, '6': 4, '7': 5 };
async function locaisViaCsv(ano) {
  const zip = `${TMP}/secao-${ano}-${UF}.zip`;
  if (!await baixar(`${CDN}/votacao_secao/votacao_secao_${ano}_${UF}.zip`, zip)) return null;
  const porTurno = {}; let ix = null;
  await lerCsvDoZip(zip, new RegExp(`_${UF}\\.csv$`, 'i'), (l, cab) => {
    if (cab) { ix = Object.fromEntries(splitLine(l).map((k, i) => [k.trim().toUpperCase(), i])); if (ix.NM_LOCAL_VOTACAO == null) throw new Error('sem nome de local'); return; }
    const c = splitLine(l), cargo = c[ix.CD_CARGO], nr = c[ix.NR_VOTAVEL];
    if (c[ix.SG_UF] !== UF || !MIN_DIG[cargo] || nr.length < MIN_DIG[cargo] || nr === '95' || nr === '96' || c[ix.ANO_ELEICAO] !== ano) return;
    const ibge = ibgeDe(c[ix.CD_MUNICIPIO]); if (!ibge) return;
    const t = porTurno[c[ix.NR_TURNO]] ||= { locais: {}, idx: {}, votos: {} };
    const lk = c[ix.NR_ZONA] + '|' + c[ix.NR_LOCAL_VOTACAO], arr = t.locais[ibge] ||= [], mapa = t.idx[ibge] ||= new Map();
    let i = mapa.get(lk); if (i == null) { i = arr.length; mapa.set(lk, i); arr.push({ n: c[ix.NM_LOCAL_VOTACAO].trim() || `Local ${c[ix.NR_LOCAL_VOTACAO]} (zona ${c[ix.NR_ZONA]})` }); }
    const m = ((t.votos[cargo + '|' + nr] ||= {})[ibge] ||= {}); m[i] = (m[i] || 0) + (parseInt(c[ix.QT_VOTOS], 10) || 0);
  });
  return Object.fromEntries(Object.entries(porTurno).map(([tn, t]) => [tn, { locais: t.locais, votos: t.votos }]));
}

// ---------- Saída ----------
async function escrever(dir, ano, res, locais) {
  await mkdir(dir, { recursive: true });
  for (const [turno, ds] of Object.entries(res.porTurno)) {
    const cands = [...ds.cands.values()].sort((a, b) => a.cargo.localeCompare(b.cargo) || b.total - a.total);
    const cargos = [...new Map(cands.map(c => [c.cargo, c.cargoNome])).entries()].map(([cd, nome]) => ({ cd, nome }));
    const arq = `${ano}-t${turno}`;
    const doc = { ano, turno, uf: UF, fonte: res.fonte, final: ds.final, atualizadoEm: ds.atualizadoEm || new Date().toISOString(), cargos, cands, tot: ds.tot };
    await writeFile(`${dir}/${arq}.json`, JSON.stringify(doc));
    const loc = locais?.[turno];
    if (loc) await writeFile(`${dir}/${arq}-locais.json`, JSON.stringify(loc));
    console.log(`  → ${dir}/${arq}.json (${cands.length} candidatos, fonte ${res.fonte})${loc ? ' + locais de votação' : ''}`);
  }
  await indexar(dir);
}

// Índice que o site lê para listar as eleições disponíveis.
async function indexar(dir) {
  const eleicoes = [];
  for (const f of (await readdir(dir)).filter(f => /^\d{4}-t\d\.json$/.test(f)).sort()) {
    const d = JSON.parse(await readFile(`${dir}/${f}`, 'utf8'));
    eleicoes.push({ ano: d.ano, turno: d.turno, arquivo: f, locais: existsSync(`${dir}/${f.replace('.json', '-locais.json')}`) ? f.replace('.json', '-locais.json') : null,
      cargos: d.cargos, fonte: d.fonte, final: d.final, atualizadoEm: d.atualizadoEm });
  }
  await writeFile(`${dir}/index.json`, JSON.stringify({ geradoEm: new Date().toISOString(), eleicoes }));
}

async function gerarCiclo(ano, dir) {
  console.log(`Ciclo ${ano}:`);
  let res = null;
  try { res = await viaApi(ano); if (!res) console.log('  API não tem este ciclo; usando o CSV dos Dados Abertos'); }
  catch (e) { console.warn(`  API falhou (${e.message}); usando o CSV dos Dados Abertos`); }
  res ||= await viaCsv(ano);
  if (!res) { console.warn(`  sem dados para ${ano} (nem API nem CSV)`); return false; }
  let locais = null;
  try { locais = await locaisViaCsv(ano); if (!locais) console.log('  CSV por seção ainda não publicado: sem detalhe por local de votação'); }
  catch (e) { console.log(`  sem detalhe por local de votação (${e.message})`); }
  await escrever(dir, ano, res, locais);
  return true;
}

if (modo === 'historico') {
  const dir = 'public/data/historico';
  for (const ano of anosArg.length ? anosArg : ANOS_HISTORICO) {
    if (!forcar && existsSync(`${dir}/${ano}-t1.json`)) { console.log(`Ciclo ${ano}: já existe no histórico (use --forcar para refazer)`); continue; }
    await gerarCiclo(ano, dir);
  }
} else if (modo === 'atual') {
  await atual();
} else {
  console.error('Uso: node scripts/gerar-dados.mjs historico [ano ...] [--forcar]  |  node scripts/gerar-dados.mjs atual');
  process.exitCode = 1;
}

async function atual() {
  const dir = 'public/data/atual';
  const cfg = await getJson(`${API}/comum/config/ele-c.json`);
  const ciclo = [...new Set((cfg?.pl || []).map(p => p.c))].sort().pop()?.replace('ele', '');
  if (!ciclo) return console.warn('Não foi possível descobrir o ciclo atual; mantendo os dados em cache.');
  if (existsSync(`public/data/historico/${ciclo}-t1.json`)) return console.log(`Ciclo ${ciclo} já está no histórico; nada a fazer.`);
  // dados já finais (cache do workflow) não precisam ser buscados de novo
  const idx = existsSync(`${dir}/index.json`) ? JSON.parse(await readFile(`${dir}/index.json`, 'utf8')) : null;
  const doCiclo = idx?.eleicoes?.filter(e => e.ano === ciclo) || [];
  if (doCiclo.length && doCiclo.every(e => e.final && e.locais)) return console.log(`Ciclo ${ciclo}: dados finais já em cache.`);
  await gerarCiclo(ciclo, dir);
}
