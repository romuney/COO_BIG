#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Проверка конвейера «выгрузка витрины → данные страницы». Только стандартная библиотека.

    python3 mockups/tools/test_pipeline.py

1. Обратная проверка: данные макета → выгрузка в формате витрины → конвертер → те же данные.
2. Стресс: январь, два верхних юнита, пять уровней каталога, 14 детей у одного юнита, пропуски, пороги по юнитам,
   порог только на конечных юнитах, один порог из двух, пороги долями при значениях в процентах, новый блок,
   «итого» записано словом «Все», варианты метрики, CSV с запятой, заглавные имена колонок.
3. Ошибки, которые должны останавливать сборку, и чтение XLSX.

Пишет во временную папку, репозиторий не трогает. Код выхода 0 — всё прошло.
"""
import csv
import json
import random
import sys
import tempfile
import zipfile
from pathlib import Path

TOOLS = Path(__file__).resolve().parent
ROOT = TOOLS.parent
sys.path.insert(0, str(TOOLS))

import make_sample_export  # noqa: E402
import mart_to_json as conv  # noqa: E402

FAILS = []


def check(cond, msg):
    if not cond:
        FAILS.append(msg)
    return cond


def near(a, b, tol=0.011):
    if a is None or b is None:
        return a is None and b is None
    return abs(a - b) <= max(tol, 1e-6 * max(abs(a), abs(b)))


def run(path, overrides=None, force=False):
    cfg = conv.load_config(TOOLS / "coohub_config.json", overrides)
    rep = conv.Report()
    doc, _ = conv.convert(path, cfg, rep, force=force)
    conv.add_page_sections(doc, rep)
    return doc, rep


# --------------------------------------------------------------------------- 1. обратная проверка
def test_roundtrip(tmp):
    src = json.loads((ROOT / "data" / "coo_hub_2026-09.json").read_text(encoding="utf-8"))
    path, _ = make_sample_export.write(out=tmp / "sample.csv")
    doc, rep = run(path, {"variants": {"*": {"metric_option": "Все юниты"}}})
    check(not rep.errors, f"обратная проверка: ошибки {rep.errors}")
    U0 = {u["functional_unit_rk"]: u for u in src["units"]}
    U1 = {u["functional_unit_rk"]: u for u in doc["units"]}
    check(set(U0) == set(U1), f"юниты не совпали: {set(U0) ^ set(U1)}")
    for rk, u in U0.items():
        v = U1.get(rk)
        if not v:
            continue
        check(v["functional_unit_nm"] == u["functional_unit_nm"], f"имя {rk}")
        check(v["parent_functional_unit_rk"] == u["parent_functional_unit_rk"], f"родитель {rk}")
        check(v["leaf"] == u["leaf"], f"leaf {rk}")
        check(near(v["headcount"], u["headcount"]), f"численность {rk}: {v['headcount']} vs {u['headcount']}")
    M0 = {m["eng"]: m for m in src["metrics"]}
    M1 = {m["eng"]: m for m in doc["metrics"]}
    check(list(M0) == list(M1), f"порядок метрик: {list(M1)}")
    for k, m in M0.items():
        n = M1.get(k, {})
        for f in ("name", "type", "vt", "change", "tdir", "ttype", "threshold_scope", "desc", "cta", "unit_num", "unit_den", "gap_tpl"):
            check((n.get(f) or None) == (m.get(f) or None), f"метрика {k}.{f}: {n.get(f)!r} vs {m.get(f)!r}")
        for f in ("red", "yellow"):
            check(near(n.get(f), m.get(f)), f"метрика {k}.{f}: {n.get(f)} vs {m.get(f)}")
        check(doc["blocks"].get(n.get("block")) == src["blocks"][m["block"]], f"блок {k}")
    bad = 0
    for rk in U0:
        for k, m in M0.items():
            a, b = src["facts"][rk][k], doc["facts"][rk][k]
            if b is None:
                FAILS.append(f"пустой факт {rk}/{k}")
                continue
            ok = (near(a["value_final"], b["value_final"]) and near(a["value_numerator"], b["value_numerator"])
                  and near(a["value_denominator"], b["value_denominator"]) and near(a["mom_value_final"], b["mom_value_final"])
                  and a["yoy_known"] == b["yoy_known"] and len(a["cur"]) == len(b["cur"])
                  and all(near(x, y) for x, y in zip(a["cur"], b["cur"])))
            if a["yoy_known"]:
                ok = ok and near(a["yoy_value_final"], b["yoy_value_final"]) and all(near(x, y) for x, y in zip(a["prev"], b["prev"]))
            if U0[rk]["leaf"] and a.get("cuts") and a["cuts"].get("oper"):
                pa, pb = a["cuts"]["oper"]["parts"], ((b.get("cuts") or {}).get("oper") or {}).get("parts", [])
                ok = ok and [p["name"] for p in pa] == [p["name"] for p in pb] and all(
                    near(x["num"], y["num"]) and near(x["den"], y["den"]) for x, y in zip(pa, pb))
            if not ok:
                bad += 1
                if bad <= 3:
                    FAILS.append(f"факт {rk}/{k} не совпал: {json.dumps(b, ensure_ascii=False)[:300]}")
    check(doc["meta"]["root"] == "u0" and doc["meta"]["n_fact"] == 9 and doc["meta"]["year"] == 2026, "meta")
    print(f"  обратная проверка: {len(U1)} юнитов × {len(M1)} метрик, расхождений {bad}")
    return doc


# --------------------------------------------------------------------------- 2. стресс
STRESS_UNITS = [  # rk, имя, родитель, уровень
    ("B0", "Банк", None, 1),
    ("B1", "Розница с очень длинным названием, чтобы проверить переносы строк", "B0", 2),
    ("B11", "Карты", "B1", 3), ("B111", "Кредитные карты", "B11", 4),
    ("B1111", "Премиальные карты с кешбэком и очень длинным хвостом названия", "B111", 5),
    ("B1112", "Дебетовые", "B111", 5), ("B12", "Вклады", "B1", 3),
    ("B2", "Платформа", "B0", 2), *[(f"B2_{i:02d}", f"Команда {i:02d}", "B2", 3) for i in range(1, 15)],
    ("B3", "Маленький юнит", "B0", 2),
    ("D0", "Дочерняя компания", None, 1), ("D1", "Лизинг", "D0", 2), ("D2", "Страхование", "D0", 2),
]
STRESS_METRICS = [  # eng, имя, блок, блок ру, тип, vt, change, красный, жёлтый, ttype
    ("okr_cov", "Покрытие целями (OKR)", "goals", "Цели и достижения", 2, "perc", "up", 70, 85, "value"),
    ("okr_upd", "Использование", "goals", "Цели и достижения", 2, "perc", "up", 60, 80, "value"),
    ("okr_prog", "Выполнение", "goals", "Цели и достижения", 2, "perc", "up", 30, 50, "value"),
    ("okr_link", "Связанность", "goals", "Цели и достижения", 2, "perc", "up", 40, 60, "value"),
    ("hc", "Численность", "hr", "Человеческий капитал", 1, "int", "up", None, None, "value"),
    ("alloc", "Аллокация", "hr", "Человеческий капитал", 1, "real", "up", None, None, "value"),
    ("vac", "Открыто вакансий HQ", "hr", "Человеческий капитал", 1, "int", "down", 10, 5, "value"),
    ("temp", "Временные позиции", "hr", "Человеческий капитал", 1, "int", "down", 6, 3, "value"),
    ("quota", "Свободные квоты", "hr", "Человеческий капитал", 1, "int", "up", -1, 0, "value"),
    ("repl", "Позиции для замен", "hr", "Человеческий капитал", 1, "int", "down", 6, 3, "value"),
    ("under", "Недорабатывающие сотрудники", "hr", "Человеческий капитал", 2, "perc", "down", 5, None, "value"),
    ("cost", "Стоимость, руб.", "it", "IT инфраструктура", 1, "int", "down", 25, 10, "mom"),
    ("util", "Утилизация", "it", "IT инфраструктура", 2, "perc", "up", 75, 85, "value"),
    ("rev", "Выручка на FTE", "fin", "Финансы", 1, "real", "up", None, None, "value"),
    ("margin", "Маржа", "fin", "Финансы", 2, "perc", "up", 0.1, 0.2, "value"),
    ("saldo", "Сальдо проектов, руб.", "fin", "Финансы", 1, "real", "up", None, None, "value"),
    ("opex", "Расходы, руб.", "fin", "Финансы", 1, "int", "down", None, None, "value"),
]
STRESS_COLS = ["BUSINESS_MONTH", "ACTUAL_DATA_DT", "AGGR_TYPE", "FUNCTIONAL_UNIT_RK", "FUNCTIONAL_UNIT_NM",
               "PARENT_FUNCTIONAL_UNIT_RK", "PARENT_FUNCTIONAL_UNIT_NM", "LVL_UNIT", "SOURCE_METRICS_BLOCK",
               "SOURCE_METRICS_BLOCK_RU", "METRIC_TYPE", "METRIC_NAME", "METRIC_NAME_ENG_LOWER", "CHANGE_TYPE",
               "VALUE_TYPE", "METRIC_OPTION", "METRIC_DESC", "CALL_TO_ACTION", "THRESHOLD_RED", "THRESHOLD_YELLOW",
               "THRESHOLD_DIRECTION", "THRESHOLD_TYPE", "SORT_NUMBER", "VALUE_DONE", "VALUE_NUMERATOR",
               "VALUE_DENOMINATOR", "VALUE_FINAL", "MOM_VALUE_FINAL", "YOY_VALUE_FINAL",
               "EMP_SPECIALIZATION_OPER_CODE", "EMP_SPECIALIZATION_IT_CODE", "SENIORITY_GROUP"]


def write_stress(path):
    by = {u[0]: u for u in STRESS_UNITS}
    kids = {}
    for u in STRESS_UNITS:
        kids.setdefault(u[2], []).append(u[0])
    leaves = [u[0] for u in STRESS_UNITS if u[0] not in kids]
    months = [(2026, m) for m in range(1, 13)] + [(2027, 1)]

    def leaves_of(rk):
        return [rk] if rk not in kids else [x for c in kids[rk] for x in leaves_of(c)]

    hc = {rk: (3 if rk == "B3" else random.Random("hc" + rk).randint(20, 260)) for rk in leaves}
    raw = {}  # (eng, leaf, ym) → (num, den)
    for eng, *_ in STRESS_METRICS:
        for rk in leaves:
            r = random.Random(eng + rk)
            for ym in months:
                h = hc[rk]
                if eng in ("okr_cov", "okr_upd", "okr_prog", "okr_link"):
                    den = r.randint(8, 40)
                    num = round(den * r.uniform(0.25, 1.0))
                elif eng == "under":
                    den, num = h, r.randint(0, max(1, h // 12))
                elif eng == "util":
                    den = h * 700
                    num = round(den * r.uniform(0.6, 0.98))
                elif eng == "margin":
                    den = 1000
                    num = round(den * r.uniform(0.05, 0.35), 1)
                elif eng == "hc":
                    num, den = h, None
                elif eng == "alloc":
                    num, den = round(h * r.uniform(0.6, 0.95), 1), None
                elif eng in ("vac", "temp", "repl"):
                    num, den = r.randint(0, 9), None
                elif eng == "quota":
                    num, den = r.randint(-3, 4), None
                elif eng == "cost":
                    num, den = round(h * r.uniform(9000, 16000) * (1.3 if ym == (2027, 1) and rk == "B2_05" else 1)), None
                elif eng == "rev":
                    num, den = round(r.uniform(1.2e6, 4.8e6), 1), None
                elif eng == "saldo":
                    num, den = round(r.uniform(-9e8, 4e8), 1), None
                else:  # opex — миллиарды
                    num, den = round(h * r.uniform(8e6, 3e7)), None
                raw[(eng, rk, ym)] = (num, den)
    rows = []
    for eng, name, blk, blk_ru, typ, vt, change, red, yel, ttype in STRESS_METRICS:
        for rk, nm, parent, lvl in STRESS_UNITS:
            L = leaves_of(rk)
            for ym in months:
                if eng == "okr_link" and ym[0] == 2026:
                    continue  # метрика появилась в 2027: базы прошлого года нет
                if eng == "rev" and rk in ("D2", "D0"):
                    continue  # у «Страхования» выручки нет совсем
                if eng == "margin" and ym == (2027, 1) and rk in ("B2_01", "B2_02", "B2_03", "B2", "B0"):
                    continue  # маржа за отчётный месяц не посчитана у трёх команд
                if eng == "cost" and ym == (2026, 12) and rk in ("B12", "B1", "B0"):
                    continue  # нет декабря: изменение к прошлому месяцу — только из колонки витрины
                if eng == "hc" and rk == "D2":
                    continue  # численности «Страхования» нет — плитка равной площади
                parts = [raw[(eng, x, ym)] for x in L]
                num = sum(p[0] for p in parts)
                den = sum(p[1] for p in parts) if parts[0][1] is not None else None
                val = (num / den * 100 if den else 0) if typ == 2 else num
                prev_ym = (ym[0], ym[1] - 1) if ym[1] > 1 else (ym[0] - 1, 12)
                pm = [raw.get((eng, x, prev_ym)) for x in L]
                pmv = None
                if all(pm):
                    pn = sum(p[0] for p in pm)
                    pd = sum(p[1] for p in pm) if pm[0][1] is not None else None
                    pmv = (pn / pd * 100 if pd else 0) if typ == 2 else pn
                r_, y_ = red, yel
                if eng == "temp" and rk not in leaves:
                    r_, y_ = red * len(L), yel * len(L)  # витрина масштабирует порог по уровню
                if eng == "vac" and rk not in leaves:
                    r_ = y_ = None  # порог есть только у конечных юнитов
                opt_list = ["Все юниты", "Фокусные юниты"] if eng == "okr_prog" else [""]
                for opt in opt_list:
                    k = 1.0 if opt != "Фокусные юниты" else 0.9
                    rows.append({
                        "BUSINESS_MONTH": f"{ym[0]}-{ym[1]:02d}-01", "ACTUAL_DATA_DT": "2027-01-20 00:00:00", "AGGR_TYPE": "M",
                        "FUNCTIONAL_UNIT_RK": rk, "FUNCTIONAL_UNIT_NM": nm, "PARENT_FUNCTIONAL_UNIT_RK": parent or "",
                        "PARENT_FUNCTIONAL_UNIT_NM": by[parent][1] if parent else "", "LVL_UNIT": lvl,
                        "SOURCE_METRICS_BLOCK": blk, "SOURCE_METRICS_BLOCK_RU": blk_ru, "METRIC_TYPE": typ,
                        "METRIC_NAME": name, "METRIC_NAME_ENG_LOWER": eng, "CHANGE_TYPE": change, "VALUE_TYPE": vt,
                        "METRIC_OPTION": opt, "METRIC_DESC": "" if eng in ("saldo", "rev") else f"Описание: {name}",
                        "CALL_TO_ACTION": f"Разобраться с «{name}»" if red is not None else "",
                        "THRESHOLD_RED": "" if r_ is None else r_, "THRESHOLD_YELLOW": "" if y_ is None else y_,
                        "THRESHOLD_DIRECTION": change, "THRESHOLD_TYPE": ttype, "SORT_NUMBER": [m[0] for m in STRESS_METRICS].index(eng) + 1,
                        "VALUE_DONE": num * k if typ == 1 else "", "VALUE_NUMERATOR": num * k if typ == 2 else "",
                        "VALUE_DENOMINATOR": den if den is not None else "", "VALUE_FINAL": round(val * k, 6),
                        "MOM_VALUE_FINAL": round(pmv * k, 6) if pmv is not None else ("" if eng != "cost" else round(val * 0.8, 6)),
                        "YOY_VALUE_FINAL": "", "EMP_SPECIALIZATION_OPER_CODE": "Все", "EMP_SPECIALIZATION_IT_CODE": "Все",
                        "SENIORITY_GROUP": "Все",
                    })
            if eng in ("hc", "under") and rk in leaves and rk != "D2":
                num, den = raw[(eng, rk, (2027, 1))]
                for part, share in (("HQ", .6), ("Line", .3), ("Support", .1)):
                    n_ = round(num * share, 1)
                    d_ = round(den * share, 1) if den else None
                    rows.append({**rows[-1], "EMP_SPECIALIZATION_OPER_CODE": part, "VALUE_NUMERATOR": n_ if typ == 2 else "",
                                 "VALUE_DONE": n_ if typ == 1 else "", "VALUE_DENOMINATOR": d_ if d_ else "",
                                 "VALUE_FINAL": round(n_ / d_ * 100, 6) if typ == 2 and d_ else n_})
    with path.open("w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=STRESS_COLS, delimiter=",")
        w.writeheader()
        w.writerows(rows)
    return len(rows)


def test_stress(tmp):
    path = tmp / "stress.csv"
    n = write_stress(path)
    doc, rep = run(path, {"variants": {"*": {"metric_option": "Все юниты"}}, "headcount": {"metric": "Численность", "field": "value_final"},
                          "total_tokens": ["", "все"], "blocks": {"Финансы": {"nick": "Деньги", "ring": "₽"}}})
    check(not rep.errors, f"стресс: ошибки {rep.errors}")
    U = {u["functional_unit_rk"]: u for u in doc["units"]}
    M = {m["eng"]: m for m in doc["metrics"]}
    F = doc["facts"]
    root = doc["meta"]["root"]
    check(root in U and U[root]["functional_unit_nm"] == "Все юниты", "общий корень над двумя верхними юнитами")
    check(sorted(u["functional_unit_rk"] for u in doc["units"] if u["parent_functional_unit_rk"] == root) == ["B0", "D0"], "дети общего корня")
    check(max(u["depth"] for u in doc["units"]) == 6, "шесть уровней с общим корнем")
    check(doc["meta"]["n_fact"] == 1 and doc["meta"]["year"] == 2027 and doc["meta"]["period_label"] == "Январь 2027", "январь")
    f = F["B12"]["util"]
    check(len(f["cur"]) == 1 and len(f["prev"]) == 12 and f["yoy_known"], "январь: один месяц текущего года и полный прошлый")
    check(near(f["mom_value_final"], f["cur"][0] - f["prev"][11]), "январь: изменение к декабрю прошлого года")
    c = F["B12"]["cost"]
    with path.open(encoding="utf-8") as fh:
        row = next(r for r in csv.DictReader(fh) if r["FUNCTIONAL_UNIT_RK"] == "B12" and r["METRIC_NAME_ENG_LOWER"] == "cost"
                   and r["BUSINESS_MONTH"] == "2027-01-01")
    want = float(row["VALUE_FINAL"]) - float(row["MOM_VALUE_FINAL"])  # в колонке витрины — прошлое значение
    check(c is not None and c["prev"][11] is None and near(c["mom_value_final"], want, 1),
          f"нет декабря: изменение берётся из колонки витрины — {c and c['mom_value_final']} vs {want}")
    check(M["okr_link"]["red"] == 40 and not F["B0"]["okr_link"]["yoy_known"], "метрика без базы прошлого года")
    check(M["temp"]["threshold_scope"] == "any_level" and F["B0"]["temp"].get("thr") == [6 * 18, 3 * 18],
          f"пороги по уровням: {M['temp']['threshold_scope']} {F['B0']['temp'].get('thr')}")
    check(M["vac"]["threshold_scope"] == "unit_level" and "thr" not in F["B0"]["vac"], "порог только у конечных юнитов")
    check(M["under"]["red"] == 5 and M["under"]["yellow"] == 5, "один порог из двух")
    check(M["margin"]["red"] == 10 and M["margin"]["yellow"] == 20 and M["margin"]["tdir"] == "up", f"пороги долями: {M['margin']}")
    check(F["B2_01"]["margin"] is None and F["B2"]["margin"] is None, "пропуск маржи за месяц — пустая клетка")
    check(F["D2"]["rev"] is None and U["D2"]["headcount"] is None, "юнит без выручки и без численности")
    check(U["B3"]["headcount"] == 3 and U["B2"]["headcount"] > 0, "численность из «Численности»")
    check("fin" in doc["block_order"] and doc["block_meta"]["fin"]["ring"] == "₽", "новый блок и его подпись из конфига")
    check(M["okr_prog"]["name"] == "Выполнение" and near(F["B12"]["okr_prog"]["value_final"],
                                                          F["B12"]["okr_prog"]["value_numerator"] / F["B12"]["okr_prog"]["value_denominator"] * 100),
          "вариант «Все юниты» выбран")
    parts = (F["B12"]["hc"].get("cuts") or {}).get("oper", {}).get("parts", [])
    check([p["name"] for p in parts] == ["HQ", "Line", "Support"], f"разрез по сегменту при «итого» = «Все»: {parts}")
    check(len(doc["metrics"]) == 17 and M["opex"]["vt"] == "int", "17 метрик")
    joined = "\n".join(rep.warnings + rep.facts)
    for needle in ("похожи на доли", "только один порог", "Нет данных за", "на родителях другие"):
        check(needle in joined, f"в отчёте нет «{needle}»")
    print(f"  стресс: {n} строк → {len(doc['units'])} юнитов, {len(doc['metrics'])} метрик, предупреждений {len(rep.warnings)}")
    out = tmp / "stress.json"
    out.write_text(json.dumps(doc, ensure_ascii=False), encoding="utf-8")
    return out


# --------------------------------------------------------------------------- 3. ошибки и XLSX
def test_errors(tmp):
    path = tmp / "stress.csv"
    doc, rep = run(path, {"total_tokens": ["", "все"]})
    check(any("Выполнение" in e and "Фокусные юниты" in e for e in rep.errors), "несколько вариантов без выбора — ошибка")
    doc, rep = run(path, {"total_tokens": ["", "все"]}, force=True)
    check(rep.errors and doc is not None, "--force собирает черновик и помнит ошибку")

    dup = tmp / "dup.csv"
    dup.write_text("business_month;functional_unit_rk;functional_unit_nm;metric_name;value_final\n"
                   "2026-09-01;1;Юнит;Метрика;5\n2026-09-01;1;Юнит;Метрика;7\n", encoding="utf-8")
    _, rep = run(dup)
    check(any("несколько строк с разными значениями" in e for e in rep.errors), "дубли с разными значениями — ошибка")

    bad = tmp / "bad.csv"
    bad.write_text("business_month;functional_unit_rk;metric_name\n2026-09-01;1;Метрика\n", encoding="utf-8")
    try:
        run(bad)
        FAILS.append("нет value_final — должно остановиться")
    except conv.ConvertError as e:
        check("value_final" in str(e), "текст ошибки про колонку")

    x = tmp / "tiny.xlsx"
    header = ["business_month", "functional_unit_rk", "functional_unit_nm", "metric_name", "value_type", "value_final"]
    data = [[46266, "1", "Юнит", "Доля", "perc", 0.5], [46235, "1", "Юнит", "Доля", "perc", 0.4]]
    strings = sorted({str(v) for r in [header] + data for v in r if isinstance(v, str)})
    sid = {s: i for i, s in enumerate(strings)}

    def cell(ci, ri, v):
        ref = f"{chr(65 + ci)}{ri}"
        return f'<c r="{ref}" t="s"><v>{sid[v]}</v></c>' if isinstance(v, str) else f'<c r="{ref}"><v>{v}</v></c>'
    sheet = "".join(f'<row r="{ri}">' + "".join(cell(ci, ri, v) for ci, v in enumerate(r)) + "</row>" for ri, r in enumerate([header] + data, 1))
    ns = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
    rns = 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'
    with zipfile.ZipFile(x, "w") as z:
        z.writestr("xl/workbook.xml", f'<workbook {ns} {rns}><sheets><sheet name="Лист1" sheetId="1" r:id="rId1"/></sheets></workbook>')
        z.writestr("xl/_rels/workbook.xml.rels", '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                   '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>')
        z.writestr("xl/sharedStrings.xml", f'<sst {ns}>' + "".join(f"<si><t>{s}</t></si>" for s in strings) + "</sst>")
        z.writestr("xl/worksheets/sheet1.xml", f'<worksheet {ns}><sheetData>{sheet}</sheetData></worksheet>')
    doc, rep = run(x)
    f = doc["facts"]["1"][doc["metrics"][0]["eng"]]
    check(doc["meta"]["business_month"] == "2026-09-01" and near(f["value_final"], 50) and near(f["mom_value_final"], 10),
          f"XLSX: даты Excel и доли — {doc['meta']['business_month']} {f}")
    print("  ошибки и XLSX: проверены")


def main():
    with tempfile.TemporaryDirectory() as t:
        tmp = Path(t)
        print("Конвейер COO Hub:")
        test_roundtrip(tmp)
        stress = test_stress(tmp)
        test_errors(tmp)
        if len(sys.argv) > 1:  # сохранить стресс-данные, чтобы собрать по ним страницу
            Path(sys.argv[1]).write_bytes(stress.read_bytes())
    if FAILS:
        print(f"\nПРОВАЛЕНО {len(FAILS)}:")
        for x in FAILS[:40]:
            print("  -", x)
        return 1
    print("\nВсё прошло.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
