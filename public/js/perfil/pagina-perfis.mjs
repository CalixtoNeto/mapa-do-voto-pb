// Página do perfil do estado (#perfis ou #perfil/estado). Por enquanto, o Governo da Paraíba; a Assembleia
// Legislativa e os deputados entram aqui como novos perfis.
import { usarPerfis } from './dados-perfil.mjs';
import { PerfilEstado } from './perfil-estado.mjs';
export { ehRotaDePerfil } from './dados-perfil.mjs';
const { html } = window.htmPreact;

export function PaginaDePerfis() {
  const dados = usarPerfis();
  if (!dados) return html`<p class="hint" role="status">Carregando o perfil do estado…</p>`;
  if (dados.vazio) return html`<p class="hint">O perfil do estado ainda não foi gerado.</p>`;
  return html`<${PerfilEstado} anos=${dados.anos} />`;
}
