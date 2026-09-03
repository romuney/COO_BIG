/* charts.js — SVG-примитивы для Exec Board. Без зависимостей.
   Все графики рисуются в viewBox и масштабируются по ширине контейнера:
   передавайте width, близкий к реальной ширине колонки, чтобы текст не мельчал. */
const CH = (() => {
  const NB = ' '; // узкий неразрывный пробел для разрядов
  const fmtInt = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NB);
  const fmtNum = (n, d = 1) => Number(n).toFixed(d).replace('.', ',');
  const fmtPct = (n, d = 1) => fmtNum(n, d) + '%';
  const fmtVal = (n, fmt, d = 1) => fmt === 'int' ? fmtInt(n) : fmt === 'pct' ? fmtPct(n, d) : fmtNum(n, d);
  const fmtDelta = (n, fmt, d = 1, pp = true) => {
    if (n === null || n === undefined || isNaN(n)) return '—';
    const s = n > 0 ? '+' : (n < 0 ? '−' : '±');
    const a = Math.abs(n);
    if (fmt === 'int') return s + fmtInt(a);
    return s + fmtNum(a, d) + (fmt === 'pct' && pp ? `${NB}п.п.` : '');
  };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

  function niceStep(span, n) {
    const raw = span / n;
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const m = raw / p;
    const f = m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10;
    return f * p;
  }
  function ticks(min, max, n = 3) {
    if (max === min) { max = min + 1; }
    const step = niceStep(max - min, n);
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    const out = [];
    for (let v = lo; v <= hi + step / 2; v += step) out.push(+v.toFixed(6));
    return { lo, hi, out };
  }
  function fmtTick(v, fmt) {
    if (fmt === 'int') return fmtInt(v);
    if (fmt === 'pct') return fmtNum(v, Number.isInteger(v) ? 0 : 1) + '%';
    return fmtNum(v, Number.isInteger(v) ? 0 : 1);
  }
  const tickWidth = (t, fmt) => Math.max(...t.out.map(v => fmtTick(v, fmt).length)) * 5.6 + 8;
  const tipAttr = txt => ` data-tip="${esc(txt)}"`;
  const svgOpen = (w, h, cls = '') => `<svg class="ch ${cls}" viewBox="0 0 ${w} ${h}" width="100%" role="img" preserveAspectRatio="xMidYMid meet">`;
  /* раздвигаем подписи по вертикали, чтобы не наезжали друг на друга, в пределах [top, bottom] */
  function spread(ys, gap, top, bottom) {
    const idx = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
    for (let k = 1; k < idx.length; k++) idx[k].y = Math.max(idx[k].y, idx[k - 1].y + gap);
    const over = idx.length ? idx[idx.length - 1].y - bottom : 0;
    if (over > 0) { idx[idx.length - 1].y = bottom; for (let k = idx.length - 2; k >= 0; k--) idx[k].y = Math.min(idx[k].y, idx[k + 1].y - gap); }
    if (idx.length && idx[0].y < top) { idx[0].y = top; for (let k = 1; k < idx.length; k++) idx[k].y = Math.max(idx[k].y, idx[k - 1].y + gap); }
    const out = []; idx.forEach(a => out[a.i] = a.y); return out;
  }

  /* ---------------------------------------------------------------- линия год к году (по образцу Amazon WBR) */
  function yoyLine(o) {
    const W = o.width || 300, H = o.height || 120;
    const y25 = o.y2025 || [], y26 = o.y2026 || [], plan = o.plan || null;
    const fmt = o.fmt || 'num', d = o.decimals == null ? 1 : o.decimals;
    const fc = o.forecast || null; // {runrate:[], pipeline:[]} — с месяца после последнего факта
    const all = [...y25, ...y26];
    if (plan) all.push(...plan);
    if (o.limit != null) all.push(o.limit);
    if (o.target != null) all.push(o.target);
    if (fc) Object.values(fc).forEach(a => all.push(...a));
    let min = Math.min(...all), max = Math.max(...all);
    const pad = (max - min) * 0.12 || 1;
    min -= pad; max += pad;
    if (Math.min(...all) >= 0 && min < 0) min = 0;
    if (o.yMin != null) min = o.yMin;
    if (o.yMax != null) max = o.yMax;
    const t = ticks(min, max, 3);
    if (o.yMax != null && t.hi > o.yMax) { t.hi = o.yMax; t.out = t.out.filter(v => v <= o.yMax); }
    const padL = tickWidth(t, fmt), padR = fc ? 40 : 28, padT = 10, padB = 18;
    const yS = v => padT + (H - padT - padB) * (1 - (v - t.lo) / (t.hi - t.lo));
    const xS = i => padL + (W - padL - padR) * (i / 11);
    let s = svgOpen(W, H, 'yoy');
    t.out.forEach(v => {
      s += `<line class="grid" x1="${padL}" y1="${yS(v)}" x2="${W - padR}" y2="${yS(v)}"/>`;
      s += `<text class="tick" x="${padL - 4}" y="${yS(v) + 3}" text-anchor="end">${fmtTick(v, fmt)}</text>`;
    });
    MONTHS.forEach((m, i) => { if (i % 2 === 0) s += `<text class="tick" x="${xS(i)}" y="${H - 5}" text-anchor="middle">${m}</text>`; });
    const line = (arr, cls, dash) => {
      const pts = arr.map((v, i) => v == null ? null : `${xS(i)},${yS(v)}`).filter(Boolean);
      if (pts.length < 2) return '';
      return `<polyline class="${cls}" ${dash ? `stroke-dasharray="${dash}"` : ''} points="${pts.join(' ')}"/>`;
    };
    if (o.limit != null) {
      s += `<line class="limit" x1="${padL}" y1="${yS(o.limit)}" x2="${W - padR}" y2="${yS(o.limit)}"/>`;
      s += `<text class="lim-label" x="${padL + 3}" y="${yS(o.limit) - 3}">${o.limitLabel || 'лимит'} ${fmtVal(o.limit, fmt, 0)}</text>`;
    }
    if (o.target != null && o.limit == null) {
      s += `<line class="target" x1="${padL}" y1="${yS(o.target)}" x2="${W - padR}" y2="${yS(o.target)}"/>`;
      s += `<text class="tgt-label" x="${W - padR + 3}" y="${yS(o.target) + 3}">цель</text>`;
    }
    if (plan) s += line(plan, 'plan', '2 3');
    s += line(y25, 'prior');
    s += line(y26, 'cur');
    const n = y26.length;
    if (fc && n) {
      const from = [[xS(n - 1), yS(y26[n - 1])].join(',')];
      const mk = (arr, cls) => `<polyline class="${cls}" stroke-dasharray="3 3" points="${[...from, ...arr.map((v, i) => `${xS(n + i)},${yS(v)}`)].join(' ')}"/>`;
      if (fc.runrate) s += mk(fc.runrate, 'fc-a');
      if (fc.pipeline) { s += mk(fc.pipeline, 'fc-b'); const last = fc.pipeline[fc.pipeline.length - 1]; s += `<text class="fc-label" x="${xS(n + fc.pipeline.length - 1) + 4}" y="${yS(last) + 3}">${fmtVal(last, fmt, d)}</text>`; }
    }
    if (n) {
      s += `<circle class="dot-ring" cx="${xS(n - 1)}" cy="${yS(y26[n - 1])}" r="5"/>`;
      s += `<circle class="dot" cx="${xS(n - 1)}" cy="${yS(y26[n - 1])}" r="3.5"/>`;
      if (!fc) s += `<text class="end-label" x="${xS(n - 1) + 7}" y="${yS(y26[n - 1]) - 6}">${fmtVal(y26[n - 1], fmt, d)}</text>`;
    }
    const cw = (W - padL - padR) / 11;
    for (let i = 0; i < 12; i++) {
      const parts = [`${MONTHS[i]}`];
      if (y26[i] != null) parts.push(`2026: ${fmtVal(y26[i], fmt, d)}`);
      if (y25[i] != null) parts.push(`2025: ${fmtVal(y25[i], fmt, d)}`);
      if (plan && plan[i] != null) parts.push(`план: ${fmtVal(plan[i], fmt, d)}`);
      if (fc && i >= n) { if (fc.runrate) parts.push(`прогноз по темпу: ${fmtVal(fc.runrate[i - n], fmt, d)}`); if (fc.pipeline) parts.push(`прогноз по воронке: ${fmtVal(fc.pipeline[i - n], fmt, d)}`); }
      s += `<rect class="hit" x="${xS(i) - cw / 2}" y="0" width="${cw}" height="${H}"${tipAttr(parts.join(' · '))}/>`;
    }
    s += '</svg>';
    return s;
  }

  /* ---------------------------------------------------------------- спарклайн */
  function spark(vals, o = {}) {
    const W = o.width || 90, H = o.height || 24, p = 3;
    const v = vals.filter(x => x != null);
    if (v.length < 2) return '';
    const min = Math.min(...v), max = Math.max(...v);
    const xS = i => p + (W - 2 * p) * (i / (v.length - 1));
    const yS = x => max === min ? H / 2 : p + (H - 2 * p) * (1 - (x - min) / (max - min));
    const pts = v.map((x, i) => `${xS(i)},${yS(x)}`).join(' ');
    return `<svg class="ch spark" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><polyline class="sp" points="${pts}"/><circle class="dot" cx="${xS(v.length - 1)}" cy="${yS(v[v.length - 1])}" r="2.5"/></svg>`;
  }

  /* ---------------------------------------------------------------- мост (waterfall) */
  function bridge(o) {
    const W = o.width || 640, H = o.height || 240;
    const items = [{ label: o.startLabel, value: o.start, type: 'total' }, ...o.steps.map(s => ({ ...s, type: 'step' })), { label: o.endLabel, value: o.end, type: 'total' }];
    let run = o.start; const bars = [];
    items.forEach(it => {
      if (it.type === 'total') { bars.push({ ...it, y0: it.value, y1: it.value }); run = it.value; }
      else { const y0 = run, y1 = run + it.value; bars.push({ ...it, y0: Math.min(y0, y1), y1: Math.max(y0, y1), from: y0, to: y1 }); run = y1; }
    });
    const vals = bars.flatMap(b => [b.y0, b.y1]);
    if (o.limit != null) vals.push(o.limit);
    let min = Math.min(...vals), max = Math.max(...vals);
    const range = max - min; min -= range * 0.35; max += range * 0.15;
    const t = ticks(min, max, 3);
    const padL = tickWidth(t, 'int'), padR = 12, padT = 24, padB = 46;
    const yS = v => padT + (H - padT - padB) * (1 - (v - t.lo) / (t.hi - t.lo));
    const n = bars.length, slot = (W - padL - padR) / n, bw = Math.min(44, slot * 0.58);
    const xS = i => padL + slot * i + (slot - bw) / 2;
    let s = svgOpen(W, H, 'bridge');
    t.out.forEach(v => { s += `<line class="grid" x1="${padL}" y1="${yS(v)}" x2="${W - padR}" y2="${yS(v)}"/><text class="tick" x="${padL - 4}" y="${yS(v) + 3}" text-anchor="end">${fmtTick(v, 'int')}</text>`; });
    const base = yS(t.lo);
    // знак обрыва оси: итоговые столбцы начинаются не с нуля
    s += `<text class="tick" x="${padL - 4}" y="${base + 2}" text-anchor="end">≈</text>`;
    bars.forEach((b, i) => {
      const x = xS(i);
      let cls, y, h, tip;
      if (b.type === 'total') { cls = 'tot'; y = yS(b.value); h = base - y; tip = `${b.label}: ${fmtInt(b.value)}`; }
      else { cls = b.value >= 0 ? 'pos' : 'neg'; y = yS(b.y1); h = Math.max(2, yS(b.y0) - yS(b.y1)); tip = `${b.label}: ${fmtDelta(b.value, 'int')} (${fmtInt(b.from)} → ${fmtInt(b.to)})${b.note ? ' · ' + b.note : ''}`; }
      if (b.flag) cls += ' flag-' + b.flag;
      s += `<rect class="bar ${cls}" x="${x}" y="${y}" width="${bw}" height="${h}" rx="2"${tipAttr(tip)}/>`;
      if (i < n - 1) { const lvl = b.type === 'total' ? b.value : b.to; s += `<line class="conn" x1="${x + bw}" y1="${yS(lvl)}" x2="${xS(i + 1)}" y2="${yS(lvl)}"/>`; }
      const lab = b.type === 'total' ? fmtInt(b.value) : fmtDelta(b.value, 'int');
      s += `<text class="val" x="${x + bw / 2}" y="${y - 5}" text-anchor="middle">${lab}</text>`;
      // подпись категории: перенос по словам, до 3 строк
      const maxChars = Math.max(7, Math.floor(slot / 6.4));
      const words = String(b.label).split(' '); const lines = []; let cur = '';
      words.forEach(w => { if ((cur + ' ' + w).trim().length > maxChars && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); });
      if (cur) lines.push(cur);
      lines.slice(0, 3).forEach((ln, k) => { s += `<text class="cat" x="${x + bw / 2}" y="${H - padB + 13 + k * 11}" text-anchor="middle">${esc(ln)}</text>`; });
    });
    if (o.limit != null) { s += `<line class="limit" x1="${padL}" y1="${yS(o.limit)}" x2="${W - padR}" y2="${yS(o.limit)}"/><text class="lim-label" x="${padL + 4}" y="${yS(o.limit) - 4}">лимит ${fmtInt(o.limit)}</text>`; }
    s += '</svg>';
    return s;
  }

  /* ---------------------------------------------------------------- слоп-диаграмма (Tufte slopegraph) */
  function slopeChart(o) {
    const items = o.items; const n = items.length;
    const W = o.width || 440; const compact = !!o.compact;
    const gap = compact ? 12 : 13;
    const H = Math.max(compact ? 120 : 150, 40 + n * (compact ? 17 : 21));
    const padT = 22, padB = 8; const labW = o.labelWidth || (compact ? 120 : 150); const xL = labW, xR = W - labW;
    const vals = items.flatMap(it => [it.a, it.b]);
    const min = Math.min(...vals), max = Math.max(...vals);
    const yS = v => padT + (H - padT - padB) * (1 - (v - min) / ((max - min) || 1));
    const la = spread(items.map(it => yS(it.a)), gap, padT, H - padB), lb = spread(items.map(it => yS(it.b)), gap, padT, H - padB);
    const u = o.unit || '%';
    const maxName = Math.floor((labW - 30) / (compact ? 5.4 : 5.8));
    let s = svgOpen(W, H, 'slope' + (compact ? ' compact' : ''));
    s += `<text class="tick" x="${xL}" y="11" text-anchor="end">${esc(o.left)}</text><text class="tick" x="${xR}" y="11" text-anchor="start">${esc(o.right)}</text>`;
    s += `<line class="axis" x1="${xL}" y1="${padT - 4}" x2="${xL}" y2="${H - padB}"/><line class="axis" x1="${xR}" y1="${padT - 4}" x2="${xR}" y2="${H - padB}"/>`;
    const order = [...items.keys()].sort((a, b) => (items[a].changed ? 1 : 0) - (items[b].changed ? 1 : 0));
    order.forEach(i => {
      const it = items[i];
      const cls = it.changed ? (it.delta > 0 ? 'up' : 'down') : 'flat';
      const tip = `${it.name}: ${fmtNum(it.a, 1)}${u} → ${fmtNum(it.b, 1)}${u} (${fmtDelta(it.delta, 'pct')})${it.note ? ' · ' + it.note : ''}`;
      s += `<line class="sl ${cls}" x1="${xL}" y1="${yS(it.a)}" x2="${xR}" y2="${yS(it.b)}"${tipAttr(tip)}/>`;
      s += `<circle class="sdot ${cls}" cx="${xL}" cy="${yS(it.a)}" r="3"/><circle class="sdot ${cls}" cx="${xR}" cy="${yS(it.b)}" r="3"/>`;
      const name = it.name.length > maxName ? it.name.slice(0, maxName - 1) + '…' : it.name;
      const fa = fmtNum(it.a, Number.isInteger(it.a) ? 0 : 1), fb = fmtNum(it.b, Number.isInteger(it.b) ? 0 : 1);
      s += `<text class="slab ${cls}" x="${xL - 8}" y="${la[i] + 3.5}" text-anchor="end"><tspan class="sval">${fa}</tspan>  ${esc(name)}</text>`;
      s += `<text class="slab ${cls}" x="${xR + 8}" y="${lb[i] + 3.5}"><tspan class="sval">${fb}</tspan>${it.changed ? `<tspan class="sdelta ${cls}"> ${fmtDelta(it.delta, 'pct', 1, false)}</tspan>` : ''}</text>`;
    });
    s += '</svg>';
    return s;
  }

  /* ---------------------------------------------------------------- горизонтальные бары с маркером прошлого периода */
  function hbars(o) {
    const items = o.items; const n = items.length;
    const W = o.width || 420, rowH = o.rowH || 22, labW = o.labelWidth || 150, valW = o.valueWidth || 52;
    const H = n * rowH + 6;
    const max = o.max || Math.max(...items.map(it => Math.max(it.value, it.prev == null ? 0 : it.prev))) * 1.05;
    const x0 = labW + 6, x1 = W - valW;
    const xS = v => x0 + (x1 - x0) * (v / max);
    const fmt = o.fmt || 'int', d = o.decimals == null ? 0 : o.decimals;
    const maxName = Math.floor(labW / 5.6);
    let s = svgOpen(W, H, 'hbars');
    items.forEach((it, i) => {
      const y = 3 + i * rowH, bh = Math.min(14, rowH - 8);
      const cls = 'bar ' + (it.flag ? 'flag-' + it.flag : (it.muted ? 'muted' : 'norm'));
      const tip = `${it.name}: ${fmtVal(it.value, fmt, d)}${it.suffix ? it.suffix : ''}${it.prev != null ? ` (${o.prevLabel || 'ранее'}: ${fmtVal(it.prev, fmt, d)})` : ''}${it.note ? ' · ' + it.note : ''}`;
      s += `<text class="cat" x="${labW}" y="${y + bh / 2 + 4}" text-anchor="end">${esc(it.name.length > maxName ? it.name.slice(0, maxName - 1) + '…' : it.name)}</text>`;
      s += `<rect class="${cls}" x="${x0}" y="${y}" width="${Math.max(1, xS(it.value) - x0)}" height="${bh}" rx="2"${tipAttr(tip)}/>`;
      if (it.prev != null) s += `<line class="prev" x1="${xS(it.prev)}" y1="${y - 2}" x2="${xS(it.prev)}" y2="${y + bh + 2}"/>`;
      s += `<text class="val" x="${x1 + 6}" y="${y + bh / 2 + 4}">${fmtVal(it.value, fmt, d)}${it.suffix ? esc(it.suffix) : ''}</text>`;
    });
    s += '</svg>';
    return s;
  }

  /* ---------------------------------------------------------------- стек колонок по месяцам */
  function stackedColumns(o) {
    const W = o.width || 620, H = o.height || 200, padR = 12, padT = 18, padB = 22;
    const months = o.months, series = o.series; const n = months.length;
    const totals = months.map((_, i) => series.reduce((a, sr) => a + (sr.values[i] || 0), 0));
    const t = ticks(0, Math.max(...totals) * 1.05, 3);
    const padL = tickWidth(t, 'int');
    const yS = v => padT + (H - padT - padB) * (1 - v / t.hi);
    const slot = (W - padL - padR) / n, bw = Math.min(22, slot * 0.6);
    const xS = i => padL + slot * i + (slot - bw) / 2;
    let s = svgOpen(W, H, 'stack');
    t.out.forEach(v => { s += `<line class="grid" x1="${padL}" y1="${yS(v)}" x2="${W - padR}" y2="${yS(v)}"/><text class="tick" x="${padL - 4}" y="${yS(v) + 3}" text-anchor="end">${fmtTick(v, 'int')}</text>`; });
    const every = o.every || (W < 400 ? 3 : 1);
    months.forEach((m, i) => {
      let acc = 0;
      const tip = [m, ...series.map(sr => `${sr.name}: ${fmtInt(sr.values[i])}`), `всего: ${fmtInt(totals[i])}`].join(' · ');
      series.forEach((sr, k) => {
        const v = sr.values[i] || 0; const y1 = yS(acc + v), y0 = yS(acc);
        const gap = k === 0 ? 0 : 2;
        s += `<rect class="seg s${k}" x="${xS(i)}" y="${y1}" width="${bw}" height="${Math.max(0, y0 - y1 - gap)}"${tipAttr(tip)}/>`;
        acc += v;
      });
      if (i === n - 1 || i === 0) s += `<text class="val" x="${xS(i) + bw / 2}" y="${yS(totals[i]) - 4}" text-anchor="middle">${fmtInt(totals[i])}</text>`;
      if (i % every === 0 || i === n - 1) s += `<text class="tick" x="${xS(i) + bw / 2}" y="${H - 6}" text-anchor="middle">${esc(m)}</text>`;
    });
    s += '</svg>';
    return s;
  }

  /* ---------------------------------------------------------------- несколько линий по месяцам */
  function lines(o) {
    const W = o.width || 620, H = o.height || 180, padR = 44, padT = 14, padB = 22;
    const x = o.x, series = o.series, n = x.length;
    const fmt = o.fmt || 'int', d = o.decimals == null ? 0 : o.decimals;
    const all = series.flatMap(sr => sr.values).filter(v => v != null);
    let min = Math.min(...all), max = Math.max(...all); const pad = (max - min) * 0.15 || 1; min -= pad; max += pad;
    if (Math.min(...all) >= 0 && min < 0) min = 0;
    if (o.zero) min = 0;
    const t = ticks(min, max, 3);
    const padL = tickWidth(t, fmt);
    const yS = v => padT + (H - padT - padB) * (1 - (v - t.lo) / (t.hi - t.lo));
    const xS = i => padL + (W - padL - padR) * (i / (n - 1));
    let s = svgOpen(W, H, 'lines');
    t.out.forEach(v => { s += `<line class="grid" x1="${padL}" y1="${yS(v)}" x2="${W - padR}" y2="${yS(v)}"/><text class="tick" x="${padL - 4}" y="${yS(v) + 3}" text-anchor="end">${fmtTick(v, fmt)}</text>`; });
    x.forEach((m, i) => { if (i % (o.every || 2) === 0 || i === n - 1) s += `<text class="tick" x="${xS(i)}" y="${H - 6}" text-anchor="middle">${esc(m)}</text>`; });
    const ends = series.map(sr => sr.values[n - 1]).map(v => v == null ? null : yS(v));
    const endY = spread(ends.map(v => v == null ? -999 : v), 12, padT, H - padB);
    series.forEach((sr, k) => {
      const pts = sr.values.map((v, i) => v == null ? null : `${xS(i)},${yS(v)}`).filter(Boolean).join(' ');
      s += `<polyline class="ln s${k} ${sr.cls || ''}" points="${pts}"${sr.dash ? ` stroke-dasharray="${sr.dash}"` : ''}/>`;
      const last = sr.values[n - 1];
      if (last != null) { s += `<circle class="dot-ring" cx="${xS(n - 1)}" cy="${yS(last)}" r="5"/><circle class="dot s${k}" cx="${xS(n - 1)}" cy="${yS(last)}" r="3.5"/><text class="end-label" x="${xS(n - 1) + 8}" y="${endY[k] + 3.5}">${fmtVal(last, fmt, d)}</text>`; }
    });
    const cw = (W - padL - padR) / (n - 1);
    x.forEach((m, i) => { const tip = [m, ...series.map(sr => `${sr.name}: ${sr.values[i] == null ? '—' : fmtVal(sr.values[i], fmt, d)}`)].join(' · '); s += `<rect class="hit" x="${xS(i) - cw / 2}" y="0" width="${cw}" height="${H}"${tipAttr(tip)}/>`; });
    s += '</svg>';
    return s;
  }

  /* ---------------------------------------------------------------- легенда */
  function legend(items) {
    return `<div class="legend">${items.map(it => `<span class="lg"><i class="key ${it.cls}"></i>${esc(it.name)}</span>`).join('')}</div>`;
  }

  /* ---------------------------------------------------------------- тултип (делегирование) */
  function initTips() {
    const tip = document.getElementById('tip'); if (!tip) return;
    let cur = null;
    document.addEventListener('pointermove', e => {
      const el = e.target.closest && e.target.closest('[data-tip]');
      if (!el) { if (cur) { tip.hidden = true; cur = null; } return; }
      if (el !== cur) { cur = el; tip.textContent = el.getAttribute('data-tip'); tip.hidden = false; }
      const x = e.clientX + 14, y = e.clientY + 14;
      const r = tip.getBoundingClientRect();
      tip.style.left = Math.min(x, window.innerWidth - r.width - 8) + 'px';
      tip.style.top = Math.min(y, window.innerHeight - r.height - 8) + 'px';
    });
    document.addEventListener('pointerleave', () => { tip.hidden = true; cur = null; });
  }

  return { fmtInt, fmtNum, fmtPct, fmtVal, fmtDelta, esc, MONTHS, yoyLine, spark, bridge, slopeChart, hbars, stackedColumns, lines, legend, initTips, ticks, spread };
})();
