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

export async function sondar(ano) {
  const config = await pegar(`${API}/comum/config/ele-c.json`);
  const pls = (config?.pl || []).filter(p => p.c === `ele${ano}`);
  console.log('pleitos:', JSON.stringify(pls.map(({ e, ...p }) => p)), 'eleições:', JSON.stringify(pls.flatMap(p => p.e).map(e => [e.cd, e.cdt2, e.tp, e.nm])));
  const candidatos = [...new Set([...pls.map(p => p.cd), ...pls.flatMap(p => p.e).flatMap(e => [e.cd, e.cdt2])].filter(Boolean))];
  for (const cd of candidatos) {
    for (const ruta of [`arquivo-urna/${cd}/config/pb/pb-p${pad(cd, 6)}-cs.json`, `arquivo-urna/${cd}/config/mun-e${pad(cd, 6)}-cm.json`, `${cd}/config/pb/pb-e${pad(cd, 6)}-cs.json`]) {
      const j = await pegar(`${API}/ele${ano}/${ruta}`);
      if (j) console.log('  ->', JSON.stringify(j).slice(0, 700));
    }
  }
}
