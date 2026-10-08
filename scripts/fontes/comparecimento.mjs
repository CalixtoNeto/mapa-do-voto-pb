// Comparecimento, abstenção, brancos e nulos por município (TSE, detalhe da votação por município e zona).
// Como na votação, o presidente está no arquivo nacional do mesmo .zip.
import { CDN, baixar, lerCsvsDoZip } from '../lib/tse.mjs';
import { porRegistro, campo } from '../lib/csv.mjs';
import { numerosDoComparecimento, somarComparecimento, exigirColunasDoComparecimento } from '../analises/comparecimento.mjs';
import { arquivosDaEleicao } from '../analises/escopo.mjs';
import { UF, CARGOS_DO_SITE, PASTA_DOWNLOADS } from '../eleicao/config.mjs';

export async function comparecimentoViaCsv(ano, ibgeDe) {
  const zip = `${PASTA_DOWNLOADS}/detalhe-munzona-${ano}.zip`;
  if (!await baixar(`${CDN}/detalhe_votacao_munzona/detalhe_votacao_munzona_${ano}.zip`, zip)) return null;
  const porTurno = {};
  const alvos = arquivosDaEleicao('detalhe_votacao_munzona', ano).map(({ padrao, cargoAceito }) =>
    ({ padrao, aoLinha: leitorDeComparecimento({ ano, ibgeDe, cargoAceito, porTurno }) }));
  await lerCsvsDoZip(zip, alvos);
  return Object.keys(porTurno).length ? porTurno : null;
}

export function leitorDeComparecimento({ ano, ibgeDe, cargoAceito, porTurno }) {
  return porRegistro({
    aoCabecalho: colunas => exigirColunasDoComparecimento(colunas, ano),
    aoRegistro: (campos, colunas) => {
      const valor = nome => campo(campos, colunas, nome), cargo = valor('CD_CARGO');
      if (valor('SG_UF') !== UF || valor('ANO_ELEICAO') !== ano) return;
      if (!CARGOS_DO_SITE.includes(cargo) || !cargoAceito(cargo)) return;
      const lugar = ibgeDe(valor('CD_MUNICIPIO'));
      if (lugar) somarComparecimento(porTurno, { turno: valor('NR_TURNO'), cargo, lugar }, numerosDoComparecimento(campos, colunas));
    },
  });
}
