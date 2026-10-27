// Junta os arquivos por UF (urnas-UF.json) da coleta e grava public/data/nacional/ANO-tTURNO-urnas.json.
//   node scripts/juntar-urnas.mjs PASTA_DOS_ARQUIVOS
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { juntarUrnas } from './urnas/juntar.mjs';

const pasta = process.argv[2];
const arquivos = (await readdir(pasta, { recursive: true })).filter(a => /urnas-[a-z]{2}\.json$/.test(a));
const partes = await Promise.all(arquivos.map(async a => JSON.parse(await readFile(`${pasta}/${a}`, 'utf8'))));
if (!partes.length) throw new Error(`Nenhum arquivo urnas-UF.json em ${pasta}`);
const { ano, turno } = partes[0], destino = `public/data/nacional/${ano}-t${turno}-urnas.json`;
const existente = existsSync(destino) ? JSON.parse(await readFile(destino, 'utf8')) : null;
const juntado = juntarUrnas(existente, partes);
await writeFile(destino, JSON.stringify(juntado));
console.log(`${destino}: ${juntado.ufs.length} UFs, ${juntado.municipios.length} municípios, ${juntado.atipicas.length} seções atípicas`);
