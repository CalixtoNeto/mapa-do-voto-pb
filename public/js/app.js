// Interface: Preact + htm, mapa em Canvas 2D.
// startApp é chamado por main.js depois que a malha é carregada; AN são as análises (js/analises.mjs).
function startApp(TOPO, AN) {
const { html, render, useState, useEffect, useMemo, useRef } = htmPreact;
const NORM = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
const UF = 'PB', UF_NOME = 'Paraíba', N_MUN = 223;

// ---------- Geometria (malha IBGE simplificada) ----------
const OBJ = Object.values(TOPO.objects)[0];
const FC = topojson.feature(TOPO, OBJ);
const K = Math.cos(-7.12 * Math.PI / 180);
const proj = ([lon, lat]) => [lon * K, -lat];
const MUNIS = FC.features.map(f => {
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  const path = new Path2D();
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, best = null, bestA = 0;
  for (const poly of polys) {
    poly.forEach((ring, ri) => {
      let a = 0, cx = 0, cy = 0;
      const pts = ring.map(proj);
      pts.forEach(([x, y], i) => {
        if (i) path.lineTo(x, y); else path.moveTo(x, y);
        if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y;
        const [nx, ny] = pts[(i + 1) % pts.length];
        const cr = x * ny - nx * y; a += cr; cx += (x + nx) * cr; cy += (y + ny) * cr;
      });
      path.closePath();
      if (ri === 0 && Math.abs(a) > bestA) { bestA = Math.abs(a); best = [cx / (3 * a), cy / (3 * a)]; }
    });
  }
  return { id: String(f.properties.id), name: f.properties.name, path, bb: [x0, y0, x1, y1], c: best || [(x0 + x1) / 2, (y0 + y1) / 2] };
}).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
const BYID = Object.fromEntries(MUNIS.map(m => [m.id, m]));
const BB = MUNIS.reduce((b, m) => [Math.min(b[0], m.bb[0]), Math.min(b[1], m.bb[1]), Math.max(b[2], m.bb[2]), Math.max(b[3], m.bb[3])], [Infinity, Infinity, -Infinity, -Infinity]);
const HIT = document.createElement('canvas').getContext('2d');
function hitTest(bx, by) {
  for (const m of MUNIS) {
    const b = m.bb; if (bx < b[0] || bx > b[2] || by < b[1] || by > b[3]) continue;
    if (HIT.isPointInPath(m.path, bx, by, 'evenodd')) return m.id;
  }
  return null;
}

// ---------- Formatação ----------
const nf = new Intl.NumberFormat('pt-BR');
const pct = (v, d = 2) => (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: d === 2 ? 1 : d, maximumFractionDigits: d }) + '%';
const LOWER = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'di', 'du']);
const titleCase = s => String(s || '').toLowerCase().split(/\s+/).map((w, i) => (i && LOWER.has(w)) ? w : w.replace(/^(\p{L})/u, c => c.toUpperCase())).join(' ');
const sentence = s => { s = String(s || '').toLowerCase(); return s.charAt(0).toUpperCase() + s.slice(1); };
const cargoLabel = s => sentence(s);
// Nome de escola/local: título em caixa mista, mas siglas (EMEF, E.E.E.F.M., CRAS…) continuam em maiúsculas
const SIGLAS = new Set(['EMEF', 'EEEF', 'EEEFM', 'EMEB', 'EMEI', 'ECI', 'CRAS', 'SENAI', 'SESI', 'CAIC', 'APAE', 'UFPB', 'IFPB', 'UEPB', 'CEF', 'EEEM']);
const localNome = s => String(s || '').split(/\s+/).map((w, i) => (SIGLAS.has(w) || w.includes('.') && w.length <= 10) ? w : titleCase(w).replace(/^(de|da|do|das|dos|e)$/i, m => i ? m.toLowerCase() : titleCase(m))).join(' ');
const sitLabel = s => (!s || /^#/.test(s)) ? '' : sentence(s).replace(/ qp$/i, ' QP').replace(/ media$/i, ' média');
const CARGO_ORDER = { '6': 0, '7': 1, '8': 2, '5': 3, '3': 4, '1': 5, '11': 6, '13': 7 };

// ---------- Armazenamento local ----------
const ls = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } } };

// ---------- Visão de um candidato ----------
function buildView(ds, cand) {
  const tk = cand.ano + '|' + cand.turno + '|' + cand.cargo;
  const tot = ds.tot[tk] || {};
  const rivals = ds.cands.filter(c => c.ano === cand.ano && c.turno === cand.turno && c.cargo === cand.cargo);
  const rank = {};
  for (const id in cand.mun) { const v = cand.mun[id]; if (!v) continue; let r = 1; for (const c of rivals) if ((c.mun[id] || 0) > v) r++; rank[id] = r; }
  const sorted = rivals.map(c => c.total).sort((a, b) => b - a);
  return {
    id: [cand.ano, cand.turno, cand.cargo, cand.nr].join('-'), ano: cand.ano, turno: cand.turno, cargo: cand.cargo, cargoNome: cand.cargoNome,
    nr: cand.nr, urna: cand.urna, nome: cand.nome, partido: cand.partido, sit: cand.sit, total: cand.total,
    posicao: sorted.indexOf(cand.total) + 1, nCands: rivals.length, votos: cand.mun, tot, rank,
  };
}

function quantBreaks(vals) {
  const a = vals.filter(v => v > 0).sort((x, y) => x - y);
  if (!a.length) return { b: [], min: 0, max: 0 };
  const b = [];
  for (let i = 1; i < 6; i++) { const q = a[Math.floor(i * a.length / 6)]; if (q > a[0] && (!b.length || q > b[b.length - 1])) b.push(q); }
  return { b, min: a[0], max: a[a.length - 1] };
}
const classOf = (v, b) => { if (!(v > 0)) return -1; let i = 0; while (i < b.length && v >= b[i]) i++; return i; };
const rampIndex = (cls, n) => n <= 1 ? 5 : Math.round(cls * 5 / (n - 1));

