// Números do país ou da UF escolhida: votos dos dois candidatos, abstenção, brancos e nulos, e a mudança em relação ao 1º turno.
import { nf, pct, nomeDeQuem } from '../formato.mjs';
import { Cartao } from '../cartao.mjs';
const { html } = window.htmPreact;

const pontos = d => `${d > 0 ? '+' : d < 0 ? '−' : ''}${Math.abs(d * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} p.p.`;

function Linha({ nome, valor, parcela, antes }) {
  return html`<div><dt>${nome}</dt><dd>${valor}${parcela != null && html` <small>${pct(parcela, 1)}</small>`}</dd>${antes != null && html`<small class="variacao">${antes}</small>`}</div>`;
}

// t: totais do turno; anterior: totais do turno anterior no mesmo recorte (ou null).
export function ResumoDoRecorte({ titulo, t, anterior, cands }) {
  const comp = t.comp || 1, v = t.validos || 1;
  const dAbst = anterior ? t.abstencao / (t.aptos || 1) - anterior.abstencao / (anterior.aptos || 1) : null;
  const dBN = anterior ? (t.brancos + t.nulos) / comp - (anterior.brancos + anterior.nulos) / (anterior.comp || 1) : null;
  return html`<${Cartao} tipo="Números do recorte" titulo=${titulo} sub=${`${nf.format(t.aptos)} eleitores aptos, ${nf.format(t.comp)} compareceram.`}
      nota="Parcelas dos candidatos sobre os votos válidos; abstenção sobre os aptos; brancos e nulos sobre o comparecimento.">
    <dl class="numeros-nacional">
      ${cands.slice(0, 2).map((c, i) => html`<${Linha} nome=${nomeDeQuem(c.urna)} valor=${nf.format(t.votos[i])} parcela=${t.votos[i] / v} />`)}
      <${Linha} nome="Vantagem" valor=${nf.format(Math.abs(t.margem))} antes=${nomeDeQuem(cands[t.margem >= 0 ? 0 : 1].urna)} />
      <${Linha} nome="Abstenção" valor=${nf.format(t.abstencao)} parcela=${t.abstencao / (t.aptos || 1)} antes=${dAbst != null ? `${pontos(dAbst)} em relação ao 1º turno` : null} />
      <${Linha} nome="Brancos e nulos" valor=${nf.format(t.brancos + t.nulos)} parcela=${(t.brancos + t.nulos) / comp} antes=${dBN != null ? `${pontos(dBN)} em relação ao 1º turno` : null} />
    </dl><//>`;
}
