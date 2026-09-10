/* m_pult.js — «Пульт»: приложение с пятью вкладками. Вкладка «Все» держит весь каталог метрик,
   любая строка открывает шторку с определением, владельцем и доступностью данных. */
(() => {
  (() => { if (!document.querySelector('meta[name="viewport"]')) { const m = document.createElement('meta'); m.name = 'viewport'; m.content = 'width=device-width, initial-scale=1, viewport-fit=cover'; document.head.appendChild(m); } })();
  const D = window.DATA, S = D.summary, R = D.resources, G = D.goals, K = D.stakes, C = D.catalog;
  const { int, num, esc, val, delta, dcls, ring, spark, meter, funnel, bars, dots, fork, dual } = MB;
  const T = id => D.control_panel.find(x => x.id === id);
  const F = id => D.findings.find(x => x.id === id);
  const tone = st => ({ red: 'red', amber: 'amber', ok: 'green' }[st] || '');
  const avCls = a => ({ 'есть': 'ok', 'нужна склейка': 'mid', 'бэклог': 'no' }[a] || '');

  const ICONS = {
    now: '<path d="M12 3 5 13h5l-1 8 8-11h-5l1-7z"/>',
    res: '<path d="M4 17a8 8 0 1 1 16 0"/><path d="M12 17l4.2-5"/>',
    goal: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.2"/>',
    ppl: '<circle cx="9" cy="8" r="3.2"/><path d="M3.6 19a5.4 5.4 0 0 1 10.8 0"/><path d="M16.2 5.6a3.2 3.2 0 0 1 0 6.4"/><path d="M17 14.4a5.4 5.4 0 0 1 3.4 4.6"/>',
    all: '<rect x="4" y="4" width="7" height="7" rx="1.6"/><rect x="13" y="4" width="7" height="7" rx="1.6"/><rect x="4" y="13" width="7" height="7" rx="1.6"/><rect x="13" y="13" width="7" height="7" rx="1.6"/>',
  };
  const svg = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;

  /* ---------------------------------------------------------------- строки и плитки */
  const row = (o) => `<button class="row" data-sheet="${esc(o.sheet || '')}" data-key="${esc(o.key || '')}"${o.sheet ? '' : ' disabled style="cursor:default"'}>
    <span class="st ${o.st || 'none'}"></span>
    <span class="t">${esc(o.title)}${o.sub ? `<small>${esc(o.sub)}</small>` : ''}</span>
    <span class="r">${o.value ? `<span class="v ${o.vTone || ''}">${o.value}</span>` : ''}${o.delta ? `<span class="d ${o.dTone || ''}">${o.delta}</span>` : ''}${o.sheet ? '<span class="ch">›</span>' : ''}</span>
  </button>`;

  const tile = (o) => `<button class="tile" data-sheet="${esc(o.sheet || '')}" data-key="${esc(o.key || '')}"${o.sheet ? '' : ' disabled style="cursor:default"'}>
    <div class="k">${esc(o.k)}</div><div class="v ${o.tone || ''}">${o.v}</div><div class="m ${o.mTone || ''}">${esc(o.m || '')}</div></button>`;

  const card = (inner, cls) => `<section class="card ${cls || ''}">${inner}</section>`;

  /* ---------------------------------------------------------------- вкладка «Сводка» */
  const hq = T('hq_hc');
  const START = 22140, LIMIT = 23500, NOW = 22930, TOP = 23800;
  const paneNow = () => `
    ${card(`<div class="lbl">Численность HQ · ${esc(D.meta.as_of)}</div>
      <div class="num">${int(NOW)}</div>
      <div class="gauge"><i style="width:${(100 * (NOW - START) / (TOP - START)).toFixed(1)}%"></i><u style="left:${(100 * (LIMIT - START) / (TOP - START)).toFixed(1)}%"></u></div>
      <div class="legend"><span>${int(START)} · 1 января</span><span>лимит ${int(LIMIT)}</span></div>
      <div class="cap">+790 с начала года при плане +802. Осталось 570 мест, а найм запущен на 2 262 человека.</div>`, 'hero')}

    ${card(`<div class="lbl">Прогноз на 31 декабря</div>
      <div class="viz">${fork({ min: 23100, max: 23750, lo: 23330, hi: 23620, limit: LIMIT, loLabel: 'по темпу 23 330', hiLabel: 'по воронке 23 620', limitLabel: 'лимит 23 500', aria: 'Вилка прогноза пересекает лимит' })}</div>
      <p class="tx">Нижняя граница — средний прирост восьми месяцев, верхняя — воронка найма с историческими конверсиями. Обе выше запаса в 570 мест.</p>
      <div class="rowl" style="margin-top:6px">
        ${row({ st: 'red', title: 'Снять или перенести ≈200 вакансий', sub: K.deadline.value + ' · позже офферы уже выйдут', sheet: 'text', key: 'limit' })}
      </div>`)}

    <div class="sect"><h3>Решать сейчас</h3><span class="n">${S.signals.filter(s => s.level === 'red').length} красных</span></div>
    ${card(`<div class="rowl">${S.signals.filter(s => s.level === 'red').map((s, i) => row({
      st: 'red', title: s.title, sub: s.owner, sheet: 'signal', key: 'red' + i,
    })).join('')}</div>`)}

    <div class="grid2">
      ${tile({ k: 'Отток руководителей', v: '9,8%', tone: 'red', m: '+2,7 п.п. за год', mTone: 'bad', sheet: 'tile', key: 'attrition_mgr' })}
      ${tile({ k: 'Вакансии > 90 дней', v: '27%', tone: 'red', m: 'цель ≤ 20%', sheet: 'tile', key: 'overdue_vac' })}
      ${tile({ k: 'Связанность целей', v: '71%', tone: 'red', m: 'цель 85%', sheet: 'goal', key: 'link' })}
      ${tile({ k: 'Ресурсообеспеченность', v: '92,5%', tone: 'amber', m: 'цель 93%', sheet: 'res', key: 'res' })}
    </div>

    <div class="sect"><h3>Наблюдать</h3><span class="n">${S.signals.filter(s => s.level === 'amber').length} жёлтых</span></div>
    ${card(`<div class="rowl">${S.signals.filter(s => s.level === 'amber').map((s, i) => row({
      st: 'amber', title: s.title, sub: s.owner, sheet: 'signal', key: 'amber' + i })).join('')}</div>`)}

    <div class="sect"><h3>Решения и вопросы</h3><span class="n">${K.deadline.value}</span></div>
    ${card(`<div class="lbl">Два решения</div>
      <div class="rowl" style="margin-top:8px">${S.decisions.map(d => row({ st: 'red', title: d.text, sub: d.owner })).join('')}</div>
      <div class="lbl" style="margin-top:16px">Пять вопросов</div>
      <div class="rowl" style="margin-top:8px">${S.questions.map(q => row({ st: 'none', title: q.q, sub: q.to })).join('')}</div>`)}

    ${card(`<div class="lbl">Счёт прошлого прогноза</div><p class="tx">${esc(K.scoreboard.text)}</p>
      <div class="rowl" style="margin-top:8px">
        ${row({ st: 'none', title: 'Июльская вилка', value: esc(K.scoreboard.prev) })}
        ${row({ st: 'amber', title: 'Августовская вилка', value: esc(K.scoreboard.now) })}
      </div>`)}`;

  /* ---------------------------------------------------------------- вкладка «Ресурс» */
  const paneRes = () => `
    ${card(`<div class="lbl">Ресурсообеспеченность HQ</div>
      <div class="ring-wrap">
        <div class="c2">${ring({ size: 104, stroke: 11, value: R.value, target: R.target, tone: tone(R.status) })}<b>${num(R.value, 1)}%</b></div>
        <div class="side">Цель <b>${num(R.target, 1)}%</b><br>Месяц назад ${num(R.prev_month, 1)}%<br>Год назад ${num(R.prev_year, 1)}%</div>
      </div>
      <p class="tx">${esc(R.comment)}</p>
      <div class="lvl">${R.levels.map(l => `<div>
        <div class="t"><span>${esc(l.name)}</span><b>${num(l.value, 1)}%</b></div>
        ${meter({ value: l.value, max: 100 })}
        <div class="s">${esc(l.sub)}</div></div>`).join('')}</div>`)}

    <div class="sect"><h3>По профессиям</h3><span class="n">шкала 84–96%</span></div>
    ${card(`${dots(R.professions.map(p => ({ name: p.name, v: p.value, tone: p.status === 'red' ? 'hot' : p.status === 'amber' ? 'warm' : 'good' })), { min: 84, max: 96, target: R.target, suffix: '%' })}`)}

    <div class="sect"><h3>По сегментам</h3></div>
    ${card(`<div class="tri">
      <div class="hd"><span>Сегмент</span><span>Обесп.</span><span>Ваканс.</span><span>Числ.</span></div>
      ${R.segments.map(s => `<div class="rr"><span class="n">${esc(s.name)}</span>
        <b class="${s.status === 'red' ? 'red' : s.status === 'amber' ? 'amber' : 'green'}">${num(s.value, 1)}</b>
        <b>${int(s.vac)}</b><b>${int(s.hc)}</b></div>`).join('')}</div>`)}

    <div class="sect"><h3>Рядом</h3></div>
    ${card(`<div class="rowl">${R.side.map(s => row({ st: 'none', title: s.label, sub: s.sub, value: esc(s.value) })).join('')}</div>`)}

    ${card(`<div class="lbl">Определение</div><p class="tx">${esc(R.definition)}</p>
      <div class="lbl" style="margin-top:14px">Чего мы не знаем</div><p class="tx">${esc(R.unknown)}</p>
      <div class="lbl" style="margin-top:14px">Вопрос</div><p class="tx">${esc(R.question)} <b>${esc(R.owner)}</b></p>`)}`;

  /* ---------------------------------------------------------------- вкладка «Цели» */
  const paneGoal = () => `
    <div class="grid2">${G.stages.map(s => tile({
      k: s.name, v: s.value + '%', tone: tone(s.status),
      m: 'цель ' + s.target + '% · ' + (s.value - s.target > 0 ? '+' : '−') + Math.abs(s.value - s.target) + ' п.п.',
      sheet: 'goal', key: s.id })).join('')}</div>

    ${card(`<div class="lbl">Воронка целей</div>
      <div class="viz">${funnel(G.funnel.map((s, i) => ({ name: s.name, v: s.v, note: ['цель 95%', 'цель 85%', '60 дней', 'I полугодие'][i], tone: i === 1 ? '' : 'dim' })), { width: 290 })}</div>
      <h2 class="h2">${esc(G.headline)}</h2>
      <p class="tx">${esc(G.comment)}</p>`)}

    <div class="sect"><h3>По сегментам</h3><span class="n">проценты</span></div>
    ${card(`<div class="tri">
      <div class="hd"><span>Сегмент</span><span>Пост.</span><span>Связ.</span><span>Дост.</span></div>
      ${G.segments.map(s => `<div class="rr"><span class="n">${esc(s.name)}</span><b>${s.set}</b>
        <b class="${s.link < 65 ? 'red' : s.link < 75 ? 'amber' : 'green'}">${s.link}</b><b>${s.done}</b></div>`).join('')}</div>`)}

    ${card(`<div class="lbl">Чего мы не знаем</div><p class="tx">${esc(G.unknown)}</p>
      <div class="lbl" style="margin-top:14px">Вопрос</div><p class="tx">${esc(G.question)} <b>${esc(G.owner)}</b></p>`)}`;

  /* ---------------------------------------------------------------- вкладка «Люди» */
  const paneP = () => `
    <div class="grid2">
      ${tile({ k: 'Численность HQ', v: int(NOW), m: '+118 за месяц', sheet: 'tile', key: 'hq_hc' })}
      ${tile({ k: 'Текучесть HQ, годовая', v: '12,1%', tone: 'green', m: '−1,3 п.п. за год', mTone: 'good', sheet: 'tile', key: 'attrition_hq' })}
      ${tile({ k: 'Отток руководителей', v: '9,8%', tone: 'red', m: 'шестой месяц роста', mTone: 'bad', sheet: 'tile', key: 'attrition_mgr' })}
      ${tile({ k: 'Недоукомплектованность', v: '7,5%', m: 'коридор 7–8%', sheet: 'tile', key: 'vacancy_rate' })}
    </div>

    <div class="sect"><h3>Четыре находки месяца</h3><span class="n">по касанию — разбор</span></div>
    ${card(`<div class="rowl">${D.findings.map(f => row({
      st: f.priority === 1 ? 'red' : 'amber', title: f.claim, sub: f.kicker + ' · ' + f.owner,
      value: f.unit === '%' ? num(f.value, 1) + '%' : int(f.value), vTone: f.priority === 1 ? 'red' : 'amber',
      sheet: 'finding', key: f.id })).join('')}</div>`)}

    <div class="sect"><h3>Отток руководителей против общего</h3></div>
    ${card(`<div class="viz">${dual({ a: F('managers_leaving').series, b: F('managers_leaving').compare, labels: F('managers_leaving').months, aLabel: 'руководители 9,8%', bLabel: 'год назад 7,1%' })}</div>
      <p class="tx">Доля руководителей в оттоке выросла с 8% до 11% при неизменной доле в численности — 13%. Две трети ушедших — Discovery Core и Other Digital.</p>`)}

    <div class="sect"><h3>Что сдвинулось за месяц</h3></div>
    ${card(`<div class="rowl">${S.changes.map(c => row({ st: 'amber', title: c.text })).join('')}</div>`)}

    <div class="sect"><h3>Что не изменилось</h3><span class="n">об этом можно не говорить</span></div>
    ${card(`<div class="rowl">${S.stable.map(t => row({ st: 'ok', title: t })).join('')}</div>`)}`;

  /* ---------------------------------------------------------------- вкладка «Все» */
  const GROUPS = [...new Set(C.map(m => m.group))];
  const AV = ['есть', 'нужна склейка', 'бэклог'];
  const state = { q: '', group: '', av: '' };

  const paneAll = () => `
    <div class="search">
      <svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l4.5 4.5"/></svg>
      <input id="q" type="search" placeholder="Поиск по ${C.length} метрикам" autocomplete="off" enterkeyhint="search">
      <button class="clr" id="clr" hidden aria-label="Очистить">✕</button>
    </div>
    <div class="fchips" id="gchips">
      <button data-g="" class="on">Все группы</button>
      ${GROUPS.map(g => `<button data-g="${esc(g)}">${esc(g)}</button>`).join('')}
    </div>
    <div class="fchips" id="achips">
      <button data-a="" class="on">Любая доступность</button>
      ${AV.map(a => `<button data-a="${esc(a)}">${esc(a)} · ${C.filter(m => m.availability === a).length}</button>`).join('')}
    </div>
    <div class="cnt" id="cnt"></div>
    <div id="list"></div>`;

  function renderList() {
    const q = state.q.trim().toLowerCase();
    const hit = C.filter(m =>
      (!state.group || m.group === state.group) &&
      (!state.av || m.availability === state.av) &&
      (!q || (m.name + ' ' + m.group + ' ' + m.definition + ' ' + (m.owner || '')).toLowerCase().includes(q)));
    const byGroup = {};
    hit.forEach(m => { (byGroup[m.group] = byGroup[m.group] || []).push(m); });
    document.getElementById('cnt').textContent = hit.length === C.length
      ? `${C.length} метрик · ${GROUPS.length} групп` : `показано ${hit.length} из ${C.length}`;
    document.getElementById('list').innerHTML = hit.length ? Object.keys(byGroup).map(g => `
      <div class="sect"><h3>${esc(g)}</h3><span class="n">${byGroup[g].length}</span></div>
      ${card(`<div class="rowl">${byGroup[g].map(m => {
        const long = m.fmt === 'text' || String(m.value).length > 13;  // составные значения уводим под название
        return row({
          st: m.status, title: m.name, sub: long ? String(m.value) : (m.sub || m.owner),
          value: long ? '' : val(m.value, m.fmt), vTone: tone(m.status),
          delta: long ? '' : delta(m.delta_mom, m.fmt), dTone: dcls(m.delta_mom, m.good),
          sheet: 'metric', key: m.id });
      }).join('')}</div>`)}`).join('')
      : '<div class="empty">Ничего не нашли. Попробуйте другое слово или снимите фильтр.</div>';
  }

  /* ---------------------------------------------------------------- шторка */
  const scrim = () => document.getElementById('scrim');
  const sheetEl = () => document.getElementById('sheet');

  function openSheet(o) {
    sheetEl().querySelector('.body').innerHTML = `
      <div class="kick">${esc(o.kick || '')}</div>
      <h3>${esc(o.title)}</h3>
      ${o.big ? `<div class="big ${o.bigTone || ''}">${o.big}</div>` : ''}
      ${o.sub ? `<div class="kick" style="margin-top:8px">${esc(o.sub)}</div>` : ''}
      ${o.viz ? `<div class="viz">${o.viz}</div>` : ''}
      ${o.meta ? `<div class="meta">${o.meta.map(m => `<div><div class="l">${esc(m.l)}</div><div class="v ${m.cls || ''}">${m.v}</div></div>`).join('')}</div>` : ''}
      ${(o.blocks || []).filter(b => b && b.v).map(b => `<div class="blk"><div class="l">${esc(b.l)}</div><div class="v">${b.raw ? b.v : esc(b.v)}</div></div>`).join('')}
      <button class="close" id="closeSheet">Закрыть</button>`;
    sheetEl().classList.add('on'); scrim().classList.add('on');
    document.body.style.overflow = 'hidden';
    sheetEl().querySelector('.body').scrollTop = 0;
    document.getElementById('closeSheet').addEventListener('click', closeSheet);
  }
  function closeSheet() {
    sheetEl().classList.remove('on'); scrim().classList.remove('on');
    document.body.style.overflow = '';
  }

  const SHEETS = {
    metric(key) {
      const m = C.find(x => x.id === key);
      return {
        kick: m.group, title: m.name,
        big: val(m.value, m.fmt), bigTone: tone(m.status),
        sub: m.sub || '',
        viz: m.spark ? spark(m.spark, { width: 300, height: 56, tone: tone(m.status) }) + '<div class="kick" style="margin-top:6px">13 месяцев</div>' : '',
        meta: [
          { l: 'Месяц к месяцу', v: delta(m.delta_mom, m.fmt) || '—', cls: dcls(m.delta_mom, m.good) },
          { l: 'Год к году', v: delta(m.delta_yoy, m.fmt) || '—', cls: dcls(m.delta_yoy, m.good) },
          { l: 'Цель', v: m.target != null ? val(m.target, m.fmt) : '—' },
          { l: 'Владелец', v: esc(m.owner || '—') },
        ],
        blocks: [
          { l: 'Определение', v: m.definition },
          { l: 'Данные', v: `<span class="badge ${avCls(m.availability)}">${esc(m.availability)}</span>`, raw: true },
        ],
      };
    },
    signal(key) {
      const lvl = key.startsWith('red') ? 'red' : 'amber';
      const s = S.signals.filter(x => x.level === lvl)[+key.replace(lvl, '')];
      return { kick: lvl === 'red' ? 'Решать сейчас' : 'Наблюдать', title: s.title, blocks: [{ l: 'Что происходит', v: s.text }, { l: 'Владелец', v: s.owner || 'не назначен' }] };
    },
    tile(key) {
      const t = T(key);
      return {
        kick: t.group, title: t.title,
        big: val(t.value, t.fmt, t.decimals), bigTone: tone(t.status), sub: t.unit,
        meta: [
          { l: 'Месяц к месяцу', v: delta(t.delta_mom, t.fmt) || '—', cls: dcls(t.delta_mom, t.good) },
          { l: 'Год к году', v: delta(t.value - (t.prev_year != null ? t.prev_year : t.value), t.fmt) || '—', cls: dcls(t.value - (t.prev_year != null ? t.prev_year : t.value), t.good) },
          ...(t.secondary || []).map(s => ({ l: s.label, v: esc(s.value) })),
        ],
        blocks: [
          { l: 'Статус', v: t.status_text },
          { l: 'Определение', v: t.definition },
          { l: 'Вопрос', v: t.question },
          { l: 'Кому', v: (t.ask || t.owner || '').replace('→ ', '') },
        ],
      };
    },
    finding(key) {
      const f = F(key);
      return {
        kick: f.kicker, title: f.claim,
        big: f.unit === '%' ? num(f.value, 1) + '%' : int(f.value), bigTone: f.priority === 1 ? 'red' : 'amber',
        sub: f.unit + ' · ' + f.value_note,
        blocks: [{ l: 'Разбор', v: f.text }, { l: 'Как считали', v: f.how }, { l: 'Источник', v: f.source },
          { l: 'Чего мы не знаем', v: f.unknown }, { l: 'Вопрос', v: f.question }, { l: 'Владелец', v: f.owner }],
      };
    },
    goal(key) {
      const s = G.stages.find(x => x.id === key);
      return {
        kick: 'Цели', title: s.name, big: s.value + '%', bigTone: tone(s.status), sub: s.sub,
        viz: spark(s.series, { width: 300, height: 56, tone: tone(s.status) }) + '<div class="kick" style="margin-top:6px">13 месяцев</div>',
        meta: [{ l: 'Цель', v: s.target + '%' }, { l: 'Разрыв', v: (s.value - s.target) + ' п.п.', cls: s.value < s.target ? 'bad' : 'good' },
          ...s.detail.map(d => ({ l: d.name, v: d.v + (d.unit ? ' ' + d.unit : '%') }))],
        blocks: [{ l: 'Определение', v: s.definition }, { l: 'Владелец', v: G.owner }],
      };
    },
    res() {
      return {
        kick: 'Ресурс', title: R.headline, big: num(R.value, 1) + '%', bigTone: tone(R.status),
        viz: spark(R.series, { width: 300, height: 56, tone: tone(R.status) }) + '<div class="kick" style="margin-top:6px">13 месяцев</div>',
        meta: [{ l: 'Цель', v: num(R.target, 1) + '%' }, { l: 'Год назад', v: num(R.prev_year, 1) + '%' },
          ...R.levels.slice(1).map(l => ({ l: l.name, v: num(l.value, 1) + '%' }))],
        blocks: [{ l: 'Определение', v: R.definition }, { l: 'Чего мы не знаем', v: R.unknown }, { l: 'Владелец', v: R.owner }],
      };
    },
    text(key) {
      const t = { limit: { kick: 'Решение', title: 'Приоритизация 1 850 вакансий под лимит 23 500',
        blocks: [{ l: 'Что решаем', v: 'Какие примерно 200 вакансий снимаем или переносим на 2027 год.' },
          { l: 'Срок', v: K.deadline.value + ' — позже офферы уже выйдут, и решение будет стоить дороже.' },
          { l: 'Ставка', v: K.items[0].value + ' · ' + K.items[0].money },
          { l: 'Владелец', v: 'HR HQ + финансы + руководители линий' }] } };
      return t[key];
    },
  };

  /* ---------------------------------------------------------------- каркас */
  const TABS = [
    { id: 'now', name: 'Сводка', icon: ICONS.now, flag: S.signals.filter(s => s.level === 'red').length, pane: paneNow },
    { id: 'res', name: 'Ресурс', icon: ICONS.res, pane: paneRes },
    { id: 'goal', name: 'Цели', icon: ICONS.goal, pane: paneGoal },
    { id: 'ppl', name: 'Люди', icon: ICONS.ppl, pane: paneP },
    { id: 'all', name: 'Все', icon: ICONS.all, pane: paneAll },
  ];

  document.getElementById('app').innerHTML = `
    <div class="wrap">
      <header class="hdr"><div class="in">
        <div><div class="ttl" id="ttl">Сводка</div><div class="sub">${esc(D.meta.company)} · ${esc(D.meta.period_label)}</div></div>
        <div class="sp"></div>
        <button class="ico" id="theme" aria-label="Сменить тему">${svg('<path d="M19 13.6A7.6 7.6 0 1 1 10.4 5a6 6 0 0 0 8.6 8.6z"/>')}</button>
      </div></header>
      <main>${TABS.map(t => `<div class="pane${t.id === 'now' ? ' on' : ''}" id="p-${t.id}">${t.pane()}</div>`).join('')}
        <p class="foot">${esc(D.meta.prepared_by)} · выпуск ${esc(D.meta.issue_no)}<br>${esc(D.meta.disclaimer)}</p>
      </main>
    </div>
    <nav class="tabs">${TABS.map(t => `<button data-tab="${t.id}" class="${t.id === 'now' ? 'on' : ''}">
      <span class="ic">${svg(t.icon)}${t.flag ? `<span class="fl">${t.flag}</span>` : ''}</span><span>${esc(t.name)}</span></button>`).join('')}</nav>
    <div class="scrim" id="scrim"></div>
    <aside class="sheet" id="sheet" role="dialog" aria-modal="true"><div class="grab"></div><div class="body"></div></aside>`;

  renderList();

  /* переключение вкладок */
  const scrollMemo = {};
  let cur = 'now';
  document.querySelector('.tabs').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const id = b.dataset.tab; if (id === cur) { scrollTo({ top: 0, behavior: 'smooth' }); return; }
    scrollMemo[cur] = scrollY; cur = id;
    document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b));
    document.querySelectorAll('.pane').forEach(p => p.classList.toggle('on', p.id === 'p-' + id));
    document.getElementById('ttl').textContent = TABS.find(t => t.id === id).name === 'Все' ? 'Все метрики' : TABS.find(t => t.id === id).name;
    scrollTo(0, scrollMemo[id] || 0);
  });

  /* открытие шторки */
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-sheet]'); if (!b || !b.dataset.sheet) return;
    const build = SHEETS[b.dataset.sheet]; if (!build) return;
    const o = build(b.dataset.key); if (o) openSheet(o);
  });
  scrim().addEventListener('click', closeSheet);
  addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
  // потянуть шторку вниз
  let sy = 0, drag = false;
  sheetEl().addEventListener('touchstart', e => { if (e.target.closest('.body') && sheetEl().querySelector('.body').scrollTop > 0) return; sy = e.touches[0].clientY; drag = true; }, { passive: true });
  sheetEl().addEventListener('touchend', e => { if (drag && e.changedTouches[0].clientY - sy > 70) closeSheet(); drag = false; }, { passive: true });

  /* каталог: поиск и фильтры */
  const q = document.getElementById('q');
  q.addEventListener('input', () => {
    state.q = q.value; document.getElementById('clr').hidden = !q.value; renderList();
  });
  document.getElementById('clr').addEventListener('click', () => { q.value = ''; state.q = ''; document.getElementById('clr').hidden = true; renderList(); q.focus(); });
  document.getElementById('gchips').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    state.group = b.dataset.g;
    document.querySelectorAll('#gchips button').forEach(x => x.classList.toggle('on', x === b));
    renderList();
  });
  document.getElementById('achips').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    state.av = b.dataset.a;
    document.querySelectorAll('#achips button').forEach(x => x.classList.toggle('on', x === b));
    renderList();
  });

  /* тема: авто → светлая → тёмная */
  const order = ['', 'light', 'dark']; let ti = 0;
  document.getElementById('theme').addEventListener('click', () => {
    ti = (ti + 1) % order.length;
    if (order[ti]) document.documentElement.setAttribute('data-theme', order[ti]);
    else document.documentElement.removeAttribute('data-theme');
  });
})();
