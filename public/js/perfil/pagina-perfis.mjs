// Páginas do perfil do estado: o início (#perfis), o Governo da Paraíba (#perfil/estado), a Assembleia
// Legislativa (#perfil/assembleia) e cada deputado estadual (#perfil/nome-do-deputado).
import { dinheiro, nf } from '../formato.mjs';
import { usarPerfis, usarRota } from './dados-perfil.mjs';
import { slug } from './calculos-perfil.mjs';
import { Secao } from './pecas.mjs';
import { PerfilEstado } from './perfil-estado.mjs';
import { PerfilAssembleia, ListaDeDeputados } from './perfil-assembleia.mjs';
import { PerfilDeputado } from './perfil-deputado.mjs';
export { ehRotaDePerfil } from './dados-perfil.mjs';
const { html } = window.htmPreact;

function Inicio({ dados }) {
  const { anos, assembleia } = dados, a = anos[0];
  return html`<article class="perfil">
    <header class="who"><h1>Quem governa a Paraíba</h1><p>Governo do estado e Assembleia Legislativa, pelos dados abertos do Governo da Paraíba e da Assembleia.</p></header>
    <ul class="lista-perfis destaque">
      ${a && html`<li><a href="#perfil/estado"><span class="n">Governo da Paraíba<small>gastos, folha, compras e emendas estaduais</small></span><span class="m">${dinheiro(a.despesas.orgaos.reduce((s, o) => s + o[2], 0))}<small>pagos em ${a.ano}</small></span></a></li>`}
      ${assembleia && html`<li><a href="#perfil/assembleia"><span class="n">Assembleia Legislativa<small>${assembleia.vereadores.filter(v => v.emExercicio).length} deputados em exercício</small></span><span class="m">${nf.format(assembleia.sessoes)} sessões<small>${nf.format(assembleia.votacoesNominais)} votações nominais</small></span></a></li>`}
    </ul>
    ${assembleia && html`<${Secao} id="id" titulo="Deputados estaduais"><${ListaDeDeputados} deputados=${assembleia.vereadores} /><//>`}
  </article>`;
}

export function PaginaDePerfis({ aoVerNoMapa }) {
  const dados = usarPerfis(), rota = usarRota();
  if (!dados) return html`<p class="hint" role="status">Carregando o perfil do estado…</p>`;
  if (dados.vazio) return html`<p class="hint">O perfil do estado ainda não foi gerado.</p>`;
  const alvo = rota.replace(/^perfil\//, '');
  if (alvo === 'estado') return html`<${PerfilEstado} anos=${dados.anos} />`;
  if (alvo === 'assembleia' && dados.assembleia) return html`<${PerfilAssembleia} assembleia=${dados.assembleia} />`;
  const v = dados.assembleia?.vereadores.find(x => slug(x.nome) === alvo);
  return v ? html`<${PerfilDeputado} v=${v} assembleia=${dados.assembleia} anos=${dados.anos} aoVerNoMapa=${aoVerNoMapa} />` : html`<${Inicio} dados=${dados} />`;
}
