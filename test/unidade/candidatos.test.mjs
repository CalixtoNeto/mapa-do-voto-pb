import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leitorDeCandidatos, novosCandidatos, perfisComBens } from '../../scripts/fontes/candidatos.mjs';
import { leitorDeBens } from '../../scripts/fontes/bens.mjs';

const CABECALHO = ['ANO_ELEICAO', 'NR_TURNO', 'SG_UF', 'SG_UE', 'CD_CARGO', 'SQ_CANDIDATO', 'NR_CANDIDATO', 'SG_PARTIDO',
  'DS_GENERO', 'DS_COR_RACA', 'NR_IDADE_DATA_POSSE', 'DT_NASCIMENTO', 'DS_GRAU_INSTRUCAO', 'DS_OCUPACAO', 'ST_REELEICAO',
  'DS_SIT_TOT_TURNO'];
const linha = campos => campos.map(c => `"${c}"`).join(';');
const maria = ({ turno = '1', uf = 'PB', idade = '45', sit = 'ELEITO POR QP' } = {}) =>
  ['2022', turno, uf, uf, '6', '150', '1234', 'PART', 'FEMININO', 'PARDA', idade, '01/02/1980', 'SUPERIOR COMPLETO',
    'ADVOGADO', 'S', sit];

function lerCandidatos(linhas, cabecalho = CABECALHO) {
  const candidatos = novosCandidatos(), aoLinha = leitorDeCandidatos({ ano: '2022', candidatos, cargoAceito: () => true });
  aoLinha(linha(cabecalho), true);
  linhas.forEach(l => aoLinha(linha(l), false));
  return candidatos;
}

test('perfil do candidato com gênero, cor, idade, instrução, ocupação, reeleição, situação e partido', () => {
  const perfis = perfisComBens(lerCandidatos([maria()]), new Map());
  assert.deepEqual(perfis[150], { g: 'FEMININO', r: 'PARDA', i: 45, e: 'SUPERIOR COMPLETO', o: 'ADVOGADO', re: 1,
    s: 'ELEITO POR QP', p: 'PART' });
});

test('a situação final vem do turno mais recente', () => {
  const perfis = perfisComBens(lerCandidatos([maria({ turno: '2', sit: 'ELEITO' }), maria({ sit: '2º TURNO' })]), new Map());
  assert.equal(perfis[150].s, 'ELEITO');
});

test('sem a idade na posse, calcula pela data de nascimento', () => {
  const perfis = perfisComBens(lerCandidatos([maria({ idade: '#NULO#' })]), new Map());
  assert.equal(perfis[150].i, 42);
});

test('ignora outra UF', () => {
  assert.deepEqual(perfisComBens(lerCandidatos([maria({ uf: 'PE' })]), new Map()), {});
});

test('os bens declarados entram pelo sequencial do candidato', () => {
  const bens = new Map(), aoLinha = leitorDeBens({ ano: '2022', bens });
  aoLinha(linha(['ANO_ELEICAO', 'SQ_CANDIDATO', 'VR_BEM_CANDIDATO']), true);
  aoLinha(linha(['2022', '150', '100.000,00']), false);
  aoLinha(linha(['2022', '150', '2500,50']), false);
  assert.equal(perfisComBens(lerCandidatos([maria()]), bens)[150].b, 102501);
});
