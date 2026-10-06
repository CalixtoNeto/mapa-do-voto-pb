// Gera os dados do site (public/data/eleicoes/ANO-tTURNO.json), que são commitados e servidos como arquivos estáticos.
//   node scripts/gerar-dados.mjs [ano ...] [--forcar]
// Sem anos, gera os que ainda não existem. Com --forcar, refaz os anos informados.
// Para cada ano: primeiro o CSV dos Dados Abertos do TSE; a API de resultados só entra para o que o CSV
// ainda não tem (por exemplo, um 2º turno ainda não publicado). Roda localmente ou no workflow manual.
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { API, CDN, getJson, paralelo, baixar, splitLine, lerCsvsDoZip, pad } from './lib/tse.mjs';

const UF = 'PB';
const CARGOS = ['1', '3', '5', '6', '7'];          // presidente, governador, senador, deputado federal e estadual
const COM_2_TURNO = ['1', '3'];                    // só presidente e governador têm 2º turno
const ANOS_PADRAO = ['2014', '2018', '2022', '2026'];
const DIR = 'public/data/eleicoes';
const TMP = 'tmp';
const TSE_IBGE = JSON.parse(await readFile('public/data/tse-ibge-pb.json', 'utf8'));
const ibgeDe = cd => TSE_IBGE[String(parseInt(cd, 10))] || null;

const args = process.argv.slice(2);
const forcar = args.includes('--forcar');
const anosArg = args.filter(a => /^\d{4}$/.test(a));
const novoDs = fonte => ({ cands: new Map(), tot: {}, final: true, atualizadoEm: null, fonte });

// Soma o voto de um candidato num município (comum ao CSV e à API).
function somar(ds, tk, c, ibge, v) {
  let k = ds.cands.get(c.key);
  if (!k) { k = { ...c, total: 0, mun: {} }; ds.cands.set(c.key, k); }
  k.mun[ibge] = (k.mun[ibge] || 0) + v; k.total += v;
  (ds.tot[tk] ||= {})[ibge] = (ds.tot[tk][ibge] || 0) + v;
}

