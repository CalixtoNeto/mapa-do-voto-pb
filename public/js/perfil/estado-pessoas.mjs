// Governo: folha por vínculo, licitações por modalidade, maiores contratados e maiores credores. A folha é só agregada (tipo de cargo e órgão).
import { nf, dinheiro, sentence } from '../formato.mjs';
import { Bloco } from '../estrutura.mjs';
import { Cartao, Aviso } from '../cartao.mjs';
import { Pilha } from '../graficos.mjs';
import { Ranking } from '../ranking.mjs';
import { usarLimite } from '../componentes.mjs';
import { ArvoreComLegenda } from './arvore-legenda.mjs';
import { arvoreDasModalidades, arvoreDosCredores } from './arvores-prefeitura.mjs';
import { partesComResto } from '../calculos-graficos.mjs';
import { mesAno } from './calculos-perfil.mjs';
import { credoresPrivados, semOrgaosPublicos } from './calculos-estado.mjs';
import { participacao } from './formato-perfil.mjs';
import { nomeProprio } from './pecas.mjs';
const { html } = window.htmPreact;

const CORES = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)'];
const arvoreDe = (detalhe, id) => detalhe?.arvores?.[id]?.v > 0 ? detalhe.arvores[id] : null;
const rotuloDoCredor = (nome, nivel) => nivel === 0 ? nomeProprio(nome) : sentence(nome);

function Folha({ a, detalhe }) {
  const total = a.folha.total, arvore = arvoreDe(detalhe, 'folha');
  const partes = partesComResto(a.folha.tipos.map(([nome, , v]) => ({ nome, v })), CORES, 'var(--s0)').map(p => ({ ...p, rotulo: `${dinheiro(p.v)} · ${participacao(p.v, total)}` }));
  const maiores = a.folha.tipos.slice(0, 4).map(([tipo, n]) => `${sentence(tipo)} ${nf.format(n)}`).join(' · ');
  return html`<${Cartao} tipo="Barra empilhada · composição" titulo="Folha por tipo de vínculo" sub=${`${dinheiro(total)} brutos em ${mesAno(a.folha.mes)}. Cada cor é uma parte do total.`}
    nota=${`Vínculos no mês (uma pessoa pode ter mais de um): ${maiores}. Nomes e CPFs dos servidores não aparecem no site.`}>
    <${Pilha} partes=${partes} descricao=${'Folha por tipo de vínculo: ' + partes.map(p => `${p.nome} ${p.rotulo}`).join('; ')} />
    ${arvore && html`<${ArvoreComLegenda} legenda="Vínculo → órgão · R$" arvore=${arvore} escala="maior" />`}<//>`;
}

function Licitacoes({ a, detalhe }) {
  const arvore = arvoreDasModalidades(a.licitacoes.modalidades, arvoreDe(detalhe, 'licitacoes'));
  return html`<${Cartao} tipo="Árvore expansível" titulo="Licitações por modalidade" sub=${`${dinheiro(arvore.v)} adjudicados nas contratações do ano.`}
    nota="A barra compara com o maior do mesmo nível; a nota mostra os processos e a parte de cada modalidade. Abaixo, os órgãos que contrataram.">
    <${ArvoreComLegenda} legenda="Modalidade → órgão contratante · R$" arvore=${arvore} escala="maior" /><//>`;
}

function Contratados({ a }) {
  const itens = a.licitacoes.contratados.map(([nome, , v, n]) => ({ n: nomeProprio(nome), nota: n > 1 ? `${nf.format(n)} contratos` : null, v, rotulo: dinheiro(v) }));
  return html`<${Cartao} tipo="Barra horizontal · ranking" titulo="Maiores contratados" sub=${`Contratos com vigência iniciada em ${a.ano}, por valor`}>
    <${Ranking} descricao="Maiores contratados" itens=${itens} /><//>`;
}

function Credores({ a, detalhe }) {
  const fora = credoresPrivados(a.despesas.credores, 1).fora, arvore = arvoreDosCredores(semOrgaosPublicos(a.despesas.credores), arvoreDe(detalhe, 'area')), [limite, botao] = usarLimite(arvore.filhos.length);
  return html`<${Cartao} classe="largo" tipo="Árvore expansível" titulo="Maiores credores" sub=${`Valores pagos em ${a.ano}, sem contar ${fora} órgãos públicos da lista (secretarias, previdência, tribunais, prefeituras)`}
    nota="Abaixo de cada credor, a área e o tipo de despesa em que recebeu, pelo detalhamento do ano.">
    <${ArvoreComLegenda} legenda="Credor → área → tipo de despesa · R$" arvore=${{ ...arvore, filhos: arvore.filhos.slice(0, limite) }} rotulo=${rotuloDoCredor}
      rotuloDoTotal=${`Total dos ${arvore.filhos.length} maiores`} ordenarRaiz=${false} escala="maior" />${botao}
    <${Aviso}>Valores atípicos são contas do site sobre os dados do Governo da Paraíba, não julgamento sobre os fornecedores.<//><//>`;
}

export function FolhaLicitacoesCredores({ a, detalhe }) {
  return html`<${Bloco} id="pf" titulo="Folha, licitações e quem recebe" colunas="tres"
    lede="A folha dividida por vínculo, as licitações por modalidade, os maiores contratados e quem mais recebeu do Governo.">
    ${a.folha && html`<${Folha} a=${a} detalhe=${detalhe} />`}${a.licitacoes?.modalidades.length > 0 && html`<${Licitacoes} a=${a} detalhe=${detalhe} />`}
    ${a.licitacoes?.contratados?.length > 0 && html`<${Contratados} a=${a} />`}${a.despesas?.credores?.length > 0 && html`<${Credores} a=${a} detalhe=${detalhe} />`}<//>`;
}
