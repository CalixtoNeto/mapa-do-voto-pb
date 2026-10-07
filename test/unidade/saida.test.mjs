import { test } from 'node:test';
import assert from 'node:assert/strict';
import { podarLocais } from '../../scripts/saida/podar-locais.mjs';
import { normalizarNome, registrarPessoas, pessoasRecorrentes } from '../../scripts/saida/pessoas.mjs';
import { resumoDoTurno } from '../../scripts/saida/escrever.mjs';
import { novaApuracao, somarVoto } from '../../scripts/eleicao/apuracao.mjs';

const candidato = (nr, cargo = '3') => ({ key: `2022|1|${cargo}|${nr}`, ano: '2022', turno: '1', cargo, nr, cargoNome: 'Governador' });

test('a poda remove candidatos anulados e municípios onde o candidato não teve voto válido', () => {
  const apuracao = novaApuracao('csv');
  somarVoto(apuracao, candidato('40'), '2507507', 10);
  const locais = { locais: {}, votos: { '3|40': { 2507507: { 0: 10 }, 2501534: { 0: 3 } }, '3|55': { 2507507: { 0: 9 } } } };
  podarLocais(locais, apuracao);
  assert.deepEqual(locais.votos, { '3|40': { 2507507: { 0: 10 } } });
});

test('nomes iguais com e sem acento são a mesma pessoa', () => {
  assert.equal(normalizarNome('João  da Silva-Júnior'), 'JOAO DA SILVA JUNIOR');
});

test('registra parcela e posição de cada candidato dentro do cargo', () => {
  const pessoas = {};
  registrarPessoas(pessoas, { ano: '2022', turno: '1', cands: [
    { cargo: '3', nr: '45', nome: 'Maria', total: 25 },
    { cargo: '3', nr: '40', nome: 'João', total: 75 },
  ] });
  assert.deepEqual(pessoas.JOAO, [['2022', '1', '3', '40', 75, 0.75, 1]]);
  assert.deepEqual(pessoas.MARIA, [['2022', '1', '3', '45', 25, 0.25, 2]]);
});

test('só quem disputou duas eleições ou mais entra em pessoas.json', () => {
  assert.deepEqual(Object.keys(pessoasRecorrentes({ A: [1, 2], B: [1] })), ['A']);
});

test('o resumo ordena por cargo e por votos e usa a hora da geração quando a fonte não informa', () => {
  const apuracao = novaApuracao('csv');
  somarVoto(apuracao, candidato('45'), '2507507', 1);
  somarVoto(apuracao, candidato('40'), '2507507', 9);
  somarVoto(apuracao, { ...candidato('13', '1'), cargoNome: 'Presidente' }, '2507507', 5);
  const resumo = resumoDoTurno('2022', '1', apuracao, new Date('2026-10-05T12:00:00Z'));
  assert.deepEqual(resumo.cands.map(c => c.nr), ['13', '40', '45']);
  assert.deepEqual(resumo.cargos, [{ cd: '1', nome: 'Presidente' }, { cd: '3', nome: 'Governador' }]);
  assert.equal(resumo.atualizadoEm, '2026-10-05T12:00:00.000Z');
});
