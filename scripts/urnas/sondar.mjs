// Sondagem temporária dos arquivos de urna do TSE (boletim de urna): onde ficam e como são por dentro.
import { API, pad } from '../lib/tse.mjs';

const UA = { 'User-Agent': 'mapa-do-voto/1.0 (sondagem)', Accept: '*/*' };
async function pegar(url, binario = false) {
  try {
    const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(30000) });
    if (!r.ok) { console.log(`${r.status} ${url}`); return null; }
    const dado = binario ? Buffer.from(await r.arrayBuffer()) : await r.json();
    console.log(`200 ${url} ${binario ? dado.length + ' bytes' : ''}`);
    return dado;
  } catch (e) { console.log(`ERRO ${url} ${e.cause?.code || e.message}`); return null; }
}

// Decodificador BER genérico só para ler a estrutura: tag, tamanho e, nas folhas, o texto ou o número.
// Folhas que por dentro são BER válido (envelopes em OCTET STRING) também são abertas.
function cabecalho(buf, i, fim) {
  if (i >= fim) return null;
  const inicio = i, classe = buf[i] >> 6, construido = !!(buf[i] & 0x20); let tag = buf[i] & 0x1f; i++;
  if (tag === 0x1f) { tag = 0; do { if (i >= fim) return null; tag = (tag << 7) | (buf[i] & 0x7f); } while (buf[i++] & 0x80); }
  if (i >= fim) return null;
  let tam = buf[i++]; if (tam & 0x80) { const n = tam & 0x7f; if (!n || n > 4 || i + n > fim) return null; tam = 0; for (let k = 0; k < n; k++) tam = tam * 256 + buf[i++]; }
  return i + tam > fim ? null : { classe, construido, tag, tam, corpo: i, fim: i + tam };
}
function valido(buf, ini, fim) {
  let i = ini, n = 0;
  while (i < fim) { const h = cabecalho(buf, i, fim); if (!h || (h.classe === 0 && h.tag === 0 && !h.tam)) return false; if (h.construido && h.tam && !valido(buf, h.corpo, h.fim)) return false; i = h.fim; n++; }
  return n > 0 && i === fim;
}
function ber(buf, ini = 0, fim = buf.length, nivel = 0, linhas = [], limite = 900) {
  let i = ini;
  while (i < fim && linhas.length < limite) {
    const h = cabecalho(buf, i, fim); if (!h) return linhas;
    const rotulo = `${'  '.repeat(nivel)}[${'UACP'[h.classe]}${h.tag}] len=${h.tam}`, c = buf.subarray(h.corpo, h.fim);
    if (h.construido) { linhas.push(rotulo); ber(buf, h.corpo, h.fim, nivel + 1, linhas, limite); }
    else if (h.tam > 3 && valido(buf, h.corpo, h.fim)) { linhas.push(rotulo + ' (aninhado)'); ber(buf, h.corpo, h.fim, nivel + 1, linhas, limite); }
    else linhas.push(rotulo + (c.every(b => b >= 32 && b < 127) && h.tam ? ` "${c.toString('latin1')}"` : h.tam <= 8 ? ` 0x${c.toString('hex')} (${h.tam ? parseInt(c.toString('hex'), 16) : 0})` : ` hex:${c.subarray(0, 16).toString('hex')}…`));
    i = h.fim;
  }
  return linhas;
}

const acharArquivos = (no, achados = []) => {
  if (Array.isArray(no)) no.forEach(x => acharArquivos(x, achados));
  else if (no && typeof no === 'object') for (const [k, v] of Object.entries(no)) { if (typeof v === 'string' && /\.(bu|rdv|logjez|imgbu|vscmr)$/i.test(v)) achados.push([k, v]); else acharArquivos(v, achados); }
  return achados;
};

