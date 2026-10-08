// O que entra nas análises deste site e como cada candidato é identificado nele.
// Na Paraíba, o site guarda o sequencial do TSE (SQ_CANDIDATO) no fim da chave de cada candidato.
import { UF, CARGOS, CARGOS_DO_SITE } from '../eleicao/config.mjs';

const ehPresidente = cargo => cargo === CARGOS.PRESIDENTE;

export const candidatoDoSite = ({ uf, cargo }) => CARGOS_DO_SITE.includes(cargo) && (uf === UF || ehPresidente(cargo));

// A prestação de contas do presidente está no arquivo nacional, que este site não lê.
export const candidatoDasFinancas = candidatoDoSite;

export const chaveDoCandidato = ({ sq }) => sq;

export const chaveNoSite = candidato => candidato.key.split('|')[3];

// O arquivo da UF não traz o presidente; ele está no arquivo nacional (_BRASIL.csv) do mesmo .zip,
// que também repete os candidatos da UF. Por isso cada arquivo só aceita os cargos que lhe cabem.
export const arquivosDaEleicao = (prefixo, ano) => [
  { padrao: new RegExp(`^${prefixo}_${ano}_${UF}\\.csv$`, 'i'), cargoAceito: cargo => !ehPresidente(cargo) },
  { padrao: new RegExp(`^${prefixo}_${ano}_BRASIL\\.csv$`, 'i'), cargoAceito: ehPresidente },
];
