/* app.js — рендер страниц Exec Board из window.DATA */
(() => {
  const D = window.DATA, M = D.meta;
  const { fmtInt, fmtNum, fmtPct, fmtVal, fmtDelta, esc } = CH;

  const PAGES = [
    { id: 'summary', no: '01', nav: 'Главное', eyebrow: 'Главное за месяц' },
    { id: 'panel', no: '02', nav: 'Панель управления', eyebrow: 'Панель управления · 15 метрик здоровья организации' },
    { id: 'headcount', no: '03', nav: 'Численность', eyebrow: 'Численность и лимит роста', sep: true },
    { id: 'hiring', no: '04', nav: 'Найм', eyebrow: 'Найм, вакансии и замены' },
    { id: 'flow', no: '05', nav: 'Движение людей', eyebrow: 'Движение людей и talent actions' },
    { id: 'shifts', no: '06', nav: 'Сдвиги', eyebrow: 'Сдвиги в структуре · слоп-диаграммы' },
    { id: 'professions', no: '07', nav: 'Профессии', eyebrow: 'Здоровье структуры по профессиям' },
    { id: 'management', no: '08', nav: 'Управляемость', eyebrow: 'Оргструктура и управляемость' },
    { id: 'productivity', no: '09', nav: 'ИИ и нагрузка', eyebrow: 'Продуктивность, ИИ, нагрузка, риски' },
    { id: 'crossdata', no: '10', nav: 'CrossData', eyebrow: 'Инфраструктура решений · минутка промо' },
    { id: 'appendix', no: '11', nav: 'Приложение', eyebrow: 'Приложение', sep: true },
  ];
  const pageNo = id => (PAGES.find(p => p.id === id) || {}).no || '';
  const STATUS_WORD = { red: 'Требует решения', amber: 'Наблюдаем', ok: 'По плану', none: 'Без изменений' };

  /* ---------------------------------------------------------------- общие элементы */
  const chip = (st, text) => `<span class="chip ${st}">${esc(text)}</span>`;
  const deltaCls = (d, good) => {
    if (!d || good === 'none' || good === 'range') return 'neutral';
    if (good === 'up') return d > 0 ? 'up-good' : 'down-bad';
    if (good === 'down') return d > 0 ? 'up-bad' : 'down-good';
    return 'neutral';
  };
  const kpi = k => `<div class="kpi tone-${k.status && k.status !== 'none' ? k.status : 'none'}"><div class="l"><span>${esc(k.label)}</span>${k.status && k.status !== 'none' ? `<i class="dot ${k.status}" title="${STATUS_WORD[k.status]}"></i>` : ''}</div><div class="v">${esc(k.value)}</div><div class="s">${esc(k.sub || '')}${k.prev ? ` · ${esc(k.prev)}` : ''}</div></div>`;
  const kpis = (list, cls = '') => `<div class="kpis ${cls}">${list.map(kpi).join('')}</div>`;
  const ask = qs => `<div class="ask">${qs.map(q => `<div class="ask-item"><span class="q">?</span><div>${esc(q.q)}<span class="to">${esc(q.to)}${q.page ? ` · стр. ${pageNo(q.page)}` : ''}</span></div></div>`).join('')}</div>`;
  const linksBlock = links => links && links.length ? `<div><div class="eyebrow" style="margin-bottom:6px">Детали — в отчётах</div><div class="links">${links.map(l => `<a href="${esc(l.href)}">↗ ${esc(l.label)}</a>`).join('')}</div></div>` : '';
  const rail = (comment, questions, links, extra = '') => `<aside class="rail">
    <div><div class="tag" style="margin-bottom:6px"><i></i>Комментарий · черновик ИИ, проверен аналитиком</div><p class="comment">${esc(comment)}</p></div>
    ${extra}
    ${questions && questions.length ? `<div><div class="eyebrow" style="margin-bottom:8px">О чём спросить</div>${ask(questions)}</div>` : ''}
    ${linksBlock(links)}
  </aside>`;
  const pageHead = (p, title, sub) => `<header class="page-head"><div><div class="eyebrow">${p.no} · ${esc(p.eyebrow)}</div><h1 class="page-title">${esc(title)}${sub ? `<span class="sub">${esc(sub)}</span>` : ''}</h1></div><div class="page-meta">${esc(M.period_label)} · выпуск ${esc(M.issue_no)}<br>данные на ${esc(M.as_of)}</div></header>`;
  const pageFoot = (p, links, source) => `<footer class="page-foot">${source ? `<span>Источник: ${esc(source)}</span>` : ''}${(links || []).map(l => `<a class="lk" href="${esc(l.href)}">${esc(l.label)}</a>`).join('')}<span class="pn">${p.no} / ${PAGES.length}</span></footer>`;
  const card = (title, body, sub = '', cls = '') => `<div class="card ${cls}"><div class="card-title">${title}</div>${sub ? `<div class="card-sub">${esc(sub)}</div>` : ''}${body}</div>`;
  const heat = (v, lo, hi) => { const t = Math.max(0, Math.min(1, (v - lo) / ((hi - lo) || 1))); return 'h' + (1 + Math.round(t * 4)); };
  const sectionTitle = (t, sub) => `<div><h2 style="font-size:15px;font-weight:600">${esc(t)}</h2>${sub ? `<div class="card-sub">${esc(sub)}</div>` : ''}</div>`;

  /* ---------------------------------------------------------------- 01 главное */
  function renderSummary(p) {
    const S = D.summary;
    const groups = [['red', 'Требует решения'], ['amber', 'Наблюдаем'], ['ok', 'Идёт по плану']];
    const sig = groups.map(([lv, name]) => {
      const rows = S.signals.filter(s => s.level === lv);
      if (!rows.length) return '';
      return `<div class="sig-group">${name} · ${rows.length}</div>` + rows.map(s => `<a class="sig" href="#p-${s.page}"><i class="dot ${lv}"></i><div><span class="t">${esc(s.title)}.</span> <span class="x">${esc(s.text)}</span>${s.owner ? `<span class="x"> — ${esc(s.owner)}</span>` : ''}</div><span class="pg">стр. ${pageNo(s.page)}</span></a>`).join('');
    }).join('');
    return `${pageHead(p, S.headline, `Ежемесячный обзор для исполнительного директора · ${M.company} · читать 10 минут: страницы 01–02 — картина месяца, 03–10 — разделы по запросу`)}
      <div class="rail-layout" style="grid-template-columns: minmax(0,1fr) 420px">
        <div class="stack">
          <div class="summary-text">${S.paragraphs.map(t => `<p>${esc(t)}</p>`).join('')}</div>
          <div class="grid g2">
            ${card('Что изменилось в структуре', `<ul class="list arrows">${S.changes.map(c => `<li><a href="#p-${c.page}">${esc(c.text)}</a></li>`).join('')}</ul>`, 'сдвиги долей ≥ 2 п.п. с начала года · подробно на стр. 06')}
            ${card('Стабильно — можно не читать', `<ul class="list">${S.stable.map(c => `<li>${esc(c)}</li>`).join('')}</ul>`, 'срезы без значимых изменений')}
          </div>
          <div class="grid g2">
            ${card('Пять вопросов месяца', ask(S.questions), 'зацепки для разговоров с владельцами процессов')}
            ${card('Решения, которые ждут', `<div class="stack" style="gap:8px">${S.decisions.map(d => `<div class="decision"><span>${esc(d.text)}</span><span class="own">${esc(d.owner)}</span></div>`).join('')}</div>`, 'что нужно решить до следующего выпуска')}
          </div>
        </div>
        <div class="panel"><div class="card-title">Сигналы месяца</div><div class="signals">${sig}</div></div>
      </div>
      ${pageFoot(p, [], 'все разделы отчёта; цифры — вымышленные')}`;
  }

  /* ---------------------------------------------------------------- 02 панель */
  function tile(t) {
    const wide = t.id === 'hq_hc';
    const s = t.series;
    const chart = CH.yoyLine({ width: wide ? 640 : 300, height: wide ? 170 : 112, y2025: s.y2025, y2026: s.y2026, plan: s.plan, forecast: s.forecast, limit: t.limit, target: (s.plan ? null : t.target), fmt: t.fmt, decimals: t.decimals, limitLabel: 'лимит', yMin: t.axis ? t.axis[0] : null, yMax: t.axis ? t.axis[1] : null });
    const deltas = [`<span>м/м <b class="${deltaCls(t.delta_mom, t.good)}">${fmtDelta(t.delta_mom, t.fmt, t.decimals)}</b></span>`, `<span>г/г <b class="${deltaCls(t.delta_yoy, t.good)}">${fmtDelta(t.delta_yoy, t.fmt, t.decimals)}</b></span>`];
    if (t.delta_plan != null) deltas.push(`<span>к плану <b class="${deltaCls(t.delta_plan, t.good === 'range' ? 'none' : t.good)}">${fmtDelta(t.delta_plan, t.fmt, t.decimals)}</b></span>`);
    else if (t.target != null) deltas.push(`<span>цель <b>${fmtVal(t.target, t.fmt, 0)}</b></span>`);
    return `<article class="tile st-${t.status} ${wide ? 'wide' : ''}" id="t-${t.id}">
      <div class="tile-head"><span class="eyebrow">${esc(t.group)}</span>${t.status !== 'none' ? chip(t.status, STATUS_WORD[t.status]) : ''}</div>
      <h3 class="tile-title">${esc(t.title)}</h3>
      <div class="tile-value"><span class="big">${fmtVal(t.value, t.fmt, t.decimals)}</span><span class="unit">${[t.fmt === 'pct' ? '' : esc(t.unit), t.compare_label ? esc(t.compare_label) : ''].filter(Boolean).join(' · ')}</span></div>
      <div class="tile-deltas">${deltas.join('')}</div>
      <div class="tile-chart">${chart}</div>
      <div class="tile-status">${esc(t.status_text)}</div>
      <div class="tile-secondary">${t.secondary.map(x => `<span>${esc(x.label)} <b>${esc(x.value)}</b></span>`).join('')}</div>
      ${t.question ? `<div class="tile-ask"><span class="q">?</span><div>${esc(t.question)}<span class="to">${esc(t.ask)}</span></div></div>` : ''}
      <div class="tile-owner">Владелец: ${esc(t.owner)} · стр. ${pageNo(t.page)}</div>
    </article>`;
  }
  function renderPanel(p) {
    const T = D.control_panel;
    const counts = { red: 0, amber: 0, ok: 0 };
    T.forEach(t => { if (counts[t.status] != null) counts[t.status]++; });
    return `${pageHead(p, `${counts.red} метрики требуют решения, ${counts.amber} — наблюдаем, ${counts.ok} — по плану`, 'Каждая плитка — одна и та же форма (по образцу Amazon WBR): значение, изменения к прошлому месяцу и году, линия 2026 против 2025, план или цель, статус, владелец и вопрос. Читайте плитки с красной кромкой первыми.')}
      <div class="howto">
        <span class="k"><i class="key"></i>2026</span><span class="k"><i class="key prior"></i>2025</span><span class="k"><i class="key plan"></i>план / цель</span><span class="k"><i class="key limit"></i>лимит</span><span class="k"><i class="key fca"></i>прогноз по темпу</span><span class="k"><i class="key fc"></i>прогноз по воронке</span>
        <span class="k">${chip('red', 'Требует решения')}</span><span class="k">${chip('amber', 'Наблюдаем')}</span><span class="k">${chip('ok', 'По плану')}</span>
        <span class="k print-hint">наведите курсор на график, чтобы увидеть значения по месяцам</span>
      </div>
      <div class="tiles">${T.map(tile).join('')}</div>
      ${pageFoot(p, [{ label: 'Словарь метрик — стр. 11', href: '#p-appendix' }], 'HRS, DRAFT, СУП, логи ИИ-платформы, CrossData')}`;
  }

  /* ---------------------------------------------------------------- 03 численность */
  function renderHeadcount(p) {
    const H = D.headcount, s = H.series;
    const traj = CH.yoyLine({ width: 680, height: 230, y2025: s.y2025, y2026: s.y2026, plan: s.plan, forecast: { runrate: s.forecast_runrate, pipeline: s.forecast_pipeline }, limit: H.limit, fmt: 'int', decimals: 0 });
    const scen = `<div class="stack" style="gap:10px">${H.forecast.map(f => `<div class="decision" style="grid-template-columns:1fr auto auto;align-items:center"><span>${esc(f.label)}</span><b class="num">${fmtInt(f.dec)}</b>${f.status === 'none' ? chip('none', 'лимит') : chip(f.status, (f.vs_limit > 0 ? '+' : '−') + fmtInt(Math.abs(f.vs_limit)) + ' к лимиту')}</div>`).join('')}</div>`;
    const segRows = H.segments.map(r => `<tr class="${r.name.startsWith('Итого') ? 'total' : ''}"><td class="name">${esc(r.name)}${r.note ? `<span class="sub">${r.status !== 'none' ? `<i class="dot ${r.status}"></i> ` : ''}${esc(r.note)}</span>` : ''}</td><td>${fmtInt(r.hc)}</td><td>${fmtDelta(r.hc - r.dec25, 'int')}</td><td>${fmtInt(r.plan_dec26)}</td><td class="${r.status === 'red' ? 'up-bad' : ''}">${fmtInt(r.forecast_dec26)}</td><td>${fmtInt(r.vacancies)}</td><td>${r.attrition == null ? '—' : fmtPct(r.attrition, 1)}</td></tr>`).join('');
    const splitRows = H.hq_split.map(r => `<tr><td class="name">${esc(r.name)}${r.flag ? `<span class="sub"><i class="dot ${r.flag}"></i> отток и уход руководителей</span>` : ''}</td><td>${fmtInt(r.hc)}</td><td>${fmtDelta(r.hc - r.dec25, 'int')}</td><td>${fmtDelta(r.plan_dec26 - r.dec25, 'int')}</td><td>${fmtInt(r.vacancies)}</td><td class="${heat(r.attrition, 10, 15)}">${fmtPct(r.attrition, 1)}</td><td>${fmtPct(r.juniors, 1)}</td></tr>`).join('');
    const side = H.side_stats.map(x => kpi({ label: x.label, value: fmtInt(x.value), sub: `${x.prev_label}: ${fmtInt(x.prev)} (${fmtDelta(x.value - x.prev, 'int')})${x.note ? ' · ' + x.note : ''}`, status: x.flag || 'none' })).join('');
    return `${pageHead(p, 'HQ идёт по плану, но воронка найма выведет за лимит на ~120 человек к декабрю', 'Лимит 23 500 достижим только при замедлении найма в IV квартале')}
      <div class="rail-layout">${rail(H.comment, H.questions, H.links)}
        <div class="stack">
          <div class="grid g32">
            ${card('Траектория HQ к лимиту 23 500', traj + CH.legend([{ name: '2026', cls: 'l0' }, { name: '2025', cls: 'l2' }, { name: 'план-траектория', cls: 'plan' }, { name: 'лимит', cls: 'limit' }, { name: 'прогноз по темпу', cls: 'fca' }, { name: 'прогноз по воронке', cls: 'fc' }]), 'управленческая численность, чел.; пунктир справа — два сценария на сен–дек')}
            ${card('Сценарии на 31 декабря', scen + `<p class="note" style="margin-top:6px">Сценарий «воронка» предполагает обычную конверсию: 100% принятых офферов и 60% вакансий в работе закрываются до конца года.</p>`)}
          </div>
          <div class="grid g2">
            ${card(H.bridge_ytd.title, CH.bridge({ width: 470, height: 250, start: H.bridge_ytd.start, end: H.bridge_ytd.end, startLabel: H.bridge_ytd.start_label, endLabel: H.bridge_ytd.end_label, steps: H.bridge_ytd.steps }), 'мост численности HQ, чел.; жёлтый столбец — переводы из HQ, 28 из 40 за июль-август')}
            ${card(H.bridge_forecast.title, CH.bridge({ width: 470, height: 250, start: H.bridge_forecast.start, end: H.bridge_forecast.end, startLabel: H.bridge_forecast.start_label, endLabel: H.bridge_forecast.end_label, steps: H.bridge_forecast.steps, limit: H.bridge_forecast.limit }), 'что будет, если закрыть офферы и вакансии в срок')}
          </div>
          <div class="stack">
            ${card('HQ, Support, Line: где мы относительно плана', `<div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>Сегмент</th><th>Числ.</th><th>Δ YTD</th><th>План<br>дек 26</th><th>Прогноз<br>дек 26</th><th>Вакансии</th><th>Текучесть</th></tr></thead><tbody>${segRows}</tbody></table></div>`, 'управленческая численность, чел.')}
            ${card('Внутри HQ: кто растёт', `<div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>Сегмент</th><th>Числ.</th><th>Δ YTD</th><th>План<br>на год</th><th>Вакансии</th><th>Текучесть</th><th>Джуны</th></tr></thead><tbody>${splitRows}</tbody></table></div>`, 'заливка «Текучесть» — чем темнее, тем выше')}
          </div>
          ${sectionTitle('Периметр вокруг HQ', 'численности, которые не входят в лимит, но влияют на него')}
          <div class="kpis" style="grid-template-columns:repeat(6,minmax(0,1fr))">${side}</div>
        </div>
      </div>
      ${pageFoot(p, H.links, 'HRS, план численности 2026')}`;
  }

  /* ---------------------------------------------------------------- 04 найм */
  function renderHiring(p) {
    const Hh = D.hiring;
    const stack = CH.stackedColumns({ width: 620, height: 210, months: Hh.months, series: [{ name: 'новые позиции', values: Hh.vacancies_stack.new }, { name: 'замены', values: Hh.vacancies_stack.replacement }, { name: 'на холде', values: Hh.vacancies_stack.hold }] });
    const oc = CH.lines({ width: 620, height: 210, x: Hh.months, series: [{ name: 'закрыто', values: Hh.closed }, { name: 'открыто', values: Hh.opened }], fmt: 'int', every: 2 });
    const ttf = CH.lines({ width: 300, height: 130, x: Hh.months, series: [{ name: 'дней', values: Hh.ttf }], fmt: 'int', every: 3 });
    const dec = CH.lines({ width: 300, height: 130, x: Hh.months, series: [{ name: 'отказы', values: Hh.decline }], fmt: 'pct', decimals: 0, every: 3 });
    const R = Hh.replacement_status;
    const rep = CH.hbars({ width: 440, items: R.items.map(it => ({ name: it.name, value: it.share, flag: it.flag, suffix: `% · ${fmtInt(it.count)}`, note: '' })), fmt: 'int', labelWidth: 215, valueWidth: 60, max: 50 });
    const I = Hh.interns;
    return `${pageHead(p, 'Найм на прежней мощности, но воронка стареет и дорожает', '≈300 закрытий в месяц; 27% вакансий старше 90 дней; отказы от офферов 14%')}
      ${kpis(Hh.kpis)}
      <div class="rail-layout">${rail(Hh.comment, Hh.questions, Hh.links)}
        <div class="stack">
          <div class="grid g2">
            ${card('Вакансии HQ в работе: новые, замены, холд', stack + CH.legend([{ name: 'новые позиции', cls: 's0 box' }, { name: 'замены', cls: 's1 box' }, { name: 'на холде', cls: 's2 box' }]), 'на конец месяца, шт.')}
            ${card('Открыто и закрыто за месяц', oc + CH.legend([{ name: 'закрыто', cls: 'l0' }, { name: 'открыто', cls: 'l1' }]), 'HQ, шт.')}
          </div>
          <div class="grid g3">
            ${card('Срок закрытия, медиана', ttf, 'дней от заявки до принятого оффера')}
            ${card('Отказы от офферов', dec, '% отклонённых офферов за месяц')}
            ${card('Стажёры', `<table class="tbl compact"><tbody><tr><td class="name">Активные стажёры</td><td><b>${fmtInt(I.active)}</b></td></tr><tr><td class="name">Активные заявки на стажёров</td><td><b>${fmtInt(I.requests_active)}</b></td></tr><tr><td class="name">Переведено в штат YTD <span class="sub">2025 YTD: ${I.converted_prev_ytd}</span></td><td><b class="down-good">${fmtInt(I.converted_ytd)}</b></td></tr></tbody></table>`, 'вход в компанию через стажировки')}
          </div>
          <div class="grid g2">
            ${card(R.title, rep + `<p class="note">${esc(R.comment)}</p>`, `${fmtInt(R.total)} вакансий на замену, доля и количество`)}
            ${card('Замены с тем же профилем в том же юните', `<div class="grid g2" style="gap:10px">${kpi({ label: 'Закрыты в том же юните, тот же профиль', value: Hh.same_profile.share_same_unit + '%', sub: 'грейд-стрим-специализация совпадают' })}${kpi({ label: 'Закрыты в другом юните или с другим профилем', value: Hh.same_profile.share_other_unit + '%', sub: 'переток через «замены»', status: 'amber' })}</div><p class="note">${esc(Hh.same_profile.comment)}</p><p class="note">Сдвиги структуры найма (регионы, seniority, каналы, причины заявок) — на стр. ${pageNo('shifts')}.</p>`)}
          </div>
        </div>
      </div>
      ${pageFoot(p, Hh.links, 'HRS, TRS')}`;
  }

  /* ---------------------------------------------------------------- 05 движение людей */
  function renderFlow(p) {
    const F = D.flow, a = F.attrition_series;
    const attr = CH.yoyLine({ width: 300, height: 150, y2025: a.y2025, y2026: a.y2026, fmt: 'pct', decimals: 1 });
    const regr = CH.yoyLine({ width: 300, height: 150, y2025: a.regr2025, y2026: a.regr2026, fmt: 'pct', decimals: 1 });
    const nonregr = F.leavers.map((v, i) => v - F.leavers_regrettable[i]);
    const leav = CH.stackedColumns({ width: 300, height: 150, months: F.months, series: [{ name: 'regrettable', values: F.leavers_regrettable }, { name: 'non-regrettable', values: nonregr }] });
    const S = F.attrition_by_stream;
    const rows = S.rows.map(r => `<tr><td class="name">${esc(r.name)}</td><td>${fmtInt(r.left)}</td><td class="${heat(r.rate, 9, 16)}">${fmtPct(r.rate, 1)}</td><td class="${heat(r.regr, 3.5, 8.5)}">${fmtPct(r.regr, 1)}</td><td>${fmtPct(r.nonregr, 1)}</td><td class="${r.delta > 1 ? 'up-bad' : r.delta < -1 ? 'down-good' : ''}">${fmtDelta(r.delta, 'pct', 1, false)}</td><td class="note">${r.flag ? chip(r.flag, r.flag === 'red' ? 'ускорение' : 'выше среднего') : ''}</td></tr>`).join('');
    return `${pageHead(p, 'Текучесть снижается, но уходят руководители', 'HQ 12,1% против 13,4% год назад; руководители 9,8% против 7,1% — ускорение шесть месяцев подряд')}
      ${kpis(F.kpis, 'k4')}
      <div class="rail-layout">${rail(F.comment, F.questions, F.links)}
        <div class="stack">
          <div class="grid g3">
            ${card('Текучесть HQ, годовая: 2026 против 2025', attr, 'скользящие 12 месяцев, %')}
            ${card('Regrettable-текучесть HQ', regr, 'скользящие 12 месяцев, %')}
            ${card('Ушедшие за месяц: regrettable и non-regrettable', leav + CH.legend([{ name: 'regrettable', cls: 's0 box' }, { name: 'non-regrettable', cls: 's1 box' }]), 'HQ, чел.')}
          </div>
          ${sectionTitle('Talent actions', 'ротации, рост, refresh — есть ли ускорение')}
          ${kpis(F.talent_actions.map(t => ({ label: t.label, value: typeof t.value === 'number' ? fmtInt(t.value) : t.value, sub: t.sub, prev: t.prev, status: t.status })), 'k3')}
          ${card(S.title, `<div class="tbl-wrap"><table class="tbl"><thead><tr>${S.columns.map(c => `<th>${esc(c)}</th>`).join('')}<th></th></tr></thead><tbody>${rows}</tbody></table></div>`, 'заливка — чем темнее, тем выше текучесть; Δ — к тому же периоду 2025')}
          <p class="note">Причины ухода, seniority, регионы, стаж — слоп-диаграммы на стр. ${pageNo('shifts')}.</p>
        </div>
      </div>
      ${pageFoot(p, F.links, 'HRS, exit-интервью, DRAFT')}`;
  }

  /* ---------------------------------------------------------------- 06 сдвиги */
  function slopeCard(s, compact) {
    return `<div class="slope-card" id="s-${s.id}"><div class="card-title"><span>${esc(s.title)}</span><span class="prio">${s.changed ? 'приоритет ' + s.priority : 'стабильно'}</span></div><div class="card-sub">${esc(s.subtitle)} · ${esc(s.source)}</div>${CH.slopeChart({ width: compact ? 380 : 440, compact, items: s.items, left: s.left_label, right: s.right_label, unit: s.unit })}<div class="slope-comment">${esc(s.comment)}</div></div>`;
  }
  function renderShifts(p) {
    const changed = D.slopes.filter(s => s.changed).sort((a, b) => a.priority - b.priority);
    const main = changed.filter(s => s.priority <= 2), rest = changed.filter(s => s.priority > 2);
    const stable = D.slopes.filter(s => !s.changed);
    const stab = D.stability.map(x => `<div class="stable-row"><span>${esc(x.name)}</span><span class="v">${esc(x.value)}</span>${CH.spark(x.spark)}</div>`).join('');
    return `${pageHead(p, 'Что сдвинулось внутри привычных цифр', 'Слоп-диаграммы: доля категории на начало года и сейчас. Показаны только срезы, где хотя бы одна доля изменилась на 2 п.п. и больше; синие линии — изменившиеся категории. Порядок — по важности сдвига.')}
      <div class="howto"><span class="k"><i class="key"></i>изменилась ≥ 2 п.п.</span><span class="k"><i class="key prior"></i>стабильна</span><span class="print-hint">наведите курсор на линию — значения и комментарий</span></div>
      ${sectionTitle('Главные сдвиги месяца', `${main.length} срезов с самыми важными изменениями — стоит прочитать`)}
      <div class="slopes">${main.map(s => slopeCard(s, false)).join('')}</div>
      ${sectionTitle('Остальные сдвиги', `${rest.length} срезов: изменения есть, но они ожидаемые или небольшие`)}
      <div class="slopes three">${rest.map(s => slopeCard(s, true)).join('')}</div>
      <div class="panel">
        <div class="card-title">Стабильно — здесь ничего не произошло</div>
        <div class="card-sub">срезы без значимых изменений; показаны сжато, чтобы не занимать внимание</div>
        <div class="slopes three" style="margin-top:6px">${stable.map(s => slopeCard(s, true)).join('')}</div>
        <div class="stable-list" style="margin-top:8px">${stab}</div>
      </div>
      ${pageFoot(p, [], 'HRS, exit-интервью, СУП, логи ИИ-платформы, цифровые следы')}`;
  }

  /* ---------------------------------------------------------------- 07 профессии */
  function renderProfessions(p) {
    const P = D.professions;
    const rows = P.rows.map(r => `<tr><td class="name">${esc(r.name)}</td><td>${fmtInt(r.hc)}</td><td>${CH.spark(r.spark, { width: 70, height: 18 })}</td><td>${fmtDelta(r.delta_ytd, 'int')}</td><td>${fmtDelta(r.delta_mom, 'int')}</td><td class="${heat(r.attrition, 9, 16)}">${fmtPct(r.attrition, 1)}</td><td class="${heat(r.regrettable, 3.5, 8.5)}">${fmtPct(r.regrettable, 1)}</td><td>${fmtInt(r.vac_new)} / ${fmtInt(r.vac_repl)}</td><td>${fmtPct(r.understaff, 1)}</td><td>${fmtPct(r.juniors, 0)}</td><td class="${heat(r.overdue, 10, 40)}">${r.overdue}%</td><td>${r.ai_wau}%</td><td class="note">${r.flag ? chip(r.flag, r.note) : esc(r.note)}</td></tr>`).join('');
    const ratios = P.ratios.map(r => `<div class="card"><div class="card-title">${esc(r.name)}</div><div class="ratio"><span class="v">${fmtNum(r.value, r.value < 1 ? 2 : 1)}</span><span class="chip ${r.status}">цель ${esc(r.target)}</span><span class="t">дек 25: ${fmtNum(r.dec25, r.dec25 < 1 ? 2 : 1)}</span></div>${CH.spark(r.spark, { width: 120, height: 22 })}</div>`).join('');
    return `${pageHead(p, 'Пропорции профессий стабильны; внимания требуют ML и продакты', 'Скоркарта по профессиям HQ: обеспеченность ресурсами, рост, отток, вакансии')}
      ${card('Скоркарта по профессиям', `<div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>Профессия</th><th>Числ.</th><th>13 мес.</th><th>Δ YTD</th><th>Δ м/м</th><th>Текучесть<br>12 мес.</th><th>Regret.</th><th>Вакансии<br>нов. / зам.</th><th>Недо-<br>укомпл.</th><th>Джуны</th><th>Вак.<br>&gt; 90 дн.</th><th>ИИ<br>WAU</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`, 'заливка — чем темнее, тем выше значение (текучесть, regrettable, просроченные вакансии); чёрная риска в спарклайне — конец месяца')}
      <div class="rail-layout">${rail(P.comment, P.questions, P.links)}
        <div class="stack">
          ${sectionTitle('Соотношения профессий', 'структурные пропорции против целевых коридоров')}
          <div class="grid g3">${ratios}</div>
        </div>
      </div>
      ${pageFoot(p, P.links, 'HRS, логи ИИ-платформы')}`;
  }

  /* ---------------------------------------------------------------- 08 управляемость */
  function renderManagement(p) {
    const G = D.management;
    const span = CH.hbars({ width: 420, items: G.span_hist.bins.map((b, i) => ({ name: b + ' чел.', value: G.span_hist.now[i], prev: G.span_hist.dec25[i], flag: i < 2 ? 'amber' : '' })), fmt: 'int', labelWidth: 90, prevLabel: 'дек 25' });
    const layers = CH.hbars({ width: 420, items: G.layers.levels.map((l, i) => ({ name: 'уровень ' + l, value: G.layers.share[i], prev: G.layers.share_dec25[i] })), fmt: 'pct', decimals: 1, labelWidth: 90, prevLabel: 'дек 25' });
    const rows = G.segments.map(r => `<tr><td class="name">${esc(r.name)}</td><td>${fmtInt(r.managers)}</td><td>${r.span_med}</td><td class="${heat(r.quasi, 12, 35)}">${r.quasi}%</td><td>${r.overloaded}%</td><td class="${heat(r.mgr_attrition, 6, 16)}">${fmtPct(r.mgr_attrition, 1)}</td><td>${fmtInt(r.new_mgrs)}</td><td class="note">${r.flag ? chip(r.flag, r.flag === 'red' ? 'мелкий span, высокий отток' : 'наблюдаем') : ''}</td></tr>`).join('');
    return `${pageHead(p, 'Структура становится здоровее, но каждый пятый руководитель управляет командой меньше 4 человек', 'Квази-руководители 21% (цель 15%); новых юнитов создаётся больше, чем нанимается руководителей')}
      ${kpis(G.kpis)}
      <div class="rail-layout">${rail(G.comment, G.questions, G.links)}
        <div class="stack">
          <div class="grid g2">
            ${card(G.span_hist.title, span + CH.legend([{ name: 'август 2026', cls: 'now box' }, { name: 'квази-руководители', cls: 's1 box', }, { name: 'декабрь 2025', cls: 'prevmark' }]), 'число руководителей по количеству прямых подчинённых; чёрная риска — декабрь 2025')}
            ${card(G.layers.title, layers + CH.legend([{ name: 'август 2026', cls: 'now box' }, { name: 'декабрь 2025', cls: 'prevmark' }]), 'доля сотрудников, %; цель — не глубже 7 уровней')}
          </div>
          ${card('Управляемость по сегментам HQ', `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Сегмент</th><th>Руководителей</th><th>Медианный span</th><th>Квази (&lt; 4)</th><th>Перегруженные (&gt; 10)</th><th>Текучесть рук.</th><th>Новых рук. YTD</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`)}
        </div>
      </div>
      ${pageFoot(p, G.links, 'управленческая структура, HRS')}`;
  }

  /* ---------------------------------------------------------------- 09 продуктивность */
  function renderProductivity(p) {
    const Pr = D.productivity;
    const byStream = CH.hbars({ width: 420, items: Pr.ai.by_stream.map(x => ({ name: x.name, value: x.wau, prev: x.coverage, flag: x.wau < 50 ? 'amber' : '' })), fmt: 'pct', decimals: 0, labelWidth: 110, prevLabel: 'покрытие', max: 100 });
    const wau = CH.yoyLine({ width: 620, height: 190, y2025: Pr.ai.wau_series.y2025, y2026: Pr.ai.wau_series.y2026, plan: Pr.ai.wau_series.plan, fmt: 'pct', decimals: 0 });
    const roles = CH.hbars({ width: 300, items: Pr.meetings.overload_by_role.map(x => ({ name: x.name, value: x.share, prev: x.dec25 })), fmt: 'pct', decimals: 0, labelWidth: 95, prevLabel: 'дек 25', max: 40 });
    const zones = CH.hbars({ width: 300, items: Pr.workload.items.map(x => ({ name: x.name, value: x.share, prev: x.dec25, flag: x.flag })), fmt: 'pct', decimals: 1, labelWidth: 95, prevLabel: 'дек 25', max: 100 });
    const risks = CH.hbars({ width: 300, items: Pr.risks.items.map(x => ({ name: x.name, value: x.count, prev: x.dec25, flag: x.flag })), fmt: 'int', labelWidth: 130, prevLabel: 'дек 25' });
    const goals = CH.hbars({ width: 420, items: Pr.goals.actuality.map(x => ({ name: x.name, value: x.share, prev: x.dec25 })), fmt: 'pct', decimals: 0, labelWidth: 190, prevLabel: 'дек 25', max: 70 });
    return `${pageHead(p, 'ИИ стал нормой в разработке, но не в дискавери; нагрузка и риски растут вместе с найдом', 'WAU ИИ-инструментов 51% (цель 60%); 9,1% сотрудников в зоне перегрузки; индивидуальные цели у 64%')}
      <div class="rail-layout">${rail(Pr.comment, Pr.questions, Pr.links)}
        <div class="stack">
          ${sectionTitle('ИИ-изация', 'покрытие, активное использование, кто отстаёт')}
          ${kpis(Pr.ai.kpis, 'k4')}
          <div class="grid g2">
            ${card('Еженедельные пользователи ИИ-инструментов по стримам', byStream + CH.legend([{ name: 'WAU', cls: 'now box' }, { name: 'отстают (< 50%)', cls: 's1 box' }, { name: 'покрытие доступом', cls: 'prevmark' }]), '% сотрудников стрима')}
            ${card('WAU ИИ-инструментов: 2026 против 2025 и план', wau, '% HQ, использующих профильные инструменты ≥ 3 дней в неделю')}
          </div>
          ${sectionTitle('Нагрузка, встречи, риски', 'цифровые следы и DRAFT')}
          ${kpis([...Pr.meetings.kpis, ...Pr.office.kpis].slice(0, 5))}
          <div class="grid g3">
            ${card('Перегружены встречами (> 50% недели)', roles, '% по ролям; риска — декабрь 2025')}
            ${card(Pr.workload.title, zones, '% численности')}
            ${card(`Сотрудники с рисками: ${fmtInt(Pr.risks.total)} · ${fmtPct(Pr.risks.share, 1)} HQ`, risks, 'чел. по типу риска; риска — декабрь 2025')}
          </div>
          ${sectionTitle('Цели и результативность', 'СУП и индивидуальные цели')}
          <div class="grid g32">
            ${kpis(Pr.goals.kpis, 'k3')}
            ${card('Цели юнитов в СУП по актуальности', goals, '% юнитов; риска — декабрь 2025')}
          </div>
        </div>
      </div>
      ${pageFoot(p, Pr.links, 'логи ИИ-платформы, календарь и цифровые следы, DRAFT, СУП')}`;
  }

  /* ---------------------------------------------------------------- 10 crossdata */
  function renderCrossdata(p) {
    const C = D.crossdata;
    const lvl = CH.hbars({ width: 300, items: C.by_level.map(x => ({ name: x.name, value: x.share })), fmt: 'pct', decimals: 0, labelWidth: 130, max: 100 });
    const rep = CH.hbars({ width: 300, items: C.top_reports.map(x => ({ name: x.name, value: x.mau, prev: x.prev })), fmt: 'int', labelWidth: 130, prevLabel: 'июль' });
    const ad = CH.yoyLine({ width: 300, height: 150, y2025: C.adoption_series.y2025, y2026: C.adoption_series.y2026, plan: C.adoption_series.plan, fmt: 'pct', decimals: 0 });
    const extra = `<div><div class="eyebrow" style="margin-bottom:8px">Что нового</div><ul class="whatsnew">${C.whats_new.map(w => `<li>${esc(w)}</li>`).join('')}</ul></div>`;
    return `${pageHead(p, 'Руководители всё чаще принимают решения на данных: 61% пользуются CrossData ежемесячно', 'Минутка промо: адопшен, аудитория, новые продукты')}
      <div class="rail-layout">${rail(C.comment, C.questions, C.links, extra)}
        <div class="stack">
          ${kpis(C.kpis, 'k4')}
          <div class="grid g3">
            ${card('Руководители в CrossData по уровню', lvl, '% руководителей уровня, открывавших отчёты за месяц')}
            ${card('Самые используемые отчёты', rep, 'MAU; риска — июль')}
            ${card('Руководители в CrossData: 2026 против 2025', ad, '% всех руководителей, план — цель 70% к декабрю')}
          </div>
        </div>
      </div>
      ${pageFoot(p, C.links, 'аналитика использования CrossData')}`;
  }

  /* ---------------------------------------------------------------- 11 приложение */
  function renderAppendix(p) {
    const L = D.lines;
    const rows = L.rows.map(r => `<tr><td class="name">${esc(r.name)}</td><td>${fmtInt(r.hc)}</td><td>${fmtDelta(r.delta_ytd, 'int')}</td><td>${fmtDelta(r.plan_ytd, 'int')}</td><td>${Math.round(100 * r.delta_ytd / r.plan_ytd)}%</td><td>${fmtInt(r.vacancies)}</td><td class="${heat(r.attrition, 9, 15)}">${fmtPct(r.attrition, 1)}</td><td class="${heat(r.overdue, 15, 36)}">${r.overdue}%</td><td>${fmtPct(r.lowperf, 1)}</td><td class="note">${r.status !== 'none' ? chip(r.status, r.overdue >= 30 ? 'просроченные вакансии' : 'прирост выше плана') : ''}</td></tr>`).join('');
    const dict = D.control_panel.map(t => `<div><b>${esc(t.title)}</b><span>${esc(t.definition)}</span></div>`).join('');
    const allLinks = [].concat(D.headcount.links, D.hiring.links, D.flow.links, D.professions.links, D.management.links, D.productivity.links, D.crossdata.links, D.lines.links);
    return `${pageHead(p, 'Приложение: линии бизнеса, словарь метрик, ссылки', 'Материалы, к которым обращаются по необходимости')}
      ${card('Скоркарта по линиям бизнеса (КП) — опциональный блок v2', `<p class="note" style="margin-bottom:8px">${esc(L.note)}</p><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Линия</th><th>Числ. HQ</th><th>Δ YTD</th><th>План YTD</th><th>Вып. плана</th><th>Вакансии</th><th>Текучесть</th><th>Вак. &gt; 90 дн.</th><th>Low-perf</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`, '', 'optional')}
      ${card('Словарь метрик панели управления', `<div class="dict">${dict}</div>`)}
      ${card('Детальные отчёты (CrossData)', `<div class="links" style="flex-direction:row;flex-wrap:wrap;gap:6px 22px">${allLinks.map(l => `<a href="${esc(l.href)}">↗ ${esc(l.label)}</a>`).join('')}</div>`, 'в рабочей версии — ссылки на отчёты; здесь — заглушки')}
      <p class="note">${esc(M.disclaimer)} Подготовлено: ${esc(M.prepared_by)}. Выпуск ${esc(M.issue_no)} от ${esc(M.issued)}.</p>
      ${pageFoot(p, [], '')}`;
  }

  /* ---------------------------------------------------------------- сборка */
  const R = { summary: renderSummary, panel: renderPanel, headcount: renderHeadcount, hiring: renderHiring, flow: renderFlow, shifts: renderShifts, professions: renderProfessions, management: renderManagement, productivity: renderProductivity, crossdata: renderCrossdata, appendix: renderAppendix };
  document.getElementById('brand-sub').textContent = `${M.company} · ${M.period_label} · выпуск ${M.issue_no}`;
  document.getElementById('tabs').innerHTML = PAGES.map(p => `<a href="#p-${p.id}" class="${p.sep ? 'sep' : ''}"><span class="n">${p.no}</span>${esc(p.nav)}</a>`).join('');
  document.getElementById('app').innerHTML = PAGES.map(p => `<section class="page" id="p-${p.id}">${R[p.id](p)}</section>`).join('');
  CH.initTips();
})();
