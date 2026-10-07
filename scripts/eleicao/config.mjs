export const UF = 'PB';
export const ANOS_PADRAO = ['2014', '2018', '2022', '2026'];

export const CARGOS = { PRESIDENTE: '1', GOVERNADOR: '3', SENADOR: '5', DEPUTADO_FEDERAL: '6', DEPUTADO_ESTADUAL: '7' };
export const CARGOS_DO_SITE = Object.values(CARGOS);
export const CARGOS_COM_2_TURNO = [CARGOS.PRESIDENTE, CARGOS.GOVERNADOR];

// Com menos dígitos que isto, o número votado é de partido (voto de legenda), não de candidato.
export const DIGITOS_DO_CANDIDATO = { '1': 2, '3': 2, '5': 3, '6': 4, '7': 5 };
export const NUMEROS_BRANCO_E_NULO = ['95', '96'];

export const PASTA_ELEICOES = 'public/data/eleicoes';
export const PASTA_DOWNLOADS = 'tmp';
export const TABELA_TSE_IBGE = 'public/data/tse-ibge-pb.json';
