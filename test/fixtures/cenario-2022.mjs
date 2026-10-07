// Monta, numa pasta temporária, um cenário pequeno da eleição de 2022 com os mesmos formatos do TSE.
// Os .zip ficam em tmp/, onde o gerador procura antes de baixar, então nada sai para a rede.
import { mkdtemp, mkdir, writeFile, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { zipSync } from 'fflate';

const API = 'https://resultados.tse.jus.br/oficial';
const JOAO_PESSOA = '20516';
const CAMPINA_GRANDE = '19305';

const csv = linhas => linhas.map(campos => campos.map(c => `"${c}"`).join(';')).join('\r\n') + '\r\n';
const windows1252 = texto => new Uint8Array(Buffer.from(texto, 'latin1'));
const zipComCsv = (nome, linhas) => zipSync({ [nome]: windows1252(csv(linhas)) });

const CABECALHO_MUNZONA = ['ANO_ELEICAO', 'NR_TURNO', 'SG_UF', 'CD_MUNICIPIO', 'CD_CARGO', 'DS_CARGO', 'SQ_CANDIDATO',
  'NR_CANDIDATO', 'NM_URNA_CANDIDATO', 'NM_CANDIDATO', 'SG_PARTIDO', 'DS_SIT_TOT_TURNO', 'QT_VOTOS_NOMINAIS_VALIDOS'];
const governador = (mun, sq, nr, urna, nome, votos, sit) =>
  ['2022', '1', 'PB', mun, '3', 'Governador', sq, nr, urna, nome, 'PART', sit, votos];

const MUNZONA_PB = [
  CABECALHO_MUNZONA,
  governador(JOAO_PESSOA, '150', '40', 'JOÃO', 'JOÃO DA SILVA', '500', '2º TURNO'),
  governador(CAMPINA_GRANDE, '150', '40', 'JOÃO', 'JOÃO DA SILVA', '300', '2º TURNO'),
  governador(JOAO_PESSOA, '151', '45', 'MARIA', 'MARIA SOUZA', '400', '#NULO#'),
  governador(CAMPINA_GRANDE, '151', '45', 'MARIA', 'MARIA SOUZA', '200', '#NULO#'),
  ['2022', '1', 'PB', JOAO_PESSOA, '6', 'Deputado Federal', '160', '1234', 'ZÉ', 'JOSÉ DE SOUZA', 'PART', 'ELEITO POR QP', '100'],
  ['2022', '1', 'PB', JOAO_PESSOA, '11', 'Prefeito', '170', '10', 'FORA', 'CARGO FORA', 'PART', '', '999'],
  ['2022', '1', 'PE', '25313', '3', 'Governador', '180', '40', 'OUTRA UF', 'OUTRA UF', 'PART', '', '999'],
  ['2022', '1', 'PB', '99999', '3', 'Governador', '150', '40', 'JOÃO', 'JOÃO DA SILVA', '7', '2º TURNO'],
];
const MUNZONA_BRASIL = [
  CABECALHO_MUNZONA,
  ['2022', '1', 'PB', JOAO_PESSOA, '1', 'Presidente', '900', '13', 'PRESIDENTE', 'PESSOA PRESIDENTE', 'PART', '2º TURNO', '1000'],
  ['2022', '1', 'PB', CAMPINA_GRANDE, '1', 'Presidente', '900', '13', 'PRESIDENTE', 'PESSOA PRESIDENTE', 'PART', '2º TURNO', '800'],
  ['2022', '1', 'SP', '71072', '1', 'Presidente', '900', '13', 'PRESIDENTE', 'PESSOA PRESIDENTE', 'PART', '2º TURNO', '9999'],
  ['2022', '2', 'PB', JOAO_PESSOA, '1', 'Presidente', '900', '13', 'PRESIDENTE', 'PESSOA PRESIDENTE', 'PART', 'ELEITO', '1100'],
];

const CABECALHO_SECAO = ['ANO_ELEICAO', 'NR_TURNO', 'SG_UF', 'CD_MUNICIPIO', 'NR_ZONA', 'NR_SECAO', 'CD_CARGO',
  'NR_VOTAVEL', 'NR_LOCAL_VOTACAO', 'NM_LOCAL_VOTACAO', 'QT_VOTOS'];
const LYCEU = 'ESCOLA ESTADUAL LYCEU PARAIBANO';
const secao = (turno, mun, zona, sec, cargo, nr, local, nome, votos) => ['2022', turno, 'PB', mun, zona, sec, cargo, nr, local, nome, votos];

const SECAO_PB = [
  CABECALHO_SECAO,
  secao('1', JOAO_PESSOA, '1', '10', '3', '40', '1015', LYCEU, '300'),
  secao('1', JOAO_PESSOA, '1', '11', '3', '40', '1015', LYCEU, '200'),
  secao('1', JOAO_PESSOA, '1', '11', '3', '45', '1015', LYCEU, '400'),
  secao('1', CAMPINA_GRANDE, '16', '5', '3', '40', '1040', '#NULO#', '300'),
  secao('1', CAMPINA_GRANDE, '16', '5', '3', '45', '1040', '#NULO#', '200'),
  secao('1', CAMPINA_GRANDE, '16', '6', '3', '40', '1050', '#NULO#', '0'),
  secao('1', JOAO_PESSOA, '1', '10', '6', '1234', '1015', LYCEU, '100'),
  secao('1', JOAO_PESSOA, '1', '10', '6', '5555', '1015', LYCEU, '50'),
  secao('1', JOAO_PESSOA, '1', '10', '6', '12', '1015', LYCEU, '30'),
  secao('1', JOAO_PESSOA, '1', '10', '3', '95', '1015', LYCEU, '10'),
  secao('1', JOAO_PESSOA, '1', '10', '1', '13', '1015', LYCEU, '999'),
  secao('2', JOAO_PESSOA, '1', '10', '3', '40', '1015', LYCEU, '600'),
  secao('2', CAMPINA_GRANDE, '16', '5', '3', '40', '1040', '#NULO#', '250'),
];
const SECAO_BR = [
  CABECALHO_SECAO,
  secao('1', JOAO_PESSOA, '1', '10', '1', '13', '1015', LYCEU, '1000'),
  secao('1', CAMPINA_GRANDE, '16', '5', '1', '13', '1040', '#NULO#', '800'),
  ['2022', '1', 'SP', '71072', '1', '1', '1', '13', '1', 'ESCOLA SP', '9999'],
];
const LOCAIS_VOTACAO = [
  ['SG_UF', 'CD_MUNICIPIO', 'NR_ZONA', 'NR_SECAO', 'NM_LOCAL_VOTACAO'],
  ['PB', CAMPINA_GRANDE, '16', '5', 'E.E. JOSÉ DE ANCHIETA'],
  ['PE', CAMPINA_GRANDE, '16', '6', 'NÃO É DA PB'],
];

// Só o 2º turno de governador falta no CSV, então é o único pedido que a API deve receber.
const API_FALSA = {
  [`${API}/comum/config/ele-c.json`]: { pl: [{ c: 'ele2022', e: [{ tp: '1', cd: '544', cdt2: '545', abr: [{ cp: [{ cd: '1' }, { cd: '3' }] }] }] }] },
  [`${API}/ele2022/544/config/mun-e000544-cm.json`]: { abr: [{ cd: 'pb', mu: [{ cd: JOAO_PESSOA, cdi: '2507507' }] }] },
  [`${API}/ele2022/545/dados/pb/pb-c0003-e000545-u.json`]: { and: 'f', dg: '30/10/2022', hg: '20:00:00' },
  [`${API}/ele2022/545/dados/pb/pb${JOAO_PESSOA}-c0003-e000545-u.json`]: {
    carg: [{ nmn: 'Governador', agr: [{ par: [{ sg: 'PART', cand: [
      { n: '40', nmu: 'JOÃO', nm: 'JOÃO DA SILVA', sqcand: '150', vap: '1000', st: 'Eleito' },
      { n: '45', nmu: 'MARIA', nm: 'MARIA SOUZA', sqcand: '151', vap: '0', st: 'Não eleito' },
    ] }] }] }],
  },
};

export async function montarCenario2022(raizDoRepo) {
  const pasta = await mkdtemp(join(tmpdir(), 'mapa-pb-'));
  await mkdir(join(pasta, 'tmp'));
  await mkdir(join(pasta, 'public/data'), { recursive: true });
  await copyFile(join(raizDoRepo, 'public/data/tse-ibge-pb.json'), join(pasta, 'public/data/tse-ibge-pb.json'));
  const arquivos = {
    'tmp/munzona-2022.zip': zipSync({
      'votacao_candidato_munzona_2022_PB.csv': windows1252(csv(MUNZONA_PB)),
      'votacao_candidato_munzona_2022_BRASIL.csv': windows1252(csv(MUNZONA_BRASIL)),
    }),
    'tmp/secao-2022-PB.zip': zipComCsv('votacao_secao_2022_PB.csv', SECAO_PB),
    'tmp/secao-2022-BR.zip': zipComCsv('votacao_secao_2022_BR.csv', SECAO_BR),
    'tmp/local-votacao-2022.zip': zipComCsv('eleitorado_local_votacao_2022.csv', LOCAIS_VOTACAO),
    'api-falsa.json': JSON.stringify(API_FALSA),
  };
  for (const [nome, conteudo] of Object.entries(arquivos)) await writeFile(join(pasta, nome), conteudo);
  return pasta;
}
