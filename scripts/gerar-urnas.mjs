// Coleta os boletins de urna de uma UF (presidente, um turno) e grava os agregados por município e as seções atípicas.
//   node scripts/gerar-urnas.mjs ANO TURNO UF SAIDA.json
// Duas requisições por seção, com poucas simultâneas para não sobrecarregar o TSE. Falha (código 1) se mais de 20% das seções não vierem.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { API, getJson } from './lib/tse.mjs';
import { secoesDaUf, coletarSecoes } from './urnas/coletar.mjs';
import { agregarSecoes, pleitoDoTurno } from './urnas/agregar.mjs';

const [ano, turno, uf, saida] = process.argv.slice(2);
if (!/^\d{4}$/.test(ano || '') || !/^[12]$/.test(turno || '') || !/^[a-z]{2}$/.test(uf || '') || !saida) throw new Error('Uso: node scripts/gerar-urnas.mjs ANO TURNO UF SAIDA.json');

const nacional = JSON.parse(await readFile(`public/data/nacional/${ano}.json`, 'utf8'));
const candidatos = nacional.turnos[turno].cands.slice(0, 2).map(c => ({ numero: Number(c.nr), urna: c.urna }));
const pleito = pleitoDoTurno(await getJson(`${API}/comum/config/ele-c.json`), ano, turno);
const secoes = await secoesDaUf({ ano, pleito, uf });
console.log(`${uf.toUpperCase()} ${ano} t${turno} (pleito ${pleito}): ${secoes.length} seções`);

const inicio = Date.now();
const lidas = await coletarSecoes({ ano, pleito, uf }, secoes, { simultaneos: 6, aoProgresso: (feitas, total) => console.log(`  ${feitas}/${total} em ${Math.round((Date.now() - inicio) / 1000)}s`) });
const erros = lidas.filter(l => l.erro);
const { municipios, atipicas } = agregarSecoes(lidas, { uf: uf.toUpperCase(), numeros: candidatos.map(c => c.numero) });
await mkdir(dirname(saida), { recursive: true });
await writeFile(saida, JSON.stringify({ ano, turno, pleito, uf: uf.toUpperCase(), geradoEm: new Date().toISOString(), candidatos, secoes: secoes.length, lidas: lidas.length - erros.length, erros: erros.length, municipios, atipicas }));
console.log(`  → ${saida}: ${lidas.length - erros.length} lidas, ${erros.length} sem boletim, ${atipicas.length} atípicas`);
if (secoes.length && erros.length / secoes.length > 0.2) { console.error('Mais de 20% das seções falharam: possível limite de requisições do TSE'); process.exitCode = 1; }
