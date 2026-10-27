// "As contas fecham?": as conferências que qualquer pessoa pode refazer com os arquivos abertos do TSE.
import { nf } from '../formato.mjs';
import { Cartao, ComoLer } from '../cartao.mjs';
import { conferirSomas, conferirComTse } from './calculos-conferencias.mjs';
const { html } = window.htmPreact;

const Marca = ({ ok }) => html`<span class=${'marca ' + (ok ? 'ok' : 'falha')} aria-hidden="true">${ok ? '✓' : '!'}</span>`;

function Item({ ok, titulo, detalhe }) {
  return html`<li><${Marca} ok=${ok} /><div><b>${titulo}</b>${detalhe && html`<small>${detalhe}</small>`}</div></li>`;
}

function exemplos(lista) {
  return lista.length ? ` Por exemplo: ${lista.slice(0, 3).map(m => `${m.nome} (${m.uf})`).join(', ')}.` : '';
}

export function ConferenciasNacionais({ linhas, totais, tse, turno }) {
  const somas = conferirSomas(linhas), comTse = conferirComTse(totais, tse);
  const diverge = comTse?.filter(c => c.diferenca !== 0) || [];
  return html`<${Cartao} tipo="Conferências" titulo=${`As contas do ${turno}º turno fecham?`} sub=${`${nf.format(somas.municipios)} municípios e zonas do exterior conferidos.`}>
    <ul class="conferencias">
      <${Item} ok=${!somas.naoFecham.length} titulo="Válidos + brancos + nulos = comparecimento"
        detalhe=${somas.naoFecham.length ? `${nf.format(somas.naoFecham.length)} municípios não fecham (diferença total de ${nf.format(somas.diferenca)} votos).${exemplos(somas.naoFecham)}` : 'Em todos os municípios.'} />
      <${Item} ok=${!somas.maisQueAptos.length} titulo="Ninguém comparece mais do que o eleitorado apto"
        detalhe=${somas.maisQueAptos.length ? `${nf.format(somas.maisQueAptos.length)} municípios.${exemplos(somas.maisQueAptos)}` : 'Em todos os municípios.'} />
      ${comTse ? html`<${Item} ok=${!diverge.length} titulo="A soma dos municípios bate com o total nacional do TSE"
        detalhe=${diverge.length ? diverge.map(c => `${c.nome}: ${nf.format(c.site)} aqui, ${nf.format(c.tse)} no TSE`).join('; ') : 'Aptos, comparecimento, brancos, nulos e válidos.'} />`
        : html`<${Item} ok=${true} titulo="Total nacional do TSE" detalhe="O TSE ainda não publicou o total nacional deste turno no formato que o site lê; a conferência fica para a próxima atualização." />`}
    </ul>
    <${ComoLer} titulo="O que estas conferências provam (e o que não provam)">
      <p>São contas de consistência sobre os arquivos de resultado por município e zona. Se elas fecham, a soma não tem erro de arquivo; isso não substitui a auditoria
      das urnas, que é feita com os boletins e os registros digitais de cada seção.</p><//><//>`;
}
