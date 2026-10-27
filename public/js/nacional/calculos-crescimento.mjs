// Crescimento de votos entre dois turnos (sem DOM): para cada candidato do turno, quanto os votos válidos dele
// cresceram (ou caíram) em relação ao turno anterior, no país e em cada UF. O candidato é achado pelo número.
import { linhasDoTurno } from './calculos-nacional.mjs';

const item = (antes, depois) => ({ antes, depois, crescimento: antes > 0 ? depois / antes - 1 : null });

function somarPorCandidato(pares, indices, quantos) {
  const antes = indices.map(i => i < 0 ? null : 0), depois = Array(quantos).fill(0);
  for (const { l1, l2 } of pares) indices.forEach((i, k) => { if (i >= 0) antes[k] += l1.votos[i]; depois[k] += l2.votos[k]; });
  return antes.map((a, k) => ({ nr: null, ...item(a, depois[k]) }));
}

// Só entram os municípios que têm os dois turnos, para a comparação ser do mesmo conjunto.
export function crescimentoDeVotos(nac, { anterior, turno }) {
  const candidatos = nac.turnos[turno].cands.map(({ nr, urna }) => ({ nr, urna }));
  const indices = candidatos.map(c => nac.turnos[anterior].cands.findIndex(x => x.nr === c.nr));
  const antes = new Map(linhasDoTurno(nac, anterior).map(l => [l.cd, l]));
  const pares = linhasDoTurno(nac, turno).filter(l2 => antes.has(l2.cd)).map(l2 => ({ l1: antes.get(l2.cd), l2 }));
  const comNr = lista => lista.map((x, k) => ({ ...x, nr: candidatos[k].nr, urna: candidatos[k].urna }));
  const ufs = [...new Set(pares.map(p => p.l2.uf))].map(uf => ({ uf, itens: comNr(somarPorCandidato(pares.filter(p => p.l2.uf === uf), indices, candidatos.length)) }));
  return { candidatos, brasil: comNr(somarPorCandidato(pares, indices, candidatos.length)), ufs };
}
