// Desenho do mapa do Brasil (sem DOM): projeção simples (graus de longitude encolhidos pelo cosseno da latitude do meio)
// e caminhos SVG das UFs a partir das geometrias da malha do IBGE.
const arredondar = n => Math.round(n * 10) / 10;

// caixa: { lonMin, lonMax, latMin, latMax }. Devolve projetar([lon, lat]) → [x, y] com .altura (norte em cima).
export function projecaoDoBrasil({ lonMin, lonMax, latMin, latMax }, largura) {
  const cosseno = Math.cos(((latMin + latMax) / 2) * Math.PI / 180), escala = largura / ((lonMax - lonMin) * cosseno);
  const projetar = ([lon, lat]) => [(lon - lonMin) * cosseno * escala, (latMax - lat) * escala];
  projetar.altura = (latMax - latMin) * escala;
  return projetar;
}

const aneis = geometria => geometria?.type === 'Polygon' ? geometria.coordinates : geometria?.type === 'MultiPolygon' ? geometria.coordinates.flat() : [];

export function caminhoDaGeometria(geometria, projetar) {
  return aneis(geometria).map(anel => anel.map((ponto, i) => {
    const [x, y] = projetar(ponto);
    return `${i ? 'L' : 'M'}${arredondar(x)},${arredondar(y)}`;
  }).join('') + 'Z').join('');
}

// Caixa do maior pedaço da UF (para pôr o rótulo; ilhas pequenas não puxam o centro).
export function centroDaGeometria(geometria, projetar) {
  const caixas = aneis(geometria).map(anel => {
    const pontos = anel.map(projetar), xs = pontos.map(p => p[0]), ys = pontos.map(p => p[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, largura: x1 - x0, altura: y1 - y0 };
  });
  return caixas.reduce((maior, c) => !maior || c.largura * c.altura > maior.largura * maior.altura ? c : maior, null);
}
