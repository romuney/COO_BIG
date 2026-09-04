#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Генератор ВЫМЫШЛЕННЫХ данных для макета Exec Board (отчётный месяц — август 2026).

Зачем отдельный генератор:
  * структура JSON = контракт данных «метрика × разрез × гранулярность», который потом
    можно наполнить реальными цифрами из хранилища (или отдать ИИ-слою для комментариев);
  * все «истории месяца» (сигналы) заданы здесь явно, чтобы макет показывал, как выглядят
    красные/жёлтые флаги, слоп-диаграммы с изменениями и блок стабильности.

Запуск:  python3 mockups/src/data/generate_data.py
Выход:   mockups/data/exec_board_2026-08.json
"""
import json
import random
from pathlib import Path

random.seed(20260831)

OUT = Path(__file__).resolve().parents[2] / "data" / "exec_board_2026-08.json"

MONTHS_RU = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"]
N26 = 8  # август 2026 — последний фактический месяц


# ----------------------------------------------------------------------------- helpers
def path(anchors, n, noise=0.0, nd=1):
    """Гладкая ломаная по опорным точкам (index -> value) с небольшим шумом.
    anchors: dict {index: value}; индексы от 0 до n-1."""
    keys = sorted(anchors)
    out = []
    for i in range(n):
        # найти отрезок
        lo = max(k for k in keys if k <= i) if any(k <= i for k in keys) else keys[0]
        hi = min(k for k in keys if k >= i) if any(k >= i for k in keys) else keys[-1]
        if lo == hi:
            v = anchors[lo]
        else:
            t = (i - lo) / (hi - lo)
            v = anchors[lo] + (anchors[hi] - anchors[lo]) * t
        if noise:
            v += random.uniform(-noise, noise)
        out.append(round(v, nd))
    return out


def lin(a, b, n, noise=0.0, nd=1):
    return path({0: a, n - 1: b}, n, noise, nd)


def ints(xs):
    return [int(round(x)) for x in xs]


def share_path(a, b, n=N26, noise=0.4):
    """Помесячная траектория доли от a к b (для слопов с деталями по месяцам)."""
    xs = lin(a, b, n, noise, 1)
    xs[0], xs[-1] = a, b
    return xs


def slope(id_, title, items, subtitle="", unit="%", left="янв 26", right="авг 26",
          comment="", priority=0, threshold=2.0, page="", source=""):
    """Слоп-диаграмма: структура (доли) на две даты. Помечаем изменившиеся категории."""
    rows = []
    for name, a, b, *rest in items:
        note = rest[0] if rest else ""
        rows.append({
            "name": name, "a": a, "b": b, "delta": round(b - a, 1),
            "changed": abs(b - a) >= threshold, "note": note,
            "months": share_path(a, b),
        })
    changed = any(r["changed"] for r in rows)
    return {
        "id": id_, "title": title, "subtitle": subtitle, "unit": unit,
        "left_label": left, "right_label": right, "items": rows,
        "changed": changed, "comment": comment, "priority": priority, "page": page,
        "source": source,
    }


# ----------------------------------------------------------------------------- 1. Панель управления
# Численность HQ (управленческая). 2025 и 2026 помесячно, план-траектория к лимиту 23 500.
hq_2025 = ints(path({0: 21150, 4: 21500, 7: 21910, 11: 22140}, 12, 12, 0))
hq_2026 = [22215, 22290, 22400, 22505, 22600, 22700, 22812, 22930]
hq_plan = ints(path({0: 22240, 11: 23500}, 12, 0, 0))
hq_fc_runrate = [23045, 23160, 23260, 23330]      # сен–дек, при текущем темпе
hq_fc_pipeline = [23110, 23300, 23480, 23620]     # сен–дек, если закрыть воронку в срок

attr_2025 = path({0: 13.9, 6: 13.3, 11: 12.8}, 12, 0.08)
attr_2026 = [12.6, 12.5, 12.4, 12.3, 12.3, 12.2, 12.1, 12.1]
regr_2025 = path({0: 5.6, 11: 5.3}, 12, 0.05)
regr_2026 = [5.3, 5.3, 5.2, 5.2, 5.2, 5.2, 5.2, 5.2]

mgr_attr_2025 = path({0: 7.6, 11: 7.1}, 12, 0.1)
mgr_attr_2026 = [7.2, 7.4, 7.9, 8.3, 8.8, 9.2, 9.6, 9.8]

junior_2025 = path({0: 16.1, 11: 17.6}, 12, 0.05)
junior_2026 = [17.7, 17.8, 18.0, 18.2, 18.4, 18.6, 18.8, 18.9]
junior_plan = path({0: 17.8, 11: 20.0}, 12, 0, 1)

region_2025 = path({0: 37.9, 11: 39.8}, 12, 0.05)
region_2026 = [39.9, 40.1, 40.3, 40.5, 40.8, 41.0, 41.2, 41.3]
region_plan = path({0: 40.0, 11: 42.0}, 12, 0, 1)

vacrate_2025 = path({0: 8.9, 5: 8.3, 11: 7.6}, 12, 0.08)
vacrate_2026 = [7.5, 7.4, 7.5, 7.6, 7.7, 7.6, 7.5, 7.5]

overdue_2025 = path({0: 24, 11: 21}, 12, 0.3, 0)
overdue_2026 = [21, 21, 22, 23, 24, 25, 26, 27]

quasi_2025 = path({0: 23.5, 11: 22.0}, 12, 0.05)
quasi_2026 = [21.9, 21.8, 21.6, 21.5, 21.3, 21.2, 21.1, 21.0]
quasi_plan = path({0: 21.5, 11: 15.0}, 12, 0, 1)

ai_2025 = ints(path({0: 14, 11: 31}, 12, 0.4, 0))
ai_2026 = [34, 37, 40, 43, 45, 47, 49, 51]
ai_plan = ints(path({0: 33, 11: 60}, 12, 0, 0))

overload_2025 = path({0: 6.8, 11: 7.2}, 12, 0.08)
overload_2026 = [7.3, 7.3, 7.5, 7.8, 8.2, 8.6, 8.9, 9.1]

risk_2025 = path({0: 4.1, 11: 4.6}, 12, 0.05)
risk_2026 = [4.6, 4.7, 4.8, 4.9, 5.0, 5.1, 5.3, 5.4]

refresh_2025 = ints([7, 14, 22, 30, 39, 47, 56, 64, 72, 80, 90, 98])
refresh_2026 = [6, 13, 21, 29, 37, 44, 51, 58]
refresh_plan = [round(100 * (i + 1) / 12, 1) for i in range(12)]

goals_2025 = ints(path({0: 55, 11: 61}, 12, 0.3, 0))
goals_2026 = [60, 61, 62, 62, 63, 63, 64, 64]
goals_plan = ints(path({0: 62, 11: 80}, 12, 0, 0))

crossdata_2025 = ints(path({0: 36, 11: 44}, 12, 0.4, 0))
crossdata_2026 = [46, 48, 51, 54, 56, 58, 60, 61]
crossdata_plan = ints(path({0: 45, 11: 70}, 12, 0, 0))

absent_2025 = [6.9, 6.4, 6.1, 5.8, 6.6, 7.9, 8.6, 8.4, 6.7, 6.2, 6.0, 7.1]
absent_2026 = [6.8, 6.3, 6.0, 5.9, 6.5, 7.8, 8.4, 8.1]


def tile(id_, group, title, unit, fmt, s25, s26, plan=None, good="down", status="none",
         status_text="", owner="", question="", ask="", page="", secondary=None,
         compare_label="", target=None, forecast=None, decimals=1, definition="",
         limit=None, axis=None):
    cur = s26[N26 - 1]
    prev_m = s26[N26 - 2]
    prev_y = s25[N26 - 1]
    plan_now = plan[N26 - 1] if plan else None
    return {
        "id": id_, "group": group, "title": title, "unit": unit, "fmt": fmt,
        "decimals": decimals, "definition": definition,
        "value": cur, "prev_month": prev_m, "prev_year": prev_y,
        "delta_mom": round(cur - prev_m, decimals), "delta_yoy": round(cur - prev_y, decimals),
        "plan_now": plan_now, "delta_plan": (round(cur - plan_now, decimals) if plan_now is not None else None),
        "target": target, "limit": limit, "compare_label": compare_label, "axis": axis,
        "series": {"y2025": s25, "y2026": s26, "plan": plan, "forecast": forecast},
        "good": good, "status": status, "status_text": status_text,
        "owner": owner, "question": question, "ask": ask, "page": page,
        "secondary": secondary or [],
    }


control_panel = [
    tile("hq_hc", "Численность и рост", "Численность HQ (управленческая)", "чел.", "int",
         hq_2025, hq_2026, plan=hq_plan, good="range", status="red",
         status_text="Вилка прогноза на декабрь 23 330–23 620 пересекает лимит 23 500",
         owner="Директор по персоналу HQ", page="headcount",
         question="Какие ~200 вакансий HQ снимаем или переносим на 2027, чтобы уложиться в лимит?",
         ask="→ HR HQ, финансы, руководители линий",
         compare_label="лимит на 31.12.2026 — 23 500", limit=23500, decimals=0,
         forecast={"runrate": hq_fc_runrate, "pipeline": hq_fc_pipeline},
         definition="Активная управленческая численность HQ на последний день месяца, без Авто-направления",
         secondary=[{"label": "прирост за месяц", "value": "+118"},
                    {"label": "прирост YTD", "value": "+790"},
                    {"label": "запас до лимита", "value": "570"}]),
    tile("attrition_hq", "Люди", "Текучесть HQ, годовая (скользящие 12 мес.)", "%", "pct",
         attr_2025, attr_2026, good="down", status="ok",
         status_text="Ниже прошлого года на 1,3 п.п., regrettable стабилен",
         owner="Директор по персоналу HQ", page="flow",
         question="За счёт чего снизилась текучесть — удержание или изменение структуры найма?",
         ask="→ HR HQ",
         definition="Ушедшие за 12 мес. / средняя численность за 12 мес.",
         secondary=[{"label": "regrettable", "value": "5,2%"},
                    {"label": "в процессе увольнения", "value": "143"}]),
    tile("attrition_mgr", "Люди", "Текучесть руководителей, годовая", "%", "pct",
         mgr_attr_2025, mgr_attr_2026, good="down", status="red",
         status_text="Ускоряется 6 месяцев подряд; 2/3 ушедших — Discovery Core и Other Digital",
         owner="HRBP направлений", page="flow",
         question="Что происходит с руководителями в Discovery Core: 11 уходов за квартал против 4 год назад?",
         ask="→ HRBP Discovery, руководитель направления",
         definition="Ушедшие руководители (head flag) за 12 мес. / среднее число руководителей",
         secondary=[{"label": "ушло в августе", "value": "9"},
                    {"label": "regrettable среди них", "value": "6"}]),
    tile("junior_share", "Люди", "Доля джунов в HQ", "%", "pct",
         junior_2025, junior_2026, plan=junior_plan, good="up", status="ok",
         status_text="+1,3 п.п. с начала года, до цели 20% осталось 1,1 п.п.",
         owner="Рекрутмент", page="hiring",
         question="Кто из направлений не берёт джунов вообще и почему?",
         ask="→ Рекрутмент, CTO office", target=20.0,
         compare_label="цель 20% к концу года",
         definition="Сотрудники грейдов junior / численность HQ",
         secondary=[{"label": "доля джунов в найме", "value": "31%"},
                    {"label": "текучесть джунов", "value": "16,0%"}]),
    tile("regional_share", "Люди", "Доля HQ вне Москвы", "%", "pct",
         region_2025, region_2026, plan=region_plan, good="up", status="ok",
         status_text="Идём по плану: +1,5 п.п. YTD, ТЦР РФ растут быстрее СПб",
         owner="Директор по персоналу HQ", page="headcount",
         question="Достаточно ли инфраструктуры в ТЦР под темп роста (+27% найма туда)?",
         ask="→ Региональное развитие", target=42.0, compare_label="цель 42% к концу года",
         definition="Сотрудники HQ с локацией вне Москвы / численность HQ",
         secondary=[{"label": "ТЦР РФ", "value": "19,3%"},
                    {"label": "СНГ и другие", "value": "8,0%"}]),
    tile("vacancy_rate", "Найм", "Недоукомплектованность HQ", "%", "pct",
         vacrate_2025, vacrate_2026, good="none", status="none",
         status_text="В коридоре 7–8% девятый месяц",
         owner="Рекрутмент", page="hiring",
         question="Какая доля из 720 замен реально нужна, если заменяемые ещё работают?",
         ask="→ Рекрутмент, HRBP",
         definition="Вакансии в работе / (вакансии + численность), без дублей «замена — заменяемый ещё работает»",
         secondary=[{"label": "вакансий в работе", "value": "1 850"},
                    {"label": "новые / замены / холд", "value": "980 / 720 / 150"}]),
    tile("overdue_vac", "Найм", "Вакансии старше 90 дней", "%", "pct",
         overdue_2025, overdue_2026, good="down", status="red", decimals=0,
         status_text="Растёт 6 месяцев подряд; 58% просроченных — senior SDE и ML",
         owner="Рекрутмент", page="hiring",
         question="Просроченные senior-вакансии: проблема рынка, зарплатных вилок или процесса?",
         ask="→ Рекрутмент, C&B", target=20, compare_label="цель ≤ 20%",
         definition="Вакансии в работе дольше 90 дней / все вакансии в работе",
         secondary=[{"label": "срок закрытия, медиана", "value": "58 дн."},
                    {"label": "отказы от офферов", "value": "14%"}]),
    tile("span_quasi", "Структура", "Руководители с командой < 4 человек", "%", "pct",
         quasi_2025, quasi_2026, plan=quasi_plan, good="down", status="amber",
         status_text="Снижается медленно: −1 п.п. за год при цели 15%",
         owner="Оргдизайн", page="management",
         question="612 квази-руководителей: сколько из них — «звание вместо денег»?",
         ask="→ Оргдизайн, C&B", target=15.0, compare_label="цель 15% к концу года",
         definition="Руководители по управленческой структуре с < 4 прямыми подчинёнными / все руководители",
         secondary=[{"label": "медианный span", "value": "5"},
                    {"label": "руководителей с > 10", "value": "298"}]),
    tile("risk_people", "Структура", "Сотрудники с рисками (DRAFT)", "%", "pct",
         risk_2025, risk_2026, good="down", status="amber",
         status_text="+0,8 п.п. с начала года; рост в основном за счёт риска выгорания",
         owner="People Analytics", page="productivity",
         question="Что делаем с 410 сотрудниками в риске выгорания — есть ли владелец процесса?",
         ask="→ HRBP, People Analytics",
         definition="Сотрудники хотя бы с одним активным риск-флагом в DRAFT / численность HQ",
         secondary=[{"label": "людей с рисками", "value": "1 240"},
                    {"label": "риск ухода / выгорания", "value": "520 / 410"}]),
    tile("ai_wau", "Продуктивность", "Еженедельно используют ИИ-инструменты", "%", "pct",
         ai_2025, ai_2026, plan=ai_plan, good="up", status="amber", decimals=0,
         status_text="+20 п.п. YTD, но темп замедлился: +2 п.п./мес. против +3 в I кв.",
         owner="CTO office", page="productivity",
         question="Почему дизайнеры и продакты (41–47%) отстают от разработки (78%)?",
         ask="→ CTO office, руководители Discovery", target=60, compare_label="цель 60% к концу года",
         definition="Сотрудники HQ, использовавшие профильные ИИ-инструменты ≥ 3 дней за неделю (среднее за месяц)",
         secondary=[{"label": "покрытие (есть доступ)", "value": "74%"},
                    {"label": "power-пользователи", "value": "9%"}]),
    tile("workload", "Продуктивность", "Сотрудники в зоне перегрузки", "%", "pct",
         overload_2025, overload_2026, good="down", status="amber",
         status_text="Растёт 5 месяцев; 31% руководителей перегружены встречами",
         owner="People Analytics", page="productivity",
         question="Перегрузка растёт вместе с найдом — где узкое место: онбординг или встречи?",
         ask="→ People Analytics, руководители направлений",
         definition="Сотрудники с признаками переработки по цифровым следам (> 20% сверх нормы 4 недели подряд)",
         secondary=[{"label": "недозагрузка", "value": "5,0%"},
                    {"label": "встречи > 50% недели", "value": "12%"}]),
    tile("refresh", "Результативность", "Refresh 5%: выполнение годового плана", "%", "pct",
         refresh_2025, refresh_2026, plan=refresh_plan, good="up", status="amber", decimals=0,
         status_text="58% при линейном плане 67%; решения приняты по 71% кейсов",
         owner="Директор по персоналу HQ", page="flow",
         question="Кто из направлений не начал refresh — и это выбор или бездействие?",
         ask="→ HRBP направлений", target=100, compare_label="линейный план на август — 67%", axis=[0, 100],
         definition="Закрытые кейсы программы Refresh 5% / годовой план (1 105 кейсов)",
         secondary=[{"label": "закрыто кейсов", "value": "640 / 1 105"},
                    {"label": "в работе", "value": "215"}]),
    tile("goal_coverage", "Результативность", "Покрытие индивидуальными целями", "%", "pct",
         goals_2025, goals_2026, plan=goals_plan, good="up", status="red", decimals=0,
         status_text="64% при цели 80%: рост остановился три месяца назад",
         owner="Performance-команда", page="productivity",
         question="Цели на II полугодие есть у 64% — как проводим ревью для остальных 36%?",
         ask="→ Performance-команда, HRBP", target=80, compare_label="цель 80%",
         definition="Сотрудники HQ с актуальными индивидуальными целями на период / численность HQ",
         secondary=[{"label": "юниты с целями СУП", "value": "88%"},
                    {"label": "люди в юнитах с целями", "value": "79%"}]),
    tile("crossdata_adoption", "Инфраструктура решений", "Руководители, использующие CrossData", "%", "pct",
         crossdata_2025, crossdata_2026, plan=crossdata_plan, good="up", status="ok", decimals=0,
         status_text="+17 п.п. YTD; топ-100 руководителей — 83%",
         owner="CrossData", page="crossdata",
         question="Какие решения руководители принимают без данных — что им не хватает в отчётах?",
         ask="→ CrossData", target=70, compare_label="цель 70% к концу года",
         definition="Руководители, открывавшие отчёты CrossData за месяц / все руководители",
         secondary=[{"label": "топ-100 руководителей", "value": "83%"},
                    {"label": "MAU всего", "value": "4 100"}]),
    tile("absenteeism", "Люди", "Абсентеизм (отпуска, больничные, прогулы)", "%", "pct",
         absent_2025, absent_2026, good="none", status="none",
         status_text="Сезонная норма: август 2025 — 8,4%",
         owner="HR-операции", page="headcount",
         question="", ask="",
         definition="Сотрудники в отпуске / на больничном / в прогуле в среднем за месяц / численность",
         secondary=[{"label": "в командировках", "value": "1,9%"},
                    {"label": "больничные", "value": "2,1%"}]),
]

# ----------------------------------------------------------------------------- 2. Численность
headcount = {
    "limit": 23500,
    "limit_note": "лимит на 31.12.2026, управленческая численность HQ без Авто-направления",
    "series": {"y2025": hq_2025, "y2026": hq_2026, "plan": hq_plan,
               "forecast_runrate": hq_fc_runrate, "forecast_pipeline": hq_fc_pipeline},
    "forecast": [
        {"id": "runrate", "label": "При текущем темпе (найм 308/мес., отток 225/мес.)",
         "dec": 23330, "vs_limit": -170, "status": "amber"},
        {"id": "pipeline", "label": "Если закрыть воронку в срок (412 офферов + 1 850 вакансий)",
         "dec": 23620, "vs_limit": 120, "status": "red"},
        {"id": "cap", "label": "Чтобы уложиться в лимит: не более ~1 400 внешних наймов за сен–дек, то есть примерно на 200 вакансий меньше",
         "dec": 23500, "vs_limit": 0, "status": "none"},
    ],
    "bridge_ytd": {
        "title": "Из чего сложился прирост HQ с начала года",
        "start_label": "31 дек 2025", "end_label": "31 авг 2026",
        "start": 22140, "end": 22930,
        "steps": [
            {"label": "Внешний найм", "value": 2465, "note": "308 в месяц, 31% — джуны"},
            {"label": "Стажёры → штат", "value": 96, "note": ""},
            {"label": "Переводы в HQ", "value": 84, "note": "из Support / Line / дочерних"},
            {"label": "Отток regret.", "value": -780, "note": "regrettable-отток"},
            {"label": "Отток non-regret.", "value": -1035, "note": "non-regrettable, включая refresh"},
            {"label": "Переводы из HQ", "value": -40, "note": "28 из 40 — в июле-августе", "flag": "amber"},
        ],
    },
    "bridge_forecast": {
        "title": "Прогноз до конца года: сценарий «воронка закрывается в срок»",
        "start_label": "31 авг 2026", "end_label": "31 дек 2026 (прогноз)",
        "start": 22930, "end": 23620,
        "steps": [
            {"label": "Принятые офферы", "value": 412, "note": "выход в сен–окт"},
            {"label": "Закрытие вакансий в работе", "value": 1108, "note": "60% из 1 850"},
            {"label": "Стажёры и переводы", "value": 70, "note": ""},
            {"label": "Ожидаемый отток", "value": -900, "note": "225 в месяц"},
        ],
        "limit": 23500,
    },
    "segments": [
        {"name": "HQ", "hc": 22930, "dec25": 22140, "plan_dec26": 23500, "forecast_dec26": 23620,
         "attrition": 12.1, "vacancies": 1850, "status": "red", "note": "лимит под угрозой"},
        {"name": "Support", "hc": 6080, "dec25": 6010, "plan_dec26": 6100, "forecast_dec26": 6120,
         "attrition": 21.0, "vacancies": 310, "status": "none", "note": "перевод 40 чел. из HQ"},
        {"name": "Line", "hc": 31200, "dec25": 30600, "plan_dec26": 31500, "forecast_dec26": 31400,
         "attrition": 47.0, "vacancies": 1420, "status": "none", "note": "массовый найм 92% плана"},
        {"name": "Итого управленческая", "hc": 60210, "dec25": 58750, "plan_dec26": 61100, "forecast_dec26": 61140,
         "attrition": None, "vacancies": 3580, "status": "none", "note": ""},
    ],
    "hq_split": [
        {"name": "Delivery Core", "hc": 11200, "dec25": 10780, "plan_dec26": 11300, "vacancies": 1010, "attrition": 11.4, "juniors": 22.0},
        {"name": "Discovery Core", "hc": 2900, "dec25": 2830, "plan_dec26": 2900, "vacancies": 240, "attrition": 14.8, "juniors": 12.5, "flag": "amber"},
        {"name": "Other IT", "hc": 3100, "dec25": 3010, "plan_dec26": 3150, "vacancies": 260, "attrition": 12.0, "juniors": 17.0},
        {"name": "Other Digital", "hc": 2400, "dec25": 2300, "plan_dec26": 2400, "vacancies": 190, "attrition": 13.9, "juniors": 15.2},
        {"name": "non-IT", "hc": 3330, "dec25": 3220, "plan_dec26": 3750, "vacancies": 150, "attrition": 10.6, "juniors": 20.4},
    ],
    "side_stats": [
        {"label": "Стажёры", "value": 410, "prev": 360, "prev_label": "дек 25", "fmt": "int"},
        {"label": "Подрядчики", "value": 2340, "prev": 2480, "prev_label": "дек 25", "fmt": "int",
         "note": "снижаются, пока HQ растёт — часть переведена в штат?"},
        {"label": "Неинтегрированные компании", "value": 1150, "prev": 1150, "prev_label": "дек 25", "fmt": "int"},
        {"label": "ТЦР РФ + ТЦР СНГ", "value": 5800, "prev": 5420, "prev_label": "дек 25", "fmt": "int"},
        {"label": "Юридическая численность, всего", "value": 64900, "prev": 63300, "prev_label": "дек 25", "fmt": "int"},
        {"label": "Переведено («перекрашено») из HQ, YTD", "value": 40, "prev": 12, "prev_label": "YTD 2025", "fmt": "int",
         "note": "28 из 40 — за июль-август", "flag": "amber"},
    ],
    "regions_hq": [
        {"name": "Москва", "share": 58.7, "dec25": 60.2},
        {"name": "Санкт-Петербург", "share": 14.0, "dec25": 13.9},
        {"name": "ТЦР РФ", "share": 19.3, "dec25": 18.0},
        {"name": "СНГ", "share": 6.0, "dec25": 5.9},
        {"name": "Другие", "share": 2.0, "dec25": 2.0},
    ],
    "questions": [
        {"q": "Лимит 23 500 достижим, только если по воронке нанять примерно на 120 человек меньше. Кто принимает решение о приоритизации 1 850 вакансий?", "to": "HR HQ, финансы"},
        {"q": "40 переводов из HQ в Support, 28 из них за два месяца: это реальные изменения функций или способ обойти лимит?", "to": "HRBP, оргдизайн"},
        {"q": "non-IT растёт на 110 чел. при плане +530 — план завышен или найм отстаёт?", "to": "Руководители корпоративных функций"},
    ],
    "comment": ("HQ выросла на 790 человек с начала года и идёт чуть выше плановой траектории. "
                "Формально запас до лимита — 570 человек, но воронка найма (412 принятых офферов и 1 850 вакансий "
                "в работе) при обычной конверсии даёт 23 620 к декабрю. Чтобы уложиться, в сентябре–декабре можно "
                "сделать не более ~1 400 внешних наймов вместо ~1 520 по воронке — это примерно 200 вакансий, которые надо снять или перенести."),
    "links": [{"label": "Численность и вакансии (CrossData)", "href": "#"},
              {"label": "План по численности 2026", "href": "#"}],
}

# ----------------------------------------------------------------------------- 3. Найм и вакансии
months13 = ["авг 25", "сен", "окт", "ноя", "дек", "янв 26", "фев", "мар", "апр", "май", "июн", "июл", "авг"]
vac_new = ints(path({0: 1180, 4: 1120, 8: 1080, 12: 980}, 13, 15, 0))
vac_repl = ints(path({0: 540, 4: 560, 8: 640, 12: 720}, 13, 10, 0))
vac_hold = ints(path({0: 110, 12: 150}, 13, 8, 0))
closed_m = ints(path({0: 250, 2: 330, 4: 210, 5: 190, 7: 300, 9: 320, 11: 290, 12: 298}, 13, 12, 0))
opened_m = ints(path({0: 280, 4: 200, 7: 310, 12: 256}, 13, 12, 0))
ttf = ints(path({0: 52, 4: 53, 8: 55, 12: 58}, 13, 1, 0))
decline = path({0: 11, 8: 12, 12: 14}, 13, 0.3, 0)

hiring = {
    "kpis": [
        {"label": "Открыто в августе", "value": "256", "sub": "закрыто 298", "status": "none"},
        {"label": "В работе", "value": "1 850", "sub": "новые 980 · замены 720 · холд 150", "status": "none"},
        {"label": "Срок закрытия, медиана", "value": "58 дн.", "sub": "2025: 52 дн.", "status": "amber"},
        {"label": "Старше 90 дней", "value": "27%", "sub": "цель ≤ 20%", "status": "red"},
        {"label": "Отказы от офферов", "value": "14%", "sub": "2025: 11%", "status": "amber"},
        {"label": "На офферах", "value": "412", "sub": "выход в сен–окт", "status": "none"},
        {"label": "Найм с sign-on", "value": "9%", "sub": "2025: 6%", "status": "amber"},
        {"label": "Найм с CR > 100", "value": "12%", "sub": "2025: 9%", "status": "amber"},
        {"label": "Закрыто джунами", "value": "31%", "sub": "открыто на джунов 22%", "status": "ok"},
        {"label": "Массовый найм (TRS), план/факт", "value": "92%", "sub": "открыто 1 420 · закрыто 3 210 YTD", "status": "none"},
    ],
    "months": months13,
    "vacancies_stack": {"new": vac_new, "replacement": vac_repl, "hold": vac_hold},
    "closed": closed_m, "opened": opened_m, "ttf": ttf, "decline": decline,
    "replacement_status": {
        "title": "Вакансии на замену: что с заменяемым сотрудником",
        "total": 720,
        "items": [
            {"name": "Заменяемый уволен", "share": 41, "count": 295},
            {"name": "Заменяемый на увольнении", "share": 22, "count": 158},
            {"name": "Заменяемый работает", "share": 18, "count": 130, "flag": "amber"},
            {"name": "Замена закрыта, заменяемый работает", "share": 11, "count": 79, "flag": "red"},
            {"name": "Неизвестно", "share": 8, "count": 58},
        ],
        "comment": "79 замен уже закрыты, а «заменяемые» продолжают работать — это скрытый рост численности на ~80 человек.",
    },
    "same_profile": {"share_same_unit": 58, "share_other_unit": 42,
                     "comment": "42% замен закрываются не в тех юнитах, где заведены: перетоки в новые проекты идут через «замены»"},
    "interns": {"active": 410, "requests_active": 138, "converted_ytd": 96, "converted_prev_ytd": 71},
    "questions": [
        {"q": "Просроченные senior-вакансии SDE и ML: рынок, вилки или процесс? Что покажет разбор 20 самых старых?", "to": "Рекрутмент, C&B"},
        {"q": "Доля замен в вакансиях выросла с 33% до 39%, а 11% замен закрыты при работающем «заменяемом». Кто контролирует дубли?", "to": "Рекрутмент, HRBP"},
        {"q": "Отказы от офферов 14% и рост sign-on до 9%: мы проигрываем по деньгам или по скорости?", "to": "Рекрутмент, C&B"},
    ],
    "comment": ("Воронка найма работает на прежней мощности (около 300 закрытий в месяц), но стареет: доля вакансий старше "
                "90 дней выросла с 21% до 27%, и это почти целиком senior-позиции в разработке и ML. Одновременно растёт "
                "цена найма — отказы от офферов 14%, каждый девятый найм с sign-on. Структура найма сдвигается в регионы "
                "и в джунов — это по плану."),
    "links": [{"label": "Вакансии HRS — детальный отчёт", "href": "#"},
              {"label": "Воронка найма по направлениям", "href": "#"},
              {"label": "Массовый найм (TRS)", "href": "#"}],
}

# ----------------------------------------------------------------------------- 4. Движение людей
leavers_m = ints(path({0: 236, 2: 262, 4: 205, 5: 190, 7: 225, 9: 230, 11: 228, 12: 232}, 13, 8, 0))
leavers_regr = [int(round(x * 0.43)) for x in leavers_m]

flow = {
    "kpis": [
        {"label": "Текучесть HQ, годовая", "value": "12,1%", "sub": "2025: 13,4%", "status": "ok"},
        {"label": "Regrettable", "value": "5,2%", "sub": "non-regrettable 6,9%", "status": "none"},
        {"label": "Текучесть руководителей", "value": "9,8%", "sub": "2025: 7,1%", "status": "red"},
        {"label": "Текучесть джунов", "value": "16,0%", "sub": "2025: 17,2%", "status": "none"},
        {"label": "Текучесть талантов (top-talent)", "value": "6,1%", "sub": "2025: 5,8%", "status": "amber"},
        {"label": "В процессе увольнения", "value": "143", "sub": "из них 51 regrettable", "status": "none"},
        {"label": "Support: текучесть / закрепляемость 90 дн.", "value": "21% / 82%", "sub": "2025: 23% / 80%", "status": "ok"},
        {"label": "Line: текучесть / закрепляемость 90 дн.", "value": "47% / 71%", "sub": "2025: 49% / 69%", "status": "none"},
    ],
    "months": months13,
    "leavers": leavers_m, "leavers_regrettable": leavers_regr,
    "attrition_series": {"y2025": attr_2025, "y2026": attr_2026, "regr2025": regr_2025, "regr2026": regr_2026},
    "talent_actions": [
        {"label": "Ротации", "value": 143, "sub": "YTD · в августе 21", "prev": "YTD 2025: 118", "status": "ok"},
        {"label": "Вакансии по причине ротации", "value": 88, "sub": "YTD", "prev": "YTD 2025: 70", "status": "none"},
        {"label": "Заявки на рост", "value": 1380, "sub": "одобрено 72%", "prev": "2025: 68%", "status": "none"},
        {"label": "Промоушены", "value": 1010, "sub": "YTD · в августе 84", "prev": "TAT 34 дн. (цель 30)", "status": "amber"},
        {"label": "Стажёры → штат", "value": 96, "sub": "YTD", "prev": "YTD 2025: 71", "status": "ok"},
        {"label": "Refresh 5%", "value": "640 / 1 105", "sub": "58% плана", "prev": "линейный план 67%", "status": "amber"},
    ],
    "attrition_by_stream": {
        "title": "Отток HQ по стримам за 12 мес., руководители отдельно",
        "columns": ["Стрим", "Ушло", "Текучесть", "Regrettable", "Non-regrettable", "Δ к 2025, п.п."],
        "rows": [
            {"name": "SDE", "left": 905, "rate": 11.5, "regr": 5.1, "nonregr": 6.4, "delta": -1.6},
            {"name": "QA", "left": 205, "rate": 12.6, "regr": 4.9, "nonregr": 7.7, "delta": -0.9},
            {"name": "SA", "left": 76, "rate": 10.7, "regr": 4.8, "nonregr": 5.9, "delta": -0.4},
            {"name": "Продакты", "left": 96, "rate": 15.2, "regr": 7.9, "nonregr": 7.3, "delta": 2.1, "flag": "amber"},
            {"name": "Аналитики и data", "left": 172, "rate": 12.3, "regr": 5.6, "nonregr": 6.7, "delta": -0.5},
            {"name": "ML", "left": 62, "rate": 13.8, "regr": 8.1, "nonregr": 5.7, "delta": 1.4, "flag": "amber"},
            {"name": "Дизайнеры", "left": 78, "rate": 12.9, "regr": 6.2, "nonregr": 6.7, "delta": 0.2},
            {"name": "Редакторы", "left": 42, "rate": 12.7, "regr": 4.5, "nonregr": 8.2, "delta": -2.0},
            {"name": "Проджекты", "left": 71, "rate": 13.2, "regr": 5.0, "nonregr": 8.2, "delta": 0.1},
            {"name": "Руководители (все стримы)", "left": 285, "rate": 9.8, "regr": 6.4, "nonregr": 3.4, "delta": 2.7, "flag": "red"},
            {"name": "Прочие HQ", "left": 748, "rate": 11.2, "regr": 4.1, "nonregr": 7.1, "delta": -1.8},
        ],
    },
    "questions": [
        {"q": "Текучесть руководителей 9,8% против 7,1% год назад, две трети — Discovery Core и Other Digital. Что показали exit-интервью?", "to": "HRBP направлений"},
        {"q": "Причина «руководитель / команда» выросла с 12% до 16% оттока. В каких юнитах концентрируется?", "to": "HRBP, People Analytics"},
        {"q": "Промоушены: TAT 34 дня при цели 30, заявок на рост +18%. Успеваем ли к осеннему ревью?", "to": "Performance-команда"},
    ],
    "comment": ("Общая текучесть HQ снижается второй год (12,1% против 13,4%), но за средним прячется главный сигнал месяца: "
                "уходят руководители — 9,8% годовых, ускорение шесть месяцев подряд. Среди причин ухода растут «руководитель / "
                "команда» и «выгорание», падают «компенсация» и «релокация». Ротации и промоушены идут быстрее прошлого года, "
                "Refresh 5% — медленнее плана."),
    "links": [{"label": "Отток и риски (CrossData)", "href": "#"},
              {"label": "Exit-интервью: сводка", "href": "#"},
              {"label": "Ротации и промоушены", "href": "#"}],
}

# ----------------------------------------------------------------------------- 5. Профессии
def prof(name, hc, dec25, mom, attr, regr, vac_new_, vac_rep, juniors, overdue, ai, flag="", note=""):
    understaff = round(100 * (vac_new_ + vac_rep) / (vac_new_ + vac_rep + hc), 1)
    spark = ints(path({0: dec25 - (hc - dec25) * 0.6, 4: dec25, 12: hc}, 13, max(2, hc * 0.002), 0))
    spark[-1] = hc
    return {"name": name, "hc": hc, "dec25": dec25, "delta_ytd": hc - dec25, "delta_mom": mom,
            "attrition": attr, "regrettable": regr, "vac_new": vac_new_, "vac_repl": vac_rep,
            "understaff": understaff, "juniors": juniors, "overdue": overdue, "ai_wau": ai,
            "flag": flag, "note": note, "spark": spark}


professions = {
    "rows": [
        prof("SDE", 7900, 7580, 46, 11.5, 5.1, 470, 300, 24.1, 31, 78, note="просроченные — senior"),
        prof("QA", 1650, 1610, 5, 12.6, 4.9, 60, 55, 27.5, 18, 61),
        prof("SA (системные аналитики)", 720, 700, 3, 10.7, 4.8, 35, 25, 19.0, 22, 55),
        prof("Продакты", 640, 625, 4, 15.2, 7.9, 40, 38, 8.1, 29, 47, flag="amber", note="отток и регреттабл выше среднего"),
        prof("Технологи", 380, 372, 1, 9.8, 3.9, 12, 14, 14.2, 15, 44),
        prof("Продуктовые аналитики", 520, 500, 6, 12.0, 5.5, 34, 22, 21.0, 19, 66),
        prof("Остальные аналитики + data", 890, 860, 7, 12.5, 5.7, 44, 36, 18.8, 21, 60),
        prof("ML", 460, 420, 8, 13.8, 8.1, 52, 20, 17.4, 39, 81, flag="red", note="39% вакансий старше 90 дн."),
        prof("Дизайнеры", 610, 600, 2, 12.9, 6.2, 22, 24, 15.1, 20, 41, note="низкое использование ИИ"),
        prof("Редакторы", 330, 335, -1, 12.7, 4.5, 8, 12, 12.7, 12, 68),
        prof("Проджекты", 540, 528, 3, 13.2, 5.0, 26, 22, 10.2, 17, 52),
        prof("Прочие HQ", 8290, 8010, 34, 11.2, 4.1, 177, 152, 17.5, 24, 38),
    ],
    "ratios": [
        {"name": "SDE / QA", "value": 4.8, "dec25": 4.7, "target": "4–6", "status": "ok",
         "spark": path({0: 4.6, 12: 4.8}, 13, 0.03, 2)},
        {"name": "SDE / SA", "value": 11.0, "dec25": 10.8, "target": "8–12", "status": "ok",
         "spark": path({0: 10.7, 12: 11.0}, 13, 0.05, 2)},
        {"name": "(TL + руководители) / (SDE + QA + SA)", "value": 0.14, "dec25": 0.15, "target": "≤ 0.15", "status": "ok",
         "spark": path({0: 0.15, 12: 0.14}, 13, 0.002, 3)},
        {"name": "Discovery / Delivery", "value": 0.26, "dec25": 0.26, "target": "0.25–0.30", "status": "ok",
         "spark": path({0: 0.26, 12: 0.26}, 13, 0.003, 3)},
        {"name": "Продуктовые аналитики / Продакты", "value": 0.81, "dec25": 0.80, "target": "0.7–1.0", "status": "ok",
         "spark": path({0: 0.79, 12: 0.81}, 13, 0.005, 3)},
    ],
    "questions": [
        {"q": "ML: 39% вакансий старше 90 дней при regrettable-оттоке 8,1%. Мы конкурентны по деньгам в ML или нет?", "to": "C&B, руководитель ML"},
        {"q": "Продакты: текучесть 15,2% и regrettable 7,9% — самые высокие среди профессий. Связано ли это с оттоком руководителей Discovery?", "to": "HRBP Discovery"},
        {"q": "Дизайнеры используют ИИ-инструменты вдвое реже разработки (41% против 78%). Нет инструментов или нет практики?", "to": "CTO office, руководитель дизайна"},
    ],
    "comment": ("Пропорции профессий стабильны (SDE/QA 4,8; SDE/SA 11,0; Discovery/Delivery 0,26) — структурных перекосов нет. "
                "Внимания требуют два сегмента: ML (просроченные вакансии и высокий regrettable) и продакты (самая высокая "
                "текучесть). Разработка растёт по плану и хорошо адаптирует ИИ-инструменты."),
    "links": [{"label": "Профессии и специализации — детальный отчёт", "href": "#"}],
}

# ----------------------------------------------------------------------------- 6. Линии бизнеса (КП) — опционально, v2
lines = {
    "note": "Опциональный блок (v2): нужен, если будет таргет прироста по линиям. Проверить, не дублирует ли существующий отчёт.",
    "rows": [
        {"name": "Маркетплейс", "hc": 4810, "delta_ytd": 230, "plan_ytd": 210, "vacancies": 420, "attrition": 12.4, "overdue": 24, "lowperf": 4.9, "status": "none"},
        {"name": "Логистика", "hc": 2950, "delta_ytd": 145, "plan_ytd": 120, "vacancies": 260, "attrition": 13.1, "overdue": 31, "lowperf": 5.6, "status": "amber"},
        {"name": "Финтех", "hc": 3120, "delta_ytd": 190, "plan_ytd": 160, "vacancies": 310, "attrition": 11.2, "overdue": 22, "lowperf": 4.1, "status": "amber"},
        {"name": "Реклама и поиск", "hc": 2480, "delta_ytd": 40, "plan_ytd": 60, "vacancies": 150, "attrition": 10.8, "overdue": 19, "lowperf": 5.2, "status": "none"},
        {"name": "Облако и данные", "hc": 2210, "delta_ytd": 95, "plan_ytd": 90, "vacancies": 180, "attrition": 12.9, "overdue": 35, "lowperf": 3.8, "status": "amber"},
        {"name": "Медиа и развлечения", "hc": 1640, "delta_ytd": 15, "plan_ytd": 30, "vacancies": 90, "attrition": 14.6, "overdue": 26, "lowperf": 6.1, "status": "amber"},
        {"name": "Мобильность", "hc": 1520, "delta_ytd": 35, "plan_ytd": 40, "vacancies": 110, "attrition": 12.2, "overdue": 21, "lowperf": 4.4, "status": "none"},
        {"name": "Платформа и инфраструктура", "hc": 2600, "delta_ytd": 30, "plan_ytd": 20, "vacancies": 190, "attrition": 9.9, "overdue": 28, "lowperf": 4.0, "status": "none"},
        {"name": "Корпоративные функции", "hc": 1600, "delta_ytd": 10, "plan_ytd": 60, "vacancies": 140, "attrition": 10.1, "overdue": 18, "lowperf": 5.0, "status": "none"},
    ],
    "links": [{"label": "Карта команд по КП", "href": "#"}],
}

# ----------------------------------------------------------------------------- 7. Структура и управляемость
management = {
    "kpis": [
        {"label": "Руководителей (head flag)", "value": "2 950", "sub": "дек 25: 2 905", "status": "none"},
        {"label": "IC на одного руководителя", "value": "6,8", "sub": "дек 25: 6,6", "status": "ok"},
        {"label": "Медианная норма управляемости", "value": "5", "sub": "среднее 6,8", "status": "none"},
        {"label": "Квази-руководители (< 4)", "value": "612 · 21%", "sub": "цель 15%", "status": "amber"},
        {"label": "Перегруженные (> 10)", "value": "298 · 10%", "sub": "дек 25: 9%", "status": "none"},
        {"label": "Новых руководителей (стали в периоде)", "value": "41", "sub": "YTD 214 · новых юнитов 57", "status": "amber"},
        {"label": "Нанятых руководителей", "value": "12", "sub": "YTD 63", "status": "none"},
        {"label": "Текучесть руководителей", "value": "9,8%", "sub": "2025: 7,1%", "status": "red"},
        {"label": "Уровней управления (макс. / средн.)", "value": "8 / 5,6", "sub": "цель ≤ 7 / 5,0", "status": "amber"},
    ],
    "span_hist": {
        "title": "Распределение руководителей по размеру команды",
        "bins": ["1–2", "3", "4–6", "7–10", "11–15", "16+"],
        "now": [240, 372, 1310, 730, 218, 80],
        "dec25": [268, 385, 1260, 700, 212, 80],
    },
    "layers": {
        "title": "Сотрудники HQ по глубине уровня от исполнительного директора",
        "levels": ["2", "3", "4", "5", "6", "7", "8"],
        "share": [0.3, 3.1, 14.2, 31.5, 33.9, 14.1, 2.9],
        "share_dec25": [0.3, 3.0, 13.8, 30.6, 33.5, 15.3, 3.5],
    },
    "segments": [
        {"name": "Delivery Core", "managers": 1480, "span_med": 6, "quasi": 16, "overloaded": 11, "mgr_attrition": 8.1, "new_mgrs": 98},
        {"name": "Discovery Core", "managers": 420, "span_med": 4, "quasi": 33, "overloaded": 4, "mgr_attrition": 15.6, "new_mgrs": 41, "flag": "red"},
        {"name": "Other IT", "managers": 380, "span_med": 5, "quasi": 22, "overloaded": 9, "mgr_attrition": 9.0, "new_mgrs": 27},
        {"name": "Other Digital", "managers": 310, "span_med": 5, "quasi": 25, "overloaded": 7, "mgr_attrition": 13.2, "new_mgrs": 24, "flag": "amber"},
        {"name": "non-IT", "managers": 360, "span_med": 5, "quasi": 20, "overloaded": 14, "mgr_attrition": 7.4, "new_mgrs": 24},
    ],
    "questions": [
        {"q": "В Discovery Core треть руководителей управляет командой меньше 4 человек, а их текучесть 15,6%. Это структура или роль «руководитель без команды»?", "to": "Оргдизайн, HRBP Discovery"},
        {"q": "214 новых руководителей с начала года при 63 нанятых: рост числа юнитов (57) обгоняет рост численности. Кто согласует новые юниты?", "to": "Оргдизайн"},
        {"q": "298 руководителей с командой больше 10 — среди них 41 с больше 16. Есть ли план делайеринга снизу?", "to": "Оргдизайн"},
    ],
    "comment": ("Структура становится чуть здоровее: квази-руководителей стало меньше на 41, глубина иерархии сократилась. "
                "Но 21% руководителей по-прежнему управляют командой меньше 4 человек, и новых юнитов создаётся больше, чем "
                "нанимается руководителей. Аномалия — Discovery Core: самый мелкий span, самая высокая текучесть руководителей."),
    "links": [{"label": "Оргструктура и норма управляемости", "href": "#"}],
}

# ----------------------------------------------------------------------------- 8. Продуктивность, ИИ, нагрузка, риски
productivity = {
    "ai": {
        "kpis": [
            {"label": "Покрытие (есть доступ)", "value": "74%", "sub": "дек 25: 52%", "status": "ok"},
            {"label": "Еженедельно активны (WAU)", "value": "51%", "sub": "цель 60%", "status": "amber"},
            {"label": "Power-пользователи (ежедневно)", "value": "9%", "sub": "2 060 чел.", "status": "none"},
            {"label": "SDE с низким git-скором", "value": "6,4%", "sub": "312 чел. · дек 25: 7,9%", "status": "amber"},
        ],
        "by_stream": [
            {"name": "SDE", "wau": 78, "coverage": 94},
            {"name": "ML", "wau": 81, "coverage": 96},
            {"name": "Редакторы", "wau": 68, "coverage": 88},
            {"name": "Аналитики", "wau": 63, "coverage": 85},
            {"name": "QA", "wau": 61, "coverage": 90},
            {"name": "SA", "wau": 55, "coverage": 84},
            {"name": "Проджекты", "wau": 52, "coverage": 70},
            {"name": "Продакты", "wau": 47, "coverage": 76},
            {"name": "Дизайнеры", "wau": 41, "coverage": 69},
            {"name": "Прочие HQ", "wau": 38, "coverage": 58},
        ],
        "wau_series": {"y2025": ai_2025, "y2026": ai_2026, "plan": ai_plan},
    },
    "meetings": {
        "kpis": [
            {"label": "Встречи > 50% рабочей недели", "value": "12%", "sub": "руководители 31% · IC 8%", "status": "amber"},
            {"label": "Массовые встречи (≥ 100 чел.), август", "value": "38", "sub": "14 тыс. человеко-часов", "status": "none"},
            {"label": "Четверговая, онлайн-аудитория", "value": "6 900", "sub": "30% HQ · июль 7 400", "status": "none"},
            {"label": "Комитеты: число / участники / часы", "value": "62 / 1 150 / 3 400", "sub": "оценка за месяц", "status": "none"},
        ],
        "overload_series": {"y2025": overload_2025, "y2026": overload_2026},
        "overload_by_role": [
            {"name": "Руководители", "share": 31, "dec25": 27},
            {"name": "IC", "share": 8, "dec25": 7},
        ],
    },
    "workload": {
        "title": "Численность HQ по зонам нагрузки (цифровые следы)",
        "items": [
            {"name": "Норма", "share": 82.0, "dec25": 84.5},
            {"name": "Перегрузка", "share": 9.1, "dec25": 7.2, "flag": "amber"},
            {"name": "Недозагрузка", "share": 5.0, "dec25": 4.8},
            {"name": "Нет данных", "share": 3.9, "dec25": 3.5},
        ],
    },
    "risks": {
        "total": 1240, "share": 5.4, "dec25_share": 4.6,
        "items": [
            {"name": "Риск ухода", "count": 520, "dec25": 470},
            {"name": "Риск выгорания", "count": 410, "dec25": 290, "flag": "amber"},
            {"name": "Низкая вовлечённость", "count": 310, "dec25": 300},
        ],
        "series": {"y2025": risk_2025, "y2026": risk_2026},
    },
    "office": {
        "kpis": [
            {"label": "Посещаемость офиса, HQ Москва", "value": "49%", "sub": "средненедельная · июль 44%", "status": "none"},
            {"label": "Посещаемость офиса, ТЦР", "value": "44%", "sub": "июль 41%", "status": "none"},
        ],
    },
    "goals": {
        "kpis": [
            {"label": "Юниты с целями в СУП", "value": "88%", "sub": "дек 25: 84%", "status": "ok"},
            {"label": "Люди в юнитах с целями", "value": "79%", "sub": "дек 25: 74%", "status": "ok"},
            {"label": "Индивидуальные цели на период", "value": "64%", "sub": "цель 80%", "status": "red"},
        ],
        "actuality": [
            {"name": "Актуальные, обновляются", "share": 61, "dec25": 55},
            {"name": "Актуальные, без обновлений > 60 дн.", "share": 22, "dec25": 24},
            {"name": "Устаревшие", "share": 12, "dec25": 15},
            {"name": "Нет целей", "share": 5, "dec25": 6},
        ],
    },
    "questions": [
        {"q": "Перегрузка растёт вместе с найдом (9,1% против 7,2%), особенно у руководителей. Это онбординг, встречи или недобор?", "to": "People Analytics, руководители направлений"},
        {"q": "312 SDE с низким git-скором: кто они — архитекторы и лиды или реальная недозагрузка?", "to": "CTO office"},
        {"q": "Индивидуальные цели есть у 64%, рост остановился. Что будет базой для осеннего ревью у остальных?", "to": "Performance-команда"},
    ],
    "comment": ("ИИ-инструменты стали нормой в разработке (78% WAU у SDE, 81% у ML), но не в дискавери и дизайне (41–47%). "
                "Нагрузка растёт: 9,1% сотрудников в зоне перегрузки, у руководителей — каждый третий перегружен встречами. "
                "Риски по DRAFT выросли за счёт выгорания (+120 человек с декабря). Цели: юниты покрыты хорошо, "
                "индивидуальные цели застряли на 64%."),
    "links": [{"label": "ИИ-инструменты: адопшен", "href": "#"},
              {"label": "Нагрузка и цифровые следы", "href": "#"},
              {"label": "DRAFT: риски", "href": "#"},
              {"label": "Цели СУП", "href": "#"}],
}

# ----------------------------------------------------------------------------- 9. Инфраструктура решений (CrossData)
crossdata = {
    "kpis": [
        {"label": "Руководители в CrossData (MAU)", "value": "61%", "sub": "цель 70% · дек 25: 44%", "status": "ok"},
        {"label": "Топ-100 руководителей", "value": "83%", "sub": "июль 79%", "status": "ok"},
        {"label": "Аудитория за месяц", "value": "4 100", "sub": "из них 1 800 руководителей", "status": "none"},
        {"label": "HR-копилот: MAU / вопросов", "value": "1 900 / 12 400", "sub": "оценка ответов 4,3 / 5", "status": "none"},
    ],
    "by_level": [
        {"name": "C-1", "share": 92}, {"name": "C-2", "share": 78}, {"name": "C-3", "share": 61}, {"name": "Остальные руководители", "share": 52},
    ],
    "top_reports": [
        {"name": "Численность и вакансии", "mau": 1420, "prev": 1310},
        {"name": "Панель руководителя", "mau": 1180, "prev": 940},
        {"name": "Отток и риски", "mau": 760, "prev": 720},
        {"name": "Найм HRS", "mau": 690, "prev": 700},
        {"name": "Цели СУП", "mau": 540, "prev": 380},
    ],
    "adoption_series": {"y2025": crossdata_2025, "y2026": crossdata_2026, "plan": crossdata_plan},
    "whats_new": [
        "«Панель руководителя 2.0»: риски команды и нагрузка в одном экране — 940 → 1 180 MAU за месяц",
        "HR-копилот отвечает на вопросы по численности и вакансиям в мессенджере — 12 400 вопросов в августе",
        "Пилот отчёта «Норма управляемости» для 5 направлений — выход на всех руководителей в октябре",
    ],
    "questions": [
        {"q": "39% руководителей не открывают отчёты. Каких решений они не принимают на данных — или где данные им не нужны?", "to": "CrossData, HRBP"},
    ],
    "comment": "Каждый месяц отчёт открывают всё больше руководителей; самый быстрый рост — у «Панели руководителя 2.0» и целей СУП.",
    "links": [{"label": "Аналитика использования CrossData", "href": "#"}],
}

# ----------------------------------------------------------------------------- 10. Слопы (изменение структуры)
slopes = [
    slope("hires_region", "Закрытые вакансии HQ по регионам", [
        ("Москва", 52, 46), ("ТЦР РФ", 22, 27, "рост найма в регионах — по плану"),
        ("Санкт-Петербург", 15, 16), ("СНГ", 8, 9), ("Другие", 3, 2)],
        subtitle="доля закрытых за месяц, %", comment="Найм смещается в ТЦР: +5 п.п. за 8 месяцев. Регионализация идёт быстрее плана.",
        priority=2, page="hiring", source="HRS"),
    slope("hires_seniority", "Закрытые вакансии HQ по seniority", [
        ("Junior", 26, 31, "цель — 30%+"), ("Middle", 48, 45), ("Senior", 20, 19), ("Lead и выше", 6, 5)],
        subtitle="доля закрытых за месяц, %", comment="Доля джунов в найме выросла до 31% — цель по джунизации достигнута в найме, теперь вопрос удержания.",
        priority=3, page="hiring", source="HRS"),
    slope("hires_channel", "Закрытые вакансии HQ по каналам", [
        ("Прямой поиск", 44, 41), ("Отклики", 25, 24), ("Рефералы", 18, 22, "растёт: реферальная программа"),
        ("Стажёры → штат", 4, 6), ("Агентства", 6, 4), ("Внутренние переводы", 3, 3)],
        subtitle="доля закрытых за месяц, %", comment="Рефералы +4 п.п., агентства −2 п.п.: найм дешевеет по каналам, но дорожает по офферам.",
        priority=4, page="hiring", source="HRS"),
    slope("vac_new_repl", "Вакансии HQ в работе: новые и замены", [
        ("Новые позиции", 67, 61), ("Замены", 33, 39, "каждая пятая замена — при работающем сотруднике")],
        subtitle="доля вакансий в работе, %", comment="Замены растут быстрее новых позиций. Часть «замен» — скрытый рост: заменяемые продолжают работать.",
        priority=1, page="hiring", source="HRS"),
    slope("vac_age", "Вакансии HQ в работе по сроку жизни", [
        ("До 30 дней", 38, 30), ("30–90 дней", 41, 43), ("Старше 90 дней", 21, 27, "58% — senior SDE и ML")],
        subtitle="доля вакансий в работе, %", comment="Воронка стареет: свежих вакансий меньше, просроченных больше. Проблема сконцентрирована в senior-разработке и ML.",
        priority=1, page="hiring", source="HRS"),
    slope("vac_segments", "Вакансии HQ в работе по стримам", [
        ("SDE", 46, 44), ("Аналитики и data", 9, 10), ("QA", 8, 7), ("Продакты", 6, 8, "+2 п.п.: замены после оттока"),
        ("ML", 5, 7, "+2 п.п."), ("SA", 5, 5), ("Дизайн", 4, 4), ("Прочие", 17, 15)],
        subtitle="доля вакансий в работе, %", comment="Спрос смещается к продактам и ML — обе профессии одновременно теряют людей.",
        priority=3, page="hiring", source="HRS"),
    slope("vac_lines", "Вакансии HQ в работе по линиям (КП)", [
        ("Маркетплейс", 23, 23), ("Финтех", 16, 17), ("Логистика", 13, 14), ("Платформа и инфра", 11, 10),
        ("Облако и данные", 10, 10), ("Реклама и поиск", 9, 8), ("Корп. функции", 7, 8), ("Мобильность", 6, 6), ("Медиа", 5, 4)],
        subtitle="доля вакансий в работе, %", comment="Распределение по линиям стабильно — переток спроса между линиями не наблюдается.",
        priority=9, page="hiring", source="HRS", threshold=2.0),
    slope("vac_priority_lines", "Вакансии в топ-приоритете по линиям (КП)", [
        ("Финтех", 22, 29, "новые приоритетные проекты"), ("Маркетплейс", 27, 25), ("Логистика", 14, 15),
        ("Облако и данные", 12, 11), ("Платформа и инфра", 10, 8), ("Прочие", 15, 12)],
        subtitle="доля вакансий с высшим приоритетом, %", comment="Приоритет смещается в Финтех: +7 п.п. — совпадает с планом запуска новых продуктов в IV квартале.",
        priority=5, page="hiring", source="HRS"),
    slope("hrs_reason", "Новые заявки HRS по причине поиска", [
        ("Новая позиция (рост)", 55, 47), ("Замена: увольнение", 28, 33, "рост"), ("Замена: ротация", 7, 9),
        ("Замена: декрет / длительное отсутствие", 6, 7), ("Другое", 4, 4)],
        subtitle="доля новых заявок за месяц, %", comment="Новых позиций заводят меньше, замен — больше: рост переключается на поддержание численности.",
        priority=2, page="hiring", source="HRS"),
    slope("attr_reason_hq", "Отток HQ по причинам", [
        ("Компенсация", 31, 27), ("Карьера и развитие", 22, 24), ("Руководитель / команда", 12, 16, "+4 п.п. — главный сигнал"),
        ("Личные обстоятельства", 12, 11), ("Релокация", 9, 7), ("Выгорание / нагрузка", 8, 10, "растёт вместе с перегрузкой"), ("Другое", 6, 5)],
        subtitle="доля ушедших за месяц, %", comment="Люди уходят реже из-за денег и чаще из-за руководителя и нагрузки. Это управляемые причины — и они растут.",
        priority=1, page="flow", source="Exit-интервью, HRS"),
    slope("attr_reason_support", "Отток Support по причинам", [
        ("Компенсация", 36, 35), ("График и нагрузка", 24, 25), ("Карьера", 14, 14), ("Руководитель / команда", 10, 11),
        ("Личные обстоятельства", 11, 10), ("Другое", 5, 5)],
        subtitle="доля ушедших за месяц, %", comment="Структура причин в Support стабильна.",
        priority=9, page="flow", source="Exit-интервью"),
    slope("attr_seniority", "Отток HQ по seniority, руководители отдельно", [
        ("Junior", 24, 26), ("Middle", 42, 40), ("Senior", 22, 21), ("Руководители", 8, 11, "+3 п.п.: regrettable 6 из 9 в августе"), ("Lead (IC)", 4, 2)],
        subtitle="доля ушедших за месяц, %", comment="Руководители занимают всё большую долю оттока при стабильной доле в численности (13%).",
        priority=1, page="flow", source="HRS"),
    slope("attr_region", "Отток HQ по регионам", [
        ("Москва", 61, 59), ("Санкт-Петербург", 13, 13), ("Топ-3 ТЦР РФ", 12, 13), ("Остальные ТЦР РФ", 6, 7), ("СНГ", 6, 6), ("Другие", 2, 2)],
        subtitle="доля ушедших за месяц, %", comment="Региональная структура оттока пропорциональна численности — регионы не «протекают».",
        priority=9, page="flow", source="HRS", threshold=2.5),
    slope("attr_tenure", "Отток HQ по стажу", [
        ("До 1 года", 28, 31, "ранний отток растёт"), ("1–3 года", 33, 32), ("3–5 лет", 19, 18), ("Более 5 лет", 20, 19)],
        subtitle="доля ушедших за месяц, %", comment="Каждый третий ушедший — со стажем до года: вопрос к качеству найма и онбординга.",
        priority=2, page="flow", source="HRS"),
    slope("rotation_seniority", "Ротации по seniority", [
        ("Junior", 18, 22), ("Middle", 47, 46), ("Senior", 28, 26), ("Руководители", 7, 6)],
        subtitle="доля ротаций, %", comment="Ротации молодеют: джуны чаще меняют команды внутри компании.",
        priority=6, page="flow", source="HRS"),
    slope("ai_tools", "Использование внутренних ИИ-инструментов по типам", [
        ("Ассистент-чат", 48, 52), ("Код-ассистент", 30, 31), ("Копилот в отчётах", 10, 11), ("Прочие", 12, 6, "консолидация")],
        subtitle="доля активных сессий, %", comment="Использование консолидируется вокруг двух инструментов — чата и код-ассистента.",
        priority=6, page="productivity", source="Логи ИИ-платформы"),
    slope("ai_top_users", "Power-пользователи ИИ по стримам", [
        ("SDE", 58, 54), ("ML", 12, 13), ("Аналитики", 11, 14, "+3 п.п."), ("Редакторы", 6, 7), ("Продакты", 4, 5), ("Дизайн", 2, 2), ("Прочие", 7, 5)],
        subtitle="доля среди power-пользователей, %", comment="Аналитики и продакты догоняют разработку среди активных пользователей.",
        priority=6, page="productivity", source="Логи ИИ-платформы"),
    slope("workload_zones", "Численность HQ по зонам нагрузки и рискам", [
        ("Норма", 84.5, 82.0), ("Перегрузка", 7.2, 9.1, "+1,9 п.п."), ("Недозагрузка", 4.8, 5.0), ("Нет данных", 3.5, 3.9)],
        subtitle="доля численности, %", left="дек 25", comment="Перегрузка растёт, недозагрузка стабильна: нагрузка распределяется неравномерно.",
        priority=2, page="productivity", source="Цифровые следы", threshold=1.5),
    slope("goals_actuality", "Цели СУП по актуальности", [
        ("Актуальные, обновляются", 55, 61, "+6 п.п."), ("Актуальные, без обновлений", 24, 22), ("Устаревшие", 15, 12), ("Нет целей", 6, 5)],
        subtitle="доля юнитов, %", left="дек 25", comment="Цели юнитов становятся живее — обновляются чаще.",
        priority=5, page="productivity", source="СУП"),
    slope("hq_regions", "Численность HQ по регионам", [
        ("Москва", 60.2, 58.7), ("ТЦР РФ", 18.0, 19.3), ("Санкт-Петербург", 13.9, 14.0), ("СНГ", 5.9, 6.0), ("Другие", 2.0, 2.0)],
        subtitle="доля численности, %", left="дек 25", comment="Плавная регионализация: −1,5 п.п. Москва, +1,3 п.п. ТЦР РФ.",
        priority=4, page="headcount", source="HRS", threshold=1.0),
]

# ----------------------------------------------------------------------------- 11. Блок стабильности
stability = [
    {"name": "Пропорции профессий (SDE/QA 4,8; SDE/SA 11,0; Discovery/Delivery 0,26)", "value": "в целевых коридорах", "spark": path({0: 4.6, 12: 4.8}, 13, 0.03, 2)},
    {"name": "Вакансии по линиям (КП)", "value": "доли ±1 п.п.", "spark": path({0: 23, 12: 23}, 13, 0.4, 0)},
    {"name": "Отток Support по причинам", "value": "доли ±1 п.п.", "spark": path({0: 36, 12: 35}, 13, 0.4, 0)},
    {"name": "Отток HQ по регионам", "value": "пропорционален численности", "spark": path({0: 61, 12: 59}, 13, 0.5, 0)},
    {"name": "Недоукомплектованность HQ", "value": "7,5% (коридор 7–8%)", "spark": vacrate_2026},
    {"name": "Доля подрядчиков к HQ", "value": "10,2% (дек 25: 11,2%)", "spark": path({0: 11.2, 12: 10.2}, 13, 0.1, 1)},
    {"name": "Абсентеизм", "value": "8,1% — сезонная норма", "spark": absent_2025[7:] + absent_2026},
    {"name": "Закрепляемость Support (90 дн.)", "value": "82% (2025: 80%)", "spark": path({0: 80, 12: 82}, 13, 0.4, 0)},
    {"name": "Посещаемость офиса", "value": "49% Москва / 44% ТЦР", "spark": path({0: 46, 6: 44, 12: 49}, 13, 1, 0)},
    {"name": "Регионы найма СПб и СНГ", "value": "доли ±1 п.п.", "spark": path({0: 15, 12: 16}, 13, 0.3, 0)},
]

# ----------------------------------------------------------------------------- 0. Резюме месяца
summary = {
    "headline": "HQ растёт по плану, но воронка найма выведет за лимит; уходят руководители",
    "paragraphs": [
        "Численность HQ — 22 930, прирост с начала года +790, запас до лимита 570. Проблема не в факте, а в инерции: "
        "412 принятых офферов и 1 850 вакансий в работе дают 23 620 к декабрю. Уложиться в лимит можно, только "
        "если снять или перенести примерно 200 вакансий из 1 850 в работе. Решение нужно в сентябре, до выхода офферов.",
        "Общая текучесть снижается (12,1% против 13,4% год назад), но за средним прячется отток руководителей: "
        "9,8% годовых, ускорение шесть месяцев подряд, две трети — Discovery Core и Other Digital. Растут управляемые "
        "причины ухода — «руководитель / команда» и «выгорание», падают «компенсация» и «релокация».",
        "Найм работает на прежней мощности (около 300 закрытий в месяц) и дешевеет по каналам (рефералы +4 п.п.), но "
        "стареет и дорожает: 27% вакансий старше 90 дней, отказы от офферов 14%, каждый девятый найм с sign-on. "
        "Джунизация и регионализация идут по плану. ИИ-инструменты стали нормой в разработке, но не в дискавери.",
    ],
    "signals": [
        {"level": "red", "title": "Лимит численности HQ", "text": "Вилка прогноза 23 330–23 620 пересекает лимит. Нужно решение по ~200 вакансиям.", "page": "headcount", "owner": "HR HQ, финансы"},
        {"level": "red", "title": "Отток руководителей", "text": "9,8% годовых, ускорение 6 месяцев; Discovery Core — 15,6%.", "page": "flow", "owner": "HRBP направлений"},
        {"level": "red", "title": "Просроченные вакансии", "text": "27% старше 90 дней (цель ≤ 20%), почти все — senior SDE и ML.", "page": "hiring", "owner": "Рекрутмент"},
        {"level": "red", "title": "Индивидуальные цели", "text": "64% при цели 80%, рост остановился три месяца назад.", "page": "productivity", "owner": "Performance-команда"},
        {"level": "amber", "title": "Скрытый рост через замены", "text": "79 замен закрыты при работающем «заменяемом»; 40 переводов из HQ, 28 из них за два месяца.", "page": "hiring", "owner": "Рекрутмент, HRBP"},
        {"level": "amber", "title": "Перегрузка и риски", "text": "9,1% в зоне перегрузки (+1,9 п.п.), риск выгорания +120 человек.", "page": "productivity", "owner": "People Analytics"},
        {"level": "amber", "title": "Refresh 5%", "text": "58% плана при линейных 67%; решения приняты по 71% кейсов.", "page": "flow", "owner": "HR HQ"},
        {"level": "amber", "title": "Норма управляемости", "text": "21% руководителей с командой < 4 (цель 15%); в Discovery Core — 33%.", "page": "management", "owner": "Оргдизайн"},
        {"level": "amber", "title": "Цена найма", "text": "Отказы от офферов 14% (11% год назад), sign-on 9%, CR > 100 у 12% наймов.", "page": "hiring", "owner": "Рекрутмент, C&B"},
        {"level": "ok", "title": "Текучесть HQ", "text": "12,1% против 13,4% год назад; regrettable стабилен 5,2%.", "page": "flow", "owner": ""},
        {"level": "ok", "title": "Джунизация и регионализация", "text": "Джуны 18,9% (цель 20%), вне Москвы 41,3% (цель 42%), найм в ТЦР +5 п.п.", "page": "headcount", "owner": ""},
        {"level": "ok", "title": "ИИ в разработке", "text": "78% SDE и 81% ML используют инструменты еженедельно; в целом 51% (цель 60%).", "page": "productivity", "owner": ""},
        {"level": "ok", "title": "CrossData", "text": "61% руководителей используют ежемесячно, топ-100 — 83%.", "page": "crossdata", "owner": ""},
    ],
    "changes": [
        {"text": "Отток по причине «руководитель / команда»: 12% → 16%", "page": "flow"},
        {"text": "Вакансии старше 90 дней: 21% → 27%", "page": "hiring"},
        {"text": "Доля замен в вакансиях: 33% → 39%", "page": "hiring"},
        {"text": "Найм в ТЦР РФ: 22% → 27% закрытых вакансий", "page": "hiring"},
        {"text": "Руководители в оттоке: 8% → 11% при доле в численности 13%", "page": "flow"},
        {"text": "Приоритетные вакансии Финтеха: 22% → 29%", "page": "hiring"},
    ],
    "stable": [
        "Пропорции профессий и Discovery / Delivery — в целевых коридорах",
        "Вакансии по линиям (КП) и отток по регионам — без структурных сдвигов",
        "Недоукомплектованность 7,5% девятый месяц в коридоре 7–8%",
        "Абсентеизм 8,1% — сезонная норма",
    ],
    "questions": [
        {"q": "Какие ~200 вакансий HQ снимаем или переносим на 2027 и кто владелец этого решения?", "to": "HR HQ, финансы, руководители линий", "page": "headcount"},
        {"q": "Почему уходят руководители Discovery Core — что показали exit-интервью за квартал?", "to": "HRBP Discovery", "page": "flow"},
        {"q": "Просроченные senior-вакансии: рынок, вилки или процесс? Разбор 20 самых старых.", "to": "Рекрутмент, C&B", "page": "hiring"},
        {"q": "Кто контролирует «замены при работающем сотруднике» и переводы из HQ?", "to": "Рекрутмент, оргдизайн", "page": "hiring"},
        {"q": "Как проводим осеннее ревью для 36% без целей на период?", "to": "Performance-команда", "page": "productivity"},
    ],
    "decisions": [
        {"text": "Приоритизация 1 850 вакансий HQ под лимит 23 500 — до 15 сентября", "owner": "HR HQ + финансы"},
        {"text": "Правило «замена открывается только после даты увольнения» или явное исключение", "owner": "Рекрутмент"},
    ],
}

# ----------------------------------------------------------------------------- 12. Находки: то, чего не видно в обычных отчётах
# Каждая находка — склейка уже существующих таблиц, а не новый источник данных.
# Обязательные поля: что нашли, число, как посчитано, источник, ЧЕГО МЫ НЕ ЗНАЕМ, владелец, вопрос.
findings = [
    {
        "id": "hidden_growth",
        "kicker": "Скрытый рост",
        "claim": "До восьмидесяти человек, которых нет ни в одном плане",
        "value": 79, "unit": "замен", "value_note": "закрыты при работающем «заменяемом» · верхняя граница",
        "text": ("В 720 вакансиях на замену мы сверили статус того, кого заменяют. У 79 замена уже вышла на работу, "
                 "а «заменяемый» продолжает работать. Формально это замены и в лимит роста они не попадают. "
                 "Фактически это до восьмидесяти человек сверх того, что видно в плане: сколько именно, покажет разбор списка."),
        "how": "Вакансии-замены HRS × статус заменяемого сотрудника на 31 августа",
        "source": "HRS, кадровый учёт",
        "unknown": "Часть из них может быть законной: люди в процессе увольнения с длинной отработкой или временное дублирование на передаче дел. Мы не знаем, какая доля — сколько именно, покажет разбор списка.",
        "owner": "Рекрутмент, HRBP",
        "question": "Кто контролирует замены, у которых заменяемый ещё работает?",
        "scale": [{"name": "Заменяемый уволен", "v": 295}, {"name": "На увольнении", "v": 158},
                  {"name": "Работает", "v": 130}, {"name": "Замена закрыта, оба работают", "v": 79, "flag": "red"},
                  {"name": "Неизвестно", "v": 58}],
        "priority": 1,
    },
    {
        "id": "hq_drain",
        "kicker": "Периметр лимита",
        "claim": "Сорок человек вышли из-под лимита, не выходя из компании",
        "value": 40, "unit": "переводов", "value_note": "из HQ в Support за год, 28 из них за два месяца",
        "text": ("Лимит 23 500 действует на HQ. За январь–июнь из HQ в Support перевели 12 человек. "
                 "За июль и август — 28. Функции у большинства не изменились: сменился сегмент учёта."),
        "how": "Помесячные срезы численности, сравнение сегмента одного и того же сотрудника",
        "source": "Кадровый учёт, помесячные срезы",
        "unknown": "Мы видим смену сегмента, но не видим содержания работы. Возможно, это реальная передача функций в Support — тогда должно быть решение оргкомитета по каждому случаю. Мы его не искали.",
        "owner": "HRBP, оргдизайн",
        "question": "Это передача функций или способ уместиться в лимит? По каждому ли случаю есть решение оргкомитета?",
        "months": ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг"],
        "series": [1, 2, 2, 3, 2, 2, 13, 15],
        "priority": 1,
    },
    {
        "id": "managers_leaving",
        "kicker": "Ускорение",
        "claim": "Общая текучесть падает, а руководители уходят всё быстрее",
        "value": 9.8, "unit": "%", "value_note": "годовая текучесть руководителей против 7,1% год назад",
        "text": ("Средняя цифра по компании выглядит хорошо: 12,1% против 13,4%. Но внутри неё руководители ускоряются "
                 "шестой месяц подряд. Их доля в оттоке выросла с 8% до 11% при неизменной доле в численности — 13%. "
                 "Две трети ушедших — Discovery Core и Other Digital."),
        "how": "Отток × признак руководителя, скользящее окно 12 месяцев, разрез по сегментам",
        "source": "HRS, exit-интервью",
        "unknown": "Причины мы берём из exit-интервью, а там люди редко говорят прямо. Рост причины «руководитель / команда» с 12% до 16% — сигнал, но не диагноз.",
        "owner": "HRBP направлений",
        "question": "Что показали exit-интервью руководителей Discovery Core за квартал?",
        "months": ["сен", "окт", "ноя", "дек", "янв", "фев", "мар", "апр", "май", "июн", "июл", "авг"],
        "series": [7.2, 7.1, 7.2, 7.1, 7.2, 7.4, 7.9, 8.3, 8.8, 9.2, 9.6, 9.8],
        "compare": [7.6, 7.5, 7.4, 7.3, 7.2, 7.2, 7.1, 7.1, 7.0, 7.1, 7.1, 7.1],
        "priority": 1,
    },
    {
        "id": "managers_without_teams",
        "kicker": "Звание вместо денег",
        "claim": "Шестьсот двенадцать руководителей, которым некем руководить",
        "value": 612, "unit": "руководителей", "value_note": "21% всех, команда меньше четырёх человек",
        "text": ("Каждый пятый руководитель управляет командой меньше четырёх человек, в Discovery Core — каждый третий. "
                 "С начала года руководителями стали 214 человек при 63 нанятых снаружи и 57 новых юнитах: "
                 "структура растёт быстрее численности."),
        "how": "Управленческая оргструктура, число прямых подчинённых на 31 августа",
        "source": "Оргструктура",
        "unknown": "Часть — экспертные роли, где звание руководителя оправдано, и техлиды с внешними командами. Отделить одно от другого можно только разбором вручную.",
        "owner": "Оргдизайн, C&B",
        "question": "Сколько из 612 — «звание вместо повышения зарплаты»?",
        "bins": ["1–2", "3", "4–6", "7–10", "11–15", "16+"],
        "hist": [240, 372, 1310, 730, 218, 80],
        "hist_flag": 2,
        "priority": 2,
    },
]

# ----------------------------------------------------------------------------- 13. Ставки: что стоит решение
# Перевод численности в деньги и время. Все ставки помечены как ОЦЕНКА и показывают допущение.
stakes = {
    "clock": {"label": "до конца года", "value": "4 месяца", "sub": "лимит проверяется 31 декабря"},
    "scoreboard": {"label": "счёт прошлого прогноза",
                   "text": "В июльском выпуске мы дали на декабрь вилку 23 210–23 540. Факт августа лёг в неё, но воронка выросла: сегодня верхняя граница 23 620.",
                   "prev": "23 210–23 540", "now": "23 330–23 620"},
    "deadline": {"label": "решение по вакансиям", "value": "до 15 сентября", "sub": "позже офферы уже выйдут"},
    "items": [
        {"label": "Превышение лимита", "value": "0–120 человек", "money": "0 – 0,5 млрд ₽ в год",
         "assumption": "зависит от сценария: по темпу лимит не превышаем, по воронке превышаем на 120"},
        {"label": "Скрытый рост через замены", "value": "до 80 человек", "money": "до 0,3 млрд ₽ в год",
         "assumption": "верхняя граница: часть замен законна"},
        {"label": "Просроченные вакансии", "value": "500 позиций", "money": "58 дней медиана вместо 45",
         "assumption": "27% из 1 850 вакансий в работе"},
    ],
}

data = {
    "meta": {
        "company": "«Орион»",
        "company_note": "вымышленная компания, все цифры сгенерированы",
        "period": "2026-08", "period_label": "Август 2026", "as_of": "31 августа 2026",
        "issued": "3 сентября 2026", "issue_no": "№ 8 / 2026",
        "prepared_by": "Офис исполнительного директора · BI-аналитика",
        "disclaimer": "Макет на вымышленных данных. Цифры не относятся к реальной компании.",
        "months_ru": MONTHS_RU, "n_fact_2026": N26,
    },
    "summary": summary,
    "control_panel": control_panel,
    "headcount": headcount,
    "hiring": hiring,
    "flow": flow,
    "professions": professions,
    "lines": lines,
    "management": management,
    "productivity": productivity,
    "crossdata": crossdata,
    "slopes": slopes,
    "stability": stability,
    "findings": findings,
    "stakes": stakes,
}

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"written {OUT} ({OUT.stat().st_size // 1024} KB)")
