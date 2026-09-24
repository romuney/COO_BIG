/* m_hub.js — COO Hub · Радар. Одна страница для одного очень занятого человека.
   Порядок чтения: радар (3 секунды) → где болит (30 секунд) → какой продукт (провал внутрь) → все метрики.
   Данные и правила — из витрины COO Hub; вся окраска считается из порогов и change_type.
   Правила движения после ревью: анимируем только transform и opacity; числа досчитываются только в трёх
   местах и моноширинными цифрами; работа за экраном откладывается до конца анимации; ничего не сдвигает
   то, на что пользователь смотрит. */
(() => {
  (() => { if (!document.querySelector('meta[name="viewport"]')) { const m = document.createElement('meta'); m.name = 'viewport'; m.content = 'width=device-width, initial-scale=1, viewport-fit=cover'; document.head.appendChild(m); } })();

  const D = window.DATA, META = D.meta, U = D.units, MS = D.metrics, F = D.facts, BLOCKS = D.blocks;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const NB = ' ';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const int = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NB).replace('-', '−');
  const num = (n, d) => Number(n).toFixed(d).replace('.', ',').replace('-', '−');
  const plural = (n, f) => { const a = Math.abs(n) % 100, b = a % 10; return f[a > 10 && a < 20 ? 2 : b === 1 ? 0 : b >= 2 && b <= 4 ? 1 : 2]; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------------------------------------------------------------- каталог
     Всё, что зависит от выгрузки, берём из данных: корень дерева, блоки и их порядок, годы.
     Клетка юнит × метрика без данных за месяц — не ошибка: она серая и подписана «нет данных». */
  const byRk = Object.fromEntries(U.map(u => [u.functional_unit_rk, u]));
  const KIDS = {};
  U.forEach(u => { const p = u.parent_functional_unit_rk; if (p != null && byRk[p]) (KIDS[p] = KIDS[p] || []).push(u); });
  const kids = rk => KIDS[rk] || [];
  const path = rk => { const p = []; let u = byRk[rk]; while (u) { p.unshift(u); u = byRk[u.parent_functional_unit_rk]; } return p; };
  const LEAVES = new Map();
  const leaves = rk => { if (!LEAVES.has(rk)) LEAVES.set(rk, byRk[rk].leaf ? [byRk[rk]] : kids(rk).flatMap(k => leaves(k.functional_unit_rk))); return LEAVES.get(rk); };
  const ROOTS = U.filter(u => !byRk[u.parent_functional_unit_rk]);
  const ROOT = META.root && byRk[META.root] ? META.root : (ROOTS[0] || U[0]).functional_unit_rk;
  const M = eng => MS.find(m => m.eng === eng);
  const NODATA = Object.freeze({ value_final: null, value_numerator: null, value_denominator: null, mom_value_final: null, yoy_value_final: null, yoy_known: false, cur: [], prev: [], cuts: null, nodata: true });
  const fact = (rk, eng) => (F[rk] && F[rk][eng]) || NODATA;
  const ANY_NODATA = U.some(u => MS.some(m => fact(u.functional_unit_rk, m.eng).nodata));
  const HAS_HC = U.some(u => u.headcount != null);
  const BM = D.block_meta || {};
  const DEF_BLOCK = {
    goals: { nick: 'Цели', ring: 'Цели', phrase: { red: 'Цели буксуют', amber: 'Цели на грани', ok: 'цели в норме' } },
    hr: { nick: 'Люди', ring: 'Люди', phrase: { red: 'С людьми есть красная зона', amber: 'Люди на грани', ok: 'люди в норме' } },
    it: { nick: 'Инфраструктура', ring: 'IT', phrase: { red: 'Инфраструктура в красной зоне', amber: 'Инфраструктура на грани', ok: 'инфраструктура в норме' } },
  };
  const BLOCK_ORDER = (D.block_order || Object.keys(BLOCKS)).filter(b => MS.some(m => m.block === b));
  MS.forEach(m => { if (!BLOCK_ORDER.includes(m.block)) BLOCK_ORDER.push(m.block); });
  const BK = Object.fromEntries(BLOCK_ORDER.map(b => {
    const d = BM[b] || DEF_BLOCK[b] || {}, name = BLOCKS[b] || b, nick = d.nick || name;
    return [b, { name, nick, ring: d.ring || nick, phrase: d.phrase || { red: `${nick}: красная зона`, amber: `${nick}: на грани`, ok: `${nick.toLowerCase()} в норме` } }];
  }));
  const NICK = Object.fromEntries(BLOCK_ORDER.map(b => [b, BK[b].nick]));
  const RING_NICK = Object.fromEntries(BLOCK_ORDER.map(b => [b, BK[b].ring]));
  const YEAR = +META.year || +String(META.business_month || '').slice(0, 4) || new Date().getFullYear();
  if (META.title) document.title = META.title;
  const MONTHS = META.months;
  const MONTHS_IN = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];
  const dateShort = META.actual_data_dt.split('-').reverse().slice(0, 2).join('.');
  const dateFull = META.actual_data_dt.split('-').reverse().join('.');

  /* ---------------------------------------------------------------- форматы
     fmtVal — точное значение витрины (таблицы, подсказка графика).
     fmtC   — компактное для плиток, карточек и строк: 26,0 млн ₽ вместо 26 005 122, чтобы число всегда помещалось. */
  const money = m => m.unit_num === 'рублей';
  const nil = v => v == null || Number.isNaN(+v);
  const fmtVal = (v, vt) => nil(v) ? '—' : vt === 'perc' ? num(v, 2) + '%' : vt === 'real' ? num(v, 1) : int(v);
  function fmtC(v, m) {
    if (nil(v)) return '—';
    if (m.vt === 'perc') return num(v, 1) + '%';
    const a = Math.abs(v), sfx = money(m) ? NB + '₽' : '';
    if (a >= 1e9) return num(v / 1e9, a >= 1e10 ? 1 : 2) + NB + 'млрд' + sfx;
    if (a >= 1e6) return num(v / 1e6, a >= 1e7 ? 1 : 2) + NB + 'млн' + sfx;
    if (a >= 1e5) return int(v / 1e3) + NB + 'тыс.' + sfx;
    return (m.vt === 'real' ? (a >= 1000 ? int(v) : num(v, 1)) : int(v)) + sfx;
  }
  const cnum = v => Math.abs(v) >= 1e5 ? fmtC(v, { vt: 'int' }) : int(v);
  function tvHTML(v, m) {
    const s = fmtC(v, m), mt = s.match(/^([−+]?\d[\d\u00A0]*(?:,\d+)?%?)(?:\u00A0(.+))?$/);
    return mt && mt[2] ? `${mt[1]}<small>${esc(mt[2])}</small>` : esc(s);
  }
  function fmtCD(v, m) {
    if (v == null || isNaN(v)) return '—';
    const s = v > 0 ? '+' : v < 0 ? '−' : '±', a = Math.abs(v);
    if (m.vt === 'perc') return s + num(a, a < 10 ? 2 : 1) + NB + 'п.п.';
    return s + fmtC(a, m);
  }
  const fmtDelta = (v, vt) => fmtCD(v, { vt });
  // точное изменение — для таблицы полей витрины, где аналитик сверяет цифры до единицы
  const fmtVD = (v, m) => nil(v) ? '—' : (v > 0 ? '+' : v < 0 ? '−' : '±') + (m.vt === 'perc' ? num(Math.abs(v), 2) + NB + 'п.п.' : fmtVal(Math.abs(v), m.vt));
  const dcls = (v, change) => !v ? 'flat' : (change === 'up' ? (v > 0 ? 'good' : 'bad') : (v < 0 ? 'good' : 'bad'));
  // прошлый месяц: в январе это декабрь прошлого года
  const prevMonth = f => {
    const p = f.cur.length >= 2 ? f.cur[f.cur.length - 2] : (f.prev && f.prev.length === 12 ? f.prev[11] : null);
    return !nil(p) ? p : !nil(f.value_final) && !nil(f.mom_value_final) ? f.value_final - f.mom_value_final : null;  // в ряду пропуск — берём из изменения
  };
  const momPct = f => { const p = prevMonth(f); return nil(p) || !p || nil(f.value_final) ? null : 100 * (f.value_final - p) / Math.abs(p); };
  // порог м/м — это процент изменения, а не значение: +25%, а не «25»
  const thr = (m, v) => nil(v) ? '—' : m.ttype === 'mom' ? (v > 0 ? '+' : '') + num(v, Number.isInteger(+v) ? 0 : 1) + '%'
    : m.vt === 'perc' ? num(v, Number.isInteger(+v) ? 0 : 1) + '%' : Number.isInteger(+v) ? int(v) : num(v, 1);
  // последние n месяцев ряда: в начале года добираем хвост прошлого, если база есть
  const tail = (f, n) => (f.yoy_known && f.prev && f.prev.length ? f.prev.concat(f.cur) : f.cur).slice(-n);

  /* ---------------------------------------------------------------- статус по порогам витрины
     Пороги обычно общие для метрики; если витрина задаёт их по юнитам, у клетки есть thr: [красный, жёлтый]
     (null — у этого юнита порога нет). Всё ниже спрашивает порог через TH, а не у метрики напрямую. */
  const NOTHR = { red: null, yellow: null };
  const TH = (m, rk) => { const f = fact(rk, m.eng); return f.thr !== undefined ? (f.thr ? { red: f.thr[0], yellow: f.thr[1] } : NOTHR) : { red: m.red, yellow: m.yellow }; };
  function rawStatus(m, rk) {
    const f = fact(rk, m.eng), t = TH(m, rk);
    if (f.nodata || t.red == null) return 'none';
    const v = m.ttype === 'mom' ? momPct(f) : f.value_final;
    if (nil(v)) return 'none';
    return m.tdir === 'up' ? (v < t.red ? 'red' : v < t.yellow ? 'amber' : 'ok') : (v > t.red ? 'red' : v > t.yellow ? 'amber' : 'ok');
  }
  // порог счётчика не сравним с суммой по юнитам — на агрегате считаем юниты, а не сумму
  const lvlScoped = (m, rk) => m.threshold_scope === 'unit_level' && !byRk[rk].leaf;
  const statusOf = (m, rk) => lvlScoped(m, rk) ? 'none' : rawStatus(m, rk);
  // данные не меняются, поэтому статусы считаются один раз: на большом каталоге это сотни юнитов × метрики
  const MEMO = new Map();
  const memo = (k, fn) => { if (!MEMO.has(k)) MEMO.set(k, fn()); return MEMO.get(k); };
  function breach(m, rk) {
    return memo('b|' + m.eng + '|' + rk, () => {
      const out = { red: 0, amber: 0, total: 0, worst: [] };
      leaves(rk).forEach(u => { const s = rawStatus(m, u.functional_unit_rk); if (s === 'none') return; out.total++; if (s === 'red') { out.red++; out.worst.push(u); } else if (s === 'amber') out.amber++; });
      return out;
    });
  }
  const stKey = (m, rk) => memo('s|' + m.eng + '|' + rk, () => { if (!lvlScoped(m, rk)) return rawStatus(m, rk); const b = breach(m, rk); return !b.total ? 'none' : b.red > 0 ? 'inner' : 'ok'; });
  const ST_LABEL = { red: 'красная зона', amber: 'жёлтая зона', ok: 'в норме', none: 'без порога', inner: 'пробито внутри' };
  // серый статус говорит, почему он серый: нет данных, нет порога или не с чем сравнить месяц
  const stLab = (s, m, rk) => {
    if (s !== 'none') return ST_LABEL[s];
    const f = fact(rk, m.eng);
    return f.nodata ? 'нет данных' : TH(m, rk).red == null ? 'без порога' : m.ttype === 'mom' && momPct(f) == null ? 'нет прошлого месяца' : ST_LABEL.none;
  };
  function gapText(m, rk) {
    const f = fact(rk, m.eng), t = TH(m, rk);
    if (f.nodata || t.red == null || m.type !== 2 || m.vt !== 'perc' || !m.gap_tpl || !f.value_denominator) return '';
    const off = m.tdir === 'up' ? t.yellow - f.value_final : f.value_final - t.yellow;
    if (off <= 0) return '';
    return m.gap_tpl.replace('{n}', cnum(Math.ceil(f.value_denominator * off / 100)));
  }
  // кто хуже: без порога — у кого больше, с порогом — по направлению; юниты без данных — в конце
  const worseFirst = (m, get) => (a, b) => {
    const x = get(a), y = get(b);
    if (nil(x) || nil(y)) return nil(x) - nil(y);
    return m.red == null ? y - x : m.tdir === 'up' ? x - y : y - x;
  };
  function worstKids(m, rk, n) {
    const ks = kids(rk).map(u => ({ u, v: fact(u.functional_unit_rk, m.eng).value_final, s: stKey(m, u.functional_unit_rk) }));
    return ks.filter(k => k.s === 'red' || k.s === 'amber' || k.s === 'inner').sort(worseFirst(m, k => k.v)).slice(0, n);
  }
  const frac = (m, f) => f.nodata ? 'нет данных за месяц' : !(m.type === 2 && f.value_denominator) ? esc(m.unit_num || '')
    : Number.isInteger(f.value_numerator) ? `${cnum(f.value_numerator)} из ${cnum(f.value_denominator)} ${esc(m.unit_den || '')}`
    : `по ${cnum(f.value_denominator)} ${esc(m.unit_den || '')}`;
  const fracShort = (m, f) => f.nodata ? 'нет данных' : !(m.type === 2 && f.value_denominator) ? '' : Number.isInteger(f.value_numerator)
    ? `${cnum(f.value_numerator)} из ${cnum(f.value_denominator)}` : `по ${cnum(f.value_denominator)} ${esc(m.unit_den || '')}`;
  const hcText = u => u.headcount == null ? '' : `${int(u.headcount)}${NB}чел.`;

  const GLYPH = {
    red: '<svg class="g red" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="5"/></svg>',
    amber: '<svg class="g amber" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 .6 11.4 6 6 11.4 .6 6z"/></svg>',
    ok: '<svg class="g ok" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6.4 4.8 9.1 10 3.2"/></svg>',
    none: '<svg class="g none" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4.4"/></svg>',
    inner: '<svg class="g inner" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4.6"/><circle cx="6" cy="6" r="1.9"/></svg>',
  };
  const ICON = {
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
    pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h7v7H4zM13 13h7v7h-7zM13 4h7v7h-7z"/></svg>',
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7"/></svg>',
    chev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
    moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 13.6A7.6 7.6 0 1 1 10.4 5a6 6 0 0 0 8.6 8.6z"/></svg>',
    sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    play: '<svg viewBox="0 0 10 12" aria-hidden="true"><path d="M0 0v12l10-6z"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 10 17.5 19 7"/></svg>',
  };
  const NEON = id => `<filter id="${id}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;

  /* ---------------------------------------------------------------- движение */
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  const reduce = () => RM.matches;
  const LAST = new Map();
  // досчёт числа: только для трёх главных чисел, моноширинными цифрами — ширина не прыгает
  function setNum(el, key, value, fmt, o = {}) {
    if (!el) return;
    if (nil(value)) { cancelAnimationFrame(el._raf); LAST.delete(key); el.textContent = fmt(value); return; }
    const from = o.from != null ? o.from : (LAST.has(key) ? LAST.get(key) : value);
    LAST.set(key, value);
    cancelAnimationFrame(el._raf);
    if (reduce() || from === value || !isFinite(from)) { el.textContent = fmt(value); return; }
    const dur = o.dur || 520, t0 = performance.now();
    const step = now => {
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(from + (value - from) * e);
      if (p < 1) el._raf = requestAnimationFrame(step);
    };
    el.textContent = fmt(from);
    el._raf = requestAnimationFrame(step);
  }
  // остальные числа не досчитываются, а мягко въезжают: одна композитная анимация вместо смены текста на каждом кадре
  const PREV = new Map();
  function roll(el, key, v) {
    if (nil(v)) { PREV.delete(key); return; }
    const p = PREV.get(key); PREV.set(key, v);
    if (p == null || p === v || reduce() || !el || !el.animate) return;
    const d = v > p ? 1 : -1;
    el.animate([{ transform: `translate3d(0, ${d * 45}%, 0)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }
  const rollAll = root => $$('[data-roll]', root).forEach(el => roll(el, el.dataset.roll, +el.dataset.v));
  // число, которое не помещается, уменьшается один раз при отрисовке, а не на каждом кадре
  function fit(el, maxW, minScale = .5, floor = 12) {
    if (!el || !(maxW > 0)) return;
    el.style.fontSize = '';
    const w = el.scrollWidth;
    if (w <= maxW) return;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    el.style.fontSize = Math.max(floor, fs * minScale, Math.floor(fs * maxW / w * 10) / 10 - .3) + 'px';
  }
  function spring(o) {
    let x = o.from, v = (o.v || 0) * 1000, last = performance.now(), raf = 0;
    const k = o.k || 420, c = o.c || 38;
    const tick = now => {
      const dt = Math.min(0.032, (now - last) / 1000); last = now;
      for (let i = 0; i < 2; i++) { const h = dt / 2, a = -k * (x - o.to) - c * v; v += a * h; x += v * h; }
      o.onUpdate(x);
      if (Math.abs(x - o.to) < 0.5 && Math.abs(v) < 10) { o.onUpdate(o.to); if (o.onDone) o.onDone(); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }
  const buzz = () => { try { if (navigator.vibrate) navigator.vibrate(4); } catch (e) { /* не везде есть */ } };
  const idle = f => ('requestIdleCallback' in window) ? requestIdleCallback(f, { timeout: 400 }) : setTimeout(f, 80);

  /* ---------------------------------------------------------------- состояние (помним юнит и метрику) */
  const KEY = 'coohub-radar-v2';
  const S = { unit: ROOT, metric: null, pinned: false, view: 'map' };
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && byRk[s.unit]) Object.assign(S, s); } catch (e) { /* хранилище недоступно */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* не страшно */ } };
  function defaultMetric(rk) {
    return (MS.find(m => statusOf(m, rk) === 'red') || MS.find(m => stKey(m, rk) === 'inner')
      || MS.find(m => statusOf(m, rk) === 'amber') || MS[0]).eng;
  }
  if (!S.metric || !M(S.metric) || !S.pinned) S.metric = defaultMetric(S.unit);

  /* ---------------------------------------------------------------- вердикт: главное одной фразой */
  const PHRASE = Object.fromEntries(BLOCK_ORDER.map(b => [b, BK[b].phrase]));
  function tally(rk) { const t = { red: [], amber: [], ok: [], none: [], inner: [] }; MS.forEach(m => t[stKey(m, rk)].push(m)); return t; }
  function blockState(b, rk) {
    const st = MS.filter(m => m.block === b).map(m => stKey(m, rk));
    return st.includes('red') ? 'red' : (st.includes('amber') || st.includes('inner')) ? 'amber' : 'ok';
  }
  function verdict(rk) {
    const bs = BLOCK_ORDER.map(b => ({ b, s: blockState(b, rk) })), rankS = { red: 0, amber: 1, ok: 2 };
    bs.sort((a, b) => rankS[a.s] - rankS[b.s] || BLOCK_ORDER.indexOf(a.b) - BLOCK_ORDER.indexOf(b.b));
    if (bs.every(x => x.s === 'ok')) return 'Всё в норме: ни одна метрика не в красной и не в жёлтой зоне.';
    const rest = bs.slice(1);
    const tail = rest.every(x => x.s === 'ok') ? 'Остальное в норме.'
      : rest.map(x => PHRASE[x.b][x.s].toLowerCase()).join(', ').replace(/^./, c => c.toUpperCase()) + '.';
    return `${PHRASE[bs[0].b][bs[0].s]}. ${tail}`;
  }
  function verdictSub(rk) {
    const t = tally(rk), f = m => `${m.name} ${fmtC(fact(rk, m.eng).value_final, m)}`;
    const join = a => a.length === 1 ? a[0] : a.slice(0, -1).join(', ') + ' и ' + a[a.length - 1];
    const parts = [];
    if (t.red.length) parts.push(`В красной зоне: ${join(t.red.map(f))}.`);
    if (t.amber.length) parts.push(`В жёлтой: ${join(t.amber.map(f))}.`);
    t.inner.slice(0, 2).forEach(m => { const b = breach(m, rk); parts.push(`${m.name}: порог пробит у ${b.red} из ${b.total} ${plural(b.total, ['юнита', 'юнитов', 'юнитов'])}.`); });
    return parts.join(' ') || 'Пороги витрины нигде не пробиты.';
  }

  /* ---------------------------------------------------------------- каркас страницы */
  const app = $('#app');
  app.setAttribute('lang', 'ru');
  app.innerHTML = `
    <header class="hdr">
      <div class="bar">
        <span class="mark">COO${NB}Hub</span>
        <button class="unitbtn press" id="unitBtn" aria-label="Сменить юнит"><span id="unitName"></span>${ICON.chev}</button>
        <span class="sp"></span>
        <button class="icob press" id="themeBtn"></button>
      </div>
      <nav class="seg" id="seg" aria-label="Разделы">
        <span class="ind" id="segInd"></span>
        <button data-sec="radar" class="on">Главное</button><button data-sec="issues">Где болит</button><button data-sec="map">Продукты</button><button data-sec="all">Метрики</button>
      </nav>
    </header>
    <main class="wrap">
      <section class="sec" id="radar" aria-label="Главное">
        <div class="inst" id="inst">
          <div class="glow" id="glow"></div>
          <div class="top"><span class="live"><i></i>данные на ${esc(dateShort)}</span><span class="sp"></span><span class="lbl">${esc(META.period_label)}</span></div>
          <div class="ringwrap"><svg class="ring" id="ring" viewBox="0 0 320 320" role="group" aria-label="Радар: ${MS.length} ${plural(MS.length, ['метрика', 'метрики', 'метрик'])} по ${['', 'одному', 'двум', 'трём', 'четырём', 'пяти', 'шести'][BLOCK_ORDER.length] || BLOCK_ORDER.length} ${BLOCK_ORDER.length === 1 ? 'блоку' : 'блокам'}"></svg>
            <div class="halos" id="halos"></div>
            <div class="center" id="center"><div class="big" id="cNum">0</div><div class="cap" id="cCap"></div><div class="cap2" id="cCap2"></div></div></div>
          <h1 class="verdict" id="verdict"></h1>
          <p class="vsub" id="vsub"></p>
          <div class="legend">${['red', 'amber', 'ok', 'inner', 'none'].map(s => `<span>${GLYPH[s]}${s === 'none' && ANY_NODATA ? 'без порога или данных' : ST_LABEL[s]}</span>`).join('')}</div>
          <div class="acts">
            <button class="play press" id="briefBtn"><span class="pi">${ICON.play}</span>Брифинг <small id="briefLen"></small></button>
            <span class="src">Сводка собрана по порогам витрины,<br>без ручных оценок</span>
          </div>
        </div>
      </section>

      <section class="sec" id="issues" aria-label="Где болит">
        <div class="sec-head"><h2>Где болит</h2><span class="n" id="issN"></span><span class="sp"></span><span class="lbl">листайте →</span></div>
        <div class="rail" id="rail"></div>
        <div class="pager" id="pager"></div>
      </section>

      <section class="sec" id="map" aria-label="Продукты">
        <div class="sec-head"><h2>Продукты</h2><span class="sp"></span>
          <div class="toggle ${S.view === 'rank' ? 'rank' : ''}" id="viewT"><span class="ti"></span><button data-view="map" class="${S.view === 'map' ? 'on' : ''}">Карта</button><button data-view="rank" class="${S.view === 'rank' ? 'on' : ''}">Рейтинг</button></div></div>
        <div class="mchips" id="mchips"></div>
        <div class="crumbs" id="crumbs"></div>
        <div id="mapBody"><div class="tm" id="tm"></div></div>
        <p class="tm-note" id="tmNote"></p>
      </section>

      <section class="sec" id="all" aria-label="Все метрики">
        <div class="sec-head"><h2>Все метрики</h2><span class="n">${MS.length}</span></div>
        <div id="list" style="display:grid;gap:12px"></div>
        <p class="foot">${esc(META.source)} · ${esc(META.disclaimer)}</p>
      </section>
    </main>
    <div class="scrim" id="scrim"></div>
    <section class="sheet" id="sheet" role="dialog" aria-modal="true" aria-labelledby="shTitle"><div class="grab" id="grab"><i></i></div><div class="body" id="shBody"></div></section>
    <div class="brief" id="brief" hidden role="dialog" aria-modal="true" aria-label="Брифинг">
      <div class="bg" id="bBg"></div>
      <div class="bbars" id="bBars"></div>
      <div class="btop"><span class="who" id="bWho"></span><span class="sp"></span><button id="bClose" aria-label="Закрыть брифинг">${ICON.x}</button></div>
      <div class="bstage" id="bStage" aria-live="polite"></div>
      <div class="bhint">касание — дальше · удержание — пауза · вниз — закрыть</div>
    </div>
    <div class="toast" id="toast" role="status">${ICON.check}<span></span></div>`;

  /* ---------------------------------------------------------------- как не сдвинуть то, на что смотрят */
  const hdrH = () => $('.hdr').getBoundingClientRect().height;
  const SECS = ['radar', 'issues', 'map', 'all'];
  function anchored(fn) {
    const line = hdrH() + 8;
    const a = SECS.map(id => document.getElementById(id)).find(s => s.getBoundingClientRect().bottom > line) || $('#radar');
    const y0 = a.getBoundingClientRect().top;
    fn();
    const dy = a.getBoundingClientRect().top - y0;
    if (Math.abs(dy) > .5) scrollBy(0, dy);
  }

  /* ---------------------------------------------------------------- радар */
  const RING = { C: 160, R: 116, dots: [], arcs: [] };
  (function buildRing() {
    const svg = $('#ring'), { C, R } = RING, gap = 18, step = (360 - BLOCK_ORDER.length * gap) / MS.length;
    const rad = a => a * Math.PI / 180, P = (a, r) => [C + r * Math.cos(rad(a)), C + r * Math.sin(rad(a))];
    const byB = BLOCK_ORDER.map(b => MS.filter(m => m.block === b));
    let a = -90 - (byB[0].length - 1) * step / 2, k = 0, out = `<defs>${NEON('dglow')}${NEON('aglow')}</defs>`;
    for (let i = 0; i < 72; i++) { const [x1, y1] = P(i * 5, R + 14), [x2, y2] = P(i * 5, R + (i % 6 ? 17 : 20)); out += `<line class="tick" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`; }
    out += `<circle class="track" cx="${C}" cy="${C}" r="${R}"/>`;
    const dots = [];
    byB.forEach((list, bi) => {
      const a0 = a - 8, a1 = a + (list.length - 1) * step + 8;
      const [sx, sy] = P(a0, R), [ex, ey] = P(a1, R), large = a1 - a0 > 180 ? 1 : 0, len = R * rad(a1 - a0);
      out += `<path class="arc" data-b="${BLOCK_ORDER[bi]}" filter="url(#aglow)" style="--len:${len.toFixed(1)}" d="M${sx.toFixed(1)} ${sy.toFixed(1)} A${R} ${R} 0 ${large} 1 ${ex.toFixed(1)} ${ey.toFixed(1)}"/>`;
      const mid = (a0 + a1) / 2, [lx, ly] = P(mid, R + 34);
      out += `<text class="blab" x="${lx.toFixed(1)}" y="${(ly + 3).toFixed(1)}" text-anchor="middle">${esc(RING_NICK[BLOCK_ORDER[bi]])}</text>`;
      list.forEach((m, i) => { const [x, y] = P(a + i * step, R); dots.push({ m, x, y, k: k++ }); });
      a += (list.length - 1) * step + step + gap;
    });
    dots.forEach(d => {
      out += `<g class="dot" data-eng="${d.m.eng}" tabindex="0" role="button" transform="translate(${d.x.toFixed(1)} ${d.y.toFixed(1)})">
        <g class="pop" style="--i:${d.k}" filter="url(#dglow)">
          <circle class="hit" r="19"/>
          <circle class="s s-red" r="8.5"/>
          <path class="s s-amber" d="M0 -9.5 9.5 0 0 9.5 -9.5 0z"/>
          <path class="s s-ok" d="M-5.2 .4 -1.6 4 5.4 -4.2"/>
          <circle class="s s-none" r="6"/>
          <g class="s s-inner"><circle r="7.2"/><circle r="2.8"/></g>
          <circle class="ring-sel" r="14"/>
        </g></g>`;
    });
    svg.innerHTML = out;
    RING.dots = dots;
  })();

  function updateRadar(first) {
    const rk = S.unit, t = tally(rk);
    $$('#ring .dot').forEach(g => {
      const m = M(g.dataset.eng), s = stKey(m, rk), f = fact(rk, m.eng);
      g.setAttribute('class', 'dot ' + s);
      g.setAttribute('aria-label', `${m.name}: ${fmtC(f.value_final, m)}, ${stLab(s, m, rk)}`);
    });
    $$('#ring .arc').forEach(p => p.setAttribute('class', 'arc ' + blockState(p.dataset.b, rk)));
    $('#halos').innerHTML = RING.dots.filter(d => stKey(d.m, rk) === 'red')
      .map(d => `<i style="left:${(d.x / 3.2).toFixed(2)}%;top:${(d.y / 3.2).toFixed(2)}%"></i>`).join('');
    const tension = (2 * t.red.length + t.amber.length + t.inner.length) / Math.max(1, 2 * (MS.length - t.none.length));
    $('#glow').style.setProperty('--tension', clamp(Math.round(tension * 220), 8, 92) + '%');
    $('#center').classList.remove('peeking');
    const big = $('#cNum'); big.style.fontSize = '';
    setNum(big, 'c-num', t.red.length, x => String(Math.round(x)), first && !reduce() ? { from: 0, dur: 900 } : {});
    $('#cCap').textContent = t.red.length ? `${plural(t.red.length, ['метрика', 'метрики', 'метрик'])} в красной зоне` : 'в красной зоне пусто';
    const edge = t.amber.length + t.inner.length;
    $('#cCap2').textContent = `${edge ? `${edge} на грани · ` : ''}${t.ok.length} в норме`;
    $('#verdict').textContent = verdict(rk);
    $('#vsub').textContent = verdictSub(rk);
    $('#unitName').textContent = byRk[rk].functional_unit_nm;
    $('#briefLen').textContent = '· ' + Math.round(briefSlides().reduce((s, x) => s + x.dur, 0) / 5) * 5 + ' сек';
  }
  function peek(eng) {
    const m = M(eng), f = fact(S.unit, eng), c = $('#center'), big = $('#cNum');
    c.classList.add('peeking');
    cancelAnimationFrame(big._raf);
    big.textContent = fmtC(f.value_final, m);
    fit(big, c.clientWidth - 8, .6);
    $('#cCap').innerHTML = `<span class="peek">${esc(m.name)}</span>`;
    $('#cCap2').textContent = stLab(stKey(m, S.unit), m, S.unit);
    $$('#ring .dot').forEach(g => g.classList.toggle('sel', g.dataset.eng === eng));
  }
  function unpeek() { $$('#ring .dot').forEach(g => g.classList.remove('sel')); updateRadar(false); }
  $('#ring').addEventListener('pointerover', e => { const g = e.target.closest('.dot'); if (g && e.pointerType === 'mouse') peek(g.dataset.eng); });
  $('#ring').addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') unpeek(); });
  $('#ring').addEventListener('focusin', e => { const g = e.target.closest('.dot'); if (g) peek(g.dataset.eng); });
  $('#ring').addEventListener('focusout', () => unpeek());
  $('#ring').addEventListener('click', e => { const g = e.target.closest('.dot'); if (g) { buzz(); openMetric(g.dataset.eng); } });
  $('#ring').addEventListener('keydown', e => { const g = e.target.closest('.dot'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openMetric(g.dataset.eng); } });

  /* ---------------------------------------------------------------- шкала порогов */
  function zonesSVG(m, f, compact, t) {
    const W = 300, H = compact ? 30 : 46, y = compact ? 6 : 18, bh = 8;
    const vals = [t.red, t.yellow, f.value_final], lo0 = Math.min(...vals), hi0 = Math.max(...vals);
    const pad = (hi0 - lo0) * 0.28 + (m.vt === 'perc' ? 3 : 1);
    const mn = m.vt === 'perc' ? Math.max(0, lo0 - pad) : lo0 - pad, mx = m.vt === 'perc' ? Math.min(100, hi0 + pad) : hi0 + pad;
    const X = v => clamp((v - mn) / (mx - mn), 0, 1) * W;
    const r = X(t.red), yl = X(t.yellow), v = X(f.value_final);
    const seg = (a, b, c) => b > a ? `<rect class="z ${c}" x="${a.toFixed(1)}" y="${y}" width="${(b - a).toFixed(1)}" height="${bh}"/>` : '';
    let s = `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">`;
    s += m.tdir === 'up' ? seg(0, r, 'bad') + seg(r, yl, 'warn') + seg(yl, W, 'good') : seg(0, yl, 'good') + seg(yl, r, 'warn') + seg(r, W, 'bad');
    s += `<rect class="mk" x="${(v - 1.5).toFixed(1)}" y="${y - 5}" width="3" height="${bh + 10}" rx="1.5"/>`;
    if (!compact) {
      s += `<text class="zv" x="${v.toFixed(1)}" y="${y - 8}" text-anchor="${v > W * .8 ? 'end' : v < W * .2 ? 'start' : 'middle'}">${esc(fmtC(f.value_final, m))}</text>`;
      s += `<text class="zl" x="${r.toFixed(1)}" y="${y + bh + 16}" text-anchor="middle">красный ${esc(thr(m, t.red))}</text>`;
      s += `<text class="zl" x="${yl.toFixed(1)}" y="${y + bh + 16}" text-anchor="middle">жёлтый ${esc(thr(m, t.yellow))}</text>`;
    }
    return s + '</svg>';
  }
  const zonesOK = (m, rk) => TH(m, rk).red != null && !fact(rk, m.eng).nodata && m.ttype === 'value' && (m.threshold_scope === 'any_level' || byRk[rk].leaf);

  /* ---------------------------------------------------------------- «Где болит» */
  function issuesOf(rk) {
    const out = [];
    MS.forEach(m => { if (statusOf(m, rk) === 'red') out.push({ m, kind: 'red' }); });
    MS.forEach(m => { if (stKey(m, rk) === 'inner') out.push({ m, kind: 'inner' }); });
    MS.forEach(m => { if (statusOf(m, rk) === 'amber') out.push({ m, kind: 'amber' }); });
    return out;
  }
  const actions = eng => `<div class="ia"><button class="btn primary press" data-copy="${eng}">${ICON.copy}Поручение</button><button class="btn press" data-where="${eng}">${ICON.pin}Где именно</button></div>`;
  function issueCard({ m, kind }) {
    const rk = S.unit, f = fact(rk, m.eng);
    if (kind === 'inner') {
      const b = breach(m, rk);
      return `<article class="issue" data-eng="${m.eng}">
        <div class="it"><span class="pill inner">${GLYPH.inner}пробито внутри</span><span class="blk">${esc(NICK[m.block])}</span></div>
        <h3>${esc(m.name)}</h3>
        <div class="iv"><span class="v">${b.red}${NB}из${NB}${b.total}</span><span class="fr">${plural(b.total, ['юнита', 'юнитов', 'юнитов'])} за порогом</span></div>
        <div class="ul">${b.worst.slice(0, 3).map(u => `<div>${GLYPH.red}${esc(u.functional_unit_nm)}<b>${fmtC(fact(u.functional_unit_rk, m.eng).value_final, m)}</b></div>`).join('')}</div>
        <p class="gapt">Порог ${esc(thr(m, m.yellow))}${NB}/${NB}${esc(thr(m, m.red))} задан на уровне юнита, поэтому считаем юниты, а не сумму.</p>
        ${m.cta ? `<div class="todo"><span class="lbl">Что сделать</span>${esc(m.cta)}</div>` : ''}
        ${actions(m.eng)}
      </article>`;
    }
    const st = statusOf(m, rk), gap = gapText(m, rk), th = TH(m, rk);
    return `<article class="issue" data-eng="${m.eng}">
      <div class="it"><span class="pill ${st}">${GLYPH[st]}${ST_LABEL[st]}</span><span class="blk">${esc(NICK[m.block])}</span></div>
      <h3>${esc(m.name)}</h3>
      <div class="iv"><span class="v" data-roll="iv-${m.eng}" data-v="${f.value_final}">${fmtC(f.value_final, m)}</span><span class="fr">${frac(m, f)}</span></div>
      ${zonesOK(m, rk) ? `<div class="zbar">${zonesSVG(m, f, true, th)}</div>` : ''}
      <p class="gapt">${gap ? `Чтобы выйти из зоны: <b>${esc(gap)}</b>` : `Порог: жёлтый ${esc(thr(m, th.yellow))}, красный ${esc(thr(m, th.red))}${m.ttype === 'mom' ? ' к прошлому месяцу' : ''}.`}</p>
      ${m.cta ? `<div class="todo"><span class="lbl">Что сделать</span>${esc(m.cta)}</div>` : ''}
      ${actions(m.eng)}
    </article>`;
  }
  function renderIssues(anim) {
    const list = issuesOf(S.unit), rail = $('#rail');
    $('#issN').textContent = list.length ? String(list.length) : '';
    rail.innerHTML = list.length ? list.map(issueCard).join('')
      : `<div class="calm">${GLYPH.ok}<div><b>Ничего не горит.</b><br><span style="color:var(--ink-2)">Все метрики с порогами в норме для «${esc(byRk[S.unit].functional_unit_nm)}».</span></div></div>`;
    $('#pager').innerHTML = list.length > 1 ? list.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('') : '';
    rail.scrollLeft = 0;
    $$('.issue .iv .v', rail).forEach(v => fit(v, v.parentElement.clientWidth, .55));
    if (anim && !reduce()) { rail.classList.remove('swap'); void rail.offsetWidth; rail.classList.add('swap'); }
    rollAll(rail);
  }
  let railRaf = 0;
  $('#rail').addEventListener('scroll', () => {
    cancelAnimationFrame(railRaf);
    railRaf = requestAnimationFrame(() => {
      const rail = $('#rail'), c = rail.firstElementChild; if (!c) return;
      const i = Math.round(rail.scrollLeft / (c.offsetWidth + 12));
      $$('#pager i').forEach((d, k) => d.classList.toggle('on', k === i));
    });
  }, { passive: true });

  /* ---------------------------------------------------------------- карта продуктов */
  function squarify(items, W, H) {
    const total = items.reduce((s, i) => s + i.v, 0) || 1, sc = W * H / total;
    const nodes = items.map(i => Object.assign({}, i, { a: i.v * sc })), out = [];
    let row = [], rx = 0, ry = 0, rw = W, rh = H;
    const worst = (r, side) => { const s = r.reduce((a, n) => a + n.a, 0), mx = Math.max(...r.map(n => n.a)), mn = Math.min(...r.map(n => n.a)); return Math.max(side * side * mx / (s * s), (s * s) / (side * side * mn)); };
    const lay = r => {
      const s = r.reduce((a, n) => a + n.a, 0);
      if (rw >= rh) { const cw = s / rh; let cy = ry; r.forEach(n => { const h = n.a / cw; out.push(Object.assign(n, { x: rx, y: cy, w: cw, h })); cy += h; }); rx += cw; rw -= cw; }
      else { const ch = s / rw; let cx = rx; r.forEach(n => { const w = n.a / ch; out.push(Object.assign(n, { x: cx, y: ry, w, h: ch })); cx += w; }); ry += ch; rh -= ch; }
    };
    let i = 0;
    while (i < nodes.length) {
      const side = Math.min(rw, rh), n = nodes[i];
      if (!row.length || worst(row.concat([n]), side) <= worst(row, side)) { row.push(n); i++; } else { lay(row); row = []; }
    }
    if (row.length) lay(row);
    return out;
  }
  const G = 3;
  const MAXK = Math.max(0, ...U.map(u => kids(u.functional_unit_rk).length));
  if (MAXK > 8) document.documentElement.style.setProperty('--tm-extra', Math.min(168, (MAXK - 8) * 18) + 'px');
  function layout(rk, W, H) {
    const ks = kids(rk);
    if (!ks.length) return [{ rk, x: G, y: G, w: W - 2 * G, h: H - 2 * G, leaf: true }];
    // маленький юнит рисуем не мельче 45% средней плитки: иначе в нём не поместится ни имя, ни число, и в него не попасть пальцем
    const hc = ks.map(u => +u.headcount || 0), sum = hc.reduce((a, b) => a + b, 0), floor = sum ? sum / ks.length * .45 : 1;
    return squarify(ks.map((u, i) => ({ rk: u.functional_unit_rk, v: Math.max(hc[i], floor) })).sort((a, b) => b.v - a.v), W, H)
      .map(r => ({ rk: r.rk, x: Math.round(r.x + G), y: Math.round(r.y + G), w: Math.round(Math.max(0, r.w - 2 * G)), h: Math.round(Math.max(0, r.h - 2 * G)) }));
  }
  function tileInner(r, m) {
    const u = byRk[r.rk], f = fact(r.rk, m.eng), s = stKey(m, r.rk);
    if (r.leaf) {
      const cuts = f.cuts && f.cuts.oper ? f.cuts.oper : null;
      const tot = cuts ? cuts.parts.reduce((a, p) => a + p.num, 0) || 1 : 1;
      return `<span class="tn">${esc(u.functional_unit_nm)}</span>
        <span class="pill ${s}" style="align-self:flex-start">${GLYPH[s]}${stLab(s, m, r.rk)}</span>
        <span class="tv">${tvHTML(f.value_final, m)}</span>
        <span class="note">${esc(m.name)} · ${frac(m, f)}. Конечный юнит каталога${cuts ? ': ниже — разрез по сегментам сотрудников.' : '.'}</span>
        ${cuts ? `<span class="cuts">${cuts.parts.map(p => `<span class="cutrow"><span>${esc(p.name)}</span><span class="bar"><i style="width:${(100 * p.num / tot).toFixed(1)}%"></i></span><b>${m.type === 2 && p.den ? num(100 * p.num / p.den, 1) + '%' : fmtC(p.num, m)}</b></span>`).join('')}</span>` : ''}`;
    }
    const b = s === 'inner' ? breach(m, r.rk) : null, nk = kids(r.rk).length;
    return `<span class="tn">${esc(u.functional_unit_nm)}</span>
      <span class="hc">${hcText(u) || `${nk}${NB}внутри`}${hcText(u) && nk ? `<span class="hk"> · ${nk}${NB}внутри</span>` : ''}</span>
      <span class="tvr">${GLYPH[s]}<span class="tv">${tvHTML(f.value_final, m)}</span></span>
      <span class="tm2">${b ? `${b.red} из ${b.total} за порогом` : stLab(s, m, r.rk)}</span>`;
  }
  // тонкая полоса — имя и число в одну строку; совсем крошка — только число, имя остаётся в подписи для чтения с экрана
  const sizeCls = r => r.leaf ? 'leaf' : (r.h < 50 && r.w >= 2.2 * r.h) ? 'xs row' : (r.w < 64 || r.h < 46) ? 'xs dot'
    : (r.w < 84 || r.h < 60) ? 'xs' : (r.w < 150 || r.h < 96) ? 'sm' : '';
  function tileEl(r, m) {
    const s = stKey(m, r.rk), b = document.createElement('button');
    b.className = `tile press ${s} ${sizeCls(r)}`;
    b.dataset.rk = r.rk;
    b.style.cssText = `left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px`;
    b.setAttribute('aria-label', `${byRk[r.rk].functional_unit_nm}: ${fmtC(fact(r.rk, m.eng).value_final, m)}, ${stLab(s, m, r.rk)}`);
    b.innerHTML = `<span class="tbg"></span><span class="tc">${tileInner(r, m)}</span>`;
    return b;
  }
  // подгонка плиток один раз при отрисовке и пачкой: сначала все записи, потом все чтения,
  // поэтому раскладка пересчитывается несколько раз на всю карту, а не по разу на каждую строку каждой плитки
  function fitTiles(tiles) {
    const it = tiles.map(t => ({ t, tc: t.querySelector('.tc'), tv: t.querySelector('.tv'), tvr: t.querySelector('.tvr'), leaf: t.classList.contains('leaf') })).filter(x => x.tc && x.tv);
    const sizeUp = () => {
      it.forEach(x => { x.tv.style.fontSize = ''; });
      it.forEach(x => { x.w = x.tv.scrollWidth; x.max = x.leaf ? x.tc.clientWidth - 36 : x.tvr.clientWidth - 22; x.fs = parseFloat(getComputedStyle(x.tv).fontSize); });
      it.forEach(x => { if (x.max > 0 && x.w > x.max) x.tv.style.fontSize = Math.max(12, x.fs * .45, Math.floor(x.fs * x.max / x.w * 10) / 10 - .3) + 'px'; });
    };
    sizeUp();
    [0, 1].forEach(step => {
      it.forEach(x => { x.over = x.tc.scrollHeight > x.tc.clientHeight + 1; });
      it.forEach(x => { if (x.over) { const e = x.tc.querySelector('.' + (x.leaf ? ['note', 'cuts'] : ['tm2', 'hc'])[step]); if (e) e.style.display = 'none'; } });
    });
    // что всё ещё не влезло, ужимаем по ступеням: мельче шрифт → имя в одну строку → только число
    for (const cls of ['xs', 'tight', 'dot']) {
      it.forEach(x => { x.over = !x.leaf && x.tc.scrollHeight > x.tc.clientHeight + 1; });
      if (!it.some(x => x.over)) break;
      it.forEach(x => { if (x.over) x.t.classList.add(cls); });
      sizeUp();
    }
  }
  const rectOf = el => ({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
  // перевести плитку с прямоугольника r на прямоугольник a — только transform фона, текст не растягивается
  const T = (a, r) => `translate3d(${(a.x - r.x).toFixed(2)}px, ${(a.y - r.y).toFixed(2)}px, 0) scale(${(a.w / r.w).toFixed(4)}, ${(a.h / r.h).toFixed(4)})`;
  const ZDUR = 480, ZE = 'cubic-bezier(.05,.7,.1,1)';
  function zoomIn(layer, old, rects, how, W, H) {
    const fr = how.from, sx = W / fr.w, sy = H / fr.h, jobs = [];
    rects.forEach(r => {
      const el = layer.querySelector(`[data-rk="${r.rk}"]`);
      const a = { x: fr.x + r.x / sx, y: fr.y + r.y / sy, w: r.w / sx, h: r.h / sy };
      jobs.push(el.querySelector('.tbg').animate([{ transform: T(a, r) }, { transform: 'none' }], { duration: ZDUR, easing: ZE }).finished);
      el.querySelector('.tc').animate([{ opacity: 0, transform: 'translate3d(0,8px,0)' }, { opacity: 0, transform: 'translate3d(0,8px,0)', offset: .4 }, { opacity: 1, transform: 'none' }], { duration: ZDUR, easing: 'ease-out' });
    });
    [...old.children].forEach(el => {
      const o = rectOf(el), z = { x: (o.x - fr.x) * sx, y: (o.y - fr.y) * sy, w: o.w * sx, h: o.h * sy }, hit = el.dataset.rk === how.rk;
      el.querySelector('.tc').animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, fill: 'forwards' });
      const kf = hit ? [{ transform: 'none', opacity: 1 }, { transform: T(z, o), opacity: 1, offset: .7 }, { transform: T(z, o), opacity: 0 }]
        : [{ transform: 'none', opacity: 1 }, { transform: T(z, o), opacity: 0 }];
      jobs.push(el.querySelector('.tbg').animate(kf, { duration: ZDUR, easing: ZE, fill: 'forwards' }).finished);
    });
    Promise.all(jobs).then(() => old.remove(), () => old.remove());
  }
  function zoomOut(layer, old, rects, how, W, H) {
    const cr = rects.find(r => r.rk === how.fromRk);
    if (!cr) { old.remove(); return; }
    const sx = W / cr.w, sy = H / cr.h, jobs = [];
    rects.forEach(r => {
      const el = layer.querySelector(`[data-rk="${r.rk}"]`), z = { x: (r.x - cr.x) * sx, y: (r.y - cr.y) * sy, w: r.w * sx, h: r.h * sy };
      el.querySelector('.tbg').animate([{ transform: T(z, r), opacity: r.rk === how.fromRk ? 1 : 0 }, { transform: 'none', opacity: 1 }], { duration: ZDUR, easing: ZE });
      el.querySelector('.tc').animate([{ opacity: 0 }, { opacity: 0, offset: .45 }, { opacity: 1 }], { duration: ZDUR, easing: 'ease-out' });
    });
    [...old.children].forEach(el => {
      const o = rectOf(el), a = { x: cr.x + o.x / sx, y: cr.y + o.y / sy, w: o.w / sx, h: o.h / sy };
      el.querySelector('.tc').animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, fill: 'forwards' });
      jobs.push(el.querySelector('.tbg').animate([{ transform: 'none', opacity: 1 }, { transform: T(a, o), opacity: 0 }], { duration: ZDUR * .8, easing: ZE, fill: 'forwards' }).finished);
    });
    Promise.all(jobs).then(() => old.remove(), () => old.remove());
  }
  function renderChips() {
    const rk = S.unit, c = $('#mchips');
    c.innerHTML = MS.map(m => `<button class="press ${m.eng === S.metric ? 'on' : ''}" data-metric="${m.eng}">${GLYPH[stKey(m, rk)]}${esc(m.name)}</button>`).join('');
    const on = $('#mchips .on');
    if (on) {
      const l = on.offsetLeft, r = l + on.offsetWidth;
      if (l < c.scrollLeft + 16 || r > c.scrollLeft + c.clientWidth - 16) c.scrollTo({ left: l - c.clientWidth / 2 + on.offsetWidth / 2, behavior: reduce() ? 'auto' : 'smooth' });
    }
  }
  function renderCrumbs() {
    const p = path(S.unit);
    $('#crumbs').innerHTML = (p.length > 1 ? `<button class="back press" data-unit="${p[p.length - 2].functional_unit_rk}" aria-label="Назад">${ICON.back}</button>` : '')
      + p.map((u, i) => `${i ? '<i>›</i>' : ''}<button class="${i === p.length - 1 ? 'cur' : ''}" data-unit="${u.functional_unit_rk}">${esc(u.functional_unit_nm)}</button>`).join('');
  }
  function renderMap(mode, how = {}) {
    renderChips(); renderCrumbs();
    const m = M(S.metric), host = $('#mapBody');
    $('#tmNote').textContent = S.view === 'map'
      ? (byRk[S.unit].leaf ? 'Это конечный юнит каталога. Вернуться — стрелкой слева от названия.' : `${HAS_HC ? 'Площадь плитки — численность юнита' : 'Плитки одной площади: численности в выгрузке нет'}, цвет — статус выбранной метрики по порогам витрины. Нажмите на плитку, чтобы провалиться внутрь.${kids(S.unit).length > 12 ? ' Юнитов много — имена мелких плиток видны в рейтинге.' : ''}`)
      : (m.type === 2 ? 'Шкала 0–100%, штрих — жёлтый порог. Сверху — хуже всех.' : 'Шкала от нуля до максимума среди юнитов. Сверху — хуже всех.');
    if (S.view === 'rank') {
      host.innerHTML = rankHTML(m);
      rollAll(host);
      if (mode !== 'update' && !reduce()) host.firstElementChild.classList.add('swap');
      return;
    }
    let tm = $('#tm');
    if (!tm) { host.innerHTML = '<div class="tm" id="tm"></div>'; tm = $('#tm'); mode = 'init'; }
    const W = tm.clientWidth, H = tm.clientHeight, rects = layout(S.unit, W, H);
    const layers = $$('.tm-layer', tm), old = layers[layers.length - 1] || null;
    layers.forEach(l => { if (l !== old) l.remove(); });   // прерванная анимация не оставляет мусора
    if (mode === 'update' && old && old.dataset.unit === S.unit) {
      rects.forEach(r => {
        const t = old.querySelector(`[data-rk="${r.rk}"]`); if (!t) return;
        t.className = `tile press ${stKey(m, r.rk)} ${sizeCls(r)}`;
        t.querySelector('.tc').innerHTML = tileInner(r, m);
      });
      fitTiles($$('.tile', old));
      rects.forEach(r => { const t = old.querySelector(`[data-rk="${r.rk}"]`); if (t) roll(t.querySelector('.tv'), 'tv-' + r.rk, fact(r.rk, m.eng).value_final); });
      return;
    }
    const layer = document.createElement('div');
    layer.className = 'tm-layer'; layer.dataset.unit = S.unit;
    rects.forEach(r => layer.appendChild(tileEl(r, m)));
    const out = mode === 'out' && old;
    if (out) tm.insertBefore(layer, old); else tm.appendChild(layer);
    fitTiles($$('.tile', layer));
    rects.forEach(r => PREV.set('tv-' + r.rk, fact(r.rk, m.eng).value_final));
    const can = !reduce() && old && typeof layer.animate === 'function';
    if (can && mode === 'in' && how.from) zoomIn(layer, old, rects, how, W, H);
    else if (can && out && how.fromRk) zoomOut(layer, old, rects, how, W, H);
    else {
      if (old) old.remove();
      if (!reduce() && mode !== 'init' && typeof layer.animate === 'function') layer.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: 'ease-out' });
    }
  }
  function rankHTML(m) {
    const rk = S.unit, ks = kids(rk);
    if (!ks.length) return `<div class="rank"><p class="tm-note" style="padding:8px 0">У «${esc(byRk[rk].functional_unit_nm)}» нет юнитов внутри — это конечный уровень каталога.</p></div>`;
    const rows = ks.map(u => ({ u, f: fact(u.functional_unit_rk, m.eng), s: stKey(m, u.functional_unit_rk) }));
    rows.sort(worseFirst(m, r => r.f.value_final));
    const mx = m.vt === 'perc' ? 100 : Math.max(1, ...rows.map(r => r.f.value_final).filter(v => !nil(v)));
    const tickOf = rk => { const t = TH(m, rk); return m.vt === 'perc' && t.red != null && m.threshold_scope === 'any_level' ? t.yellow : null; };
    return `<div class="rank">${rows.map((r, i) => { const tick = tickOf(r.u.functional_unit_rk); return `<button class="rk press ${r.s}" data-drill="${r.u.functional_unit_rk}">
      ${GLYPH[r.s]}<span class="n">${esc(r.u.functional_unit_nm)}<small>${m.type === 2 || r.f.nodata ? fracShort(m, r.f) : hcText(r.u)}${r.s === 'inner' ? ` · за порогом ${breach(m, r.u.functional_unit_rk).red}` : ''}</small></span>
      <span class="v" data-roll="rk-${r.u.functional_unit_rk}" data-v="${r.f.value_final}">${fmtC(r.f.value_final, m)}</span>
      <span class="track"><i style="width:${clamp(100 * Math.max(0, r.f.value_final || 0) / mx, 1.5, 100).toFixed(1)}%;animation-delay:${i * 40}ms"></i>${tick != null ? `<u style="left:${tick}%"></u>` : ''}</span>
    </button>`; }).join('')}</div>`;
  }
  $('#mapBody').addEventListener('click', e => {
    const t = e.target.closest('.tile');
    if (t && !t.classList.contains('leaf')) {
      buzz();
      setUnit(t.dataset.rk, { mode: 'in', from: rectOf(t), rk: t.dataset.rk });
      return;
    }
    const d = e.target.closest('[data-drill]');
    if (d) { buzz(); setUnit(d.dataset.drill, { mode: 'fade' }); }
  });
  $('#crumbs').addEventListener('click', e => {
    const b = e.target.closest('[data-unit]'); if (!b || b.classList.contains('cur')) return;
    const target = b.dataset.unit, trail = path(S.unit).map(u => u.functional_unit_rk);
    const idx = trail.indexOf(target), fromRk = idx >= 0 ? trail[idx + 1] : null;
    setUnit(target, { mode: 'out', fromRk });
  });
  $('#mchips').addEventListener('click', e => {
    const b = e.target.closest('[data-metric]'); if (!b) return;
    S.metric = b.dataset.metric; S.pinned = true; save();
    renderMap('update');
  });
  $('#viewT').addEventListener('click', e => {
    const b = e.target.closest('[data-view]'); if (!b || b.dataset.view === S.view) return;
    S.view = b.dataset.view; save();
    $('#viewT').classList.toggle('rank', S.view === 'rank');
    $$('#viewT button').forEach(x => x.classList.toggle('on', x === b));
    anchored(() => { $('#mapBody').innerHTML = ''; renderMap('fade'); });
  });

  /* ---------------------------------------------------------------- все метрики */
  function sparkSVG(vals, st) {
    const W = 56, H = 24, p = 2.5, v = vals.filter(x => !nil(x));
    if (!v.length) return `<svg class="sp-svg ${st}" viewBox="0 0 ${W} ${H}" aria-hidden="true"></svg>`;
    const mn = Math.min(...v), mx = Math.max(...v);
    const X = i => p + (W - 2 * p) * i / Math.max(1, v.length - 1), Y = t => mx === mn ? H / 2 : p + (H - 2 * p) * (1 - (t - mn) / (mx - mn));
    const pts = v.map((t, i) => `${X(i).toFixed(1)},${Y(t).toFixed(1)}`).join(' ');
    return `<svg class="sp-svg ${st}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><polygon class="a" points="${p},${H} ${pts} ${W - p},${H}"/><polyline class="l" points="${pts}"/><circle class="p" cx="${X(v.length - 1).toFixed(1)}" cy="${Y(v[v.length - 1]).toFixed(1)}" r="2.6"/></svg>`;
  }
  function renderList() {
    const rk = S.unit;
    $('#list').innerHTML = BLOCK_ORDER.map(b => {
      const ms = MS.filter(m => m.block === b), sts = ms.map(m => stKey(m, rk));
      const sum = ['red', 'amber', 'inner'].map(s => sts.filter(x => x === s).length ? `<span class="pill ${s}" style="padding:2px 7px 2px 5px;font-size:11px">${GLYPH[s]}${sts.filter(x => x === s).length}</span>` : '').join('');
      return `<div class="grp"><div class="grp-h"><h3>${esc(BK[b].name)}</h3><span class="sum">${sum}</span></div>
        ${ms.map(m => {
          const f = fact(rk, m.eng), s = stKey(m, rk), spark = tail(f, 9);
          const lvlCount = lvlScoped(m, rk) && breach(m, rk).total > 0;
          const sub = fracShort(m, f) || (s === 'inner' ? `пробито у ${breach(m, rk).red} из ${breach(m, rk).total}` : lvlCount ? `все ${breach(m, rk).total} юнитов в норме` : esc(m.unit_num || ''));
          return `<button class="row press" data-open="${m.eng}">
            ${GLYPH[s]}<span class="n"><span>${esc(m.name)}</span><small>${sub}</small></span>
            ${sparkSVG(spark, s)}
            <span class="val"><b data-roll="rv-${m.eng}" data-v="${f.value_final}">${fmtC(f.value_final, m)}</b><small class="${dcls(f.mom_value_final, m.change)}">${fmtCD(f.mom_value_final, m)}</small></span>
          </button>`;
        }).join('')}</div>`;
    }).join('');
    rollAll($('#list'));
  }
  $('#list').addEventListener('click', e => { const r = e.target.closest('[data-open]'); if (r) openMetric(r.dataset.open); });

  /* ---------------------------------------------------------------- шторка с пружиной */
  const SH = { el: $('#sheet'), body: $('#shBody'), scrim: $('#scrim'), y: 0, h: 0, open: false, stop: null, opener: null };
  function sheetSet(y) {
    SH.y = y;
    SH.el.style.transform = `translate3d(0,${Math.max(-40, y).toFixed(1)}px,0)`;
    SH.scrim.style.opacity = String(clamp(1 - y / Math.max(1, SH.h), 0, 1));
  }
  function openSheet(html, o = {}) {
    if (SH.stop) SH.stop();
    SH.opener = document.activeElement;
    SH.body.innerHTML = html;
    SH.body.scrollTop = 0;
    SH.el.classList.add('on'); SH.scrim.classList.add('on');
    document.body.style.overflow = 'hidden';
    SH.h = SH.el.offsetHeight;
    SH.open = true;
    if (o.after) o.after();
    if (!reduce()) { SH.body.classList.remove('enter'); void SH.body.offsetWidth; SH.body.classList.add('enter'); clearTimeout(SH.enterT); SH.enterT = setTimeout(() => SH.body.classList.remove('enter'), 900); }
    if (reduce()) sheetSet(0);
    else { sheetSet(SH.h); SH.stop = spring({ from: SH.h, to: 0, onUpdate: sheetSet }); }
    const t = $('#shTitle'); if (t) t.focus({ preventScroll: true });
  }
  function closeSheet(v = 0) {
    if (!SH.open) return;
    SH.open = false;
    if (SH.stop) SH.stop();
    const done = () => { SH.el.classList.remove('on'); SH.scrim.classList.remove('on'); SH.scrim.style.opacity = ''; SH.body.innerHTML = ''; document.body.style.overflow = ''; if (SH.opener && SH.opener.focus) SH.opener.focus({ preventScroll: true }); };
    if (reduce()) { sheetSet(SH.h); done(); return; }
    SH.stop = spring({ from: SH.y, to: SH.h + 24, v, k: 520, c: 46, onUpdate: sheetSet, onDone: done });
  }
  SH.scrim.addEventListener('click', () => closeSheet());
  addEventListener('keydown', e => { if (e.key === 'Escape') { if (!$('#brief').hidden) closeBrief(); else closeSheet(); } });
  (function dragSheet() {
    let y0 = 0, dragging = false, samples = [];
    const start = (y, fromBody) => { if (fromBody && SH.body.scrollTop > 0) return; y0 = y; dragging = fromBody ? 'maybe' : true; samples = [{ t: performance.now(), y: 0 }]; if (SH.stop) SH.stop(); };
    const move = (y, ev) => {
      if (!dragging) return;
      const dy = y - y0;
      if (dragging === 'maybe') { if (dy > 6) dragging = true; else if (dy < -4) { dragging = false; return; } else return; }
      if (ev && ev.cancelable) ev.preventDefault();
      sheetSet(dy > 0 ? dy : dy * 0.25);
      samples.push({ t: performance.now(), y: dy }); if (samples.length > 5) samples.shift();
    };
    const end = () => {
      if (dragging !== true) { dragging = false; return; }
      dragging = false;
      const a = samples[0], b = samples[samples.length - 1], v = (b.y - a.y) / Math.max(1, b.t - a.t);
      if (SH.y > SH.h * 0.28 || v > 0.55) closeSheet(v);
      else SH.stop = spring({ from: SH.y, to: 0, v, onUpdate: sheetSet });
    };
    const grab = $('#grab');
    grab.addEventListener('pointerdown', e => { start(e.clientY, false); grab.setPointerCapture(e.pointerId); });
    grab.addEventListener('pointermove', e => move(e.clientY));
    grab.addEventListener('pointerup', end); grab.addEventListener('pointercancel', end);
    SH.body.addEventListener('touchstart', e => start(e.touches[0].clientY, true), { passive: true });
    SH.body.addEventListener('touchmove', e => move(e.touches[0].clientY, e), { passive: false });
    SH.body.addEventListener('touchend', end, { passive: true });
  })();

  /* ---------------------------------------------------------------- график со скрабом */
  function niceTicks(a, b, n) {
    const span = b - a || 1, raw = span / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), st = [1, 2, 2.5, 5, 10].map(x => x * mag).find(x => x >= raw) || raw;
    const out = []; for (let v = Math.ceil(a / st) * st; v <= b + 1e-9; v += st) out.push(+v.toFixed(6));
    return out;
  }
  let CH = null;
  function chartHTML(m, f, rk) {
    if (f.nodata || !f.cur.some(v => !nil(v))) { CH = null; return `<p class="nodata">Нет данных за ${esc(META.period_label.toLowerCase())}.</p>`; }
    const ok = v => !nil(v), cur = f.cur, prev = f.yoy_known ? f.prev : null, showT = zonesOK(m, rk), th = TH(m, rk);
    const pool = cur.filter(ok).concat(prev ? prev.filter(ok) : [], showT ? [th.red, th.yellow] : []);
    let lo = Math.min(...pool), hi = Math.max(...pool); const pad = (hi - lo) * .12 || Math.abs(hi) * .1 || 1;
    lo -= pad; hi += pad; if (m.vt === 'perc') { lo = Math.max(0, lo); hi = Math.min(100, hi); } if (m.type === 1 && lo < 0 && Math.min(...pool) >= 0) lo = 0;
    const ticks = niceTicks(lo, hi, 3), labels = ticks.map(v => fmtC(v, m));
    const W = 340, H = 176, l = 8, r = Math.max(40, 12 + Math.max(...labels.map(s => s.length)) * 6), t = 18, b = 22, pw = W - l - r, ph = H - t - b;
    const X = i => l + pw * i / 11, Y = v => t + ph * (1 - (v - lo) / ((hi - lo) || 1));
    // пропуск в ряду — это пропуск, а не ноль: точки без данных просто не рисуем
    const line = arr => arr.map((v, i) => ok(v) ? `${X(i).toFixed(1)},${Y(v).toFixed(1)}` : null).filter(Boolean).join(' ');
    const idx = cur.map((v, i) => ok(v) ? i : -1).filter(i => i >= 0), i0 = idx[0], i1 = idx[idx.length - 1];
    let len = 0; for (let k = 1; k < idx.length; k++) len += Math.hypot(X(idx[k]) - X(idx[k - 1]), Y(cur[idx[k]]) - Y(cur[idx[k - 1]]));
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(m.name)} по месяцам ${YEAR}${prev ? ` и ${YEAR - 1}` : ''}"><defs>${NEON('neon')}</defs>`;
    ticks.forEach((v, i) => { s += `<line class="grid" x1="${l}" x2="${W - r}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/><text class="yl" x="${W - r + 6}" y="${(Y(v) + 3).toFixed(1)}">${esc(labels[i])}</text>`; });
    if (showT) [['red', th.red, 'красный'], ['amber', th.yellow, 'жёлтый']].forEach(([c, v, n]) => {
      s += `<line class="thr-${c}" x1="${l}" x2="${W - r}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/><text class="tl ${c}" x="${l + 2}" y="${(Y(v) - 4).toFixed(1)}">${n} ${esc(thr(m, v))}</text>`;
    });
    MONTHS.forEach((mm, i) => { if (i % 2 === 0 || i === cur.length - 1) s += `<text class="xl" x="${X(i).toFixed(1)}" y="${H - 5}" text-anchor="middle">${esc(mm)}</text>`; });
    if (prev) s += `<polyline class="l25" points="${line(prev)}"/>`;
    s += `<polygon class="area" points="${X(i0).toFixed(1)},${t + ph} ${line(cur)} ${X(i1).toFixed(1)},${t + ph}"/>`;
    s += `<polyline class="l26 draw" style="--len:${len.toFixed(0)}" points="${line(cur)}"/>`;
    s += `<circle class="end" cx="${X(i1).toFixed(1)}" cy="${Y(cur[i1]).toFixed(1)}" r="4.5"/>`;
    s += `<line class="cur" id="cCur" x1="0" x2="0" y1="${t - 6}" y2="${t + ph}"/><circle class="cdot" id="cDot" r="5" cx="0" cy="0"/></svg>`;
    CH = { X, Y, W };
    return s;
  }
  function bindScrub(m, f) {
    const el = $('#chart'); if (!el || !CH) return;
    const svg = el.querySelector('svg'), tip = $('#tip'), cur = f.cur, prev = f.yoy_known ? f.prev : null, { X, Y, W } = CH;
    const vEl = $('#shV'), wEl = $('#shW');
    // палец перескакивает месяцы без данных
    const valid = cur.map((v, i) => nil(v) ? -1 : i).filter(i => i >= 0);
    const near = i => valid.reduce((a, b) => Math.abs(b - i) < Math.abs(a - i) ? b : a, valid[0]);
    let idx = -1, box = null;
    const locate = cx => { box = box || svg.getBoundingClientRect(); const sx = (cx - box.left) / box.width * W; return near(clamp(Math.round((sx - X(0)) / (X(1) - X(0))), 0, cur.length - 1)); };
    const show = i => {
      if (i === idx) return; idx = i; buzz();
      el.classList.add('scrub');
      const x = X(i), y = Y(cur[i]);
      $('#cCur').setAttribute('x1', x); $('#cCur').setAttribute('x2', x);
      $('#cDot').setAttribute('cx', x); $('#cDot').setAttribute('cy', y);
      box = box || svg.getBoundingClientRect();
      const k = box.width / W;
      tip.textContent = '';
      const bv = document.createElement('b'); bv.textContent = fmtVal(cur[i], m.vt); tip.appendChild(bv);
      const sm = document.createElement('small'); sm.textContent = `${MONTHS[i]} ${YEAR}${prev ? ` · ${YEAR - 1}: ${fmtVal(prev[i], m.vt)}` : ''}`; tip.appendChild(sm);
      const half = tip.offsetWidth / 2;
      tip.style.transform = `translate3d(${clamp(x * k, half, box.width - half) - half}px, ${(y * k - tip.offsetHeight - 10).toFixed(1)}px, 0)`;
      cancelAnimationFrame(vEl._raf); vEl.textContent = fmtC(cur[i], m);
      wEl.textContent = `в ${MONTHS_IN[i]} ${YEAR}`;
    };
    const end = () => {
      if (idx < 0) return;
      const from = cur[idx]; idx = -1; box = null;
      el.classList.remove('scrub');
      setNum(vEl, 'sh-hero', f.value_final, x => fmtC(x, m), { from, dur: 260 });
      wEl.textContent = `${META.period_label.toLowerCase()} · сейчас`;
    };
    el.addEventListener('pointerdown', e => { box = null; show(locate(e.clientX)); });
    el.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' || idx >= 0) show(locate(e.clientX)); });
    el.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') end(); });
    el.addEventListener('pointercancel', end);
    el.addEventListener('pointerleave', end);
    el.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const pos = valid.indexOf(idx < 0 ? valid[valid.length - 1] : idx);
        show(valid[clamp(pos + (e.key === 'ArrowLeft' ? -1 : 1), 0, valid.length - 1)]);
      }
      if (e.key === 'Escape') end();
    });
    el.addEventListener('blur', end);
  }

  /* ---------------------------------------------------------------- карточка метрики */
  function metricHTML(eng) {
    const m = M(eng), rk = S.unit, u = byRk[rk], f = fact(rk, eng), s = stKey(m, rk), b = breach(m, rk);
    const ks = kids(rk).map(k => ({ k, f: fact(k.functional_unit_rk, eng), s: stKey(m, k.functional_unit_rk) }));
    ks.sort(worseFirst(m, x => x.f.value_final));
    const th = TH(m, rk), mp = m.ttype === 'mom' ? momPct(f) : null;
    const mx = m.vt === 'perc' ? 100 : Math.max(1, ...ks.map(x => Math.abs(x.f.value_final)));
    const need = s === 'red' || s === 'amber' || s === 'inner';
    const exact = m.type === 1 && Math.abs(f.value_final) >= 1e5 ? ` · точно ${fmtVal(f.value_final, m.vt)}${money(m) ? NB + '₽' : ''}` : '';
    return `
      <div class="sh-k">${GLYPH[s]}<span class="lbl">${esc(BK[m.block].name)} · ${esc(path(rk).map(x => x.functional_unit_nm).join(' › '))}</span></div>
      <h2 class="sh-t" id="shTitle" tabindex="-1" data-eng="${eng}">${esc(m.name)}</h2>
      <div class="sh-hero"><span class="v${f.nodata ? ' none' : ''}" id="shV">${f.nodata ? 'нет данных' : fmtC(f.value_final, m)}</span><span class="w" id="shW">${esc(META.period_label.toLowerCase())} · сейчас</span></div>
      <div class="sh-fr">${f.nodata ? '' : `${frac(m, f)}${exact}${frac(m, f) || exact ? ' · ' : ''}`}<span class="pill ${s}" style="vertical-align:middle">${GLYPH[s]}${stLab(s, m, rk)}</span></div>
      <div class="chart" id="chart" tabindex="0" aria-label="График: ведите пальцем, чтобы увидеть месяц">${chartHTML(m, f, rk)}<div class="tip" id="tip"></div></div>
      <div class="lg"><span><i></i>${YEAR}</span>${f.yoy_known ? `<span><i class="p"></i>${YEAR - 1}</span>` : `<span>за ${YEAR - 1} данных нет</span>`}<span class="hint">ведите пальцем</span></div>
      <div class="meta">
        <div><div class="l">к прошлому месяцу</div><div class="v ${dcls(f.mom_value_final, m.change)}">${fmtCD(f.mom_value_final, m)}${mp != null ? ` · ${mp > 0 ? '+' : ''}${num(mp, 1)}%` : ''}</div></div>
        <div><div class="l">к прошлому году</div><div class="v ${f.yoy_known ? dcls(f.yoy_value_final, m.change) : 'flat'}">${f.yoy_known ? fmtCD(f.yoy_value_final, m) : f.nodata ? '—' : `нет базы ${YEAR - 1}`}</div></div>
        <div><div class="l">пороги ж / к</div><div class="v">${th.red == null ? 'не заданы' : `${esc(thr(m, th.yellow))} / ${esc(thr(m, th.red))}${m.ttype === 'mom' ? NB + 'м\u2060/\u2060м' : ''}`}</div></div>
        <div><div class="l">хорошо, когда</div><div class="v">${m.change === 'up' ? 'растёт ↑' : 'снижается ↓'}</div></div>
      </div>
      ${zonesOK(m, rk) ? `<div class="zbar">${zonesSVG(m, f, false, th)}</div>` : ''}
      ${s === 'inner' ? `<div class="blk"><span class="lbl">Почему без цвета</span><p>Порог ${esc(thr(m, m.yellow))} / ${esc(thr(m, m.red))} задан на уровне юнита. Сумма по ${b.total} юнитам всегда больше, поэтому считаем юниты за порогом: <b>${b.red} из ${b.total}</b>.</p></div>` : ''}
      ${need && m.cta ? `<div class="blk todo2"><span class="lbl">Что сделать · call_to_action</span><p>${esc(m.cta)}</p>${gapText(m, rk) ? `<p style="color:var(--ink-2);font-size:13.5px;margin-top:6px">Чтобы выйти из зоны: ${esc(gapText(m, rk))}.</p>` : ''}<button class="btn primary press" data-copy="${eng}">${ICON.copy}Скопировать поручение</button></div>` : ''}
      ${ks.length ? `<div class="blk"><span class="lbl">Внутри «${esc(u.functional_unit_nm)}» · хуже сверху</span><div class="kids">${ks.map((x, i) => `<button class="kid-r press ${x.s}" data-drill="${x.k.functional_unit_rk}">
          ${GLYPH[x.s]}<span class="n">${esc(x.k.functional_unit_nm)}</span><span class="v">${fmtC(x.f.value_final, m)}</span>
          <span class="track"><i style="width:${clamp(100 * Math.abs(x.f.value_final) / mx, 1.5, 100).toFixed(1)}%;animation-delay:${80 + i * 45}ms"></i></span></button>`).join('')}</div></div>` : ''}
      <div class="blk"><span class="lbl">Как считается · metric_desc</span><p>${m.desc ? esc(m.desc) : '<span style="color:var(--muted)">В витрине описание не заполнено.</span>'}</p></div>
      <details class="more"><summary>Значения по месяцам</summary><div class="tbl-wrap"><table class="t"><tr><th>Месяц</th><th>${YEAR}</th>${f.yoy_known ? `<th>${YEAR - 1}</th>` : ''}</tr>
        ${MONTHS.map((mm, i) => `<tr><td>${esc(mm)}</td><td>${f.cur[i] != null ? fmtVal(f.cur[i], m.vt) : '—'}</td>${f.yoy_known ? `<td>${fmtVal(f.prev[i], m.vt)}</td>` : ''}</tr>`).join('')}</table></div></details>
      <details class="more"><summary>Поля витрины</summary><div class="tbl-wrap"><table class="t f">
        <tr><td>value_final</td><td>${fmtVal(f.value_final, m.vt)} ${m.type === 2 ? '= value_numerator / value_denominator' : '= value_done'}</td></tr>
        <tr><td>Δ к прошлому месяцу</td><td>${fmtVD(f.mom_value_final, m)} · по ряду value_final</td></tr>
        <tr><td>Δ к прошлому году</td><td>${f.yoy_known ? `${fmtVD(f.yoy_value_final, m)} · по ряду value_final` : `нет базы ${YEAR - 1}`}</td></tr>
        <tr><td>change_type</td><td>${esc(m.change)}</td></tr>
        <tr><td>threshold_red / yellow</td><td>${th.red == null ? 'null' : `${th.red} / ${th.yellow}`} · ${esc(m.tdir)} · ${esc(m.ttype)}${f.thr !== undefined ? ' · свой у юнита' : ''}</td></tr>
        <tr><td>call_to_action</td><td>${esc(m.cta || '—')}</td></tr>
        <tr><td>functional_unit_rk</td><td>${esc(rk)} · lvl_unit ${u.lvl_unit}</td></tr>
      </table></div></details>
      <button class="close press" data-close>Закрыть</button>`;
  }
  const afterMetric = eng => () => {
    const m = M(eng), f = fact(S.unit, eng);
    bindScrub(m, f);
    LAST.set('sh-hero', f.value_final);
    fit($('#shV'), $('.sh-hero').clientWidth, .6);
  };
  function openMetric(eng) { openSheet(metricHTML(eng), { after: afterMetric(eng) }); }
  SH.body.addEventListener('click', e => {
    if (e.target.closest('[data-close]')) { closeSheet(); return; }
    const d = e.target.closest('[data-drill]');
    if (d) {
      const t = $('#shTitle'), eng = t ? t.dataset.eng : null;
      buzz(); setUnit(d.dataset.drill, { mode: 'fade' });
      if (eng) {
        // шторка остаётся: содержимое перетекает в дочерний юнит, главное число досчитывается
        const prevV = LAST.get('sh-hero');
        SH.body.innerHTML = metricHTML(eng); SH.body.scrollTop = 0;
        if (!reduce()) { SH.body.classList.remove('swap'); void SH.body.offsetWidth; SH.body.classList.add('swap'); }
        afterMetric(eng)();
        const m = M(eng), nv = fact(S.unit, eng).value_final;
        if (!nil(nv)) setNum($('#shV'), 'sh-hero', nv, x => fmtC(x, m), { from: prevV });
      }
      return;
    }
    const u = e.target.closest('[data-pick]');
    if (u) { closeSheet(); setUnit(u.dataset.pick, { mode: 'fade' }); }
  });

  /* ---------------------------------------------------------------- выбор юнита */
  function unitHTML() {
    const order = [], walk = rk => { order.push(byRk[rk]); kids(rk).forEach(k => walk(k.functional_unit_rk)); };
    ROOTS.forEach(u => walk(u.functional_unit_rk));
    return `<div class="sh-k"><span class="lbl">Каталог продуктов · ${U.length} юнитов</span></div>
      <h2 class="sh-t" id="shTitle" tabindex="-1">Чей месяц смотрим?</h2>
      <p class="sh-fr">Всё на странице пересчитается по выбранному юниту и тем, кто внутри него.</p>
      <div class="tree">${order.map(u => {
        const rk = u.functional_unit_rk, t = tally(rk);
        const lv = u.depth || u.lvl_unit || 1;
        return `<button class="l${Math.min(6, lv)} ${rk === S.unit ? 'on' : ''} press" data-pick="${rk}">
          <span class="nm">${esc(u.functional_unit_nm)}<small>${hcText(u) ? hcText(u) + ' · ' : ''}уровень ${lv}</small></span>
          <span class="pills">${t.red.length ? `<span class="pill red">${GLYPH.red}${t.red.length}</span>` : ''}${t.amber.length + t.inner.length ? `<span class="pill amber">${GLYPH.amber}${t.amber.length + t.inner.length}</span>` : ''}${!t.red.length && !t.amber.length && !t.inner.length ? `<span class="pill ok">${GLYPH.ok}норма</span>` : ''}</span>
        </button>`;
      }).join('')}</div>
      <button class="close press" data-close>Закрыть</button>`;
  }
  $('#unitBtn').addEventListener('click', () => openSheet(unitHTML()));

  /* ---------------------------------------------------------------- поручение: одна кнопка вместо письма */
  function taskText(eng) {
    const m = M(eng), rk = S.unit, u = byRk[rk], f = fact(rk, eng), s = stKey(m, rk), lines = [];
    if (s === 'inner') {
      const b = breach(m, rk);
      lines.push(`${m.name}: порог пробит у ${b.red} из ${b.total} юнитов — ${b.worst.slice(0, 4).map(x => x.functional_unit_nm).join(', ')}. ${u.functional_unit_nm}, ${META.period_label.toLowerCase()}.`);
    } else {
      const th = TH(m, rk);
      lines.push(`${m.name}: ${fmtC(f.value_final, m)} — ${ST_LABEL[s]} (порог: жёлтый ${thr(m, th.yellow)}, красный ${thr(m, th.red)}${m.ttype === 'mom' ? ' к прошлому месяцу' : ''}). ${u.functional_unit_nm}, ${META.period_label.toLowerCase()}.`);
      const w = worstKids(m, rk, 3);
      if (w.length) lines.push(`Где хуже всего: ${w.map(x => `${x.u.functional_unit_nm} — ${fmtC(x.v, m)}`).join(', ')}.`);
      const g = gapText(m, rk); if (g) lines.push(`Чтобы выйти из зоны: ${g}.`);
    }
    if (m.cta) lines.push(`Что сделать: ${m.cta}.`);
    lines.push(`Жду план до конца недели. Источник: COO Hub, данные на ${dateFull}.`);
    return lines.join('\n');
  }
  let toastT = 0;
  function toast(msg) { const t = $('#toast'); t.querySelector('span').textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600); }
  function copyTask(eng, btn) {
    const text = taskText(eng);
    const fallback = () => openSheet(`<div class="sh-k"><span class="lbl">Поручение</span></div><h2 class="sh-t" id="shTitle" tabindex="-1">Скопируйте и отправьте владельцу</h2>
        <p class="sh-fr">Буфер обмена здесь недоступен — текст уже выделен.</p>
        <textarea class="copybox" id="copyBox" readonly>${esc(text)}</textarea><button class="close press" data-close>Готово</button>`,
      { after: () => { const b = $('#copyBox'); b.focus(); b.select(); } });
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) { fallback(); return; }
      navigator.clipboard.writeText(text).then(() => {
        buzz(); toast('Поручение скопировано — вставьте в чат владельцу');
        if (btn && !reduce() && btn.animate) btn.animate([{ transform: 'scale(1)' }, { transform: 'scale(.94)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'cubic-bezier(.34,1.56,.64,1)' });
      }, fallback);
    } catch (e) { fallback(); }
  }
  document.addEventListener('click', e => {
    const c = e.target.closest('[data-copy]');
    if (c) { e.stopPropagation(); copyTask(c.dataset.copy, c); return; }
    const w = e.target.closest('[data-where]');
    if (w) {
      S.metric = w.dataset.where; S.pinned = true; save();
      if (S.view !== 'map') { S.view = 'map'; $('#viewT').classList.remove('rank'); $$('#viewT button').forEach(x => x.classList.toggle('on', x.dataset.view === 'map')); $('#mapBody').innerHTML = ''; renderMap('fade'); }
      else renderMap('update');
      goTo('map');
      const m = M(S.metric), wk = worstKids(m, S.unit, 1)[0];
      if (wk) setTimeout(() => { const t = $(`#tm [data-rk="${wk.u.functional_unit_rk}"]`); if (t) { t.classList.remove('flash'); void t.offsetWidth; t.classList.add('flash'); } }, reduce() ? 0 : 520);
    }
  }, true);
  $('#issues').addEventListener('click', e => { const card = e.target.closest('.issue'); if (card && !e.target.closest('button')) openMetric(card.dataset.eng); });

  /* ---------------------------------------------------------------- брифинг: 35 секунд, как сторис */
  function briefSparkSVG(m, f, rk) {
    const W = 320, H = 70, p = 4, v = f.cur, showT = zonesOK(m, rk), th = TH(m, rk), ok = x => !nil(x);
    const pool = v.filter(ok).concat(showT ? [th.red, th.yellow] : []), mn = Math.min(...pool), mx = Math.max(...pool);
    const X = i => p + (W - 2 * p) * i / Math.max(1, v.length - 1), Y = t => p + (H - 2 * p) * (1 - (t - mn) / ((mx - mn) || 1));
    const idx = v.map((t, i) => ok(t) ? i : -1).filter(i => i >= 0), last = idx[idx.length - 1];
    const pts = idx.map(i => `${X(i).toFixed(1)},${Y(v[i]).toFixed(1)}`).join(' ');
    let len = 0; for (let k = 1; k < idx.length; k++) len += Math.hypot(X(idx[k]) - X(idx[k - 1]), Y(v[idx[k]]) - Y(v[idx[k - 1]]));
    let s = `<svg class="bsp" viewBox="0 0 ${W} ${H}" aria-hidden="true"><defs>${NEON('bneon')}</defs>`;
    if (showT) s += `<line class="t red" x1="0" x2="${W}" y1="${Y(th.red).toFixed(1)}" y2="${Y(th.red).toFixed(1)}"/><line class="t amber" x1="0" x2="${W}" y1="${Y(th.yellow).toFixed(1)}" y2="${Y(th.yellow).toFixed(1)}"/>`;
    s += `<polygon class="a" points="${p},${H} ${pts} ${W - p},${H}"/><polyline class="l" filter="url(#bneon)" style="stroke-dasharray:${len.toFixed(0)};stroke-dashoffset:${len.toFixed(0)};animation:draw 1.2s cubic-bezier(.05,.7,.1,1) .35s forwards" points="${pts}"/>`;
    s += `<circle class="p" cx="${X(last).toFixed(1)}" cy="${Y(v[last]).toFixed(1)}" r="4"/></svg>`;
    return s;
  }
  function miniRing(rk) {
    const C = 66, R = 50, gap = 18, step = (360 - BLOCK_ORDER.length * gap) / MS.length, rad = a => a * Math.PI / 180;
    const byB = BLOCK_ORDER.map(b => MS.filter(m => m.block === b));
    const col = { red: 'var(--i-crit)', amber: 'var(--i-warn)', ok: 'var(--i-good)', none: 'rgba(255,255,255,.3)', inner: 'var(--i-crit)' };
    let a = -90 - (byB[0].length - 1) * step / 2, s = `<svg class="bring" viewBox="0 0 132 132" aria-hidden="true"><defs>${NEON('mglow')}</defs><circle cx="${C}" cy="${C}" r="${R}" fill="none" stroke="rgba(160,180,255,.14)"/><g filter="url(#mglow)">`;
    byB.forEach(list => {
      list.forEach((m, i) => {
        const aa = a + i * step, x = C + R * Math.cos(rad(aa)), y = C + R * Math.sin(rad(aa)), st = stKey(m, rk);
        s += st === 'none' || st === 'inner' ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="none" stroke="${col[st]}" stroke-width="1.6"/>`
          : st === 'amber' ? `<path d="M${x.toFixed(1)} ${(y - 5).toFixed(1)} l5 5 -5 5 -5 -5z" fill="${col[st]}"/>`
          : `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${st === 'red' ? 5.5 : 3}" fill="${col[st]}"/>`;
      });
      a += (list.length - 1) * step + step + gap;
    });
    return s + '</g></svg>';
  }
  function briefSlides() {
    const rk = S.unit, u = byRk[rk], t = tally(rk), out = [];
    out.push({ dur: 4.5, glow: '#3d6bff', html: `
      <div class="k bk">Брифинг · ${esc(u.functional_unit_nm)}</div>
      <div class="k bcover">${esc(META.period_label.split(' ')[0])}</div>
      <div class="k">${miniRing(rk)}</div>
      <div class="k bh">${esc(verdict(rk))}</div>
      <div class="k bp"><b>${t.red.length}</b> в красной зоне · <b>${t.amber.length + t.inner.length}</b> на грани · <b>${t.ok.length}</b> в норме.</div>` });
    t.red.forEach(m => {
      const f = fact(rk, m.eng), w = worstKids(m, rk, 2), g = gapText(m, rk);
      out.push({ dur: 7, glow: '#ff2d6b', html: `
        <div class="k bk">${GLYPH.red}${esc(NICK[m.block])} · красная зона</div>
        <div class="k bh">${esc(m.name)}</div>
        <div class="k bbig" data-bcount="${f.value_final}" data-eng="${m.eng}">${fmtC(f.value_final, m)}</div>
        <div class="k">${briefSparkSVG(m, f, rk)}</div>
        <div class="k bp">Порог: жёлтый ${esc(thr(m, TH(m, rk).yellow))}, красный ${esc(thr(m, TH(m, rk).red))}.${w.length ? ` Хуже всего: ${w.map(x => `<b>${esc(x.u.functional_unit_nm)}</b> ${esc(fmtC(x.v, m))}`).join(' и ')}.` : ''}${g ? ` Чтобы выйти из зоны: ${esc(g)}.` : ''}</div>
        ${m.cta ? `<div class="k btodo"><div class="bk">Что сделать</div>${esc(m.cta)}</div>` : ''}
        <button class="k bbtn press" data-copy="${m.eng}">${ICON.copy}Скопировать поручение</button>` });
    });
    if (t.inner.length) out.push({ dur: 6, glow: '#ff2d6b', html: `
      <div class="k bk">${GLYPH.red}Порог пробит внутри</div>
      <div class="k bh">${t.inner.length === 1 ? 'Счётчик, который горит не целиком, а в отдельных юнитах' : 'Счётчики, которые горят не целиком, а в отдельных юнитах'}</div>
      <div class="k blist">${t.inner.map(m => { const b = breach(m, rk); return `<div>${GLYPH.red}${esc(m.name)}<b>${b.red} из ${b.total}</b></div>`; }).join('')}</div>
      <div class="k bp">${esc(t.inner.map(m => `${m.name}: ${breach(m, rk).worst.slice(0, 3).map(x => x.functional_unit_nm).join(', ')}`).join('. '))}.</div>` });
    if (t.amber.length) out.push({ dur: 5.5, glow: '#ffb81f', html: `
      <div class="k bk">${GLYPH.amber}На грани</div>
      <div class="k bh">Жёлтая зона — пока без вмешательства, но под присмотром</div>
      <div class="k blist">${t.amber.map(m => `<div>${GLYPH.amber}${esc(m.name)}<b>${fmtC(fact(rk, m.eng).value_final, m)}</b></div>`).join('')}</div>` });
    out.push({ dur: 5, glow: '#19e6a0', html: `
      <div class="k bk">${GLYPH.ok}В норме</div>
      <div class="k bh">${t.ok.length} ${plural(t.ok.length, ['метрика', 'метрики', 'метрик'])} держатся — о них можно не говорить</div>
      <div class="k blist">${t.ok.slice(0, 6).map(m => `<div>${GLYPH.ok}${esc(m.name)}<b>${fmtC(fact(rk, m.eng).value_final, m)}</b></div>`).join('')}</div>
      <button class="k bbtn press" data-endbrief>Открыть отчёт</button>` });
    return out;
  }
  const BR = { i: 0, slides: [], timer: 0, left: 0, started: 0, paused: false };
  function openBrief() {
    BR.slides = briefSlides(); BR.i = 0;
    const el = $('#brief');
    $('#bWho').textContent = `${byRk[S.unit].functional_unit_nm} · ${META.period_label.toLowerCase()}`;
    $('#bBars').innerHTML = BR.slides.map(() => '<i><b></b></i>').join('');
    el.hidden = false; document.body.style.overflow = 'hidden';
    if (!reduce() && el.animate) el.animate([{ opacity: 0, transform: 'scale(1.04)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
    showSlide(0);
    $('#bClose').focus({ preventScroll: true });
  }
  function closeBrief() {
    const el = $('#brief'); if (el.hidden) return;
    clearTimeout(BR.timer);
    const done = () => { el.hidden = true; document.body.style.overflow = ''; $('#bStage').innerHTML = ''; $('#briefBtn').focus({ preventScroll: true }); };
    if (reduce() || !el.animate) done();
    else el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translate3d(0,40px,0)' }], { duration: 240, easing: 'cubic-bezier(.3,0,.8,.15)' }).finished.then(done);
  }
  function showSlide(i) {
    clearTimeout(BR.timer);
    if (i < 0) i = 0;
    if (i >= BR.slides.length) { closeBrief(); return; }
    BR.i = i; BR.paused = false; $('#brief').classList.remove('paused');
    const sl = BR.slides[i];
    $$('#bBars i').forEach((b, k) => { b.className = k < i ? 'done' : k === i ? 'on' : ''; b.style.setProperty('--dur', sl.dur + 's'); });
    const bar = $$('#bBars i')[i]; if (bar) { const x = bar.firstElementChild; x.style.animation = 'none'; void x.offsetWidth; x.style.animation = ''; }
    $('#bBg').style.setProperty('--bglow', sl.glow);
    $('#bStage').innerHTML = `<div class="bslide" style="--gl:${sl.glow}">${sl.html}</div>`;
    const big = $('#bStage [data-bcount]');
    if (big) {
      const m = M(big.dataset.eng), v = +big.dataset.bcount;
      fit(big, $('#bStage .bslide').clientWidth, .45);
      setNum(big, 'b-' + i, v, x => fmtC(x, m), reduce() ? {} : { from: m.vt === 'perc' ? 0 : v * .6, dur: 1100 });
    }
    BR.left = sl.dur * 1000; BR.started = performance.now();
    BR.timer = setTimeout(() => showSlide(BR.i + 1), BR.left);
  }
  function pauseBrief(p) {
    if (p === BR.paused) return;
    BR.paused = p; $('#brief').classList.toggle('paused', p);
    if (p) { clearTimeout(BR.timer); BR.left -= performance.now() - BR.started; }
    else { BR.started = performance.now(); BR.timer = setTimeout(() => showSlide(BR.i + 1), Math.max(300, BR.left)); }
  }
  (function briefInput() {
    const el = $('#brief');
    let x0 = 0, y0 = 0, t0 = 0, holdT = 0, down = false;
    el.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; down = true; x0 = e.clientX; y0 = e.clientY; t0 = performance.now(); holdT = setTimeout(() => pauseBrief(true), 220); });
    el.addEventListener('pointerup', e => {
      if (!down) return; down = false; clearTimeout(holdT);
      const dx = e.clientX - x0, dy = e.clientY - y0, dt = performance.now() - t0;
      if (dy > 80 && dy > Math.abs(dx)) { closeBrief(); return; }
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) { showSlide(BR.i + (dx < 0 ? 1 : -1)); return; }
      if (BR.paused) { pauseBrief(false); return; }
      if (dt < 260) showSlide(BR.i + (e.clientX < el.clientWidth * .3 ? -1 : 1));
    });
    el.addEventListener('pointercancel', () => { down = false; clearTimeout(holdT); pauseBrief(false); });
    $('#bClose').addEventListener('click', closeBrief);
    el.addEventListener('click', e => { if (e.target.closest('[data-endbrief]')) closeBrief(); });
    addEventListener('keydown', e => {
      if (el.hidden) return;
      if (e.key === 'ArrowRight') showSlide(BR.i + 1);
      if (e.key === 'ArrowLeft') showSlide(BR.i - 1);
      if (e.key === ' ') { e.preventDefault(); pauseBrief(!BR.paused); }
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden && !el.hidden) pauseBrief(true); });
  })();
  $('#briefBtn').addEventListener('click', () => { buzz(); openBrief(); });

  /* ---------------------------------------------------------------- навигация по разделам */
  function goTo(id) {
    const sec = document.getElementById(id); if (!sec) return;
    const y = sec.getBoundingClientRect().top + scrollY - hdrH() - 10;
    scrollTo({ top: Math.max(0, y), behavior: reduce() ? 'auto' : 'smooth' });
  }
  function moveInd(btn) {
    const ind = $('#segInd'), w = btn.offsetWidth;
    if (ind._w !== w) { ind.style.width = w + 'px'; ind._w = w; }
    ind.style.transform = `translate3d(${btn.offsetLeft}px, 0, 0)`;
    $$('#seg button').forEach(b => b.classList.toggle('on', b === btn));
  }
  $('#seg').addEventListener('click', e => { const b = e.target.closest('[data-sec]'); if (b) { moveInd(b); goTo(b.dataset.sec); } });
  let spyRaf = 0;
  addEventListener('scroll', () => {
    cancelAnimationFrame(spyRaf);
    spyRaf = requestAnimationFrame(() => {
      const line = hdrH() + innerHeight * .28;
      let cur = 'radar';
      SECS.forEach(id => { const s = document.getElementById(id); if (s && s.getBoundingClientRect().top <= line) cur = id; });
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) cur = 'all';
      const b = $(`#seg [data-sec="${cur}"]`); if (b && !b.classList.contains('on')) moveInd(b);
    });
  }, { passive: true });
  // на телефоне resize прилетает при каждом скрытии адресной строки — карту перерисовываем только при смене ширины
  let lastW = innerWidth;
  addEventListener('resize', () => {
    const b = $('#seg .on'); if (b) moveInd(b);
    if (Math.abs(innerWidth - lastW) < 2) return;
    lastW = innerWidth; renderMap('fade');
  });

  /* ---------------------------------------------------------------- смена юнита */
  let deferT = 0;
  function setUnit(rk, how = {}) {
    if (!byRk[rk] || rk === S.unit) return;
    S.unit = rk;
    if (!S.pinned) S.metric = defaultMetric(rk);
    save();
    const zoom = !reduce() && (how.mode === 'in' || how.mode === 'out');
    $('#unitName').textContent = byRk[rk].functional_unit_nm;
    // во время зума на экране только карта и шапка: радар, карточки и список перерисовываем после анимации,
    // чтобы кадры зума оставались свободными
    clearTimeout(deferT);
    const rest = () => anchored(() => { updateRadar(false); renderIssues(true); renderList(); });
    if (zoom) { anchored(() => renderMap(how.mode, how)); deferT = setTimeout(rest, ZDUR + 40); }
    else { anchored(() => renderMap(how.mode || 'fade', how)); rest(); }
  }

  // тёмная — по умолчанию; светлая — только по кнопке, и этот выбор запоминается на устройстве
  const THEME_KEY = 'coohub-theme';
  function applyTheme(t) {
    const light = t === 'light', root = document.documentElement;
    if (light) root.setAttribute('data-hub-theme', 'light'); else root.removeAttribute('data-hub-theme');
    const b = $('#themeBtn');
    b.innerHTML = light ? ICON.moon : ICON.sun;
    b.setAttribute('aria-label', light ? 'Включить тёмную тему' : 'Включить светлую тему');
  }
  let theme = 'dark';
  try { if (localStorage.getItem(THEME_KEY) === 'light') theme = 'light'; } catch (e) { /* хранилище недоступно */ }
  applyTheme(theme);
  $('#themeBtn').addEventListener('click', () => {
    theme = theme === 'light' ? 'dark' : 'light';
    applyTheme(theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* не страшно */ }
  });

  /* ---------------------------------------------------------------- первый кадр: сначала радар, остальное — следом */
  const first = !reduce();
  if (first) document.body.classList.add('intro');
  updateRadar(true);
  moveInd($('#seg .on'));
  const h = (location.hash || '').slice(1);
  idle(() => {
    renderIssues(false);
    renderMap('init');
    renderList();
    if (h === 'brief') setTimeout(openBrief, first ? 500 : 0);
    else if (['issues', 'map', 'all'].includes(h)) goTo(h);
  });
  if (first) setTimeout(() => document.body.classList.remove('intro'), 1500);
})();
