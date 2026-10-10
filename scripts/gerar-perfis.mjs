// Gera o perfil do estado em public/data/perfis/:
//   node scripts/gerar-perfis.mjs [ano ...] [--sem-assembleia | --so-assembleia]
// Governo da Paraíba pela API de dados abertos do governo (sem anos: de 2023, início do mandato, até o ano corrente)
// e a Assembleia Legislativa pelo SAPL dela (legislatura atual; leva cerca de meia hora).
import { getJson } from './lib/tse.mjs';
import { anoDoEstado, resumoDoAnoDoEstado, detalheDoAnoDoEstado } from './estado/governo.mjs';
import { campanhasDaEleicao, lerDaEleicao } from './perfis/campanhas.mjs';
import { dadosDaAssembleia } from './fontes/assembleia.mjs';
import { resumoDaCamara } from './perfis/camara.mjs';
import { normalizarNome } from './lib/texto.mjs';
import { escreverPerfil, indexarPerfis } from './saida/perfis.mjs';

const PRIMEIRO_ANO = 2023, ELEICOES_GERAIS = ['2018', '2022'];
const CARGOS = { GOVERNADOR: '3', DEPUTADO_ESTADUAL: '7' };
const agora = new Date(), hoje = agora.toISOString().slice(0, 10), atualizadoEm = agora.toISOString();

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
for (const ano of process.argv.includes('--so-assembleia') ? [] : anos) {
  console.log(`Governo da Paraíba em ${ano}:`);
  const dados = await anoDoEstado(ano, getJson, tentar);
  if (!dados) { console.log('  nada publicado pela API do estado'); continue; }
  await escreverPerfil(`estado-${ano}`, resumoDoAnoDoEstado(ano, dados, { campanhas, atualizadoEm }));
  await escreverPerfil(`estado-${ano}-detalhe`, detalheDoAnoDoEstado(ano, dados));
}

// Deputados da legislatura atual ligados à candidatura de 2022 pelo nome completo (o SAPL não traz o CPF; pode
// haver homônimos). A chave é o sequencial do TSE, a mesma das finanças e das ligações com os credores do estado.
async function gerarAssembleia() {
  console.log('Assembleia Legislativa (SAPL):');
  const anosDaLegislatura = [2023, 2024, 2025, 2026].filter(a => a <= agora.getFullYear());
  const dados = await tentar('SAPL da ALPB', () => dadosDaAssembleia(getJson, { hoje, anos: anosDaLegislatura }));
  if (!dados) return;
  const assembleia = resumoDaCamara(dados, hoje), t1 = await lerDaEleicao('2022', 't1');
  const porNome = new Map((t1?.cands || []).filter(c => c.cargo === CARGOS.DEPUTADO_ESTADUAL).map(c => [normalizarNome(c.nome), c]));
  for (const v of assembleia.vereadores) {
    const c = porNome.get(normalizarNome(v.completo));
    Object.assign(v, { chave: c ? c.key.split('|')[3] : null, chaveNoMapa: c ? c.key : null, eleicao: c ? c.total : v.eleicao });
  }
  await escreverPerfil('assembleia', { ...assembleia, eleicao: '2022', atualizadoEm });
}

if (!process.argv.includes('--sem-assembleia')) await gerarAssembleia();
await indexarPerfis(atualizadoEm);
