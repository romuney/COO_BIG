/* m_stories.js — «Сводка»: тринадцать полноэкранных карточек, переход касанием и свайпом. */
(() => {
  (() => { if (!document.querySelector('meta[name="viewport"]')) { const m = document.createElement('meta'); m.name = 'viewport'; m.content = 'width=device-width, initial-scale=1, viewport-fit=cover'; document.head.appendChild(m); } })();
  const D = window.DATA, S = D.summary, F = D.findings, R = D.resources, G = D.goals, K = D.stakes;
  const { int, num, esc, ring, spark, meter, funnel, waffle, bars, rows } = MB;
  const f = id => F.find(x => x.id === id);

  /* ---------------------------------------------------------------- модель решения */
  const HQ = 22930, LIMIT = 23500, OTHER = 70;
  const model = { hires: 1232, leave: 900 };
  const dec = () => HQ - model.leave + OTHER + model.hires;

  const note = (l, v) => `<div class="note"><div class="l">${esc(l)}</div><div class="v">${esc(v)}</div></div>`;
  const ask = (t, o) => `<div class="q"><div class="t">${esc(t)}</div><div class="o">${esc(o)}</div></div>`;
  const ringWrap = (o, side) => `<div class="ring-wrap"><div class="c">${ring(o)}<b>${o.text}</b></div><div class="side">${side}</div></div>`;

  /* ---------------------------------------------------------------- карточки */
  const CARDS = [
    { tone: 's-blue', nav: 'обложка', html: () => `
      <div class="gap"></div>
      <div class="brand">Сводка · ${esc(D.meta.period_label)}</div>
      <div class="big plain" style="margin-top:18px">22 930</div>
      <div class="unit">человек в HQ на 31 августа</div>
      <p class="say">Двенадцать экранов. Полторы минуты. Четыре вопроса, которые стоит задать.</p>
      <div class="who">${esc(D.meta.company)} · выпуск ${esc(D.meta.issue_no)}<br>Офис исполнительного директора, BI-аналитика<br>Цифры вымышленные, механика настоящая</div>
      <div class="gap"></div>` },

    { tone: 's-amber', nav: 'лимит', html: () => `
      <div class="kick">Лимит роста</div>
      <div class="big">570</div>
      <div class="unit">свободных мест до лимита 23 500</div>
      <div class="viz">${waffle({ value: 2.4, max: 100, cols: 24, rows: 6, tone: '' })}</div>
      <p class="txt">Каждая точка — 1% от лимита. Закрашено то, что осталось свободным: 570 мест из 23 500 на конец года.</p>
      <p class="say">С начала года мы заняли 790 мест из 1 360, отведённых на весь год.</p>
      <div class="gap"></div>` },

    { tone: 's-amber', nav: 'очередь', html: () => `
      <div class="kick">Уже запущено</div>
      <div class="big">2 262</div>
      <div class="unit">найма в очереди на 570 мест</div>
      <p class="say">412 принятых офферов и 1 850 вакансий в работе.</p>
      <p class="txt">Не все выйдут, и места освобождаются: до декабря ждём около 900 увольнений. Сколько поместится — зависит от одного решения. Оно на следующем экране.</p>
      <div class="viz">${bars({ values: D.hiring.closed.slice(-12), labels: D.months13.slice(-12), height: 92, hotFrom: 9, every: 3 })}</div>
      <div class="unit" style="margin-top:6px">закрытий в месяц за последний год</div>
      <div class="gap"></div>` },

    { tone: 's-red', nav: 'решение', interactive: true, html: () => `
      <div class="kick">Ваше решение</div>
      <p class="say" style="margin-top:0">Сколько нанять до декабря?</p>
      <div class="ctl">
        <div class="lab"><span>внешний найм за сен–дек</span><b id="hv">1 232</b></div>
        <input type="range" id="hires" min="0" max="2262" step="10" value="1232" aria-label="Внешний найм за сентябрь–декабрь">
        <div class="chips">
          <button type="button" data-h="1232">по темпу</button>
          <button type="button" data-h="1520">по воронке</button>
          <button type="button" data-h="1400">впритык</button>
        </div>
        <div class="lab" style="margin-top:20px"><span>ожидаемый отток</span><b id="lv">900</b></div>
        <input type="range" id="leave" min="700" max="1100" step="10" value="900" aria-label="Ожидаемый отток за сентябрь–декабрь">
      </div>
      <div class="res">
        <div class="n" id="decN">23 332</div>
        <div class="d" id="decD"></div>
        <div class="verdict" id="decV"></div>
      </div>
      ${note('Допущения', 'Плюс 70 стажёров и переводов. Отток равномерный. Принятые офферы выходят первыми.')}
      <div class="gap"></div>` },

    { tone: 's-mint', nav: 'ресурс', html: () => ringWrap(
      { size: 132, stroke: 12, value: R.value, target: R.target, max: 100, text: num(R.value, 1) + '%', label: 'Ресурсообеспеченность' },
      `<b>Ресурсообеспеченность</b><br>цель ${num(R.target, 0)}%<br>год назад ${num(R.prev_year, 1)}%`) + `
      <div class="kick" style="margin:20px 0 0">Ресурс</div>
      <p class="say" style="margin-top:8px">Держим 92,5% нужного ресурса, но на месте только 82,5%.</p>
      <div class="list">${R.levels.map(l => `<div class="li"><span class="n">${esc(l.name)}<small>${esc(l.sub)}</small></span><span class="v">${num(l.value, 1)}%</span></div>`).join('')}</div>
      <p class="txt">Разница между строками — люди в отпусках, на больничных и в командировках. Это не дефицит найма, но это ресурс, которого сегодня нет.</p>
      <div class="gap"></div>` },

    { tone: 's-red', nav: 'дефицит', html: () => `
      <div class="kick">Где ресурса не хватает</div>
      <div class="big">86,5%</div>
      <div class="unit">ресурсообеспеченность ML — худшая среди профессий</div>
      <div class="viz">${rows(R.professions.slice(0, 7).map(p => ({ name: p.name, v: p.value, tone: p.status === 'red' ? 'hot' : p.status === 'amber' ? 'warm' : 'good' })), { suffix: '%' })}</div>
      <p class="txt">Средняя обеспеченность 92,5% скрывает разброс: в ML и продактах дефицит вдвое больше среднего, и это те же профессии, где просрочены вакансии и выше regrettable-отток.</p>
      ${ask(R.question, R.owner)}
      <div class="gap"></div>` },

    { tone: 's-violet', nav: 'цели', html: () => `
      <div class="kick">Цели</div>
      <p class="say" style="margin-top:0">${esc(G.headline)}</p>
      <div class="viz">${funnel(G.funnel.map((s, i) => ({ name: s.name, v: s.v, note: ['цель 95%', 'цель 85%', '60 дней', 'I полугодие'][i], tone: i === 1 ? '' : 'dim' })))}</div>
      <p class="txt">Ставим цели хорошо, связываем плохо. Почти каждая третья цель ни к чему не привязана сверху, то есть её вклад в цели компании не прослеживается.</p>
      <div class="gap"></div>` },

    { tone: 's-red', nav: 'связанность', html: () => ringWrap(
      { size: 132, stroke: 12, value: 71, target: 85, max: 100, text: '71%', label: 'Связанность целей' },
      `<b>Связанность целей</b><br>цель 85%<br>год назад 69%`) + `
      <div class="kick" style="margin:20px 0 0">Разрыв</div>
      <div class="list">${G.stages.map(s => `<div class="li ${s.status === 'red' ? 'hot' : s.status === 'amber' ? 'warm' : 'good'}"><span class="n">${esc(s.name)}<small>${esc(s.sub)}</small></span><span class="v">${s.value}%</span></div>`).join('')}</div>
      ${note('Чего мы не знаем', G.unknown)}
      ${ask(G.question, G.owner)}
      <div class="gap"></div>` },

    { tone: 's-red', nav: 'находка 01', html: () => { const x = f('hidden_growth'); return `
      <div class="kick">Находка 01 · ${esc(x.kicker)}</div>
      <div class="big">79</div>
      <div class="unit">замен закрыты при работающем «заменяемом»</div>
      <p class="say">${esc(x.claim)}</p>
      <p class="txt">${esc(x.text)}</p>
      ${note('Чего мы не знаем', x.unknown)}
      ${ask(x.question, x.owner)}
      <div class="gap"></div>`; } },

    { tone: 's-amber', nav: 'находка 02', html: () => { const x = f('hq_drain'); return `
      <div class="kick">Находка 02 · ${esc(x.kicker)}</div>
      <div class="big">40</div>
      <div class="unit">перевода из HQ в Support с начала года</div>
      <p class="say">${esc(x.claim)}</p>
      <div class="viz">${bars({ values: x.series, labels: x.months, height: 92, hotFrom: 6, every: 1 })}</div>
      <p class="txt">${esc(x.text)}</p>
      ${note('Чего мы не знаем', x.unknown)}
      ${ask(x.question, x.owner)}
      <div class="gap"></div>`; } },

    { tone: 's-red', nav: 'находка 03', html: () => { const x = f('managers_without_teams'); return `
      <div class="kick">Находка 03 · ${esc(x.kicker)}</div>
      <div class="big">612</div>
      <div class="unit">руководителей с командой меньше четырёх</div>
      <p class="say">${esc(x.claim)}</p>
      <div class="viz">${rows(x.bins.map((b, i) => ({ name: b + ' чел.', v: x.hist[i], tone: i < 2 ? 'hot' : '' })), { fmt: 'int' })}</div>
      <p class="txt">${esc(x.text)}</p>
      ${ask(x.question, x.owner)}
      <div class="gap"></div>`; } },

    { tone: 's-red', nav: 'находка 04', html: () => { const x = f('managers_leaving'); return `
      <div class="kick">Находка 04 · ${esc(x.kicker)}</div>
      <div class="big">9,8%</div>
      <div class="unit">годовая текучесть руководителей · год назад 7,1%</div>
      <div class="viz">${spark(x.series, { width: 320, height: 84 })}</div>
      <p class="say">${esc(x.claim)}</p>
      <p class="txt">${esc(x.text)}</p>
      ${note('Чего мы не знаем', x.unknown)}
      ${ask(x.question, x.owner)}
      <div class="gap"></div>`; } },

    { tone: 's-blue', nav: 'что делать', html: () => `
      <div class="kick">До 15 сентября</div>
      <p class="say" style="margin-top:0">Пять вопросов и два решения.</p>
      <div class="qs">${S.questions.map((q, i) => `<div class="qr"><span class="i">${String(i + 1).padStart(2, '0')}</span><div><div class="t">${esc(q.q)}</div><div class="o">${esc(q.to)}</div></div></div>`).join('')}</div>
      <div class="list" style="margin-top:18px">${S.decisions.map(d => { const [t, w] = d.text.split(' — '); return `<div class="li"><span class="n">${esc(t)}<small>${esc(d.owner)}</small></span><span class="v" style="font-size:13px;font-family:var(--mono)">${esc(w || 'в сентябре')}</span></div>`; }).join('')}</div>
      ${note('Счёт прошлого прогноза', K.scoreboard.text)}
      <div class="gap"></div>` },
  ];

  /* ---------------------------------------------------------------- рендер и навигация */
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="bars" id="bars">${CARDS.map(() => '<i></i>').join('')}</div>
    <div class="head"><span class="dot"></span><span id="navName"></span><span class="sp"></span><span class="cnt" id="cnt"></span></div>
    <div class="stage" id="stage">
      <div class="tap prev" id="tprev" aria-hidden="true"></div>
      <div class="tap next" id="tnext" aria-hidden="true"></div>
      <div class="card" id="card"></div>
    </div>
    <div class="foot">
      <span class="hint" id="hint">Нажмите справа</span>
      <button type="button" id="prev" aria-label="Назад">←</button>
      <button type="button" id="next" class="go" aria-label="Дальше">Дальше</button>
    </div>`;
  const card = document.getElementById('card'), barsEl = document.getElementById('bars');
  let i = 0;

  function render() {
    const c = CARDS[i];
    app.className = c.tone;
    card.innerHTML = c.html();
    card.scrollTop = 0;
    [...barsEl.children].forEach((b, k) => { b.className = k < i ? 'done' : k === i ? 'on' : ''; });
    document.getElementById('navName').textContent = c.nav;
    document.getElementById('cnt').textContent = `${i + 1} / ${CARDS.length}`;
    document.getElementById('prev').disabled = i === 0;
    const nx = document.getElementById('next');
    nx.textContent = i === CARDS.length - 1 ? 'В начало' : 'Дальше';
    document.getElementById('hint').textContent = c.interactive ? 'Двигайте ползунок' : (i === 0 ? 'Нажмите справа' : 'Свайп или касание');
    if (c.interactive) bindDecision();
  }
  const go = d => { i = (i + d + CARDS.length) % CARDS.length; render(); };

  document.getElementById('next').addEventListener('click', () => go(1));
  document.getElementById('prev').addEventListener('click', () => go(-1));
  document.getElementById('tnext').addEventListener('click', () => go(1));
  document.getElementById('tprev').addEventListener('click', () => go(-1));
  addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === ' ') go(1); if (e.key === 'ArrowLeft') go(-1); });

  // свайп: только когда жест горизонтальный, чтобы не мешать прокрутке длинной карточки
  let sx = 0, sy = 0, tracking = false;
  const stage = document.getElementById('stage');
  stage.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; tracking = true; }, { passive: true });
  stage.addEventListener('touchend', e => {
    if (!tracking) return; tracking = false;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.6) go(dx < 0 ? 1 : -1);
  }, { passive: true });

  /* ---------------------------------------------------------------- интерактивный экран */
  function bindDecision() {
    const h = document.getElementById('hires'), l = document.getElementById('leave');
    const upd = () => {
      model.hires = +h.value; model.leave = +l.value;
      document.getElementById('hv').textContent = int(model.hires);
      document.getElementById('lv').textContent = int(model.leave);
      const v = dec(), over = v - LIMIT;
      const n = document.getElementById('decN');
      n.textContent = int(v); n.className = 'n ' + (over > 0 ? 'over' : 'fit');
      document.getElementById('decD').textContent = `HQ на 31 декабря · ${over > 0 ? '+' + int(over) + ' над лимитом' : int(-over) + ' в запасе'}`;
      const cap = LIMIT - HQ + model.leave - OTHER;
      document.getElementById('decV').textContent = over > 0
        ? `Не проходит. При таком оттоке наймов должно быть не больше ${int(cap)} — это примерно ${int(Math.round((model.hires - cap) / 0.6 / 10) * 10)} вакансий, которые надо снять или перенести на 2027.`
        : `Проходит с запасом ${int(-over)}. Каждые 100 наймов сверх этого — около 420 млн ₽ в год по оценке.`;
      document.querySelectorAll('.chips button').forEach(b => b.classList.toggle('on', +b.dataset.h === model.hires));
    };
    h.addEventListener('input', upd); l.addEventListener('input', upd);
    document.querySelectorAll('.chips button').forEach(b => b.addEventListener('click', () => { h.value = b.dataset.h; upd(); }));
    upd();
  }

  render();
})();
