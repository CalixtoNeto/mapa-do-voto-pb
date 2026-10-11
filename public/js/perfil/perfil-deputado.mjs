// Perfil de um deputado estadual (SAPL da ALPB): mandato, presença, votos nominais, com quem vota junto, matérias,
// partidos e doadores e fornecedores da campanha que também receberam do estado.
import { pct, nf, sentence } from '../formato.mjs';
import { ListaDeBarras } from '../componentes.mjs';
import { Pilha } from '../graficos.mjs';
import { taxa, extremosDaAfinidade, ligacoesDoCandidato } from './calculos-perfil.mjs';
import { Voltar, Topo, Estatisticas, Secao, Ligacoes, ano, nomeProprio } from './pecas.mjs';
const { html } = window.htmPreact;
const SAPL = 'https://sapl.al.pb.leg.br';

function Materias({ m }) {
  if (!m.total) return html`<p class="hint">Nenhuma matéria de autoria registrada no SAPL nesta legislatura.</p>`;
  return html`<${ListaDeBarras} itens=${m.porTipo.map(([tipo, n]) => ({ n: tipo, v: n, rotulo: nf.format(n) }))} />
    <h3>Mais recentes</h3>
    <ul class="materias">${m.recentes.map(([id, tipo, numero, a, ementa, data]) => html`<li>
      <a href=${`${SAPL}/materia/${id}`} target="_blank" rel="noopener">${tipo} nº ${numero}/${a}</a>
      <small>${data ? data.split('-').reverse().join('/') : ''}</small><p>${sentence(ementa)}</p></li>`)}</ul>`;
}

function Afinidade({ titulo, itens, nomes }) {
  return itens.length ? html`<h3>${titulo}</h3><${ListaDeBarras} itens=${itens.map(([id, iguais, comuns]) =>
    ({ n: nomes.get(id) || '?', v: iguais / comuns, rotulo: `${pct(iguais / comuns, 0)} de ${comuns}` }))} />` : null;
}

function Votacoes({ v, nomes }) {
  const t = v.votacoes, total = t.sim + t.nao + t.abstencao + t.outros;
  if (!total) return html`<p class="hint">Nenhum voto nominal registrado no SAPL para este deputado. Votações simbólicas só registram o resultado.</p>`;
  const { mais, menos } = extremosDaAfinidade(v.afinidade);
  const partes = [['Sim', t.sim, 'var(--s1)'], ['Não', t.nao, 'var(--s2)'], ['Abstenção', t.abstencao, 'var(--s0)'], ['Outros', t.outros, 'var(--line)']]
    .filter(p => p[1] > 0).map(([nome, v, cor]) => ({ nome, v, cor, rotulo: `${nf.format(v)} · ${pct(v / total, 0)}` }));
  return html`<${Pilha} partes=${partes} descricao=${'Votos nominais: ' + partes.map(p => `${p.nome} ${p.rotulo}`).join('; ')} />
    <${Estatisticas} itens=${[{ rotulo: 'Sim', valor: nf.format(t.sim) }, { rotulo: 'Não', valor: nf.format(t.nao) },
      { rotulo: 'Abstenção', valor: nf.format(t.abstencao) },
      { rotulo: 'Votou com a maioria', valor: t.comMaioriaDe ? pct(t.comMaioria / t.comMaioriaDe, 0) : null, nota: `de ${t.comMaioriaDe} votações` }]} />
    <${Afinidade} titulo="Vota mais junto com" itens=${mais} nomes=${nomes} />
    <${Afinidade} titulo="Vota menos junto com" itens=${menos} nomes=${nomes} />
    <p class="hint">Votar junto não indica acordo político. Contam só as votações nominais registradas no SAPL.</p>`;
}

function Partidos({ partidos }) {
  if (partidos.length < 2) return null;
  return html`<h3>Partidos</h3><ul class="locais">${partidos.map(([sigla, desde, ate]) =>
    html`<li><span class="ln">${sigla}</span><span class="lv">${ano(desde)}–${ate ? ano(ate) : 'hoje'}</span></li>`)}</ul>`;
}

export function PerfilDeputado({ v, assembleia, anos, aoVerNoMapa }) {
  const nomes = new Map(assembleia.vereadores.map(x => [x.id, x.nome])), presenca = taxa(v.presenca);
  const mandato = `Deputado(a) estadual · ${v.partido || 'sem partido'} · ${ano(v.inicio)}–${ano(v.fim)}${v.titular ? '' : ' · suplente'}`;
  return html`<article class="perfil">
    <${Voltar} para="#perfil/assembleia" texto="Assembleia Legislativa" />
    <${Topo} foto=${v.foto} titulo=${v.nome} linhas=${[mandato, nomeProprio(v.completo), !v.emExercicio && `Fora do mandato desde ${v.fim.split('-').reverse().join('/')}`]}>
      ${v.chaveNoMapa && html`<button type="button" class="link" onClick=${() => aoVerNoMapa(v.chaveNoMapa)}>Ver os votos de ${assembleia.eleicao} no mapa</button>`}
    <//>
    <${Estatisticas} itens=${[{ rotulo: 'Presença nas sessões', valor: presenca == null ? null : pct(presenca, 0), nota: `${v.presenca[0]} de ${v.presenca[1]} sessões (presença registrada ou voto)` },
      { rotulo: 'Matérias apresentadas', valor: nf.format(v.materias.total) }, { rotulo: `Votos em ${assembleia.eleicao}`, valor: v.eleicao == null ? null : nf.format(v.eleicao) }]} />
    <${Secao} id="dm" titulo="Matérias de autoria"><${Materias} m=${v.materias} /><//>
    <${Secao} id="dv" titulo="Votos nominais"><${Votacoes} v=${v} nomes=${nomes} /><//>
    <${Secao} id="dp" titulo="Partido"><p class="hint">${v.partido ? `Filiado ao ${v.partido}.` : 'Sem filiação registrada no SAPL.'}</p><${Partidos} partidos=${v.partidos} /><//>
    ${v.chave && html`<${Secao} id="dc" titulo="Doadores e fornecedores da campanha que também receberam do estado"><${Ligacoes} ligacoes=${ligacoesDoCandidato(anos, v.chave, assembleia.eleicao)} /><//>`}
    <p class="hint">Fontes: SAPL da Assembleia Legislativa da Paraíba (legislatura ${assembleia.legislatura.numero}, desde ${ano(assembleia.legislatura.inicio)}), API de dados abertos do Governo da Paraíba e TSE. A ligação com a candidatura é pelo nome completo; pode haver homônimos.</p>
  </article>`;
}
