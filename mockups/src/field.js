/* field.js — «Поле»: каждый человек — точка; история месяца управляется прокруткой,
   решение о найме — ползунком. Все числа приходят из DATA, геометрия считается здесь. */
(() => {
  const D = window.DATA, T = D.control_panel, F = D.findings, S = D.summary, K = D.stakes;
  const { int, num, esc, plural } = DEV;
  const byId = Object.fromEntries(T.map(t => [t.id, t]));
  const fById = Object.fromEntries(F.map(f => [f.id, f]));

  /* ---------------------------------------------------------------- константы истории */
  const HQ = 22930, LIMIT = 23500, EMPTY = LIMIT - HQ;           // 570 свободных мест
  const OFFERS = 412, VAC = 1850, PIPE = OFFERS + VAC;            // 2 262 в очереди
  const OTHER = 70;                                               // стажёры и переводы до декабря
  const LEAVE_MAX = 1100, LEAVE_DEF = 900;                        // ожидаемый отток сен–дек
  const MANAGERS = 2950, QUASI = 612, HIDDEN = 79, TRANSFERS = 40, MGR_LEFT = 285;
  const N = LIMIT + PIPE + OTHER;                                 // всего точек в сцене

  /* ---------------------------------------------------------------- детерминированный случай */
  let seed = 20260831;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const shuffled = n => { const a = new Uint32Array(n); for (let i = 0; i < n; i++) a[i] = i; for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };

  /* ---------------------------------------------------------------- роли точек */
  const perm = shuffled(HQ);
  const managers = perm.subarray(0, MANAGERS);
  const quasi = managers.subarray(0, QUASI);
  const mgrLeft = managers.subarray(QUASI, QUASI + MGR_LEFT);
  const hidden = perm.subarray(MANAGERS, MANAGERS + HIDDEN);
  const transfers = perm.subarray(MANAGERS + HIDDEN, MANAGERS + HIDDEN + TRANSFERS);
  const leaverPool = perm.subarray(MANAGERS + HIDDEN + TRANSFERS, MANAGERS + HIDDEN + TRANSFERS + LEAVE_MAX);
  const isMgr = new Uint8Array(HQ); managers.forEach(i => isMgr[i] = 1);
  const isQuasi = new Uint8Array(HQ); quasi.forEach(i => isQuasi[i] = 1);
  const isHidden = new Uint8Array(HQ); hidden.forEach(i => isHidden[i] = 1);
  const isTransfer = new Uint8Array(HQ); transfers.forEach(i => isTransfer[i] = 1);
  const isMgrLeft = new Uint8Array(HQ); mgrLeft.forEach(i => isMgrLeft[i] = 1);

  /* категории для раскраски: сегмент, регион, seniority — рассыпаны по другой перестановке */
  const CATS = {
    segment: { name: 'сегмент', items: [['Delivery Core', 11200], ['Discovery Core', 2900], ['Other IT', 3100], ['Other Digital', 2400], ['non-IT', 3330]] },
    region: { name: 'регион', items: [['Москва', 13460], ['ТЦР РФ', 4425], ['Санкт-Петербург', 3210], ['СНГ', 1376], ['Другие', 459]] },
    seniority: { name: 'seniority', items: [['Middle', 11350], ['Junior', 4334], ['Senior', 4296], ['Руководители', 2950]] },
  };
  const perm2 = shuffled(HQ);
  Object.values(CATS).forEach(c => { c.map = new Uint8Array(HQ); let k = 0; c.items.forEach(([, n], ci) => { for (let j = 0; j < n && k < HQ; j++, k++) c.map[perm2[k]] = ci; }); });

  /* ---------------------------------------------------------------- состояние точек */
  const x = new Float32Array(N), y = new Float32Array(N), x0 = new Float32Array(N), y0 = new Float32Array(N), tx = new Float32Array(N), ty = new Float32Array(N);
  const a = new Float32Array(N).fill(1), a0 = new Float32Array(N), ta = new Float32Array(N).fill(1);
  const cls = new Uint8Array(N), sz = new Float32Array(N).fill(1);
  // классы цвета
  const C = { base: 0, lit: 1, red: 2, amber: 3, amberHollow: 4, empty: 5, blue: 6, hidden: 7, c1: 8, c2: 9, c3: 10, c4: 11, c5: 12 };
  const COLOR = {}; // заполняется из CSS-токенов

  /* ---------------------------------------------------------------- сцена */
  const cv = document.getElementById('stage'), ctx = cv.getContext('2d');
  const spillPos = new Map(), supportPos = new Map();
  let W = 0, H = 0, dpr = 1, cell = 4, COLS = 160, ROWS = Math.ceil(LIMIT / COLS);
  const field = { x: 0, y: 0, w: 0, h: 0 }, queue = { x: 0, y: 0, w: 0, h: 0 }, spill = { x: 0, y: 0, w: 0, h: 0 }, support = { x: 0, y: 0, w: 0, h: 0 };
  const narrow = () => W < 900;

  function readTokens() {
    const cs = getComputedStyle(document.documentElement);
    const g = n => cs.getPropertyValue(n).trim();
    COLOR[C.base] = g('--dot'); COLOR[C.lit] = g('--dot-lit'); COLOR[C.red] = g('--red'); COLOR[C.amber] = g('--amber');
    COLOR[C.amberHollow] = g('--amber'); COLOR[C.empty] = g('--empty'); COLOR[C.blue] = g('--blue'); COLOR[C.hidden] = g('--red');
    COLOR[C.c1] = g('--cat-1'); COLOR[C.c2] = g('--cat-2'); COLOR[C.c3] = g('--cat-3'); COLOR[C.c4] = g('--cat-4'); COLOR[C.c5] = g('--cat-5');
    COLOR.bg = g('--bg'); COLOR.rule = g('--rule'); COLOR.muted = g('--muted'); COLOR.ink = g('--ink'); COLOR.redSoft = g('--red-soft');
  }

  let layoutCh = 0;
  function layout(ch) {
    if (ch != null) layoutCh = ch;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // поле лимита: справа, чтобы слева читались карточки; на панели — ещё правее
    const left = narrow() ? 24 : Math.max(W * (layoutCh === 8 ? 0.58 : 0.44), 520);
    const right = W - (narrow() ? 24 : 150);
    const top = 96, bottom = H - 150;
    const availW = Math.max(200, right - left), availH = Math.max(200, bottom - top);
    COLS = 160; ROWS = Math.ceil(LIMIT / COLS);
    cell = Math.min(availW / COLS, availH / ROWS);
    field.w = COLS * cell; field.h = ROWS * cell;
    field.x = left + (availW - field.w) / 2 - 20; field.y = top + (availH - field.h) / 2;
    // очередь — справа от поля
    queue.x = field.x + field.w + 26; queue.w = Math.max(60, W - queue.x - 24); queue.y = field.y; queue.h = field.h;
    // переполнение и Support — полоса под рамкой, на всю ширину поля
    spill.x = field.x; spill.w = field.w; spill.y = field.y + field.h + 34; spill.h = 34;
    support.x = field.x; support.w = field.w; support.y = field.y + field.h + 34; support.h = 26;
    spillPos.clear(); supportPos.clear();
    computeHome();
  }

  const slotX = k => field.x + (k % COLS) * cell + cell / 2;
  const slotY = k => field.y + Math.floor(k / COLS) * cell + cell / 2;
  const homeX = new Float32Array(N), homeY = new Float32Array(N), qX = new Float32Array(N), qY = new Float32Array(N);
  function computeHome() {
    for (let i = 0; i < LIMIT; i++) { homeX[i] = slotX(i); homeY[i] = slotY(i); }
    // очередь: плотная колонка случайных точек справа
    reseed(7);
    for (let i = LIMIT; i < N; i++) { qX[i] = queue.x + rnd() * queue.w; qY[i] = queue.y + rnd() * queue.h; homeX[i] = qX[i]; homeY[i] = qY[i]; }
  }

  /* ---------------------------------------------------------------- модель решения */
  const model = { hires: 1232, leave: LEAVE_DEF };
  const december = () => HQ - model.leave + OTHER + model.hires;

  /* ---------------------------------------------------------------- построение состояний */
  const reseed = k => { seed = (Math.imul(k + 1, 2654435761) >>> 0); rnd(); rnd(); rnd(); };
  function spillXY(k) { if (!spillPos.has(k)) { reseed(1000 + k); spillPos.set(k, [spill.x + 6 + rnd() * (spill.w - 12), spill.y + 4 + rnd() * (spill.h - 8)]); } return spillPos.get(k); }
  function supportXY(k) { if (!supportPos.has(k)) { reseed(5000 + k); supportPos.set(k, [support.x + 6 + rnd() * (support.w - 12), support.y + 4 + rnd() * (support.h - 8)]); } return supportPos.get(k); }

  function setTargets(ch) {
    // базовое положение: HQ в ячейках, пустые ячейки — пусто, очередь — справа невидима
    for (let i = 0; i < N; i++) {
      tx[i] = homeX[i]; ty[i] = homeY[i]; sz[i] = 1;
      if (i < HQ) { cls[i] = C.base; ta[i] = 1; }
      else if (i < LIMIT) { cls[i] = C.empty; ta[i] = 0; }
      else { cls[i] = i < LIMIT + OFFERS ? C.amber : C.amberHollow; ta[i] = 0; }
    }
    const showEmpty = ch >= 1; if (showEmpty) for (let i = HQ; i < LIMIT; i++) ta[i] = ch <= 3 ? 1 : 0.35;
    const showQueue = ch === 2 || ch === 3; if (showQueue) for (let i = LIMIT; i < LIMIT + PIPE; i++) ta[i] = 1;
    const dim = ch >= 4 ? 0.55 : 1; // на находках масса чуть тише

    if (ch === 3) {
      // решение: часть уходит, очередь заходит в свободные ячейки, остальные — за рамку
      const freeSlots = [];
      const leaving = new Uint8Array(HQ);
      for (let j = 0; j < model.leave; j++) { const i = leaverPool[j]; leaving[i] = 1; ta[i] = 0.06; freeSlots.push(i); }
      for (let i = HQ; i < LIMIT; i++) freeSlots.push(i);
      freeSlots.sort((p, q) => p - q);
      const incoming = model.hires + OTHER;
      for (let j = 0; j < PIPE + OTHER; j++) {
        const i = LIMIT + j;
        if (j < incoming) {
          if (j < freeSlots.length) { const s = freeSlots[j]; tx[i] = homeX[s]; ty[i] = homeY[s]; cls[i] = C.amber; ta[i] = 1; }
          else { const p = spillXY(i); tx[i] = p[0]; ty[i] = p[1]; cls[i] = C.red; ta[i] = 1; sz[i] = 1.4; }
        } else { cls[i] = j < PIPE ? C.amberHollow : C.amber; ta[i] = j < PIPE ? 0.5 : 0; tx[i] = qX[i]; ty[i] = qY[i]; }
      }
    }
    if (ch >= 4) for (let i = 0; i < HQ; i++) ta[i] = dim;
    if (ch === 4) hidden.forEach(i => { cls[i] = C.red; ta[i] = 1; sz[i] = 1.8; });
    if (ch === 5) transfers.forEach(i => { const p = supportXY(i); tx[i] = p[0]; ty[i] = p[1]; cls[i] = C.blue; ta[i] = 1; sz[i] = 1.7; });
    if (ch === 6) { managers.forEach(i => { cls[i] = C.lit; ta[i] = 0.9; sz[i] = 1.15; }); quasi.forEach(i => { cls[i] = C.red; ta[i] = 1; sz[i] = 1.6; }); }
    if (ch === 7) { managers.forEach(i => { cls[i] = C.lit; ta[i] = 0.7; sz[i] = 1.1; }); mgrLeft.forEach(i => { const p = spillXY(i); tx[i] = p[0]; ty[i] = p[1]; cls[i] = C.red; ta[i] = 1; sz[i] = 1.5; }); }
    if (ch === 8) { const c = CATS[colorBy]; if (c) for (let i = 0; i < HQ; i++) { cls[i] = C.c1 + c.map[i]; ta[i] = 0.95; } }
    if (ch === 9) for (let i = 0; i < HQ; i++) ta[i] = 0.35;
    rebuildBuckets();
  }

  /* ---------------------------------------------------------------- отрисовка */
  const buckets = []; for (let c = 0; c < 13; c++) buckets.push([]);
  function rebuildBuckets() { buckets.forEach(b => b.length = 0); for (let i = 0; i < N; i++) if (ta[i] > 0 || a[i] > 0) buckets[cls[i]].push(i); }

  let chapter = -1, colorBy = 'segment', animT = 1, animStart = 0, pulsing = false, needDraw = true;
  const DUR = matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 780;
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  function startAnim() { for (let i = 0; i < N; i++) { x0[i] = x[i]; y0[i] = y[i]; a0[i] = a[i]; } animStart = performance.now(); animT = 0; needDraw = true; }

  function draw(now) {
    if (animT < 1) { animT = Math.min(1, (now - animStart) / DUR); const e = ease(animT); for (let i = 0; i < N; i++) { x[i] = x0[i] + (tx[i] - x0[i]) * e; y[i] = y0[i] + (ty[i] - y0[i]) * e; a[i] = a0[i] + (ta[i] - a0[i]) * e; } needDraw = true; }
    if (!needDraw && !pulsing) return;
    needDraw = false;
    ctx.fillStyle = COLOR.bg; ctx.fillRect(0, 0, W, H);
    const s = cell * 0.58, useArc = cell >= 6, pulse = pulsing ? 1 + 0.35 * Math.sin(now / 220) : 1;
    // рамка лимита
    if (chapter >= 1) {
      ctx.strokeStyle = COLOR.rule; ctx.lineWidth = 1; ctx.strokeRect(field.x - 6, field.y - 6, field.w + 12, field.h + 12);
      label(`ЛИМИТ · ${int(LIMIT)} МЕСТ`, field.x - 6, field.y - 14, COLOR.muted);
      if (chapter === 2 || chapter === 3) label(`ОЧЕРЕДЬ · ${int(PIPE)}`, queue.x, field.y - 14, COLOR.amber);
      if (chapter === 3 && december() > LIMIT) { ctx.fillStyle = COLOR.redSoft; ctx.fillRect(spill.x - 6, spill.y - 6, spill.w + 12, spill.h + 12); label(`СВЕРХ ЛИМИТА · +${int(december() - LIMIT)} · МЕСТА НЕТ`, spill.x - 6, spill.y + spill.h + 20, COLOR.red); }
      if (chapter === 5) { ctx.strokeStyle = COLOR.rule; ctx.strokeRect(support.x - 6, support.y - 6, support.w + 12, support.h + 12); label('SUPPORT · ВНЕ ЛИМИТА · 40 ПЕРЕВЕДЕНЫ ИЗ HQ', support.x - 6, support.y + support.h + 20, COLOR.muted); }
      if (chapter === 7) label('УШЛИ ЗА 12 МЕСЯЦЕВ · 285 РУКОВОДИТЕЛЕЙ', spill.x - 6, spill.y + spill.h + 20, COLOR.red);
    } else label(`HQ · ${int(HQ)} ЧЕЛОВЕК`, field.x - 6, field.y - 14, COLOR.muted);
    for (let c = 0; c < buckets.length; c++) {
      const b = buckets[c]; if (!b.length) continue;
      const hollow = c === C.empty || c === C.amberHollow;
      ctx.fillStyle = COLOR[c]; ctx.strokeStyle = COLOR[c]; ctx.lineWidth = 1;
      let curA = -1;
      for (let k = 0; k < b.length; k++) {
        const i = b[k]; const al = a[i]; if (al <= 0.01) continue;
        if (al !== curA) { ctx.globalAlpha = al; curA = al; }
        let d = s * sz[i]; if (sz[i] > 1.2 && pulsing) d *= pulse;
        if (hollow) { if (useArc) { ctx.beginPath(); ctx.arc(x[i], y[i], d / 2, 0, 6.2832); ctx.stroke(); } else ctx.strokeRect(x[i] - d / 2, y[i] - d / 2, d, d); }
        else if (useArc || sz[i] > 1.2) { ctx.beginPath(); ctx.arc(x[i], y[i], d / 2, 0, 6.2832); ctx.fill(); }
        else ctx.fillRect(x[i] - d / 2, y[i] - d / 2, d, d);
      }
      ctx.globalAlpha = 1;
    }
  }
  function label(t, lx, ly, color) { ctx.fillStyle = color; ctx.font = '600 10px "IBM Plex Mono", monospace'; ctx.textBaseline = 'alphabetic'; ctx.fillText(t, lx, ly); }
  function loop(now) { draw(now); requestAnimationFrame(loop); }

  function goto(ch) {
    if (ch === chapter) return;
    const relayout = (ch === 8) !== (chapter === 8);
    chapter = ch; pulsing = ch === 4 || ch === 6;
    if (relayout) layout(ch);
    setTargets(ch); startAnim();
    document.querySelectorAll('.progress a').forEach((el, i) => el.classList.toggle('on', i === ch));
    document.getElementById('chap').textContent = CHAPTERS[ch].nav;
  }
  function refresh() { setTargets(chapter); startAnim(); }

  /* ---------------------------------------------------------------- главы */
  const f1 = fById.hidden_growth, f2 = fById.hq_drain, f3 = fById.managers_leaving, f4 = fById.managers_without_teams;
  const foot = f => `<div class="foot"><div><div class="l">Как посчитано</div><div class="v">${esc(f.how)} · ${esc(f.source)}</div></div><div class="unknown"><div class="l">Чего мы не знаем</div><div class="v">${esc(f.unknown)}</div></div></div>
    <div class="ask"><span class="q">?</span><span class="t">${esc(f.question)}</span><span class="o">${esc(f.owner)}</span></div>`;

  const CHAPTERS = [
    { nav: '01 · поле', html: `<div class="eyebrow">Август 2026 · HQ</div><div class="big">22 930<small>человек · каждая точка — один сотрудник</small></div><p class="say">Это все, кто работает в HQ на 31 августа.</p><p class="txt">Дальше точки покажут, что изменилось за месяц, где спрятался рост и что решать в сентябре. Цифры — вымышленные, механика — настоящая.</p><div class="hint">↓ прокрутите</div>` },
    { nav: '02 · лимит', html: `<div class="eyebrow">Лимит на конец года · 23 500</div><div class="big">570<small>свободных мест</small></div><p class="say">Рамка — это лимит. Пустые ячейки внизу — всё, что осталось.</p><p class="txt">Лимит действует на управленческую численность HQ и проверяется 31 декабря. За январь–август мы заполнили 790 мест из 1 360, отведённых на год.</p><div class="legend"><span><i></i>в штате</span><span><i class="empty"></i>свободно</span></div>` },
    { nav: '03 · очередь', html: `<div class="eyebrow warm">Уже запущено</div><div class="big warm">2 262<small>найма в очереди</small></div><p class="say">На 570 мест стоят 2 262 человека: 412 принятых офферов и 1 850 вакансий в работе.</p><p class="txt">Не все они выйдут, и не все места заняты навсегда: до декабря ожидаем около 900 увольнений, которые освободят ячейки. Сколько именно поместится — зависит от одного решения. Оно на следующем шаге.</p><div class="legend"><span><i class="amber"></i>принятый оффер</span><span><i class="amber" style="background:none;border:1px solid var(--amber)"></i>вакансия в работе</span></div>` },
    { nav: '04 · решение', html: `<div class="eyebrow hot">Ваше решение</div><p class="say" style="margin-top:8px">Сколько нанять до декабря?</p><p class="txt">Двигайте ползунок: точки покажут декабрь. Оранжевые заходят в освободившиеся ячейки, красные за рамкой — те, кому места нет.</p>
      <div class="ctl">
        <label>Внешний найм за сен–дек <b id="hv">1 232</b><input type="range" id="hires" min="0" max="2262" step="10" value="1232"></label>
        <div class="presets"><button type="button" data-h="1232">по темпу · 1 232</button><button type="button" data-h="1520">по воронке · 1 520</button><button type="button" data-h="1400">впритык · 1 400</button></div>
        <label>Ожидаемый отток за сен–дек <b id="lv">900</b><input type="range" id="leave" min="700" max="1100" step="10" value="900"></label>
      </div>
      <div class="result"><div class="n" id="decN">23 332</div><div class="d" id="decD"></div><div class="verdict" id="decV"></div></div>
      <div class="hint">допущения: +70 стажёров и переводов; отток равномерный; принятые офферы выходят первыми</div>` },
    { nav: '05 · находка 01', html: `<div class="eyebrow hot">Находка 01 · ${esc(f1.kicker)}</div><div class="big hot">79<small>замен закрыты при работающем «заменяемом»</small></div><p class="say">${esc(f1.claim)}</p><p class="txt">${esc(f1.text)}</p>${foot(f1)}` },
    { nav: '06 · находка 02', html: `<div class="eyebrow">Находка 02 · ${esc(f2.kicker)}</div><div class="big">40<small>переводов из HQ в Support с начала года</small></div><p class="say">${esc(f2.claim)}</p><p class="txt">${esc(f2.text)}</p><div style="margin-top:12px">${DEV.streak({ width: 380, height: 96, values: f2.series, labels: f2.months, decimals: 0, unit: ' чел.', every: 1 })}</div>${foot(f2)}` },
    { nav: '07 · находка 03', html: `<div class="eyebrow hot">Находка 03 · ${esc(f4.kicker)}</div><div class="big hot">612<small>руководителей с командой меньше четырёх</small></div><p class="say">${esc(f4.claim)}</p><p class="txt">${esc(f4.text)}</p><div class="legend"><span><i class="lit"></i>руководитель</span><span><i class="red"></i>команда &lt; 4</span></div>${foot(f4)}` },
    { nav: '08 · находка 04', html: `<div class="eyebrow hot">Находка 04 · ${esc(f3.kicker)}</div><div class="big hot">9,8%<small>годовая текучесть руководителей · год назад 7,1%</small></div><p class="say">${esc(f3.claim)}</p><p class="txt">${esc(f3.text)}</p><div style="margin-top:12px">${DEV.bigLine({ width: 380, height: 110, values: f3.series, compare: f3.compare, labels: f3.months, unit: '%', decimals: 1 })}</div>${foot(f3)}` },
    { nav: '09 · всё остальное', wide: true, html: `<div class="eyebrow">Всё остальное · 15 метрик</div><p class="say" style="margin-top:8px">Что ещё изменилось, а что нет.</p><p class="txt">Раскрасьте поле, чтобы увидеть, из кого состоит HQ. Ниже — панель: значение, изменение к прошлому месяцу и году, статус.</p><div class="chips" id="chips"></div><div class="legend" id="catLegend"></div><div class="metrics" id="metrics"></div>` },
    { nav: '10 · что делать', html: `<div class="eyebrow hot">До 15 сентября</div><p class="say" style="margin-top:8px">Пять вопросов и два решения.</p><div class="qs">${S.questions.map((q, i) => `<div class="qrow"><span class="n">${String(i + 1).padStart(2, '0')}</span><div><div class="t">${esc(q.q)}</div><div class="o">${esc(q.to)}</div></div></div>`).join('')}</div>${S.decisions.map(d => { const [t, w] = d.text.split(' — '); return `<div class="dec"><span>${esc(t)}</span><span class="w">${esc(w || 'в сентябре')}</span><span class="who">${esc(d.owner)}</span></div>`; }).join('')}<div class="foot"><div class="unknown"><div class="l">Счёт прошлого прогноза</div><div class="v">${esc(K.scoreboard.text)}</div></div></div>` },
  ];

  /* ---------------------------------------------------------------- рендер страницы */
  const app = document.getElementById('app');
  app.innerHTML = CHAPTERS.map((c, i) => `<section class="step" data-ch="${i}" id="ch${i}"><div class="card ${c.wide ? 'wide' : ''}">${c.html}</div></section>`).join('') +
    `<div class="colophon">${esc(D.meta.disclaimer)} Подготовлено: ${esc(D.meta.prepared_by)}. Черновик текста пишет ИИ, формулировки вычитывает аналитик. Каждая находка получена соединением существующих таблиц, без новых источников данных.</div>`;
  document.getElementById('progress').innerHTML = CHAPTERS.map((c, i) => `<a href="#ch${i}" title="${esc(c.nav)}"></a>`).join('');

  // панель метрик
  const dcls = (v, good) => (!v || good === 'none' || good === 'range') ? '' : (good === 'up' ? (v > 0 ? 'ok' : 'hot') : (v > 0 ? 'hot' : 'ok'));
  const fmtV = t => t.fmt === 'int' ? int(t.value) : num(t.value, t.decimals) + (t.fmt === 'pct' ? '%' : '');
  const fmtD = (v, t) => (v > 0 ? '+' : v < 0 ? '−' : '±') + (t.fmt === 'int' ? int(Math.abs(v)) : num(Math.abs(v), t.decimals));
  document.getElementById('metrics').innerHTML = T.map(t => `<div class="m" data-tip="${esc(t.status_text)}"><div class="t">${esc(t.title)}</div><div class="v ${t.status === 'red' ? 'hot' : t.status === 'ok' ? 'ok' : ''}">${fmtV(t)}<small>${t.status === 'red' ? '▲ решение' : t.status === 'amber' ? '◆ наблюдаем' : t.status === 'ok' ? '● по плану' : '· тихо'}</small></div><div class="s">м/м ${fmtD(t.delta_mom, t)} · г/г ${fmtD(t.delta_yoy, t)}${t.delta_plan != null ? ' · план ' + fmtD(t.delta_plan, t) : ''}</div>${DEV.micro([...t.series.y2025, ...t.series.y2026], { width: 90, height: 18 })}</div>`).join('');

  // раскраска
  const chips = document.getElementById('chips'), catLegend = document.getElementById('catLegend');
  function renderChips() {
    chips.innerHTML = Object.entries(CATS).map(([k, c]) => `<button type="button" data-k="${k}" class="${k === colorBy ? 'on' : ''}">по ${esc(c.name)}</button>`).join('');
    catLegend.innerHTML = CATS[colorBy].items.map(([n, cnt], i) => `<span><i class="c${i + 1}"></i>${esc(n)} · ${int(cnt)}</span>`).join('');
  }
  renderChips();
  chips.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; colorBy = b.dataset.k; renderChips(); if (chapter === 8) refresh(); });

  // решение
  const hires = document.getElementById('hires'), leave = document.getElementById('leave');
  function updateDecision() {
    model.hires = +hires.value; model.leave = +leave.value;
    document.getElementById('hv').textContent = int(model.hires); document.getElementById('lv').textContent = int(model.leave);
    const dec = december(), over = dec - LIMIT;
    const n = document.getElementById('decN'); n.textContent = int(dec); n.className = 'n ' + (over > 0 ? 'hot' : 'ok');
    document.getElementById('decD').innerHTML = `HQ на 31 декабря<br>${over > 0 ? `<b>+${int(over)}</b> над лимитом` : `<b>${int(-over)}</b> в запасе`}`;
    document.getElementById('decV').textContent = over > 0
      ? `Не проходит. Чтобы уложиться при таком оттоке, наймов должно быть не больше ${int(LIMIT - HQ + model.leave - OTHER)}: это примерно ${int(Math.round((model.hires - (LIMIT - HQ + model.leave - OTHER)) / 0.6 / 10) * 10)} вакансий, которые надо снять или перенести на 2027.`
      : `Проходит с запасом ${int(-over)}. Каждые 100 наймов сверх этого — ${int(Math.round(100 * 4.2))} млн ₽ в год по оценке.`;
    document.querySelectorAll('.presets button').forEach(b => b.classList.toggle('on', +b.dataset.h === model.hires));
    if (chapter === 3) refresh();
  }
  hires.addEventListener('input', updateDecision); leave.addEventListener('input', updateDecision);
  document.querySelectorAll('.presets button').forEach(b => b.addEventListener('click', () => { hires.value = b.dataset.h; updateDecision(); }));

  // тема
  document.getElementById('theme').addEventListener('click', () => {
    const r = document.documentElement; const cur = r.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    r.dataset.theme = cur === 'dark' ? 'light' : 'dark'; readTokens(); needDraw = true;
  });
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => { readTokens(); needDraw = true; });

  // прокрутка → глава
  const io = new IntersectionObserver(es => { es.forEach(e => { if (e.isIntersecting) goto(+e.target.dataset.ch); }); }, { threshold: 0, rootMargin: '-42% 0px -42% 0px' });
  document.querySelectorAll('.step').forEach(s => io.observe(s));

  /* ---------------------------------------------------------------- старт */
  readTokens(); layout();
  for (let i = 0; i < N; i++) { x[i] = homeX[i]; y[i] = homeY[i]; a[i] = i < HQ ? 1 : 0; }
  updateDecision();
  goto(0);
  window.addEventListener('resize', () => { layout(); setTargets(chapter); for (let i = 0; i < N; i++) { x[i] = tx[i]; y[i] = ty[i]; a[i] = ta[i]; } needDraw = true; });
  requestAnimationFrame(loop);
  DEV.initTips();
})();
