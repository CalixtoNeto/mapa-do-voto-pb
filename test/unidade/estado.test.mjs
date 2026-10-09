import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerTodasAsPaginas } from '../../scripts/fontes/api-pb.mjs';
import { novasDespesasDoEstado, somarDespesaDoEstado, resumoDasDespesasDoEstado, arvoresDasDespesasDoEstado, todosOsCredoresDoEstado } from '../../scripts/estado/despesas.mjs';
import { alertasDoEstado } from '../../scripts/estado/alertas.mjs';
import { novaFolhaDoEstado, somarServidorDoEstado, resumoDaFolhaDoEstado, arvoreDaFolhaDoEstado } from '../../scripts/estado/folha.mjs';
import { resumoDasContratacoes, arvoreDasContratacoes, resumoDosContratos } from '../../scripts/estado/compras.mjs';
import { resumoDasEmendasEstaduais } from '../../scripts/estado/emendas.mjs';

test('lê todas as páginas da API do estado, de 1.000 em 1.000', async () => {
  const pedidos = [];
  const buscarJson = async url => {
    pedidos.push(url);
    const pagina = Number(new URL(url).searchParams.get('page'));
    return { paginacao: { total: 3, total_paginas: 2 }, data: pagina === 1 ? [{ a: 1 }, { a: 2 }] : [{ a: 3 }] };
  };
  const itens = await lerTodasAsPaginas('despesas/orcamentarias', { ano: 2025, mes: 6 }, buscarJson);
  assert.deepEqual(itens, [{ a: 1 }, { a: 2 }, { a: 3 }]);
  assert.equal(pedidos.length, 2);
  assert.match(pedidos[0], /despesas\/orcamentarias\?ano=2025&mes=6&page=1&per_page=1000$/);
});

test('a API que pagina com "pages" (emendas, convênios) também é lida até o fim', async () => {
  const buscarJson = async url => ({ paginacao: { page: 1, pages: 2 }, items: [{ p: new URL(url).searchParams.get('page') }] });
  assert.deepEqual(await lerTodasAsPaginas('orcamento/listagem_emendas', { ano: 2025 }, buscarJson), [{ p: '1' }, { p: '2' }]);
});

const despesa = (mes, orgao, funcao, elemento, credor, doc, pago, fonte = 'RECURSOS ORDINÁRIOS') => ({
  ano: 2025, mes, nomeOrgao: orgao, nomeFuncao: funcao, descricaoElemento: elemento, nomeCredor: credor, cpfCnpjCredor: doc,
  nomeFonte: fonte, valorEmpenhado: pago, valorLiquidado: pago, valorPago: pago });

test('despesas do estado: pago por órgão, área e mês, credores e as árvores do gasto', () => {
  const d = novasDespesasDoEstado();
  [despesa(1, 'SEC SAUDE', 'SAÚDE', 'MATERIAL DE CONSUMO', 'FARMACIA A', '11111111000111', 100),
    despesa(2, 'SEC SAUDE', 'SAÚDE', 'VENCIMENTOS E VANTAGENS FIXAS - PESSOAL CIVIL', 'SECRETARIA DA SAUDE', '08778268000160', 500),
    despesa(2, 'SEC EDUCACAO', 'EDUCAÇÃO', 'MATERIAL DE CONSUMO', 'FARMACIA A', '11111111000111', 50)].forEach(r => somarDespesaDoEstado(d, r));
  const r = resumoDasDespesasDoEstado(d);
  assert.deepEqual(r.orgaos, [['SEC SAUDE', 600, 600], ['SEC EDUCACAO', 50, 50]]);
  assert.deepEqual(r.funcoes, [['SAÚDE', 600], ['EDUCAÇÃO', 50]]);
  assert.deepEqual(r.meses, [['01', 100], ['02', 550]]);
  assert.deepEqual(r.credores[0], ['SECRETARIA DA SAUDE', '08778268000160', 500, 1]);
  assert.equal(r.compras, 150, 'salário não é compra');
  const a = arvoresDasDespesasDoEstado(d);
  assert.deepEqual(a.area.filhos[0], ['SAÚDE', 600, [['VENCIMENTOS E VANTAGENS FIXAS - PESSOAL CIVIL', 500, [['SECRETARIA DA SAUDE', 500]]], ['MATERIAL DE CONSUMO', 100, [['FARMACIA A', 100]]]]]);
  assert.deepEqual(Object.keys(a), ['area', 'secretaria', 'fonte']);
  assert.deepEqual(todosOsCredoresDoEstado(d).map(c => c[0]), ['SECRETARIA DA SAUDE', 'FARMACIA A']);
});

test('alertas do estado: mês acima de 3 vezes a mediana e um fornecedor com 70% de um tipo de compra, na escala do estado', () => {
  const d = novasDespesasDoEstado();
  for (let m = 1; m <= 12; m++) somarDespesaDoEstado(d, despesa(m, 'SEC', 'SAÚDE', 'MATERIAL DE CONSUMO', m === 7 ? 'B' : 'A', '1', m === 7 ? 30e6 : 4e6));
  const alertas = alertasDoEstado(d);
  assert.deepEqual(alertas.find(a => a[0] === 'pico'), ['pico', 'MATERIAL DE CONSUMO', '07', 30e6, 4e6]);
  assert.deepEqual(alertas.find(a => a[0] === 'concentracao'), undefined, 'A tem 44 de 74 milhões: menos de 70%');
  somarDespesaDoEstado(d, despesa(8, 'SEC', 'SAÚDE', 'MATERIAL DE CONSUMO', 'A', '1', 60e6));
  assert.deepEqual(alertasDoEstado(d).find(a => a[0] === 'concentracao'), ['concentracao', 'MATERIAL DE CONSUMO', 'A', 104e6, 134e6]);
});

