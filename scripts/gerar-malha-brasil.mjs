// Gera public/data/br.topo.json: as 27 UFs, a partir da malha do IBGE.
// Primeiro tenta a API de malhas do IBGE (já por UF); se ela não responder (acontece nos runners do GitHub), junta os municípios
// de cada UF da mesma malha do IBGE publicada em tbrugz/geodata-br, a base que o mapa da Paraíba já usa.
// Uso: npm run malha-brasil
import { writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { ufsDoGeojson, marcarUf, SIGLAS_POR_CODIGO } from './mapa/ufs.mjs';

const API_IBGE = 'https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?intrarregiao=UF&qualidade=minima&formato=application/vnd.geo+json';
const MUNICIPIOS = codigo => `https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson/geojs-${codigo}-mun.json`;

async function buscar(url, tentativas = 3) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) { if (i >= tentativas) throw new Error(`${e.cause?.code || e.message} em ${url}`); }
  }
}

async function viaApiDoIbge() {
  return { geo: ufsDoGeojson(await buscar(API_IBGE)), juntar: false };
}

async function viaMunicipios() {
  const ufs = await Promise.all(Object.keys(SIGLAS_POR_CODIGO).map(async codigo => marcarUf(await buscar(MUNICIPIOS(codigo)), codigo)));
  return { geo: { type: 'FeatureCollection', features: ufs.flatMap(u => u.features) }, juntar: true };
}

await mkdir('tmp', { recursive: true });
await mkdir('public/data', { recursive: true });
let origem;
try { origem = await viaApiDoIbge(); console.log('Malha: API de malhas do IBGE'); }
catch (e) { console.warn(`API do IBGE indisponível (${e.message}); juntando os municípios de cada UF`); origem = await viaMunicipios(); }
await writeFile('tmp/br.geojson', JSON.stringify(origem.geo));

execFileSync('npx', ['mapshaper', 'tmp/br.geojson', ...(origem.juntar ? ['-dissolve', 'sigla', 'copy-fields=codigo'] : []),
  '-simplify', origem.juntar ? '4%' : '30%', 'keep-shapes', '-rename-layers', 'ufs', '-o', 'format=topojson', 'quantization=1e5', 'public/data/br.topo.json'], { stdio: 'inherit' });
console.log('Malha gerada em public/data/br.topo.json');
