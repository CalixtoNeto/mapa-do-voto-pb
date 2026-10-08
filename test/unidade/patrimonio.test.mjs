import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registrarPatrimonio, patrimonioRecorrente } from '../../scripts/analises/patrimonio.mjs';
import { entradaDasAnalises } from '../../scripts/saida/analises.mjs';

const cand = (sq, nome, turno = '1') => ({ key: `2022|${turno}|6|${sq}`, nome });

test('liga os bens de cada eleição à pessoa pelo nome completo, como em pessoas.json', () => {
  const patrimonio = {};
  registrarPatrimonio(patrimonio, '2018', [cand('1', 'João da Silva')], { 1: { b: 1000 } });
  registrarPatrimonio(patrimonio, '2022', [cand('7', 'JOÃO DA SILVA'), cand('7', 'JOÃO DA SILVA', '2')], { 7: { b: 5000 } });
  registrarPatrimonio(patrimonio, '2022', [cand('8', 'Sem Bens')], { 8: {} });
  assert.deepEqual(patrimonio, { 'JOAO DA SILVA': [['2018', 1000], ['2022', 5000]] });
});

test('só quem declarou bens em duas eleições ou mais tem evolução', () => {
  assert.deepEqual(Object.keys(patrimonioRecorrente({ A: [1, 2], B: [1] })), ['A']);
});

test('o índice das análises diz o que existe de cada ano', () => {
  const arquivos = ['2022-candidatos.json', '2022-financas.json', '2022-t1-comparecimento.json',
    '2022-t2-comparecimento.json', '2018-candidatos.json', '2022-t1.json'];
  assert.deepEqual(entradaDasAnalises(arquivos), {
    2018: { candidatos: true },
    2022: { candidatos: true, financas: true, comparecimento: ['1', '2'] },
  });
});
