// Votos por local de votação, a partir do CSV por seção (só traz o nome do local de 2018 em diante).
// Os locais de cada município viram uma lista; os votos apontam para a posição do local nessa lista.
import { CDN, baixar, lerCsvsDoZip } from '../lib/tse.mjs';
import { porRegistro, inteiro } from '../lib/csv.mjs';
import { UF, CARGOS, DIGITOS_DO_CANDIDATO, NUMEROS_BRANCO_E_NULO, PASTA_DOWNLOADS } from '../eleicao/config.mjs';
import { nomeAusente, chaveDaSecao, nomesDosLocais, preencherNomes } from './locais-votacao.mjs';

export async function votosPorLocalViaCsv(ano, ibgeDe) {
  const zipDaUf = `${PASTA_DOWNLOADS}/secao-${ano}-${UF}.zip`;
  if (!await baixar(`${CDN}/votacao_secao/votacao_secao_${ano}_${UF}.zip`, zipDaUf)) return null;
  const porTurno = {}, pendentes = [];
  const leitor = cargoAceito => leitorDeVotosPorLocal({ ano, ibgeDe, cargoAceito, porTurno, pendentes });
  const arquivoDaUf = new RegExp(`_${UF}\\.csv$`, 'i');
  await lerCsvsDoZip(zipDaUf, [{ padrao: arquivoDaUf, aoLinha: leitor(cargo => cargo !== CARGOS.PRESIDENTE) }]);
  await lerPresidente(ano, leitor(cargo => cargo === CARGOS.PRESIDENTE));
  if (pendentes.length) await completarNomesPendentes(ano, pendentes);
  return semIndices(porTurno);
}

// Os índices só servem durante a leitura; o arquivo final guarda a lista de locais e os votos.
function semIndices(porTurno) {
  const semIndice = ({ locais, votos }) => ({ locais, votos });
  return Object.fromEntries(Object.entries(porTurno).map(([turno, leitura]) => [turno, semIndice(leitura)]));
}

// O presidente por seção vem num arquivo nacional separado, que pode não existir.
async function lerPresidente(ano, aoLinha) {
  try {
    const zipNacional = `${PASTA_DOWNLOADS}/secao-${ano}-BR.zip`;
    if (await baixar(`${CDN}/votacao_secao/votacao_secao_${ano}_BR.zip`, zipNacional)) {
      await lerCsvsDoZip(zipNacional, [{ padrao: /_BR\.csv$/i, aoLinha }]);
    }
  } catch (e) { console.warn(`  presidente por seção indisponível (${e.message})`); }
}

async function completarNomesPendentes(ano, pendentes) {
  console.log(`  ${pendentes.length} locais sem nome no CSV por seção; buscando na tabela de locais de votação`);
  const nomes = await nomesDosLocais(ano).catch(e => {
    console.warn(`  tabela de locais indisponível (${e.message})`);
    return null;
  });
  console.log(`  nomes corrigidos: ${preencherNomes(pendentes, nomes)} de ${pendentes.length}`);
}

export function leitorDeVotosPorLocal({ ano, ibgeDe, cargoAceito, porTurno, pendentes }) {
  return porRegistro({
    aoCabecalho: colunas => { if (colunas.NM_LOCAL_VOTACAO == null) throw new Error('sem nome de local'); },
    aoRegistro: (campos, colunas) => {
      const cargo = campos[colunas.CD_CARGO], numero = campos[colunas.NR_VOTAVEL];
      if (campos[colunas.SG_UF] !== UF || campos[colunas.ANO_ELEICAO] !== ano) return;
      if (!cargoAceito(cargo) || !ehVotoNominal(cargo, numero)) return;
      const ibge = ibgeDe(campos[colunas.CD_MUNICIPIO]);
      if (!ibge) return;
      const turno = porTurno[campos[colunas.NR_TURNO]] ||= { locais: {}, indices: {}, votos: {} };
      const posicao = posicaoDoLocal(turno, ibge, campos, colunas, pendentes);
      const votosNoMunicipio = (turno.votos[`${cargo}|${numero}`] ||= {})[ibge] ||= {};
      votosNoMunicipio[posicao] = (votosNoMunicipio[posicao] || 0) + inteiro(campos[colunas.QT_VOTOS]);
    },
  });
}

export function ehVotoNominal(cargo, numero) {
  const digitos = DIGITOS_DO_CANDIDATO[cargo];
  return Boolean(digitos) && numero.length >= digitos && !NUMEROS_BRANCO_E_NULO.includes(numero);
}

function posicaoDoLocal(turno, ibge, campos, colunas, pendentes) {
  const zona = campos[colunas.NR_ZONA], numeroDoLocal = campos[colunas.NR_LOCAL_VOTACAO];
  const locais = turno.locais[ibge] ||= [], indices = turno.indices[ibge] ||= new Map();
  const chave = `${zona}|${numeroDoLocal}`;
  if (indices.has(chave)) return indices.get(chave);
  const nome = campos[colunas.NM_LOCAL_VOTACAO].trim();
  const local = { n: nomeAusente(nome) ? `Local ${numeroDoLocal} (zona ${zona})` : nome };
  if (nomeAusente(nome)) {
    pendentes.push({ local, chave: chaveDaSecao(campos[colunas.CD_MUNICIPIO], zona, campos[colunas.NR_SECAO]) });
  }
  indices.set(chave, locais.length);
  locais.push(local);
  return indices.get(chave);
}
