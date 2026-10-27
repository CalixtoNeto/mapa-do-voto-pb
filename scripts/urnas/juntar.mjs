// Junta os arquivos por UF da coleta de urnas num só (ano e turno), trocando as UFs que já estavam no arquivo anterior.
const porUf = (a, b) => a[1].localeCompare(b[1]) || a[2].localeCompare(b[2], 'pt-BR');

export function juntarUrnas(existente, partes) {
  const novas = new Set(partes.map(p => p.uf));
  const ufs = [...(existente?.ufs || []).filter(u => !novas.has(u.uf)), ...partes.map(({ uf, secoes, lidas, erros }) => ({ uf, secoes, lidas, erros }))].sort((a, b) => a.uf.localeCompare(b.uf));
  const referencia = partes[0] || existente;
  return { ano: referencia.ano, turno: referencia.turno, pleito: referencia.pleito, geradoEm: new Date().toISOString(), candidatos: referencia.candidatos, ufs,
    municipios: [...(existente?.municipios || []).filter(m => !novas.has(m[1])), ...partes.flatMap(p => p.municipios)].sort(porUf),
    atipicas: [...(existente?.atipicas || []).filter(a => !novas.has(a[0])), ...partes.flatMap(p => p.atipicas)] };
}
