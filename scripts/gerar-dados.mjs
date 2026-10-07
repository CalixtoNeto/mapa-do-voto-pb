// Gera os dados do site (public/data/eleicoes/ANO-tTURNO.json),
// que são commitados e servidos como arquivos estáticos.
//   node scripts/gerar-dados.mjs [ano ...] [--forcar] [--indice]
// Sem anos, gera os que ainda não existem. Com --forcar, refaz os anos informados. Com --indice, só refaz o índice.
// Para cada ano: primeiro o CSV dos Dados Abertos do TSE; a API de resultados só entra para o que o CSV
// ainda não tem (por exemplo, um 2º turno ainda não publicado). Roda localmente ou no workflow manual.
import { existsSync } from 'node:fs';
import { ANOS_PADRAO, PASTA_ELEICOES, TABELA_TSE_IBGE } from './eleicao/config.mjs';
import { carregarConversorTseIbge } from './eleicao/municipios.mjs';
import { cargosApurados } from './eleicao/apuracao.mjs';
import { votacaoPorMunicipioViaCsv } from './fontes/csv-municipio.mjs';
import { completarViaApi } from './fontes/api-resultados.mjs';
import { votosPorLocalViaCsv } from './fontes/csv-secao.mjs';
import { escreverEleicao } from './saida/escrever.mjs';
import { indexar } from './saida/indice.mjs';

async function gerarAno(ano, ibgeDe) {
  console.log(`Eleição ${ano}:`);
  const porTurno = await apurarAno(ano, ibgeDe);
  if (!Object.keys(porTurno).length) {
    console.warn(`  sem dados para ${ano} (nem CSV nem API)`);
    process.exitCode = 1;
    return;
  }
  await escreverEleicao(PASTA_ELEICOES, ano, porTurno, await votosPorLocal(ano, ibgeDe));
}

// A API completa o que o CSV ainda não tem: turnos e cargos ausentes (ou tudo, se não houver CSV).
async function apurarAno(ano, ibgeDe) {
  let porTurno = null;
  try {
    porTurno = await votacaoPorMunicipioViaCsv(ano, ibgeDe);
    if (!porTurno) console.log('  CSV dos Dados Abertos ainda não publicado');
  } catch (e) { console.warn(`  CSV falhou (${e.message})`); }
  porTurno ||= {};
  const apurados = cargosApurados(porTurno);
  try {
    const adicionados = await completarViaApi(ano, porTurno, (turno, cargo) => !apurados.has(`${turno}|${cargo}`));
    if (adicionados) console.log(`  completado pela API: ${adicionados} cargo(s)`);
  } catch (e) { console.warn(`  API falhou (${e.message})`); }
  return porTurno;
}

async function votosPorLocal(ano, ibgeDe) {
  try {
    const locais = await votosPorLocalViaCsv(ano, ibgeDe);
    if (!locais) console.log('  CSV por seção ainda não publicado: sem detalhe por local de votação');
    return locais;
  } catch (e) { console.log(`  sem detalhe por local de votação (${e.message})`); return null; }
}

async function gerarAnos(anos, forcar) {
  const ibgeDe = await carregarConversorTseIbge(TABELA_TSE_IBGE);
  for (const ano of anos) {
    if (forcar || !existsSync(`${PASTA_ELEICOES}/${ano}-t1.json`)) await gerarAno(ano, ibgeDe);
    else console.log(`Eleição ${ano}: já existe (use --forcar para refazer)`);
  }
}

const args = process.argv.slice(2);
const anosPedidos = args.filter(a => /^\d{4}$/.test(a));
if (args.includes('--indice')) await indexar(PASTA_ELEICOES);
else await gerarAnos(anosPedidos.length ? anosPedidos : ANOS_PADRAO, args.includes('--forcar'));
