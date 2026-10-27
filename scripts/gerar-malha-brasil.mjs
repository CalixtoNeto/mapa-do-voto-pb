// Gera public/data/br.topo.json: as 27 UFs, a partir da malha oficial do IBGE (API de malhas, qualidade mínima).
// Uso: npm run malha-brasil
import { writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { ufsDoGeojson } from './mapa/ufs.mjs';

const FONTE = 'https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?intrarregiao=UF&qualidade=minima&formato=application/vnd.geo+json';

await mkdir('tmp', { recursive: true });
await mkdir('public/data', { recursive: true });
const resposta = await fetch(FONTE);
if (!resposta.ok) throw new Error(`Malha do IBGE: HTTP ${resposta.status}`);
await writeFile('tmp/br.geojson', JSON.stringify(ufsDoGeojson(await resposta.json())));

execFileSync('npx', ['mapshaper', 'tmp/br.geojson', '-simplify', '30%', 'keep-shapes',
  '-rename-layers', 'ufs', '-o', 'format=topojson', 'quantization=1e5', 'public/data/br.topo.json'], { stdio: 'inherit' });
console.log('Malha gerada em public/data/br.topo.json');
