// Seções que fecharam depois das 18h: a parcela de cada candidato nelas, comparada às outras seções do mesmo município.
import { nf, nomeDeQuem } from '../formato.mjs';
import { Cartao, Aviso } from '../cartao.mjs';
import { siglaDaUf } from './ufs.mjs';
import { prorrogadasContraNormais } from './calculos-urnas.mjs';
const { html, useMemo } = window.htmPreact;

const MOSTRAR = 15;
const pp = v => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} p.p.`;

export function ProrrogadasUrnas({ linhas, candidatos }) {
  const r = useMemo(() => prorrogadasContraNormais(linhas, 0), [linhas]);
  if (!r.municipios.length) return html`<p class="hint">Nenhuma seção deste recorte fechou depois das 18h.</p>`;
  const maiores = [...r.municipios].filter(m => m.secoes >= 3).sort((a, b) => Math.abs(b.diferenca) - Math.abs(a.diferenca)).slice(0, MOSTRAR);
  return html`<${Cartao} tipo="Fechamento depois das 18h" titulo=${`${nomeDeQuem(candidatos[0])} nas seções prorrogadas`} classe="largo"
      sub=${`${nf.format(r.secoes)} seções de ${nf.format(r.municipios.length)} municípios. Média, ponderada pelos votos: ${pp(r.diferenca)} em relação às outras seções do mesmo município.`}
      nota="Parcela do candidato nos votos válidos das seções que fecharam depois das 18h menos a parcela nas demais seções do mesmo município. Municípios com ao menos 3 seções prorrogadas.">
    <div class="calor-rolagem"><table class="tabela-nacional"><caption class="so-leitor">Municípios com maior diferença</caption>
      <thead><tr><th scope="col">Município</th><th scope="col">Seções</th><th scope="col">Nas prorrogadas</th><th scope="col">Nas demais</th><th scope="col">Diferença</th></tr></thead>
      <tbody>${maiores.map(m => html`<tr><th scope="row">${nomeDeQuem(m.nome)} <small>${siglaDaUf(m.uf)}</small></th><td>${m.secoes}</td><td>${(m.prorrog * 100).toFixed(1)}%</td><td>${(m.normal * 100).toFixed(1)}%</td><td>${pp(m.diferenca)}</td></tr>`)}</tbody></table></div>
    <${Aviso}>Comparação estatística do site, não avaliação de legalidade. Seções que fecham mais tarde costumam ser as de fila longa, em bairros e locais com mais eleitores, e o voto muda com o tipo de lugar.<//><//>`;
}
