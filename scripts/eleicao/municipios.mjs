import { readFile } from 'node:fs/promises';

// O TSE e o IBGE numeram os municípios de formas diferentes; o site usa o código do IBGE.
export function criarConversorTseIbge(tabela) {
  return codigoTse => tabela[String(parseInt(codigoTse, 10))] || null;
}

export async function carregarConversorTseIbge(caminho) {
  return criarConversorTseIbge(JSON.parse(await readFile(caminho, 'utf8')));
}
