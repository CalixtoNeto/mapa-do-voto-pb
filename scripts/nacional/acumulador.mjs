// Acumula o presidente por município (código do TSE) e turno: votos de cada candidato e [aptos, comparecimento, brancos, nulos].
export const novoAcumulador = () => ({ municipios: new Map(), candidatos: new Map() });

// O TSE escreve o código do município com ou sem zeros à esquerda conforme o arquivo; a chave é sempre o número.
const chaveDoMunicipio = cd => String(parseInt(cd, 10));

function doMunicipio(acc, { uf, cd, nome, turno }) {
  const chave = chaveDoMunicipio(cd), m = acc.municipios.get(chave) || { uf, nome, turnos: {} };
  acc.municipios.set(chave, m);
  return m.turnos[turno] ||= { votos: new Map(), comparecimento: [0, 0, 0, 0], anulados: 0 };
}

// anulados: votos nominais que não entram nos válidos (candidatura indeferida ou sub judice); contam no comparecimento.
export function somarVotoNacional(acc, lugar, candidato, votos, anulados = 0) {
  const turno = doMunicipio(acc, lugar), chave = `${lugar.turno}|${candidato.nr}`;
  turno.votos.set(candidato.nr, (turno.votos.get(candidato.nr) || 0) + votos);
  turno.anulados += anulados;
  const conhecido = acc.candidatos.get(chave) || { ...candidato, total: 0 };
  conhecido.total += votos;
  if (candidato.sit && !candidato.sit.startsWith('#')) conhecido.sit = candidato.sit;
  acc.candidatos.set(chave, conhecido);
}

export function somarComparecimentoNacional(acc, lugar, numeros) {
  const { comparecimento } = doMunicipio(acc, lugar);
  numeros.forEach((valor, i) => { comparecimento[i] += valor; });
}

// Um turno só está completo com votos e comparecimento; senão o gerador o refaz inteiro por outra fonte.
export function turnoCompleto(acc, turno) {
  const tem = [...acc.candidatos.keys()].some(chave => chave.startsWith(`${turno}|`));
  return tem && [...acc.municipios.values()].some(m => m.turnos[turno]?.comparecimento[1] > 0);
}

export function descartarTurno(acc, turno) {
  for (const chave of [...acc.candidatos.keys()]) if (chave.startsWith(`${turno}|`)) acc.candidatos.delete(chave);
  for (const m of acc.municipios.values()) delete m.turnos[turno];
}
