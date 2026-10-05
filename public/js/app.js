// Interface: Preact + htm, mapa em Canvas 2D.
// startApp é chamado por main.js depois que a malha e a tabela TSE→IBGE são carregadas.
function startApp(TOPO) {
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

// ---------- Mapa (Canvas 2D) ----------
function MapCanvas({ view, metric, selected, onSelect, hover, onHover, classes }) {
  const wrap = useRef(), cv = useRef();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [, force] = useState(0);
  const tf = useRef({ s: 1, ox: 0, oy: 0, s0: 1, z: 1 });
  const ptrs = useRef(new Map()), gesture = useRef(null);
  const props = useRef({}); props.current = { view, metric, selected, hover, classes };

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
    const { view, metric, selected, hover, classes } = props.current;
    const { s, ox, oy } = tf.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, size.w, size.h);
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * (ox - BB[0] * s), dpr * (oy - BB[1] * s));
    const n = classes ? classes.b.length + 1 : 0;
    for (const m of MUNIS) {
      let fill = zero;
      if (view) { const val = metricOf(view, m.id, metric); const cl = classOf(val, classes.b); if (cl >= 0) fill = ramp[rampIndex(cl, n)]; }
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
      role="img" aria-label=${view ? `Mapa de votos de ${titleCase(view.urna)} por município da ${UF_NOME}` : `Mapa dos municípios da ${UF_NOME}`}
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
function Legend({ classes, metric, setMetric, view }) {
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
function MuniCard({ view, id, pinned, onClear, det }) {
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
      : html`<strong>Dados Abertos do TSE</strong> · votação nominal por município e zona · resultado final`}</p>
  </section>`;
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

  // lista as eleições sozinho: histórico (commitado) + ciclo atual (gerado pelo workflow, se existir)
  useEffect(() => {
    (async () => {
      const ler = async base => {
        try {
          const r = await fetch(base + '/index.json', { cache: 'no-cache' });
          if (!r.ok) return [];
          return ((await r.json()).eleicoes || []).map(e => ({ ...e, base, id: e.ano + '|' + e.turno }));
        } catch (e) { return []; }
      };
      const [hist, atual] = await Promise.all([ler('data/historico'), ler('data/atual')]);
      const m = new Map(); for (const e of [...hist, ...atual]) m.set(e.id, e);   // o ciclo atual prevalece
      const lista = [...m.values()].sort((x, y) => (y.ano - x.ano) || (x.turno - y.turno));
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
  const selectFromList = id => { setSelected(id); if (window.innerWidth < 960 && mapRef.current) mapRef.current.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); };
  const hasData = !!ds;
  const sitTxt = view && sitLabel(view.sit);

  return html`<div class=${'app' + (hasData ? '' : ' nodata')}>
    <header class="top">
      <p class="brand">Mapa do voto <span>${UF_NOME}</span></p>
    </header>

    ${indice && html`<section class="filters" aria-label="Filtros">
      <label class="field">Eleição
        <select value=${eleicao} onChange=${e => { setEleicao(e.target.value); setSelected(null); setCandKey(null); }}>
          ${indice.map(e => html`<option value=${e.id}>${rotuloEleicao(e)}</option>`)}
        </select></label>
      ${hasData && html`<div class="chips" role="radiogroup" aria-label="Cargo">
        ${cargos.map(([cd, nm]) => html`<button type="button" role="radio" aria-checked=${cd === cargo} onClick=${() => { setCargo(cd); setSelected(null); }}>${cargoLabel(nm)}</button>`)}
      </div>
      <${CandidatePicker} cands=${cands} value=${candKey} onPick=${k => { setCandKey(k); setSelected(null); }} />`}
    </section>`}

    <section class="stage" ref=${mapRef}>
      ${view ? html`<div class="who">
          <h1>${titleCase(view.urna)}</h1>
          <p>${view.nr} · ${view.partido} · ${cargoLabel(view.cargoNome)} · ${view.ano}${view.turno !== '1' ? ` (${view.turno}º turno)` : ''}</p>
          <p class="sub">${view.posicao ? `${view.posicao}º mais votado entre ${view.nCands}` : ''}${sitTxt ? ` · ${sitTxt}` : ''}</p>
        </div>`
      : html`<div class="who empty"><h1>${hasData ? 'Escolha um candidato' : 'Votos por município'}</h1>
          <p>${erro ? erro : carregando || !indice ? 'Carregando os resultados…' : hasData ? 'Busque pelo nome de urna, número ou partido.' : `Veja onde cada candidato foi votado nos ${N_MUN} municípios da ${UF_NOME}.`}</p></div>`}
      <${MapCanvas} view=${view} metric=${metric} selected=${selected} onSelect=${setSelected} hover=${hover} onHover=${setHover} classes=${classes} />
      ${view && html`<${Legend} classes=${classes} metric=${metric} setMetric=${setMetric} view=${view} />`}
      <${MuniCard} view=${view} id=${shown} pinned=${!hover && !!selected} onClear=${() => setSelected(null)} det=${det} />
    </section>

    <aside class="side">
      <${Stats} view=${view} />
      <${Ranking} view=${view} metric=${metric} selected=${selected} onSelect=${selectFromList} />
      <${Fonte} item=${item} />
      <p class="credits">Fontes: TSE, API de resultados (ciclo atual) e Portal de Dados Abertos (histórico). Malha municipal IBGE, simplificada.</p>
    </aside>
  </div>`;
}
render(html`<${App} />`, document.getElementById('root'));

}
