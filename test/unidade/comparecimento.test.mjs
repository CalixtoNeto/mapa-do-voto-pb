import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leitorDeComparecimento } from '../../scripts/fontes/comparecimento.mjs';

const linha = campos => campos.map(c => `"${c}"`).join(';');
const CABECALHO = ['ANO_ELEICAO', 'NR_TURNO', 'SG_UF', 'CD_MUNICIPIO', 'NR_ZONA', 'CD_CARGO', 'QT_APTOS',
  'QT_COMPARECIMENTO', 'QT_ABSTENCOES', 'QT_VOTOS_BRANCOS', 'QT_VOTOS_NULOS'];

function ler(linhas, cabecalho = CABECALHO) {
  const porTurno = {}, ibgeDe = codigo => ({ 20516: '2507507' })[codigo] || null;
  const aoLinha = leitorDeComparecimento({ ano: '2022', ibgeDe, cargoAceito: c => c !== '11', porTurno });
  aoLinha(linha(cabecalho), true);
  linhas.forEach(l => aoLinha(linha(l), false));
  return porTurno;
}

test('soma aptos, comparecimento, brancos e nulos das zonas de cada município', () => {
  const porTurno = ler([
    ['2022', '1', 'PB', '20516', '1', '3', '1000', '800', '200', '30', '20'],
    ['2022', '1', 'PB', '20516', '64', '3', '500', '400', '100', '10', '5'],
  ]);
  assert.deepEqual(porTurno, { 1: { 3: { 2507507: [1500, 1200, 40, 25] } } });
});

test('ignora outra UF, cargo fora do site e município sem IBGE', () => {
  assert.deepEqual(ler([
    ['2022', '1', 'PE', '20516', '1', '3', '1', '1', '0', '0', '0'],
    ['2022', '1', 'PB', '20516', '1', '11', '1', '1', '0', '0', '0'],
    ['2022', '1', 'PB', '99999', '1', '3', '1', '1', '0', '0', '0'],
  ]), {});
});

test('nos arquivos novos os nulos vêm em QT_TOTAL_VOTOS_NULOS', () => {
  const novo = CABECALHO.map(c => c === 'QT_VOTOS_NULOS' ? 'QT_TOTAL_VOTOS_NULOS' : c);
  assert.deepEqual(ler([['2022', '2', 'PB', '20516', '1', '1', '10', '8', '2', '1', '3']], novo), { 2: { 1: { 2507507: [10, 8, 1, 3] } } });
});

test('quando o arquivo traz os votos de legenda, eles entram como quinto número', () => {
  const comLegenda = [...CABECALHO, 'QT_VOTOS_LEGENDA_VALIDOS'];
  assert.deepEqual(ler([['2022', '1', 'PB', '20516', '1', '6', '10', '8', '2', '1', '1', '2'],
    ['2022', '1', 'PB', '20516', '2', '6', '10', '8', '2', '1', '1', '3']], comLegenda), { 1: { 6: { 2507507: [20, 16, 2, 2, 5] } } });
});
