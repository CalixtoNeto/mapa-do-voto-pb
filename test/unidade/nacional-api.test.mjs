// Presidente por município pela API de resultados do TSE (scripts/fontes/nacional-api.mjs), para o que o CSV ainda não publicou.
// O formato dos arquivos é o mesmo que scripts/fontes/api-resultados.mjs já lê; os totais de comparecimento ficam em carg[0].
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerResultadoDoMunicipio, completarNacionalViaApi } from '../../scripts/fontes/nacional-api.mjs';
import { novoAcumulador } from '../../scripts/nacional/acumulador.mjs';

const resultado = (extra = {}) => ({ carg: [{ nmn: 'Presidente', ea: '1200', c: '1000', vb: '40', vn: '60',
  agr: [{ par: [{ sg: 'PT', cand: [{ n: '13', nmu: 'LULA', vap: '600', st: 'Eleito' }] }] }, { par: [{ sg: 'PL', cand: [{ n: '22', nmu: 'FLÁVIO', vap: '300', st: '' }] }] }], ...extra }] });

test('lê candidatos e comparecimento de um município', () => {
  const r = lerResultadoDoMunicipio(resultado());
  assert.deepEqual(r.candidatos, [{ nr: '13', urna: 'LULA', partido: 'PT', sit: 'Eleito', votos: 600 }, { nr: '22', urna: 'FLÁVIO', partido: 'PL', sit: '', votos: 300 }]);
  assert.deepEqual(r.comparecimento, [1200, 1000, 40, 60]);
});

test('sem os totais de comparecimento, só os candidatos', () => {
  const r = lerResultadoDoMunicipio({ carg: [{ agr: [] }] });
  assert.equal(r.comparecimento, null);
  assert.deepEqual(r.candidatos, []);
  assert.equal(lerResultadoDoMunicipio({}), null);
});

function apiFalsa() {
  const config = { pl: [{ c: 'ele2026', e: [{ cd: '544', tp: '1', cdt2: '545', abr: [{ cp: [{ cd: '1' }] }] }] }] };
  const municipios = { abr: [{ cd: 'sp', mu: [{ cd: '71072', nm: 'SÃO PAULO' }] }, { cd: 'zz', mu: [{ cd: '99015', nm: 'ARGENTINA' }] }] };
  return async url => {
    if (url.endsWith('ele-c.json')) return config;
    if (url.includes('mun-e000544-cm.json')) return municipios;
    if (url.includes('/ele2026/545/dados/sp/sp71072-c0001-e000545-u.json')) return resultado();
    if (url.includes('/ele2026/545/dados/zz/zz99015-c0001-e000545-u.json')) return resultado({ ea: undefined });
    return null;
  };
}

test('completa só o turno que falta, com UF em maiúsculas e o exterior como ZZ', async () => {
  const acc = novoAcumulador();
  const adicionados = await completarNacionalViaApi('2026', acc, turno => turno === '2', apiFalsa());
  assert.equal(adicionados, 1);
  assert.equal(acc.municipios.get('71072').uf, 'SP');
  assert.equal(acc.municipios.get('71072').turnos['2'].votos.get('13'), 600);
  assert.equal(acc.municipios.get('99015').uf, 'ZZ');
  assert.equal(acc.municipios.get('71072').turnos['1'], undefined);
});

test('turno sem arquivo na API (ainda não apurado) não adiciona nada', async () => {
  const acc = novoAcumulador();
  assert.equal(await completarNacionalViaApi('2026', acc, () => true, async url => url.endsWith('ele-c.json') ? { pl: [] } : null), 0);
  assert.equal(acc.municipios.size, 0);
});

test('totais nacionais do TSE: lê o bloco que tiver os números, em qualquer um dos formatos', async () => {
  const { numerosDoTse, totaisNacionaisDoTse } = await import('../../scripts/fontes/nacional-totais.mjs');
  const bloco = { ea: '1000', c: '800', a: '200', vb: '10', vn: '20', vv: '770' };
  assert.deepEqual(numerosDoTse({ abr: [bloco] }), { aptos: 1000, comparecimento: 800, abstencoes: 200, brancos: 10, nulos: 20, validos: 770 });
  assert.deepEqual(numerosDoTse({ carg: [bloco] }), numerosDoTse(bloco));
  assert.equal(numerosDoTse({ abr: [{ vv: '5' }] }), null);
  assert.equal(numerosDoTse(null), null);
  const config = { pl: [{ c: 'ele2026', e: [{ cd: '544', tp: '1', cdt2: '545' }] }] };
  const buscar = async url => url.endsWith('ele-c.json') ? config : url.includes('/ele2026/545/dados-simplificados/br/br-c0001-e000545-r.json') ? { abr: [bloco] } : null;
  const totais = await totaisNacionaisDoTse('2026', buscar);
  assert.deepEqual(Object.keys(totais), ['2']);
  assert.equal(totais['2'].validos, 770);
});
