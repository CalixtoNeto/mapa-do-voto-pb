// Página do perfil do estado: o Governo (#perfis e #perfil/estado), a Assembleia (#perfil/assembleia), as emendas estaduais
// (#perfil/emendas) e cada deputado estadual (#perfil/nome-do-deputado).
import { usarPerfis, usarRota } from './dados-perfil.mjs';
import { slug } from './calculos-perfil.mjs';
import { PerfilEstado } from './perfil-estado.mjs';
import { PerfilAssembleia } from './perfil-assembleia.mjs';
import { PerfilEmendasEstaduais } from './perfil-emendas-estaduais.mjs';
import { PerfilDeputado } from './perfil-deputado.mjs';
export { ehRotaDePerfil } from './dados-perfil.mjs';
const { html } = window.htmPreact;

export function PaginaDePerfis({ aoVerNoMapa }) {
  const dados = usarPerfis(), rota = usarRota();
  if (!dados) return html`<p class="hint" role="status">Carregando o perfil do estado…</p>`;
  if (dados.vazio) return html`<p class="hint">O perfil do estado ainda não foi gerado.</p>`;
  const alvo = rota.replace(/^perfil\//, '');
  if (alvo === 'assembleia') return html`<${PerfilAssembleia} assembleia=${dados.assembleia} />`;
  if (alvo === 'emendas') return html`<${PerfilEmendasEstaduais} anos=${dados.anos} assembleia=${dados.assembleia} />`;
  const v = dados.assembleia?.vereadores.find(x => slug(x.nome) === alvo);
  if (v) return html`<${PerfilDeputado} v=${v} assembleia=${dados.assembleia} anos=${dados.anos} aoVerNoMapa=${aoVerNoMapa} />`;
  return html`<${PerfilEstado} anos=${dados.anos} />`;
}