// ---------- Comparação entre eleições ----------
const CARGO_NOMES = { '1': 'Presidente', '3': 'Governador', '5': 'Senador', '6': 'Deputado federal', '7': 'Deputado estadual', '13': 'Vereador' };
const LIM_VAR = [0.05, 0.01];   // 5 e 1 ponto percentual da parcela de votos do município
const LIM_REL = [0.25, 0.05];   // 25% e 5% de variação nos votos
const binRel = r => r === Infinity ? 4 : r < -LIM_REL[0] ? 0 : r < -LIM_REL[1] ? 1 : r <= LIM_REL[1] ? 2 : r <= LIM_REL[0] ? 3 : 4;
const binVar = d => d < -LIM_VAR[0] ? 0 : d < -LIM_VAR[1] ? 1 : d <= LIM_VAR[1] ? 2 : d <= LIM_VAR[0] ? 3 : 4;
const pp = d => (d >= 0 ? '+' : '−') + Math.abs(d * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' p.p.';
const dv = d => (d > 0 ? '+' : d < 0 ? '−' : '') + nf.format(Math.abs(d));
// Comparar cargos (ou turnos) diferentes distorce os números; o site avisa.
const avisoComparacao = ({ ant, rec }) => ant.cargo !== rec.cargo
  ? `Atenção: esta é uma comparação entre cargos diferentes (${sentence(ant.cargoNome)} em ${ant.ano} e ${sentence(rec.cargoNome)} em ${rec.ano}). Isso gera distorções: mudam o tipo de disputa, o número de candidatos e de votos por eleitor, então a variação não mede, por si só, crescimento ou queda de apoio. O ideal é comparar o mesmo cargo.`
  : ant.turno !== rec.turno
    ? `Atenção: você está comparando turnos diferentes (${ant.turno}º e ${rec.turno}º). No 2º turno restam poucos candidatos e os votos se redistribuem, o que gera distorções. O ideal é comparar o mesmo turno.`
    : '';
// ---------- Análises: como este site identifica candidatos e lugares ----------
const CFG = {
  chaveDe: c => c.key.split('|')[3], votosDe: c => c.mun, totDe: (ds, c) => ds.tot[c.ano + '|' + c.turno + '|' + c.cargo] || {},
  lugares: () => MUNIS.map(m => m.id), lugarNome: 'município', lugaresNome: 'municípios', regiao: 'na Paraíba',
  foraDasFinancas: c => c.cargo === '1' ? 'A campanha de presidente é nacional e a prestação de contas dela não entra neste site: os votos aqui são só os da Paraíba.' : '',
  ehMajoritario: c => c.cargo === '3' || c.cargo === '5',
  cargoPar: { '6': '7', '7': '6', '3': '5', '5': '3' }, nomeDoCargo: CARGO_NOMES,
};
const PAINEL = AN.criarPainelDoCandidato(CFG), Panorama = AN.criarPanorama(CFG);
const CAMADAS = [['vencedor', 'Quem venceu'], ['abstencao', 'Abstenção'], ['brancos', 'Brancos'], ['nulos', 'Nulos']];
const lerJson = async u => { const r = await fetch(u, { cache: 'no-cache' }); if (!r.ok) throw new Error(u); return r.json(); };

// ---------- Mapa (Canvas 2D) ----------
function MapCanvas({ view, metric, selected, onSelect, hover, onHover, classes, modoVar }) {
  const wrap = useRef(), cv = useRef();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [, force] = useState(0);
  const tf = useRef({ s: 1, ox: 0, oy: 0, s0: 1, z: 1 });
  const ptrs = useRef(new Map()), gesture = useRef(null);
  const props = useRef({}); props.current = { view, metric, selected, hover, classes, modoVar };

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => {
      const w = Math.round(e.contentRect.width);
      const h = Math.round(Math.max(220, Math.min(w * 0.62, (window.innerWidth >= 960 ? window.innerHeight * 0.66 : w * 0.7))));
      setSize(s => (s.w === w && s.h === h) ? s : { w, h });
    });
    ro.observe(wrap.current);
    const mq = matchMedia('(prefers-color-scheme: dark)'); const t = () => force(x => x + 1);
    mq.addEventListener && mq.addEventListener('change', t);
    return () => { ro.disconnect(); mq.removeEventListener && mq.removeEventListener('change', t); };
  }, []);

  const fit = () => {
    const { w, h } = size; const pad = w < 500 ? 10 : 22;
    const s0 = Math.min((w - 2 * pad) / (BB[2] - BB[0]), (h - 2 * pad) / (BB[3] - BB[1]));
    tf.current = { s0, z: 1, s: s0, ox: (w - (BB[2] - BB[0]) * s0) / 2, oy: (h - (BB[3] - BB[1]) * s0) / 2 };
  };
  useEffect(() => { if (size.w) { fit(); draw(); } }, [size.w, size.h]);
  useEffect(() => { draw(); });

  function draw() {
    const c = cv.current; if (!c || !size.w) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    if (c.width !== size.w * dpr) { c.width = size.w * dpr; c.height = size.h * dpr; }
    const ctx = c.getContext('2d');
    const css = getComputedStyle(document.documentElement);
    const v = n => css.getPropertyValue(n).trim();
    const ramp = [0, 1, 2, 3, 4, 5].map(i => v('--r' + i)), zero = v('--zero'), edge = v('--edge'), ink = v('--ink'), accent = v('--accent'), paper = v('--map-bg'), halo = v('--halo');
    const div = [0, 1, 2, 3, 4].map(i => v('--d' + i));
    const { view, metric, selected, hover, classes, modoVar } = props.current;
    const { s, ox, oy } = tf.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, size.w, size.h);
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * (ox - BB[0] * s), dpr * (oy - BB[1] * s));
    const n = classes ? classes.b.length + 1 : 0;
    for (const m of MUNIS) {
      let fill = zero;
      if (view && view.cor) { const k = view.cor[m.id]; if (k != null) fill = v('--s' + k); }
      else if (view && modoVar) { if ((view.votos[m.id] || 0) > 0) fill = div[modoVar === 'pp' ? binVar(view.var[m.id] || 0) : binRel(view.rel[m.id] || 0)]; }
      else if (view) { const val = metricOf(view, m.id, metric); const cl = classOf(val, classes.b); if (cl >= 0) fill = ramp[rampIndex(cl, n)]; }
      ctx.fillStyle = fill; ctx.fill(m.path, 'evenodd');
    }
    ctx.strokeStyle = edge; ctx.lineWidth = 0.6 / s; ctx.lineJoin = 'round';
    for (const m of MUNIS) ctx.stroke(m.path);
    if (hover && hover !== selected && BYID[hover]) { ctx.strokeStyle = ink; ctx.lineWidth = 1.6 / s; ctx.stroke(BYID[hover].path); }
    if (selected && BYID[selected]) { ctx.strokeStyle = halo; ctx.lineWidth = 5 / s; ctx.stroke(BYID[selected].path); ctx.strokeStyle = accent; ctx.lineWidth = 2.2 / s; ctx.stroke(BYID[selected].path); }
    // rótulos
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const labels = [];
    if (view) Object.entries(view.votos).sort((a, b) => b[1] - a[1]).slice(0, size.w < 500 ? 2 : 4).forEach(([id]) => labels.push(id));
    if (selected && !labels.includes(selected)) labels.unshift(selected);
    const boxes = [];
    ctx.font = `600 ${size.w < 500 ? 11.5 : 13}px Geist, system-ui, sans-serif`; ctx.textBaseline = 'middle';
    for (const id of labels) {
      const m = BYID[id]; if (!m) continue;
      const x = ox + (m.c[0] - BB[0]) * s, y = oy + (m.c[1] - BB[1]) * s;
      const tw = ctx.measureText(m.name).width; let tx = x + 7; if (tx + tw > size.w - 4) tx = x - 7 - tw;
      const box = [tx - 3, y - 9, tx + tw + 3, y + 9];
      if (id !== selected && boxes.some(b => !(box[2] < b[0] || box[0] > b[2] || box[3] < b[1] || box[1] > b[3]))) continue;
      boxes.push(box);
      ctx.fillStyle = id === selected ? accent : ink; ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill();
      ctx.lineWidth = 3.5; ctx.strokeStyle = paper; ctx.strokeText(m.name, tx, y); ctx.fillStyle = ink; ctx.fillText(m.name, tx, y);
    }
  }

  const local = e => { const r = cv.current.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const pick = (x, y) => { const { s, ox, oy } = tf.current; return hitTest((x - ox) / s + BB[0], (y - oy) / s + BB[1]); };
  const zoomAt = (f, cx, cy) => {
    const t = tf.current; const z = Math.max(1, Math.min(14, t.z * f)); f = z / t.z;
    t.ox = cx - (cx - t.ox) * f; t.oy = cy - (cy - t.oy) * f; t.z = z; t.s = t.s0 * z;
    if (z === 1) fit(); clamp(); force(x => x + 1);
  };
  const clamp = () => {
    const t = tf.current; const w = (BB[2] - BB[0]) * t.s, h = (BB[3] - BB[1]) * t.s;
    t.ox = Math.min(size.w * 0.6, Math.max(size.w * 0.4 - w, t.ox)); t.oy = Math.min(size.h * 0.6, Math.max(size.h * 0.4 - h, t.oy));
  };
  const onDown = e => {
    cv.current.setPointerCapture && cv.current.setPointerCapture(e.pointerId);
    ptrs.current.set(e.pointerId, local(e));
    if (ptrs.current.size === 1) gesture.current = { start: local(e), moved: false, last: local(e) };
    else if (ptrs.current.size === 2) { const [a, b] = [...ptrs.current.values()]; gesture.current = { pinch: Math.hypot(a[0] - b[0], a[1] - b[1]), moved: true }; }
  };
  const onMove = e => {
    const p = local(e);
    if (!ptrs.current.has(e.pointerId)) { if (e.pointerType === 'mouse') { const id = pick(...p); if (id !== props.current.hover) onHover(id); } return; }
    ptrs.current.set(e.pointerId, p); const g = gesture.current; if (!g) return;
    if (ptrs.current.size === 2 && g.pinch) {
      const [a, b] = [...ptrs.current.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      zoomAt(d / g.pinch, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); g.pinch = d; return;
    }
    if (!g.moved && Math.hypot(p[0] - g.start[0], p[1] - g.start[1]) > 6) g.moved = true;
    if (g.moved && tf.current.z > 1) { const t = tf.current; t.ox += p[0] - g.last[0]; t.oy += p[1] - g.last[1]; clamp(); force(x => x + 1); }
    g.last = p;
  };
  const onUp = e => {
    const g = gesture.current; const had = ptrs.current.has(e.pointerId); ptrs.current.delete(e.pointerId);
    if (had && g && !g.moved && ptrs.current.size === 0) { const id = pick(...local(e)); onSelect(id && id === props.current.selected ? null : id); }
    if (ptrs.current.size === 0) gesture.current = null;
  };
  const onWheel = e => { if (!(e.ctrlKey || e.metaKey)) return; e.preventDefault(); zoomAt(Math.exp(-e.deltaY * 0.01), ...local(e)); };
  useEffect(() => { const c = cv.current; c.addEventListener('wheel', onWheel, { passive: false }); return () => c.removeEventListener('wheel', onWheel); });

  const zoomed = tf.current.z > 1.001;
  return html`<div class="map" ref=${wrap}>
    <canvas ref=${cv} style=${`width:${size.w}px;height:${size.h}px;touch-action:${zoomed ? 'none' : 'pan-y'}`}
      role="img" aria-label=${view && view.rotulo ? view.rotulo : view ? `Mapa de votos de ${titleCase(view.urna)} por município da ${UF_NOME}` : `Mapa dos municípios da ${UF_NOME}`}
      onPointerDown=${onDown} onPointerMove=${onMove} onPointerUp=${onUp} onPointerCancel=${onUp}
      onPointerLeave=${e => { if (e.pointerType === 'mouse') onHover(null); }}
      onDblClick=${e => zoomAt(2, ...local(e))}></canvas>
    ${view && html`<div class="zoom" role="group" aria-label="Zoom do mapa">
      <button type="button" aria-label="Aproximar" onClick=${() => zoomAt(1.6, size.w / 2, size.h / 2)}>+</button>
      <button type="button" aria-label="Afastar" onClick=${() => zoomAt(1 / 1.6, size.w / 2, size.h / 2)}>−</button>
      ${zoomed && html`<button type="button" class="wide" onClick=${() => { fit(); force(x => x + 1); }}>Ver estado</button>`}
    </div>`}
  </div>`;
}
const metricOf = (view, id, metric) => { const v = view.votos[id] || 0; if (metric === 'votos') return v; const t = view.tot[id] || 0; return t ? v / t : 0; };

// ---------- Componentes ----------
function Legend({ classes, metric, setMetric, view, modoVar, varModo, setVarModo }) {
  if (modoVar) {
    const rel = modoVar === 'rel';
    const itens = rel ? ['Perdeu mais de 25% dos votos', 'Perdeu de 5% a 25%', 'Estável (até 5%)', 'Ganhou de 5% a 25%', 'Ganhou mais de 25% (ou veio de zero)']
      : ['Perdeu mais de 5 p.p.', 'Perdeu de 1 a 5 p.p.', 'Estável (até 1 p.p.)', 'Ganhou de 1 a 5 p.p.', 'Ganhou mais de 5 p.p.'];
    return html`<div class="legend">
      <div class="seg" role="radiogroup" aria-label="Cor da comparação">
        <button type="button" role="radio" aria-checked=${rel} onClick=${() => setVarModo('rel')}>Cor: votos (%)</button>
        <button type="button" role="radio" aria-checked=${!rel} onClick=${() => setVarModo('pp')}>Cor: parcela (p.p.)</button>
      </div>
      <ul>${itens.map((t, i) => html`<li><i style=${`background:var(--d${i})`}></i>${t}</li>`)}<li><i style="background:var(--zero)"></i>Sem votos nas duas</li></ul>
      <p class="hint">${rel ? 'A cor mostra quanto os votos do candidato cresceram ou caíram entre as duas eleições.' : 'A cor mostra a mudança da parcela dos votos do município entre as duas eleições. Entre cargos diferentes ela pode enganar: por exemplo, em anos de dois senadores cada eleitor tem dois votos.'} O tamanho do círculo é o maior número de votos do candidato no município entre as duas.</p>
    </div>`;
  }
  const n = classes ? classes.b.length + 1 : 0;
  const fmt = v => metric === 'votos' ? nf.format(v) : pct(v, 1);
  const items = [];
  if (view && n) for (let i = 0; i < n; i++) {
    const lo = i === 0 ? classes.min : classes.b[i - 1];
    const hi = i === n - 1 ? classes.max : (metric === 'votos' ? classes.b[i] - 1 : classes.b[i]);
    items.push(html`<li><i style=${`background:var(--r${rampIndex(i, n)})`}></i>${lo === hi ? fmt(lo) : `${fmt(lo)}–${fmt(hi)}`}</li>`);
  }
  return html`<div class="legend">
    <div class="seg" role="radiogroup" aria-label="Medida do mapa">
      <button type="button" role="radio" aria-checked=${metric === 'votos'} onClick=${() => setMetric('votos')}>Votos</button>
      <button type="button" role="radio" aria-checked=${metric === 'pct'} onClick=${() => setMetric('pct')}>% no município</button>
    </div>
    ${view && html`<ul>${items}<li><i style="background:var(--zero)"></i>Sem votos</li></ul>`}
  </div>`;
}

// Votos por local de votação: o arquivo da eleição (ANO-tTURNO-locais.json) é baixado ao clicar num município
function MuniCard({ view, id, pinned, onClear, det, linha }) {
  if (!view || !id) return html`<p class="hint">${view ? 'Toque ou clique num município para ver os números.' : ''}</p>`;
  const m = BYID[id]; const v = view.votos[id] || 0, t = view.tot[id] || 0, r = view.rank && view.rank[id];
  const dados = det && det.dados;
  const locs = dados && dados.locais[id];
  const votos = (dados && dados.votos[view.cargo + '|' + view.nr] || {})[id] || {};
  const rows = locs ? locs.map((l, i) => ({ n: l.n, v: votos[i] || 0 })).sort((a, b) => b.v - a.v || a.n.localeCompare(b.n, 'pt-BR')) : [];
  const max = Math.max(1, ...rows.map(x => x.v));
  return html`<div class=${'muni' + (pinned ? ' pinned' : '')} aria-live="polite">
    <div class="muni-head"><h3>${m.name}</h3>${pinned && html`<button type="button" class="link" onClick=${onClear}>Fechar</button>`}</div>
    <dl>
      <div><dt>Votos</dt><dd>${nf.format(v)}</dd></div>
      <div><dt>Dos votos nominais do cargo</dt><dd>${t ? pct(v / t) : '—'}</dd></div>
      <div><dt>Posição no município</dt><dd>${r ? `${r}º` : '—'}</dd></div>
    </dl>
    ${linha && html`<dl class="cmp-dl">
      <div><dt>Votos ${linha.ant.ano} → ${linha.rec.ano}</dt><dd>${nf.format(linha.vAnt)} → ${nf.format(linha.vRec)}</dd></div>
      <div><dt>Variação de votos</dt><dd class=${linha.d > 0 ? 'up' : linha.d < 0 ? 'down' : ''}>${dv(linha.d)}</dd></div>
      <div><dt>Parcela no município</dt><dd class=${linha.dp > 0 ? 'up' : linha.dp < 0 ? 'down' : ''}>${pp(linha.dp)}</dd></div>
    </dl>`}
    ${det && det.estado === 'carregando' && html`<p class="hint">Carregando os locais de votação…</p>`}
    ${det && det.estado === 'ok' && (rows.length ? html`<h4 class="locais-h">Votos por local de votação</h4>
        <ul class="locais" aria-label="Votos por local de votação">
          ${rows.map(x => html`<li><span class="ln">${localNome(x.n)}</span><span class="lv">${nf.format(x.v)}</span>
            <span class="bar" aria-hidden="true"><i style=${`width:${(x.v / max * 100).toFixed(1)}%`}></i></span></li>`)}
        </ul>`
      : html`<p class="hint">Sem detalhe por local de votação para este candidato neste município.</p>`)}
    ${det && det.estado === 'indisponivel' && pinned && html`<p class="hint">O detalhe por local de votação não está disponível para esta eleição.</p>`}
  </div>`;
}

// Votos do mesmo candidato em todas as eleições em que ele aparece
function Trajetoria({ entradas, view, comp, onComparar, onSair }) {
  const lista = [...entradas].sort((a, b) => a.ano - b.ano || a.turno - b.turno);
  const max = Math.max(1, ...lista.map(e => e.total));
  const igual = (e, o) => o && e.ano === o.ano && e.turno === o.turno && e.cargo === o.cargo && e.nr === o.nr;
  return html`<section class="traj" aria-labelledby="tj">
    <div class="rk-head"><h2 id="tj">Evolução do candidato</h2>${comp && html`<button type="button" class="link" onClick=${onSair}>Sair da comparação</button>`}</div>
    <ul>${lista.map(e => { const atual = igual(e, view), em = igual(e, comp);
      return html`<li key=${e.ano + e.turno + e.cargo} class=${em ? 'em' : ''}>
        <div class="tl"><span class="ty">${e.ano}${e.turno !== '1' ? ' · 2º turno' : ''}</span><span class="tc">${CARGO_NOMES[e.cargo] || e.cargo}</span>
          <span class="tv">${nf.format(e.total)}</span><span class="tp">${pct(e.pct, 1)} · ${e.pos}º</span>
          ${atual ? html`<span class="tag">no mapa</span>` : html`<button type="button" class="btn ghost" aria-pressed=${em} onClick=${() => onComparar(e)}>${em ? 'Comparando' : e.cargo !== view.cargo ? 'Comparar (outro cargo)' : e.turno !== view.turno ? 'Comparar (outro turno)' : 'Comparar'}</button>`}</div>
        <span class="bar" aria-hidden="true"><i style=${`width:${(e.total / max * 100).toFixed(1)}%`}></i></span></li>`; })}
    </ul>
    <p class="hint">Votos na ${UF_NOME}, parcela dos votos nominais do cargo e posição entre os candidatos do estado.</p>
  </section>`;
}

function ComparaStats({ cmp }) {
  const { ant, rec, rows } = cmp; const d = rec.total - ant.total, rel = ant.total ? d / ant.total : null;
  const rot = v => `${v.ano} · ${sentence(v.cargoNome)}`;
  return html`<dl class="stats">
    <div><dt>Votos em ${rot(ant)}</dt><dd>${nf.format(ant.total)}</dd></div>
    <div><dt>Votos em ${rot(rec)}</dt><dd>${nf.format(rec.total)}</dd></div>
    <div><dt>Variação de votos</dt><dd class=${d > 0 ? 'up' : d < 0 ? 'down' : ''}>${dv(d)}${rel != null ? ` (${rel >= 0 ? '+' : '−'}${pct(Math.abs(rel), 1)})` : ''}</dd></div>
    <div><dt>Municípios que cresceram / caíram</dt><dd>${rows.filter(r => r.d > 0).length} / ${rows.filter(r => r.d < 0).length}</dd></div>
  </dl>`;
}

function ComparaRanking({ cmp, selected, onSelect }) {
  const [sort, setSort] = useState('ganho'), [q, setQ] = useState('');
  const rows = useMemo(() => {
    const r = cmp.rows.map(x => ({ ...x }));
    if (sort === 'ganho') r.sort((a, b) => b.d - a.d || a.name.localeCompare(b.name)); else if (sort === 'perda') r.sort((a, b) => a.d - b.d || a.name.localeCompare(b.name));
    else if (sort === 'pp') r.sort((a, b) => b.dp - a.dp); else r.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    const nq = NORM(q); return nq ? r.filter(x => NORM(x.name).includes(nq)) : r;
  }, [cmp, sort, q]);
  return html`<section class="ranking cmp" aria-labelledby="rk">
    <div class="rk-head">
      <h2 id="rk">Municípios: ${cmp.ant.ano} → ${cmp.rec.ano}</h2>
      <select aria-label="Ordenar municípios" value=${sort} onChange=${e => setSort(e.target.value)}>
        <option value="ganho">Maior ganho de votos</option><option value="perda">Maior perda de votos</option><option value="pp">Maior ganho em p.p.</option><option value="nome">Nome</option>
      </select>
    </div>
    <input type="search" class="filter" placeholder="Buscar município" value=${q} onInput=${e => setQ(e.target.value)} aria-label="Buscar município" />
    <ol>
      ${rows.map(x => html`<li key=${x.id} class=${x.id === selected ? 'on' : ''}>
        <button type="button" onClick=${() => onSelect(x.id)}>
          <span class="nm">${x.name}</span>
          <span class="vv">${nf.format(x.vAnt)} → ${nf.format(x.vRec)}</span>
          <span class=${'dd ' + (x.d > 0 ? 'up' : x.d < 0 ? 'down' : '')}>${x.d ? dv(x.d) : '0'}</span>
          <span class=${'pv ' + (x.dp > 0.00005 ? 'up' : x.dp < -0.00005 ? 'down' : '')}>${pp(x.dp)}</span>
        </button></li>`)}
    </ol>
  </section>`;
}

function CandidatePicker({ cands, value, onPick }) {
  const [q, setQ] = useState(''); const [open, setOpen] = useState(false);
  const list = useMemo(() => {
    const nq = NORM(q);
    const r = nq ? cands.filter(c => NORM(c.urna + ' ' + c.nome + ' ' + c.nr + ' ' + c.partido).includes(nq)) : cands;
    return r.slice(0, 40);
  }, [q, cands]);
  const cur = cands.find(c => c.key === value);
  return html`<div class="picker">
    <label for="cand">Candidato</label>
    <input id="cand" type="search" autocomplete="off" placeholder=${cur ? `${titleCase(cur.urna)} (${cur.nr})` : 'Nome de urna, número ou partido'}
      value=${q} onInput=${e => { setQ(e.target.value); setOpen(true); }} onFocus=${() => setOpen(true)}
      onKeyDown=${e => { if (e.key === 'Escape') setOpen(false); if (e.key === 'Enter' && list[0]) { onPick(list[0].key); setQ(''); setOpen(false); e.target.blur(); } }} />
    ${open && html`<ul class="results" role="listbox">
      ${list.map(c => html`<li role="option" aria-selected=${c.key === value}>
        <button type="button" onMouseDown=${e => e.preventDefault()} onClick=${() => { onPick(c.key); setQ(''); setOpen(false); document.activeElement && document.activeElement.blur(); }}>
          <span class="n">${titleCase(c.urna)}</span><span class="meta">${c.nr} · ${c.partido}</span><span class="v">${nf.format(c.total)}</span>
        </button></li>`)}
      ${!list.length && html`<li class="empty">Nenhum candidato com “${q}”.</li>`}
    </ul>`}
    ${open && html`<button type="button" class="link close-list" onClick=${() => setOpen(false)}>Fechar lista</button>`}
  </div>`;
}

function Ranking({ view, metric, selected, onSelect }) {
  const [sort, setSort] = useState('votos'); const [q, setQ] = useState('');
  useEffect(() => setSort(metric), [metric]);
  const rows = useMemo(() => {
    if (!view) return [];
    let r = MUNIS.map(m => ({ id: m.id, name: m.name, v: view.votos[m.id] || 0, p: metricOf(view, m.id, 'pct'), rk: view.rank ? view.rank[m.id] : null }));
    if (sort === 'votos') r.sort((a, b) => b.v - a.v || a.name.localeCompare(b.name)); else if (sort === 'pct') r.sort((a, b) => b.p - a.p || b.v - a.v); else r.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    r.forEach((x, i) => x.pos = i + 1);
    const nq = NORM(q); return nq ? r.filter(x => NORM(x.name).includes(nq)) : r;
  }, [view, sort, q]);
  if (!view) return null;
  const max = Math.max(1, ...MUNIS.map(m => sort === 'pct' ? metricOf(view, m.id, 'pct') : (view.votos[m.id] || 0)));
  return html`<section class="ranking" aria-labelledby="rk">
    <div class="rk-head">
      <h2 id="rk">Municípios</h2>
      <select aria-label="Ordenar municípios" value=${sort} onChange=${e => setSort(e.target.value)}>
        <option value="votos">Mais votos</option><option value="pct">Maior percentual</option><option value="nome">Nome</option>
      </select>
    </div>
    <input type="search" class="filter" placeholder="Buscar município" value=${q} onInput=${e => setQ(e.target.value)} aria-label="Buscar município" />
    <ol>
      ${rows.map(x => html`<li key=${x.id} class=${x.id === selected ? 'on' : ''}>
        <button type="button" onClick=${() => onSelect(x.id)}>
          <span class="pos">${sort === 'nome' ? '' : x.pos}</span>
          <span class="nm">${x.name}</span>
          <span class="vv">${nf.format(x.v)}</span>
          <span class="pp">${x.v ? pct(x.p) : '—'}</span>
          <span class="bar" aria-hidden="true"><i style=${`width:${((sort === 'pct' ? x.p : x.v) / max * 100).toFixed(1)}%`}></i></span>
        </button></li>`)}
    </ol>
  </section>`;
}

function Stats({ view }) {
  if (!view) return null;
  const ids = Object.keys(view.votos).filter(id => view.votos[id] > 0);
  const totCargo = Object.values(view.tot).reduce((a, b) => a + b, 0);
  const top = ids.sort((a, b) => view.votos[b] - view.votos[a]);
  const top10 = top.slice(0, 10).reduce((a, id) => a + view.votos[id], 0);
  return html`<dl class="stats">
    <div><dt>Votos no estado</dt><dd>${nf.format(view.total)}</dd></div>
    <div><dt>Dos votos nominais para ${cargoLabel(view.cargoNome).toLowerCase()}</dt><dd>${totCargo ? pct(view.total / totCargo) : '—'}</dd></div>
    <div><dt>Municípios com voto</dt><dd>${ids.length} de ${N_MUN}</dd></div>
    <div><dt>Peso dos 10 maiores redutos</dt><dd>${view.total ? pct(top10 / view.total, 1) : '—'}</dd></div>
  </dl>`;
}

function Fonte({ item }) {
  if (!item) return null;
  const quando = item.atualizadoEm && item.fonte === 'api' ? new Date(item.atualizadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';
  return html`<section class="source compact">
    <p>${item.fonte === 'api'
      ? html`<strong>API de resultados do TSE</strong> · ${item.final ? 'apuração concluída' : 'apuração em andamento'}${quando ? ` · atualizado em ${quando}` : ''}`
      : html`<strong>Dados Abertos do TSE</strong> · votação nominal por município e zona${item.fonte === 'csv+api' ? ' · completado com a API de resultados' : ''} · ${item.final ? 'resultado final' : 'resultado parcial'}`}</p>
  </section>`;
}

// ---------- Panorama do cargo: mapa de quem venceu e do comparecimento ----------
function LegendaPanorama({ camada, setCamada, classes, vence, nomeDe, temComparecimento }) {
  const seg = html`<div class="seg rolavel" role="radiogroup" aria-label="O que o mapa mostra">
    ${CAMADAS.map(([id, nome]) => html`<button type="button" role="radio" aria-checked=${camada === id} onClick=${() => setCamada(id)}>${nome}</button>`)}</div>`;
  if (camada === 'vencedor') {
    const outros = vence.contagem.slice(3);
    return html`<div class="legend">${seg}<ul>
      ${vence.contagem.slice(0, 3).map(([k, n], i) => html`<li><i style=${`background:var(--s${i + 1})`}></i>${nomeDe(k)} · ${n} ${n === 1 ? 'município' : 'municípios'}</li>`)}
      ${outros.length > 0 && html`<li><i style="background:var(--s0)"></i>Outros ${outros.length} candidatos · ${outros.reduce((s, [, n]) => s + n, 0)} municípios</li>`}</ul>
      <p class="hint">Cor do candidato mais votado em cada município, neste cargo e turno.</p></div>`;
  }
  if (!temComparecimento) return html`<div class="legend">${seg}<p class="hint">O comparecimento desta eleição ainda não foi gerado para o site.</p></div>`;
  const n = classes.b.length + 1, base = camada === 'abstencao' ? 'dos eleitores aptos' : 'de quem compareceu';
  return html`<div class="legend">${seg}<ul>${Array.from({ length: n }, (_, i) => {
      const lo = i === 0 ? classes.min : classes.b[i - 1], hi = i === n - 1 ? classes.max : classes.b[i];
      return html`<li><i style=${`background:var(--r${rampIndex(i, n)})`}></i>${pct(lo, 1)}–${pct(hi, 1)}</li>`; })}</ul>
    <p class="hint">${camada === 'abstencao' ? 'Abstenção' : camada === 'brancos' ? 'Votos brancos' : 'Votos nulos'} em % ${base}${camada !== 'abstencao' ? ', neste cargo' : ''}.</p></div>`;
}

function CardPanorama({ id, pinned, onClear, vence, cands, comp }) {
  if (!id) return html`<p class="hint">Toque ou clique num município para ver os números.</p>`;
  const c = cands.find(x => x.key === vence.porLugar[id]), n = comp && comp[id];
  const totalDoLugar = cands.reduce((s, x) => s + (x.mun[id] || 0), 0);
  return html`<div class=${'muni' + (pinned ? ' pinned' : '')} aria-live="polite">
    <div class="muni-head"><h3>${BYID[id].name}</h3>${pinned && html`<button type="button" class="link" onClick=${onClear}>Fechar</button>`}</div>
    ${c && html`<p class="hint">Venceu: <strong>${titleCase(c.urna)}</strong> (${c.partido}) com ${nf.format(c.mun[id])} votos, ${pct(c.mun[id] / totalDoLugar)} dos nominais.</p>`}
    ${n && html`<dl><div><dt>Abstenção</dt><dd>${pct((n[0] - n[1]) / n[0])}</dd></div>
      <div><dt>Brancos</dt><dd>${n[1] ? pct(n[2] / n[1]) : '—'}</dd></div><div><dt>Nulos</dt><dd>${n[1] ? pct(n[3] / n[1]) : '—'}</dd></div></dl>`}
  </div>`;
}

function StatsPanorama({ comp }) {
  if (!comp) return null;
  const s = AN.somaDoComparecimento(comp);
  return html`<dl class="stats">
    <div><dt>Eleitores aptos</dt><dd>${nf.format(s.aptos)}</dd></div>
    <div><dt>Abstenção</dt><dd>${pct(s.abstencao / s.aptos)}</dd></div>
    <div><dt>Brancos</dt><dd>${pct(s.brancos / s.comparecimento)}</dd></div>
    <div><dt>Nulos</dt><dd>${pct(s.nulos / s.comparecimento)}</dd></div>
  </dl>`;
}

const rotuloEleicao = e => `${e.ano} · ${e.turno}º turno${e.final ? '' : ' (parcial)'}`;

// ---------- App ----------
function App() {
  const [indice, setIndice] = useState(null), [erro, setErro] = useState('');
  const [eleicao, setEleicao] = useState(null), [cargo, setCargo] = useState(null), [candKey, setCandKey] = useState(null);
  const [ds, setDs] = useState(null), [carregando, setCarregando] = useState(false);
  const [locais, setLocais] = useState({});
  const [metric, setMetric] = useState(ls.get('mv.metric') || 'votos');
  const [selected, setSelected] = useState(null), [hover, setHover] = useState(null);
  const mapRef = useRef();
  const [pessoas, setPessoas] = useState({}), [comp, setComp] = useState(null), [dsB, setDsB] = useState(null);
  const [varModo, setVarModo] = useState(ls.get('mv.varmodo') || 'rel');
  const [modo, setModo] = useState(ls.get('mv.modo') || 'candidato'), [camada, setCamada] = useState('vencedor');
  useEffect(() => { ls.set('mv.modo', modo); }, [modo]);
  const indiceAnalises = AN.usarIndiceDasAnalises('data/eleicoes');
  useEffect(() => { ls.set('mv.varmodo', varModo); }, [varModo]);
  useEffect(() => { lerJson('data/eleicoes/pessoas.json').then(setPessoas).catch(() => { }); }, []);

  // lista as eleições sozinho, a partir do índice gerado junto com os dados (commitado)
  useEffect(() => {
    (async () => {
      const ler = async base => {
        try {
          const r = await fetch(base + '/index.json', { cache: 'no-cache' });
          if (!r.ok) return [];
          return ((await r.json()).eleicoes || []).map(e => ({ ...e, base, id: e.ano + '|' + e.turno }));
        } catch (e) { return []; }
      };
      const lista = (await ler('data/eleicoes')).sort((x, y) => (y.ano - x.ano) || (x.turno - y.turno));
      if (!lista.length) { setErro('Nenhuma eleição disponível ainda.'); return; }
      setIndice(lista);
      const last = ls.get('mv.last');
      setEleicao(last && lista.some(e => e.id === last.e) ? last.e : lista[0].id);
    })();
  }, []);

  const item = indice && indice.find(e => e.id === eleicao);
  useEffect(() => {
    if (!item) return;
    let vivo = true; setCarregando(true); setDs(null); setErro('');
    fetch(`${item.base}/${item.arquivo}`, { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { if (vivo) { setDs(d); setCarregando(false); } })
      .catch(() => { if (vivo) { setErro('Não foi possível carregar os dados desta eleição.'); setCarregando(false); } });
    return () => { vivo = false; };
  }, [item && item.base + item.arquivo]);

  const an = AN.usarAnalisesDaEleicao('data/eleicoes', indiceAnalises, item && item.ano, item && item.turno);
  const shown = hover || selected;
  // votos por local de votação: baixados só ao tocar num município
  useEffect(() => {
    if (!shown || !item || !item.locais || locais[item.id]) return;
    const id = item.id; setLocais(p => ({ ...p, [id]: { estado: 'carregando' } }));
    fetch(`${item.base}/${item.locais}`, { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => setLocais(p => ({ ...p, [id]: { estado: 'ok', dados: d } })))
      .catch(() => setLocais(p => ({ ...p, [id]: { estado: 'indisponivel' } })));
  }, [!!shown, item && item.id]);
  const det = !item ? null : (item.locais ? (locais[item.id] || null) : { estado: 'indisponivel' });

  const cargos = useMemo(() => {
    if (!ds) return [];
    const m = new Map(); ds.cands.forEach(c => m.set(c.cargo, c.cargoNome));
    return [...m].sort((a, b) => (CARGO_ORDER[a[0]] ?? 99) - (CARGO_ORDER[b[0]] ?? 99));
  }, [ds]);
  useEffect(() => {
    if (!cargos.length) return;
    const last = ls.get('mv.last');
    setCargo(c => cargos.some(x => x[0] === c) ? c : (last && cargos.some(x => x[0] === last.c) ? last.c : cargos[0][0]));
  }, [cargos]);
  const cands = useMemo(() => ds && cargo ? ds.cands.filter(c => c.cargo === cargo).sort((a, b) => b.total - a.total) : [], [ds, cargo]);
  useEffect(() => {
    if (!cands.length) return;
    const last = ls.get('mv.last');
    setCandKey(k => cands.some(c => c.key === k) ? k : (last && last.k && cands.some(c => c.key === last.k) ? last.k : null));
  }, [cands]);
  const view = useMemo(() => {
    const c = ds && cands.find(x => x.key === candKey);
    return c ? buildView(ds, c) : null;
  }, [ds, cands, candKey]);
  useEffect(() => { ls.set('mv.metric', metric); }, [metric]);
  useEffect(() => { if (eleicao && cargo) ls.set('mv.last', { e: eleicao, c: cargo, k: candKey }); }, [eleicao, cargo, candKey]);

  const classes = useMemo(() => view ? quantBreaks(MUNIS.map(m => metricOf(view, m.id, metric))) : null, [view, metric]);
  const linhasDoCargo = useMemo(() => an.financas ? AN.linhasFinanceiras(cands, an.financas, CFG.chaveDe) : [], [cands, an.financas]);

  // ---- panorama do cargo ----
  const panorama = modo === 'panorama' && !!ds && !!cargo;
  const compCargo = an.comparecimento && an.comparecimento.cargos[cargo];
  const vence = useMemo(() => {
    if (!panorama) return null;
    const v = AN.vencedores(cands, c => c.mun);
    return { ...v, cores: AN.coresDosVencedores(v.contagem) };
  }, [panorama, cands]);
  const viewPanorama = useMemo(() => {
    if (!panorama) return null;
    const tk = ds.ano + '|' + ds.turno + '|' + cargo, rotulo = `Mapa: ${CAMADAS.find(c => c[0] === camada)[1].toLowerCase()} por município da ${UF_NOME}`;
    if (camada === 'vencedor') return { rotulo, votos: ds.tot[tk] || {}, tot: {}, cor: Object.fromEntries(Object.entries(vence.porLugar).map(([id, k]) => [id, vence.cores[k]])) };
    const c = AN.camadaDoComparecimento(camada, compCargo);
    return { rotulo, votos: Object.fromEntries(Object.entries(c).map(([id, x]) => [id, x[0]])), tot: Object.fromEntries(Object.entries(c).map(([id, x]) => [id, x[1]])) };
  }, [panorama, ds, cargo, camada, vence, compCargo]);
  const classesPanorama = useMemo(() => viewPanorama && !viewPanorama.cor ? quantBreaks(MUNIS.map(m => metricOf(viewPanorama, m.id, 'pct'))) : null, [viewPanorama]);
  const escolher = c => { setCargo(c.cargo); setCandKey(c.key); setModo('candidato'); setSelected(null); setComp(null); };
  const nomeDoCand = k => { const c = cands.find(x => x.key === k); return c ? titleCase(c.urna) : ''; };

  // ---- comparação com outra eleição do mesmo candidato ----
  const entradas = useMemo(() => view ? (pessoas[NORM(view.nome || view.urna)] || []).map(([ano, turno, cargo, nr, total, pc, pos]) => ({ ano, turno, cargo, nr, total, pct: pc, pos })) : [], [view, pessoas]);
  useEffect(() => {
    setDsB(null); if (!comp) return;
    const alvo = indice && indice.find(e => e.id === comp.ano + '|' + comp.turno); if (!alvo) { setComp(null); return; }
    let vivo = true;
    lerJson(`${alvo.base}/${alvo.arquivo}`).then(d => { if (vivo) setDsB(d); }).catch(() => { if (vivo) setComp(null); });
    return () => { vivo = false; };
  }, [comp && comp.ano + comp.turno + comp.cargo + comp.nr]);
  const viewB = useMemo(() => {
    const c = dsB && comp && dsB.cands.find(x => x.cargo === comp.cargo && x.nr === comp.nr);
    return c ? buildView(dsB, c) : null;
  }, [dsB, comp]);
  const cmp = useMemo(() => {
    if (!view || !viewB) return null;
    const [ant, rec] = (viewB.ano + viewB.turno) < (view.ano + view.turno) ? [viewB, view] : [view, viewB];
    const rows = MUNIS.map(m => {
      const vA = ant.votos[m.id] || 0, vR = rec.votos[m.id] || 0, tA = ant.tot[m.id] || 0, tR = rec.tot[m.id] || 0;
      return { id: m.id, name: m.name, vAnt: vA, vRec: vR, d: vR - vA, dp: (tR ? vR / tR : 0) - (tA ? vA / tA : 0), v: Math.max(vA, vR), rel: vA ? (vR - vA) / vA : (vR ? Infinity : 0) };
    }).filter(r => r.vAnt || r.vRec);
    return { ant, rec, rows };
  }, [view, viewB]);
  const viewMapa = useMemo(() => cmp ? { urna: view.urna, votos: Object.fromEntries(cmp.rows.map(r => [r.id, r.v])), tot: {}, var: Object.fromEntries(cmp.rows.map(r => [r.id, r.dp])), rel: Object.fromEntries(cmp.rows.map(r => [r.id, r.rel])) } : view, [cmp, view]);
  const selectFromList = id => { setSelected(id); if (window.innerWidth < 960 && mapRef.current) mapRef.current.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); };
  const hasData = !!ds;
  const sitTxt = view && sitLabel(view.sit);

  return html`<div class=${'app' + (hasData ? '' : ' nodata')}>
    <header class="top">
      <p class="brand">Mapa do voto <span>${UF_NOME}</span></p>
    </header>

    ${indice && html`<section class="filters" aria-label="Filtros">
      <label class="field">Eleição
        <select value=${eleicao} onChange=${e => { setEleicao(e.target.value); setSelected(null); setCandKey(null); setComp(null); }}>
          ${indice.map(e => html`<option value=${e.id}>${rotuloEleicao(e)}</option>`)}
        </select></label>
      ${hasData && html`<div class="chips" role="radiogroup" aria-label="Cargo">
        ${cargos.map(([cd, nm]) => html`<button type="button" role="radio" aria-checked=${cd === cargo} onClick=${() => { setCargo(cd); setSelected(null); setComp(null); }}>${cargoLabel(nm)}</button>`)}
      </div>
      <div class="seg modo" role="radiogroup" aria-label="O que ver">
        <button type="button" role="radio" aria-checked=${modo === 'candidato'} onClick=${() => { setModo('candidato'); setSelected(null); }}>Candidato</button>
        <button type="button" role="radio" aria-checked=${modo === 'panorama'} onClick=${() => { setModo('panorama'); setSelected(null); setComp(null); }}>Panorama do cargo</button>
      </div>
      <${CandidatePicker} cands=${cands} value=${candKey} onPick=${k => { setCandKey(k); setModo('candidato'); setSelected(null); setComp(null); }} />`}
    </section>`}

    <section class="stage" ref=${mapRef}>
      ${panorama ? html`<div class="who">
          <h1>${cargoLabel((cargos.find(c => c[0] === cargo) || [cargo, CARGO_NOMES[cargo]])[1])}</h1>
          <p>Panorama · ${ds.ano}${ds.turno !== '1' ? ' (2º turno)' : ''} · ${cands.length} candidatos com voto</p>
        </div>`
      : view ? html`<div class="who">
          <h1>${titleCase(view.urna)}</h1>
          <p>${view.nr} · ${view.partido} · ${cargoLabel(view.cargoNome)} · ${view.ano}${view.turno !== '1' ? ` (${view.turno}º turno)` : ''}</p>
          <p class="sub">${view.posicao ? `${view.posicao}º mais votado entre ${view.nCands}` : ''}${sitTxt ? ` · ${sitTxt}` : ''}</p>
        </div>`
      : html`<div class="who empty"><h1>${hasData ? 'Escolha um candidato' : 'Votos por município'}</h1>
          <p>${erro ? erro : carregando || !indice ? 'Carregando os resultados…' : hasData ? 'Busque pelo nome de urna, número ou partido, ou veja o panorama do cargo.' : `Veja onde cada candidato foi votado nos ${N_MUN} municípios da ${UF_NOME}.`}</p></div>`}
      ${!panorama && comp && !cmp && html`<p class="hint">Carregando a outra eleição…</p>`}
      ${!panorama && cmp && html`<p class="cmp-bar" role="note"><span>Comparando <strong>${cmp.ant.ano}${cmp.ant.turno !== '1' ? ' · 2º turno' : ''}</strong> (${sentence(cmp.ant.cargoNome)}) com <strong>${cmp.rec.ano}${cmp.rec.turno !== '1' ? ' · 2º turno' : ''}</strong> (${sentence(cmp.rec.cargoNome)})</span><button type="button" class="link" onClick=${() => setComp(null)}>Sair da comparação</button></p>`}
      ${!panorama && cmp && avisoComparacao(cmp) && html`<p class="aviso" role="alert">${avisoComparacao(cmp)}</p>`}
      <${MapCanvas} view=${panorama ? viewPanorama : viewMapa} metric=${panorama ? 'pct' : metric} selected=${selected} onSelect=${setSelected} hover=${hover} onHover=${setHover} classes=${panorama ? classesPanorama : classes} modoVar=${!panorama && cmp ? varModo : false} />
      ${panorama && html`<${LegendaPanorama} camada=${camada} setCamada=${setCamada} classes=${classesPanorama} vence=${vence} nomeDe=${nomeDoCand} temComparecimento=${!!compCargo} />`}
      ${panorama && html`<${CardPanorama} id=${shown} pinned=${!hover && !!selected} onClear=${() => setSelected(null)} vence=${vence} cands=${cands} comp=${compCargo} />`}
      ${!panorama && view && html`<${Legend} classes=${classes} metric=${metric} setMetric=${setMetric} view=${view} modoVar=${cmp ? varModo : false} varModo=${varModo} setVarModo=${setVarModo} />`}
      ${!panorama && html`<${MuniCard} view=${view} id=${shown} pinned=${!hover && !!selected} onClear=${() => setSelected(null)} det=${det} linha=${cmp && shown ? { ...(cmp.rows.find(r => r.id === shown) || { vAnt: 0, vRec: 0, d: 0, dp: 0 }), ant: cmp.ant, rec: cmp.rec } : null} />`}
    </section>

    <aside class="side">
      ${panorama ? html`<${StatsPanorama} comp=${compCargo} />
        <${Panorama} ds=${ds} cargo=${cargo} turno=${ds.turno} ano=${ds.ano} financas=${an.financas} perfis=${an.perfis} selecionado=${candKey} onPick=${escolher} />`
      : html`${cmp ? html`<${ComparaStats} cmp=${cmp} />` : html`<${Stats} view=${view} />`}
        ${view && !cmp && html`<${PAINEL.Concentracao} cand=${cands.find(c => c.key === candKey)} />`}
        ${view && !cmp && html`<${PAINEL.Dinheiro} cand=${cands.find(c => c.key === candKey)} financas=${an.financas} ano=${view.ano} linhasDoCargo=${linhasDoCargo} />`}
        ${entradas.length > 1 && html`<${Trajetoria} entradas=${entradas} view=${view} comp=${comp} onComparar=${e => { setComp(c => c && c.ano === e.ano && c.turno === e.turno && c.cargo === e.cargo && c.nr === e.nr ? null : e); setSelected(null); }} onSair=${() => setComp(null)} />`}
        ${cmp ? html`<${ComparaRanking} cmp=${cmp} selected=${selected} onSelect=${selectFromList} />` : html`<${Ranking} view=${view} metric=${metric} selected=${selected} onSelect=${selectFromList} />`}
        ${view && !cmp && html`<${PAINEL.QuemE} cand=${cands.find(c => c.key === candKey)} perfis=${an.perfis} patrimonio=${indiceAnalises.patrimonio} />`}
        ${view && !cmp && html`<${PAINEL.Dobradinhas} cand=${cands.find(c => c.key === candKey)} ds=${ds} onPick=${escolher} />`}`}
      <${Fonte} item=${item} />
      <p class="credits">Fontes: TSE, API de resultados (ciclo atual) e Portal de Dados Abertos (histórico, cadastro e bens dos candidatos, prestação de contas e comparecimento). Malha municipal IBGE, simplificada.</p>
    </aside>
  </div>`;
}
render(html`<${App} />`, document.getElementById('root'));

}
