/* devices.js — крупные визуальные приёмы для дерзкой версии Exec Board.
   Геометрия не зависит от арт-направления: все цвета берутся из CSS-переменных
   и currentColor, поэтому дизайн-система подключается токенами, а не правкой кода. */
const DEV = (() => {
  const NB = ' ';
  const int = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NB);
  const num = (n, d = 1) => Number(n).toFixed(d).replace('.', ',');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const tip = t => ` data-tip="${esc(t)}"`;
  const svg = (w, h, cls) => `<svg class="dv ${cls}" viewBox="0 0 ${w} ${h}" width="100%" role="img" preserveAspectRatio="xMidYMid meet">`;

  /* --------------------------------------------------------------- шкала «факт против лимита»
     Одна горизонтальная шкала: где мы, куда придём при текущем темпе, куда придёт воронка,
     и где стоит запрет. Читается за секунду, потому что превышение видно как перелёт через черту. */
  function gapMeter(o) {
    const W = o.width || 900, H = 132;
    const padL = 4, padR = 4, y = 62, bh = 26;
    const lo = o.min, hi = o.max;
    const x = v => padL + (W - padL - padR) * (v - lo) / (hi - lo);
    const limit = o.limit;
    let s = svg(W, H, 'gap');
    // трек
    s += `<rect class="track" x="${padL}" y="${y}" width="${W - padL - padR}" height="${bh}" rx="2"/>`;
    // зона превышения
    s += `<rect class="over" x="${x(limit)}" y="${y}" width="${W - padR - x(limit)}" height="${bh}"/>`;
    // факт
    s += `<rect class="fact" x="${padL}" y="${y}" width="${x(o.actual) - padL}" height="${bh}" rx="2"/>`;
    // черта лимита
    s += `<line class="limitline" x1="${x(limit)}" y1="${y - 22}" x2="${x(limit)}" y2="${y + bh + 22}"/>`;
    s += `<text class="limitlab" x="${x(limit)}" y="${y - 28}" text-anchor="middle">ЛИМИТ ${int(limit)}</text>`;
    // маркеры прогнозов
    (o.marks || []).forEach(m => {
      const mx = x(m.value);
      const over = m.value > limit;
      s += `<line class="mark ${over ? 'bad' : ''}" x1="${mx}" y1="${y - 6}" x2="${mx}" y2="${y + bh + 6}"/>`;
      s += `<text class="markval ${over ? 'bad' : ''}" x="${mx}" y="${y + bh + 24}" text-anchor="${m.anchor || 'middle'}">${int(m.value)}</text>`;
      s += `<text class="marklab" x="${mx}" y="${y + bh + 38}" text-anchor="${m.anchor || 'middle'}">${esc(m.label)}</text>`;
    });
    // факт-подпись
    s += `<text class="factval" x="${x(o.actual)}" y="${y - 8}" text-anchor="end">${int(o.actual)} сейчас</text>`;
    s += '</svg>';
    return s;
  }

  /* --------------------------------------------------------------- серия: «шестой месяц подряд»
     Столбики по месяцам, где подряд идущие месяцы роста подсвечены как серия. */
  function streak(o) {
    const vals = o.values, n = vals.length;
    const W = o.width || 420, H = o.height || 90, padB = 16, padT = 14;
    const min = Math.min(...vals, ...(o.compare || [])), max = Math.max(...vals, ...(o.compare || []));
    const pad = (max - min) * 0.15 || 1;
    const y = v => padT + (H - padT - padB) * (1 - (v - (min - pad)) / ((max + pad) - (min - pad)));
    const slot = W / n, bw = Math.min(18, slot * 0.62);
    const x = i => slot * i + (slot - bw) / 2;
    // считаем серию с конца
    let run = 0;
    for (let i = n - 1; i > 0; i--) { if ((vals[i] - vals[i - 1]) * (o.dir || 1) > 0) run++; else break; }
    let s = svg(W, H, 'streak');
    if (o.compare) {
      const pts = o.compare.map((v, i) => `${x(i) + bw / 2},${y(v)}`).join(' ');
      s += `<polyline class="cmp" points="${pts}"/>`;
    }
    vals.forEach((v, i) => {
      const inRun = i >= n - run;
      s += `<rect class="bar ${inRun ? 'hot' : ''}" x="${x(i)}" y="${y(v)}" width="${bw}" height="${Math.max(2, H - padB - y(v))}"${tip(`${o.labels[i]}: ${num(v, o.decimals == null ? 1 : o.decimals)}${o.unit || ''}`)}/>`;
      if (i % (o.every || 2) === 0 || i === n - 1) s += `<text class="lab" x="${x(i) + bw / 2}" y="${H - 4}" text-anchor="middle">${esc(o.labels[i])}</text>`;
    });
    if (run >= 2) {
      const x0 = x(n - run) - 3, x1 = x(n - 1) + bw + 3;
      s += `<line class="runline" x1="${x0}" y1="${padT - 8}" x2="${x1}" y2="${padT - 8}"/>`;
      s += `<text class="runlab" x="${(x0 + x1) / 2}" y="${padT - 12}" text-anchor="middle">${run} ${plural(run, 'месяц', 'месяца', 'месяцев')} подряд</text>`;
    }
    s += '</svg>';
    return s;
  }
  function plural(n, one, few, many) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }

  /* --------------------------------------------------------------- распределение с помеченной зоной */
  function distribution(o) {
    const vals = o.values, n = vals.length;
    const W = o.width || 420, H = o.height || 130, padB = 30, padT = 18;
    const max = Math.max(...vals);
    const slot = W / n, bw = Math.min(46, slot * 0.72);
    const x = i => slot * i + (slot - bw) / 2;
    const y = v => padT + (H - padT - padB) * (1 - v / (max * 1.08));
    let s = svg(W, H, 'dist');
    vals.forEach((v, i) => {
      const flag = o.flagUpTo != null && i < o.flagUpTo;
      s += `<rect class="bar ${flag ? 'hot' : ''}" x="${x(i)}" y="${y(v)}" width="${bw}" height="${Math.max(2, H - padB - y(v))}"${tip(`${o.bins[i]}: ${int(v)}`)}/>`;
      s += `<text class="val ${flag ? 'hot' : ''}" x="${x(i) + bw / 2}" y="${y(v) - 5}" text-anchor="middle">${int(v)}</text>`;
      s += `<text class="lab" x="${x(i) + bw / 2}" y="${H - 12}" text-anchor="middle">${esc(o.bins[i])}</text>`;
    });
    if (o.flagUpTo) {
      const x1 = x(o.flagUpTo - 1) + bw;
      s += `<line class="cut" x1="${x1 + (slot - bw) / 2}" y1="${padT - 10}" x2="${x1 + (slot - bw) / 2}" y2="${H - padB + 4}"/>`;
      s += `<text class="cutlab" x="${x1 / 2}" y="${H - 2}" text-anchor="middle">${esc(o.flagLabel || '')}</text>`;
    }
    s += '</svg>';
    return s;
  }

  /* --------------------------------------------------------------- крупная линия с фоном прошлого года */
  function bigLine(o) {
    const W = o.width || 420, H = o.height || 120, padT = 16, padB = 18, padR = 46, padL = 2;
    const v = o.values, c = o.compare, n = v.length;
    const all = [...v, ...(c || [])];
    let min = Math.min(...all), max = Math.max(...all);
    const pad = (max - min) * 0.18 || 1; min -= pad; max += pad;
    const x = i => padL + (W - padL - padR) * (i / (n - 1));
    const y = t => padT + (H - padT - padB) * (1 - (t - min) / (max - min));
    let s = svg(W, H, 'bigline');
    if (o.band) {
      s += `<rect class="band" x="${padL}" y="${y(o.band[1])}" width="${W - padL - padR}" height="${Math.max(1, y(o.band[0]) - y(o.band[1]))}"/>`;
    }
    if (c) s += `<polyline class="cmp" points="${c.map((t, i) => `${x(i)},${y(t)}`).join(' ')}"/>`;
    s += `<polyline class="main" points="${v.map((t, i) => `${x(i)},${y(t)}`).join(' ')}"/>`;
    s += `<circle class="end" cx="${x(n - 1)}" cy="${y(v[n - 1])}" r="5"/>`;
    s += `<text class="endlab" x="${x(n - 1) + 10}" y="${y(v[n - 1]) + 5}">${num(v[n - 1], o.decimals == null ? 1 : o.decimals)}${o.unit || ''}</text>`;
    if (c) s += `<text class="cmplab" x="${x(n - 1) + 10}" y="${y(c[n - 1]) + 5}">${num(c[n - 1], o.decimals == null ? 1 : o.decimals)}${o.unit || ''}</text>`;
    o.labels.forEach((l, i) => { if (i === 0 || i === n - 1) s += `<text class="lab" x="${x(i)}" y="${H - 4}" text-anchor="${i === 0 ? 'start' : 'middle'}">${esc(l)}</text>`; });
    s += '</svg>';
    return s;
  }

  /* --------------------------------------------------------------- полоса состава (одна строка, части целого) */
  function composition(o) {
    const items = o.items, total = items.reduce((a, i) => a + i.v, 0);
    const W = o.width || 620, H = o.height || 54, bh = 26;
    let acc = 0;
    let s = svg(W, H, 'comp');
    items.forEach((it, k) => {
      const w = (W * it.v) / total;
      s += `<rect class="seg ${it.flag ? 'hot' : ''} s${k}" x="${acc + (k ? 1.5 : 0)}" y="0" width="${Math.max(1, w - (k ? 1.5 : 0))}" height="${bh}"${tip(`${it.name}: ${int(it.v)} (${Math.round(100 * it.v / total)}%)`)}/>`;
      if (w > 42) s += `<text class="segval ${it.flag ? 'hot' : ''}" x="${acc + w / 2}" y="${bh + 15}" text-anchor="middle">${int(it.v)}</text>`;
      if (w > 76) s += `<text class="seglab ${it.flag ? 'hot' : ''}" x="${acc + w / 2}" y="${bh + 28}" text-anchor="middle">${esc(it.name.length > Math.floor(w / 6) ? it.name.slice(0, Math.floor(w / 6) - 1) + '…' : it.name)}</text>`;
      acc += w;
    });
    s += '</svg>';
    return s;
  }

  /* --------------------------------------------------------------- микро-спарк для панели */
  function micro(vals, o = {}) {
    const W = o.width || 72, H = o.height || 20, p = 2;
    const v = vals.filter(x => x != null);
    if (v.length < 2) return '';
    const min = Math.min(...v), max = Math.max(...v);
    const x = i => p + (W - 2 * p) * (i / (v.length - 1));
    const y = t => max === min ? H / 2 : p + (H - 2 * p) * (1 - (t - min) / (max - min));
    return `<svg class="dv micro" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><polyline class="main" points="${v.map((t, i) => `${x(i)},${y(t)}`).join(' ')}"/><circle class="end" cx="${x(v.length - 1)}" cy="${y(v[v.length - 1])}" r="2.2"/></svg>`;
  }

  function initTips() {
    const el = document.getElementById('tip'); if (!el) return;
    let cur = null;
    document.addEventListener('pointermove', e => {
      const t = e.target.closest && e.target.closest('[data-tip]');
      if (!t) { if (cur) { el.hidden = true; cur = null; } return; }
      if (t !== cur) { cur = t; el.textContent = t.getAttribute('data-tip'); el.hidden = false; }
      const r = el.getBoundingClientRect();
      el.style.left = Math.min(e.clientX + 14, innerWidth - r.width - 8) + 'px';
      el.style.top = Math.min(e.clientY + 14, innerHeight - r.height - 8) + 'px';
    });
  }

  return { int, num, esc, plural, gapMeter, streak, distribution, bigLine, composition, micro, initTips };
})();
