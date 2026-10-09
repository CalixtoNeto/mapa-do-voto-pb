// Um ano do Governo da Paraíba pela API do estado (despesas, compras, folha e emendas estaduais) e os arquivos
// que vão para o site: estado-ANO.json (resumo) e estado-ANO-detalhe.json (árvores, lido só quando o ano é aberto).
import { lerTodasAsPaginas } from '../fontes/api-pb.mjs';
import { novasDespesasDoEstado, somarDespesaDoEstado, resumoDasDespesasDoEstado, arvoresDasDespesasDoEstado, todosOsCredoresDoEstado } from './despesas.mjs';
import { alertasDoEstado } from './alertas.mjs';
import { novaFolhaDoEstado, somarServidorDoEstado, resumoDaFolhaDoEstado, arvoreDaFolhaDoEstado } from './folha.mjs';
import { resumoDasContratacoes, arvoreDasContratacoes, resumoDosContratos } from './compras.mjs';
import { resumoDasEmendasEstaduais } from './emendas.mjs';
import { credoresDasCampanhas } from '../perfis/cruzamentos.mjs';

const MESES = Array.from({ length: 12 }, (_, i) => i + 1);

async function despesasDoAno(ano, buscarJson) {
  const despesas = novasDespesasDoEstado(), meses = [];
  for (const mes of MESES) {
    const itens = await lerTodasAsPaginas('despesas/orcamentarias', { ano, mes }, buscarJson);
    if (itens.length) meses.push(mes);
    itens.forEach(r => somarDespesaDoEstado(despesas, r));
  }
  return meses.length ? { despesas, meses } : null;
}

// A folha é a base mais pesada (cerca de 135 mil servidores por mês): só o último mês publicado do ano.
async function folhaDoAno(ano, buscarJson) {
  for (const mes of [...MESES].reverse()) {
    const servidores = await lerTodasAsPaginas('remuneracao/servidor', { ano, mes }, buscarJson);
    if (!servidores.length) continue;
    const folha = novaFolhaDoEstado();
    servidores.forEach(s => somarServidorDoEstado(folha, s));
    return folha;
  }
  return null;
}

// tentar(descricao, fazer) devolve null quando a fonte falha, para uma base fora do ar não derrubar as outras.
export async function anoDoEstado(ano, buscarJson, tentar) {
  const gasto = await tentar('despesas', () => despesasDoAno(ano, buscarJson));
  if (!gasto) return null;
  return { ...gasto, folha: await tentar('folha', () => folhaDoAno(ano, buscarJson)),
    contratacoes: await tentar('contratações', () => lerTodasAsPaginas('compras/contratacoes', { ano }, buscarJson)) || [],
    contratos: await tentar('contratos', () => lerTodasAsPaginas('compras/contratos', { anoInicioVigencia: ano }, buscarJson)) || [],
    emendas: await tentar('emendas', () => lerTodasAsPaginas('orcamento/listagem_emendas', { ano }, buscarJson)) || [] };
}

export function resumoDoAnoDoEstado(ano, dados, { campanhas, atualizadoEm }) {
  const emendas = resumoDasEmendasEstaduais(dados.emendas);
  return { ano: String(ano), atualizadoEm, meses: dados.meses, despesas: resumoDasDespesasDoEstado(dados.despesas),
    alertas: alertasDoEstado(dados.despesas), folha: dados.folha ? resumoDaFolhaDoEstado(dados.folha) : null,
    licitacoes: { modalidades: resumoDasContratacoes(dados.contratacoes), contratados: resumoDosContratos(dados.contratos) },
    emendas: { total: emendas.total, porDeputado: emendas.porDeputado },
    campanhas: credoresDasCampanhas(todosOsCredoresDoEstado(dados.despesas), campanhas) };
}

export function detalheDoAnoDoEstado(ano, dados) {
  const arvores = { ...arvoresDasDespesasDoEstado(dados.despesas), licitacoes: arvoreDasContratacoes(dados.contratacoes),
    emendasEstaduais: resumoDasEmendasEstaduais(dados.emendas).arvore };
  if (dados.folha) arvores.folha = arvoreDaFolhaDoEstado(dados.folha);
  return { ano: String(ano), arvores };
}
