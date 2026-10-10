// A Assembleia Legislativa em números (SAPL da ALPB): sessões, votações nominais, presença de cada deputado e a
// lista dos deputados da legislatura, cada um com a sua página.
import { nf, pct } from '../formato.mjs';
import { ListaDeBarras } from '../componentes.mjs';
import { taxa, slug, vereadoresEmOrdem } from './calculos-perfil.mjs';
import { Voltar, Topo, Estatisticas, Secao, ano } from './pecas.mjs';
const { html } = window.htmPreact;

export function ListaDeDeputados({ deputados }) {
  return html`<ul class="lista-perfis">${vereadoresEmOrdem(deputados).map(v => html`<li><a href=${'#perfil/' + slug(v.nome)} class=${v.emExercicio ? '' : 'fora'}>
    <span class="n">${v.nome}<small>${v.partido || 'sem partido'}${v.emExercicio ? '' : ' · fora do mandato'}</small></span>
    <span class="m">${taxa(v.presenca) == null ? '' : `${pct(taxa(v.presenca), 0)} de presença`}<small>${nf.format(v.materias.total)} matérias</small></span></a></li>`)}</ul>`;
}

function Presencas({ deputados }) {
  const itens = deputados.filter(v => v.presenca[1]).sort((a, b) => taxa(b.presenca) - taxa(a.presenca))
    .map(v => ({ n: html`<a href=${'#perfil/' + slug(v.nome)}>${v.nome}</a>`, v: taxa(v.presenca), rotulo: `${pct(taxa(v.presenca), 0)} · ${v.presenca[0]}/${v.presenca[1]}` }));
  return html`<${ListaDeBarras} itens=${itens} />`;
}

export function PerfilAssembleia({ assembleia: a }) {
  return html`<article class="perfil">
    <${Voltar} />
    <${Topo} titulo="Assembleia Legislativa da Paraíba" linhas=${[`${a.legislatura.numero}ª legislatura · ${ano(a.legislatura.inicio)}–${ano(a.legislatura.fim)}`]} />
    <${Estatisticas} itens=${[{ rotulo: 'Sessões realizadas (com presença ou voto registrado)', valor: nf.format(a.sessoes) }, { rotulo: 'Votações nominais registradas', valor: nf.format(a.votacoesNominais) },
      { rotulo: 'Deputados em exercício', valor: nf.format(a.vereadores.filter(v => v.emExercicio).length) }]} />
    <${Secao} id="ad" titulo="Deputados estaduais"><${ListaDeDeputados} deputados=${a.vereadores} /><//>
    <${Secao} id="ap" titulo="Presença nas sessões"><${Presencas} deputados=${a.vereadores} />
      <p class="hint">Sessões em que o deputado tem presença registrada no SAPL ou votou (sim, não ou abstenção), desde o início do mandato de cada um. O registro de presença do SAPL tem falhas; licenças e missões oficiais podem aparecer como ausência.</p><//>
    <p class="hint">Fonte: SAPL da Assembleia Legislativa da Paraíba (sessões, presença, votos nominais e matérias). Votações simbólicas só registram o resultado, não o voto de cada deputado.</p>
  </article>`;
}
