// Governo: folha por vínculo, licitações por modalidade, maiores contratados e maiores credores. A folha é só agregada (tipo de cargo e órgão).
import { nf, dinheiro, sentence } from '../formato.mjs';
import { Bloco } from '../estrutura.mjs';
import { Cartao, Aviso } from '../cartao.mjs';
import { Pilha } from '../graficos.mjs';
import { Ranking } from '../ranking.mjs';
import { ArvoreDeBarras } from '../arvore.mjs';
import { partesComResto } from '../calculos-graficos.mjs';
import { mesAno } from './calculos-perfil.mjs';
import { comParticipacao } from './calculos-fatias.mjs';
import { credoresPrivados } from './calculos-estado.mjs';
import { participacao } from './formato-perfil.mjs';
import { Desdobrar } from './desdobrar.mjs';
import { nomeProprio } from './pecas.mjs';
const { html } = window.htmPreact;

const CORES = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)'];
const arvoreDe = (detalhe, id) => detalhe?.arvores?.[id]?.v > 0 ? detalhe.arvores[id] : null;
const rotuloDoVencedor = (nome, nivel) => nivel === 1 && !/^Outros \(/.test(nome) ? nomeProprio(nome) : sentence(nome);

function Folha({ a, detalhe }) {
  const total = a.folha.total, arvore = arvoreDe(detalhe, 'folha');
  const partes = partesComResto(a.folha.tipos.map(([nome, , v]) => ({ nome, v })), CORES, 'var(--s0)').map(p => ({ ...p, rotulo: `${dinheiro(p.v)} · ${participacao(p.v, total)}` }));
  const maiores = a.folha.tipos.slice(0, 4).map(([tipo, n]) => `${sentence(tipo)} ${nf.format(n)}`).join(' · ');
  return html`<${Cartao} tipo="Barra empilhada · composição" titulo="Folha por tipo de vínculo" sub=${`${dinheiro(total)} brutos em ${mesAno(a.folha.mes)}. Cada cor é uma parte do total.`}
    nota=${`Vínculos no mês (uma pessoa pode ter mais de um): ${maiores}. Nomes e CPFs dos servidores não aparecem no site.`}>
    <${Pilha} partes=${partes} descricao=${'Folha por tipo de vínculo: ' + partes.map(p => `${p.nome} ${p.rotulo}`).join('; ')} />
    ${arvore && html`<${Desdobrar} titulo="Abrir por tipo de cargo e órgão"><${ArvoreDeBarras} arvore=${arvore} /><//>`}<//>`;
}

function Licitacoes({ a, detalhe }) {
  const lista = comParticipacao(a.licitacoes.modalidades.map(([n, processos, v]) => ({ n, v, processos }))), total = lista.reduce((s, m) => s + m.v, 0);
  const arvore = arvoreDe(detalhe, 'licitacoes');
  return html`<${Cartao} tipo="Barra horizontal · ranking" titulo="Licitações por modalidade" sub=${`${dinheiro(total)} adjudicados nas contratações do ano. A barra compara o valor.`}>
    <${Ranking} descricao="Licitações por modalidade" itens=${lista.map(m => ({ n: sentence(m.n), nota: `${nf.format(m.processos)} ${m.processos === 1 ? 'processo' : 'processos'}`, v: m.v, rotulo: dinheiro(m.v), lado: m.v ? participacao(m.v, total) : '—' }))} />
    ${arvore && html`<${Desdobrar} titulo="Ver os órgãos, por modalidade"><${ArvoreDeBarras} arvore=${arvore} rotulo=${rotuloDoVencedor} /><//>`}<//>`;
}

function Contratados({ a }) {
  const itens = a.licitacoes.contratados.map(([nome, , v, n]) => ({ n: nomeProprio(nome), nota: n > 1 ? `${nf.format(n)} contratos` : null, v, rotulo: dinheiro(v) }));
  return html`<${Cartao} tipo="Barra horizontal · ranking" titulo="Maiores contratados" sub=${`Contratos com vigência iniciada em ${a.ano}, por valor`}>
    <${Ranking} descricao="Maiores contratados" itens=${itens} /><//>`;
}

function Credores({ a }) {
  const { lista, fora } = credoresPrivados(a.despesas.credores, 40);
  return html`<${Cartao} classe="largo" tipo="Barra horizontal · ranking" titulo="Maiores credores" sub=${`Valores pagos em ${a.ano}, sem contar ${fora} órgãos públicos da lista (secretarias, previdência, tribunais, prefeituras)`}>
    <${Ranking} descricao="Maiores credores" itens=${lista.map(c => ({ n: nomeProprio(c.n), nota: c.vezes > 1 ? `${nf.format(c.vezes)} pagamentos` : null, v: c.v, rotulo: dinheiro(c.v) }))} />
    <${Aviso}>Valores atípicos são contas do site sobre os dados do Governo da Paraíba, não julgamento sobre os fornecedores.<//><//>`;
}

export function FolhaLicitacoesCredores({ a, detalhe }) {
  return html`<${Bloco} id="pf" titulo="Folha, licitações e quem recebe" colunas="tres"
    lede="A folha dividida por vínculo, as licitações por modalidade, os maiores contratados e quem mais recebeu do Governo.">
    ${a.folha && html`<${Folha} a=${a} detalhe=${detalhe} />`}${a.licitacoes?.modalidades.length > 0 && html`<${Licitacoes} a=${a} detalhe=${detalhe} />`}
    ${a.licitacoes?.contratados?.length > 0 && html`<${Contratados} a=${a} />`}${a.despesas?.credores?.length > 0 && html`<${Credores} a=${a} />`}<//>`;
}
