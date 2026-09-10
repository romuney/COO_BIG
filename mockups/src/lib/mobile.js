/* mobile.js — примитивы для мобильных макетов: кольца, спарклайны, воронки, полосы.
   Все размеры заданы под палец, цвета берутся из CSS-переменных через currentColor и токены. */
const MB = (() => {
  const NB = ' ';
  const int = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NB);
  const num = (n, d = 1) => Number(n).toFixed(d).replace('.', ',');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /** Значение метрики в её формате. */
  function val(v, fmt, d) {
    if (v == null) return '—';
    if (fmt === 'text') return esc(v);
    if (fmt === 'int') return int(v);
    if (fmt === 'num') return num(v, d == null ? 2 : d);
    return num(v, d == null ? (Number.isInteger(v) ? 0 : 1) : d) + '%';
  }
  /** Изменение со знаком; для процентов добавляем «п.п.». */
  function delta(v, fmt, pp = true) {
    if (v == null || isNaN(v)) return null;
    const s = v > 0 ? '+' : v < 0 ? '−' : '±', a = Math.abs(v);
    if (fmt === 'int') return s + int(a);
    if (fmt === 'num') return s + num(a, 2);
    return s + num(a, Number.isInteger(a) ? 0 : 1) + (pp ? NB + 'п.п.' : '%');
  }
  /** Класс окраски изменения: хорошо это или плохо, зависит от направления метрики. */
  function dcls(v, good) {
    if (!v || good === 'none' || good === 'range' || good == null) return 'flat';
    if (good === 'down') return v > 0 ? 'bad' : 'good';
    return v > 0 ? 'good' : 'bad';
  }

  /* ---------------------------------------------------------------- кольцо прогресса */
  function ring(o) {
    const S = o.size || 120, sw = o.stroke || 10, r = (S - sw) / 2, C = 2 * Math.PI * r;
    const pct = Math.max(0, Math.min(1, (o.value || 0) / (o.max || 100)));
    const tgt = o.target != null ? Math.max(0, Math.min(1, o.target / (o.max || 100))) : null;
    let s = `<svg class="mb ring" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" role="img" aria-label="${esc(o.label || '')}">`;
    s += `<circle class="track" cx="${S / 2}" cy="${S / 2}" r="${r}" fill="none" stroke-width="${sw}"/>`;
    s += `<circle class="fill ${o.tone || ''}" cx="${S / 2}" cy="${S / 2}" r="${r}" fill="none" stroke-width="${sw}" stroke-linecap="round"
            stroke-dasharray="${(C * pct).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 ${S / 2} ${S / 2})"/>`;
    if (tgt != null) {
      const ang = -Math.PI / 2 + 2 * Math.PI * tgt, cx = S / 2 + Math.cos(ang) * r, cy = S / 2 + Math.sin(ang) * r;
      s += `<circle class="tgt" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(sw / 2 + 1.5).toFixed(1)}"/>`;
      s += `<circle class="tgt-in" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(sw / 2 - 1.5).toFixed(1)}"/>`;
    }
    s += '</svg>';
    return s;
  }

  /* ---------------------------------------------------------------- спарклайн с заливкой */
  function spark(vals, o = {}) {
    const v = (vals || []).filter(x => x != null);
    if (v.length < 2) return '';
    const W = o.width || 96, H = o.height || 30, p = 2.5;
    const mn = Math.min(...v), mx = Math.max(...v);
    const X = i => p + (W - 2 * p) * (i / (v.length - 1));
    const Y = t => mx === mn ? H / 2 : p + (H - 2 * p) * (1 - (t - mn) / (mx - mn));
    const pts = v.map((t, i) => `${X(i).toFixed(1)},${Y(t).toFixed(1)}`).join(' ');
    const area = `${p},${H} ${pts} ${W - p},${H}`;
    return `<svg class="mb spark ${o.tone || ''}" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">
      ${o.area === false ? '' : `<polygon class="ar" points="${area}"/>`}
      <polyline class="ln" points="${pts}"/>
      <circle class="pt" cx="${X(v.length - 1).toFixed(1)}" cy="${Y(v[v.length - 1]).toFixed(1)}" r="2.6"/></svg>`;
  }

  /* ---------------------------------------------------------------- горизонтальная полоса-метр */
  function meter(o) {
    const W = o.width || 300, H = 26, bh = 8, y = 9;
    const pct = Math.max(0, Math.min(1, o.value / (o.max || 100)));
    const tgt = o.target != null ? Math.max(0, Math.min(1, o.target / (o.max || 100))) : null;
    let s = `<svg class="mb meter" viewBox="0 0 ${W} ${H}" width="100%" height="${H}" aria-hidden="true">`;
    s += `<rect class="track" x="0" y="${y}" width="${W}" height="${bh}" rx="${bh / 2}"/>`;
    s += `<rect class="fill ${o.tone || ''}" x="0" y="${y}" width="${(W * pct).toFixed(1)}" height="${bh}" rx="${bh / 2}"/>`;
    if (tgt != null) s += `<rect class="tgt" x="${(W * tgt - 1).toFixed(1)}" y="${y - 4}" width="2" height="${bh + 8}" rx="1"/>`;
    s += '</svg>';
    return s;
  }

  /* ---------------------------------------------------------------- воронка целей: ступени вниз */
  function funnel(steps, o = {}) {
    const W = o.width || 320, rowH = 54, H = steps.length * rowH + 6;
    let s = `<svg class="mb funnel" viewBox="0 0 ${W} ${H}" width="100%" aria-hidden="true">`;
    steps.forEach((st, i) => {
      const y = i * rowH + 4, w = Math.max(28, W * st.v / 100);
      s += `<rect class="bar ${st.tone || ''}" x="0" y="${y}" width="${w.toFixed(1)}" height="26" rx="4"/>`;
      s += `<text class="v" x="${(w - 8).toFixed(1)}" y="${y + 18}" text-anchor="end">${st.v}%</text>`;
      s += `<text class="n" x="0" y="${y + 40}">${esc(st.name)}</text>`;
      // подпись справа рисуем только если она заведомо не наедет на название
      if (st.note && (st.name.length + st.note.length) < 34) s += `<text class="note" x="${W}" y="${y + 40}" text-anchor="end">${esc(st.note)}</text>`;
    });
    s += '</svg>';
    return s;
  }

  /* ---------------------------------------------------------------- вафля: доля от целого точками */
  function waffle(o) {
    const cols = o.cols || 20, rows = o.rows || 5, total = cols * rows;
    const on = Math.round(total * (o.value / (o.max || 100)));
    const W = o.width || 300, cell = W / cols, r = Math.min(cell * 0.32, 5);
    const H = rows * cell;
    let s = `<svg class="mb waffle" viewBox="0 0 ${W} ${H}" width="100%" aria-hidden="true">`;
    for (let i = 0; i < total; i++) {
      const cx = (i % cols) * cell + cell / 2, cy = Math.floor(i / cols) * cell + cell / 2;
      s += `<circle class="${i < on ? 'on ' + (o.tone || '') : 'off'}" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}"/>`;
    }
    s += '</svg>';
    return s;
  }

  /* ---------------------------------------------------------------- столбики по месяцам */
  function bars(o) {
    const v = o.values, n = v.length, W = o.width || 320, H = o.height || 84, padB = 16;
    const mn = Math.min(0, ...v), mx = Math.max(...v);
    const slot = W / n, bw = Math.min(o.barW || 14, slot * 0.66);
    const Y = t => padB === 0 ? 0 : (H - padB) * (1 - (t - mn) / ((mx - mn) || 1));
    let s = `<svg class="mb bars" viewBox="0 0 ${W} ${H}" width="100%" aria-hidden="true">`;
    v.forEach((t, i) => {
      const x = i * slot + (slot - bw) / 2, y = Y(t), h = Math.max(2, H - padB - y);
      const hot = (o.hotFrom != null && i >= o.hotFrom) || (o.hot && o.hot.indexOf(i) >= 0);
      s += `<rect class="bar ${hot ? 'hot' : ''}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="2"/>`;
      if (o.labels && (i % (o.every || 2) === 0 || i === n - 1))
        s += `<text class="lab" x="${(x + bw / 2).toFixed(1)}" y="${H - 3}" text-anchor="middle">${esc(o.labels[i])}</text>`;
    });
    s += '</svg>';
    return s;
  }

  /* ---------------------------------------------------------------- вилка прогноза с порогом */
  function fork(o) {
    const W = o.width || 320, H = 70, y = 26, bh = 16;
    const X = v => ((v - o.min) / (o.max - o.min)) * W;
    const lo = X(o.lo), hi = X(o.hi), lim = X(o.limit);
    let s = `<svg class="mb fork" viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="${esc(o.aria || '')}">`;
    s += `<rect class="ax" x="0" y="${y + bh / 2 - 1}" width="${W}" height="2" rx="1"/>`;
    s += `<rect class="band" x="${lo.toFixed(1)}" y="${y}" width="${Math.max(4, hi - lo).toFixed(1)}" height="${bh}" rx="${bh / 2}"/>`;
    s += `<rect class="lim" x="${(lim - 1.5).toFixed(1)}" y="${y - 9}" width="3" height="${bh + 18}" rx="1.5"/>`;
    s += `<text class="t lim-t" x="${lim.toFixed(1)}" y="${y - 14}" text-anchor="${lim > W * 0.7 ? 'end' : 'middle'}">${esc(o.limitLabel || '')}</text>`;
    // подписи разводим по краям и соединяем с границами вилки, иначе на узком экране они наезжают
    s += `<path class="lead" d="M${lo.toFixed(1)} ${y + bh} V${y + bh + 7} H8"/>`;
    s += `<path class="lead" d="M${hi.toFixed(1)} ${y + bh} V${y + bh + 7} H${W - 8}"/>`;
    s += `<text class="t" x="0" y="${y + bh + 22}" text-anchor="start">${esc(o.loLabel || '')}</text>`;
    s += `<text class="t" x="${W}" y="${y + bh + 22}" text-anchor="end">${esc(o.hiLabel || '')}</text>`;
    s += '</svg>';
    return s;
  }

  /* ---------------------------------------------------------------- две линии: срез против среднего */
  function dual(o) {
    const a = o.a, b = o.b, n = a.length, W = o.width || 320, H = o.height || 92, pt = 10, pb = 18;
    const all = a.concat(b), mn = Math.min(...all), mx = Math.max(...all);
    const X = i => (W - 4) * (i / (n - 1)) + 2;
    const Y = t => pt + (H - pt - pb) * (1 - (t - mn) / ((mx - mn) || 1));
    const line = v => v.map((t, i) => `${X(i).toFixed(1)},${Y(t).toFixed(1)}`).join(' ');
    let s = `<svg class="mb dual" viewBox="0 0 ${W} ${H}" width="100%" aria-hidden="true">`;
    s += `<polyline class="b" points="${line(b)}"/><polyline class="a" points="${line(a)}"/>`;
    s += `<circle class="pa" cx="${X(n - 1).toFixed(1)}" cy="${Y(a[n - 1]).toFixed(1)}" r="3.2"/>`;
    s += `<text class="la" x="${(W - 2).toFixed(1)}" y="${(Y(a[n - 1]) - 8).toFixed(1)}" text-anchor="end">${esc(o.aLabel || '')}</text>`;
    // подпись сравнения ставим слева над её началом: справа она сталкивается с осью месяцев
    s += `<text class="lb" x="2" y="${(Y(b[0]) - 7).toFixed(1)}" text-anchor="start">${esc(o.bLabel || '')}</text>`;
    if (o.labels) o.labels.forEach((t, i) => {
      if (i % (o.every || 3) === 0 || i === n - 1)
        s += `<text class="ax" x="${X(i).toFixed(1)}" y="${H - 3}" text-anchor="${i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}">${esc(t)}</text>`;
    });
    s += '</svg>';
    return s;
  }

  /* ---------------------------------------------------------------- список полос со значениями */
  function rows(items, o = {}) {
    const max = o.max || Math.max(...items.map(i => i.v)) * 1.02;
    return `<div class="mb-rows">${items.map(i => `<div class="mb-row ${i.tone || ''}">
      <span class="n">${esc(i.name)}</span>
      <span class="t"><i style="width:${Math.max(2, 100 * i.v / max).toFixed(1)}%"></i></span>
      <span class="v">${o.fmt === 'int' ? int(i.v) : num(i.v, Number.isInteger(i.v) ? 0 : 1) + (o.suffix || '')}</span>
    </div>`).join('')}</div>`;
  }

  /* ---------------------------------------------------------------- точки на общей шкале
     Когда все значения лежат в узком коридоре (например 85–96%), полосы от нуля неразличимы.
     Здесь шкала обрезана явно и подписана, а цель отмечена штрихом. */
  function dots(items, o = {}) {
    const mn = o.min, mx = o.max;
    const pos = v => Math.max(0, Math.min(100, 100 * (v - mn) / (mx - mn)));
    const tgt = o.target != null ? pos(o.target) : null;
    return `<div class="mb-dots">${items.map(i => `<div class="mb-dot ${i.tone || ''}">
      <span class="n">${esc(i.name)}</span>
      <span class="tk">${tgt != null ? `<u style="left:${tgt.toFixed(1)}%"></u>` : ''}<i style="width:${pos(i.v).toFixed(1)}%"></i><b style="left:${pos(i.v).toFixed(1)}%"></b></span>
      <span class="v">${num(i.v, 1)}${o.suffix || ''}</span></div>`).join('')}
      <div class="mb-dots-ax"><span>${num(mn, 0)}${o.suffix || ''}</span>${o.target != null && tgt > 12 && tgt < 78 ? `<span class="t" style="left:${tgt.toFixed(1)}%">цель ${num(o.target, 0)}${o.suffix || ''}</span>` : ''}<span>${num(mx, 0)}${o.suffix || ''}</span></div></div>`;
  }

  return { int, num, esc, val, delta, dcls, ring, spark, meter, funnel, waffle, bars, rows, fork, dual, dots };
})();
