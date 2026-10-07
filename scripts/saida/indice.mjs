// index.json lista as eleições disponíveis para o site; pessoas.json liga o mesmo candidato entre elas.
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { registrarPessoas, pessoasRecorrentes } from './pessoas.mjs';

const ARQUIVO_DE_ELEICAO = /^\d{4}-t\d\.json$/;

export async function indexar(pasta) {
  const eleicoes = [], pessoas = {};
  for (const arquivo of (await readdir(pasta)).filter(f => ARQUIVO_DE_ELEICAO.test(f)).sort()) {
    const eleicao = JSON.parse(await readFile(`${pasta}/${arquivo}`, 'utf8'));
    registrarPessoas(pessoas, eleicao);
    eleicoes.push(entradaDoIndice(eleicao, arquivo, arquivoDeLocais(pasta, arquivo)));
  }
  await writeFile(`${pasta}/pessoas.json`, JSON.stringify(pessoasRecorrentes(pessoas)));
  await writeFile(`${pasta}/index.json`, JSON.stringify({ geradoEm: new Date().toISOString(), eleicoes }));
}

function arquivoDeLocais(pasta, arquivo) {
  const locais = arquivo.replace('.json', '-locais.json');
  return existsSync(`${pasta}/${locais}`) ? locais : null;
}

const entradaDoIndice = ({ ano, turno, cargos, fonte, final, atualizadoEm }, arquivo, locais) =>
  ({ ano, turno, arquivo, locais, cargos, fonte, final, atualizadoEm });
