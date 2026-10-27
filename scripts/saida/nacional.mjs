// Escreve o cenário nacional de um ano e refaz o índice (public/data/nacional/index.json) com os anos e turnos disponíveis.
import { writeFile, mkdir, readdir, readFile } from 'node:fs/promises';

async function indexar(pasta) {
  const anos = [];
  for (const arquivo of (await readdir(pasta)).filter(nome => /^\d{4}\.json$/.test(nome)).sort().reverse()) {
    const { ano, turnos, atualizadoEm, fonte } = JSON.parse(await readFile(`${pasta}/${arquivo}`, 'utf8'));
    anos.push({ ano, turnos: Object.keys(turnos), atualizadoEm, fonte });
  }
  const urnas = (await readdir(pasta)).map(n => /^(\d{4})-t(\d)-urnas\.json$/.exec(n)).filter(Boolean).map(([, ano, turno]) => ({ ano, turno })).sort((a, b) => b.ano.localeCompare(a.ano) || a.turno.localeCompare(b.turno));
  await writeFile(`${pasta}/index.json`, JSON.stringify({ anos, urnas }));
}

export async function escreverNacional(pasta, nacional) {
  await mkdir(pasta, { recursive: true });
  await writeFile(`${pasta}/${nacional.ano}.json`, JSON.stringify(nacional));
  console.log(`  → ${pasta}/${nacional.ano}.json (${nacional.municipios.length} municípios, turnos ${Object.keys(nacional.turnos).join(' e ')}, fonte ${nacional.fonte})`);
  await indexar(pasta);
}
