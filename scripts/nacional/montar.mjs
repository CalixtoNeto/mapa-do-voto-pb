// Forma final do arquivo nacional: candidatos de cada turno do mais ao menos votado e, por município,
// [aptos, comparecimento, brancos, nulos, votos de cada candidato na ordem de `cands`].
const turnosDoAcumulador = acc => [...new Set([...acc.candidatos.keys()].map(chave => chave.split('|')[0]))].sort();

function candidatosDoTurno(acc, turno) {
  return [...acc.candidatos].filter(([chave]) => chave.startsWith(`${turno}|`)).map(([, c]) => c).sort((a, b) => b.total - a.total)
    .map(({ nr, urna, partido, sit }) => ({ nr, urna, partido, sit }));
}

function linhaDoMunicipio(m, turno, cands) {
  const t = m.turnos[turno];
  return t ? [...t.comparecimento, ...cands.map(c => t.votos.get(c.nr) || 0)] : null;
}

// Quinto item do município, só quando existe: { turno: votos anulados }.
function anuladosDoMunicipio(m) {
  const com = Object.entries(m.turnos).filter(([, t]) => t.anulados > 0).map(([turno, t]) => [turno, t.anulados]);
  return com.length ? [Object.fromEntries(com)] : [];
}

export function montarNacional(acc, { ano, fonte, atualizadoEm, tse }) {
  const turnos = Object.fromEntries(turnosDoAcumulador(acc).map(t => [t, { cands: candidatosDoTurno(acc, t) }]));
  const municipios = [...acc.municipios].sort((a, b) => a[1].uf.localeCompare(b[1].uf) || a[1].nome.localeCompare(b[1].nome, 'pt-BR')).map(([cd, m]) =>
    [cd, m.uf, m.nome, Object.fromEntries(Object.keys(turnos).map(t => [t, linhaDoMunicipio(m, t, turnos[t].cands)]).filter(([, linha]) => linha)), ...anuladosDoMunicipio(m)]);
  return { ano, fonte, atualizadoEm, ...(tse && { tse }), turnos, municipios };
}
