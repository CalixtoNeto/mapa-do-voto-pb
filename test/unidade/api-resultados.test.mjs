import { test } from 'node:test';
import assert from 'node:assert/strict';
import { completarViaApi } from '../../scripts/fontes/api-resultados.mjs';
import { API } from '../../scripts/lib/tse.mjs';
import { novaApuracao } from '../../scripts/eleicao/apuracao.mjs';

const RESPOSTAS = {
  [`${API}/comum/config/ele-c.json`]: { pl: [{ c: 'ele2026', e: [{ tp: '1', cd: '600', cdt2: '601', abr: [{ cp: [{ cd: '3' }, { cd: '6' }] }] }] }] },
  [`${API}/ele2026/600/config/mun-e000600-cm.json`]: { abr: [{ cd: 'pb', mu: [{ cd: '20516', cdi: '2507507' }] }] },
  [`${API}/ele2026/601/dados/pb/pb-c0003-e000601-u.json`]: { and: 'p', dg: '25/10/2026', hg: '19:30:00' },
  [`${API}/ele2026/601/dados/pb/pb20516-c0003-e000601-u.json`]: { carg: [{ nmn: 'Governador', agr: [{ par: [{ sg: 'PART',
    cand: [{ n: '40', nmu: 'JOÃO', nm: 'JOÃO DA SILVA', sqcand: '150', vap: '321', st: '' }] }] }] }] },
};

function apiFalsa() {
  const pedidos = [];
  return { pedidos, buscarJson: async url => { pedidos.push(url); return RESPOSTAS[url] || null; } };
}

test('pede à API só o que falta e soma no turno certo', async () => {
  const { pedidos, buscarJson } = apiFalsa();
  const porTurno = { 1: novaApuracao('csv') };
  const adicionados = await completarViaApi('2026', porTurno, turno => turno === '2', buscarJson);
  assert.equal(adicionados, 1);
  assert.equal(porTurno[2].cands.get('2026|2|3|150').total, 321);
  assert.ok(!pedidos.some(url => url.includes('c0006-e000601')), 'deputado não tem 2º turno');
});

test('apuração parcial fica marcada como não final, com a data da API', async () => {
  const porTurno = {};
  await completarViaApi('2026', porTurno, turno => turno === '2', apiFalsa().buscarJson);
  assert.equal(porTurno[2].final, false);
  assert.equal(porTurno[2].atualizadoEm, '2026-10-25T19:30:00');
  assert.equal(porTurno[2].fonte, 'api');
});

test('ano que a API não conhece não adiciona nada', async () => {
  assert.equal(await completarViaApi('2010', {}, () => true, apiFalsa().buscarJson), 0);
});
