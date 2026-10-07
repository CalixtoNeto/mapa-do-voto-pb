import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leitorDeVotacaoPorMunicipio } from '../../scripts/fontes/csv-municipio.mjs';

const CABECALHO = '"ANO_ELEICAO";"NR_TURNO";"SG_UF";"CD_MUNICIPIO";"CD_CARGO";"DS_CARGO";"SQ_CANDIDATO";"NR_CANDIDATO";'
  + '"NM_URNA_CANDIDATO";"NM_CANDIDATO";"SG_PARTIDO";"DS_SIT_TOT_TURNO";"QT_VOTOS_NOMINAIS_VALIDOS"';
const linha = ({ ano = '2022', uf = 'PB', mun = '20516', cargo = '3', sit = 'ELEITO', votos = '10' } = {}) =>
  `"${ano}";"1";"${uf}";"${mun}";"${cargo}";"Governador";"150";"40";"JOÃO";"JOÃO DA SILVA";"PART";"${sit}";"${votos}"`;

function ler(linhas, { cargoAceito = () => true, cabecalho = CABECALHO } = {}) {
  const porTurno = {}, semIbge = new Set();
  const ibgeDe = codigo => ({ 20516: '2507507' })[codigo] || null;
  const aoLinha = leitorDeVotacaoPorMunicipio({ ano: '2022', ibgeDe, cargoAceito, porTurno, semIbge });
  aoLinha(cabecalho, true);
  for (const l of linhas) aoLinha(l, false);
  return { porTurno, semIbge, candidato: porTurno[1]?.cands.get('2022|1|3|150') };
}

test('soma os votos válidos do candidato no município IBGE', () => {
  const { candidato } = ler([linha({ votos: '10' }), linha({ votos: '5' })]);
  assert.equal(candidato.total, 15);
  assert.deepEqual(candidato.mun, { 2507507: 15 });
});

test('ignora outra UF, outro ano e cargo não aceito', () => {
  const { porTurno } = ler([linha({ uf: 'PE' }), linha({ ano: '2018' }), linha({ cargo: '11' })], { cargoAceito: c => c === '3' });
  assert.deepEqual(porTurno, {});
});

test('anota o município sem código IBGE em vez de somar', () => {
  const { porTurno, semIbge } = ler([linha({ mun: '99999' })]);
  assert.deepEqual(porTurno, {});
  assert.deepEqual([...semIbge], ['99999']);
});

test('situação "#NULO#" não apaga uma situação já conhecida', () => {
  const { candidato } = ler([linha({ sit: '2º TURNO' }), linha({ sit: '#NULO#' })]);
  assert.equal(candidato.sit, '2º TURNO');
});

test('arquivos antigos usam QT_VOTOS_NOMINAIS', () => {
  const antigo = CABECALHO.replace('QT_VOTOS_NOMINAIS_VALIDOS', 'QT_VOTOS_NOMINAIS');
  assert.equal(ler([linha({ votos: '7' })], { cabecalho: antigo }).candidato.total, 7);
});

test('falha com a lista de colunas ausentes', () => {
  assert.throws(() => ler([], { cabecalho: '"ANO_ELEICAO";"SG_UF"' }), /Colunas ausentes no CSV de 2022: NR_TURNO, CD_MUNICIPIO/);
});
