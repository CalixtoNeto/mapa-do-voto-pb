import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ehVotoNominal, leitorDeVotosPorLocal } from '../../scripts/fontes/csv-secao.mjs';
import { preencherNomes, nomeAusente } from '../../scripts/fontes/locais-votacao.mjs';

test('voto nominal precisa do número de dígitos do cargo', () => {
  assert.equal(ehVotoNominal('6', '1234'), true);
  assert.equal(ehVotoNominal('6', '12'), false, 'voto de legenda');
  assert.equal(ehVotoNominal('11', '10'), false, 'cargo fora do site');
});

test('branco (95) e nulo (96) não são votos nominais', () => {
  assert.equal(ehVotoNominal('3', '95'), false);
  assert.equal(ehVotoNominal('3', '96'), false);
  assert.equal(ehVotoNominal('3', '40'), true);
});

test('nomes como "#NULO#" contam como ausentes', () => {
  assert.equal(nomeAusente(' #NULO# '), true);
  assert.equal(nomeAusente(''), true);
  assert.equal(nomeAusente('ESCOLA #1'), false);
});

const CABECALHO = '"ANO_ELEICAO";"NR_TURNO";"SG_UF";"CD_MUNICIPIO";"NR_ZONA";"NR_SECAO";"CD_CARGO";"NR_VOTAVEL";'
  + '"NR_LOCAL_VOTACAO";"NM_LOCAL_VOTACAO";"QT_VOTOS"';
const secao = (sec, local, nome, votos) => `"2022";"1";"PB";"20516";"1";"${sec}";"3";"40";"${local}";"${nome}";"${votos}"`;

function ler(linhas) {
  const porTurno = {}, pendentes = [];
  const aoLinha = leitorDeVotosPorLocal({ ano: '2022', ibgeDe: () => '2507507', cargoAceito: () => true, porTurno, pendentes });
  aoLinha(CABECALHO, true);
  for (const l of linhas) aoLinha(l, false);
  return { turno: porTurno[1], pendentes };
}

test('seções do mesmo local somam no mesmo índice da lista de locais', () => {
  const { turno } = ler([secao('10', '1015', 'LYCEU', '3'), secao('11', '1015', 'LYCEU', '4'), secao('12', '1020', 'OUTRA', '1')]);
  assert.deepEqual(turno.locais['2507507'], [{ n: 'LYCEU' }, { n: 'OUTRA' }]);
  assert.deepEqual(turno.votos['3|40']['2507507'], { 0: 7, 1: 1 });
});

test('local sem nome recebe um nome provisório e fica pendente pela seção', () => {
  const { turno, pendentes } = ler([secao('10', '1040', '#NULO#', '1')]);
  assert.deepEqual(turno.locais['2507507'], [{ n: 'Local 1040 (zona 1)' }]);
  assert.equal(pendentes[0].chave, '20516|1|10');
  assert.equal(preencherNomes(pendentes, new Map([['20516|1|10', 'E.E. ANCHIETA']])), 1);
  assert.deepEqual(turno.locais['2507507'], [{ n: 'E.E. ANCHIETA' }]);
});

test('o CSV sem a coluna de nome do local é recusado', () => {
  const aoLinha = leitorDeVotosPorLocal({ ano: '2022', ibgeDe: () => null, cargoAceito: () => true, porTurno: {}, pendentes: [] });
  assert.throws(() => aoLinha('"SG_UF";"CD_CARGO"', true), /sem nome de local/);
});
