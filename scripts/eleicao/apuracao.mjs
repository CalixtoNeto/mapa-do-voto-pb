// Apuração de um turno: os candidatos (com total e votos por município) e o total de cada cargo por município.
// Os nomes curtos dos campos (cands, tot, mun) são o formato dos JSON que o site lê.
export const novaApuracao = fonte => ({ cands: new Map(), tot: {}, final: true, atualizadoEm: null, fonte });

export const chaveDoCargo = (ano, turno, cargo) => `${ano}|${turno}|${cargo}`;

export function apuracaoDoTurno(porTurno, turno, fonte) {
  return porTurno[turno] ||= novaApuracao(fonte);
}

export function somarVoto(apuracao, candidato, ibge, votos) {
  const registrado = registrarCandidato(apuracao, candidato);
  registrado.mun[ibge] = (registrado.mun[ibge] || 0) + votos;
  registrado.total += votos;
  const totalDoCargo = apuracao.tot[chaveDoCargo(candidato.ano, candidato.turno, candidato.cargo)] ||= {};
  totalDoCargo[ibge] = (totalDoCargo[ibge] || 0) + votos;
}

function registrarCandidato(apuracao, candidato) {
  if (!apuracao.cands.has(candidato.key)) apuracao.cands.set(candidato.key, { ...candidato, total: 0, mun: {} });
  return apuracao.cands.get(candidato.key);
}

export function cargosApurados(porTurno) {
  const presentes = new Set();
  for (const [turno, apuracao] of Object.entries(porTurno)) {
    for (const candidato of apuracao.cands.values()) presentes.add(`${turno}|${candidato.cargo}`);
  }
  return presentes;
}
