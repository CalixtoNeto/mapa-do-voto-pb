// Mapa do Brasil por UF (malha do IBGE): cada estado numa cor da escala viridis, do menor ao maior valor entre as UFs.
// A cor não é de candidato nem de partido: ela mostra só a parcela do candidato escolhido.
import { projecaoDoBrasil, caminhoDaGeometria, centroDaGeometria } from './calculos-mapa.mjs';
import { corViridis, textoSobre, PARADAS_VIRIDIS } from './cores-viridis.mjs';
import { pct } from '../formato.mjs';
import { siglaDaUf, nomeDaUf } from './ufs.mjs';
const { html, useState, useEffect, useMemo } = window.htmPreact;

const LARGURA = 600, CAIXA = { lonMin: -74.2, lonMax: -34.2, latMin: -33.9, latMax: 5.4 };
let malha = null;

// features da malha (propriedade sigla); null enquanto carrega e false se o arquivo não existir.
function usarMalha() {
  const [features, setFeatures] = useState(null);
  useEffect(() => {
    (malha ||= fetch('data/br.topo.json').then(r => r.ok ? r.json() : null).then(topo => topo ? window.topojson.feature(topo, topo.objects.ufs).features : false).catch(() => false)).then(setFeatures);
  }, []);
  return features;
}

export function LegendaViridis({ minimo, maximo, rotulo }) {
  return html`<div class="legenda-viridis"><span class="rotulo">${rotulo}</span>
    <div class="faixa-viridis" style=${`background:linear-gradient(90deg,${PARADAS_VIRIDIS.join(',')})`} role="img" aria-label=${`Do roxo (${pct(minimo, 0)}) ao amarelo (${pct(maximo, 0)})`}></div>
    <div class="extremos"><span>${pct(minimo, 0)}</span><span>${pct(maximo, 0)}</span></div></div>`;
}

function Estado({ f, projetar, u, t, valor, selecionado, aoEscolher }) {
  const sigla = f.properties.sigla, cor = corViridis(t), c = centroDaGeometria(f.geometry, projetar);
  const rotulo = c.largura > 24 && c.altura > 16;
  const escolher = () => aoEscolher(selecionado ? null : u.uf);
  return html`<g class=${'uf' + (selecionado ? ' ativa' : '')} role="button" tabindex="0" aria-pressed=${selecionado} aria-label=${`${nomeDaUf(sigla)}: ${pct(valor, 1)}`}
      onClick=${escolher} onKeyDown=${e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); escolher(); } }}>
    <path d=${caminhoDaGeometria(f.geometry, projetar)} style=${`fill:${cor}`}><title>${`${nomeDaUf(sigla)}: ${pct(valor, 1)}`}</title></path>
    ${rotulo && html`<text x=${c.x} y=${c.y} text-anchor="middle" style=${`fill:${textoSobre(cor)}`}><tspan class="sigla">${sigla}</tspan>${c.altura > 34 && html`<tspan x=${c.x} dy="12" class="valor">${pct(valor, 0)}</tspan>`}</text>`}</g>`;
}

// ufs: [{ uf, ... }]; valorDe(u): fração de 0 a 1 de cada UF; uf: a escolhida (ou null).
export function MapaDoBrasil({ ufs, valorDe, uf, aoEscolher, rotulo }) {
  const features = usarMalha(), projetar = useMemo(() => projecaoDoBrasil(CAIXA, LARGURA), []);
  const doMapa = ufs.filter(u => u.uf !== 'ZZ'), valores = doMapa.map(valorDe), [minimo, maximo] = [Math.min(...valores), Math.max(...valores)];
  const porSigla = new Map(doMapa.map(u => [u.uf, u]));
  if (features === null) return html`<p class="hint" role="status">Carregando o mapa…</p>`;
  if (!features) return html`<p class="hint">A malha do Brasil ainda não foi gerada: escolha o estado na lista abaixo.</p>`;
  return html`<div class="mapa-brasil"><svg viewBox=${`0 0 ${LARGURA} ${Math.round(projetar.altura)}`} role="group" aria-label=${rotulo}>
    ${features.filter(f => porSigla.has(f.properties.sigla)).map(f => { const u = porSigla.get(f.properties.sigla), v = valorDe(u);
      return html`<${Estado} f=${f} projetar=${projetar} u=${u} valor=${v} t=${maximo > minimo ? (v - minimo) / (maximo - minimo) : 0.5} selecionado=${uf === u.uf} aoEscolher=${aoEscolher} />`; })}
  </svg><${LegendaViridis} minimo=${minimo} maximo=${maximo} rotulo=${rotulo} /></div>`;
}

export function SeletorDeUf({ ufs, uf, aoEscolher }) {
  return html`<label class="field seletor-uf">Estado
    <select value=${uf || ''} onChange=${e => aoEscolher(e.target.value || null)}><option value="">Brasil inteiro</option>
      ${[...ufs].sort((a, b) => nomeDaUf(a.uf).localeCompare(nomeDaUf(b.uf), 'pt-BR')).map(u => html`<option value=${u.uf}>${nomeDaUf(u.uf)} (${siglaDaUf(u.uf)})</option>`)}</select></label>`;
}
