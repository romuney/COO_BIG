/* razbor.js — три разворота: что горит, чего вы не видели, всё остальное. */
(() => {
  /* Без viewport-меты телефон верстает страницу в 980 px и всё уезжает.
     Артефакт-обёртка мету добавляет, но самодостаточный файл открывают и напрямую. */
  (() => { if (!document.querySelector('meta[name="viewport"]')) { const m = document.createElement('meta'); m.name = 'viewport'; m.content = 'width=device-width, initial-scale=1, viewport-fit=cover'; document.head.appendChild(m); } })();

  const D = window.DATA, M = D.meta, T = D.control_panel, S = D.summary, F = D.findings, K = D.stakes;
  const { int, num, esc, plural } = DEV;
  const byId = Object.fromEntries(T.map(t => [t.id, t]));
  const val = t => t.fmt === 'int' ? int(t.value) : num(t.value, t.decimals) + (t.fmt === 'pct' ? '%' : '');
  const delta = (v, fmt, d) => {
    if (v == null || isNaN(v)) return '—';
    const s = v > 0 ? '+' : (v < 0 ? '−' : '±'), a = Math.abs(v);
    return s + (fmt === 'int' ? int(a) : num(a, d));
  };
  const dcls = (v, good) => {
    if (!v || good === 'none' || good === 'range') return 'flat';
    if (good === 'up') return v > 0 ? 'up-good' : 'down-bad';
    if (good === 'down') return v > 0 ? 'up-bad' : 'down-good';
    return 'flat';
  };
  const MARK = { red: '▲', amber: '◆', ok: '●', none: '·' };

  /* ---------------------------------------------------------------- шапка */
  const masthead = `<header class="masthead">
    <div class="logo">РАЗБОР<span class="dot">.</span></div>
    <div class="mast-mid">Ежемесячный обзор для исполнительного директора · ${esc(M.company)} · Офис исполнительного директора, BI-аналитика</div>
    <div class="mast-right"><b>${esc(M.period_label)}</b> · выпуск ${esc(M.issue_no)}<br>данные на ${esc(M.as_of)} · читать 6 минут</div>
  </header>`;

  /* ---------------------------------------------------------------- разворот 1 */
  function spreadBurning() {
    const hq = byId.hq_hc;
    const meter = DEV.gapMeter({
      width: 860, min: 22700, max: 23800, actual: hq.value, limit: hq.limit,
      range: [23330, 23620],
      marks: [
        { value: 23330, label: 'при текущем темпе', anchor: 'middle' },
        { value: 23620, label: 'если закрыть воронку', anchor: 'middle' },
      ],
    });
    const red = S.signals.filter(s => s.level === 'red');
    const amber = S.signals.filter(s => s.level === 'amber');
    const shown = [...red, ...amber].slice(0, 8);
    const sig = shown.map(s => `<div class="sig">
      <span class="sig-mark ${s.level}">${MARK[s.level]}</span>
      <div><div class="sig-t">${esc(s.title)}</div><div class="sig-x">${esc(s.text)}</div>
      ${s.owner ? `<div class="sig-o">Отвечает: ${esc(s.owner)}</div>` : ''}</div></div>`).join('');
    const asks = S.questions.map((q, i) => `<div class="ask">
      <span class="ask-n">${String(i + 1).padStart(2, '0')}</span>
      <div><div class="ask-q">${esc(q.q)}</div><div class="ask-to">${esc(q.to)}</div></div></div>`).join('');
    const stakes = K.items.map(x => `<div class="stake"><span>${esc(x.label)} · <b>${esc(x.value)}</b></span><span class="m">${esc(x.money)}</span></div>`).join('');
    return `<section class="spread" id="s1">
      <div class="spread-head">
        <div><div class="spread-no">РАЗВОРОТ 01</div>
          <h2 class="spread-title">Что горит</h2>
          <p class="spread-sub">Четыре темы требуют вашего решения в сентябре, пять — наблюдения. Всё остальное в компании идёт по плану и вынесено на третий разворот.</p></div>
        <div class="spread-meta">${red.length} требуют решения<br>${amber.length} под наблюдением<br>${T.length - red.length - amber.length} в норме</div>
      </div>

      <div class="hero">
        <div>
          <div class="kicker">Главное · численность</div>
          <div class="hero-pair"><span class="one">570</span><span class="vs">мест ↔ наймов</span><span class="two">2 262</span></div>
          <div class="hero-legend"><span>свободно до лимита 23 500</span><span>уже запущено: 412 офферов + 1 850 вакансий</span></div>
          <p class="hero-say">Мы запустили вчетверо больше наймов, чем у нас осталось мест.</p>
          <p class="hero-body">Это два факта, а не прогноз. Прогноз из них выходит с вилкой: по текущему темпу декабрь закрывается на 23 330, то есть на 170 ниже лимита; если воронка отработает с обычной конверсией — на 23 620, то есть на 120 выше. Вилка в 290 человек пересекает лимит, поэтому вопрос не «превысим ли», а «какой сценарий мы выбираем». Чтобы гарантированно уложиться, за сентябрь–декабрь можно нанять не больше 1 400 человек вместо 1 520 по воронке: это примерно 200 вакансий, которые надо снять или перенести на 2027, и решение нужно до выхода офферов.</p>
          <div class="hero-meter">${meter}
            <p class="assump" style="margin-top:10px">Сценарий «воронка»: 100% принятых офферов и 60% вакансий в работе закрываются до 31 декабря — это историческая конверсия за 2025 год. Сценарий «темп»: найм и отток сохраняют средние значения последних шести месяцев.</p>
          </div>
        </div>
        <aside>
          <div class="clock">
            <div class="clock-row"><span class="l">${esc(K.clock.label)}</span><span class="v">${esc(K.clock.value)}</span><span class="s">${esc(K.clock.sub)}</span></div>
            <div class="clock-row"><span class="l">${esc(K.deadline.label)}</span><span class="v hot">${esc(K.deadline.value)}</span><span class="s">${esc(K.deadline.sub)}</span></div>
          </div>
          <div class="stakes">
            <div class="kicker calm" style="margin-bottom:8px">Чего это стоит</div>
            ${stakes}
            <p class="assump">Оценка порядка величины, не бюджет. Допущение: средние затраты на сотрудника HQ 4,2 млн ₽ в год.</p>
          </div>
          <div class="scoreboard">
            <div class="kicker calm">${esc(K.scoreboard.label)}</div>
            <p class="t">${esc(K.scoreboard.text)}</p>
            <div class="cmp"><div><span>июль давал</span><b>${esc(K.scoreboard.prev)}</b></div><div><span>сегодня</span><b>${esc(K.scoreboard.now)}</b></div></div>
          </div>
        </aside>
      </div>

      <div class="sig-head"><h3>Сигналы месяца</h3><span class="cnt">▲ решение · ◆ наблюдаем</span></div>
      <div class="signals">${sig}</div>

      <div class="sig-head" style="margin-top:28px"><h3>О чём спросить</h3><span class="cnt">вопросы владельцам процессов</span></div>
      <div class="asks">${asks}</div>

      <div class="decisions">
        <h3>Решения, которые ждут вас</h3>
        ${S.decisions.map((d, i) => `<div class="dec"><span>${esc(d.text.split(' — ')[0])}</span><span class="who">${esc(d.owner)}</span><span class="when">${esc(d.text.includes(' — ') ? d.text.split(' — ').slice(1).join(' — ') : 'в сентябре')}</span></div>`).join('')}
      </div>
    </section>`;
  }

  /* ---------------------------------------------------------------- разворот 2 */
  function findingVisual(f) {
    if (f.id === 'hidden_growth') {
      return `<div class="cap">720 вакансий на замену · что с заменяемым</div>` +
        DEV.composition({ width: 400, height: 58, items: f.scale.map(x => ({ name: x.name, v: x.v, flag: x.flag === 'red' })) });
    }
    if (f.id === 'hq_drain') {
      return `<div class="cap">переводы из HQ в Support по месяцам, человек</div>` +
        DEV.streak({ width: 400, height: 108, values: f.series, labels: f.months, decimals: 0, unit: ' чел.', every: 1 });
    }
    if (f.id === 'managers_leaving') {
      return `<div class="cap">текучесть руководителей, годовая · серая — прошлый год</div>` +
        DEV.bigLine({ width: 400, height: 118, values: f.series, compare: f.compare, labels: f.months, unit: '%', decimals: 1 });
    }
    if (f.id === 'managers_without_teams') {
      return `<div class="cap">руководители по размеру команды</div>` +
        DEV.distribution({ width: 400, height: 138, values: f.hist, bins: f.bins, flagUpTo: f.hist_flag, flagLabel: '612 · команда < 4' });
    }
    return '';
  }
  function spreadFindings() {
    const finds = F.map((f, i) => `<article class="find">
      <div class="find-no">${String(i + 1).padStart(2, '0')}</div>
      <div>
        <div class="kicker">${esc(f.kicker)}</div>
        <h3 class="find-claim">${esc(f.claim)}</h3>
        <p class="find-text">${esc(f.text)}</p>
      </div>
      <div class="find-vis">${findingVisual(f)}</div>
      <div class="find-foot">
        <div class="ff"><div class="l">Как посчитано</div><div class="v">${esc(f.how)}</div></div>
        <div class="ff"><div class="l">Источник</div><div class="v">${esc(f.source)}</div></div>
        <div class="ff unknown"><div class="l">Чего мы не знаем</div><div class="v">${esc(f.unknown)}</div></div>
      </div>
      <div class="find-ask">
        <span class="q">?</span>
        <span class="t">${esc(f.question)}</span>
        <span class="o">${esc(f.owner)}</span>
      </div>
    </article>`).join('');
    return `<section class="spread" id="s2">
      <div class="spread-head">
        <div><div class="spread-no">РАЗВОРОТ 02</div>
          <h2 class="spread-title">Чего вы не видели</h2>
          <p class="spread-sub">Четыре находки этого месяца. Ни одна не требует новых данных: всё получено соединением таблиц, которые уже есть в компании. Поэтому их и не было видно — по отдельности каждая цифра выглядит нормально. У каждой находки мы указываем, чего мы не знаем: это границы утверждения, а не оговорка для приличия.</p></div>
        <div class="spread-meta">${F.length} находки<br>0 новых источников<br>${F.filter(f => f.priority === 1).length} требуют ответа</div>
      </div>
      <div class="finds">${finds}</div>
    </section>`;
  }

  /* ---------------------------------------------------------------- разворот 3 */
  function spreadPanel() {
    const groups = [];
    T.forEach(t => {
      const g = groups.find(x => x.name === t.group);
      if (g) g.rows.push(t); else groups.push({ name: t.group, rows: [t] });
    });
    const body = groups.map(g => {
      const head = `<tr class="grp"><td colspan="7"><span>${esc(g.name)}</span></td></tr>`;
      const rows = g.rows.map(t => {
        const hot = t.status === 'red', good = t.status === 'ok';
        const target = t.delta_plan != null ? `к плану ${delta(t.delta_plan, t.fmt, t.decimals)}`
          : (t.target != null ? `цель ${t.fmt === 'int' ? int(t.target) : num(t.target, 0) + '%'}` : '—');
        return `<tr>
          <td><div class="p-name">${esc(t.title)}<span class="st">${esc(t.status_text)}</span></div></td>
          <td><span class="p-val ${hot ? 'hot' : (good ? 'good' : '')}">${val(t)}</span></td>
          <td><span class="p-d ${dcls(t.delta_mom, t.good)}">${delta(t.delta_mom, t.fmt, t.decimals)}</span></td>
          <td><span class="p-d ${dcls(t.delta_yoy, t.good)}">${delta(t.delta_yoy, t.fmt, t.decimals)}</span></td>
          <td><span class="p-d flat">${esc(target)}</span></td>
          <td>${DEV.micro([...t.series.y2025, ...t.series.y2026])}</td>
          <td><span class="p-flag ${t.status}"></span> <span class="p-own">${esc(t.owner || '—')}</span></td>
        </tr>`;
      }).join('');
      return head + rows;
    }).join('');
    const quiet = D.stability.map(x => `<div class="quiet-row"><span>${esc(x.name)}</span><b>${esc(x.value)}</b>${DEV.micro(x.spark, { width: 54, height: 16 })}</div>`).join('');
    const links = [].concat(D.headcount.links, D.hiring.links, D.flow.links, D.professions.links, D.management.links, D.productivity.links, D.crossdata.links)
      .map(l => `<a href="${esc(l.href)}">${esc(l.label)}</a>`).join('');
    return `<section class="spread" id="s3">
      <div class="spread-head">
        <div><div class="spread-no">РАЗВОРОТ 03</div>
          <h2 class="spread-title">Всё остальное на одной странице</h2>
          <p class="spread-sub">Пятнадцать метрик здоровья организации: значение, изменение к прошлому месяцу и к прошлому году, отношение к плану, двадцать месяцев динамики и тот, кто за метрику отвечает. Ниже — то, что не менялось: это тоже результат.</p></div>
        <div class="spread-meta">${T.length} метрик<br>20 месяцев истории<br>детали — по ссылкам</div>
      </div>
      <div class="panel-tbl-wrap"><table class="panel-tbl">
        <thead><tr><th>Метрика</th><th>Август</th><th>м/м</th><th>г/г</th><th>план или цель</th><th>дин. 25–26</th><th>отвечает</th></tr></thead>
        <tbody>${body}</tbody>
      </table></div>
      <div class="quiet">
        <h3>Тихо: здесь ничего не произошло</h3>
        <div class="quiet-grid">${quiet}</div>
      </div>
      <div class="deeper"><span class="l">Хотите деталей — вот отчёты</span>${links}</div>
    </section>`;
  }

  /* ---------------------------------------------------------------- сборка */
  document.getElementById('app').innerHTML =
    masthead + spreadBurning() + spreadFindings() + spreadPanel() +
    `<footer class="colophon">
      <div>${esc(M.disclaimer)}<br>Подготовлено: ${esc(M.prepared_by)} · выпуск ${esc(M.issue_no)} от ${esc(M.issued)}</div>
      <div>Черновик комментариев пишет ИИ,<br>формулировки вычитывает аналитик.</div>
    </footer>`;
  DEV.initTips();
})();
