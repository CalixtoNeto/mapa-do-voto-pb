import { test } from 'node:test';
import assert from 'node:assert/strict';
import { novaApuracao, somarVoto, cargosApurados } from '../../scripts/eleicao/apuracao.mjs';

const joao = { key: '2022|1|3|150', ano: '2022', turno: '1', cargo: '3', nr: '40' };
const maria = { key: '2022|1|3|151', ano: '2022', turno: '1', cargo: '3', nr: '45' };

test('soma os votos do candidato por município e no total', () => {
  const apuracao = novaApuracao('csv');
  somarVoto(apuracao, joao, '2507507', 100);
  somarVoto(apuracao, joao, '2507507', 50);
  somarVoto(apuracao, joao, '2501534', 10);
  const registrado = apuracao.cands.get(joao.key);
  assert.equal(registrado.total, 160);
  assert.deepEqual(registrado.mun, { 2507507: 150, 2501534: 10 });
});

test('o total do cargo no município soma todos os candidatos', () => {
  const apuracao = novaApuracao('csv');
  somarVoto(apuracao, joao, '2507507', 100);
  somarVoto(apuracao, maria, '2507507', 40);
  assert.deepEqual(apuracao.tot['2022|1|3'], { 2507507: 140 });
});

test('cargosApurados diz quais pares turno e cargo já têm votos', () => {
  const apuracao = novaApuracao('csv');
  somarVoto(apuracao, joao, '2507507', 1);
  assert.deepEqual([...cargosApurados({ 1: apuracao })], ['1|3']);
});
