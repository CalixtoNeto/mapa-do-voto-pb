// Presidente por município em todo o país, dos Dados Abertos do TSE: votação (votacao_candidato_munzona) e comparecimento
// (detalhe_votacao_munzona). O arquivo _BRASIL.csv de cada .zip traz o presidente de todos os municípios, zona por zona.
import { CDN, baixar, lerCsvsDoZip } from '../lib/tse.mjs';
import { porRegistro, inteiro } from '../lib/csv.mjs';
import { novoAcumulador, somarVotoNacional, somarComparecimentoNacional } from '../nacional/acumulador.mjs';
import { numerosDoComparecimento, exigirColunasDoComparecimento } from '../analises/comparecimento.mjs';
import { CARGOS, PASTA_DOWNLOADS } from '../eleicao/config.mjs';

const BRASIL = /_BRASIL\.csv$/i;
const COLUNAS_DE_LUGAR = ['ANO_ELEICAO', 'NR_TURNO', 'SG_UF', 'CD_MUNICIPIO', 'NM_MUNICIPIO', 'CD_CARGO'];
const COLUNAS_DE_VOTOS = [...COLUNAS_DE_LUGAR, 'NR_CANDIDATO', 'NM_URNA_CANDIDATO', 'SG_PARTIDO'];

function exigir(colunas, obrigatorias, ano) {
  const ausentes = obrigatorias.filter(nome => colunas[nome] == null);
  if (ausentes.length) throw new Error(`Colunas ausentes no CSV nacional de ${ano}: ${ausentes.join(', ')}`);
}

const lugarDoRegistro = (campos, colunas) => ({ turno: campos[colunas.NR_TURNO], uf: campos[colunas.SG_UF], cd: campos[colunas.CD_MUNICIPIO], nome: campos[colunas.NM_MUNICIPIO] });
const ehPresidenteDoAno = (campos, colunas, ano) => campos[colunas.CD_CARGO] === CARGOS.PRESIDENTE && campos[colunas.ANO_ELEICAO] === ano;

export function leitorDeVotosNacionais({ ano, acc }) {
  let colunaDeVotos;
  return porRegistro({
    aoCabecalho: colunas => {
      if (process.env.NACIONAL_DEBUG) console.log(`  colunas QT_/DS_SIT da votação ${ano}: ${Object.keys(colunas).filter(c => /^(QT_|DS_SIT)/.test(c)).join(',')}`);
      colunaDeVotos = 'QT_VOTOS_NOMINAIS_VALIDOS' in colunas ? 'QT_VOTOS_NOMINAIS_VALIDOS' : 'QT_VOTOS_NOMINAIS';
      exigir(colunas, [...COLUNAS_DE_VOTOS, colunaDeVotos], ano);
    },
    aoRegistro: (campos, colunas) => {
      if (!ehPresidenteDoAno(campos, colunas, ano)) return;
      const sit = colunas.DS_SIT_TOT_TURNO != null ? campos[colunas.DS_SIT_TOT_TURNO] : '';
      const candidato = { nr: campos[colunas.NR_CANDIDATO], urna: campos[colunas.NM_URNA_CANDIDATO], partido: campos[colunas.SG_PARTIDO], sit };
      const validos = inteiro(campos[colunas[colunaDeVotos]]), nominais = colunas.QT_VOTOS_NOMINAIS_VALIDOS != null && colunas.QT_VOTOS_NOMINAIS != null ? inteiro(campos[colunas.QT_VOTOS_NOMINAIS]) : validos;
      somarVotoNacional(acc, lugarDoRegistro(campos, colunas), candidato, validos, Math.max(0, nominais - validos));
    },
  });
}

export function leitorDeComparecimentoNacional({ ano, acc }) {
  return porRegistro({
    aoCabecalho: colunas => {
      if (process.env.NACIONAL_DEBUG) console.log(`  colunas QT_ do comparecimento ${ano}: ${Object.keys(colunas).filter(c => /^QT_/.test(c)).join(',')}`);
      exigir(colunas, COLUNAS_DE_LUGAR, ano); exigirColunasDoComparecimento(colunas, ano);
    },
    aoRegistro: (campos, colunas) => {
      if (!ehPresidenteDoAno(campos, colunas, ano)) return;
      somarComparecimentoNacional(acc, lugarDoRegistro(campos, colunas), numerosDoComparecimento(campos, colunas).slice(0, 4));
    },
  });
}

async function lerZip(pasta, nome, ano, leitor) {
  const zip = `${PASTA_DOWNLOADS}/${nome}-${ano}.zip`;
  if (!await baixar(`${CDN}/${pasta}/${pasta}_${ano}.zip`, zip)) return false;
  const [achou] = await lerCsvsDoZip(zip, [{ padrao: BRASIL, aoLinha: leitor }]);
  return achou;
}

// Devolve o acumulador com o que o TSE já publicou; votação e comparecimento são independentes (cada um pode faltar).
export async function nacionalViaCsv(ano) {
  const acc = novoAcumulador();
  const votos = await lerZip('votacao_candidato_munzona', 'munzona', ano, leitorDeVotosNacionais({ ano, acc }));
  const comparecimento = await lerZip('detalhe_votacao_munzona', 'detalhe-munzona', ano, leitorDeComparecimentoNacional({ ano, acc }));
  if (!votos) console.warn(`  CSV nacional ${ano}: votação ainda não publicada`);
  if (!comparecimento) console.warn(`  CSV nacional ${ano}: comparecimento ainda não publicado`);
  return { acc, votos, comparecimento };
}
