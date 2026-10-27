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
function ber(buf, ini = 0, fim = buf.length, nivel = 0, linhas = [], limite = 400) {
  let i = ini;
  while (i < fim && linhas.length < limite) {
    const inicio = i, classe = buf[i] >> 6, construido = !!(buf[i] & 0x20); let tag = buf[i] & 0x1f; i++;
    if (tag === 0x1f) { tag = 0; do { tag = (tag << 7) | (buf[i] & 0x7f); } while (buf[i++] & 0x80); }
    let tam = buf[i++]; if (tam & 0x80) { const n = tam & 0x7f; tam = 0; for (let k = 0; k < n; k++) tam = tam * 256 + buf[i++]; }
    if (tam === 0x80 || i + tam > fim) return linhas;
    const rotulo = `${'  '.repeat(nivel)}[${'UACP'[classe]}${tag}]${construido ? '' : ''} len=${tam}`;
    if (construido) { linhas.push(rotulo); ber(buf, i, i + tam, nivel + 1, linhas, limite); }
    else { const c = buf.subarray(i, i + tam), texto = c.every(b => b >= 32 && b < 127) && tam ? ` "${c.toString('latin1')}"` : tam <= 8 ? ` 0x${c.toString('hex')} (${tam ? parseInt(c.toString('hex'), 16) : 0})` : ` hex:${c.subarray(0, 12).toString('hex')}…`; linhas.push(rotulo + texto); }
    i += tam;
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
    const arquivos = acharArquivos(j), hash = j.hashes?.[0]?.hash ?? j.hash;
    console.log('  arquivos achados:', JSON.stringify(arquivos), 'hash:', hash);
    for (const [, nome] of arquivos.filter(a => /\.bu$/i.test(a[1]))) {
      const bu = await pegar(`${base}/${hash}/${nome}`, true);
      if (bu) { console.log('  BU hex inicial:', bu.subarray(0, 40).toString('hex')); console.log(ber(bu, 0, bu.length, 0, [], 700).join('\n')); }
    }
  }
}
