// Governo: valores atípicos nos pagamentos e fornecedores de campanhas que também receberam do estado.
import { Bloco } from '../estrutura.mjs';
import { Cartao } from '../cartao.mjs';
import { ligacoesDoAno } from './calculos-perfil.mjs';
import { Ligacoes } from './pecas.mjs';
import { Alertas } from './alertas.mjs';
const { html } = window.htmPreact;

export const PAGADOR_ESTADO = { dos: 'do estado', pagou: 'o estado', fonte: 'Governo da Paraíba' };

export function Atipicos({ a, anos }) {
  return html`<${Bloco} id="px" titulo=${`Valores atípicos nos pagamentos de ${a.ano}`}
    lede="Contas do site sobre os pagamentos registrados pelo Governo da Paraíba. Mostram onde olhar com mais atenção; não dizem que algo esteja errado.">
    <${Cartao} classe="largo" tipo="Valores atípicos · conta do site" titulo=${`Pagamentos que se destacam em ${a.ano}`}><${Alertas} a=${a} anos=${anos} /><//><//>`;
}

export function Campanhas({ a }) {
  return html`<${Bloco} id="pd" titulo="Campanhas e pagamentos do estado"
    lede="Quem doou ou prestou serviço a campanhas estaduais e também aparece entre os credores do Governo, cruzado pelo documento.">
    <${Cartao} classe="largo" tipo="Lista · todas as campanhas" titulo=${`Em ${a.ano}`} sub="Doadores e fornecedores de campanhas que também receberam do estado">
      <${Ligacoes} ligacoes=${ligacoesDoAno(a)} comCandidato pagador=${PAGADOR_ESTADO} /><//><//>`;
}
