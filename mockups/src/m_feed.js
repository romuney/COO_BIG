/* m_feed.js — «Лента»: карточки в один столбец, фильтр сверху, детали по касанию.
   Правило: на карточке — вывод и число, под касанием — как считали и чего не знаем. */
(() => {
  (() => { if (!document.querySelector('meta[name="viewport"]')) { const m = document.createElement('meta'); m.name = 'viewport'; m.content = 'width=device-width, initial-scale=1, viewport-fit=cover'; document.head.appendChild(m); } })();
  const D = window.DATA, S = D.summary, R = D.resources, G = D.goals, K = D.stakes, C = D.catalog;
  const { int, num, esc, ring, spark, meter, funnel, bars, rows, fork, dual, dots } = MB;
  const F = id => D.findings.find(x => x.id === id);
  const T = id => D.control_panel.find(x => x.id === id);
  const tone = st => ({ red: 'red', amber: 'amber', ok: 'green', none: '' }[st] || '');

  /* ---------------------------------------------------------------- сборка карточки */
  const blk = (l, v) => `<div class="blk"><div class="l">${esc(l)}</div><div class="v">${esc(v)}</div></div>`;
  const unk = v => `<div class="blk unknown"><div class="l">Чего мы не знаем</div><div class="v">${esc(v)}</div></div>`;

  function card(o) {
    const open = !!(o.more || o.question);
    return `<article class="c${open ? ' tap' : ''}" data-tags="${(o.tags || []).join(' ')}">
      <div class="eyebrow ${o.tone || ''}"><span class="dot"></span><span>${esc(o.kicker)}</span></div>
      ${o.big ? `<div class="big ${o.bigTone || o.tone || ''}">${o.big}</div>` : ''}
      ${o.sub ? `<div class="sub">${o.sub}</div>` : ''}
      ${o.h ? `<h2 class="h">${esc(o.h)}</h2>` : ''}
      ${o.p ? `<p class="p">${esc(o.p)}</p>` : ''}
      ${o.viz ? `<div class="viz">${o.viz}</div>` : ''}
      ${o.body || ''}
      ${open ? `<div class="expand"><i>▶</i>${esc(o.expandLabel || 'Как считали и чего не знаем')}</div>
        <div class="more">${o.more || ''}${o.question ? `<div class="q"><div class="t">${esc(o.question)}</div><div class="o">${esc(o.owner || '')}</div></div>` : ''}</div>` : ''}
    </article>`;
  }

  /* находка → карточка: у всех находок одинаковый набор полей */
  function finding(id, extra) {
    const f = F(id);
    return card(Object.assign({
      kicker: f.kicker,
      big: f.unit === '%' ? num(f.value, 1) + '%' : int(f.value),
      sub: `${esc(f.unit)} · ${esc(f.value_note)}`,
      h: f.claim, p: f.text,
      more: blk('Как считали', f.how) + blk('Источник', f.source) + unk(f.unknown),
      question: f.question, owner: f.owner,
    }, extra));
  }

  /* ---------------------------------------------------------------- карточки ленты */
  const hq = T('hq_hc'), ov = T('overdue_vac'), ai = T('ai_wau'), wl = T('workload'), gc = T('goal_coverage');
  const red = S.signals.filter(s => s.level === 'red').length;
  const amb = S.signals.filter(s => s.level === 'amber').length;
  const grn = S.signals.filter(s => s.level === 'ok').length;

  const CARDS = [
    /* 1 — итог месяца */
    card({
      tags: ['hot', 'end'], tone: 'accent', kicker: `Итог месяца · ${D.meta.as_of}`,
      h: S.headline,
      p: 'Прирост HQ идёт по плану: +790 с начала года при плане +802. Но найм уже запущен на 2 262 человека при 570 свободных местах, а внутри падающей текучести ускоряется отток руководителей.',
      body: `<div class="tally">
        <div class="red"><div class="v">${red}</div><div class="l">красных</div></div>
        <div class="amber"><div class="v">${amb}</div><div class="l">жёлтых</div></div>
        <div class="green"><div class="v">${grn}</div><div class="l">зелёных</div></div></div>`,
      expandLabel: 'Три абзаца, если нужен контекст',
      more: S.paragraphs.map(t => `<div class="blk"><div class="v">${esc(t)}</div></div>`).join(''),
    }),

    /* 2 — лимит */
    card({
      tags: ['hot'], tone: 'red', kicker: `Решение до 15 сентября · ${esc(hq.owner)}`,
      big: '570', bigTone: 'red', sub: 'свободных мест до лимита 23 500 · HQ 22 930 на 31 августа',
      h: 'Найм уже запущен на 2 262 человека — вчетверо больше, чем осталось мест',
      p: 'Факт под контролем: прирост с начала года +790 при плане +802. Проблема в инерции: 412 принятых офферов и 1 850 вакансий в работе. Если воронка отработает как обычно, декабрь выходит за лимит.',
      body: `<div class="pair">
          <div><div class="v red">2 262</div><div class="l">найма в очереди<br>412 офферов + 1 850 вакансий</div></div>
          <div><div class="v">570</div><div class="l">мест до лимита<br>23 500 на 31.12.2026</div></div>
        </div>
        <div class="viz">${fork({ min: 23100, max: 23750, lo: 23330, hi: 23620, limit: 23500, loLabel: 'по темпу 23 330', hiLabel: 'по воронке 23 620', limitLabel: 'лимит 23 500', aria: 'Вилка прогноза на декабрь пересекает лимит' })}</div>
        <p class="p">Вилка прогноза на декабрь пересекает лимит. Уложиться можно, только сняв или перенеся примерно 200 вакансий из 1 850.</p>`,
      more: blk('Как считали', 'Нижняя граница — средний прирост восьми месяцев. Верхняя — воронка: принятые офферы плюс вакансии в работе с историческими конверсиями и оттоком.')
        + blk('Счёт прошлого прогноза', K.scoreboard.text)
        + unk('Конверсия вакансий в выходы взята по прошлому году. Если рынок изменится, границы сдвинутся — но обе выше запаса в 570 мест.'),
      question: hq.question, owner: hq.ask.replace('→ ', ''),
    }),

    /* 3-6 — находки */
    finding('hidden_growth', {
      tags: ['hot', 'people'], tone: 'red',
      viz: rows(F('hidden_growth').scale.map(s => ({ name: s.name, v: s.v, tone: s.flag === 'red' ? 'hot' : '' })), { fmt: 'int' }),
    }),
    finding('hq_drain', {
      tags: ['hot', 'people'], tone: 'red',
      viz: bars({ values: F('hq_drain').series, labels: F('hq_drain').months, hotFrom: 6, height: 92, every: 1 }),
    }),
    finding('managers_leaving', {
      tags: ['hot', 'people'], tone: 'red',
      viz: dual({ a: F('managers_leaving').series, b: F('managers_leaving').compare, labels: F('managers_leaving').months, aLabel: 'руководители 9,8%', bLabel: 'год назад 7,1%' }),
    }),
    finding('managers_without_teams', {
      tags: ['people'], tone: 'amber',
      viz: bars({ values: F('managers_without_teams').hist, labels: F('managers_without_teams').bins, hot: [0, 1], height: 92, every: 1 }),
    }),

    /* 7 — ресурсообеспеченность */
    card({
      tags: ['res'], tone: tone(R.status), kicker: `Ресурсообеспеченность · ${esc(R.owner)}`,
      body: `<div class="ring-wrap">
          <div class="c2">${ring({ size: 108, stroke: 11, value: R.value, target: R.target, tone: tone(R.status) })}<b>${num(R.value, 1)}%</b></div>
          <div class="side">Цель <b>${num(R.target, 1)}%</b><br>Год назад ${num(R.prev_year, 1)}%<br>Месяц назад ${num(R.prev_month, 1)}%</div>
        </div>
        <h2 class="h">${esc(R.headline)}</h2>
        <p class="p">${esc(R.comment)}</p>
        <div class="lvl">${R.levels.map(l => `<div>
          <div class="t"><span>${esc(l.name)}</span><b>${num(l.value, 1)}%</b></div>
          ${meter({ value: l.value, max: 100 })}
          <div class="s">${esc(l.sub)}</div></div>`).join('')}</div>`,
      more: blk('Определение', R.definition) + unk(R.unknown)
        + `<div class="blk"><div class="l">Рядом</div><div class="rows">${R.side.map(s => `<div class="r"><div class="n">${esc(s.label)}<small>${esc(s.sub)}</small></div><div class="v">${esc(s.value)}</div><div class="d"></div></div>`).join('')}</div></div>`,
      question: R.question, owner: R.owner,
    }),

    /* 8 — дефицит по профессиям */
    card({
      tags: ['res', 'hire'], tone: 'red', kicker: 'Где ресурса не хватает',
      h: 'Среднее 92,5% держится за счёт non-IT; в ML не хватает каждого седьмого',
      p: 'Обеспеченность по профессиям, август. Шкала обрезана до 84–96%, иначе разница не видна; штрих — цель 93%.',
      viz: dots(R.professions.map(p => ({ name: p.name, v: p.value, tone: p.status === 'red' ? 'hot' : p.status === 'amber' ? 'warm' : 'good' })), { min: 84, max: 96, target: R.target, suffix: '%' }),
      body: `<div class="tri">
        <div class="hd"><span>Сегмент</span><span>Обесп.</span><span>Ваканс.</span><span>Числ.</span></div>
        ${R.segments.map(s => `<div class="rr"><span class="n">${esc(s.name)}</span>
          <b class="${s.status === 'red' ? 'red' : s.status === 'amber' ? 'amber' : 'green'}">${num(s.value, 1)}</b>
          <b>${int(s.vac)}</b><b>${int(s.hc)}</b></div>`).join('')}</div>`,
      more: blk('Как считали', 'Численность / (численность + вакансии в работе) внутри профессии. Вакансии-замены с уже уволенным сотрудником учитываются, «замены при работающем» — тоже: их 79, и это завышает дефицит.'),
      question: 'В каких командах дефицит ML реально тормозит поставку, а где вакансия открыта про запас?', owner: 'Рекрутмент, руководители линий',
    }),

    /* 9 — цели: воронка */
    card({
      tags: ['goal', 'hot'], tone: 'red', kicker: `Цели · ${esc(G.owner)}`,
      big: '71%', bigTone: 'red', sub: 'целей связаны с целью уровнем выше · цель 85%',
      h: G.headline, p: G.comment,
      viz: funnel(G.funnel.map((s, i) => ({ name: s.name, v: s.v, note: ['цель 95%', 'цель 85%', '60 дней', 'I полугодие'][i], tone: i === 1 ? '' : 'dim' })), { width: 300 }),
      more: unk(G.unknown) + blk('Как считали', 'Связанность — доля активных целей, у которых указана родительская цель уровнем выше. Считается по выгрузке СУП на конец месяца.'),
      question: G.question, owner: G.owner,
    }),

    /* 10 — четыре стадии */
    card({
      tags: ['goal'], tone: 'amber', kicker: 'Четыре стадии целеполагания',
      p: 'Ставим лучше всего, связываем хуже всего. Спарклайн — тринадцать месяцев.',
      body: `<div class="rows">${G.stages.map(s => `<div class="r">
          <div class="n">${esc(s.name)}<small>${esc(s.sub)}</small></div>
          <div class="v ${tone(s.status)}">${s.value}%</div>
          <div class="d">${spark(s.series, { width: 62, height: 26, tone: '' })}цель ${s.target}%</div>
        </div>`).join('')}</div>`,
      more: G.stages.map(s => blk(s.name, s.definition)).join('')
        + `<div class="blk"><div class="l">Разбор поставленности</div><div class="v">${G.stages[0].detail.map(x => `${esc(x.name)} — ${x.v}${x.unit ? ' ' + esc(x.unit) : '%'}`).join(' · ')}</div></div>`,
      question: gc.question, owner: gc.owner,
    }),

    /* 11 — цели по сегментам */
    card({
      tags: ['goal'], tone: 'amber', kicker: 'Цели по сегментам',
      h: 'Discovery Core проседает на всех трёх стадиях',
      body: `<div class="tri">
        <div class="hd"><span>Сегмент</span><span>Пост.</span><span>Связ.</span><span>Дост.</span></div>
        ${G.segments.map(s => `<div class="rr"><span class="n">${esc(s.name)}</span>
          <b>${s.set}</b><b class="${s.link < 65 ? 'red' : s.link < 75 ? 'amber' : 'green'}">${s.link}</b><b>${s.done}</b></div>`).join('')}</div>`,
      more: blk('Как читать', 'Поставленность — доля юнитов с целями. Связанность — доля целей с родительской целью. Достижение — доля целей I полугодия, закрытых в срок. Все три — проценты.'),
      question: 'Discovery Core: 58% связанности — цели не с чем связывать или связь не проставили?', owner: 'HRBP Discovery, Performance-команда',
    }),

    /* 12 — просроченные вакансии */
    card({
      tags: ['hire', 'hot'], tone: 'red', kicker: `Найм · ${esc(ov.owner)}`,
      big: '27%', bigTone: 'red', sub: `вакансий старше 90 дней · цель ≤ 20% · ${esc(ov.status_text)}`,
      h: 'Найм работает на прежней мощности, но стареет и дорожает',
      p: 'Около 300 закрытий в месяц держатся, а очередь стареет: 500 позиций из 1 850 висят дольше квартала, и почти все — senior SDE и ML. Отказы от офферов выросли до 14%, каждый девятый найм идёт с sign-on.',
      body: `<div class="rows">${ov.secondary.concat(T('vacancy_rate').secondary).map(s => `<div class="r"><div class="n">${esc(s.label)}</div><div class="v">${esc(s.value)}</div><div class="d"></div></div>`).join('')}</div>`,
      more: blk('Что изменилось за месяц', S.changes.filter(c => c.page === 'hiring').map(c => c.text).join(' · '))
        + unk('Мы не отделяем «долго ищем» от «вакансия висит формально»: часть просроченных могла быть заморожена без снятия статуса.'),
      question: ov.question, owner: ov.owner,
    }),

    /* 13 — ИИ и нагрузка */
    card({
      tags: ['prod'], tone: 'amber', kicker: 'Продуктивность и ИИ',
      big: '51%', bigTone: 'amber', sub: 'еженедельно используют ИИ-инструменты · цель 60%',
      h: 'ИИ стал нормой в разработке и не стал в дискавери',
      p: '78% SDE и 81% ML работают с инструментами каждую неделю. Дизайнеры и продакты — 41–47%. Доступ есть у 74%, значит дело не в доступе.',
      body: `<div class="rows">
        ${ai.secondary.map(s => `<div class="r"><div class="n">${esc(s.label)}</div><div class="v">${esc(s.value)}</div><div class="d"></div></div>`).join('')}
        <div class="r"><div class="n">В зоне перегрузки<small>${esc(wl.status_text)}</small></div><div class="v amber">${num(wl.value, 1)}%</div><div class="d bad">+${num(wl.delta_mom, 1)} п.п.</div></div>
        ${wl.secondary.map(s => `<div class="r"><div class="n">${esc(s.label)}</div><div class="v">${esc(s.value)}</div><div class="d"></div></div>`).join('')}</div>`,
      more: blk('Как считали', 'Еженедельная активность — доля сотрудников с хотя бы одной сессией в корпоративных ИИ-инструментах за неделю, усреднённая по месяцу.')
        + unk('Мы считаем факт использования, а не пользу. Связи с производительностью команд у нас пока нет — это отдельная работа.'),
      question: ai.question, owner: ai.owner,
    }),

    /* 14 — что изменилось */
    card({
      tags: ['end'], tone: 'amber', kicker: 'Что сдвинулось за месяц',
      body: `<div class="rows">${S.changes.map(c => `<div class="r"><div class="n">${esc(c.text)}</div><div class="v"></div><div class="d"></div></div>`).join('')}</div>`,
    }),

    /* 15 — что не изменилось */
    card({
      tags: ['end'], tone: 'green', kicker: 'Что не изменилось — и это хорошо',
      p: 'Об этом не нужно говорить на встрече. Проверено, стабильно, в коридоре.',
      body: `<div class="rows">${S.stable.map(t => `<div class="r"><div class="n">${esc(t)}</div><div class="v"></div><div class="d"></div></div>`).join('')}</div>`,
    }),

    /* 16 — вопросы */
    card({
      tags: ['end', 'hot'], tone: 'accent', kicker: 'Пять вопросов на встречу',
      p: 'Каждый вопрос адресован конкретной роли. Если ответа нет за две недели — это и есть результат.',
      body: `<div class="qlist">${S.questions.map((q, i) => `<div class="ql"><div class="i">${i + 1}</div><div><div class="t">${esc(q.q)}</div><div class="o">${esc(q.to)}</div></div></div>`).join('')}</div>`,
    }),

    /* 17 — решения и ставка */
    card({
      tags: ['end', 'hot'], tone: 'red', kicker: `${esc(K.deadline.value)} · ${esc(K.deadline.label)}`,
      h: 'Два решения, которые дешевле принять в сентябре',
      body: `<div class="qlist">${S.decisions.map(d => `<div class="dec"><div class="t">${esc(d.text)}</div><div class="m"><b>${esc(d.owner)}</b></div></div>`).join('')}</div>
        <div class="rows" style="margin-top:14px">${K.items.map(it => `<div class="r"><div class="n">${esc(it.label)}<small>${esc(it.money)} · ${esc(it.assumption)}</small></div><div class="v">${esc(it.value)}</div><div class="d"></div></div>`).join('')}</div>`,
      more: blk('Счёт прошлого прогноза', `Было ${K.scoreboard.prev} → стало ${K.scoreboard.now}. ${K.scoreboard.text}`)
        + unk('Деньги — оценка по средней стоимости места, без разбивки по грейдам и регионам.'),
    }),

    /* 18 — каталог */
    (() => {
      const groups = {};
      C.forEach(m => { (groups[m.group] = groups[m.group] || []).push(m); });
      const av = k => C.filter(m => m.availability === k).length;
      return card({
        tags: ['end'], tone: '', kicker: 'Под лентой — каталог',
        big: String(C.length), sub: 'метрик собрано в девяти группах',
        h: 'Лента показывает восемнадцать сюжетов. Остальное лежит в каталоге и достаётся по запросу',
        p: 'Так устроен выпуск: наверху то, по чему нужно решение, ниже — вся база, из которой это посчитано.',
        body: `<div class="cat">${Object.keys(groups).map(g => `<div class="g"><span>${esc(g)}</span><b>${groups[g].length}</b></div>`).join('')}</div>
          <div class="tags"><span class="tag ok">есть данные — ${av('есть')}</span><span class="tag mid">нужна склейка — ${av('нужна склейка')}</span><span class="tag no">в бэклоге — ${av('бэклог')}</span></div>`,
        more: blk('Что значит «нужна склейка»', 'Данные есть в двух системах, но не связаны ключом: считается вручную, повторяемость не гарантирована.')
          + blk('Что значит «в бэклоге»', 'Источника нет или он не покрывает нужный разрез. Каждая такая метрика — отдельная задача с владельцем и сроком.'),
      });
    })(),
  ];

  /* ---------------------------------------------------------------- фильтр и разметка */
  const CHIPS = [
    { id: 'all', name: 'Всё' },
    { id: 'hot', name: 'Решать сейчас' },
    { id: 'res', name: 'Ресурс' },
    { id: 'goal', name: 'Цели' },
    { id: 'people', name: 'Люди' },
    { id: 'hire', name: 'Найм' },
    { id: 'end', name: 'Итоги' },
  ];

  document.getElementById('app').innerHTML = `
    <header class="top">
      <div class="row"><h1>Лента</h1><span class="sp"></span>
        <span class="date">${esc(D.meta.period_label)} · ${esc(D.meta.issue_no)}</span>
        <button class="theme" id="theme" aria-label="Сменить тему">Тема</button></div>
      <p class="lead">${CARDS.length} карточек, ${red} требуют решения. Касание раскрывает: как считали и чего мы не знаем.</p>
      <div class="chips" id="chips">${CHIPS.map((c, i) => `<button data-id="${c.id}" class="${i === 0 ? 'on' : ''}">${esc(c.name)}<span class="n"></span></button>`).join('')}</div>
    </header>
    <main id="feed">${CARDS.join('')}</main>
    <p class="foot">${esc(D.meta.company)} · ${esc(D.meta.prepared_by)}<br>${esc(D.meta.disclaimer)}</p>`;

  const feed = document.getElementById('feed');
  const arts = [...feed.querySelectorAll('.c')];

  // счётчики на чипах
  document.querySelectorAll('#chips button').forEach(b => {
    const id = b.dataset.id;
    const n = id === 'all' ? arts.length : arts.filter(a => a.dataset.tags.split(' ').includes(id)).length;
    b.querySelector('.n').textContent = n;
  });

  document.getElementById('chips').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    document.querySelectorAll('#chips button').forEach(x => x.classList.toggle('on', x === b));
    const id = b.dataset.id;
    arts.forEach(a => { a.style.display = (id === 'all' || a.dataset.tags.split(' ').includes(id)) ? '' : 'none'; });
    scrollTo({ top: 0, behavior: 'smooth' });
  });

  // раскрытие карточки
  feed.addEventListener('click', e => {
    const c = e.target.closest('.c.tap'); if (!c) return;
    if (window.getSelection && String(window.getSelection()).length > 3) return;
    c.classList.toggle('open');
  });

  // тема: авто → светлая → тёмная
  const order = ['', 'light', 'dark'];
  let ti = 0;
  document.getElementById('theme').addEventListener('click', () => {
    ti = (ti + 1) % order.length;
    if (order[ti]) document.documentElement.setAttribute('data-theme', order[ti]);
    else document.documentElement.removeAttribute('data-theme');
    document.getElementById('theme').textContent = ['Тема', 'Светлая', 'Тёмная'][ti];
  });
})();
