#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Проверка данных страницы «COO Hub · Радар» по формату из DATA_FORMAT.md.

    python3 tools/validate_data.py data.json

Код выхода 0 — данные можно встраивать; 1 — есть ошибки: страница покажет неправду или не откроется.
Предупреждения сборку не останавливают, но их стоит прочитать.
Только стандартная библиотека Python 3.8+.
"""
import json
import math
import re
import sys
from collections import Counter
from pathlib import Path

SAFE_RK = re.compile(r"^[A-Za-z0-9_.:-]+$")
SAFE_ENG = re.compile(r"^[a-z0-9_]+$")
ISO_MONTH = re.compile(r"^\d{4}-(0[1-9]|1[0-2])-01$")
ISO_DAY = re.compile(r"^\d{4}-\d{2}-\d{2}$")
ENUMS = {"type": (1, 2), "vt": ("perc", "int", "real"), "change": ("up", "down"), "tdir": ("up", "down"),
         "ttype": ("value", "mom"), "threshold_scope": ("any_level", "unit_level")}


def is_num(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x)


def near(a, b, rel=1e-3, ab=0.011):
    return abs(a - b) <= max(ab, rel * max(abs(a), abs(b)))


def validate(doc):
    """Вернуть (ошибки, предупреждения) — списки строк с путём к полю и тем, как исправить."""
    E, W = [], []
    if not isinstance(doc, dict):
        return ["Корень — не объект JSON. Нужен объект с ключами meta, blocks, units, metrics, facts."], W
    for k in ("meta", "blocks", "units", "metrics", "facts"):
        if k not in doc:
            E.append(f"Нет ключа {k} в корне.")
    if E:
        return E, W
    meta, blocks, units, metrics, facts = doc["meta"], doc["blocks"], doc["units"], doc["metrics"], doc["facts"]

    # ---- meta
    if not isinstance(meta, dict):
        E.append("meta — не объект.")
        meta = {}
    for k in ("period_label", "business_month", "actual_data_dt", "source", "disclaimer"):
        if not isinstance(meta.get(k), str) or not meta.get(k):
            E.append(f"meta.{k}: нужна непустая строка.")
    if isinstance(meta.get("business_month"), str) and not ISO_MONTH.match(meta["business_month"]):
        E.append(f"meta.business_month = {meta['business_month']!r}: нужен первый день месяца, «ГГГГ-ММ-01».")
    if isinstance(meta.get("actual_data_dt"), str) and not ISO_DAY.match(meta["actual_data_dt"]):
        E.append(f"meta.actual_data_dt = {meta['actual_data_dt']!r}: нужна дата «ГГГГ-ММ-ДД».")
    months = meta.get("months")
    if not (isinstance(months, list) and len(months) == 12 and all(isinstance(x, str) for x in months)):
        E.append("meta.months: нужен массив из 12 коротких названий месяцев: [\"янв\", \"фев\", …, \"дек\"].")
    n_fact = meta.get("n_fact")
    bm = meta.get("business_month") if isinstance(meta.get("business_month"), str) else ""
    if ISO_MONTH.match(bm):
        want_n = int(bm[5:7])
        if n_fact is None:
            W.append(f"meta.n_fact не задан — считаю по business_month: {want_n}.")
            n_fact = want_n
        elif n_fact != want_n:
            E.append(f"meta.n_fact = {n_fact}, а business_month = {bm}: должно быть {want_n} — номер отчётного месяца.")
        if meta.get("year") is not None and meta.get("year") != int(bm[:4]):
            E.append(f"meta.year = {meta.get('year')}, а business_month = {bm}.")
    if not isinstance(n_fact, int) or not 1 <= n_fact <= 12:
        E.append("meta.n_fact: номер отчётного месяца, 1…12.")
        n_fact = None

    # ---- блоки
    if not isinstance(blocks, dict) or not blocks:
        E.append("blocks: нужен объект {ключ блока: название}, например {\"goals\": \"Цели и достижения\"}.")
        blocks = {}
    order = doc.get("block_order")
    if order is not None and (not isinstance(order, list) or any(b not in blocks for b in order)):
        E.append("block_order: массив ключей из blocks.")
    bmeta = doc.get("block_meta") or {}
    for b, x in (bmeta.items() if isinstance(bmeta, dict) else []):
        if b not in blocks:
            W.append(f"block_meta.{b}: такого блока нет в blocks.")
        ph = x.get("phrase") if isinstance(x, dict) else None
        if ph is not None and not (isinstance(ph, dict) and all(isinstance(ph.get(s), str) for s in ("red", "amber", "ok"))):
            E.append(f"block_meta.{b}.phrase: нужны строки red, amber, ok.")

    # ---- юниты
    if not isinstance(units, list) or not units:
        E.append("units: нужен непустой массив юнитов.")
        units = []
    by = {}
    for i, u in enumerate(units):
        w = f"units[{i}]"
        if not isinstance(u, dict):
            E.append(f"{w}: не объект.")
            continue
        rk = u.get("functional_unit_rk")
        if not isinstance(rk, str) or not SAFE_RK.match(rk):
            E.append(f"{w}.functional_unit_rk = {rk!r}: нужна строка из латиницы, цифр и _.:- (число тоже превратите в строку).")
            continue
        if rk in by:
            E.append(f"{w}: functional_unit_rk {rk!r} повторяется.")
        by[rk] = u
        if not isinstance(u.get("functional_unit_nm"), str) or not u.get("functional_unit_nm"):
            E.append(f"{w} ({rk}): нужно functional_unit_nm — название юнита.")
        if "parent_functional_unit_rk" not in u:
            E.append(f"{w} ({rk}): нужно поле parent_functional_unit_rk (null у корня).")
        if not isinstance(u.get("leaf"), bool):
            E.append(f"{w} ({rk}): leaf — true или false.")
        hc = u.get("headcount")
        if hc is not None and not (is_num(hc) and hc >= 0):
            E.append(f"{w} ({rk}): headcount — число ≥ 0 или null.")
        for k in ("lvl_unit", "depth"):
            if u.get(k) is not None and not isinstance(u.get(k), int):
                E.append(f"{w} ({rk}): {k} — целое число.")
    kids = Counter()
    roots = []
    for rk, u in by.items():
        p = u.get("parent_functional_unit_rk")
        if p is None:
            roots.append(rk)
        elif p not in by:
            E.append(f"Юнит {rk}: родитель {p!r} не найден в units. Корень — с parent null, у остальных родитель должен быть в списке.")
        else:
            kids[p] += 1
    root = meta.get("root")
    if len(roots) != 1:
        E.append(f"Корней (parent null) {len(roots)}: {roots[:5]}. Нужен ровно один — если верхних юнитов несколько, "
                 "добавьте общий корень «Все юниты» и сделайте их его детьми (факты корня — сумма детей).")
    if root is not None and root not in by:
        E.append(f"meta.root = {root!r}: такого юнита нет.")
    elif root is not None and roots and root != roots[0]:
        E.append(f"meta.root = {root!r}, а юнит без родителя — {roots[0]!r}.")
    for rk in by:  # циклы
        seen, p = {rk}, by[rk].get("parent_functional_unit_rk")
        while p in by:
            if p in seen:
                E.append(f"Цикл в иерархии через юнит {rk}.")
                break
            seen.add(p)
            p = by[p].get("parent_functional_unit_rk")
    for rk, u in by.items():
        if isinstance(u.get("leaf"), bool) and u["leaf"] != (kids[rk] == 0):
            E.append(f"Юнит {rk}: leaf = {str(u['leaf']).lower()}, а детей у него {kids[rk]}. leaf = true только у юнитов без детей.")
    if by and all(u.get("headcount") is None for u in by.values()):
        W.append("Ни у одного юнита нет headcount: плитки на карте будут одной площади.")

    # ---- метрики
    if not isinstance(metrics, list) or not metrics:
        E.append("metrics: нужен непустой массив метрик.")
        metrics = []
    ms = {}
    for i, m in enumerate(metrics):
        w = f"metrics[{i}]"
        if not isinstance(m, dict):
            E.append(f"{w}: не объект.")
            continue
        e = m.get("eng")
        if not isinstance(e, str) or not SAFE_ENG.match(e):
            E.append(f"{w}.eng = {e!r}: ключ метрики из строчной латиницы, цифр и _ (например okr_linkage).")
            continue
        if e in ms:
            E.append(f"{w}: eng {e!r} повторяется.")
        ms[e] = m
        w = f"metrics[{i}] ({e})"
        if not isinstance(m.get("name"), str) or not m.get("name"):
            E.append(f"{w}: нужно name — название метрики, как в витрине.")
        if m.get("block") not in blocks:
            E.append(f"{w}: block = {m.get('block')!r} — нет такого ключа в blocks.")
        for k, allowed in ENUMS.items():
            if m.get(k) not in allowed:
                E.append(f"{w}: {k} = {m.get(k)!r}, можно только {' / '.join(map(str, allowed))}.")
        red, yel = m.get("red"), m.get("yellow")
        if (red is None) != (yel is None) or (red is not None and not (is_num(red) and is_num(yel))):
            E.append(f"{w}: red и yellow — оба числа или оба null. Если в витрине только один порог, повторите его во втором.")
        elif red is not None and red != yel and m.get("tdir") in ("up", "down"):
            want = "up" if red < yel else "down"
            if m["tdir"] != want:
                E.append(f"{w}: tdir = {m['tdir']!r}, а красный {red} {'<' if red < yel else '>'} жёлтого {yel} — значит, tdir = {want!r}. "
                         "tdir — куда хорошо: up — красная зона ниже порога, down — выше.")
        for k in ("desc", "cta", "unit_num", "unit_den", "gap_tpl"):
            if m.get(k) is not None and not isinstance(m.get(k), str):
                E.append(f"{w}: {k} — строка.")
        if m.get("gap_tpl") and "{n}" not in m["gap_tpl"]:
            W.append(f"{w}: в gap_tpl нет {{n}} — число разрыва не подставится.")
        if not m.get("desc"):
            W.append(f"{w}: пустое desc — в карточке будет «описание не заполнено».")
        if m.get("block") in blocks and order and m["block"] not in order:
            E.append(f"{w}: блока {m['block']!r} нет в block_order.")
    if len(ms) > 20:
        W.append(f"Метрик {len(ms)}: на кольце радара тесно, удобно до 20.")

    # ---- факты
    if not isinstance(facts, dict):
        E.append("facts: нужен объект {functional_unit_rk: {eng: факт или null}}.")
        facts = {}
    for rk in facts:
        if rk not in by:
            W.append(f"facts.{rk}: такого юнита нет в units — эти данные не видны.")
    stats = {e: {"vals": [], "mom_delta": 0, "mom_prior": 0, "yoy_delta": 0, "yoy_prior": 0, "numden_bad": 0, "numden_n": 0,
                 "as_frac": 0, "as_pct": 0} for e in ms}
    n_cells = n_null = 0
    for rk in by:
        fs = facts.get(rk)
        if fs is None:
            W.append(f"facts.{rk}: нет данных юнита — все его клетки будут «нет данных».")
            continue
        if not isinstance(fs, dict):
            E.append(f"facts.{rk}: не объект.")
            continue
        for e, m in ms.items():
            n_cells += 1
            if e not in fs:
                W.append(f"facts.{rk}.{e}: ключа нет — считаю «нет данных». Если данных нет, лучше явно null.")
                n_null += 1
                continue
            f = fs[e]
            w = f"facts.{rk}.{e}"
            if f is None:
                n_null += 1
                continue
            if not isinstance(f, dict):
                E.append(f"{w}: не объект и не null.")
                continue
            v = f.get("value_final")
            if not is_num(v):
                E.append(f"{w}.value_final = {v!r}: нужно число. Если за месяц данных нет — весь факт null, а не 0.")
                continue
            cur, prev = f.get("cur"), f.get("prev")
            if not isinstance(cur, list) or (n_fact and len(cur) != n_fact):
                E.append(f"{w}.cur: массив из {n_fact} значений — январь…отчётный месяц текущего года, пропуск — null.")
                continue
            if any(x is not None and not is_num(x) for x in cur):
                E.append(f"{w}.cur: только числа и null.")
                continue
            if cur[-1] is None or not near(cur[-1], v, rel=1e-6, ab=1e-6):
                E.append(f"{w}: последний элемент cur ({cur[-1]}) должен совпадать с value_final ({v}).")
            if not isinstance(prev, list) or len(prev) not in (0, 12) or any(x is not None and not is_num(x) for x in prev):
                E.append(f"{w}.prev: 12 значений прошлого года (январь…декабрь, пропуск — null) или [] если базы нет.")
                prev = []
            for k in ("value_numerator", "value_denominator", "mom_value_final", "yoy_value_final"):
                if f.get(k) is not None and not is_num(f.get(k)):
                    E.append(f"{w}.{k}: число или null.")
            yk = f.get("yoy_known")
            if not isinstance(yk, bool):
                E.append(f"{w}.yoy_known: true или false.")
                yk = False
            stats[e]["vals"].append(v)
            pm = cur[-2] if len(cur) >= 2 else (prev[11] if len(prev) == 12 else None)
            mom = f.get("mom_value_final")
            if is_num(mom) and is_num(pm):
                if near(mom, v - pm):
                    stats[e]["mom_delta"] += 1
                elif near(mom, pm):
                    stats[e]["mom_prior"] += 1
            if yk:
                py = prev[n_fact - 1] if len(prev) == 12 and n_fact else None
                yoy = f.get("yoy_value_final")
                if py is None:
                    E.append(f"{w}: yoy_known = true, но в prev нет значения за тот же месяц прошлого года.")
                elif not is_num(yoy):
                    E.append(f"{w}: yoy_known = true, а yoy_value_final не число.")
                elif near(yoy, v - py):
                    stats[e]["yoy_delta"] += 1
                elif near(yoy, py):
                    stats[e]["yoy_prior"] += 1
                else:
                    W.append(f"{w}: yoy_value_final ({yoy}) не равен value_final − prev[{n_fact - 1}] ({v - py:.4g}).")
            n_, d_ = f.get("value_numerator"), f.get("value_denominator")
            if m.get("type") == 2 and m.get("vt") == "perc" and is_num(n_) and is_num(d_) and d_:
                stats[e]["numden_n"] += 1
                q = n_ / d_
                if abs(v - 100 * q) > 0.5:
                    stats[e]["numden_bad"] += 1
                if q and near(v, q, rel=1e-2, ab=1e-4) and not near(v, 100 * q, rel=1e-2, ab=1e-4):
                    stats[e]["as_frac"] += 1
                elif q and near(v, 100 * q, rel=1e-2, ab=0.01):
                    stats[e]["as_pct"] += 1
            thr = f.get("thr", "нет")
            if thr != "нет" and thr is not None and not (isinstance(thr, list) and len(thr) == 2 and all(is_num(x) for x in thr)):
                E.append(f"{w}.thr: [красный, жёлтый] числами или null (у юнита нет порога). Если порог как у метрики — не пишите thr.")
            cuts = f.get("cuts")
            if cuts is not None:
                if not isinstance(cuts, dict):
                    E.append(f"{w}.cuts: объект или null.")
                else:
                    for d, c in cuts.items():
                        parts = c.get("parts") if isinstance(c, dict) else None
                        if not isinstance(parts, list) or not all(isinstance(p, dict) and isinstance(p.get("name"), str) and is_num(p.get("num")) and is_num(p.get("den")) for p in parts):
                            E.append(f"{w}.cuts.{d}: нужно {{label, parts: [{{name, num, den}}]}}.")
                    if not by[rk].get("leaf"):
                        W.append(f"{w}.cuts: разрезы видны только у конечных юнитов, у агрегата их можно не класть.")

    # ---- то, что видно только по всей метрике сразу
    for e, st in stats.items():
        m = ms[e]
        vals = [abs(x) for x in st["vals"]]
        if m.get("vt") == "perc" and vals and max(vals) <= 1.5 and any(vals) and st["as_pct"] <= st["as_frac"]:
            msg = (f"Метрика {e}: все значения от 0 до 1,5 — похоже на доли. Для vt = perc нужны проценты 0…100: умножьте value_final, cur, prev, "
                   "mom_value_final, yoy_value_final и пороги на 100.")
            if st["as_frac"]:
                E.append(msg + f" Подтверждает числитель/знаменатель: value_final = числитель/знаменатель в {st['as_frac']} клетках.")
            else:
                W.append(msg + " Если это действительно малые проценты (меньше 1,5%), всё в порядке.")
        red, yel = m.get("red"), m.get("yellow")
        if m.get("vt") == "perc" and m.get("ttype") == "value" and is_num(red) and vals and max(vals) > 1.5 \
                and max(abs(red), abs(yel)) <= 1 and not (float(red).is_integer() and float(yel).is_integer()):
            E.append(f"Метрика {e}: пороги {red} / {yel} похожи на доли, а значения — проценты. Пороги тоже в процентах.")
        if st["mom_prior"] > max(2, st["mom_delta"]):
            E.append(f"Метрика {e}: mom_value_final похоже на прошлое значение, а нужно изменение: value_final − значение прошлого месяца "
                     f"(совпало с прошлым значением в {st['mom_prior']} клетках, с изменением — в {st['mom_delta']}).")
        if st["yoy_prior"] > max(2, st["yoy_delta"]):
            E.append(f"Метрика {e}: yoy_value_final похоже на прошлогоднее значение, а нужно изменение: value_final − prev[{(n_fact or 1) - 1}].")
        if st["numden_n"] and st["numden_bad"] > max(1, 0.05 * st["numden_n"]):
            W.append(f"Метрика {e}: у {st['numden_bad']} из {st['numden_n']} клеток value_final расходится с 100 × числитель/знаменатель больше чем на 0,5 п.п.")
    if n_cells and n_null == n_cells:
        E.append("Все клетки facts пустые — показывать нечего.")
    elif n_cells and n_null > 0.3 * n_cells:
        W.append(f"Пустых клеток {n_null} из {n_cells}: проверьте, за тот ли месяц выгрузка и тот ли вариант метрики.")
    return E, W


def main(argv=None):
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(errors="replace")
        except (AttributeError, ValueError):
            pass
    args = argv if argv is not None else sys.argv[1:]
    if not args:
        print(__doc__)
        return 2
    path = Path(args[0])
    try:
        doc = json.loads(path.read_text(encoding="utf-8-sig"))
    except (OSError, ValueError) as e:
        print(f"Не читается как JSON: {e}")
        return 1
    errors, warnings = validate(doc)
    meta = doc.get("meta", {}) if isinstance(doc, dict) else {}
    print(f"{path.name}: {meta.get('period_label', '?')} · юнитов {len(doc.get('units', []) if isinstance(doc, dict) else [])}"
          f" · метрик {len(doc.get('metrics', []) if isinstance(doc, dict) else [])}")
    for i, e in enumerate(errors, 1):
        print(f"  ОШИБКА {i}. {e}")
    for w in warnings[:40]:
        print(f"  ! {w}")
    if len(warnings) > 40:
        print(f"  … и ещё {len(warnings) - 40} предупреждений")
    print("Итог: " + ("можно встраивать." if not errors else f"{len(errors)} ошибок — встраивать нельзя, страница покажет неправду."))
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
