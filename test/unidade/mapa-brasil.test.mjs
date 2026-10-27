// Mapa do Brasil por UF: malha do IBGE (scripts/mapa/ufs.mjs), projeção e caminhos (public/js/nacional/calculos-mapa.mjs) e escala viridis.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ufsDoGeojson, SIGLAS_POR_CODIGO } from '../../scripts/mapa/ufs.mjs';
import { projecaoDoBrasil, caminhoDaGeometria, centroDaGeometria } from '../../public/js/nacional/calculos-mapa.mjs';
import { corViridis, textoSobre, PARADAS_VIRIDIS } from '../../public/js/nacional/cores-viridis.mjs';

test('malha do IBGE: o código da UF vira a sigla e só ficam sigla e código', () => {
  const geo = { features: Object.keys(SIGLAS_POR_CODIGO).map(codarea => ({ type: 'Feature', properties: { codarea, outro: 1 }, geometry: null })) };
  const uf = ufsDoGeojson(geo);
  assert.equal(uf.features.length, 27);
  assert.deepEqual(uf.features.find(f => f.properties.codigo === '25').properties, { codigo: '25', sigla: 'PB' });
  assert.equal(new Set(uf.features.map(f => f.properties.sigla)).size, 27);
});

test('malha do IBGE: código desconhecido ou número errado de UFs é erro, não mapa torto', () => {
  assert.throws(() => ufsDoGeojson({ features: [{ properties: { codarea: '99' } }] }), /UF/);
  assert.throws(() => ufsDoGeojson({ features: [{ properties: { codarea: '25' } }] }), /27/);
});

const brasil = { lonMin: -74, lonMax: -34, latMin: -34, latMax: 6 };

test('projeção: a largura pedida é a do Brasil, o norte fica em cima e a altura vem da proporção real', () => {
  const p = projecaoDoBrasil(brasil, 600);
  const [x0, y0] = p([-74, 6]), [x1, y1] = p([-34, -34]);
  assert.equal(Math.round(x0), 0); assert.equal(Math.round(y0), 0);
  assert.equal(Math.round(x1), 600);
  assert.ok(y1 > 0 && Math.abs(y1 - p.altura) < 1e-9);
  assert.ok(p([-50, 0])[1] < p([-50, -20])[1], 'norte acima do sul');
  assert.ok(p.altura > 600 * 0.9 && p.altura < 600 * 1.2);
});

test('caminho: polígono vira M…L…Z; multipolígono junta os pedaços; ponto fora da lista é ignorado', () => {
  const p = projecaoDoBrasil(brasil, 400);
  const quadrado = [[-70, 0], [-60, 0], [-60, -10], [-70, -10], [-70, 0]];
  const d = caminhoDaGeometria({ type: 'Polygon', coordinates: [quadrado] }, p);
  assert.match(d, /^M[\d.]+,[\d.]+(L[\d.]+,[\d.]+){3,}Z$/);
  const dois = caminhoDaGeometria({ type: 'MultiPolygon', coordinates: [[quadrado], [quadrado]] }, p);
  assert.equal(dois.split('M').length - 1, 2);
  assert.equal(caminhoDaGeometria({ type: 'Point', coordinates: [0, 0] }, p), '');
});

test('centro: caixa do maior pedaço do estado, no sistema da projeção', () => {
  const p = projecaoDoBrasil(brasil, 400);
  const grande = [[-70, 0], [-60, 0], [-60, -10], [-70, -10], [-70, 0]], ilha = [[-40, -30], [-39, -30], [-39, -31], [-40, -31], [-40, -30]];
  const c = centroDaGeometria({ type: 'MultiPolygon', coordinates: [[ilha], [grande]] }, p);
  const [cx, cy] = p([-65, -5]);
  assert.ok(Math.abs(c.x - cx) < 1 && Math.abs(c.y - cy) < 1);
  assert.ok(c.largura > 90 && c.largura < 130);
});

test('viridis: do roxo ao amarelo, interpolando entre as paradas e travando fora de 0 a 1', () => {
  assert.equal(PARADAS_VIRIDIS.length, 9);
  assert.equal(corViridis(0), '#440154');
  assert.equal(corViridis(1), '#fde725');
  assert.equal(corViridis(-3), '#440154');
  assert.equal(corViridis(9), '#fde725');
  assert.match(corViridis(0.5), /^#[0-9a-f]{6}$/);
  assert.notEqual(corViridis(0.31), corViridis(0.32));
});

test('texto sobre a cor: claro nas escuras, escuro nas claras', () => {
  assert.equal(textoSobre(corViridis(0)), '#ffffff');
  assert.equal(textoSobre(corViridis(1)), '#15212c');
});

test('malha por município: cada feature do estado recebe código e sigla da UF, para depois juntar os municípios', async () => {
  const { marcarUf } = await import('../../scripts/mapa/ufs.mjs');
  const geo = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { id: '2507507', name: 'João Pessoa' }, geometry: null }] };
  assert.deepEqual(marcarUf(geo, '25').features[0].properties, { codigo: '25', sigla: 'PB' });
  assert.throws(() => marcarUf(geo, '99'), /UF/);
});
