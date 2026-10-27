// Cenário nacional do 2º turno (scripts/nacional/ e scripts/fontes/nacional-csv.mjs): presidente por município, todas as UFs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { novoAcumulador, somarVotoNacional, somarComparecimentoNacional } from '../../scripts/nacional/acumulador.mjs';
import { montarNacional } from '../../scripts/nacional/montar.mjs';
import { leitorDeVotosNacionais, leitorDeComparecimentoNacional } from '../../scripts/fontes/nacional-csv.mjs';

const lula = { nr: '13', urna: 'LULA', partido: 'PT', sit: '' }, flavio = { nr: '22', urna: 'FLÁVIO BOLSONARO', partido: 'PL', sit: '' };
const sp = { turno: '2', uf: 'SP', cd: '71072', nome: 'SÃO PAULO' }, rio = { turno: '2', uf: 'RJ', cd: '60011', nome: 'RIO DE JANEIRO' };

function acumulado() {
  const acc = novoAcumulador();
  somarVotoNacional(acc, sp, lula, 600); somarVotoNacional(acc, sp, flavio, 300); somarVotoNacional(acc, rio, flavio, 500); somarVotoNacional(acc, rio, lula, 100);
  somarComparecimentoNacional(acc, sp, [1200, 1000, 40, 60]); somarComparecimentoNacional(acc, rio, [900, 700, 30, 70]);
  return acc;
}

test('acumulador soma por município e turno os votos de cada candidato e o comparecimento', () => {
  const acc = acumulado();
  somarVotoNacional(acc, sp, lula, 10); somarComparecimentoNacional(acc, sp, [0, 5, 0, 0]);
  assert.equal(acc.municipios.get('71072').turnos['2'].votos.get('13'), 610);
  assert.deepEqual(acc.municipios.get('71072').turnos['2'].comparecimento, [1200, 1005, 40, 60]);
});

test('montar: candidatos do mais ao menos votado (aqui o 22 tem 800 votos e o 13, 700) e cada município com [aptos, comparecimento, brancos, nulos, votos...]', () => {
  const n = montarNacional(acumulado(), { ano: '2026', fonte: 'csv', atualizadoEm: '2026-10-27T00:00:00Z' });
  assert.deepEqual(n.turnos['2'].cands.map(c => c.nr), ['22', '13']);
  assert.deepEqual(n.municipios, [['60011', 'RJ', 'RIO DE JANEIRO', { 2: [900, 700, 30, 70, 500, 100] }], ['71072', 'SP', 'SÃO PAULO', { 2: [1200, 1000, 40, 60, 300, 600] }]]);
  assert.equal(n.ano, '2026'); assert.equal(n.fonte, 'csv');
});

test('montar: município sem comparecimento fica com zeros e candidato que não teve votos ali com zero', () => {
  const acc = novoAcumulador();
  somarVotoNacional(acc, sp, lula, 5); somarVotoNacional(acc, rio, flavio, 7);
  const n = montarNacional(acc, { ano: '2026', fonte: 'csv' });
  assert.deepEqual(n.municipios.map(m => m[3][2]), [[0, 0, 0, 0, 7, 0], [0, 0, 0, 0, 0, 5]]);
});

const CAB_VOTOS = '"ANO_ELEICAO";"NR_TURNO";"SG_UF";"CD_MUNICIPIO";"NM_MUNICIPIO";"CD_CARGO";"SQ_CANDIDATO";"NR_CANDIDATO";"NM_URNA_CANDIDATO";"SG_PARTIDO";"DS_SIT_TOT_TURNO";"QT_VOTOS_NOMINAIS_VALIDOS"';
const votos = ({ ano = '2026', turno = '2', uf = 'SP', cargo = '1', nr = '13', v = '10' } = {}) => `"${ano}";"${turno}";"${uf}";"71072";"SÃO PAULO";"${cargo}";"1${nr}";"${nr}";"LULA";"PT";"#NULO#";"${v}"`;

test('leitor de votos: só presidente do ano pedido, somando as zonas', () => {
  const acc = novoAcumulador(), aoLinha = leitorDeVotosNacionais({ ano: '2026', acc });
  aoLinha(CAB_VOTOS, true);
  [votos(), votos({ v: '5' }), votos({ cargo: '3' }), votos({ ano: '2022' })].forEach(l => aoLinha(l, false));
  assert.equal(acc.municipios.get('71072').turnos['2'].votos.get('13'), 15);
  assert.equal(acc.municipios.get('71072').uf, 'SP');
  assert.equal([...acc.municipios.keys()].length, 1);
});

