// Cartograma das UFs: um quadrado por estado, na posição aproximada do mapa. A cor é de quem venceu e fica mais forte
// quanto maior a parcela dos votos válidos. Não é um mapa: o tamanho não diz nada.
import { pct, nomeDeQuem } from '../formato.mjs';
const { html } = window.htmPreact;

// [linha, coluna] de cada UF; EX é o exterior.
const POSICAO = { RR: [0, 3], AP: [0, 5], AM: [1, 2], PA: [1, 4], MA: [1, 5], CE: [1, 6], RN: [1, 7], AC: [2, 1], RO: [2, 2], MT: [2, 3], TO: [2, 4],
  PI: [2, 5], PE: [2, 6], PB: [2, 7], MS: [3, 3], GO: [3, 4], DF: [3, 5], BA: [3, 6], AL: [3, 7], SE: [3, 8], PR: [4, 3], SP: [4, 4], MG: [4, 5],
  ES: [4, 6], SC: [5, 3], RJ: [5, 5], RS: [6, 3], EX: [6, 6] };

export const nomeDaUf = uf => uf === 'ZZ' ? 'EX' : uf;

// Cor de quem venceu; a força vai de 35% (empate) a 90% (75% dos válidos ou mais).
function corDoQuadrado(u) {
  const vencedor = u.votos[0] >= u.votos[1] ? 0 : 1, parcela = Math.max(u.votos[0], u.votos[1]) / (u.validos || 1);
  const forca = Math.round(35 + Math.min(1, Math.max(0, (parcela - 0.5) / 0.25)) * 55);
  return `color-mix(in srgb, ${vencedor ? 'var(--accent)' : 'var(--r4)'} ${forca}%, var(--surface))`;
}

export function GradeDeUfs({ ufs, cands, uf, aoEscolher }) {
  const porUf = new Map(ufs.map(u => [nomeDaUf(u.uf), u]));
  return html`<div class="grade-ufs" role="group" aria-label="Resultado por estado">${Object.entries(POSICAO).map(([sigla, [linha, coluna]]) => {
    const u = porUf.get(sigla);
    if (!u) return null;
    const lado = u.votos[0] >= u.votos[1] ? 0 : 1, parcela = Math.max(u.votos[0], u.votos[1]) / (u.validos || 1);
    return html`<button type="button" class=${'quadrado' + (uf === u.uf ? ' ativo' : '')} aria-pressed=${uf === u.uf} style=${`grid-row:${linha + 1};grid-column:${coluna + 1};background:${corDoQuadrado(u)}`}
      aria-label=${`${sigla}: ${cands[lado].urna} com ${pct(parcela, 1)} dos votos válidos`} onClick=${() => aoEscolher(uf === u.uf ? null : u.uf)}><b>${sigla}</b><small>${pct(parcela, 0)}</small></button>`;
  })}</div>
  <ul class="legenda-linha legenda-ufs"><li><i style="background:var(--r4)"></i>${nomeDeQuem(cands[0].urna)}</li><li><i style="background:var(--accent)"></i>${nomeDeQuem(cands[1].urna)}</li><li>Cor mais forte = parcela maior</li></ul>`;
}
