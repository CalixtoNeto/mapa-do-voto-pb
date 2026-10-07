// Votação nominal por município e zona, dos Dados Abertos do TSE.
// O arquivo _PB.csv não traz o presidente; os votos dele por município estão no _BRASIL.csv do mesmo .zip.
import { CDN, baixar, lerCsvsDoZip } from '../lib/tse.mjs';
import { porRegistro, inteiro } from '../lib/csv.mjs';
import { apuracaoDoTurno, somarVoto, chaveDoCargo } from '../eleicao/apuracao.mjs';
import { UF, CARGOS, CARGOS_DO_SITE, PASTA_DOWNLOADS } from '../eleicao/config.mjs';

const ehPresidente = cargo => cargo === CARGOS.PRESIDENTE;

const COLUNAS_OBRIGATORIAS = ['ANO_ELEICAO', 'NR_TURNO', 'SG_UF', 'CD_MUNICIPIO', 'CD_CARGO', 'DS_CARGO',
  'SQ_CANDIDATO', 'NR_CANDIDATO', 'NM_URNA_CANDIDATO', 'SG_PARTIDO'];

export async function votacaoPorMunicipioViaCsv(ano, ibgeDe) {
  const zip = `${PASTA_DOWNLOADS}/munzona-${ano}.zip`;
  if (!await baixar(`${CDN}/votacao_candidato_munzona/votacao_candidato_munzona_${ano}.zip`, zip)) return null;
  const porTurno = {}, semIbge = new Set();
  const leitor = cargoAceito => leitorDeVotacaoPorMunicipio({ ano, ibgeDe, cargoAceito, porTurno, semIbge });
  const cargoDoArquivoDaUf = cargo => CARGOS_DO_SITE.includes(cargo) && !ehPresidente(cargo);
  const [temUf, temBrasil] = await lerCsvsDoZip(zip, [
    { padrao: new RegExp(`_${UF}\\.csv$`, 'i'), aoLinha: leitor(cargoDoArquivoDaUf) },
    { padrao: /_BRASIL\.csv$/i, aoLinha: leitor(ehPresidente) },
  ]);
  if (!temUf) return null;
  if (!temBrasil) console.warn(`  CSV ${ano}: sem _BRASIL.csv; o presidente fica de fora`);
  if (semIbge.size) console.warn(`  CSV ${ano}: municípios sem correspondência IBGE: ${[...semIbge].join(', ')}`);
  return Object.keys(porTurno).length ? porTurno : null;
}

export function leitorDeVotacaoPorMunicipio({ ano, ibgeDe, cargoAceito, porTurno, semIbge }) {
  let colunaDeVotos;
  return porRegistro({
    aoCabecalho: colunas => { colunaDeVotos = exigirColunas(colunas, ano); },
    aoRegistro: (campos, colunas) => {
      if (!ehDaEleicao(campos, colunas, ano, cargoAceito)) return;
      const ibge = ibgeDe(campos[colunas.CD_MUNICIPIO]);
      if (!ibge) { semIbge.add(campos[colunas.CD_MUNICIPIO]); return; }
      const candidato = candidatoDoRegistro(campos, colunas, ano);
      const apuracao = apuracaoDoTurno(porTurno, candidato.turno, 'csv');
      somarVoto(apuracao, candidato, ibge, inteiro(campos[colunas[colunaDeVotos]]));
      const situacao = colunas.DS_SIT_TOT_TURNO != null ? campos[colunas.DS_SIT_TOT_TURNO] : '';
      if (situacaoInformada(situacao)) apuracao.cands.get(candidato.key).sit = situacao;
    },
  });
}

// Devolve a coluna de votos: os arquivos mais novos separam os votos válidos dos anulados depois da eleição.
function exigirColunas(colunas, ano) {
  const colunaDeVotos = 'QT_VOTOS_NOMINAIS_VALIDOS' in colunas ? 'QT_VOTOS_NOMINAIS_VALIDOS' : 'QT_VOTOS_NOMINAIS';
  const ausentes = [...COLUNAS_OBRIGATORIAS, colunaDeVotos].filter(nome => colunas[nome] == null);
  if (ausentes.length) throw new Error(`Colunas ausentes no CSV de ${ano}: ${ausentes.join(', ')}`);
  return colunaDeVotos;
}

function ehDaEleicao(campos, colunas, ano, cargoAceito) {
  return campos[colunas.SG_UF] === UF && cargoAceito(campos[colunas.CD_CARGO]) && campos[colunas.ANO_ELEICAO] === ano;
}

function candidatoDoRegistro(campos, colunas, ano) {
  const turno = campos[colunas.NR_TURNO], cargo = campos[colunas.CD_CARGO];
  return {
    key: `${chaveDoCargo(ano, turno, cargo)}|${campos[colunas.SQ_CANDIDATO]}`,
    ano, turno, cargo,
    cargoNome: campos[colunas.DS_CARGO],
    nr: campos[colunas.NR_CANDIDATO],
    urna: campos[colunas.NM_URNA_CANDIDATO],
    nome: colunas.NM_CANDIDATO != null ? campos[colunas.NM_CANDIDATO] : '',
    partido: campos[colunas.SG_PARTIDO],
    sit: '',
  };
}

// O TSE preenche "#NULO#" ou "#NE#" quando a situação ainda não foi definida.
const situacaoInformada = situacao => Boolean(situacao) && !situacao.startsWith('#');
