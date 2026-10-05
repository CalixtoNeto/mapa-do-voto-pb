// Gera public/data/tse-ibge-pb.json: código de município do TSE → código IBGE.
// Uso: npm run tabela
import { writeFile, mkdir } from 'node:fs/promises';

const FONTE = 'https://raw.githubusercontent.com/betafcc/Municipios-Brasileiros-TSE/master/municipios_brasileiros_tse.csv';
const UF = 'PB';

const csv = await (await fetch(FONTE)).text();
const [cab, ...linhas] = csv.trim().split(/\r?\n/);
const col = Object.fromEntries(cab.split(',').map((c, i) => [c, i]));
const tabela = {};
for (const l of linhas) {
  const c = l.split(',');
  if (c[col.uf] === UF) tabela[c[col.codigo_tse]] = c[col.codigo_ibge];
}
const n = Object.keys(tabela).length;
if (n !== 223) throw new Error(`Esperava 223 municípios da ${UF}, veio ${n}`);
await mkdir('public/data', { recursive: true });
await writeFile('public/data/tse-ibge-pb.json', JSON.stringify(tabela));
console.log(`Tabela gerada com ${n} municípios`);
