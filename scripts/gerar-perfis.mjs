// Gera o perfil do Governo da Paraíba em public/data/perfis/:
//   node scripts/gerar-perfis.mjs [ano ...]
// Sem anos: do início do mandato atual (2023) até o ano corrente. Fonte: API de dados abertos do Governo da Paraíba.
import { getJson } from './lib/tse.mjs';
import { anoDoEstado, resumoDoAnoDoEstado, detalheDoAnoDoEstado } from './estado/governo.mjs';
import { campanhasDaEleicao, lerDaEleicao, nomesDosCandidatos } from './perfis/campanhas.mjs';
import { escreverPerfil, indexarPerfis } from './saida/perfis.mjs';

const PRIMEIRO_ANO = 2023, ELEICOES_GERAIS = ['2018', '2022'];
const CARGOS = { GOVERNADOR: '3', DEPUTADO_ESTADUAL: '7' };
const agora = new Date(), atualizadoEm = agora.toISOString();

async function tentar(descricao, fazer) {
  try { return await fazer(); } catch (e) { console.warn(`  ${descricao} falhou (${e.message})`); return null; }
}

// Nas finanças da Paraíba a chave do candidato é o sequencial do TSE; o cargo vem do arquivo de votação.
async function campanhasEstaduais() {
  const campanhas = [];
  for (const ano of ELEICOES_GERAIS) {
    const t1 = await lerDaEleicao(ano, 't1');
    const cargoDe = new Map((t1?.cands || []).map(c => [c.key.split('|')[3], c.cargo]));
    const nomes = Object.fromEntries((t1?.cands || []).map(c => [c.key.split('|')[3], c.nome || c.urna]));
    campanhas.push(...campanhasDaEleicao(ano, await lerDaEleicao(ano, 'financas'), Object.values(CARGOS), nomes, chave => cargoDe.get(chave)));
  }
  return campanhas;
}

const anosPedidos = process.argv.slice(2).filter(a => /^\d{4}$/.test(a)).map(Number);
const anos = anosPedidos.length ? anosPedidos : Array.from({ length: agora.getFullYear() - PRIMEIRO_ANO + 1 }, (_, i) => PRIMEIRO_ANO + i);
const campanhas = await campanhasEstaduais();
for (const ano of anos) {
  console.log(`Governo da Paraíba em ${ano}:`);
  const dados = await anoDoEstado(ano, getJson, tentar);
  if (!dados) { console.log('  nada publicado pela API do estado'); continue; }
  await escreverPerfil(`estado-${ano}`, resumoDoAnoDoEstado(ano, dados, { campanhas, atualizadoEm }));
  await escreverPerfil(`estado-${ano}-detalhe`, detalheDoAnoDoEstado(ano, dados));
}
await indexarPerfis(atualizadoEm);
