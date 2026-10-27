// Boletins de urna (sem DOM): totais, taxas por UF e a comparação das seções prorrogadas com as demais.
// Cada linha de município de ANO-tTURNO-urnas.json: [cd, uf, nome, lidas, semBoletim, aptos, comparecimento, g0, g1(biometria), g2,
//   brancos, nulos, semDigital, abriuTarde, fechouTarde, prorrogadas, [seções, comparecimento, A, B] normais, [..] prorrogadas].
const COLUNAS = { lidas: 3, semBoletim: 4, aptos: 5, comparecimento: 6, biometria: 8, semDigital: 12, abriuTarde: 13, fechouTarde: 14, prorrogadas: 15 };

export const METRICAS = [
  { id: 'biometria', curto: 'Biometria', rotulo: 'Biometria (grupo do meio do boletim)', base: 'comparecimento', nota: 'do comparecimento' },
  { id: 'semDigital', curto: 'Poucos na biometria', rotulo: 'Seções com poucos eleitores no grupo da biometria', base: 'lidas', nota: 'das seções lidas' },
  { id: 'abriuTarde', curto: 'Abriram tarde', rotulo: 'Seções que abriram mais de 15 minutos depois das 8h', base: 'lidas', nota: 'das seções lidas' },
  { id: 'fechouTarde', curto: 'Fecharam tarde', rotulo: 'Seções que fecharam mais de 30 minutos depois das 17h', base: 'lidas', nota: 'das seções lidas' },
  { id: 'prorrogadas', curto: 'Depois das 18h', rotulo: 'Seções que fecharam depois das 18h', base: 'lidas', nota: 'das seções lidas' }];

export function totaisDasUrnas(linhas) {
  const t = Object.fromEntries(Object.keys(COLUNAS).map(chave => [chave, 0]));
  for (const l of linhas) for (const [chave, i] of Object.entries(COLUNAS)) t[chave] += l[i];
  return t;
}

export function urnasPorUf(linhas) {
  const porUf = new Map();
  for (const l of linhas) (porUf.get(l[1]) || porUf.set(l[1], []).get(l[1])).push(l);
  return [...porUf].map(([uf, ls]) => ({ uf, ...totaisDasUrnas(ls) })).sort((a, b) => a.uf.localeCompare(b.uf));
}

export function valorDaMetrica(t, id) {
  const { base } = METRICAS.find(m => m.id === id);
  return t[base] > 0 ? t[id] / t[base] : null;
}

const parcela = ([, , a, b]) => a / (a + b);

// Dentro de cada município, a parcela do candidato nas seções prorrogadas menos a das demais: o lugar é o mesmo, então a diferença não vem de
// o município votar mais num lado. A média nacional é ponderada pelos votos das seções prorrogadas.
export function prorrogadasContraNormais(linhas, candidato) {
  const municipios = linhas.filter(l => l[17][0] > 0 && l[16][0] > 0 && l[16][2] + l[16][3] > 0 && l[17][2] + l[17][3] > 0).map(l => {
    const votos = l[17][2] + l[17][3];
    const [normal, prorrog] = [l[16], l[17]].map(g => candidato ? 1 - parcela(g) : parcela(g));
    return { cd: l[0], uf: l[1], nome: l[2], secoes: l[17][0], votos, normal, prorrog, diferenca: prorrog - normal };
  });
  const votos = municipios.reduce((s, m) => s + m.votos, 0);
  return { municipios, secoes: municipios.reduce((s, m) => s + m.secoes, 0), votos, diferenca: votos ? municipios.reduce((s, m) => s + m.diferenca * m.votos, 0) / votos : null };
}