// Pleito de cada turno do presidente em 2026 (ele-c.json, campo cd dos pleitos): 3220 (4/10) e 3221 (25/10).
export async function sondar(ano) {
  const config = await pegar(`${API}/comum/config/ele-c.json`);
  const pls = (config?.pl || []).filter(p => p.c === `ele${ano}`);
  console.log('pleitos:', JSON.stringify(pls.map(({ e, ...p }) => p)));
  const uf = 'pb', pleito = pls.map(p => p.cd).sort().pop();
  const cs = await pegar(`${API}/ele${ano}/arquivo-urna/${pleito}/config/${uf}/${uf}-p${pad(pleito, 6)}-cs.json`);
  const muns = cs?.abr?.[0]?.mu || [];
  console.log('municípios no cs:', muns.length, 'seções no 1º município:', muns[0]?.zon?.[0]?.sec?.length, 'chaves da seção:', Object.keys(muns[0]?.zon?.[0]?.sec?.[0] || {}));
  const total = muns.reduce((s, m) => s + m.zon.reduce((z, x) => z + x.sec.length, 0), 0);
  console.log('seções da PB neste pleito:', total);
  const m = muns.find(x => x.nm === 'JOÃO PESSOA') || muns[0], z = m.zon[0], sec = z.sec[0];
  const base = `${API}/ele${ano}/arquivo-urna/${pleito}/dados/${uf}/${m.cd}/${z.cd}/${sec.ns}`;
  for (const aux of [`${base}/p${pad(pleito, 6)}-${uf}-m${m.cd}-z${z.cd}-s${sec.ns}-aux.json`]) {
    const j = await pegar(aux);
    if (!j) continue;
    console.log('  aux ->', JSON.stringify(j).slice(0, 1500));
    const h = j.hashes?.[0], hash = h?.hash;
    for (const a of (h?.arq || []).filter(x => x.tp === 'bu')) {
      const bu = await pegar(`${base}/${hash}/${a.nm}`, true);
      if (bu) { console.log('  BU hex inicial:', bu.subarray(0, 40).toString('hex')); console.log(ber(bu).join('\n')); }
    }
  }
}

// Validação: coleta as seções de uma UF (ou de um município) e imprime somas e distribuições para conferir com o que já se sabe.
export async function validarUf(ano, uf, municipio) {
  const { secoesDaUf, coletarSecoes } = await import('./coletar.mjs');
  const config = await pegar(`${API}/comum/config/ele-c.json`), pleito = (config.pl || []).filter(p => p.c === `ele${ano}`).map(p => p.cd).sort().pop();
  const secoes = (await secoesDaUf({ ano, pleito, uf })).filter(s => !municipio || s.municipio === municipio);
  console.log(`validação ${uf} ${municipio || 'todos'} pleito ${pleito}: ${secoes.length} seções`);
  const t0 = Date.now(), lidas = await coletarSecoes({ ano, pleito, uf }, secoes, { simultaneos: 6, aoProgresso: (f, n) => console.log(`  ${f}/${n} em ${Math.round((Date.now() - t0) / 1000)}s`) });
  const boas = lidas.filter(l => !l.erro), erros = lidas.filter(l => l.erro);
  console.log('lidas:', boas.length, 'erros:', erros.length, JSON.stringify(erros.slice(0, 3)));
  const soma = f => boas.reduce((t, l) => t + (f(l) || 0), 0);
  console.log('Σ aptos', soma(l => l.aptos), 'comparecimento', soma(l => l.comparecimento), 'identificação', [0, 1, 2].map(k => soma(l => l.porIdentificacao?.[k])), 'brancos', soma(l => l.brancos), 'nulos', soma(l => l.nulos));
  const ratio = (l, k) => l.comparecimento ? l.porIdentificacao[k] / l.comparecimento : null, faixa = r => r == null ? 'sem comparecimento' : String(Math.min(9, Math.floor(r * 10)) * 10);
  for (const k of [0, 1, 2]) { const h = {}; for (const l of boas) { const f = faixa(ratio(l, k)); h[f] = (h[f] || 0) + 1; } console.log(`seções por faixa (%) do grupo ${k} no comparecimento:`, JSON.stringify(h)); }
  const atraso = l => (Date.parse(l.abertura) - Date.parse(l.abertura.slice(0, 11) + '08:00:00')) / 60000, fim = l => (Date.parse(l.encerramento) - Date.parse(l.encerramento.slice(0, 11) + '17:00:00')) / 60000;
  const cont = (f, cortes) => cortes.map(c => `>${c}min: ${boas.filter(l => f(l) > c).length}`).join(' | ');
  console.log('abertura depois das 08:00 —', cont(atraso, [1, 5, 15, 30, 60, 120]), '| antes das 08:00:', boas.filter(l => atraso(l) < 0).length);
  console.log('encerramento depois das 17:00 —', cont(fim, [5, 30, 60, 120, 180]), '| antes das 17:00:', boas.filter(l => fim(l) < 0).length);
  const raros = boas.filter(l => l.comparecimento > 50 && ratio(l, 1) < 0.2).slice(0, 3);
  console.log('exemplos com biometria (grupo do meio) < 20%:', JSON.stringify(raros));
  console.log('exemplo:', JSON.stringify(boas[0]));
}
