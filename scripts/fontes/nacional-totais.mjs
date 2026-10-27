// Totais nacionais do presidente que o próprio TSE publica, para conferir com a soma dos municípios.
import { API, getJson, pad } from '../lib/tse.mjs';
import { inteiro } from '../lib/csv.mjs';
import { eleicoesDoAno } from './api-resultados.mjs';

const CHAVES = ['ea', 'c', 'a', 'vb', 'vn', 'vv'];
const temTotais = bloco => bloco && CHAVES.every(chave => bloco[chave] != null);

// O bloco com os totais está na raiz, em abr[0] ou em carg[0], conforme o arquivo.
export function numerosDoTse(arquivo) {
  const bloco = [arquivo, arquivo?.abr?.[0], arquivo?.carg?.[0]].find(temTotais);
  if (!bloco) return null;
  const [aptos, comparecimento, abstencoes, brancos, nulos, validos] = CHAVES.map(chave => inteiro(bloco[chave]));
  return { aptos, comparecimento, abstencoes, brancos, nulos, validos };
}

export async function totaisNacionaisDoTse(ano, buscarJson = getJson) {
  const eleicao = (await eleicoesDoAno(ano, buscarJson)).find(e => e.tp === '1');
  const totais = {};
  for (const [turno, codigo] of [['1', eleicao?.cd], ['2', eleicao?.cdt2]]) {
    if (!codigo) continue;
    const lido = numerosDoTse(await buscarJson(`${API}/ele${ano}/${codigo}/dados-simplificados/br/br-c0001-e${pad(codigo, 6)}-r.json`));
    if (lido) totais[turno] = lido;
  }
  return totais;
}
