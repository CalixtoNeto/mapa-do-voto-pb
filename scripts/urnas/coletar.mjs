// Coleta dos arquivos de urna do TSE: a lista de seções de uma UF (config -cs.json), o aux.json de cada seção (que traz o hash)
// e o boletim de urna (-bu.dat). Duas requisições por seção; use poucos pedidos simultâneos.
import { API, getJson, pad } from '../lib/tse.mjs';
import { paralelo } from '../lib/paralelo.mjs';
import { lerBoletim } from './boletim.mjs';

const UA = { 'User-Agent': 'mapa-do-voto/1.0 (coleta em workflow do GitHub Actions; github.com/CalixtoNeto)' };
const dormir = ms => new Promise(r => setTimeout(r, ms));

// GET binário com retentativa; null se o arquivo não existe (404).
export async function baixarBytes(url, { tentativas = 4, esperaMs = 1500 } = {}) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(30000) });
      if (r.status === 404) return null;
      if (r.ok) return Buffer.from(await r.arrayBuffer());
      if (r.status !== 429 && r.status < 500) throw new Error(`HTTP ${r.status}`);
    } catch (e) { if (i >= tentativas) throw new Error(`${e.cause?.code || e.message} em ${url}`); }
    await dormir(esperaMs * i);
  }
}

const raiz = (ano, pleito, uf) => `${API}/ele${ano}/arquivo-urna/${pleito}`;

// [{ municipio, nome, zona, secao, recebidoEm }] de uma UF no pleito (4 dígitos para zona e seção).
export async function secoesDaUf({ ano, pleito, uf }, buscarJson = getJson) {
  const config = await buscarJson(`${raiz(ano, pleito)}/config/${uf}/${uf}-p${pad(pleito, 6)}-cs.json`);
  return (config?.abr?.[0]?.mu || []).flatMap(m => m.zon.flatMap(z => z.sec.map(s =>
    ({ municipio: m.cd, nome: m.nm, zona: z.cd, secao: s.ns, recebidoEm: s.da ? `${s.da} ${s.ha}` : null }))));
}

export async function coletarSecao({ ano, pleito, uf }, s, { buscarJson = getJson, baixar = baixarBytes } = {}) {
  const base = `${raiz(ano, pleito)}/dados/${uf}/${s.municipio}/${s.zona}/${s.secao}`;
  const aux = await buscarJson(`${base}/p${pad(pleito, 6)}-${uf}-m${s.municipio}-z${s.zona}-s${s.secao}-aux.json`);
  const hash = aux?.hashes?.[0], arquivo = hash?.arq?.find(a => a.tp === 'bu');
  if (!arquivo) return { ...s, erro: 'sem boletim' };
  const bytes = await baixar(`${base}/${hash.hash}/${arquivo.nm}`);
  return bytes ? { ...s, ...lerBoletim(bytes) } : { ...s, erro: 'boletim não encontrado' };
}

export async function coletarSecoes(contexto, secoes, { simultaneos = 5, aoProgresso } = {}) {
  let feitas = 0;
  return paralelo(secoes, simultaneos, async s => {
    try { return await coletarSecao(contexto, s); } catch (e) { return { ...s, erro: e.message }; }
    finally { if (aoProgresso && ++feitas % 500 === 0) aoProgresso(feitas, secoes.length); }
  });
}
