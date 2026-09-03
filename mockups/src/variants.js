/* variants.js — три альтернативных подачи первой страницы на одних и тех же данных */
(() => {
  const D = window.DATA, M = D.meta, T = D.control_panel, S = D.summary;
  const { fmtInt, fmtNum, fmtPct, fmtVal, fmtDelta, esc } = CH;
  const byId = Object.fromEntries(T.map(t => [t.id, t]));
  const STATUS_WORD = { red: 'Требует решения', amber: 'Наблюдаем', ok: 'По плану', none: 'Без изменений' };
  const chip = (st, text) => `<span class="chip ${st}">${esc(text)}</span>`;
  const deltaCls = (d, good) => { if (!d || good === 'none' || good === 'range') return 'neutral'; if (good === 'up') return d > 0 ? 'up-good' : 'down-bad'; if (good === 'down') return d > 0 ? 'up-bad' : 'down-good'; return 'neutral'; };
  const PAGES = [
    { id: 'intro', no: '00', nav: 'Как читать', eyebrow: 'Варианты подачи первой страницы' },
    { id: 'wbr', no: 'A', nav: 'A · Amazon-дек', eyebrow: 'Вариант A · метрик-дек по образцу Amazon WBR', sep: true },
    { id: 'memo', no: 'B', nav: 'B · Записка', eyebrow: 'Вариант B · нарративная записка (6-pager) с таблицей-приложением' },
    { id: 'signals', no: 'C', nav: 'C · Сигналы', eyebrow: 'Вариант C · сигнальная доска: только исключения' },
    { id: 'compare', no: '=', nav: 'Сравнение', eyebrow: 'Сравнение и рекомендация', sep: true },
  ];
  const pageHead = (p, title, sub) => `<header class="page-head"><div><div class="eyebrow">${p.no} · ${esc(p.eyebrow)}</div><h1 class="page-title">${esc(title)}${sub ? `<span class="sub">${esc(sub)}</span>` : ''}</h1></div><div class="page-meta">${esc(M.period_label)} · одни и те же данные во всех вариантах<br>цифры вымышленные</div></header>`;
  const pageFoot = (p, note) => `<footer class="page-foot"><span>${esc(note || '')}</span><span class="pn">${p.no}</span></footer>`;
  const card = (title, body, sub = '', cls = '') => `<div class="card ${cls}"><div class="card-title">${title}</div>${sub ? `<div class="card-sub">${esc(sub)}</div>` : ''}${body}</div>`;
  const spark20 = t => CH.spark([...t.series.y2025, ...t.series.y2026], { width: 80, height: 20 });
  const val = t => fmtVal(t.value, t.fmt, t.decimals);
  const verdict = (pros, cons, fit) => `<div class="verdict">
    ${card('Сильные стороны', `<ul>${pros.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`)}
    ${card('Слабые стороны', `<ul>${cons.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`)}
    ${card('Когда подходит', `<ul>${fit.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`)}
  </div>`;

  /* ---------------------------------------------------------------- 00 как читать */
  function renderIntro(p) {
    return `${pageHead(p, 'Три способа показать одни и те же 15 метрик: дек, записка, сигналы', 'Каждый вариант — законченная первая страница месячного обзора. Смотрите, что считывается быстрее, что хочется читать, что даёт зацепки для вопросов. Основной макет (exec_board) собирает лучшее из B и C на странице 01 и плитки на странице 02.')}
      <div class="intro">
        ${card('<h3>A · Amazon-дек</h3>', `<p>Сетка одинаковых графиков: слева последние 6 месяцев крупно, справа год против прошлого года, под графиком «box score» — значение, м/м, г/г, к плану. Никакого текста и цветовых статусов: исключения отмечены только флажком, всё остальное читается по форме линии. Читают «сверху вниз, в одном и том же порядке каждый месяц».</p><div class="src">Источник практики: Working Backwards (гл. 6 «Metrics»), формат 6-12 chart и box scores из Amazon WBR.</div>`)}
        ${card('<h3>B · Нарративная записка</h3>', `<p>Полные предложения вместо графиков: пять абзацев — численность, люди, найм, структура и нагрузка, результативность — с цифрами и word-sized спарклайнами внутри текста. Дальше FAQ: вопросы, которые задаст директор, с ответами владельцев, написанными заранее. Таблица метрик — приложение.</p><div class="src">Источник практики: Amazon 6-pager и MBR-нарратив (метрики → объяснение результатов → инициативы → FAQ → приложение), Tufte sparklines.</div>`)}
        ${card('<h3>C · Сигнальная доска</h3>', `<p>Управление по исключениям: на странице только метрики, вышедшие за порог, — отсортированные по серьёзности, с изменением, причиной, владельцем и вопросом. Всё, что стабильно, свёрнуто в одну строку спарклайнов внизу. Минимальное время чтения, максимум «куда идти и кого спросить».</p><div class="src">Источник практики: management by exception (Taylor, PRINCE2), Few «highlight only when a threshold is crossed», Amazon «nothing to see here».</div>`)}
      </div>
      ${pageFoot(p, 'Навигация вверху: A, B, C и сравнение')}`;
  }

  /* ---------------------------------------------------------------- A · Amazon WBR */
  function wbr(t, i) {
    const s = t.series;
    const left = CH.lines({ width: 150, height: 92, x: CH.MONTHS.slice(2, 8), series: [{ name: '2026', values: s.y2026.slice(2, 8) }, { name: '2025', values: s.y2025.slice(2, 8) }], fmt: t.fmt, decimals: t.decimals, every: 5 });
    const right = CH.yoyLine({ width: 250, height: 92, y2025: s.y2025, y2026: s.y2026, plan: s.plan, forecast: s.forecast, limit: t.limit, target: (s.plan ? null : t.target), fmt: t.fmt, decimals: t.decimals, yMin: t.axis ? t.axis[0] : null, yMax: t.axis ? t.axis[1] : null });
    const planCell = t.delta_plan != null ? `<span>к плану<b>${fmtDelta(t.delta_plan, t.fmt, t.decimals)}</b></span>` : (t.target != null ? `<span>цель<b>${fmtVal(t.target, t.fmt, 0)}</b></span>` : `<span>план<b>—</b></span>`);
    const exc = t.status === 'red' || t.status === 'amber' ? `<div class="exc"><i class="dot ${t.status}"></i><span>${esc(t.status_text)}</span></div>` : `<div class="exc"><i class="dot none"></i><span>Без отклонений — «nothing to see here»</span></div>`;
    return `<div class="wbr mono">
      <div class="wbr-head"><span>${esc(t.title)}</span><span class="wbr-num">${i + 1}</span></div>
      <div class="wbr-charts"><div>${left}<div class="lbl">6 мес.: мар–авг, 2026 и 2025</div></div><div>${right}<div class="lbl">год: 2026 против 2025, план пунктиром</div></div></div>
      <div class="box"><span>авг 26<b>${val(t)}</b></span><span>м/м<b>${fmtDelta(t.delta_mom, t.fmt, t.decimals)}</b></span><span>г/г<b>${fmtDelta(t.delta_yoy, t.fmt, t.decimals)}</b></span>${planCell}</div>
      ${exc}
      <div class="own">Владелец: ${esc(t.owner)}</div>
    </div>`;
  }
  function renderWbr(p) {
    return `${pageHead(p, 'Метрик-дек: 15 графиков одной формы, читаются за 60 секунд на график', 'Чёрная линия — текущий год, серая — прошлый, пунктир — план или цель, красный пунктир — лимит. Слева каждый график «приближает» последние шесть месяцев, справа — год целиком. Под графиком стандартный box score. Обсуждаются только графики с флажком; остальные — «nothing to see here».')}
      <div class="howto"><span class="k"><i class="key" style="border-color:var(--ink)"></i>2026</span><span class="k"><i class="key prior"></i>2025</span><span class="k"><i class="key plan"></i>план / цель</span><span class="k"><i class="key limit"></i>лимит</span><span class="k"><i class="dot red"></i> требует решения</span><span class="k"><i class="dot amber"></i> наблюдаем</span></div>
      <div class="wbr-grid">${T.map(wbr).join('')}</div>
      ${verdict(
        ['Полная картина на одной странице: 15 метрик × 2 горизонта × прошлый год × план', 'Одна форма для всех графиков — глаз быстро учится видеть аномалии, «нулевая когнитивная нагрузка» (Working Backwards)', 'Генерируется полностью автоматически из данных, без редактуры текста', 'Идеально печатается и хорошо работает как «дек» для встречи: перелистывание за 2 секунды'],
        ['Нет ответа на вопрос «и что?»: причины и решения остаются в голове владельца метрики', 'Требует дисциплины чтения — без привычки директор закроет через минуту', 'Нужны ряды за 24 месяца и месячный план по каждой метрике — самые высокие требования к данным', 'Плохо передаёт структурные сдвиги (слопы), только уровни'],
        ['Если обзор обсуждается на регулярной встрече с владельцами метрик (формат WBR/MBR)', 'Как «полная версия» в приложении к короткому обзору', 'Когда метрики уже стабилизировались и важнее мониторинг, чем объяснение']
      )}
      ${pageFoot(p, 'Практика: Amazon WBR — 6-12 chart, box scores, exception-based review')}`;
  }

  /* ---------------------------------------------------------------- B · нарративная записка */
  function renderMemo(p) {
    const sp = id => `<span class="sp">${spark20(byId[id])}</span>`;
    const paras = [
      `<span class="lead">Численность.</span> HQ закончил август с численностью <b>22 930</b>${sp('hq_hc')} — плюс 118 за месяц и плюс 790 с начала года; до лимита 23 500 остаётся 570 человек. При текущем темпе (около 308 наймов и 225 уходов в месяц) год закончится на 23 330, но если 412 принятых офферов и 60% из 1 850 вакансий в работе закроются в срок, мы выйдем на 23 620 — на 120 выше лимита. Уложиться можно, только если в сентябре–декабре сделать не более ~1 070 внешних наймов. Решение о приоритизации вакансий нужно до 15 сентября; владелец — директор по персоналу HQ вместе с финансами.`,
      `<span class="lead">Люди.</span> Текучесть HQ <b>12,1%</b>${sp('attrition_hq')} — на 1,3 п.п. ниже прошлого года, regrettable стабилен на 5,2%. Тревожит один сегмент: руководители — <b>9,8%</b>${sp('attrition_mgr')} против 7,1% год назад, ускорение шесть месяцев подряд; две трети ушедших — Discovery Core (15,6%) и Other Digital. Среди причин ухода растут «руководитель / команда» (12 → 16%) и «выгорание» (8 → 10%), падают «компенсация» и «релокация». Доля джунов <b>18,9%</b>${sp('junior_share')} при цели 20%, вне Москвы <b>41,3%</b>${sp('regional_share')} при цели 42% — обе идут по плану.`,
      `<span class="lead">Найм.</span> Воронка закрывает около 300 вакансий в месяц, но стареет: <b>27%</b>${sp('overdue_vac')} вакансий старше 90 дней при цели не более 20%, почти все — senior SDE и ML. Найм дорожает: отказы от офферов 14% против 11% год назад, каждый девятый найм с sign-on, 12% наймов с CR выше 100. Замены растут быстрее новых позиций (33 → 39% вакансий), при этом 79 замен закрыты при работающем «заменяемом» — это скрытый рост примерно на 80 человек. Недоукомплектованность <b>7,5%</b>${sp('vacancy_rate')} девятый месяц в коридоре.`,
      `<span class="lead">Структура и нагрузка.</span> <b>21%</b>${sp('span_quasi')} руководителей управляют командой меньше четырёх человек при цели 15%, в Discovery Core — треть. В зоне перегрузки <b>9,1%</b>${sp('workload')} сотрудников, у руководителей каждый третий перегружен встречами; сотрудников с рисками по DRAFT <b>5,4%</b>${sp('risk_people')}, рост — за счёт выгорания. ИИ-инструменты еженедельно используют <b>51%</b>${sp('ai_wau')} HQ при цели 60%: 78% в разработке, но лишь 41–47% в дизайне и продуктах.`,
      `<span class="lead">Результативность и инструменты.</span> Refresh 5% выполнен на <b>58%</b>${sp('refresh')} при линейном плане 67%; индивидуальные цели есть у <b>64%</b>${sp('goal_coverage')} сотрудников при цели 80%, и рост остановился три месяца назад — это база для осеннего ревью. <b>61%</b>${sp('crossdata_adoption')} руководителей ежемесячно пользуются CrossData; «Панель руководителя 2.0» выросла с 940 до 1 180 активных пользователей за месяц.`,
    ];
    const faq = [
      ['Почему прогноз выше лимита, если факт ниже плановой траектории?', 'Потому что план-траектория линейная, а найм сезонный: сентябрь–октябрь — пик выходов, и 412 принятых офферов уже «в пути». Факт отстаёт на 112 человек, воронка опережает на 120. Управлять нужно воронкой, а не фактом.', 'Директор по персоналу HQ'],
      ['Можно ли не замораживать вакансии, а положиться на отток?', 'Отток стабильно 225 в месяц и снижается; чтобы компенсировать 300 наймов, он должен вырасти на треть — это не управляемый сценарий. Реалистично: перенести ~300 новых позиций на 2027 и оставить замены.', 'Финансы'],
      ['Что уже сделано по руководителям Discovery Core?', 'Exit-интервью за квартал показывают три причины: смена приоритетов продуктов, «руководитель без команды» (span < 4) и нагрузка. В сентябре — разбор с руководителем направления, предложение по объединению юнитов внесём в октябрьский выпуск.', 'HRBP Discovery'],
      ['Просроченные вакансии — это рынок или наши вилки?', 'Разбор 20 самых старых вакансий: 12 — вилка ниже рынка на 15–20%, 5 — узкий профиль (ML-инфраструктура), 3 — заявка без решения нанимающего менеджера дольше 30 дней. Предложение по вилкам — к C&B-комитету 20 сентября.', 'Рекрутмент, C&B'],
    ];
    const rows = T.map(t => `<tr><td class="name">${esc(t.title)}</td><td>${val(t)}</td><td class="${deltaCls(t.delta_mom, t.good)}">${fmtDelta(t.delta_mom, t.fmt, t.decimals)}</td><td class="${deltaCls(t.delta_yoy, t.good)}">${fmtDelta(t.delta_yoy, t.fmt, t.decimals)}</td><td>${t.delta_plan != null ? fmtDelta(t.delta_plan, t.fmt, t.decimals) : (t.target != null ? 'цель ' + fmtVal(t.target, t.fmt, 0) : '—')}</td><td>${t.status !== 'none' ? chip(t.status, STATUS_WORD[t.status]) : ''}</td><td class="note">${esc(t.owner)}</td></tr>`).join('');
    return `${pageHead(p, S.headline, 'Записка читается молча в начале встречи (по правилу Amazon — около трёх минут на страницу). Ниже — вопросы, которые директор задаст, и ответы, которые владельцы написали заранее. Все цифры продублированы таблицей в приложении.')}
      <div class="rail-layout" style="grid-template-columns: minmax(0, 1fr) 380px">
        <div class="memo">${paras.map(x => `<p>${x}</p>`).join('')}</div>
        <div class="stack">
          ${card('Вопросы и ответы владельцев', `<dl class="faq">${faq.map(([q, a, o]) => `<dt>${esc(q)}</dt><dd>${esc(a)}<span class="a">— ${esc(o)}</span></dd>`).join('')}</dl>`, 'FAQ по правилу 6-pager: спорные места объясняются заранее')}
          ${card('Решения, которые ждут', `<div class="stack" style="gap:8px">${S.decisions.map(d => `<div class="decision"><span>${esc(d.text)}</span><span class="own">${esc(d.owner)}</span></div>`).join('')}</div>`)}
        </div>
      </div>
      ${card('Приложение: метрики панели', `<div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>Метрика</th><th>Август</th><th>м/м</th><th>г/г</th><th>к плану / цель</th><th>Статус</th><th>Владелец</th></tr></thead><tbody>${rows}</tbody></table></div>`, 'одна таблица вместо 15 графиков — «one supertable is far better than a hundred little bar charts» (Tufte)')}
      ${verdict(
        ['Самый высокий шанс, что директор дочитает: текст объясняет причины и связи между цифрами, а не перечисляет их', 'FAQ с заранее написанными ответами экономит встречу и дисциплинирует владельцев процессов', 'Нарратив — естественный формат для ИИ-слоя: черновик пишется из тех же данных, аналитик редактирует', 'Отлично печатается, читается на телефоне'],
        ['Требует редактуры человеком каждый месяц — черновик ИИ нельзя выпускать без проверки', 'Медленно сканируется: чтобы найти конкретную цифру, нужно читать', 'Соблазн «размыть» плохие новости формулировками; нужна дисциплина «answer first»', 'Плохо масштабируется на 40+ метрик — только для верхнего уровня'],
        ['Если обзор читают в одиночку или молча в начале встречи (формат 6-pager)', 'Когда важнее понять «почему», чем увидеть «сколько»', 'Как первая страница перед деком или плитками']
      )}
      ${pageFoot(p, 'Практика: Amazon 6-pager / MBR-нарратив, FAQ, sparklines Тафти')}`;
  }

  /* ---------------------------------------------------------------- C · сигнальная доска */
  function renderSignals(p) {
    const order = { red: 0, amber: 1, ok: 2, none: 3 };
    const flagged = T.filter(t => t.status === 'red' || t.status === 'amber').sort((a, b) => order[a.status] - order[b.status]);
    const okRows = T.filter(t => t.status === 'ok');
    const stable = T.filter(t => t.status === 'none');
    const row = t => `<div class="sigrow">
      <i class="dot ${t.status}" title="${STATUS_WORD[t.status]}"></i>
      <div class="t">${esc(t.title)}<small>${esc(t.status_text)}</small></div>
      <div class="v">${val(t)}</div>
      <div class="d">м/м <b class="${deltaCls(t.delta_mom, t.good)}">${fmtDelta(t.delta_mom, t.fmt, t.decimals)}</b><br>г/г <b class="${deltaCls(t.delta_yoy, t.good)}">${fmtDelta(t.delta_yoy, t.fmt, t.decimals)}</b>${t.delta_plan != null ? `<br>план <b class="${deltaCls(t.delta_plan, t.good === 'range' ? 'none' : t.good)}">${fmtDelta(t.delta_plan, t.fmt, t.decimals)}</b>` : (t.target != null ? `<br>цель <b>${fmtVal(t.target, t.fmt, 0)}</b>` : '')}</div>
      <div class="sp">${CH.spark([...t.series.y2025, ...t.series.y2026], { width: 100, height: 26 })}</div>
      <div class="q">${esc(t.question)}<span class="to">${esc(t.ask)}</span></div>
      <div class="o">${esc(t.owner)}</div>
    </div>`;
    const head = `<div class="sigrow head"><span></span><span>Метрика и что произошло</span><span>Август</span><span>Изменение</span><span>20 месяцев</span><span>О чём спросить</span><span>Владелец</span></div>`;
    return `${pageHead(p, `${flagged.filter(t => t.status === 'red').length} метрики требуют решения, ${flagged.filter(t => t.status === 'amber').length} — наблюдаем; остальные ${okRows.length + stable.length} в норме`, 'Показано только то, что вышло за порог: значение, изменение, короткая причина, владелец и вопрос. Порядок — по серьёзности. Нормальные метрики свёрнуты внизу в одну строку — их можно не читать.')}
      ${card('Требует решения и наблюдения', head + `<div class="sigrows">${flagged.map(row).join('')}</div>`, 'красная метка — нужно решение в этом месяце; жёлтая — тренд не в ту сторону, решение пока не требуется')}
      ${card('Идёт по плану — для контекста', `<div class="sigrows">${okRows.map(row).join('')}</div>`, 'хорошие исключения тоже показываем: «both the especially good and especially bad» (Taylor)')}
      ${card('Стабильно — ничего не изменилось', `<div class="stable-strip">${stable.map(t => `<span class="stable-chip">${esc(t.title)} <b>${val(t)}</b> ${CH.spark(t.series.y2026, { width: 60, height: 16 })}</span>`).join('')}${D.stability.filter(x => !/Недоукомплектованность|Абсентеизм/.test(x.name)).slice(0, 5).map(x => `<span class="stable-chip">${esc(x.name)} <b>${esc(x.value)}</b> ${CH.spark(x.spark, { width: 60, height: 16 })}</span>`).join('')}</div>`)}
      <div class="grid g2">
        ${card('Пять вопросов месяца', `<div class="ask">${S.questions.map(q => `<div class="ask-item"><span class="q">?</span><div>${esc(q.q)}<span class="to">${esc(q.to)}</span></div></div>`).join('')}</div>`)}
        ${card('Решения, которые ждут', `<div class="stack" style="gap:8px">${S.decisions.map(d => `<div class="decision"><span>${esc(d.text)}</span><span class="own">${esc(d.owner)}</span></div>`).join('')}</div>`)}
      </div>
      ${verdict(
        ['Самое короткое время чтения — 3–5 минут, всё внимание на исключениях', 'Прямой ответ на «куда сходить и кого пнуть»: у каждой строки владелец и вопрос', 'Генерируется автоматически по правилам порогов; текст причин — короткий, легко проверить', 'Устойчиво к «ещё одному отчёту»: если ничего не случилось — страница почти пустая, и это честно'],
        ['Нет картины целого: директор не видит, как метрики связаны между собой', 'Качество зависит от порогов: слишком чувствительные — шум, слишком грубые — пропуски (нужны XmR-пределы или коридоры)', 'Может считываться как «список претензий» к владельцам — важна нейтральная формулировка', 'Слабо показывает структурные сдвиги без отдельной страницы слопов'],
        ['Если директор читает обзор сам, между встречами, с телефона', 'Как верх страницы 01 перед нарративом', 'Когда процессы зрелые и метрик много: исключения — единственный способ не утонуть']
      )}
      ${pageFoot(p, 'Практика: management by exception, Few (highlight only on threshold), Amazon «nothing to see here»')}`;
  }

  /* ---------------------------------------------------------------- сравнение */
  function renderCompare(p) {
    const rows = [
      ['Время чтения первой страницы', '10–15 мин', '8–10 мин', '3–5 мин'],
      ['Плотность информации', 'высокая', 'средняя', 'низкая — только исключения'],
      ['«Куда сходить, кого пнуть»', 'слабо: нужно искать самому', 'средне: в тексте', 'сильно: владелец и вопрос в каждой строке'],
      ['Понимание причин и связей', 'слабо', 'сильно', 'средне'],
      ['Структурные сдвиги (слопы)', 'не показывает', 'в тексте, без картинки', 'не показывает'],
      ['Риск «ещё одного отчёта»', 'высокий без привычки', 'низкий, если текст честный', 'низкий'],
      ['Печать / PDF / телефон', 'печать отлично, телефон плохо', 'отлично везде', 'хорошо везде'],
      ['Генерация ИИ-слоем', 'полностью автоматически', 'черновик + редактура аналитика', 'автоматически по порогам'],
      ['Требования к данным', 'ряды 24 мес. + план по всем метрикам', 'ряды 20 мес., план по ключевым', 'ряды + пороги / коридоры'],
      ['Что берём в основной макет', 'форму графика «2026 против 2025 + план» в плитках; полный дек — как приложение', 'абзацы «что произошло» и FAQ-вопросы на стр. 01, комментарии на разделах', 'блок «Сигналы месяца» на стр. 01, статусы и вопросы в плитках'],
    ];
    return `${pageHead(p, 'Рекомендация: сигналы + нарратив на первой странице, плитки на второй, дек — в приложении', 'Ни один формат не выигрывает по всем критериям. Основной макет собран как комбинация: страница 01 — сигналы (C) и три абзаца (B), страница 02 — плитки одной формы (A с цветом и вопросами), разделы 03–10 — по запросу, слопы — отдельной страницей.')}
      ${card('Сравнение по критериям', `<table class="cmp"><thead><tr><th>Критерий</th><th>A · Amazon-дек</th><th>B · Записка</th><th>C · Сигналы</th></tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`)}
      <div class="grid g2">
        ${card('Что решить после просмотра', `<ul class="list arrows"><li>Первая страница: сигналы + текст (как в основном макете) или чистый дек?</li><li>Сколько метрик на панели — 10 или 15? Какие пять «спотлайт»?</li><li>Пороги для красного и жёлтого: правило (план ± X, г/г ± Y) или экспертная оценка аналитика?</li><li>Нужен ли FAQ с ответами владельцев — и готовы ли владельцы писать его до выпуска?</li><li>Печатаем ли PDF — тогда все страницы верстаются в A4 landscape</li></ul>`)}
        ${card('Что это меняет в данных', `<ul class="list"><li>Для всех вариантов: месячные ряды с января 2025 по каждой метрике панели, план или цель на 2026, владелец</li><li>Для A: те же ряды за 2024 (прошлый год для левой панели «6 месяцев»)</li><li>Для C: пороги статусов в справочнике метрик, а не в голове аналитика</li><li>Для B: причинные срезы (причины оттока, сегменты) — иначе текст не о чем писать</li></ul>`)}
      </div>
      ${pageFoot(p, 'Все три варианта собраны из одного JSON — mockups/data/exec_board_2026-08.json')}`;
  }

  const R = { intro: renderIntro, wbr: renderWbr, memo: renderMemo, signals: renderSignals, compare: renderCompare };
  document.getElementById('brand-sub').textContent = `варианты подачи · ${M.company} · ${M.period_label}`;
  document.getElementById('tabs').innerHTML = PAGES.map(p => `<a href="#p-${p.id}" class="${p.sep ? 'sep' : ''}"><span class="n">${p.no}</span>${esc(p.nav)}</a>`).join('');
  document.getElementById('app').innerHTML = PAGES.map(p => `<section class="page" id="p-${p.id}">${R[p.id](p)}</section>`).join('');
  CH.initTips();
})();
