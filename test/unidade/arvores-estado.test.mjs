// Árvores do perfil do estado (public/js/perfil/arvores-estado.mjs) e as compartilhadas com o de Bayeux, no que o estado usa.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arvoreDosAutores, arvoreDasSecretarias, encurtar } from '../../public/js/perfil/arvores-estado.mjs';
import { semOrgaosPublicos } from '../../public/js/perfil/calculos-estado.mjs';
import { arvoreDasModalidades, arvoreDosCredores } from '../../public/js/perfil/arvores-prefeitura.mjs';
import { arvoreDeConcordancia, arvoreDasMaterias } from '../../public/js/perfil/arvores-camara.mjs';

const detalhe = { v: 100, filhos: [
  ['DEP A', 70, [['SECRETARIA SAUDE', 50, [['Ambulância', 30], ['Custeio', 20]]], ['SECRETARIA EDUCACAO', 20, [['Material', 20]]]]],
  ['DEP B', 30, [['SECRETARIA SAUDE', 30, [['Equipamento', 30]]]]]] };
const porDeputado = [['DEP A', 70, 3], ['DEP B', 30, 1], ['DEP C', 10, 2]];

test('autores: valor e emendas do arquivo do ano; abaixo, secretaria e objeto quando o detalhe existe', () => {
  const a = arvoreDosAutores(porDeputado, detalhe);
  assert.equal(a.v, 110);
  assert.deepEqual(a.filhos[0], ['DEP A', 70, [
    ['SECRETARIA SAUDE', 50, [['Ambulância', 30, undefined, '60% da secretaria'], ['Custeio', 20, undefined, '40% da secretaria']], '71% do deputado'],
    ['SECRETARIA EDUCACAO', 20, [['Material', 20, undefined, '100% da secretaria']], '29% do deputado']], '3 emendas · 64%']);
  assert.equal(a.filhos[1][3], '1 emenda · 27%');
});

test('autores: sem o detalhe (ainda carregando) ou sem o deputado nele, o ramo fica sem filhos', () => {
  assert.deepEqual(arvoreDosAutores(porDeputado, null).filhos[2], ['DEP C', 10, [], '2 emendas · 9%']);
  assert.deepEqual(arvoreDosAutores(porDeputado, detalhe).filhos[2][2], []);
});

test('secretarias: inverte deputado → secretaria → objeto em secretaria → deputado → objeto', () => {
  const a = arvoreDasSecretarias(detalhe);
  assert.equal(a.v, 100);
  assert.deepEqual(a.filhos[0], ['SECRETARIA SAUDE', 80, [
    ['DEP A', 50, [['Ambulância', 30, undefined, '60% do deputado'], ['Custeio', 20, undefined, '40% do deputado']], '63% da secretaria'],
    ['DEP B', 30, [['Equipamento', 30, undefined, '100% do deputado']], '38% da secretaria']], '2 deputados · 80%']);
  assert.equal(a.filhos[1][3], '1 deputado · 20%');
  assert.deepEqual(arvoreDasSecretarias(undefined), { v: 0, filhos: [] });
});

test('credores sem órgãos públicos: a lista mantém o formato [nome, documento, pago, vezes]', () => {
  const credores = [['PBPREV PARAIBA PREVIDENCIA', '1', 500, 9], ['TEIXEIRA LTDA', '3', 300, 15], ['SECRETARIA DE ESTADO DA SAUDE', '2', 400, 3]];
  assert.deepEqual(semOrgaosPublicos(credores), [['TEIXEIRA LTDA', '3', 300, 15]]);
});

test('licitações do estado: modalidade com os órgãos contratantes abaixo e a parte de cada um', () => {
  const a = arvoreDasModalidades([['PREGÃO', 3, 80]], { v: 80, filhos: [['PREGÃO', 80, [['SECRETARIA DA SAUDE', 60], ['SECRETARIA DA EDUCACAO', 20]]]] });
  assert.deepEqual(a.filhos[0][2].map(f => f[3]), ['75% da modalidade', '25% da modalidade']);
});

test('credores do estado: área e tipo de despesa de cada credor privado', () => {
  const area = { v: 10, filhos: [['SAUDE', 10, [['Serviços', 10, [['TEIXEIRA LTDA', 10]]]]]] };
  const a = arvoreDosCredores([['TEIXEIRA LTDA', '3', 10, 2]], area);
  assert.deepEqual(a.filhos[0][2].map(f => f[0]), ['SAUDE']);
});

test('deputado: concordância e matérias saem do mesmo molde da Câmara', () => {
  assert.equal(arvoreDeConcordancia([{ nome: 'Ana', parte: 1, total: 2 }], ['Votaram igual', 'Votaram diferente']).filhos[0][2].length, 2);
  assert.equal(arvoreDasMaterias([['Requerimento', 2]], [], 2).filhos[0][3], '100%');
});

test('credores: nomes repetidos (documentos diferentes) somam num ramo só e o que não cabe no valor do credor fica sem filhos', () => {
  const area = { v: 100, filhos: [['SAUDE', 100, [['Serviços', 100, [['EMPRESA A', 60], ['EMPRESA B', 40]]]]]] };
  const a = arvoreDosCredores([['EMPRESA A', '1', 30, 2], ['EMPRESA A', '2', 30, 1], ['EMPRESA B', '3', 10, 4]], area);
  assert.deepEqual(a.filhos.map(f => [f[0], f[1], f[2].length]), [['EMPRESA A', 60, 1], ['EMPRESA B', 10, 0]]);
  assert.equal(a.filhos[0][3], '3 pagamentos · 86%');
});

test('encurtar: texto longo vira o começo até a última palavra inteira, com reticências', () => {
  assert.equal(encurtar('curto', 20), 'curto');
  assert.equal(encurtar('Transferir recursos ao município de Sousa para a obra', 30), 'Transferir recursos ao…');
  assert.equal(encurtar('', 5), '');
});
