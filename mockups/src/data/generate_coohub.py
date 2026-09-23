#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Данные для макета на модели витрины COO Hub.

Структура повторяет витрину один в один: блоки метрик, пороги, направление изменения,
призыв к действию, иерархия юнитов каталога продуктов и разрезы по сотрудникам.
Значения вымышленные: реальные цифры банка в макет не кладём. Чтобы макет заработал
на факте, достаточно заменить этот JSON выгрузкой из витрины с теми же полями.

Соответствие колонкам витрины указано в поле "mart_column" каждого элемента и в
docs/07_coo_hub_mvp.md.
"""
import json
import random
from pathlib import Path

OUT = Path(__file__).resolve().parents[2] / "data" / "coo_hub_2026-09.json"

MONTHS = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"]
N_FACT = 9          # факт по сентябрь включительно
BUSINESS_MONTH = "2026-09-01"

# --------------------------------------------------------------------------- каталог продуктов
# (parent_rk, rk, name, lvl, hc, units_total)  — hc и units_total только у листьев
TREE = [
    (None, "u0", "Все продукты", 1),
    ("u0", "p1", "Платежи", 2),
    ("u0", "p2", "Кредиты", 2),
    ("u0", "p3", "Инвестиции", 2),
    ("u0", "p4", "Платформа", 2),
    ("u0", "p5", "Данные и ИИ", 2),
]
LEAVES = [
    # (parent, rk, name, headcount, число юнитов)
    ("p1", "p1a", "Карты", 212, 9),
    ("p1", "p1b", "Переводы", 148, 6),
    ("p1", "p1c", "Эквайринг", 121, 5),
    ("p1", "p1d", "Подписки", 64, 3),
    ("p2", "p2a", "Кредитные карты", 186, 8),
    ("p2", "p2b", "Кредиты наличными", 132, 5),
    ("p2", "p2c", "Ипотека", 97, 4),
    ("p3", "p3a", "Брокер", 154, 7),
    ("p3", "p3b", "Инвест-аналитика", 71, 3),
    ("p4", "p4a", "Ядро платформы", 198, 8),
    ("p4", "p4b", "Интеграции", 116, 5),
    ("p4", "p4c", "SRE и надёжность", 88, 4),
    ("p5", "p5a", "Витрины данных", 143, 6),
    ("p5", "p5b", "ML-платформа", 109, 5),
    ("p5", "p5c", "Ассистенты", 62, 3),
]

# --------------------------------------------------------------------------- метрики
# Определения взяты по смыслу дашборда; при сборке подставляются из metric_desc витрины.
METRICS = [
    dict(eng="okr_coverage", name="Покрытие целями (OKR)", block="goals", type=2, vt="perc",
         change="up", red=70, yellow=85, tdir="up", ttype="value", new_in_2026=True,
         desc="Юниты, у которых есть хотя бы одна утверждённая цель на период / все юниты",
         cta="Поставить цели юнитам без целей до конца квартала",
         unit_num="юнитов с целями", unit_den="юнитов", gap_tpl="поставить цели ещё {n} юнитам"),
    dict(eng="okr_usage", name="Использование", block="goals", type=2, vt="perc",
         change="up", red=60, yellow=80, tdir="up", ttype="value", new_in_2026=True,
         desc="Цели с обновлением прогресса за период / все активные цели",
         cta="Попросить владельцев обновить прогресс по целям",
         unit_num="целей обновлены", unit_den="целей", gap_tpl="обновить ещё {n} целей"),
    dict(eng="okr_progress", name="Выполнение", block="goals", type=2, vt="perc",
         change="up", red=30, yellow=50, tdir="up", ttype="value", new_in_2026=True,
         desc="Сумма прогресса по целям / число целей периода",
         cta="Разобрать цели, по которым нет движения третий месяц",
         unit_num="целей в прогрессе", unit_den="целей", gap_tpl="добавить прогресса на {n} целей"),
    dict(eng="okr_linkage", name="Связанность", block="goals", type=2, vt="perc",
         change="up", red=40, yellow=60, tdir="up", ttype="value", new_in_2026=True,
         desc="Цели с указанной родительской целью уровнем выше / цели юнита",
         cta="Проставить связь с целью уровнем выше или объяснить, почему её нет",
         unit_num="целей связаны", unit_den="целей", gap_tpl="связать ещё {n} целей"),

    dict(eng="allocation", name="Аллокация", block="hr", type=1, vt="real",
         change="up", red=None, yellow=None, tdir="up", ttype="value",
         desc="Сумма аллокаций сотрудников на продукты юнита, FTE",
         cta="", unit_num="FTE", unit_den="человек", people=True),
    dict(eng="allocation_hq", name="Аллокация HQ", block="hr", type=1, vt="real",
         change="up", red=None, yellow=None, tdir="up", ttype="value",
         desc="Аллокация сотрудников сегмента HQ, FTE",
         cta="", unit_num="FTE", unit_den="человек HQ", people=True),
    dict(eng="open_vacancies_hq", name="Открыто вакансий HQ", block="hr", type=1, vt="int",
         change="down", red=10, yellow=5, tdir="down", ttype="value",
         desc="Открытые вакансии сегмента HQ на конец месяца",
         cta="Пересмотреть приоритет вакансий: очередь выше нормы",
         unit_num="вакансий", unit_den=""),
    dict(eng="free_quotas", name="Свободные квоты", block="hr", type=1, vt="int",
         change="up", red=-1, yellow=0, tdir="up", ttype="value",
         desc="Разница между утверждённой квотой и занятыми позициями; минус — перебор",
         cta="Квота исчерпана: согласовать перенос или снять позиции",
         unit_num="квот", unit_den=""),
    dict(eng="temp_positions", name="Временные позиции", block="hr", type=1, vt="int",
         change="down", red=6, yellow=3, tdir="down", ttype="value",
         desc="Позиции, открытые как временные, на конец месяца",
         cta="Закрыть или перевести в постоянные временные позиции старше квартала",
         unit_num="позиций", unit_den=""),
    dict(eng="replacement_positions", name="Позиции для замен", block="hr", type=1, vt="int",
         change="down", red=6, yellow=3, tdir="down", ttype="value",
         desc="Позиции, открытые на замену уходящего сотрудника",
         cta="Проверить замены, где заменяемый ещё работает",
         unit_num="позиций", unit_den=""),
    dict(eng="underperforming", name="Недорабатывающие", block="hr", type=2, vt="perc",
         change="down", red=5, yellow=2, tdir="down", ttype="value",
         desc="Сотрудники с аллокацией ниже нормы / численность юнита",
         cta="Разобрать аллокацию сотрудников ниже нормы",
         unit_num="человек", unit_den="человек", gap_tpl="вывести из недоработки {n} человек"),

    dict(eng="it_cost", name="Стоимость, руб.", block="it", type=1, vt="int",
         change="down", red=25, yellow=10, tdir="down", ttype="mom",
         desc="Стоимость потреблённой инфраструктуры за месяц",
         cta="Разобрать рост потребления: месяц к месяцу выше порога",
         unit_num="рублей", unit_den=""),
    dict(eng="it_utilization", name="Утилизация", block="it", type=2, vt="perc",
         change="up", red=75, yellow=85, tdir="up", ttype="value",
         desc="Использованные ресурсы / выделенные ресурсы за месяц",
         cta="Вернуть неиспользуемые ресурсы или уменьшить квоту",
         unit_num="использовано", unit_den="выделено", gap_tpl="дозагрузить {n} ресурсо-часов"),
]
BLOCKS = {"goals": "Цели и достижения", "hr": "Человеческий капитал", "it": "IT инфраструктура"}

CUTS = {
    "oper": ("Сегмент", ["HQ", "Line", "Support"]),
    "it": ("IT-специализация", ["IT", "Digital", "nonIT"]),
    "seniority": ("Сениорность", ["junior", "middle", "senior", "lead"]),
}


def rnd(seed):
    return random.Random(hash(seed) & 0xFFFFFFFF)


def walk(start, end, n, wobble, r, lo=None, hi=None):
    """Траектория из n точек от start к end с дрожанием, зажатая в границы."""
    out = []
    for i in range(n):
        t = i / max(1, n - 1)
        v = start + (end - start) * t
        if 0 < i < n - 1:
            v += r.uniform(-wobble, wobble)
        if lo is not None:
            v = max(lo, v)
        if hi is not None:
            v = min(hi, v)
        out.append(v)
    out[0], out[-1] = start, end
    return out


def leaf_fact(rk, hc, units_total, m):
    """Числитель и знаменатель метрики по листу: 12 месяцев 2025 и 9 месяцев 2026."""
    r = rnd(rk + m["eng"])
    eng = m["eng"]
    goals = max(4, round(units_total * 8.2 + r.uniform(-6, 6)))          # целей в юните
    top_goals = max(3, round(units_total * 3.1 + r.uniform(-2, 2)))       # целей верхнего уровня
    hc_hq = round(hc * r.uniform(0.82, 0.9))

    if eng == "okr_coverage":
        den25 = [0] * 12
        num25 = [0] * 12
        start = round(units_total * r.uniform(0.6, 0.78))
        end = round(units_total * r.uniform(0.82, 1.0))
        num26 = [min(units_total, round(v)) for v in walk(start, end, N_FACT, 0.45, r, 0)]
        den26 = [units_total] * N_FACT
    elif eng == "okr_usage":
        num25, den25 = [0] * 12, [0] * 12
        end = goals * r.uniform(0.74, 0.93)
        num26 = [round(v) for v in walk(goals * r.uniform(0.5, 0.66), end, N_FACT, goals * 0.05, r, 0)]
        den26 = [goals] * N_FACT
    elif eng == "okr_progress":
        num25, den25 = [0] * 12, [0] * 12
        # прогресс копится рывками: пересборка целей в середине года роняет его
        base = walk(goals * 0.01, goals * r.uniform(0.09, 0.42), N_FACT, goals * 0.045, r, 0)
        if r.random() < 0.45:
            dip = r.randrange(3, 7)
            for i in range(dip, N_FACT):
                base[i] *= r.uniform(0.35, 0.6)
        num26 = [round(v, 2) for v in base]
        den26 = [goals] * N_FACT
    elif eng == "okr_linkage":
        num25, den25 = [0] * 12, [0] * 12
        start = top_goals * r.uniform(0.45, 0.72)
        end = top_goals * r.uniform(0.16, 0.62)
        num26 = [round(v) for v in walk(start, end, N_FACT, top_goals * 0.06, r, 0)]
        den26 = [top_goals] * N_FACT
    elif eng in ("allocation", "allocation_hq"):
        base = hc_hq if eng == "allocation_hq" else hc
        k = r.uniform(0.62, 0.74)
        s25 = walk(base * k * r.uniform(0.5, 0.62), base * k * r.uniform(0.72, 0.85), 12, base * 0.012, r, 0)
        s26 = walk(s25[-1] * r.uniform(1.0, 1.04), base * k * r.uniform(0.95, 1.06), N_FACT, base * 0.012, r, 0)
        num25, den25 = [round(v, 1) for v in s25], [base] * 12
        num26, den26 = [round(v, 1) for v in s26], [base] * N_FACT
    elif eng == "open_vacancies_hq":
        s25 = walk(hc * 0.03, hc * 0.018, 12, hc * 0.006, r, 0)
        s26 = walk(s25[-1], max(0, hc * r.uniform(0.008, 0.035)), N_FACT, hc * 0.006, r, 0)
        num25, num26 = [round(v) for v in s25], [round(v) for v in s26]
        den25, den26 = [0] * 12, [0] * N_FACT
    elif eng == "free_quotas":
        s25 = [round(r.uniform(-0.4, 3.2)) for _ in range(12)]
        end = r.choice([-2, -1, 0, 0, 1, 2, 3])
        s26 = [round(v) for v in walk(s25[-1], end, N_FACT, 1.1, r)]
        num25, num26 = s25, s26
        den25, den26 = [0] * 12, [0] * N_FACT
    elif eng in ("temp_positions", "replacement_positions"):
        hi = 4 if eng == "temp_positions" else 6
        s25 = [max(0, round(r.uniform(0, hi * 0.7))) for _ in range(12)]
        s26 = [max(0, round(r.uniform(0, hi))) for _ in range(N_FACT)]
        num25, num26 = s25, s26
        den25, den26 = [0] * 12, [0] * N_FACT
    elif eng == "underperforming":
        cap = max(1, round(hc * 0.06))
        num25 = [max(0, round(r.uniform(0, cap))) for _ in range(12)]
        num26 = [max(0, round(r.uniform(0, cap))) for _ in range(N_FACT)]
        den25, den26 = [hc] * 12, [hc] * N_FACT
    elif eng == "it_cost":
        base = hc * r.uniform(9800, 15400)
        s25 = walk(base * r.uniform(0.62, 0.78), base * r.uniform(0.85, 0.97), 12, base * 0.05, r, 0)
        s26 = walk(s25[-1] * r.uniform(1.0, 1.08), base * r.uniform(0.9, 1.35), N_FACT, base * 0.08, r, 0)
        num25, num26 = [round(v) for v in s25], [round(v) for v in s26]
        den25, den26 = [0] * 12, [0] * N_FACT
    elif eng == "it_utilization":
        cap = hc * 730
        d25 = [round(cap * r.uniform(0.94, 1.06)) for _ in range(12)]
        d26 = [round(cap * r.uniform(0.96, 1.12)) for _ in range(N_FACT)]
        u25 = walk(r.uniform(0.55, 0.7), r.uniform(0.74, 0.86), 12, 0.03, r, 0, 1)
        u26 = walk(u25[-1], r.uniform(0.72, 0.96), N_FACT, 0.035, r, 0, 1)
        num25 = [round(d * u) for d, u in zip(d25, u25)]
        num26 = [round(d * u) for d, u in zip(d26, u26)]
        den25, den26 = d25, d26
    else:
        raise ValueError(eng)
    return num25, den25, num26, den26


def cuts_for(rk, eng, num_last, den_last):
    """Разрезы витрины: emp_specialization_oper_code, emp_specialization_it_code, seniority_group."""
    r = rnd(rk + eng + "cut")
    out = {}
    for key, (label, cats) in CUTS.items():
        w = [r.uniform(0.6, 2.4) for _ in cats]
        if key == "oper":
            w = [w[0] * 3.2, w[1] * 1.2, w[2] * 0.8]
        s = sum(w)
        parts, left = [], num_last
        for i, c in enumerate(cats):
            v = round(num_last * w[i] / s, 1) if i < len(cats) - 1 else round(left, 1)
            left -= v
            d = round(den_last * w[i] / s, 1) if den_last else 0
            parts.append({"name": c, "num": max(0, v), "den": max(0, d)})
        out[key] = {"label": label, "parts": parts}
    return out


def build():
    units = []
    for parent, rk, nm, lvl in TREE:
        units.append(dict(functional_unit_rk=rk, functional_unit_nm=nm, lvl_unit=lvl,
                          parent_functional_unit_rk=parent, headcount=0, leaf=False))
    for parent, rk, nm, hc, ut in LEAVES:
        units.append(dict(functional_unit_rk=rk, functional_unit_nm=nm, lvl_unit=3,
                          parent_functional_unit_rk=parent, headcount=hc, units_total=ut, leaf=True))
    by_rk = {u["functional_unit_rk"]: u for u in units}
    for u in units:  # численность родителей — сумма листьев
        if u["leaf"]:
            p = by_rk.get(u["parent_functional_unit_rk"])
            while p:
                p["headcount"] += u["headcount"]
                p = by_rk.get(p["parent_functional_unit_rk"])

    facts = {}
    for m in METRICS:
        eng = m["eng"]
        # листья
        raw = {}
        for parent, rk, nm, hc, ut in LEAVES:
            raw[rk] = leaf_fact(rk, hc, ut, m)
        # агрегация снизу вверх: и числитель, и знаменатель суммируются — так доля честная
        for lvl in (2, 1):
            for u in units:
                if u["lvl_unit"] != lvl:
                    continue
                kids = [x["functional_unit_rk"] for x in units
                        if x["parent_functional_unit_rk"] == u["functional_unit_rk"]]
                acc = None
                for k in kids:
                    n25, d25, n26, d26 = raw[k]
                    if acc is None:
                        acc = ([0] * 12, [0] * 12, [0] * N_FACT, [0] * N_FACT)
                    for i in range(12):
                        acc[0][i] += n25[i]
                        acc[1][i] += d25[i]
                    for i in range(N_FACT):
                        acc[2][i] += n26[i]
                        acc[3][i] += d26[i]
                raw[u["functional_unit_rk"]] = acc

        for u in units:
            rk = u["functional_unit_rk"]
            n25, d25, n26, d26 = raw[rk]
            rel = m["type"] == 2
            fin = lambda n, d: (round(100 * n / d, 2) if d else 0.0) if rel else round(n, 1 if m["vt"] == "real" else 0)
            cur = [fin(n26[i], d26[i]) for i in range(N_FACT)]
            prev = [fin(n25[i], d25[i]) for i in range(12)]
            known = not m.get("new_in_2026")
            facts.setdefault(rk, {})[eng] = {
                "value_final": cur[-1],
                "value_numerator": round(n26[-1], 2),
                "value_denominator": round(d26[-1], 2),
                "mom_value_final": round(cur[-1] - cur[-2], 2),
                "yoy_value_final": round(cur[-1] - (prev[N_FACT - 1] if known else 0), 2),
                "yoy_known": known,
                "cur": cur,
                "prev": prev if known else [0] * 12,
                "cuts": cuts_for(rk, eng, n26[-1], d26[-1]) if m["block"] == "hr" else None,
            }

    meta = {
        "product": "COO Hub",
        "period_label": "Сентябрь 2026",
        "business_month": BUSINESS_MONTH,
        "actual_data_dt": "2026-09-22",
        "aggr_type": "M",
        "source": "Витрина COO Hub, Greenplum · один датасет, 53 колонки",
        "owner": "Офис исполнительного директора · BI-аналитика",
        "disclaimer": "Макет на вымышленных данных. Структура, пороги и разрезы повторяют витрину, цифры сгенерированы.",
        "months": MONTHS,
        "n_fact": N_FACT,
    }
    # Порог доли сравним на любом уровне каталога; порог счётчика — нет: сумма по 15 юнитам
    # всегда больше порога одного юнита. Поэтому у абсолютных метрик красим только листья,
    # а у агрегатов показываем, сколько дочерних юнитов за порогом. В витрине за это отвечает
    # metric_lvl — уровень, на котором метрика и её пороги определены.
    out_metrics = []
    for m in METRICS:
        mm = {k: v for k, v in m.items() if k != "people"}
        mm["threshold_scope"] = "any_level" if m["type"] == 2 or m["ttype"] == "mom" else "unit_level"
        out_metrics.append(mm)
    doc = {"meta": meta, "blocks": BLOCKS, "units": units, "metrics": out_metrics, "facts": facts}
    OUT.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"written {OUT} ({OUT.stat().st_size // 1024} KB)")
    print("units:", len(units), "metrics:", len(METRICS))
    root = facts["u0"]
    for m in METRICS[:4] + METRICS[4:6] + METRICS[-2:]:
        f = root[m["eng"]]
        print(f"  {m['name']:<26} {f['value_final']:>12} mom {f['mom_value_final']:>10} yoy {f['yoy_value_final']:>10} known={f['yoy_known']}")


if __name__ == "__main__":
    build()
