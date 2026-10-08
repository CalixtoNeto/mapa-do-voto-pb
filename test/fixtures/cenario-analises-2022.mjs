// Acrescenta ao cenário de 2022 os arquivos das análises, nos formatos do TSE: cadastro de candidatos,
// bens, prestação de contas e detalhe da votação. Os candidatos são os do cenário de votação.
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { zipSync } from 'fflate';

const csv = linhas => linhas.map(campos => campos.map(c => `"${c}"`).join(';')).join('\r\n') + '\r\n';
const windows1252 = texto => new Uint8Array(Buffer.from(texto, 'latin1'));
const arquivos = porNome => zipSync(Object.fromEntries(Object.entries(porNome).map(([n, l]) => [n, windows1252(csv(l))])));

const ID = ['ANO_ELEICAO', 'NR_TURNO', 'SG_UF', 'SG_UE', 'CD_CARGO', 'SQ_CANDIDATO', 'NR_CANDIDATO'];
const CADASTRO = [...ID, 'SG_PARTIDO', 'DS_GENERO', 'DS_COR_RACA', 'NR_IDADE_DATA_POSSE', 'DS_GRAU_INSTRUCAO',
  'DS_OCUPACAO', 'ST_REELEICAO', 'DS_SIT_TOT_TURNO', 'DS_SITUACAO_CANDIDATURA'];
const pb = (turno, cargo, sq, nr) => ['2022', turno, 'PB', 'PB', cargo, sq, nr];
const CANDIDATOS_PB = [CADASTRO,
  [...pb('1', '3', '150', '40'), 'PART', 'MASCULINO', 'BRANCA', '60', 'SUPERIOR COMPLETO', 'GOVERNADOR', 'S', '2º TURNO', 'APTO'],
  [...pb('2', '3', '150', '40'), 'PART', 'MASCULINO', 'BRANCA', '60', 'SUPERIOR COMPLETO', 'GOVERNADOR', 'S', 'ELEITO', 'APTO'],
  [...pb('1', '3', '151', '45'), 'PART', 'FEMININO', 'PARDA', '52', 'SUPERIOR COMPLETO', 'PROFESSOR', 'N', 'NÃO ELEITO', 'APTO'],
  [...pb('1', '6', '160', '1234'), 'OUTRO', 'FEMININO', 'PRETA', '#NULO#', 'ENSINO MÉDIO COMPLETO', 'COMERCIANTE', 'N', 'ELEITO POR QP', 'APTO'],
  [...pb('1', '11', '170', '10'), 'PART', 'MASCULINO', 'BRANCA', '40', 'X', 'X', 'N', 'ELEITO', 'APTO'],
];
const CANDIDATOS_BRASIL = [CADASTRO,
  ['2022', '1', 'BR', 'BR', '1', '900', '13', 'PART', 'MASCULINO', 'PARDA', '77', 'SUPERIOR COMPLETO', 'PRESIDENTE', 'N', '2º TURNO', 'APTO'],
  CANDIDATOS_PB[3].map((c, i) => i === 3 ? 'PB' : c),
];
const BENS = ['ANO_ELEICAO', 'SG_UF', 'SQ_CANDIDATO', 'VR_BEM_CANDIDATO'];
const RECEITA = [...ID, 'DS_FONTE_RECEITA', 'DS_ORIGEM_RECEITA', 'NR_CPF_CNPJ_DOADOR', 'NM_DOADOR', 'NM_DOADOR_RFB', 'VR_RECEITA'];
const DESPESA = [...ID, 'DS_ORIGEM_DESPESA', 'VR_DESPESA_CONTRATADA'];
const DETALHE = ['ANO_ELEICAO', 'NR_TURNO', 'SG_UF', 'CD_MUNICIPIO', 'NR_ZONA', 'CD_CARGO', 'QT_APTOS', 'QT_COMPARECIMENTO',
  'QT_ABSTENCOES', 'QT_VOTOS_BRANCOS', 'QT_VOTOS_NULOS'];
const detalhe = (turno, mun, cargo, ...n) => ['2022', turno, 'PB', mun, '1', cargo, ...n];

const ZIPS = {
  'consulta-cand-2022.zip': { 'consulta_cand_2022_PB.csv': CANDIDATOS_PB, 'consulta_cand_2022_BRASIL.csv': CANDIDATOS_BRASIL },
  'bem-candidato-2022.zip': {
    'bem_candidato_2022_PB.csv': [BENS, ['2022', 'PB', '150', '1.000.000,00'], ['2022', 'PB', '150', '250000,00'], ['2022', 'PB', '160', '80000,00']],
    'bem_candidato_2022_BRASIL.csv': [BENS, ['2022', 'BR', '900', '3000000,00'], ['2022', 'PB', '150', '999,00']],
  },
  'prestacao-contas-2022.zip': {
    'receitas_candidatos_2022_PB.csv': [RECEITA,
      [...pb('1', '3', '150', '40'), 'Fundo Especial', 'Recursos de partido político', '1', 'PART', '#NULO#', '2000000,00'],
      [...pb('1', '3', '150', '40'), 'Outros Recursos', 'Recursos de pessoas físicas', '111', 'EMPRESARIO', 'EMPRESARIO RICO', '50000,00'],
      [...pb('1', '6', '160', '1234'), 'Fundo Especial', 'Recursos de partido político', '2', 'OUTRO', '#NULO#', '300000,00'],
      [...pb('1', '6', '160', '1234'), 'Outros Recursos', 'Recursos de pessoas físicas', '111', 'EMPRESARIO', 'EMPRESARIO RICO', '10000,00'],
      [...pb('1', '6', '160', '1234'), 'Outros Recursos', 'Recursos próprios', '9', 'ZÉ', 'ZÉ', '5000,00'],
    ],
    'receitas_candidatos_doador_originario_2022_PB.csv': [RECEITA],
    'despesas_contratadas_candidatos_2022_PB.csv': [DESPESA,
      [...pb('1', '3', '150', '40'), 'Publicidade por adesivos', '1500000,00'],
      [...pb('1', '6', '160', '1234'), 'Despesas com pessoal', '200000,00'],
      [...pb('1', '6', '160', '1234'), 'Doações financeiras a outros candidatos/partidos', '15000,00'],
    ],
  },
  'detalhe-munzona-2022.zip': {
    'detalhe_votacao_munzona_2022_PB.csv': [DETALHE,
      detalhe('1', '20516', '3', '600000', '480000', '120000', '9000', '12000'),
      detalhe('1', '19305', '3', '300000', '250000', '50000', '4000', '6000'),
      detalhe('2', '20516', '3', '600000', '470000', '130000', '7000', '15000'),
    ],
    'detalhe_votacao_munzona_2022_BRASIL.csv': [DETALHE, detalhe('1', '20516', '1', '600000', '480000', '120000', '3000', '8000')],
  },
};

export async function acrescentarAnalises2022(pasta) {
  for (const [zip, porNome] of Object.entries(ZIPS)) await writeFile(join(pasta, 'tmp', zip), arquivos(porNome));
}
