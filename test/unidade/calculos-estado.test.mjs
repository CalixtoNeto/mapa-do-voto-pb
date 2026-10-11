// Cálculos do perfil do Governo e das emendas estaduais (public/js/perfil/calculos-estado.mjs): credores privados, emendas por secretaria e por ano.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { credoresPrivados, emendasPorSecretaria, resumoDasEmendas, serieDeEmendas, deputadoDoAutor } from '../../public/js/perfil/calculos-estado.mjs';

test('credores privados: tira órgãos públicos do estado, mantém empresas e bancos', () => {
  const credores = [['PBPREV PARAIBA PREVIDENCIA', '1', 500, 9], ['SECRETARIA DE ESTADO DA SAUDE', '2', 400, 3], ['TEIXEIRA CONSTRUCOES LTDA', '3', 300, 15],
    ['INSS INST NACIONAL DO SEGURO SOCIAL', '4', 250, 4], ['BANCO DO BRASIL SA', '5', 200, 6], ['PREFEITURA MUNICIPAL DE ZABELE', '6', 90, 5], ['POLICIA MILITAR DO ESTADO', '7', 80, 1]];
  const { lista, fora } = credoresPrivados(credores, 10);
  assert.deepEqual(lista.map(c => c.n), ['TEIXEIRA CONSTRUCOES LTDA', 'BANCO DO BRASIL SA']);
  assert.equal(fora, 5);
  assert.deepEqual(lista[0], { n: 'TEIXEIRA CONSTRUCOES LTDA', v: 300, vezes: 15 });
});

test('credores privados: respeita o limite e a ordem por valor', () => {
  const credores = [['B LTDA', '1', 10, 1], ['A LTDA', '2', 30, 1], ['C LTDA', '3', 20, 1]];
  assert.deepEqual(credoresPrivados(credores, 2).lista.map(c => c.n), ['A LTDA', 'C LTDA']);
});

const arvore = { v: 60, filhos: [
  ['DEP A', 40, [['SECRETARIA DE ESTADO DA SAUDE', 30, []], ['SECRETARIA DE ESTADO DA EDUCACAO', 10, []]]],
  ['DEP B', 20, [['SECRETARIA DE ESTADO DA SAUDE', 15, []], ['SECRETARIA DE ESTADO DA INFRAESTRUTURA', 5, []]]]] };

test('emendas por secretaria: soma o segundo nível da árvore entre os deputados, do maior ao menor', () => {
  assert.deepEqual(emendasPorSecretaria(arvore), [{ n: 'SECRETARIA DE ESTADO DA SAUDE', v: 45 }, { n: 'SECRETARIA DE ESTADO DA EDUCACAO', v: 10 }, { n: 'SECRETARIA DE ESTADO DA INFRAESTRUTURA', v: 5 }]);
  assert.deepEqual(emendasPorSecretaria(null), []);
});

test('resumo das emendas: total, número de emendas, autores e o maior autor', () => {
  const r = resumoDasEmendas({ emendas: { total: 60, porDeputado: [['DEP A', 40, 3], ['DEP B', 20, 2]] } });
  assert.deepEqual(r, { total: 60, emendas: 5, autores: 2, maior: { nome: 'DEP A', valor: 40, fracao: 40 / 60 } });
  assert.equal(resumoDasEmendas({ emendas: { total: 0, porDeputado: [] } }), null);
  assert.equal(resumoDasEmendas({}), null);
});

test('série de emendas: um ponto por ano com emenda, do mais antigo ao mais novo', () => {
  const anos = [{ ano: '2025', emendas: { total: 5 } }, { ano: '2023', emendas: { total: 3 } }, { ano: '2024' }];
  assert.deepEqual(serieDeEmendas(anos), [{ ano: '2023', total: 3 }, { ano: '2025', total: 5 }]);
});

test('autor da emenda: acha o deputado pelo nome ou pelo nome completo, sem acento nem caixa', () => {
  const deputados = [{ nome: 'Adriano Galdino', completo: 'Adriano Cézar Galdino de Araújo' }, { nome: 'Dra. Paula', completo: 'Paula Francinete Pereira' }, { nome: 'Júnior Araújo', completo: 'José Júnior de Araújo' }];
  assert.equal(deputadoDoAutor('ADRIANO GALDINO', deputados), deputados[0]);
  assert.equal(deputadoDoAutor('DRA. PAULA', deputados), deputados[1]);
  assert.equal(deputadoDoAutor('JÚNIOR ARAÚJO', deputados), deputados[2]);
  assert.equal(deputadoDoAutor('FULANO', deputados), null);
  assert.equal(deputadoDoAutor('ADRIANO GALDINO', undefined), null);
});
