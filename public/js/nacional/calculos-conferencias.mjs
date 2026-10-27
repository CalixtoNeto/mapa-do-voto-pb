// Conferências de consistência (sem DOM): as contas que qualquer um pode refazer com os arquivos do TSE.

// Em cada município, votos válidos + brancos + nulos devem dar o comparecimento, e ninguém comparece mais do que o eleitorado apto.
export function conferirSomas(linhas) {
  const contados = l => l.votos.reduce((s, v) => s + v, 0) + l.brancos + l.nulos;
  const naoFecham = linhas.filter(l => contados(l) !== l.comp);
  return { municipios: linhas.length, naoFecham, diferenca: naoFecham.reduce((s, l) => s + l.comp - contados(l), 0),
    maisQueAptos: linhas.filter(l => l.comp > l.aptos) };
}

const ROTULOS = [['aptos', 'Aptos'], ['comparecimento', 'Comparecimento'], ['brancos', 'Brancos'], ['nulos', 'Nulos'], ['validos', 'Votos válidos']];

// totais: de totaisDasLinhas; tse: números que o próprio TSE publica para o país (ou undefined).
export function conferirComTse(totais, tse) {
  if (!tse) return null;
  const meus = { aptos: totais.aptos, comparecimento: totais.comp, brancos: totais.brancos, nulos: totais.nulos, validos: totais.validos };
  return ROTULOS.map(([chave, nome]) => ({ nome, site: meus[chave], tse: tse[chave], diferenca: meus[chave] - tse[chave] }));
}