test('folha do estado: total do mês e pessoas por tipo de cargo e órgão, sem nomes', () => {
  const f = novaFolhaDoEstado();
  [{ periodo: 202506, tipoCargo: 'EFETIVO', orgaoLotacao: 'SEC SAUDE', valorBruto: 5000, nomeServidor: 'X' },
    { periodo: 202506, tipoCargo: 'EFETIVO', orgaoLotacao: 'SEC EDUCACAO', valorBruto: 3000, nomeServidor: 'Y' },
    { periodo: 202506, tipoCargo: 'COMISSIONADO', orgaoLotacao: 'SEC SAUDE', valorBruto: 8000, nomeServidor: 'Z' }].forEach(s => somarServidorDoEstado(f, s));
  const r = resumoDaFolhaDoEstado(f);
  assert.deepEqual(r, { mes: '202506', tipos: [['EFETIVO', 2, 8000], ['COMISSIONADO', 1, 8000]], orgaos: [['SEC SAUDE', 2, 13000], ['SEC EDUCACAO', 1, 3000]], total: 16000, pessoas: 3 });
  assert.deepEqual(arvoreDaFolhaDoEstado(f).filhos[0], ['EFETIVO', 8000, [['SEC SAUDE', 5000], ['SEC EDUCACAO', 3000]]]);
  assert.ok(!JSON.stringify(r).includes('"X"'));
});

test('compras do estado: contratações por modalidade e órgão; contratos por contratado', () => {
  const contratacoes = [{ modalidade: 'PREGÃO ELETRÔNICO', nomeOrgao: 'SEC SAUDE', valorAdjudicado: 900 }, { modalidade: 'PREGÃO ELETRÔNICO', nomeOrgao: 'SEC EDUCACAO', valorAdjudicado: 100 },
    { modalidade: 'DISPENSA', nomeOrgao: 'SEC SAUDE', valorAdjudicado: 50 }, { modalidade: 'CHAMAMENTO PÚBLICO', nomeOrgao: 'DETRAN', valorAdjudicado: 0 }];
  assert.deepEqual(resumoDasContratacoes(contratacoes), [['PREGÃO ELETRÔNICO', 2, 1000], ['DISPENSA', 1, 50], ['CHAMAMENTO PÚBLICO', 1, 0]]);
  assert.deepEqual(arvoreDasContratacoes(contratacoes).filhos[0], ['PREGÃO ELETRÔNICO', 1000, [['SEC SAUDE', 900], ['SEC EDUCACAO', 100]]]);
  const contratos = [{ contratado: 'EMPRESA A', cnpjCpf: '11.111.111/0001-11', valorTotal: 300 }, { contratado: 'EMPRESA A', cnpjCpf: '11111111000111', valorTotal: 200 }];
  assert.deepEqual(resumoDosContratos(contratos), [['EMPRESA A', '11111111000111', 500, 2]]);
});

test('emendas estaduais: por deputado e a árvore deputado → secretaria → objeto', () => {
  const lista = [{ nomeDeputado: 'FULANA', secretaria: 'SAUDE', objeto: 'AMBULANCIA PARA PATOS', valor: 300 },
    { nomeDeputado: 'FULANA', secretaria: 'EDUCACAO', objeto: 'REFORMA DE ESCOLA', valor: 100 }, { nomeDeputado: 'BELTRANO', secretaria: 'SAUDE', objeto: 'UBS', valor: 200 }];
  const r = resumoDasEmendasEstaduais(lista);
  assert.deepEqual(r.porDeputado, [['FULANA', 400, 2], ['BELTRANO', 200, 1]]);
  assert.deepEqual(r.arvore.filhos[0], ['FULANA', 400, [['SAUDE', 300, [['AMBULANCIA PARA PATOS', 300]]], ['EDUCACAO', 100, [['REFORMA DE ESCOLA', 100]]]]]);
  assert.equal(r.total, 600);
});

test('CPF de credor ou contratado pessoa física nunca sai inteiro: fica mascarado como o TCE-PB publica', () => {
  const d = novasDespesasDoEstado();
  somarDespesaDoEstado(d, despesa(1, 'SEC', 'SAÚDE', 'SERVIÇOS DE TERCEIROS - PESSOA FÍSICA', 'JOSE DA SILVA', '123.406.724-01', 100));
  assert.deepEqual(resumoDasDespesasDoEstado(d).credores[0], ['JOSE DA SILVA', '***.406.724-**', 100, 1]);
  assert.deepEqual(resumoDosContratos([{ contratado: 'MARIA', cnpjCpf: '12340672401', valorTotal: 10 }])[0], ['MARIA', '***.406.724-**', 10, 1]);
});
