// O CSV por seção também conta votos de candidaturas anuladas; o CSV por município só conta os válidos.
// Fica só o que bate com o total do município, para a lista de locais nunca contradizer o card do site.
export function podarLocais(votosPorLocal, apuracao) {
  const candidatoPorNumero = new Map([...apuracao.cands.values()].map(c => [`${c.cargo}|${c.nr}`, c]));
  for (const [numero, porMunicipio] of Object.entries(votosPorLocal.votos)) {
    const candidato = candidatoPorNumero.get(numero);
    if (candidato) removerMunicipiosSemVoto(porMunicipio, candidato);
    if (!candidato || !Object.keys(porMunicipio).length) delete votosPorLocal.votos[numero];
  }
}

function removerMunicipiosSemVoto(porMunicipio, candidato) {
  for (const ibge of Object.keys(porMunicipio)) if (!(candidato.mun[ibge] > 0)) delete porMunicipio[ibge];
}
