/* m_coohub.js — макет на модели витрины COO Hub.
   Статусы, призывы к действию и определения берутся из полей витрины, а не придумываются здесь.
   Главное действие — разложить метрику по юнитам каталога продуктов и провалиться внутрь. */
(() => {
  (() => { if (!document.querySelector('meta[name="viewport"]')) { const m = document.createElement('meta'); m.name = 'viewport'; m.content = 'width=device-width, initial-scale=1, viewport-fit=cover'; document.head.appendChild(m); } })();
  const D = window.DATA, META = D.meta, U = D.units, MS = D.metrics, F = D.facts, BLOCKS = D.blocks;
  const { int, num, esc, spark, dual, zones, meter } = MB;

  const byRk = Object.fromEntries(U.map(u => [u.functional_unit_rk, u]));
  const kids = rk => U.filter(u => u.parent_functional_unit_rk === rk);
  const path = rk => { const p = []; let u = byRk[rk]; while (u) { p.unshift(u); u = byRk[u.parent_functional_unit_rk]; } return p; };
  const leaves = rk => byRk[rk].leaf ? [byRk[rk]] : kids(rk).flatMap(k => leaves(k.functional_unit_rk));
  const M = eng => MS.find(m => m.eng === eng);

  /* ---------------------------------------------------------------- форматы витрины */
  const fmtVal = (v, vt) => vt === 'perc' ? num(v, 2) + '%' : vt === 'real' ? num(v, 1) : int(v);
  function fmtDelta(v, vt) {
    if (v == null) return '—';
    const s = v > 0 ? '+' : v < 0 ? '−' : '±', a = Math.abs(v);
    if (vt === 'perc') return s + num(a, a < 10 ? 2 : 1) + ' п.п.';
    if (vt === 'real') return s + num(a, 1);
    return s + int(a);
  }
  /* хорошо/плохо берём из change_type витрины, а не из знака */
  const dcls = (v, change) => !v ? 'flat' : (change === 'up' ? (v > 0 ? 'good' : 'bad') : (v < 0 ? 'good' : 'bad'));
  const momPct = f => { const p = f.cur[f.cur.length - 2]; return p ? 100 * (f.value_final - p) / Math.abs(p) : 0; };

  /* ---------------------------------------------------------------- статус по порогам витрины */
  function statusOf(m, rk) {
    if (m.red == null) return 'none';
    // порог счётчика не сравним с суммой по 15 юнитам — красим только там, где он определён
    if (m.threshold_scope === 'unit_level' && !byRk[rk].leaf) return 'none';
    const f = F[rk][m.eng];
    const v = m.ttype === 'mom' ? momPct(f) : f.value_final;
    return m.tdir === 'up' ? (v < m.red ? 'red' : v < m.yellow ? 'amber' : 'ok')
      : (v > m.red ? 'red' : v > m.yellow ? 'amber' : 'ok');
  }
  /* сколько листьев под юнитом за порогом — так статус переносится на агрегат честно */
  function breach(m, rk) {
    const L = leaves(rk), out = { red: 0, amber: 0, total: L.length, worst: [] };
    L.forEach(u => {
      const st = m.red == null ? 'none' : (() => {
        const f = F[u.functional_unit_rk][m.eng];
        const v = m.ttype === 'mom' ? momPct(f) : f.value_final;
        return m.tdir === 'up' ? (v < m.red ? 'red' : v < m.yellow ? 'amber' : 'ok')
          : (v > m.red ? 'red' : v > m.yellow ? 'amber' : 'ok');
      })();
      if (st === 'red') { out.red++; out.worst.push(u); } else if (st === 'amber') out.amber++;
    });
    return out;
  }
  /* сколько не хватает до жёлтого порога в штуках знаменателя — это и есть задача */
  function gapText(m, rk) {
    if (m.red == null || m.type !== 2 || !m.gap_tpl) return '';
    const f = F[rk][m.eng], v = f.value_final;
    const off = m.tdir === 'up' ? m.yellow - v : v - m.yellow;
    if (off <= 0) return '';
    const need = Math.ceil(f.value_denominator * off / 100);
    return m.gap_tpl.replace('{n}', int(need));
  }

  const ICONS = {
    now: '<path d="M12 3.5 21.5 20h-19z"/><path d="M12 10v4"/><path d="M12 17h.01"/>',
    metrics: '<circle cx="4" cy="6" r="1.3"/><circle cx="4" cy="12" r="1.3"/><circle cx="4" cy="18" r="1.3"/><path d="M8.5 6H21"/><path d="M8.5 12H21"/><path d="M8.5 18H21"/>',
    split: '<rect x="3" y="3" width="6.5" height="6.5" rx="1.6"/><rect x="14.5" y="14.5" width="6.5" height="6.5" rx="1.6"/><rect x="3" y="14.5" width="6.5" height="6.5" rx="1.6"/><path d="M9.5 6.2h5a2 2 0 0 1 2 2v6.3"/>',
  };
  const svg = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const state = { unit: 'u0', tab: 'now', metric: 'okr_progress', spark: false };

  /* ---------------------------------------------------------------- строки */
  function mrow(m, rk, withSpark) {
    const f = F[rk][m.eng], st = statusOf(m, rk), b = breach(m, rk);
    const sub = m.type === 2 && f.value_denominator
      ? `${int(f.value_numerator)} из ${int(f.value_denominator)} · ${esc(m.unit_den || '')}`
      : (st === 'none' && m.red != null ? `порог на уровне юнита · за порогом ${b.red} из ${b.total}` : esc(m.unit_num || ''));
    return `<button class="mrow" data-sheet="metric" data-key="${m.eng}">
      <span class="st ${st}"></span>
      <span class="nm">${esc(m.name)}<small>${sub}</small>${withSpark ? `<span style="display:block;margin-top:6px">${spark(f.cur, { width: 150, height: 22, tone: st === 'ok' ? 'green' : st })}</span>` : ''}</span>
      <span class="r"><span class="dd">
        <span class="v ${st === 'ok' ? 'green' : st}">${fmtVal(f.value_final, m.vt)}</span>
        <span class="d">мес <b class="${dcls(f.mom_value_final, m.change)}">${fmtDelta(f.mom_value_final, m.vt)}</b></span>
        <span class="d">${f.yoy_known ? `год <b class="${dcls(f.yoy_value_final, m.change)}">${fmtDelta(f.yoy_value_final, m.vt)}</b>` : 'нет базы 2025'}</span>
      </span><span class="ch">›</span></span>
    </button>`;
  }

  function actCard(m, rk) {
    const f = F[rk][m.eng], st = statusOf(m, rk);
    const z = (m.threshold_scope === 'any_level' || byRk[rk].leaf) && m.red != null && m.ttype === 'value';
    const lo = Math.min(m.red, m.yellow, f.value_final), hi = Math.max(m.red, m.yellow, f.value_final);
    const pad = (hi - lo) * 0.25 + (m.vt === 'perc' ? 4 : 1);
    return `<section class="card act ${st === 'amber' ? 'amber' : ''}">
      <div class="top"><div class="nm">${esc(m.name)}</div><div class="v">${fmtVal(f.value_final, m.vt)}</div></div>
      <div class="lbl" style="margin-top:8px">${esc(BLOCKS[m.block])}</div>
      <div class="gapline">${gapText(m, rk) ? 'Чтобы выйти из красного: ' + esc(gapText(m, rk)) : `жёлтый порог ${m.yellow}${m.vt === 'perc' ? '%' : ''}, красный ${m.red}${m.vt === 'perc' ? '%' : ''}`}</div>
      ${z ? `<div class="viz" style="margin-top:10px">${zones({
        min: lo - pad, max: hi + pad, red: m.red, yellow: m.yellow, value: f.value_final, dir: m.tdir,
        label: fmtVal(f.value_final, m.vt), redLabel: 'красный ' + m.red, yellowLabel: 'жёлтый ' + m.yellow,
        aria: 'Значение относительно порогов' })}</div>` : ''}
      ${m.cta ? `<div class="cta"><b>call_to_action из витрины</b>${esc(m.cta)}</div>` : ''}
      <div class="btn-row">
        <button class="btn" data-split="${m.eng}">Разложить по продуктам</button>
        <button class="btn" data-sheet="metric" data-key="${m.eng}" style="background:none;border:1px solid var(--rule);color:var(--ink-2)">Детали</button>
      </div>
    </section>`;
  }

  /* ---------------------------------------------------------------- вкладка «Сейчас» */
  function paneNow() {
    const rk = state.unit, u = byRk[rk];
    const sts = MS.map(m => [m, statusOf(m, rk)]);
    const red = sts.filter(([, s]) => s === 'red'), amber = sts.filter(([, s]) => s === 'amber');
    const ok = sts.filter(([, s]) => s === 'ok');
    // метрики без цвета на агрегате, но с пробитым порогом внутри
    const inner = MS.filter(m => statusOf(m, rk) === 'none' && m.red != null)
      .map(m => [m, breach(m, rk)]).filter(([, b]) => b.red > 0)
      .sort((a, b) => b[1].red - a[1].red);
    const newG = MS.filter(m => m.new_in_2026);

    return `
      <section class="card hero">
        <div class="lbl">Юнит каталога продуктов · ур. ${u.lvl_unit}</div>
        <div class="nm">${esc(u.functional_unit_nm)}</div>
        <div class="sub">${int(u.headcount)} человек · ${leaves(rk).length} юнитов внутри · данные на ${esc(META.actual_data_dt.split('-').reverse().join('.'))}</div>
        <div class="cnt">
          <div class="red"><b>${red.length}</b><span>ниже красного</span></div>
          <div class="amber"><b>${amber.length}</b><span>ниже жёлтого</span></div>
          <div class="green"><b>${ok.length}</b><span>в норме</span></div>
        </div>
      </section>

      ${red.length ? `<div class="sect"><h3>Требует действия</h3><span class="n">${red.length}</span></div>
        ${red.map(([m]) => actCard(m, rk)).join('')}` : ''}

      ${inner.length ? `<div class="sect"><h3>Порог задан на уровне юнита</h3><span class="sp"></span></div>
        <section class="card"><p class="tx" style="margin-top:0">У счётчиков порог нельзя сравнивать с суммой по ${leaves(rk).length} юнитам: сумма всегда больше. Поэтому здесь считаем, сколько юнитов внутри за красным порогом.</p>
        <div class="mrows" style="margin-top:12px">${inner.map(([m, b]) => `<button class="mrow" data-split="${m.eng}">
          <span class="st red"></span>
          <span class="nm">${esc(m.name)}<small>${esc(b.worst.slice(0, 3).map(x => x.functional_unit_nm).join(' · '))}${b.red > 3 ? ' и ещё ' + (b.red - 3) : ''}</small></span>
          <span class="r"><span class="dd"><span class="v red">${b.red} из ${b.total}</span><span class="d">юнитов за порогом</span></span><span class="ch">›</span></span>
        </button>`).join('')}</div></section>` : ''}

      ${amber.length ? `<div class="sect"><h3>Наблюдать</h3><span class="n">${amber.length}</span></div>
        <section class="card"><div class="mrows">${amber.map(([m]) => mrow(m, rk)).join('')}</div></section>` : ''}

      ${newG.length ? `<section class="card">
        <div class="lbl">Что не так с годом к году</div>
        <h2 class="h2">${newG.length} метрики целей появились в 2026 — YoY по ним равен самому значению</h2>
        <p class="tx">В витрине за прошлый год по ним пусто, поэтому yoy_value_final = value_final. Это не рост, а факт появления метрики. В макете такие клетки подписаны «нет базы 2025», а не раскрашены зелёным.</p>
        <div class="mrows" style="margin-top:10px">${newG.map(m => `<div class="mrow" style="cursor:default">
          <span class="st ${statusOf(m, rk)}"></span><span class="nm">${esc(m.name)}</span>
          <span class="r"><span class="dd"><span class="v">${fmtVal(F[rk][m.eng].value_final, m.vt)}</span><span class="d">нет базы 2025</span></span></span></div>`).join('')}</div>
      </section>` : ''}

      ${ok.length ? `<div class="sect"><h3>В норме</h3><span class="n">${ok.length}</span></div>
        <section class="card"><div class="mrows">${ok.map(([m]) => mrow(m, rk)).join('')}</div></section>` : ''}`;
  }

  /* ---------------------------------------------------------------- вкладка «Метрики» */
  function paneMetrics() {
    const rk = state.unit;
    return `<section class="card" style="padding:12px 14px">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="lbl" style="flex:1">Все метрики витрины · ${MS.length}</div>
          <button class="btn" id="sparkToggle" style="padding:7px 12px;font-size:12.5px">${state.spark ? 'Скрыть 12 мес' : 'Показать 12 мес'}</button>
        </div>
      </section>
      ${Object.keys(BLOCKS).map(b => {
      const list = MS.filter(m => m.block === b);
      const nred = list.filter(m => statusOf(m, rk) === 'red').length;
      return `<div class="sect"><h3>${esc(BLOCKS[b])}</h3><span class="n">${list.length}</span><span class="sp"></span>
          ${nred ? `<span class="n" style="color:var(--red)">${nred} ниже красного</span>` : ''}</div>
        <section class="card"><div class="mrows">${list.map(m => mrow(m, rk, state.spark)).join('')}</div></section>`;
    }).join('')}
      <p class="foot">source_metrics_block_ru · сортировка по sort_number витрины</p>`;
  }

  /* ---------------------------------------------------------------- вкладка «Разложить» */
  function paneSplit() {
    const rk = state.unit, m = M(state.metric), ch = kids(rk);
    const f = F[rk][m.eng];
    const rows = ch.map(u => {
      const uf = F[u.functional_unit_rk][m.eng], st = statusOf(m, u.functional_unit_rk);
      const b = breach(m, u.functional_unit_rk);
      return { u, f: uf, st, b };
    });
    const worstFirst = (a, b2) => m.tdir === 'up' ? a.f.value_final - b2.f.value_final : b2.f.value_final - a.f.value_final;
    rows.sort(m.type === 2 ? worstFirst : (a, b2) => b2.f.value_final - a.f.value_final);
    const max = Math.max(...rows.map(r => Math.abs(r.f.value_final)), 1);
    const sum = rows.reduce((s, r) => s + r.f.value_final, 0);

    const cuts = f.cuts;
    return `
      <section class="card" style="padding:12px 14px 14px">
        <div class="lbl">Выберите метрику</div>
        <div class="chips" style="margin-top:9px">${MS.map(x => {
      const s = statusOf(x, rk);
      return `<button data-metric="${x.eng}" class="${x.eng === m.eng ? 'on' : ''}">${s === 'red' || s === 'amber' ? `<span class="dot ${s}"></span>` : ''}${esc(x.name)}</button>`;
    }).join('')}</div>
      </section>

      <section class="card">
        <div class="lbl">${esc(BLOCKS[m.block])}</div>
        <div style="display:flex;align-items:baseline;gap:10px;margin-top:7px">
          <div class="h2" style="margin:0;flex:1">${esc(m.name)}</div>
          <div class="v" style="font-family:var(--display);font-weight:900;font-size:24px;letter-spacing:-.03em">${fmtVal(f.value_final, m.vt)}</div>
        </div>
        <p class="tx">${m.type === 2
        ? `Доля считается по сумме числителей и знаменателей детей: ${int(f.value_numerator)} из ${int(f.value_denominator)}. Поэтому маленький юнит со 100% не перевешивает большой.`
        : `Значение агрегата — сумма по детям: ${fmtVal(sum, m.vt)}.`}</p>
        <button class="btn wide" data-sheet="metric" data-key="${m.eng}" style="margin-top:12px">Определение, пороги и динамика</button>
      </section>

      <div class="sect"><h3>${ch.length ? 'По юнитам внутри' : 'Это лист каталога'}</h3><span class="n">${ch.length || ''}</span></div>
      ${ch.length ? `<section class="card">${rows.map(r => `
        <button class="urow" data-unit="${r.u.functional_unit_rk}">
          <span class="st ${r.st}" style="width:9px;height:9px;border-radius:${r.st === 'amber' ? '2px' : '50%'};background:${r.st === 'red' ? 'var(--red)' : r.st === 'amber' ? 'var(--amber)' : r.st === 'ok' ? 'var(--green)' : 'var(--line)'}"></span>
          <span class="nm">${esc(r.u.functional_unit_nm)}<small>${m.type === 2
      ? `${int(r.f.value_numerator)} из ${int(r.f.value_denominator)}`
      : `${int(r.u.headcount)} человек`}${r.st === 'none' && m.red != null ? ` · за порогом ${r.b.red} из ${r.b.total}` : ''}</small></span>
          <span><span class="v ${r.st === 'ok' ? 'green' : r.st}">${fmtVal(r.f.value_final, m.vt)}</span>
            <span class="gap">${gapText(m, r.u.functional_unit_rk) || (m.type === 1 ? num(100 * r.f.value_final / (sum || 1), 0) + '% суммы' : '')}</span></span>
          <span class="bar"><i class="${r.st}" style="width:${Math.max(2, 100 * Math.abs(r.f.value_final) / max).toFixed(1)}%"></i></span>
        </button>`).join('')}</section>
        <p class="foot">Касание по юниту — провалиться внутрь. Поля: functional_unit_rk, parent_functional_unit_rk, lvl_unit</p>`
        : `<section class="card"><p class="tx" style="margin-top:0">Ниже этого уровня каталог не раскладывается. Дальше — разрезы по сотрудникам.</p></section>`}

      ${cuts ? Object.keys(cuts).map(k => {
      const c = cuts[k], den = c.parts.reduce((s, p) => s + p.num, 0) || 1;
      return `<div class="sect"><h3>${esc(c.label)}</h3><span class="n">${k === 'oper' ? 'emp_specialization_oper_code' : k === 'it' ? 'emp_specialization_it_code' : 'seniority_group'}</span></div>
        <section class="card"><div class="mb-rows">${c.parts.map(p => `<div class="mb-row">
          <span class="n">${esc(p.name)}</span>
          <span class="t"><i style="width:${Math.max(2, 100 * p.num / den).toFixed(1)}%"></i></span>
          <span class="v">${m.type === 2 && p.den ? num(100 * p.num / p.den, 1) + '%' : fmtVal(p.num, m.vt)}</span>
        </div>`).join('')}</div></section>`;
    }).join('') : ''}`;
  }

  /* ---------------------------------------------------------------- шторки */
  const scrim = () => document.getElementById('scrim');
  const sheetEl = () => document.getElementById('sheet');
  function openSheet(html) {
    sheetEl().querySelector('.body').innerHTML = html + '<button class="close" id="closeSheet">Закрыть</button>';
    sheetEl().classList.add('on'); scrim().classList.add('on');
    document.body.style.overflow = 'hidden';
    sheetEl().querySelector('.body').scrollTop = 0;
    document.getElementById('closeSheet').addEventListener('click', closeSheet);
  }
  function closeSheet() { sheetEl().classList.remove('on'); scrim().classList.remove('on'); document.body.style.overflow = ''; }

  function metricSheet(eng) {
    const m = M(eng), rk = state.unit, f = F[rk][eng], st = statusOf(m, rk), b = breach(m, rk);
    const showZones = m.red != null && m.ttype === 'value' && (m.threshold_scope === 'any_level' || byRk[rk].leaf);
    const lo = Math.min(m.red, m.yellow, f.value_final), hi = Math.max(m.red, m.yellow, f.value_final);
    const pad = (hi - lo) * 0.25 + (m.vt === 'perc' ? 4 : 1);
    const mp = momPct(f);
    const months = META.months;
    return `
      <div class="kick">${esc(BLOCKS[m.block])} · ${esc(byRk[rk].functional_unit_nm)}</div>
      <h3>${esc(m.name)}</h3>
      <div class="big ${st === 'ok' ? 'green' : st}">${fmtVal(f.value_final, m.vt)}</div>
      <div class="frac">${m.type === 2 ? `${int(f.value_numerator)} из ${int(f.value_denominator)} ${esc(m.unit_den || '')}` : esc(m.unit_num || '')} · ${esc(META.period_label.toLowerCase())}</div>
      ${showZones ? `<div class="viz" style="margin-top:14px">${zones({
      min: lo - pad, max: hi + pad, red: m.red, yellow: m.yellow, value: f.value_final, dir: m.tdir,
      label: fmtVal(f.value_final, m.vt), redLabel: 'красный ' + m.red, yellowLabel: 'жёлтый ' + m.yellow, aria: 'Пороги' })}</div>`
      : m.red != null ? `<div class="warnbox">Порог ${m.yellow} / ${m.red} задан на уровне юнита каталога. Для агрегата он не сравним: сумма по ${b.total} юнитам всегда больше. Внутри за красным порогом — ${b.red} юнитов.</div>` : ''}
      <div class="meta">
        <div><div class="l">Месяц к месяцу</div><div class="v ${dcls(f.mom_value_final, m.change)}">${fmtDelta(f.mom_value_final, m.vt)}${m.ttype === 'mom' ? ` · ${num(mp, 1)}%` : ''}</div></div>
        <div><div class="l">Год к году</div><div class="v ${f.yoy_known ? dcls(f.yoy_value_final, m.change) : 'flat'}">${f.yoy_known ? fmtDelta(f.yoy_value_final, m.vt) : 'нет базы 2025'}</div></div>
        <div><div class="l">Пороги ж / к</div><div class="v">${m.red == null ? 'не заданы' : `${m.yellow} / ${m.red}`}</div></div>
        <div><div class="l">Хорошо, когда</div><div class="v">${m.change === 'up' ? 'растёт' : 'падает'}</div></div>
      </div>
      ${f.yoy_known
        ? `<div class="blk"><div class="l">Динамика по месяцам — 2026 против 2025</div><div class="viz">${dual({
          a: f.cur, b: f.prev.slice(0, f.cur.length), labels: months.slice(0, f.cur.length),
          aLabel: '2026 · ' + fmtVal(f.value_final, m.vt), bLabel: '2025', height: 108 })}</div></div>`
        : `<div class="blk"><div class="l">Динамика 2026 — прошлого года нет</div><div class="viz">${spark(f.cur, { width: 320, height: 76, tone: st === 'ok' ? 'green' : st })}</div>
           <div class="axline">${esc(months.slice(0, f.cur.length).join(' · '))}</div></div>`}
      ${st !== 'ok' && st !== 'none' && m.cta ? `<div class="blk"><div class="l">Призыв к действию · call_to_action</div><div class="v" style="color:var(--ink)">${esc(m.cta)}</div></div>` : ''}
      <div class="blk"><div class="l">Определение · metric_desc</div><div class="v">${esc(m.desc)}</div></div>
      ${kids(rk).length ? `<button class="btn wide" data-split="${m.eng}" style="margin-top:14px">Разложить по ${kids(rk).length} юнитам</button>` : ''}
      <details class="fields"><summary>Поля витрины, из которых собрана эта карточка</summary>
        <table>
          <tr><td>value_final</td><td>${fmtVal(f.value_final, m.vt)} ${m.type === 2 ? '= value_numerator / value_denominator' : '= value_done'}</td></tr>
          <tr><td>mom_value_final</td><td>${fmtDelta(f.mom_value_final, m.vt)}</td></tr>
          <tr><td>yoy_value_final</td><td>${f.yoy_known ? fmtDelta(f.yoy_value_final, m.vt) : 'нет данных за 2025'}</td></tr>
          <tr><td>metric_type</td><td>${m.type} — ${m.type === 2 ? 'относительная' : 'абсолютная'}</td></tr>
          <tr><td>value_type</td><td>${esc(m.vt)}</td></tr>
          <tr><td>change_type</td><td>${esc(m.change)} — ${m.change === 'up' ? 'повышение позитивно' : 'понижение позитивно'}</td></tr>
          <tr><td>threshold_red / yellow</td><td>${m.red == null ? 'null' : m.red + ' / ' + m.yellow}</td></tr>
          <tr><td>threshold_direction</td><td>${esc(m.tdir)}</td></tr>
          <tr><td>threshold_type</td><td>${esc(m.ttype)}${m.ttype === 'mom' ? ' — сравнение с прошлым месяцем в %' : ''}</td></tr>
          <tr><td>source_metrics_block</td><td>${esc(m.block)} · ${esc(BLOCKS[m.block])}</td></tr>
          <tr><td>functional_unit_rk</td><td>${esc(rk)} · lvl_unit ${byRk[rk].lvl_unit}</td></tr>
          <tr><td>business_month</td><td>${esc(META.business_month)} · aggr_type ${esc(META.aggr_type)}</td></tr>
        </table></details>`;
  }

  function unitSheet() {
    const row = u => {
      const rk = u.functional_unit_rk;
      const red = MS.filter(m => statusOf(m, rk) === 'red').length;
      const inner = MS.filter(m => statusOf(m, rk) === 'none' && m.red != null).reduce((s, m) => s + (breach(m, rk).red > 0 ? 1 : 0), 0);
      return `<button class="l${u.lvl_unit} ${rk === state.unit ? 'on' : ''}" data-unit="${rk}">
        <span class="nm">${esc(u.functional_unit_nm)}<small>${int(u.headcount)} человек · ур. ${u.lvl_unit}</small></span>
        <span class="pills">${red ? `<span class="pill red">${red} крас.</span>` : ''}${inner ? `<span class="pill amber">${inner} внутри</span>` : ''}${!red && !inner ? '<span class="pill">норма</span>' : ''}</span>
      </button>`;
    };
    const order = [];
    const walk = rk => { const u = byRk[rk]; order.push(u); kids(rk).forEach(k => walk(k.functional_unit_rk)); };
    walk('u0');
    return `<div class="kick">Каталог продуктов · ${U.length} юнитов</div><h3>Выберите юнит</h3>
      <p class="frac">Метрики пересчитываются по выбранному юниту и всем, кто внутри него.</p>
      <div class="tree">${order.map(row).join('')}</div>`;
  }

  /* ---------------------------------------------------------------- каркас */
  const TABS = [
    { id: 'now', name: 'Сейчас', icon: ICONS.now, pane: paneNow },
    { id: 'metrics', name: 'Метрики', icon: ICONS.metrics, pane: paneMetrics },
    { id: 'split', name: 'Разложить', icon: ICONS.split, pane: paneSplit },
  ];

  document.getElementById('app').innerHTML = `
    <div class="wrap">
      <header class="hdr"><div class="in">
        <div class="r1"><span class="ttl">COO Hub</span><span class="per">${esc(META.period_label)}</span><span class="sp"></span>
          <button class="ico" id="theme" aria-label="Сменить тему">${svg('<path d="M19 13.6A7.6 7.6 0 1 1 10.4 5a6 6 0 0 0 8.6 8.6z"/>')}</button></div>
        <div class="crumbs" id="crumbs"></div>
      </div></header>
      <main>${TABS.map(t => `<div class="pane" id="p-${t.id}"></div>`).join('')}
        <p class="foot" id="foot"></p>
      </main>
    </div>
    <nav class="tabs">${TABS.map(t => `<button data-tab="${t.id}" class="${t.id === 'now' ? 'on' : ''}">
      <span class="ic">${svg(t.icon)}<span class="fl" id="fl-${t.id}" hidden></span></span><span>${esc(t.name)}</span></button>`).join('')}</nav>
    <div class="scrim" id="scrim"></div>
    <aside class="sheet" id="sheet" role="dialog" aria-modal="true"><div class="grab"></div><div class="body"></div></aside>`;

  function renderCrumbs() {
    const p = path(state.unit);
    document.getElementById('crumbs').innerHTML =
      p.map((u, i) => `${i ? '<i>›</i>' : ''}<button data-unit="${u.functional_unit_rk}">${esc(u.functional_unit_nm)}</button>`).join('')
      + `<button class="down" id="pickUnit">сменить юнит</button>`;
  }

  function render() {
    renderCrumbs();
    TABS.forEach(t => {
      const el = document.getElementById('p-' + t.id);
      el.classList.toggle('on', t.id === state.tab);
      if (t.id === state.tab) el.innerHTML = t.pane();
      else el.innerHTML = '';
    });
    const nred = MS.filter(m => statusOf(m, state.unit) === 'red').length;
    const fl = document.getElementById('fl-now');
    fl.hidden = !nred; fl.textContent = nred;
    document.getElementById('foot').textContent =
      `${META.source} · ${META.disclaimer}`;
    document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === state.tab));
    const on = document.querySelector('#p-split .chips button.on');
    if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
    if (state.tab === 'metrics') {
      const t = document.getElementById('sparkToggle');
      if (t) t.addEventListener('click', () => { state.spark = !state.spark; render(); });
    }
  }

  /* ---------------------------------------------------------------- события */
  document.querySelector('.tabs').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.tab === state.tab) { scrollTo({ top: 0, behavior: 'smooth' }); return; }
    state.tab = b.dataset.tab; render(); scrollTo(0, 0);
  });

  document.addEventListener('click', e => {
    const unit = e.target.closest('[data-unit]');
    if (unit) { state.unit = unit.dataset.unit; closeSheet(); render(); scrollTo(0, 0); return; }
    const split = e.target.closest('[data-split]');
    if (split) { state.metric = split.dataset.split; state.tab = 'split'; closeSheet(); render(); scrollTo(0, 0); return; }
    const met = e.target.closest('[data-metric]');
    if (met) { state.metric = met.dataset.metric; render(); return; }
    const sh = e.target.closest('[data-sheet]');
    if (sh) { openSheet(metricSheet(sh.dataset.key)); return; }
    if (e.target.closest('#pickUnit')) openSheet(unitSheet());
  });

  scrim().addEventListener('click', closeSheet);
  addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
  let sy = 0, drag = false;
  sheetEl().addEventListener('touchstart', e => { if (e.target.closest('.body') && sheetEl().querySelector('.body').scrollTop > 0) return; sy = e.touches[0].clientY; drag = true; }, { passive: true });
  sheetEl().addEventListener('touchend', e => { if (drag && e.changedTouches[0].clientY - sy > 70) closeSheet(); drag = false; }, { passive: true });

  const order = ['', 'light', 'dark']; let ti = 0;
  document.getElementById('theme').addEventListener('click', () => {
    ti = (ti + 1) % order.length;
    if (order[ti]) document.documentElement.setAttribute('data-theme', order[ti]);
    else document.documentElement.removeAttribute('data-theme');
  });

  render();
})();
