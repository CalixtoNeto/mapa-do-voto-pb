// Gera as análises de cada eleição (perfil e bens dos candidatos, dinheiro de campanha, comparecimento,
// perfil do eleitorado), que são commitadas em public/data/eleicoes/ como os arquivos de votação.
//   node scripts/gerar-analises.mjs [ano ...] [--indice]
// Sem anos, refaz todos os do site. Cada fonte é independente: a que o TSE ainda não publicou fica de fora.
// A prestação de contas existe neste formato de 2018 em diante; o fundo eleitoral também começou em 2018.
import { ANOS_PADRAO, PASTA_ELEICOES, TABELA_TSE_IBGE } from './eleicao/config.mjs';
import { carregarConversorTseIbge } from './eleicao/municipios.mjs';
import { candidatosViaCsv } from './fontes/candidatos.mjs';
import { financasViaCsv } from './fontes/prestacao-contas.mjs';
import { comparecimentoViaCsv } from './fontes/comparecimento.mjs';
import { eleitoradoViaCsv } from './fontes/eleitorado.mjs';
import { campo } from './lib/csv.mjs';
import { resumoDasFinancas } from './analises/financas.mjs';
import { escreverAnalises, indexarAnalises } from './saida/analises.mjs';

async function tentar(descricao, buscar) {
  try {
    const dados = await buscar();
    if (!dados) console.log(`  ${descricao}: não está no TSE (ainda não publicado, ou não existe para este ano)`);
    return dados;
  } catch (e) { console.warn(`  ${descricao} falhou (${e.message})`); return null; }
}

async function gerarAno(ano, ibgeDe) {
  console.log(`Análises de ${ano}:`);
  const perfis = await tentar('cadastro de candidatos', () => candidatosViaCsv(ano));
  const financas = await tentar('prestação de contas', () => financasViaCsv(ano));
  const comparecimento = await tentar('comparecimento', () => comparecimentoViaCsv(ano, ibgeDe));
  const lugarDe = (campos, colunas) => ibgeDe(campo(campos, colunas, 'CD_MUNICIPIO'));
  const eleitorado = await tentar('perfil do eleitorado', () => eleitoradoViaCsv(ano, { lugarDe }));
  const resumo = financas && resumoDasFinancas(financas, ano, new Date());
  await escreverAnalises(PASTA_ELEICOES, ano, { perfis, financas: resumo, comparecimento, eleitorado });
}

const args = process.argv.slice(2);
const anosPedidos = args.filter(a => /^\d{4}$/.test(a));
if (!args.includes('--indice')) {
  const ibgeDe = await carregarConversorTseIbge(TABELA_TSE_IBGE);
  for (const ano of anosPedidos.length ? anosPedidos : ANOS_PADRAO) await gerarAno(ano, ibgeDe);
}
await indexarAnalises(PASTA_ELEICOES);
