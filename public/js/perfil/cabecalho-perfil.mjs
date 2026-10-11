// Topo de cada página de perfil: rótulo, título, lede, as três pílulas (Governo, Assembleia, Emendas estaduais) e os indicadores.
import { Cabecalho, Indicadores, Abas } from '../estrutura.mjs';
const { html } = window.htmPreact;

const PAGINAS = [['estado', 'Governo'], ['assembleia', 'Assembleia'], ['emendas', 'Emendas estaduais']];
const irPara = id => { location.hash = 'perfil/' + id; };

// pagina: a pílula ativa (sem ela, não há pílulas, como na página de um deputado); foto: do deputado.
export function CabecalhoDoPerfil({ pagina, foto, rotulo, titulo, lede, indicadores, children }) {
  return html`<div class="cab-perfil">
    <div class=${'cab-linha' + (foto ? ' com-foto' : '')}>
      ${foto && html`<img src=${foto.replace(/^http:/, 'https:')} alt="" width="96" height="96" onError=${e => { e.target.hidden = true; }} />`}
      <${Cabecalho} rotulo=${rotulo} titulo=${titulo} lede=${lede}>
        ${pagina && html`<${Abas} itens=${PAGINAS} valor=${pagina} aoMudar=${irPara} rotulo="Páginas do perfil do estado" estilo="pilula" />`}${children}<//>
    </div>
    ${indicadores && html`<${Indicadores} itens=${indicadores} />`}
  </div>`;
}

// Chips dos anos publicados; anos: [{ ano }].
export function SeletorDeAno({ anos, ano, setAno }) {
  return html`<div class="chips seletor-ano" role="radiogroup" aria-label="Ano">${anos.map(a =>
    html`<button type="button" role="radio" aria-checked=${a.ano === ano} onClick=${() => setAno(a.ano)}>${a.ano}</button>`)}</div>`;
}
