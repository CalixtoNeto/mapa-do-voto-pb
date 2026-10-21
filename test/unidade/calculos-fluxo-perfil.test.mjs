// Grafos de fluxo do estado (public/js/perfil/calculos-fluxo-perfil.mjs) e da campanha (public/js/calculos-fluxo-campanha.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { grafoDaCampanha } from '../../public/js/calculos-fluxo-campanha.mjs';
import { grafoDoEleitorado } from '../../public/js/calculos-fluxo-eleitorado.mjs';
import { grafoDoGoverno, grafoDasEmendasEstaduais } from '../../public/js/perfil/calculos-fluxo-perfil.mjs';

const nomes = coluna => coluna.map(n => n.n);

test('campanha: grupos de origem → campanha → categorias de gasto', () => {
  const resumo = { grupos: [{ nome: 'Fundo eleitoral', v: 600 }, { nome: 'Doações', v: 0 }, { nome: 'Próprios', v: 100 }],
    categorias: [['PUBLICIDADE POR CARROS DE SOM', 300, []], ['SERVIÇOS ADVOCATÍCIOS', 100, []]] };
  assert.deepEqual(grafoDaCampanha(resumo).colunas.map(nomes), [['Fundo eleitoral', 'Próprios'], ['Campanha'], ['Publicidade por carros de som', 'Serviços advocatícios']]);
  assert.equal(grafoDaCampanha({ grupos: [], categorias: [['a', 1, []]] }), null);
});

test('governo: órgãos com nomes enxutos → pago → funções, com a função do TCE-PB corrigida', () => {
  const a = { despesas: { orgaos: [['SECRETARIA DE ESTADO DA SAUDE', 400, 300], ['POLICIA MILITAR DO ESTADO', 100, 90]],
    funcoes: [['SAÚDE', 250], ['Assistêncial Social', 140]] } };
  assert.deepEqual(grafoDoGoverno(a).colunas.map(nomes), [['Sec. Saude', 'Policia Militar'], ['Pago'], ['Saúde', 'Assistência social']]);
  assert.equal(grafoDoGoverno({ despesas: null }), null);
});

test('emendas estaduais: deputado → secretaria somando os objetos', () => {
  const arvore = { v: 30, filhos: [['TOVAR CORREIA LIMA', 20, [['SECRETARIA DE ESTADO DA SAÚDE', 15, []], ['FUNDO X', 5, []]]], ['CAIO ROBERTO', 10, [['SECRETARIA DE ESTADO DA SAÚDE', 10, []]]]] };
  const g = grafoDasEmendasEstaduais(arvore);
  assert.deepEqual(g.colunas.map(nomes), [['Tovar Correia Lima', 'Caio Roberto'], ['Sec. Saúde', 'Fundo X']]);
  assert.equal(g.fluxos.reduce((s, f) => s + f.v, 0), 30);
  assert.equal(grafoDasEmendasEstaduais(null), null);
});

test('eleitorado: aptos → compareceram ou abstenção → válidos, brancos e nulos', () => {
  const g = grafoDoEleitorado({ aptos: 100, comparecimento: 80, brancos: 5, nulos: 7 });
  assert.deepEqual(g.colunas.map(nomes), [['Aptos'], ['Compareceram', 'Abstenção'], ['Votos válidos', 'Nulos', 'Brancos']]);
  assert.equal(g.fluxos.find(f => f.para === 'validos').v, 68);
  assert.equal(g.fluxos.find(f => f.para === 'abstencao').v, 20);
  assert.equal(grafoDoEleitorado({ aptos: 0, comparecimento: 0, brancos: 0, nulos: 0 }), null);
});
