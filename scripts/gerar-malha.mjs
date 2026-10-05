// Gera public/data/pb.topo.json a partir da malha municipal (IBGE) da Paraíba.
// Uso: npm run malha
import { writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const FONTE = 'https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson/geojs-25-mun.json';
// A malha de origem é de 2010; estes municípios mudaram de nome depois.
const NOMES_ATUAIS = { '2513653': 'Joca Claudino', '2515401': 'São Vicente do Seridó', '2516409': 'Tacima' };

await mkdir('tmp', { recursive: true });
await mkdir('public/data', { recursive: true });
const geo = await (await fetch(FONTE)).json();
for (const f of geo.features) {
  const p = f.properties;
  f.properties = { id: String(p.id), name: NOMES_ATUAIS[p.id] || p.name };
}
if (geo.features.length !== 223) throw new Error(`Esperava 223 municípios, veio ${geo.features.length}`);
await writeFile('tmp/pb.geojson', JSON.stringify(geo));

execFileSync('npx', ['mapshaper', 'tmp/pb.geojson',
  '-simplify', '12%', 'keep-shapes',
  '-rename-layers', 'municipios',
  '-o', 'format=topojson', 'quantization=1e5', 'public/data/pb.topo.json'], { stdio: 'inherit' });
console.log('Malha gerada em public/data/pb.topo.json');
