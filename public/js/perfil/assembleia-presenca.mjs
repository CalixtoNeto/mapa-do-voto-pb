// Assembleia: quem aparece nas sessões (barras com a média como traço), os partidos em rosca e a lista de deputados.
import { nf, pct } from '../formato.mjs';
import { Bloco } from '../estrutura.mjs';
import { Cartao } from '../cartao.mjs';
import { BarrasComMeta } from '../barras-meta.mjs';
import { Rosca, Waffle } from '../graficos.mjs';
import { slug, taxa, vereadoresEmOrdem } from './calculos-perfil.mjs';
import { presencaMedia, presencasEmOrdem, partidosEmExercicio, partesDosPartidos } from './calculos-camara.mjs';
const { html } = window.htmPreact;

const CORES = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--c5)', 'var(--c6)', 'var(--c7)'];
const partidos = deputados => partesDosPartidos(partidosEmExercicio(deputados), CORES, 'var(--s0)');

function Presenca({ deputados }) {
  const lista = presencasEmOrdem(deputados), media = presencaMedia(deputados);
  return html`<${Cartao} tipo="Barras com referência · presença" titulo="Presença nas sessões" sub=${`% das sessões. Traço: média de ${pct(media, 0)}.`}
    nota="Quem entrou depois, como suplente, é medido sobre as sessões do seu mandato. A barra vai de 0 a 100%.">
    <${BarrasComMeta} meta=${media} descricao="Presença de cada deputado nas sessões"
      itens=${lista.map(p => ({ n: html`<a href=${'#perfil/' + slug(p.nome)}>${p.nome}</a>`, v: p.fracao, rotulo: pct(p.fracao, 0), nota: `${p.parte}/${p.total}` }))} /><//>`;
}

function Partidos({ deputados }) {
  const partes = partidos(deputados).map(p => ({ ...p, rotulo: String(p.v) })), total = partes.reduce((s, p) => s + p.v, 0);
  return html`<${Cartao} tipo="Pizza · partidos" titulo="Partidos dos deputados" nota="Deputados em exercício, um por cadeira. Quem não tem partido registrado no SAPL aparece como não informado.">
    <${Rosca} partes=${partes} centro=${{ rotulo: 'Deputados', valor: String(total) }} descricao=${'Partidos dos deputados em exercício: ' + partes.map(p => `${p.nome} ${p.v}`).join(', ')} /><//>`;
}

export function QuemAparece({ deputados }) {
  return html`<${Bloco} id="cp" titulo="Quem aparece" colunas="dois-tercos"
    lede="A barra é a presença do deputado nas sessões e o traço escuro é a média da Assembleia; ao lado, os partidos de quem está em exercício.">
    <${Presenca} deputados=${deputados} /><${Partidos} deputados=${deputados} /><//>`;
}

function Lista({ deputados }) {
  return html`<ul class="lista-perfis">${vereadoresEmOrdem(deputados).map(v => html`<li><a href=${'#perfil/' + slug(v.nome)} class=${v.emExercicio ? '' : 'fora'}>
    <span class="n">${v.nome}<small>${v.partido || 'sem partido'}${v.emExercicio ? '' : ' · fora do mandato'}</small></span>
    <span class="m">${taxa(v.presenca) == null ? '' : `${pct(taxa(v.presenca), 0)} de presença`}<small>${nf.format(v.materias.total)} matérias</small></span></a></li>`)}</ul>`;
}

export function OsDeputados({ deputados }) {
  const grupos = partidos(deputados).map(p => ({ id: p.nome, nome: p.nome, n: p.v, cor: p.cor })), total = grupos.reduce((s, g) => s + g.n, 0);
  return html`<${Bloco} id="iv" titulo="Os deputados" colunas="um-terco"
    lede="Um quadrado por cadeira e, ao lado, todos os deputados da legislatura, inclusive suplentes que já deixaram o mandato. Toque num nome para abrir o perfil.">
    <${Cartao} tipo="Waffle · cadeiras" titulo="Cadeiras por partido" nota="Um quadrado por deputado em exercício; o número ao lado confirma a cor.">
      <${Waffle} grupos=${grupos} descricao=${`${total} deputados em exercício: ${grupos.map(g => `${g.nome} ${g.n}`).join(', ')}`} /><//>
    <${Cartao} tipo="Lista · deputados" titulo="Todos os deputados" sub="Presença nas sessões e matérias de autoria"><${Lista} deputados=${deputados} /><//><//>`;
}