test('leitor de votos: avisa quando falta coluna obrigatória', () => {
  const aoLinha = leitorDeVotosNacionais({ ano: '2026', acc: novoAcumulador() });
  assert.throws(() => aoLinha('"ANO_ELEICAO";"NR_TURNO"', true), /Colunas ausentes/);
});

const CAB_COMP = '"ANO_ELEICAO";"NR_TURNO";"SG_UF";"CD_MUNICIPIO";"NM_MUNICIPIO";"CD_CARGO";"QT_APTOS";"QT_COMPARECIMENTO";"QT_VOTOS_BRANCOS";"QT_VOTOS_NULOS"';
const comp = ({ cargo = '1', uf = 'SP', aptos = '100' } = {}) => `"2026";"2";"${uf}";"71072";"SÃO PAULO";"${cargo}";"${aptos}";"80";"3";"7"`;

test('leitor de comparecimento: soma as zonas do presidente', () => {
  const acc = novoAcumulador(), aoLinha = leitorDeComparecimentoNacional({ ano: '2026', acc });
  aoLinha(CAB_COMP, true);
  [comp(), comp(), comp({ cargo: '3' })].forEach(l => aoLinha(l, false));
  assert.deepEqual(acc.municipios.get('71072').turnos['2'].comparecimento, [200, 160, 6, 14]);
});

test('turnoCompleto e descartarTurno: só vale o turno com votos e comparecimento, e descartar limpa só aquele turno', async () => {
  const { turnoCompleto, descartarTurno } = await import('../../scripts/nacional/acumulador.mjs');
  const acc = acumulado();
  somarVotoNacional(acc, { ...sp, turno: '1' }, lula, 50);
  assert.equal(turnoCompleto(acc, '2'), true);
  assert.equal(turnoCompleto(acc, '1'), false, 'sem comparecimento');
  descartarTurno(acc, '1');
  assert.equal(acc.municipios.get('71072').turnos['1'], undefined);
  assert.equal(acc.candidatos.has('1|13'), false);
  assert.equal(acc.candidatos.has('2|13'), true);
  assert.equal(turnoCompleto(acc, '3'), false);
});

test('anulados: votos nominais que não são válidos entram à parte, por município e turno, e só quando existem', async () => {
  const acc = novoAcumulador();
  somarVotoNacional(acc, sp, lula, 600, 4); somarVotoNacional(acc, sp, flavio, 300, 0); somarVotoNacional(acc, rio, lula, 10);
  assert.equal(acc.municipios.get('71072').turnos['2'].anulados, 4);
  const n = montarNacional(acc, { ano: '2026', fonte: 'csv' });
  assert.deepEqual(n.municipios.map(m => m[4]), [undefined, { 2: 4 }]);
});

const CAB_ANULADOS = CAB_VOTOS + ';"QT_VOTOS_NOMINAIS"';

test('leitor de votos: anulados = nominais − nominais válidos, quando o arquivo traz as duas colunas', () => {
  const acc = novoAcumulador(), aoLinha = leitorDeVotosNacionais({ ano: '2026', acc });
  aoLinha(CAB_ANULADOS, true);
  aoLinha(votos({ v: '10' }) + ';"13"', false);
  assert.equal(acc.municipios.get('71072').turnos['2'].anulados, 3);
  assert.equal(acc.municipios.get('71072').turnos['2'].votos.get('13'), 10);
});

const CAB_COMP_2026 = CAB_COMP + ';"QT_TOTAL_VOTOS_NULOS";"QT_VOTOS_NULOS_TECNICOS"';

test('leitor de comparecimento: nulos são o total (nulos do eleitor + técnicos), que é o que fecha com o comparecimento', () => {
  const acc = novoAcumulador(), aoLinha = leitorDeComparecimentoNacional({ ano: '2026', acc });
  aoLinha(CAB_COMP_2026, true);
  aoLinha(comp() + ';"10";"3"', false);
  assert.deepEqual(acc.municipios.get('71072').turnos['2'].comparecimento, [100, 80, 3, 10]);
});
