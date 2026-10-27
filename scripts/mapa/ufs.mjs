// Malha das UFs do IBGE: troca o código de cada UF pela sigla e descarta o resto das propriedades.
export const SIGLAS_POR_CODIGO = { 11: 'RO', 12: 'AC', 13: 'AM', 14: 'RR', 15: 'PA', 16: 'AP', 17: 'TO', 21: 'MA', 22: 'PI', 23: 'CE', 24: 'RN', 25: 'PB',
  26: 'PE', 27: 'AL', 28: 'SE', 29: 'BA', 31: 'MG', 32: 'ES', 33: 'RJ', 35: 'SP', 41: 'PR', 42: 'SC', 43: 'RS', 50: 'MS', 51: 'MT', 52: 'GO', 53: 'DF' };

export function ufsDoGeojson(geo) {
  const features = geo.features.map(f => {
    const codigo = String(f.properties.codarea ?? f.properties.CD_UF), sigla = SIGLAS_POR_CODIGO[codigo];
    if (!sigla) throw new Error(`Código de UF desconhecido na malha do IBGE: ${codigo}`);
    return { ...f, properties: { codigo, sigla } };
  });
  const total = Object.keys(SIGLAS_POR_CODIGO).length;
  if (features.length !== total) throw new Error(`Esperava ${total} UFs na malha do IBGE, vieram ${features.length}`);
  return { ...geo, features };
}
