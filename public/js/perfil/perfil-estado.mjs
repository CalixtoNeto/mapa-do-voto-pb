// Perfil do Governo da Paraíba: o dinheiro do estado em cada ano publicado pela API de dados abertos do governo.
// Tudo em árvore (o total que se abre até quem recebeu), como no perfil do município de Bayeux.
import { nf, pct, dinheiro, sentence } from '../formato.mjs';
import { ArvoreDeBarras } from '../arvore.mjs';
import { ListaDeBarras, usarLimite } from '../componentes.mjs';
import { ligacoesDoAno, mesAno } from './calculos-perfil.mjs';
import { Voltar, Topo, Estatisticas, Secao, Ligacoes, nomeProprio } from './pecas.mjs';
import { ArvoreDeGastos } from './arvore.mjs';
import { Alertas } from './alertas.mjs';
import { usarDetalhe } from './dados-perfil.mjs';
const { html, useState } = window.htmPreact;

const soma = (lista, i) => (lista || []).reduce((s, l) => s + l[i], 0);
const ultimoMes = a => a.meses?.length ? String(a.meses[a.meses.length - 1]).padStart(2, '0') : null;
const arvoreDe = (detalhe, id) => detalhe?.arvores?.[id]?.v > 0 ? detalhe.arvores[id] : null;
const quemRecebe = ultimo => (nome, nivel) => nivel === ultimo && !/^Outros \(/.test(nome) ? nomeProprio(nome) : sentence(nome);

function Numeros({ a }) {
  const pago = soma(a.despesas.orgaos, 2);
  return html`<${Estatisticas} itens=${[
    { rotulo: 'Pago no ano', valor: dinheiro(pago), nota: ultimoMes(a) && `até ${ultimoMes(a)}/${a.ano}` },
    { rotulo: 'Compras, serviços e obras', valor: dinheiro(a.despesas.compras), nota: pago ? `${pct(a.despesas.compras / pago, 0)} do pago` : null },
    { rotulo: 'Folha bruta', valor: a.folha ? dinheiro(a.folha.total) : null, nota: a.folha && `${nf.format(a.folha.pessoas)} vínculos em ${mesAno(a.folha.mes)}` },
    { rotulo: 'Emendas estaduais indicadas', valor: a.emendas?.total ? dinheiro(a.emendas.total) : null, nota: a.emendas?.porDeputado.length ? `${a.emendas.porDeputado.length} autores` : null }]} />`;
}

function Arvore({ arvore, legenda, rotulo }) {
  return html`<p class="hint">${legenda} Toque num item para abrir.</p><div class="arvore"><${ArvoreDeBarras} arvore=${arvore} rotulo=${rotulo} /></div>`;
}

function Folha({ a, detalhe }) {
  if (!a.folha) return null;
  const arvore = arvoreDe(detalhe, 'folha');
  return html`<${Secao} id="ef" titulo=${`Folha de pessoal em ${mesAno(a.folha.mes)}`}>
    ${arvore ? html`<${Arvore} arvore=${arvore} legenda="Tipo de cargo → órgão." />` : html`<p class="hint">Carregando…</p>`}
    <p class="hint">Valor bruto da folha do mês e número de vínculos (uma pessoa pode ter mais de um). Nomes e CPFs dos servidores não aparecem no site.</p><//>`;
}

function Compras({ a, detalhe }) {
  const arvore = arvoreDe(detalhe, 'licitacoes'), contratados = a.licitacoes?.contratados || [];
  const [limite, botao] = usarLimite(contratados.length);
  if (!arvore && !contratados.length) return null;
  return html`<${Secao} id="el" titulo="Licitações e contratos">
    ${arvore && html`<${Arvore} arvore=${arvore} legenda="Modalidade → órgão, pelo valor adjudicado nas contratações do ano." />`}
    ${contratados.length > 0 && html`<h3>Maiores contratados (contratos com vigência iniciada no ano)</h3>
      <${ListaDeBarras} itens=${contratados.slice(0, limite).map(([nome, , v, n]) => ({ n: nomeProprio(nome), v, rotulo: `${dinheiro(v)}${n > 1 ? ` · ${n} contratos` : ''}` }))} />${botao}`}<//>`;
}

function Emendas({ detalhe }) {
  const arvore = arvoreDe(detalhe, 'emendasEstaduais');
  if (!arvore) return null;
  return html`<${Secao} id="ee" titulo="Emendas parlamentares estaduais">
    <${Arvore} arvore=${arvore} legenda="Deputado → secretaria → objeto da emenda." rotulo=${(nome, nivel) => nivel === 0 ? nomeProprio(nome) : sentence(nome)} />
    <p class="hint">Valor indicado em cada emenda (listagem de emendas do Governo da Paraíba); indicar não é o mesmo que pagar.</p><//>`;
}

function Anos({ anos, ano, setAno }) {
  return html`<div class="chips" role="radiogroup" aria-label="Ano">${anos.map(a =>
    html`<button type="button" role="radio" aria-checked=${a.ano === ano} onClick=${() => setAno(a.ano)}>${a.ano}</button>`)}</div>`;
}

export function PerfilEstado({ anos }) {
  const [ano, setAno] = useState(anos[0]?.ano);
  const a = anos.find(x => x.ano === ano) || anos[0], detalhe = usarDetalhe(a?.ano);
  if (!a) return html`<article class="perfil"><p class="hint">O perfil do estado ainda não foi gerado.</p></article>`;
  return html`<article class="perfil">
    <${Voltar} />
    <${Topo} titulo="Governo da Paraíba" linhas=${['Executivo estadual: gastos, folha, compras e emendas, pelos dados abertos do Governo da Paraíba']} />
    <h2 class="perfil-ano">O estado em</h2><${Anos} anos=${anos} ano=${a.ano} setAno=${setAno} />
    <${Numeros} a=${a} />
    <${Secao} id="eg" titulo=${`Para onde foi o dinheiro em ${a.ano}`}><${ArvoreDeGastos} key=${a.ano} arvores=${detalhe?.arvores} ano=${a.ano} /><//>
    <${Secao} id="ex" titulo=${`Valores atípicos nas compras de ${a.ano}`}><${Alertas} a=${a} anos=${anos} /><//>
    <${Folha} a=${a} detalhe=${detalhe} /><${Compras} a=${a} detalhe=${detalhe} /><${Emendas} detalhe=${detalhe} />
    <${Secao} id="ec" titulo=${`Doadores e fornecedores de campanhas estaduais que também receberam do estado em ${a.ano}`}><${Ligacoes} ligacoes=${ligacoesDoAno(a)} comCandidato /><//>
    <p class="hint">Fonte: API de dados abertos do Governo da Paraíba (despesas orçamentárias, remuneração de servidores, contratações, contratos e emendas) e TSE (prestação de contas de governador e deputados estaduais). Os dados do ano corrente são parciais.</p>
  </article>`;
}
