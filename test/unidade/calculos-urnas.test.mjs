// Cálculos da seção "Urnas" do cenário nacional (public/js/nacional/calculos-urnas.mjs), sobre as linhas de município de ANO-tTURNO-urnas.json.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { totaisDasUrnas, urnasPorUf, valorDaMetrica, METRICAS, prorrogadasContraNormais } from '../../public/js/nacional/calculos-urnas.mjs';

// [cd, uf, nome, lidas, semBoletim, aptos, comparecimento, g0, g1, g2, brancos, nulos, semDigital, abriuTarde, fechouTarde, prorrogadas, normal, prorrog]
const linha = (cd, uf, extra = {}) => {
  const base = [cd, uf, `M${cd}`, 10, 1, 3000, 2500, 100, 2200, 200, 20, 80, 1, 2, 3, 0, [10, 2500, 1300, 1000], [0, 0, 0, 0]];
  Object.entries(extra).forEach(([i, v]) => { base[i] = v; });
  return base;
};

test('totais: soma seções, comparecimento, biometria e as marcas de seção atípica', () => {
  const t = totaisDasUrnas([linha('1', 'PB'), linha('2', 'PB', { 3: 20, 6: 5000, 8: 4000, 12: 3 })]);
  assert.deepEqual([t.lidas, t.semBoletim, t.aptos, t.comparecimento, t.biometria], [30, 2, 6000, 7500, 6200]);
  assert.deepEqual([t.semDigital, t.abriuTarde, t.fechouTarde, t.prorrogadas], [4, 4, 6, 0]);
});

test('por UF: agrupa as linhas e mantém a ordem alfabética', () => {
  const ufs = urnasPorUf([linha('1', 'SP'), linha('2', 'AC'), linha('3', 'SP')]);
  assert.deepEqual(ufs.map(u => [u.uf, u.lidas]), [['AC', 10], ['SP', 20]]);
});

test('métricas: biometria é parcela do comparecimento; as demais, parcela das seções lidas', () => {
  const t = totaisDasUrnas([linha('1', 'PB')]);
  assert.equal(valorDaMetrica(t, 'biometria'), 2200 / 2500);
  assert.equal(valorDaMetrica(t, 'semDigital'), 1 / 10);
  assert.equal(valorDaMetrica(t, 'fechouTarde'), 3 / 10);
  assert.deepEqual(METRICAS.map(m => m.id), ['biometria', 'semDigital', 'abriuTarde', 'fechouTarde', 'prorrogadas']);
});

test('métricas: sem seções lidas devolve null, não NaN', () => {
  assert.equal(valorDaMetrica(totaisDasUrnas([]), 'semDigital'), null);
});

test('prorrogadas: compara, dentro de cada município, a parcela do candidato nas seções prorrogadas e nas demais', () => {
  const com = (cd, normal, prorrog) => linha(cd, 'PB', { 15: prorrog[0], 16: normal, 17: prorrog });
  const r = prorrogadasContraNormais([com('1', [10, 2000, 1000, 1000], [5, 1000, 700, 300]), com('2', [10, 2000, 1000, 1000], [0, 0, 0, 0]), com('3', [10, 2000, 1000, 1000], [5, 1000, 400, 600])], 0);
  assert.equal(r.municipios.length, 2, 'município sem seção prorrogada fica fora');
  assert.deepEqual(r.municipios.map(m => Math.round(m.diferenca * 100)), [20, -10]);
  assert.equal(r.secoes, 10);
  assert.equal(Math.round(r.diferenca * 1000), 50, 'média ponderada pelos votos das seções prorrogadas');
});
