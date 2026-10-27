// Cenário nacional (sem DOM): lê as linhas de município do arquivo data/nacional/ANO.json e soma por país e por UF.
// Cada município é [código, UF, nome, { turno: [aptos, comparecimento, brancos, nulos, votos de cada candidato] }].
const soma = (lista, f) => lista.reduce((s, x) => s + f(x), 0);

export function linhasDoTurno(nac, turno) {
  return nac.municipios.filter(m => m[3][turno]).map(([cd, uf, nome, turnos, anulados]) => {
    const [aptos, comp, brancos, nulos, ...votos] = turnos[turno];
    return { cd, uf, nome, aptos, comp, brancos, nulos, votos, anulados: anulados?.[turno] || 0 };
  });
}

export function totaisDasLinhas(linhas) {
  const votos = (linhas[0]?.votos || []).map((_, i) => soma(linhas, l => l.votos[i]));
  const aptos = soma(linhas, l => l.aptos), comp = soma(linhas, l => l.comp);
  return { aptos, comp, abstencao: aptos - comp, brancos: soma(linhas, l => l.brancos), nulos: soma(linhas, l => l.nulos),
    validos: soma(votos, v => v), anulados: soma(linhas, l => l.anulados || 0), votos, margem: (votos[0] || 0) - (votos[1] || 0) };
}

export function totaisPorUf(linhas) {
  const porUf = new Map();
  for (const l of linhas) porUf.set(l.uf, [...(porUf.get(l.uf) || []), l]);
  return [...porUf].map(([uf, doUf]) => ({ uf, municipios: doUf.length, ...totaisDasLinhas(doUf) })).sort((a, b) => b.aptos - a.aptos);
}