// ---------- CSV dos Dados Abertos (votação nominal por município e zona) ----------
// O arquivo _PB.csv não traz o presidente; os votos dele por município estão no _BRASIL.csv do mesmo .zip.
async function viaCsv(ano) {
  const zip = `${TMP}/munzona-${ano}.zip`;
  if (!await baixar(`${CDN}/votacao_candidato_munzona/votacao_candidato_munzona_${ano}.zip`, zip)) return null;
  const porTurno = {}, semMun = new Set();
  const REQ = ['ANO_ELEICAO', 'NR_TURNO', 'SG_UF', 'CD_MUNICIPIO', 'CD_CARGO', 'DS_CARGO', 'SQ_CANDIDATO', 'NR_CANDIDATO', 'NM_URNA_CANDIDATO', 'SG_PARTIDO'];
  const agregador = cargoOk => {
    let ix = null, vk = null;
    return (l, cab) => {
      if (cab) {
        const h = splitLine(l).map(x => x.trim().toUpperCase()); ix = Object.fromEntries(h.map((k, i) => [k, i]));
        vk = h.includes('QT_VOTOS_NOMINAIS_VALIDOS') ? 'QT_VOTOS_NOMINAIS_VALIDOS' : 'QT_VOTOS_NOMINAIS';
        const falta = REQ.filter(k => ix[k] == null); if (falta.length || ix[vk] == null) throw new Error(`Colunas ausentes no CSV de ${ano}: ${falta.concat(ix[vk] == null ? [vk] : []).join(', ')}`);
        return;
      }
      const c = splitLine(l), cargo = c[ix.CD_CARGO];
      if (c[ix.SG_UF] !== UF || !cargoOk(cargo) || c[ix.ANO_ELEICAO] !== ano) return;
      const ibge = ibgeDe(c[ix.CD_MUNICIPIO]); if (!ibge) { semMun.add(c[ix.CD_MUNICIPIO]); return; }
      const turno = c[ix.NR_TURNO], tk = `${ano}|${turno}|${cargo}`, key = `${tk}|${c[ix.SQ_CANDIDATO]}`;
      const ds = porTurno[turno] ||= novoDs('csv');
      const sit = ix.DS_SIT_TOT_TURNO != null ? c[ix.DS_SIT_TOT_TURNO] : '';
      somar(ds, tk, { key, ano, turno, cargo, cargoNome: c[ix.DS_CARGO], nr: c[ix.NR_CANDIDATO], urna: c[ix.NM_URNA_CANDIDATO], nome: ix.NM_CANDIDATO != null ? c[ix.NM_CANDIDATO] : '', partido: c[ix.SG_PARTIDO], sit: '' }, ibge, parseInt(c[ix[vk]], 10) || 0);
      if (sit && !/^#/.test(sit)) ds.cands.get(key).sit = sit;
    };
  };
  const [temPb, temBrasil] = await lerCsvsDoZip(zip, [
    { padrao: new RegExp(`_${UF}\\.csv$`, 'i'), aoLinha: agregador(c => CARGOS.includes(c) && c !== '1') },
    { padrao: /_BRASIL\.csv$/i, aoLinha: agregador(c => c === '1') },
  ]);
  if (!temPb) return null;
  if (!temBrasil) console.warn(`  CSV ${ano}: sem _BRASIL.csv; o presidente fica de fora`);
  if (semMun.size) console.warn(`  CSV ${ano}: municípios sem correspondência IBGE: ${[...semMun].join(', ')}`);
  return Object.keys(porTurno).length ? porTurno : null;
}

// ---------- API de resultados (só o ciclo atual e o anterior; um arquivo por município e cargo) ----------
// Soma em `porTurno` apenas o que `precisa(turno, cargo)` pedir. Devolve quantos cargos foram adicionados.
async function viaApi(ano, porTurno, precisa) {
  const cfg = await getJson(`${API}/comum/config/ele-c.json`);
  const elei = (cfg?.pl || []).filter(p => p.c === `ele${ano}`).flatMap(p => p.e).filter(e => e.tp === '1' || e.tp === '8');
  if (!elei.length) return 0;
  const ref = elei.find(e => e.tp === '1') || elei[0];
  const cm = await getJson(`${API}/ele${ano}/${ref.cd}/config/mun-e${pad(ref.cd, 6)}-cm.json`);
  const mu = cm?.abr?.find(a => a.cd === UF.toLowerCase())?.mu;
  if (!mu?.length) return 0;

  let adicionados = 0;
  for (const e of elei) {
    const cargos = (e.abr?.[0]?.cp || []).map(c => c.cd).filter(c => CARGOS.includes(c));
    for (const [turno, ele] of [['1', e.cd], ['2', e.cdt2]]) {
      if (!ele) continue;
      for (const cargo of cargos.filter(c => (turno === '1' || COM_2_TURNO.includes(c)) && precisa(turno, c))) {
        const base = `${API}/ele${ano}/${ele}/dados/${UF.toLowerCase()}`;
        const arq = sufixo => `${base}/${UF.toLowerCase()}${sufixo}-c${pad(cargo, 4)}-e${pad(ele, 6)}-u.json`;
        const uf = await getJson(arq(''));
        if (!uf) continue;                         // ainda não existe (por exemplo, 2º turno que não aconteceu)
        const ds = porTurno[turno] ||= novoDs('api');
        if (ds.fonte === 'csv') ds.fonte = 'csv+api';
        ds.final &&= uf.and === 'f'; ds.atualizadoEm = `${uf.dg?.split('/').reverse().join('-')}T${uf.hg}`;
        const tk = `${ano}|${turno}|${cargo}`;
        await paralelo(mu, 6, async m => {
          const car = (await getJson(arq(m.cd)))?.carg?.[0]; if (!car) return;
          for (const agr of car.agr || []) for (const par of agr.par || []) for (const c of par.cand || []) {
            const v = parseInt(c.vap, 10) || 0; if (!v) continue;
            somar(ds, tk, { key: `${tk}|${c.sqcand}`, ano, turno, cargo, cargoNome: car.nmn, nr: c.n, urna: c.nmu, nome: c.nm, partido: par.sg || '', sit: c.st || '' }, m.cdi, v);
          }
        });
        adicionados++; console.log(`  API ${ano} t${turno} cargo ${cargo}: ok`);
      }
    }
  }
  return adicionados;
}

// ---------- Nome dos locais de votação ----------
// Em 2026 o CSV por seção ainda vem com o nome "#NULO#"; o nome certo está na tabela "Eleitorado por local de votação".
const semNome = n => !n || /^#.*#$/.test(n.trim());
async function nomesDosLocais(ano) {
  const zip = `${TMP}/local-votacao-${ano}.zip`;
  if (!await baixar(`${CDN}/eleitorado_locais_votacao/eleitorado_local_votacao_${ano}.zip`, zip)) return null;
  const nomes = new Map(); let ix = null;
  await lerCsvsDoZip(zip, [{ padrao: /\.csv$/i, aoLinha: (l, cab) => {
    if (cab) { ix = Object.fromEntries(splitLine(l).map((k, i) => [k.trim().toUpperCase(), i])); return; }
    if (l.indexOf(`"${UF}"`) < 0) return;
    const c = splitLine(l); if (c[ix.SG_UF] !== UF) return;
    const k = `${c[ix.CD_MUNICIPIO]}|${c[ix.NR_ZONA]}|${c[ix.NR_SECAO]}`;
    if (!nomes.has(k) && !semNome(c[ix.NM_LOCAL_VOTACAO])) nomes.set(k, c[ix.NM_LOCAL_VOTACAO].trim());
  } }]);
  return nomes;
}

// ---------- Votos por local de votação (CSV por seção; só traz o nome do local de 2018 em diante) ----------
const MIN_DIG = { '1': 2, '3': 2, '5': 3, '6': 4, '7': 5 };
async function locaisViaCsv(ano) {
  const zipPb = `${TMP}/secao-${ano}-${UF}.zip`;
  if (!await baixar(`${CDN}/votacao_secao/votacao_secao_${ano}_${UF}.zip`, zipPb)) return null;
  const porTurno = {}, pendentes = [];
  // mesmo tratamento para o arquivo da UF e para o nacional (que só tem o presidente)
  const agregador = cargoOk => {
    let ix = null;
    return (l, cab) => {
      if (cab) { ix = Object.fromEntries(splitLine(l).map((k, i) => [k.trim().toUpperCase(), i])); if (ix.NM_LOCAL_VOTACAO == null) throw new Error('sem nome de local'); return; }
      const c = splitLine(l), cargo = c[ix.CD_CARGO], nr = c[ix.NR_VOTAVEL];
      if (c[ix.SG_UF] !== UF || !cargoOk(cargo) || !MIN_DIG[cargo] || nr.length < MIN_DIG[cargo] || nr === '95' || nr === '96' || c[ix.ANO_ELEICAO] !== ano) return;
      const ibge = ibgeDe(c[ix.CD_MUNICIPIO]); if (!ibge) return;
      const t = porTurno[c[ix.NR_TURNO]] ||= { locais: {}, idx: {}, votos: {} };
      const lk = c[ix.NR_ZONA] + '|' + c[ix.NR_LOCAL_VOTACAO], arr = t.locais[ibge] ||= [], mapa = t.idx[ibge] ||= new Map();
      let i = mapa.get(lk);
      if (i == null) {
        i = arr.length; mapa.set(lk, i);
        const nome = c[ix.NM_LOCAL_VOTACAO].trim(), reserva = `Local ${c[ix.NR_LOCAL_VOTACAO]} (zona ${c[ix.NR_ZONA]})`;
        const local = { n: semNome(nome) ? reserva : nome }; arr.push(local);
        if (semNome(nome)) pendentes.push({ local, chave: `${c[ix.CD_MUNICIPIO]}|${c[ix.NR_ZONA]}|${c[ix.NR_SECAO]}` });
      }
      const m = ((t.votos[cargo + '|' + nr] ||= {})[ibge] ||= {}); m[i] = (m[i] || 0) + (parseInt(c[ix.QT_VOTOS], 10) || 0);
    };
  };
  await lerCsvsDoZip(zipPb, [{ padrao: new RegExp(`_${UF}\\.csv$`, 'i'), aoLinha: agregador(c => c !== '1') }]);
  // o presidente por seção vem num arquivo nacional separado
  try {
    const zipBr = `${TMP}/secao-${ano}-BR.zip`;
    if (await baixar(`${CDN}/votacao_secao/votacao_secao_${ano}_BR.zip`, zipBr)) await lerCsvsDoZip(zipBr, [{ padrao: /_BR\.csv$/i, aoLinha: agregador(c => c === '1') }]);
  } catch (e) { console.warn(`  presidente por seção indisponível (${e.message})`); }
  if (pendentes.length) {
    console.log(`  ${pendentes.length} locais sem nome no CSV por seção; buscando na tabela de locais de votação`);
    const nomes = await nomesDosLocais(ano).catch(e => { console.warn(`  tabela de locais indisponível (${e.message})`); return null; });
    let achados = 0;
    for (const p of pendentes) { const n = nomes?.get(p.chave); if (n) { p.local.n = n; achados++; } }
    console.log(`  nomes corrigidos: ${achados} de ${pendentes.length}`);
  }
  return Object.fromEntries(Object.entries(porTurno).map(([tn, t]) => [tn, { locais: t.locais, votos: t.votos }]));
}

// ---------- Saída ----------
// O CSV por seção também conta votos de candidatos cuja candidatura foi anulada; o CSV por município só conta
// os válidos. Fica só o que bate com o total do município, para a lista de locais nunca contradizer o card.
function podarLocais(loc, ds) {
  const porChave = new Map([...ds.cands.values()].map(c => [`${c.cargo}|${c.nr}`, c]));
  for (const [chave, muns] of Object.entries(loc.votos)) {
    const cand = porChave.get(chave);
    if (!cand) { delete loc.votos[chave]; continue; }
    for (const ibge of Object.keys(muns)) if (!(cand.mun[ibge] > 0)) delete muns[ibge];
    if (!Object.keys(muns).length) delete loc.votos[chave];
  }
}

async function escrever(ano, porTurno, locais) {
  await mkdir(DIR, { recursive: true });
  for (const [turno, ds] of Object.entries(porTurno)) {
    const cands = [...ds.cands.values()].sort((a, b) => a.cargo.localeCompare(b.cargo) || b.total - a.total);
    const cargos = [...new Map(cands.map(c => [c.cargo, c.cargoNome])).entries()].map(([cd, nome]) => ({ cd, nome }));
    const arq = `${ano}-t${turno}`;
    await writeFile(`${DIR}/${arq}.json`, JSON.stringify({ ano, turno, uf: UF, fonte: ds.fonte, final: ds.final, atualizadoEm: ds.atualizadoEm || new Date().toISOString(), cargos, cands, tot: ds.tot }));
    const loc = locais?.[turno];
    if (loc) podarLocais(loc, ds);
    if (loc) await writeFile(`${DIR}/${arq}-locais.json`, JSON.stringify(loc));
    console.log(`  → ${DIR}/${arq}.json (${cands.length} candidatos, fonte ${ds.fonte})${loc ? ' + locais de votação' : ''}`);
  }
  await indexar();
}

// Índice que o site lê para listar as eleições disponíveis.
async function indexar() {
  const eleicoes = [];
  for (const f of (await readdir(DIR)).filter(f => /^\d{4}-t\d\.json$/.test(f)).sort()) {
    const d = JSON.parse(await readFile(`${DIR}/${f}`, 'utf8')), loc = f.replace('.json', '-locais.json');
    eleicoes.push({ ano: d.ano, turno: d.turno, arquivo: f, locais: existsSync(`${DIR}/${loc}`) ? loc : null, cargos: d.cargos, fonte: d.fonte, final: d.final, atualizadoEm: d.atualizadoEm });
  }
  await writeFile(`${DIR}/index.json`, JSON.stringify({ geradoEm: new Date().toISOString(), eleicoes }));
}

async function gerarAno(ano) {
  console.log(`Eleição ${ano}:`);
  let porTurno = null;
  try { porTurno = await viaCsv(ano); if (!porTurno) console.log('  CSV dos Dados Abertos ainda não publicado'); }
  catch (e) { console.warn(`  CSV falhou (${e.message})`); }
  // a API completa o que o CSV ainda não tem: turnos e cargos ausentes (ou tudo, se não houver CSV)
  const presentes = new Set();
  for (const [t, ds] of Object.entries(porTurno || {})) for (const c of ds.cands.values()) presentes.add(`${t}|${c.cargo}`);
  porTurno ||= {};
  try {
    const n = await viaApi(ano, porTurno, (t, c) => !presentes.has(`${t}|${c}`));
    if (n) console.log(`  completado pela API: ${n} cargo(s)`);
  } catch (e) { console.warn(`  API falhou (${e.message})`); }
  if (!Object.keys(porTurno).length) { console.warn(`  sem dados para ${ano} (nem CSV nem API)`); process.exitCode = 1; return; }
  let locais = null;
  try { locais = await locaisViaCsv(ano); if (!locais) console.log('  CSV por seção ainda não publicado: sem detalhe por local de votação'); }
  catch (e) { console.log(`  sem detalhe por local de votação (${e.message})`); }
  await escrever(ano, porTurno, locais);
}

for (const ano of anosArg.length ? anosArg : ANOS_PADRAO) {
  if (!forcar && existsSync(`${DIR}/${ano}-t1.json`)) { console.log(`Eleição ${ano}: já existe (use --forcar para refazer)`); continue; }
  await gerarAno(ano);
}
