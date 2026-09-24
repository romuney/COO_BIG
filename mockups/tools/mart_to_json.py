#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Выгрузка витрины COO Hub → данные страницы «COO Hub · Радар».

Только стандартная библиотека Python 3.8+. В сеть ничего не отправляет: читает один файл, пишет два.
Обычно запускается не сам, а из build_coohub.py, который следом собирает HTML.

    python3 mockups/tools/mart_to_json.py выгрузка.csv --out coo_hub.json --report проверка.md

Что делает, по порядку:
  1. читает CSV (любой разделитель, UTF-8 или Windows-1251, десятичная запятая) или XLSX;
  2. отделяет строки «итого» от разрезов по сотрудникам и оставляет один вариант метрики
     (metric_option / data_type), если их несколько;
  3. собирает каталог юнитов, метрики с порогами и помесячные ряды за два года;
  4. сам считает изменение к прошлому месяцу и к прошлому году по ряду, поэтому не зависит от того,
     что именно лежит в mom_value_final и yoy_value_final;
  5. проверяет данные и пишет отчёт: ошибки (сборка останавливается), предупреждения и
     «что витрина показала о себе» — ответы на вопросы к владельцу витрины, добытые из самих данных.
"""
import argparse
import csv
import datetime as dt
import json
import math
import re
import statistics
import sys
import zipfile
from collections import Counter, defaultdict
from pathlib import Path
from xml.etree import ElementTree as ET

MONTHS_SHORT = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"]
MONTHS_NOM = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь",
              "Октябрь", "Ноябрь", "Декабрь"]

DEFAULT_CONFIG = {
    "report_month": None,          # "2026-09"; по умолчанию — последний месяц в выгрузке
    "aggr_type": "M",              # строки с другим aggr_type пропускаются
    "columns": {},                 # имя в странице → имя колонки в выгрузке, если отличается
    "cut_columns": {"oper": "emp_specialization_oper_code", "it": "emp_specialization_it_code",
                    "seniority": "seniority_group"},
    "other_cut_columns": ["emp_specialization_desc", "emp_stream_desc", "seniority"],
    "cut_labels": {"oper": "Сегмент", "it": "IT-специализация", "seniority": "Сениорность"},
    "cut_order": {"oper": ["HQ", "Line", "Support"], "it": ["IT", "Digital", "nonIT"],
                  "seniority": ["junior", "middle", "senior", "lead"]},
    "cut_dims_page": ["oper"],     # какие разрезы класть в страницу (плитки конечных юнитов)
    "total_tokens": ["", "все", "всего", "итого", "all", "total", "-", "—"],
    "variant_columns": ["metric_option", "data_type"],
    "variants": {},                # {"*": {"metric_option": "Все юниты"}, "<метрика>": {...}}
    "root_rk": None,
    "root_name": "Все юниты",
    "max_depth": None,
    "headcount": {"metric": None, "field": "value_denominator"},
    "metrics_include": None,
    "metrics_exclude": [],
    "metrics": {},
    "blocks": {},
    "block_order": None,
    "respect_null_thresholds": False,
    "meta": {
        "product": "COO Hub",
        "source": "Витрина COO Hub, Greenplum",
        "owner": "Офис исполнительного директора · BI-аналитика",
        "disclaimer": "Данные витрины на {date}. Для служебного пользования — не пересылайте за пределы компании.",
    },
}

NULLS = {"", "null", "none", "nan", "n/a", "na", "#н/д", "#n/a", "nat", "(null)", "<null>"}
SAFE_ID = re.compile(r"^[A-Za-z0-9_.:-]+$")
TR = dict(zip("абвгдеёжзийклмнопрстуфхцчшщъыьэюя",
              ["a", "b", "v", "g", "d", "e", "e", "zh", "z", "i", "y", "k", "l", "m", "n", "o", "p", "r", "s",
               "t", "u", "f", "h", "ts", "ch", "sh", "sch", "", "y", "", "e", "yu", "ya"]))


class ConvertError(Exception):
    """Ошибка, после которой собирать страницу бессмысленно."""


# --------------------------------------------------------------------------- мелочи разбора
def norm_txt(s):
    if s is None:
        return None
    t = re.sub(r"\s+", " ", str(s).replace(" ", " ")).strip()
    return None if t.lower() in NULLS else t


def key_of(s):
    """Ключ для сравнения имён: регистр, ё и лишние пробелы не важны."""
    return re.sub(r"\s+", " ", str(s or "")).strip().lower().replace("ё", "е")


def slug(s):
    t = "".join(TR.get(c, c) for c in str(s).lower())
    return re.sub(r"[^a-z0-9]+", "_", t).strip("_") or "x"


def norm_id(s):
    t = norm_txt(s)
    if t is None:
        return None
    if re.fullmatch(r"-?\d+\.0+", t):  # 12345.0 из Excel → 12345
        t = t.split(".")[0]
    return t


def parse_num(s):
    """'1 234,5' · '1234.5' · '0,8889' · '12%' · '−3' → число; пусто и NULL → None."""
    if s is None:
        return None
    if isinstance(s, (int, float)):
        return None if isinstance(s, float) and (math.isnan(s) or math.isinf(s)) else float(s)
    t = str(s).strip()
    for ch in (" ", " ", " ", "'"):
        t = t.replace(ch, "")
    t = t.replace("−", "-")
    if t.lower() in NULLS:
        return None
    if t.endswith("%"):
        t = t[:-1]
    if "," in t and "." in t:
        t = t.replace(".", "").replace(",", ".") if t.rfind(",") > t.rfind(".") else t.replace(",", "")
    elif t.count(",") == 1:
        t = t.replace(",", ".")
    elif t.count(",") > 1:
        t = t.replace(",", "")
    try:
        v = float(t)
    except ValueError:
        return None
    return None if math.isnan(v) or math.isinf(v) else v


def _excel_day(v):
    return dt.date(1899, 12, 30) + dt.timedelta(days=int(v))


def parse_date(s):
    """'2026-09-22', '2026-09-22 03:00:00', '22.09.2026', '2026-09', '202609', дата Excel → date."""
    t = norm_txt(s)
    if t is None:
        return None
    m = re.match(r"^(\d{4})[-./](\d{1,2})(?:[-./](\d{1,2}))?", t)
    if m:
        y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3) or 1)
    else:
        m = re.match(r"^(\d{1,2})[./-](\d{1,2})[./-](\d{4})", t)
        if m:
            y, mo, d = int(m.group(3)), int(m.group(2)), int(m.group(1))
        else:
            m = re.match(r"^(\d{4})(\d{2})(\d{2})?$", t)
            if m:
                y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3) or 1)
            else:
                v = parse_num(t)
                if v is not None and 20000 < v < 80000:
                    return _excel_day(v)
                return None
    try:
        return dt.date(y, mo, d)
    except ValueError:
        return None


def parse_month(s):
    d = parse_date(s)
    return (d.year, d.month) if d else None


def ym_add(ym, k):
    y, m = ym
    n = y * 12 + (m - 1) + k
    return (n // 12, n % 12 + 1)


def ym_label(ym):
    return f"{MONTHS_SHORT[ym[1] - 1]} {ym[0]}"


def close(a, b, rel=1e-3, ab=0.011):
    return a is not None and b is not None and abs(a - b) <= max(ab, rel * max(abs(a), abs(b)))


def rnd(v, nd=4):
    if v is None:
        return None
    r = round(float(v), nd)
    return int(r) if r == int(r) and abs(r) < 1e15 else r


def ru(v, nd=2):
    """Число по-русски для отчёта: 1 234,5."""
    if v is None:
        return "—"
    s = f"{v:,.{nd}f}".replace(",", " ").replace(".", ",")
    if "," in s:
        s = s.rstrip("0").rstrip(",")
    return s.replace("-", "−")


def mode(vals):
    c = Counter(v for v in vals if v is not None)
    return c.most_common(1)[0][0] if c else None


def lookup(table, *names):
    """Найти настройку по ключу метрики или по её русскому названию."""
    idx = {key_of(k): v for k, v in (table or {}).items() if not str(k).startswith("_")}
    for n in names:
        if n is not None and key_of(n) in idx:
            return idx[key_of(n)]
    return None


# --------------------------------------------------------------------------- конфиг
def deep_merge(a, b):
    for k, v in b.items():
        if str(k).startswith("_"):  # "_comment" — пояснение для человека
            continue
        if isinstance(v, dict) and isinstance(a.get(k), dict) and k not in ("metrics", "variants", "blocks"):
            deep_merge(a[k], v)
        elif isinstance(v, dict) and isinstance(a.get(k), dict):
            a[k].update({kk: vv for kk, vv in v.items() if not str(kk).startswith("_")})
        else:
            a[k] = v
    return a


def load_config(path=None, overrides=None):
    cfg = json.loads(json.dumps(DEFAULT_CONFIG))
    if path:
        text = Path(path).read_text(encoding="utf-8-sig")
        text = "\n".join(line for line in text.splitlines() if not line.lstrip().startswith("//"))
        deep_merge(cfg, json.loads(text))
    if overrides:
        deep_merge(cfg, overrides)
    return cfg


# --------------------------------------------------------------------------- чтение файла
def _sniff_encoding(raw):
    if raw.startswith(b"\xef\xbb\xbf"):
        return "utf-8-sig"
    if raw.startswith((b"\xff\xfe", b"\xfe\xff")):
        return "utf-16"
    try:
        raw.decode("utf-8")
        return "utf-8"
    except UnicodeDecodeError as e:
        return "utf-8" if e.start > len(raw) - 4 else "cp1251"  # обрезанный на середине символ — не повод


def read_csv(path):
    with path.open("rb") as fh:
        raw = fh.read(1 << 16)
    enc = _sniff_encoding(raw)
    head = raw.decode(enc, errors="ignore")
    lines = head.splitlines()
    first = lines[0] if lines else ""
    skip_sep = False
    if first.lower().startswith("sep=") and len(first) >= 5:  # подсказка Excel: «sep=;»
        delim, skip_sep = first[4], True
    else:
        delim = max([";", ",", "\t", "|"], key=first.count)
    csv.field_size_limit(1 << 27)
    fh = path.open("r", encoding=enc, newline="", errors="replace")
    reader = csv.reader(fh, delimiter=delim)
    if skip_sep:
        next(reader, None)
    names = {"utf-8-sig": "UTF-8 (с BOM)", "utf-8": "UTF-8", "cp1251": "Windows-1251", "utf-16": "UTF-16"}
    shown = {";": "«;»", ",": "«,»", "\t": "табуляция", "|": "«|»"}[delim]
    return reader, f"CSV · {names[enc]} · разделитель {shown}"


def _col_index(ref):
    n = 0
    for ch in ref:
        if not ch.isalpha():
            break
        n = n * 26 + (ord(ch.upper()) - 64)
    return n - 1


def read_xlsx(path):
    """Первый лист XLSX без сторонних библиотек."""
    ns = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
    rel_ns = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
    z = zipfile.ZipFile(path)
    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in ET.fromstring(z.read("xl/sharedStrings.xml")).iter(ns + "si"):
            shared.append("".join(t.text or "" for t in si.iter(ns + "t")))
    target = "worksheets/sheet1.xml"
    try:
        sheet = ET.fromstring(z.read("xl/workbook.xml")).find(f"{ns}sheets/{ns}sheet")
        rid = sheet.get(rel_ns + "id")
        for r in ET.fromstring(z.read("xl/_rels/workbook.xml.rels")):
            if r.get("Id") == rid:
                target = r.get("Target")
    except (KeyError, AttributeError):
        pass
    sheet_path = target.lstrip("/") if target.startswith("/") else "xl/" + target

    def rows():
        with z.open(sheet_path) as fh:
            for _, el in ET.iterparse(fh):
                if el.tag != ns + "row":
                    continue
                cells, last = {}, -1
                for c in el.findall(ns + "c"):
                    ref = c.get("r")
                    col = _col_index(ref) if ref else last + 1
                    last = col
                    t, v = c.get("t"), c.find(ns + "v")
                    if t == "s":
                        val = shared[int(v.text)] if v is not None and v.text else ""
                    elif t == "inlineStr":
                        val = "".join(x.text or "" for x in c.iter(ns + "t"))
                    else:
                        val = v.text if v is not None and v.text is not None else ""
                    cells[col] = val
                el.clear()
                yield [cells.get(i, "") for i in range(max(cells) + 1)] if cells else []
    return rows(), "XLSX · первый лист"


def read_table(path):
    path = Path(path)
    if not path.exists():
        raise ConvertError(f"Файл не найден: {path}")
    reader, fmt = read_xlsx(path) if path.suffix.lower() in (".xlsx", ".xlsm") else read_csv(path)
    header = next(reader, None)
    while header is not None and not any(str(x).strip() for x in header):
        header = next(reader, None)
    if header is None:
        raise ConvertError("Файл пустой: нет даже строки заголовков.")
    return header, reader, fmt


def norm_header(h):
    t = str(h or "").replace("﻿", "").strip().strip('"').strip("'").strip().lower()
    t = re.sub(r"\s+", "_", t)
    return t.split(".")[-1] if "." in t else t  # t.value_final → value_final


# --------------------------------------------------------------------------- отчёт
class Report:
    def __init__(self):
        self.errors, self.warnings, self.facts, self.summary = [], [], [], []
        self.sections = []  # (заголовок, markdown)
        self.title = "Проверка выгрузки COO Hub"
        self.source = ""
        self.forced = False

    def error(self, msg):
        self.errors.append(msg)

    def warn(self, msg):
        self.warnings.append(msg)

    def fact(self, msg):
        self.facts.append(msg)

    def note(self, msg):
        self.summary.append(msg)

    def section(self, title, body):
        self.sections.append((title, body))

    def render(self):
        out = [f"# {self.title}", ""]
        if self.source:
            out += [self.source, ""]
        n_err = f"{len(self.errors)} {plural(len(self.errors), 'ошибка', 'ошибки', 'ошибок')}"
        if self.errors and self.forced:
            out += [f"**Итог: черновик собран с ошибками ({n_err}) — директору не отправлять.** Исправьте их и соберите заново без --force.", ""]
        elif self.errors:
            out += [f"**Итог: сборка остановлена — {n_err}.** "
                    "Исправьте конфиг или выгрузку и запустите снова (или добавьте --force, чтобы посмотреть черновик).", ""]
        else:
            tail = f", {len(self.warnings)} {plural(len(self.warnings), 'предупреждение', 'предупреждения', 'предупреждений')} — прочитайте их" if self.warnings else ""
            out += [f"**Итог: страница собрана{tail}.** Перед отправкой сверьте пять чисел с Superset (таблица внизу).", ""]
        if self.errors:
            out += ["## Ошибки — без исправления не собираю", ""] + [f"{i}. {e}" for i, e in enumerate(self.errors, 1)] + [""]
        if self.warnings:
            out += ["## Предупреждения — страница собрана, но посмотрите", ""] + [f"- {w}" for w in self.warnings] + [""]
        if self.summary:
            out += ["## Что в выгрузке", ""] + [f"- {s}" for s in self.summary] + [""]
        if self.facts:
            out += ["## Что витрина показала о себе", "",
                    "Ответы на вопросы к владельцу витрины, которые удалось получить из самих данных. "
                    "С ними разговор сокращается до «подтвердите, что так и задумано».", ""]
            out += [f"- {f}" for f in self.facts] + [""]
        for title, body in self.sections:
            out += [f"## {title}", "", body, ""]
        return "\n".join(out).rstrip() + "\n"


def plural(n, one, few, many):
    a, b = abs(n) % 100, abs(n) % 10
    return many if 10 < a < 20 else one if b == 1 else few if 2 <= b <= 4 else many


def md_table(header, rows):
    esc = lambda s: str(s).replace("|", "\\|")
    out = ["| " + " | ".join(header) + " |", "|" + "|".join("---" for _ in header) + "|"]
    out += ["| " + " | ".join(esc(c) for c in r) + " |" for r in rows]
    return "\n".join(out)


# --------------------------------------------------------------------------- нормализация атрибутов
def norm_vt(s):
    k = key_of(s)
    if not k:
        return None
    if k in ("perc", "percent", "percentage", "pct", "%", "доля", "процент", "проценты", "ratio", "share"):
        return "perc"
    if k in ("int", "integer", "count", "cnt", "number", "шт", "штуки", "bigint"):
        return "int"
    if k in ("real", "float", "decimal", "numeric", "double", "fte", "money", "руб", "рубли"):
        return "real"
    return None


def norm_change(s):
    k = key_of(s)
    if k in ("up", "increase", "more", "higher", "asc", "grow", "growth", "+", "1", "рост", "больше", "↑", "positive"):
        return "up"
    if k in ("down", "decrease", "less", "lower", "desc", "fall", "-", "-1", "снижение", "меньше", "↓", "negative"):
        return "down"
    return None


def norm_ttype(s):
    k = key_of(s)
    if not k or k in ("value", "abs", "absolute", "level", "fact", "значение", "факт"):
        return "value"
    if k in ("mom", "m/m", "м/м", "month", "month_over_month", "delta_mom", "mom_perc", "мом", "к прошлому месяцу"):
        return "mom"
    return None


def norm_mtype(s, vt):
    k = key_of(s)
    if k in ("2", "2.0", "rel", "relative", "относительная", "доля", "ratio"):
        return 2
    if k in ("1", "1.0", "abs", "absolute", "абсолютная", "count"):
        return 1
    return 2 if vt == "perc" else 1


KNOWN_BLOCKS = [
    (lambda k, n: "цел" in n or k in ("goals", "okr") or "okr" in n,
     {"nick": "Цели", "ring": "Цели", "phrase": {"red": "Цели буксуют", "amber": "Цели на грани", "ok": "цели в норме"}}),
    (lambda k, n: "челов" in n or "персон" in n or "кадр" in n or k in ("hr", "people", "staff"),
     {"nick": "Люди", "ring": "Люди", "phrase": {"red": "С людьми есть красная зона", "amber": "Люди на грани", "ok": "люди в норме"}}),
    (lambda k, n: "инфраструкт" in n or k in ("it", "infra", "infrastructure") or n.startswith(("it ", "ит ")),
     {"nick": "Инфраструктура", "ring": "IT", "phrase": {"red": "Инфраструктура в красной зоне", "amber": "Инфраструктура на грани", "ok": "инфраструктура в норме"}}),
]


def block_meta_for(key, name, over):
    base = None
    for test, meta in KNOWN_BLOCKS:
        if test(key_of(key), key_of(name)):
            base = json.loads(json.dumps(meta))
            break
    generic = base is None
    if generic:
        nick = name if len(name) <= 28 else name.split(" ")[0]
        first = nick.split(" ")[0]
        base = {"nick": nick, "ring": first if len(first) <= 9 else first[:8] + "."}
    if over and over.get("nick"):
        base["nick"] = over["nick"]
        generic = generic or not over.get("phrase")
        if not over.get("ring"):
            first = base["nick"].split(" ")[0]
            base["ring"] = first if len(first) <= 9 else first[:8] + "."
    if over and over.get("ring"):
        base["ring"] = over["ring"]
    if generic:  # фраза вердикта из короткого имени: «Финансы в красной зоне. Цели на грани, люди в норме»
        n = base["nick"]
        low = n[:1].lower() + n[1:] if n[1:2].islower() else n  # «IT» так и остаётся «IT»
        base["phrase"] = {"red": f"{n} в красной зоне", "amber": f"{n} на грани", "ok": f"{low} в норме"}
    if over and isinstance(over.get("phrase"), dict):
        base["phrase"].update(over["phrase"])
    return base


# --------------------------------------------------------------------------- записи
class Rec:
    __slots__ = ("ym", "unit", "unit_nm", "parent", "parent_nm", "lvl", "eng_raw", "name", "key", "block", "block_ru",
                 "mtype", "vt", "change", "desc", "cta", "tr", "ty", "tdir", "ttype", "mlvl", "sort",
                 "vf", "vn", "vd", "vdone", "mom", "yoy", "adt", "variant", "cut_dim", "cut_val")


COLS_TEXT = {"functional_unit_nm": "unit_nm", "parent_functional_unit_nm": "parent_nm",
             "metric_name_eng_lower": "eng_raw", "metric_name": "name", "source_metrics_block": "block",
             "source_metrics_block_ru": "block_ru", "metric_type": "mtype", "value_type": "vt",
             "change_type": "change", "metric_desc": "desc", "call_to_action": "cta",
             "threshold_direction": "tdir", "threshold_type": "ttype", "metric_lvl": "mlvl"}
COLS_NUM = {"threshold_red": "tr", "threshold_yellow": "ty", "sort_number": "sort", "value_final": "vf",
            "value_numerator": "vn", "value_denominator": "vd", "value_done": "vdone",
            "mom_value_final": "mom", "yoy_value_final": "yoy", "lvl_unit": "lvl"}


# --------------------------------------------------------------------------- главное
def convert(path, cfg, report, force=False):
    header, reader, fmt = read_table(path)
    names = [norm_header(h) for h in header]
    alias = {norm_header(v): k for k, v in (cfg.get("columns") or {}).items() if v and not str(k).startswith("_")}
    idx = {}
    for i, n in enumerate(names):
        idx.setdefault(alias.get(n, n), i)

    missing = [c for c in ("business_month", "functional_unit_rk", "value_final") if c not in idx]
    if "metric_name" not in idx and "metric_name_eng_lower" not in idx:
        missing.append("metric_name или metric_name_eng_lower")
    if missing:
        raise ConvertError("В выгрузке нет обязательных колонок: " + ", ".join(missing)
                           + ". Если они называются иначе, пропишите соответствие в конфиге, раздел columns. "
                           + "Колонки в файле: " + ", ".join(names))
    for c in ("functional_unit_nm", "parent_functional_unit_rk", "threshold_red", "threshold_yellow", "change_type",
              "value_type", "value_numerator", "value_denominator", "source_metrics_block_ru"):
        if c not in idx:
            report.warn(f"В выгрузке нет колонки {c} — страница соберётся, но беднее. Добавьте её в SELECT.")

    cut_idx = {d: idx[c] for d, c in (cfg.get("cut_columns") or {}).items() if c in idx}
    other_cols = [c for c in cfg.get("other_cut_columns") or [] if c in idx]
    other_idx = [idx[c] for c in other_cols]
    var_cols = [c for c in cfg.get("variant_columns") or [] if c in idx]
    var_idx = [idx[c] for c in var_cols]
    totals_tok = {key_of(t) for t in cfg.get("total_tokens") or []} | {""}
    is_total = lambda v: v is None or key_of(v) in totals_tok

    txt_cols = [(idx[c], a) for c, a in COLS_TEXT.items() if c in idx]
    num_cols = [(idx[c], a, c) for c, a in COLS_NUM.items() if c in idx]
    i_month, i_unit = idx["business_month"], idx["functional_unit_rk"]
    i_parent, i_adt, i_aggr = idx.get("parent_functional_unit_rk"), idx.get("actual_data_dt"), idx.get("aggr_type")
    want_aggr = key_of(cfg.get("aggr_type")) if cfg.get("aggr_type") else None

    pool = {}
    intern = lambda s: pool.setdefault(s, s) if s is not None else None
    recs = []
    n_rows = n_aggr = n_month = n_unit = n_other_cut = n_cross = n_total_tok = 0
    aggr_seen, bad_nums = Counter(), Counter()
    cut_values = defaultdict(Counter)
    at = lambda row, i: row[i] if i is not None and i < len(row) else None

    for row in reader:
        if not row or not any(str(x).strip() for x in row):
            continue
        n_rows += 1
        if i_aggr is not None:
            a = norm_txt(at(row, i_aggr))
            aggr_seen[a] += 1
            if want_aggr and a is not None and key_of(a) != want_aggr:
                n_aggr += 1
                continue
        ym = parse_month(at(row, i_month))
        if ym is None:
            n_month += 1
            continue
        unit = norm_id(at(row, i_unit))
        if unit is None:
            n_unit += 1
            continue
        dims, tok = [], False
        for d, i in cut_idx.items():
            v = norm_txt(at(row, i))
            lab = v if v is not None else "(пусто)"
            col = cfg["cut_columns"][d]
            if len(cut_values[col]) < 60 or lab in cut_values[col]:
                cut_values[col][lab] += 1
            if not is_total(v):
                dims.append((d, v))
            elif v is not None:
                tok = True
        others = [norm_txt(at(row, i)) for i in other_idx]
        for c, v in zip(other_cols, others):
            lab = v if v is not None else "(пусто)"
            if len(cut_values[c]) < 60 or lab in cut_values[c]:
                cut_values[c][lab] += 1
        if len(dims) > 1:
            n_cross += 1
            continue
        if any(not is_total(v) for v in others):  # разрез по потоку, описанию или грейду — странице не нужен
            n_other_cut += 1
            continue
        if not dims and tok:
            n_total_tok += 1
        r = Rec()
        r.ym, r.unit = ym, intern(unit)
        r.cut_dim, r.cut_val = (dims[0][0], intern(dims[0][1])) if dims else (None, None)
        for i, a in txt_cols:
            setattr(r, a, intern(norm_txt(at(row, i))))
        for a in COLS_TEXT.values():
            if not hasattr(r, a):
                setattr(r, a, None)
        for i, a, c in num_cols:
            s = at(row, i)
            v = parse_num(s)
            if v is None and s is not None and str(s).strip() and str(s).strip().lower() not in NULLS:
                bad_nums[c] += 1
            setattr(r, a, v)
        for a in COLS_NUM.values():
            if not hasattr(r, a):
                setattr(r, a, None)
        r.parent = intern(norm_id(at(row, i_parent)))
        r.adt = parse_date(at(row, i_adt)) if i_adt is not None else None
        r.variant = intern(tuple(norm_txt(at(row, i)) for i in var_idx)) if var_idx else ()
        r.key = None
        recs.append(r)

    report.source = f"Файл: {Path(path).name} · {fmt} · {n_rows:,} строк".replace(f"{n_rows:,}", f"{n_rows:,}".replace(",", " "))
    if n_rows in (1000, 5000, 10000, 50000, 65535, 100000, 500000, 1000000, 1048575):
        report.warn(f"В выгрузке ровно {n_rows} строк — похоже на обрезку по лимиту выгрузки (Superset, DBeaver). "
                    "Сверьте с count(*) того же запроса.")
    if n_aggr:
        report.note(f"Пропущено строк с другим aggr_type: {n_aggr} (оставлен «{cfg.get('aggr_type')}»; всего видов: "
                    + ", ".join(f"{k or 'пусто'} — {v}" for k, v in aggr_seen.most_common(6)) + ").")
    if n_month:
        report.warn(f"{n_month} строк без понятного business_month — пропущены.")
    if n_unit:
        report.warn(f"{n_unit} строк без functional_unit_rk — пропущены.")
    if n_cross:
        report.note(f"Пропущено строк с перекрёстными разрезами (заполнено несколько колонок разрезов): {n_cross}.")
    if n_other_cut:
        report.note(f"Пропущено строк с разрезами, которые странице не нужны ({', '.join(c for c in cfg['other_cut_columns'] if c in idx)}): {n_other_cut}.")
    for c, n in bad_nums.most_common():
        report.warn(f"Колонка {c}: {n} значений не удалось прочитать как число — считаю их пустыми.")

    totals = [r for r in recs if r.cut_dim is None]
    if not totals:
        top = "; ".join(f"{c}: " + ", ".join(f"«{k}» — {v}" for k, v in cnt.most_common(6)) for c, cnt in cut_values.items())
        raise ConvertError("Не нашёл ни одной строки «итого»: у всех строк заполнены колонки разрезов по сотрудникам. "
                           "Добавьте значение, которым витрина обозначает «все сотрудники», в total_tokens конфига. "
                           f"Что лежит в колонках разрезов: {top or 'колонок разрезов нет'}.")
    if cut_values:
        tops = [f"{c}: " + ", ".join(f"«{k}»" for k, _ in cnt.most_common(5)) for c, cnt in cut_values.items()]
        how = ("пустые" if not n_total_tok else "пустые или равны значению из total_tokens" if n_total_tok < len(totals)
               else "равны значению из total_tokens")
        report.fact(f"«Итого» по сотрудникам — строки, где колонки разрезов {how}; разрезы — строки, где заполнена ровно одна "
                    f"из них. Что встречается в колонках разрезов: {'; '.join(tops)}.")

    # ---- ключ метрики: metric_name_eng_lower, а если его нет — латиница из русского названия
    raw_keys = {}
    for r in recs:
        base = r.eng_raw or r.name
        if base is None:
            continue
        raw_keys.setdefault(base, None)
    used = set()
    for base in raw_keys:
        k = slug(base)
        s, n = k, 2
        while s in used:
            s, n = f"{k}_{n}", n + 1
        used.add(s)
        raw_keys[base] = s
    names_by_key = defaultdict(Counter)
    for r in recs:
        base = r.eng_raw or r.name
        r.key = raw_keys.get(base)
        if r.key and r.name:
            names_by_key[r.key][r.name] += 1
    recs = [r for r in recs if r.key]
    totals = [r for r in recs if r.cut_dim is None]
    for k, cnt in names_by_key.items():
        if len(cnt) > 1:
            report.warn(f"У метрики {k} несколько русских названий: " + ", ".join(f"«{n}»" for n in cnt) + ". Беру самое частое.")
    mname = {k: (cnt.most_common(1)[0][0] if cnt else k) for k, cnt in names_by_key.items()}

    # ---- отчётный месяц и окно в два года
    months = Counter(r.ym for r in totals)
    if cfg.get("report_month"):
        rm = parse_month(cfg["report_month"])
        if rm is None:
            raise ConvertError(f"report_month в конфиге не похож на месяц: {cfg['report_month']!r}. Нужно, например, \"2026-09\".")
        if rm not in months:
            raise ConvertError(f"За отчётный месяц {ym_label(rm)} в выгрузке нет строк. Есть: "
                               + ", ".join(ym_label(m) for m in sorted(months)[-6:]))
    else:
        rm = max(months)
    Y, M = rm
    lo = (Y - 1, 1)
    in_window = lambda ym: lo <= ym <= rm
    gaps = [ym_label(ym) for ym in (ym_add(lo, i) for i in range(12 + M)) if months.get(ym, 0) == 0 and ym[0] == Y]
    if gaps:
        report.warn("Нет ни одной строки за месяцы текущего года: " + ", ".join(gaps) + ". На графиках будут пропуски.")
    prev_n = months.get(ym_add(rm, -1), 0)
    if prev_n and months[rm] < 0.6 * prev_n:
        report.warn(f"За отчётный месяц строк заметно меньше, чем за прошлый: {months[rm]} против {prev_n}. "
                    "Возможно, витрина за этот месяц загружена не полностью — проверьте actual_data_dt и дату выгрузки.")
    old = sum(1 for r in totals if not in_window(r.ym))
    if old:
        report.note(f"Строк вне окна {ym_label(lo)} — {ym_label(rm)}: {old}, они не нужны и пропущены.")
    recs = [r for r in recs if in_window(r.ym)]
    totals = [r for r in recs if r.cut_dim is None]

    # ---- варианты одной метрики (metric_option / data_type)
    variants = defaultdict(Counter)
    for r in totals:
        variants[r.key][r.variant] += 1
    chosen = {}
    vdesc = lambda v: ", ".join(f"{c} = «{x if x is not None else 'пусто'}»" for c, x in zip(var_cols, v)) or "без вариантов"
    for k, cnt in variants.items():
        vs = list(cnt)
        if len(vs) == 1:
            chosen[k] = vs[0]
            continue
        want = lookup(cfg.get("variants"), k, mname.get(k))
        if want is None:
            want = lookup(cfg.get("variants"), "*")
        if want:
            ok = [v for v in vs if all(key_of(v[var_cols.index(c)]) == key_of(x) for c, x in want.items() if c in var_cols)]
            if len(ok) == 1:
                chosen[k] = ok[0]
                continue
            msg = (f"«{mname.get(k, k)}»: условию из конфига ({', '.join(f'{c} = «{x}»' for c, x in want.items())}) "
                   f"подходит {len(ok)} вариантов из {len(vs)}. Варианты в выгрузке: " + "; ".join(vdesc(v) for v in vs))
        else:
            msg = (f"«{mname.get(k, k)}» лежит в выгрузке в {len(vs)} вариантах: " + "; ".join(f"{vdesc(v)} ({n} строк)" for v, n in cnt.most_common())
                   + ". Выберите один в конфиге: \"variants\": {\"" + mname.get(k, k) + "\": {\"" + (var_cols[0] if var_cols else "metric_option")
                   + "\": \"…\"}} — или сразу для всех метрик ключом \"*\".")
        if force:
            chosen[k] = cnt.most_common(1)[0][0]
            msg += f" Черновик (--force): беру самый частый — {vdesc(chosen[k])}."
        report.error(msg)
    picked = [f"«{mname.get(k, k)}» — {vdesc(v)}" for k, v in chosen.items() if len(variants[k]) > 1]
    if picked:
        report.note("Выбранные варианты метрик: " + "; ".join(picked) + ".")
    recs = [r for r in recs if chosen.get(r.key) == r.variant]

    # ---- дубли после выбора варианта
    groups = defaultdict(list)
    for r in recs:
        groups[(r.key, r.unit, r.ym, r.cut_dim, r.cut_val)].append(r)
    dup_examples, n_dup_same = [], 0
    keep = []
    for g, rs in groups.items():
        if len(rs) == 1:
            keep.append(rs[0])
            continue
        vals = {(x.vf, x.vn, x.vd) for x in rs}
        if len(vals) == 1:
            n_dup_same += len(rs) - 1
        elif len(dup_examples) < 8:
            dup_examples.append(f"«{mname.get(g[0], g[0])}», юнит {g[1]}, {ym_label(g[2])}"
                                + (f", разрез {g[4]}" if g[3] else "") + ": value_final " + " / ".join(ru(x.vf) for x in rs))
        keep.append(rs[0])
    n_dup_diff = sum(1 for rs in groups.values() if len(rs) > 1 and len({(x.vf, x.vn, x.vd) for x in rs}) > 1)
    if n_dup_same:
        report.note(f"Полные дубли строк: {n_dup_same}, убраны.")
    if n_dup_diff:
        msg = (f"{n_dup_diff} раз на один месяц × юнит × метрику приходится несколько строк с разными значениями. "
               "Обычно это ещё одна колонка-вариант, которой нет в variant_columns, или «итого» хранится не так, как ожидается. Примеры: "
               + "; ".join(dup_examples))
        report.error(msg + (" Черновик (--force): беру первую строку." if force else ""))
    recs = keep
    totals = [r for r in recs if r.cut_dim is None]
    cur_tot = [r for r in totals if r.ym == rm]
    if not cur_tot:
        raise ConvertError(f"За {ym_label(rm)} нет ни одной строки «итого» после фильтров.")

    # ---- метрики
    by_key_now = defaultdict(list)
    for r in cur_tot:
        by_key_now[r.key].append(r)
    by_key_all = defaultdict(list)
    for r in totals:
        by_key_all[r.key].append(r)
    for k in sorted(set(by_key_all) - set(by_key_now)):
        report.warn(f"«{mname.get(k, k)}» есть в истории, но не за {ym_label(rm)} — на странице её не будет.")

    def attr(rs, a):
        vals = [getattr(r, a) for r in rs]
        return mode(vals), len({v for v in vals if v is not None})

    mcfg_all = cfg.get("metrics") or {}
    excl = {key_of(x) for x in cfg.get("metrics_exclude") or []}
    metrics = {}
    for k, rs in by_key_now.items():
        name = mname.get(k, k)
        over = lookup(mcfg_all, k, name) or {}
        if key_of(k) in excl or key_of(name) in excl or over.get("hide"):
            continue
        vt_raw, n_vt = attr(rs, "vt")
        vt = norm_vt(vt_raw)
        if vt_raw and not vt:
            report.warn(f"«{name}»: value_type = «{vt_raw}» — не знаю такого, определяю сам.")
        mt_raw, _ = attr(rs, "mtype")
        if not vt:
            vals = [r.vf for r in by_key_all[k] if r.vf is not None]
            dens = [r.vd for r in rs if r.vd]
            vt = "perc" if (key_of(mt_raw) in ("2", "2.0") and dens) else ("int" if vals and all(float(v).is_integer() for v in vals) else "real")
        mtype = norm_mtype(mt_raw, vt)
        ch_raw, n_ch = attr(rs, "change")
        change = norm_change(ch_raw)
        if not change:
            change = "up"
            report.warn(f"«{name}»: change_type = «{ch_raw or 'пусто'}» — не понимаю направление, считаю «больше — лучше». "
                        "Если наоборот, пропишите \"change\": \"down\" в metrics конфига.")
        tt_raw, _ = attr(rs, "ttype")
        ttype = norm_ttype(tt_raw)
        if ttype is None:
            ttype = "value"
            report.warn(f"«{name}»: threshold_type = «{tt_raw}» — не знаю такого, сравниваю с порогом само значение.")
        blk, _ = attr(rs, "block")
        blk_ru, _ = attr(rs, "block_ru")
        desc, _ = attr(rs, "desc")
        cta, _ = attr(rs, "cta")
        srt, _ = attr(rs, "sort")
        mlvl = sorted({r.mlvl for r in rs if r.mlvl is not None})
        if n_vt > 1 or n_ch > 1:
            report.warn(f"«{name}»: в разных строках разные value_type или change_type — беру самые частые.")
        metrics[k] = {
            "eng": k, "name": over.get("name") or name, "block_key": blk or (slug(blk_ru) if blk_ru else "other"),
            "block_name": blk_ru or blk or "Прочее", "type": int(over.get("type") or mtype), "vt": over.get("vt") or vt,
            "change": over.get("change") or change, "ttype": over.get("ttype") or ttype,
            "desc": over.get("desc") or desc or "", "cta": over.get("cta") if over.get("cta") is not None else (cta or ""),
            "unit_num": over.get("unit_num", ""), "unit_den": over.get("unit_den", ""), "gap_tpl": over.get("gap_tpl", ""),
            "sort": srt if srt is not None else 1e9, "mlvl": mlvl, "over": over, "src_name": name,
        }
    if not metrics:
        raise ConvertError("После фильтров не осталось ни одной метрики.")
    known_b = {}
    for m in metrics.values():
        known_b.setdefault(key_of(m["block_key"]), (m["block_key"], m["block_name"]))
        known_b.setdefault(key_of(m["block_name"]), (m["block_key"], m["block_name"]))
    for m in metrics.values():  # перенос метрики в другой блок из конфига
        b = m["over"].get("block")
        if b:
            m["block_key"], m["block_name"] = known_b.get(key_of(b), (slug(b), b))

    # ---- шкала процентов: 0,8889 или 88,89
    scale = {}
    for k, m in metrics.items():
        m_over = m["over"]
        if m["vt"] != "perc":
            scale[k] = 1.0
            continue
        rs = by_key_all[k]
        ratios = [r.vf / (r.vn / r.vd) for r in rs if r.vf is not None and r.vn and r.vd]
        how = m_over.get("perc_scale")
        if how in ("percent", "fraction"):
            why = "задано в конфиге"
        elif len(ratios) >= 3:
            med = statistics.median(ratios)
            how = "percent" if 60 <= med <= 140 else "fraction" if 0.6 <= med <= 1.4 else None
            why = f"по {len(ratios)} строкам с числителем и знаменателем"
            if how is None:
                vals = [abs(r.vf) for r in rs if r.vf is not None]
                how = "fraction" if vals and max(vals) <= 1.5 else "percent"
                report.warn(f"«{m['name']}»: value_final не равно ни числитель/знаменатель, ни 100 × числитель/знаменатель "
                            f"(медиана отношения {ru(med, 3)}). Считаю, что это {'доли' if how == 'fraction' else 'проценты'}; "
                            "проверьте карточку метрики на странице.")
        else:
            vals = [abs(r.vf) for r in rs if r.vf is not None]
            how = "fraction" if vals and max(vals) <= 1.5 else "percent"
            why = "по диапазону значений: числителя и знаменателя нет"
        scale[k] = 100.0 if how == "fraction" else 1.0
        m["scale_note"] = f"{'доли, умножаю на 100' if how == 'fraction' else 'уже проценты'} ({why})"
        # сходится ли value_final с числитель/знаменатель
        bad = [r for r in rs if r.vf is not None and r.vn is not None and r.vd and abs(r.vf * scale[k] - 100 * r.vn / r.vd) > 0.5]
        if rs and len(bad) > max(2, 0.02 * len(rs)):
            ex = bad[0]
            report.warn(f"«{m['name']}»: у {len(bad)} строк value_final расходится с числитель/знаменатель больше чем на 0,5 п.п. "
                        f"Пример: юнит {ex.unit}, {ym_label(ex.ym)} — {ru(ex.vf * scale[k])}% против {ru(100 * ex.vn / ex.vd)}%.")
    perc_notes = [f"«{m['name']}» — {m['scale_note']}" for m in metrics.values() if m.get("scale_note")]
    if perc_notes:
        n_frac = sum(1 for k in metrics if scale[k] == 100.0)
        report.fact(f"Проценты в value_final хранятся {'долями (0,8889)' if n_frac else 'процентами (88,89)'}"
                    + (f" у {n_frac} из {len(perc_notes)} метрик-долей" if 0 < n_frac < len(perc_notes) else "")
                    + ". Подробно: " + "; ".join(perc_notes) + ".")

    def val(r, k):
        """Значение строки в единицах страницы (проценты — 0…100)."""
        if r is None:
            return None
        raw = r.vf if r.vf is not None else r.vdone
        if raw is not None:
            return raw * scale[k]
        if r.vn is not None and r.vd:
            return r.vn / r.vd * (100 if metrics[k]["vt"] == "perc" else 1)
        return None

    # ---- каталог юнитов (по отчётному месяцу, только по оставленным метрикам)
    nm_c, par_c, lvl_c, pnm_c = defaultdict(Counter), defaultdict(Counter), defaultdict(Counter), defaultdict(Counter)
    for r in cur_tot:
        if r.key not in metrics:
            continue
        nm_c[r.unit][r.unit_nm] += 1
        par_c[r.unit][r.parent] += 1
        lvl_c[r.unit][r.lvl] += 1
        if r.parent:
            pnm_c[r.parent][r.parent_nm] += 1
    units = {}
    for u in nm_c:
        units[u] = {"nm": mode(nm_c[u]) or u, "parent": mode(par_c[u]), "lvl": mode(lvl_c[u])}
        if len([p for p in par_c[u] if p is not None]) > 1:
            report.warn(f"У юнита «{units[u]['nm']}» в разных строках разные родители — беру самого частого.")
    orphans = Counter()
    for u, x in units.items():
        if x["parent"] == u:
            x["parent"] = None
        if x["parent"] and x["parent"] not in units:
            orphans[x["parent"]] += 1
    if orphans:
        report.warn("Родитель указан, но строк по нему за отчётный месяц нет: "
                    + ", ".join(f"«{mode(pnm_c[p]) or p}» ({n} {plural(n, 'дочерний', 'дочерних', 'дочерних')})" for p, n in orphans.most_common(8))
                    + ". Его дочерние юниты становятся верхним уровнем.")
    for u, x in units.items():
        if x["parent"] not in units:
            x["parent"] = None
    # циклы в иерархии
    for u in list(units):
        seen, p = {u}, units[u]["parent"]
        while p is not None:
            if p in seen:
                raise ConvertError(f"Цикл в иерархии юнитов: {' → '.join(units[x]['nm'] for x in seen)}. Проверьте parent_functional_unit_rk.")
            seen.add(p)
            p = units[p]["parent"]
    kids = defaultdict(list)
    for u, x in units.items():
        if x["parent"] is not None:
            kids[x["parent"]].append(u)
    roots = [u for u, x in units.items() if x["parent"] is None]

    SYN = None
    if cfg.get("root_rk"):
        root = norm_id(cfg["root_rk"])
        if root not in units:
            raise ConvertError(f"root_rk = {cfg['root_rk']} из конфига не найден среди юнитов отчётного месяца.")
    elif len(roots) == 1:
        root = roots[0]
    else:
        SYN = "all" if "all" not in units else "__all__"
        root = SYN
        units[SYN] = {"nm": cfg.get("root_name") or "Все юниты", "parent": None, "lvl": None}
        for r0 in roots:
            units[r0]["parent"] = SYN
            kids[SYN].append(r0)
        report.note(f"Верхних юнитов {len(roots)} — собрал над ними общий «{units[SYN]['nm']}»: доли — как сумма числителей "
                    "к сумме знаменателей, счётчики — как сумма.")

    # глубина, обрезка по max_depth
    depth, order = {root: 1}, []
    max_depth = cfg.get("max_depth")
    stack = [root]
    while stack:
        u = stack.pop()
        order.append(u)
        for c in kids.get(u, []):
            if max_depth and depth[u] + 1 > max_depth:
                continue
            depth[c] = depth[u] + 1
            stack.append(c)
    kept = set(order)
    dropped = [u for u in units if u not in kept]
    if dropped:
        report.note(f"Юнитов вне дерева страницы: {len(dropped)}"
                    + (f" (глубже max_depth = {max_depth})" if max_depth else " (не входят в выбранный корень)") + ".")
    kkids = {u: [c for c in kids.get(u, []) if c in kept] for u in kept}
    leaf = {u: not kkids[u] for u in kept}

    def leaves_under(u):
        return [u] if leaf[u] else [x for c in kkids[u] for x in leaves_under(c)]

    # ---- численность для площади плиток
    hcfg = cfg.get("headcount") or {}
    src_key, field = None, hcfg.get("field") or "value_denominator"
    if hcfg.get("metric"):
        want = key_of(hcfg["metric"])
        src_key = next((k for k in by_key_now if key_of(k) == want or key_of(mname.get(k)) == want), None)
        if src_key is None:
            report.warn(f"Численность для площади плиток: метрики «{hcfg['metric']}» из конфига нет в выгрузке.")
    if src_key is None:
        cand = [k for k in by_key_now if "численн" in key_of(mname.get(k)) or "headcount" in k]
        if cand:
            src_key, field = cand[0], "value_final"
    hc = {}
    if src_key:
        attr_name = {"value_denominator": "vd", "value_numerator": "vn", "value_final": "vf", "value_done": "vdone"}.get(field, "vd")
        for r in by_key_now[src_key]:
            v = getattr(r, attr_name)
            if v is not None and v >= 0:
                hc[r.unit] = v
        report.note(f"Площадь плиток — численность из «{mname.get(src_key, src_key)}», поле {field}: есть у {len([u for u in kept if u in hc])} из {len(kept)} юнитов.")
    else:
        report.warn("Не нашёл, откуда взять численность юнитов: плитки на карте будут равной площади. "
                    "Укажите в конфиге headcount.metric — например, метрику, у которой знаменатель — число сотрудников.")
    if SYN and all(r0 in hc for r0 in kkids[SYN]):
        hc[SYN] = sum(hc[r0] for r0 in kkids[SYN])
    n_more, n_less = 0, 0
    for u in kept:
        if leaf[u] or u not in hc or not all(c in hc for c in kkids[u]):
            continue
        s = sum(hc[c] for c in kkids[u])
        if hc[u] > s * 1.02 + 0.5:
            n_more += 1
        elif hc[u] < s * 0.98 - 0.5:
            n_less += 1
    if n_more:
        report.fact(f"У {n_more} {plural(n_more, 'родительского юнита', 'родительских юнитов', 'родительских юнитов')} численность больше суммы дочерних: "
                    "часть сотрудников прикреплена прямо к родителю. На карте такие люди не видны — плитки показывают только дочерние юниты.")
    if n_less:
        report.warn(f"У {n_less} родительских юнитов численность меньше суммы дочерних — возможен двойной учёт сотрудников в каталоге.")

    # ---- ряды
    series = defaultdict(dict)
    for r in totals:
        if r.key in metrics and r.unit in kept:
            series[(r.key, r.unit)][r.ym] = r

    # что лежит в mom_value_final / yoy_value_final
    def detect(kind):
        res = {}
        for k in metrics:
            cnt = Counter()
            for (kk, u), ser in series.items():
                if kk != k:
                    continue
                for ym, r in ser.items():
                    raw = r.mom if kind == "mom" else r.yoy
                    base = ser.get(ym_add(ym, -1 if kind == "mom" else -12))
                    if raw is None or base is None:
                        continue
                    v, p, x = val(r, k), val(base, k), raw * scale[k]
                    if v is None or p is None:
                        continue
                    if close(x, v - p):
                        cnt["delta"] += 1
                    elif close(x, p):
                        cnt["prior"] += 1
                    elif p and close(raw, 100 * (v - p) / abs(p), ab=0.02):
                        cnt["pct"] += 1
                    elif p and close(raw, (v - p) / abs(p), ab=0.0002):
                        cnt["frac"] += 1
                    else:
                        cnt["other"] += 1
            tot = sum(cnt.values())
            if tot:
                best, n = cnt.most_common(1)[0]
                res[k] = (best if n >= 0.8 * tot else "mixed", n, tot)
        return res
    sem = {"mom": detect("mom"), "yoy": detect("yoy")}
    SEM_TXT = {"delta": "изменение (текущее − прошлое)", "prior": "само прошлое значение", "pct": "изменение в процентах",
               "frac": "изменение в долях", "other": "что-то третье", "mixed": "по-разному в разных строках"}
    for kind, col in (("mom", "mom_value_final"), ("yoy", "yoy_value_final")):
        if not sem[kind]:
            continue
        c = Counter(v[0] for v in sem[kind].values())
        parts = [f"{SEM_TXT[s]} — {n} {plural(n, 'метрика', 'метрики', 'метрик')}" for s, n in c.most_common()]
        report.fact(f"{col} — это {'; '.join(parts)}. Странице это не важно: изменения она считает сама по помесячному ряду.")

    # база прошлого года
    base_known = {}
    for k, m in metrics.items():
        if (m["over"].get("yoy_base") or "auto") == "none":
            base_known[k] = False
            continue
        base_known[k] = any(val(r, k) not in (None, 0) for (kk, u), ser in series.items() if kk == k
                            for ym, r in ser.items() if ym[0] == Y - 1)
    no_base = [k for k in metrics if not base_known[k]]
    if no_base:
        same = [k for k in no_base if any(r.yoy is not None and r.vf is not None and close(r.yoy, r.vf)
                                          for r in by_key_now[k])]
        report.fact(f"За {Y - 1} нет данных у {len(no_base)} {plural(len(no_base), 'метрики', 'метрик', 'метрик')}: "
                    + ", ".join(f"«{metrics[k]['name']}»" for k in no_base) + f". На странице у {'неё' if len(no_base) == 1 else 'них'} «нет базы "
                    + f"{Y - 1}» вместо изменения к прошлому году."
                    + (f" В самой витрине YoY у {len(same)} из них равен самому значению — в дашборде это выглядит как рост от нуля." if same else ""))

    # ---- пороги
    def thr_scale(k, pairs):
        m = metrics[k]
        vals = [abs(x) for p in pairs for x in p if x is not None]
        if not vals:
            return 1.0, None
        how = m["over"].get("threshold_scale")
        if how in ("percent", "fraction"):
            return (100.0 if how == "fraction" else 1.0), None
        small = max(vals) <= 1.5
        frac_like = max(vals) <= 1 and any(not float(x).is_integer() for x in vals)
        if m["ttype"] == "mom":
            return (100.0, "порог изменения к прошлому месяцу похож на долю — умножаю на 100") if frac_like else (1.0, None)
        if m["vt"] != "perc":
            return 1.0, None
        if scale[k] == 100.0:
            return (100.0, None) if small else (1.0, "значения — доли, а пороги уже в процентах")
        med = statistics.median([abs(val(r, k)) for r in by_key_now[k] if val(r, k) is not None] or [0])
        if frac_like and med > 1.5:
            return 100.0, "пороги похожи на доли при значениях в процентах — умножаю на 100"
        return 1.0, None

    thr_facts_lvl = []
    for k, m in metrics.items():
        rs = [r for r in by_key_now[k] if r.unit in kept]
        pairs_raw = {r.unit: (r.tr, r.ty) for r in rs}
        f, note = thr_scale(k, list(pairs_raw.values()))
        if note:
            report.warn(f"«{m['name']}»: {note}. Проверьте пороги в карточке метрики.")
        half = 0
        pairs = {}
        for u, (a, b) in pairs_raw.items():
            a = a * f if a is not None else None
            b = b * f if b is not None else None
            if (a is None) != (b is None):
                half += 1
                a = b if a is None else a
                b = a if b is None else b
            pairs[u] = (rnd(a), rnd(b)) if a is not None else (None, None)
        if half:
            report.warn(f"«{m['name']}»: у {half} юнитов задан только один порог из двух — жёлтой зоны у них нет.")
        over = m["over"]
        if "red" in over or "yellow" in over:
            red, yel = over.get("red"), over.get("yellow", over.get("red"))
            pairs = {u: (red, yel) for u in pairs}
        full = [p for p in pairs.values() if p[0] is not None]
        red, yel = (Counter(full).most_common(1)[0][0] if full else (None, None))
        m["red"], m["yellow"] = red, yel
        # направление: из пары порогов, а не из threshold_direction — так не зависим от того, что витрина им называет
        if red is not None and red != yel:
            tdir = "up" if red < yel else "down"
        else:
            tdir = m["change"]
        m["tdir"] = over.get("tdir") or tdir
        mart_dir = norm_change(mode([r.tdir for r in rs]))
        m["mart_dir"] = mart_dir
        if red is not None and m["tdir"] != m["change"]:
            report.warn(f"«{m['name']}»: пороги говорят «хорошо, когда {'растёт' if m['tdir'] == 'up' else 'снижается'}» "
                        f"(красный {ru(red)}, жёлтый {ru(yel)}), а change_type — наоборот. Цвет считаю по порогам; "
                        "проверьте, не перепутано ли в витрине.")
        # пороги по юнитам
        overrides = {}
        for u, p in pairs.items():
            if p == (red, yel):
                continue
            if p[0] is None:
                if cfg.get("respect_null_thresholds") and red is not None:
                    overrides[u] = None
                continue
            overrides[u] = [p[0], p[1]]
        m["overrides"] = overrides
        leaf_p = {pairs[u] for u in pairs if leaf.get(u) and pairs[u][0] is not None}
        agg_p = {pairs[u] for u in pairs if u in leaf and not leaf[u] and pairs[u][0] is not None}
        scaled_by_level = bool(leaf_p and agg_p and leaf_p.isdisjoint(agg_p))
        if over.get("threshold_scope") in ("any_level", "unit_level"):
            m["threshold_scope"] = over["threshold_scope"]
        elif scaled_by_level or m["type"] == 2 or m["ttype"] == "mom":
            m["threshold_scope"] = "any_level"
        else:
            m["threshold_scope"] = "unit_level"
        if red is not None:
            thr_facts_lvl.append((k, scaled_by_level, len(overrides)))
    if thr_facts_lvl:
        same = [k for k, s, n in thr_facts_lvl if not s and not n]
        scaled = [k for k, s, n in thr_facts_lvl if s]
        varied = [k for k, s, n in thr_facts_lvl if n and not s]
        parts = []
        if same:
            parts.append(f"одинаковы для всех юнитов у {len(same)} из {len(thr_facts_lvl)} метрик с порогами")
        if scaled:
            parts.append("на родителях другие, чем на конечных юнитах (витрина масштабирует их по уровню), у "
                         + ", ".join(f"«{metrics[k]['name']}»" for k in scaled))
        if varied:
            parts.append("различаются по юнитам у " + ", ".join(f"«{metrics[k]['name']}»" for k in varied))
        lvl_counters = [k for k in same if metrics[k]["type"] == 1 and metrics[k]["ttype"] == "value"]
        report.fact("Пороги " + "; ".join(parts) + "."
                    + (" Поэтому у счётчиков (" + ", ".join(f"«{metrics[k]['name']}»" for k in lvl_counters)
                       + ") агрегат не красится по порогу юнита: на странице он показан как «N из M юнитов за порогом»." if lvl_counters else ""))
        dirs = [(k, metrics[k]["mart_dir"]) for k, _, _ in thr_facts_lvl if metrics[k]["mart_dir"]]
        if dirs:
            agree = sum(1 for k, d in dirs if d == metrics[k]["tdir"])
            report.fact(f"threshold_direction совпадает с направлением, которое следует из пары красный/жёлтый, у {agree} из {len(dirs)} метрик"
                        + ("." if agree == len(dirs) else " — значит, в витрине это поле означает что-то другое; страница берёт направление из самих порогов."))
        mlvls = sorted({x for m in metrics.values() for x in m["mlvl"]})
        if mlvls:
            report.fact("metric_lvl в выгрузке: " + ", ".join(mlvls) + ". Страница это поле не использует — уточните у владельца, что оно значит.")

    # ---- факты по юнитам
    cut_page = set(cfg.get("cut_dims_page") or [])
    cuts_src = defaultdict(lambda: defaultdict(list))
    for r in recs:
        if r.cut_dim in cut_page and r.ym == rm and r.key in metrics and r.unit in kept and leaf.get(r.unit):
            cuts_src[(r.key, r.unit)][r.cut_dim].append(r)
    cut_order = {d: [key_of(x) for x in xs] for d, xs in (cfg.get("cut_order") or {}).items()}

    def cuts_for(k, u):
        src = cuts_src.get((k, u))
        if not src:
            return None
        out = {}
        for d, rs in src.items():
            parts = []
            for r in rs:
                if metrics[k]["type"] == 2:
                    num = r.vn if r.vn is not None else (val(r, k) / 100 * r.vd if val(r, k) is not None and r.vd else None)
                    den = r.vd or 0
                else:
                    num, den = val(r, k), r.vd or 0
                if num is not None:
                    parts.append({"name": r.cut_val, "num": rnd(num, 2), "den": rnd(den, 2)})
            if len(parts) < 2:
                continue
            order = cut_order.get(d, [])
            parts.sort(key=lambda p: (order.index(key_of(p["name"])) if key_of(p["name"]) in order else len(order), -(p["num"] or 0)))
            out[d] = {"label": (cfg.get("cut_labels") or {}).get(d, d), "parts": parts}
        return out or None

    def fact_from(k, cur, prev, now_num, now_den, now_rec, u):
        v = cur[-1] if cur else None
        if v is None:
            return None
        pm = cur[-2] if len(cur) >= 2 else (prev[11] if len(prev) == 12 else None)
        mom = v - pm if pm is not None else None
        if mom is None and now_rec is not None and now_rec.mom is not None:
            s = sem["mom"].get(k, (None,))[0]
            x = now_rec.mom * scale[k]
            mom = x if s == "delta" else (v - x) if s == "prior" else None
        yk = bool(base_known[k] and len(prev) == 12 and prev[M - 1] is not None)
        f = {"value_final": rnd(v), "value_numerator": rnd(now_num), "value_denominator": rnd(now_den),
             "mom_value_final": rnd(mom), "yoy_value_final": rnd(v - prev[M - 1]) if yk else None, "yoy_known": yk,
             "cur": [rnd(x) for x in cur], "prev": [rnd(x) for x in prev] if any(x is not None for x in prev) else [],
             "cuts": cuts_for(k, u) if u is not None else None}
        if u is not None and u in metrics[k]["overrides"]:
            f["thr"] = metrics[k]["overrides"][u]
        return f

    facts = {u: {} for u in kept}
    n_fill = n_miss = n_fallback = 0
    miss_by_metric = Counter()
    for u in kept:
        if u == SYN:
            continue
        for k in metrics:
            ser = series.get((k, u), {})
            now = ser.get(rm)
            cur = [val(ser.get((Y, i)), k) for i in range(1, M + 1)]
            prev = [val(ser.get((Y - 1, i)), k) for i in range(1, 13)]
            if now is not None and now.vf is None and cur[-1] is not None:
                n_fallback += 1
            f = fact_from(k, cur, prev, now.vn if now else None, now.vd if now else None, now, u) if now else None
            facts[u][k] = f
            if f is None:
                n_miss += 1
                miss_by_metric[k] += 1
            else:
                n_fill += 1
    if n_fallback:
        report.note(f"У {n_fallback} строк пустой value_final — взял value_done или числитель/знаменатель.")

    # общий корень над несколькими верхними юнитами
    if SYN:
        top = kkids[SYN]
        for k, m in metrics.items():
            additive = m["over"].get("additive", True)

            def agg(ym):
                rs = [series.get((k, t), {}).get(ym) for t in top]
                if any(r is None for r in rs):
                    return None, None, None
                if m["type"] == 2:
                    if any(r.vn is None or r.vd is None for r in rs):
                        return None, None, None
                    n, d = sum(r.vn for r in rs), sum(r.vd for r in rs)
                    return (n / d * (100 if m["vt"] == "perc" else 1) if d else None), n, d
                if not additive:
                    return None, None, None
                vs = [val(r, k) for r in rs]
                return (None if any(v is None for v in vs) else sum(vs)), None, None
            cur = [agg((Y, i))[0] for i in range(1, M + 1)]
            prev = [agg((Y - 1, i))[0] for i in range(1, 13)]
            _, n_now, d_now = agg(rm)
            facts[SYN][k] = fact_from(k, cur, prev, n_now, d_now, None, None)
            if facts[SYN][k] is None:
                n_miss += 1
                miss_by_metric[k] += 1
                report.warn(f"«{m['name']}» для общего «{units[SYN]['nm']}» не посчитана: не у всех верхних юнитов есть данные"
                            + ("" if additive else " (метрика помечена как неаддитивная)") + ".")
    if n_miss:
        worst = ", ".join(f"«{metrics[k]['name']}» — {n}" for k, n in miss_by_metric.most_common(5))
        report.warn(f"Нет данных за {ym_label(rm)} в {n_miss} клетках юнит × метрика из {n_miss + n_fill} "
                    f"(больше всего: {worst}). На странице они серые, с подписью «нет данных».")

    # как считаются доли и суммы на родителях — сверяем с детьми
    agg_sum = agg_mean = agg_none = 0
    add_eq = add_more = add_less = 0
    for u in kept:
        if leaf[u] or u == SYN:
            continue
        for k, m in metrics.items():
            pr = series.get((k, u), {}).get(rm)
            ks = [series.get((k, c), {}).get(rm) for c in kkids[u]]
            if pr is None or not ks or any(x is None for x in ks):
                continue
            pv = val(pr, k)
            if pv is None:
                continue
            if m["type"] == 2:
                if any(x.vn is None or not x.vd for x in ks):
                    continue
                sv = sum(x.vn for x in ks) / sum(x.vd for x in ks) * (100 if m["vt"] == "perc" else 1)
                mv = statistics.mean(val(x, k) for x in ks)
                if close(pv, sv, ab=0.05):
                    agg_sum += 1
                elif close(pv, mv, ab=0.05):
                    agg_mean += 1
                else:
                    agg_none += 1
            else:
                cv = [val(x, k) for x in ks]
                if any(v is None for v in cv):
                    continue
                s = sum(cv)
                if close(pv, s, ab=0.05):
                    add_eq += 1
                elif pv > s:
                    add_more += 1
                else:
                    add_less += 1
    if agg_sum + agg_mean + agg_none:
        t = agg_sum + agg_mean + agg_none
        report.fact(f"Доли на родительских юнитах: сумма числителей / сумма знаменателей детей — в {agg_sum} из {t} случаев"
                    + (f", среднее долей детей — в {agg_mean}" if agg_mean else "")
                    + (f", ни то ни другое — в {agg_none} (у родителя есть свои цели или сотрудники вне детей)" if agg_none else "")
                    + ". Страница показывает value_final родителя как есть.")
    if add_eq + add_more + add_less:
        report.fact(f"Счётчики на родителях: равны сумме детей в {add_eq} случаях, больше суммы — в {add_more}, меньше — в {add_less}.")

    # ---- блоки
    bkeys = {}
    for m in metrics.values():
        bkeys.setdefault(m["block_key"], m["block_name"])
    safe_b = {}
    for b in bkeys:
        s = slug(b)
        while s in safe_b.values():
            s += "_"
        safe_b[b] = s
    border_cfg = cfg.get("block_order")
    first_sort = {b: min(m["sort"] for m in metrics.values() if m["block_key"] == b) for b in bkeys}
    if border_cfg:
        pos = {key_of(x): i for i, x in enumerate(border_cfg)}
        bord = sorted(bkeys, key=lambda b: (min(pos.get(key_of(b), 99), pos.get(key_of(bkeys[b]), 99)), first_sort[b], bkeys[b]))
    else:
        bord = sorted(bkeys, key=lambda b: (first_sort[b], bkeys[b]))
    blocks, bmeta = {}, {}
    for b in bord:
        over = lookup(cfg.get("blocks"), b, bkeys[b]) or {}
        blocks[safe_b[b]] = over.get("name") or bkeys[b]
        bmeta[safe_b[b]] = block_meta_for(b, bkeys[b], over)

    # ---- порядок метрик
    inc = cfg.get("metrics_include")
    if inc:
        found = []
        for x in inc:
            k = next((k for k, m in metrics.items() if key_of(k) == key_of(x) or key_of(m["src_name"]) == key_of(x) or key_of(m["name"]) == key_of(x)), None)
            if k is None:
                report.warn(f"metrics_include: метрики «{x}» нет в выгрузке.")
            elif k not in found:
                found.append(k)
        mkeys = found
        rest = [m["name"] for k, m in metrics.items() if k not in found]
        if rest:
            report.note("Не вошли в страницу (нет в metrics_include): " + ", ".join(f"«{n}»" for n in rest) + ".")
        mkeys.sort(key=lambda k: bord.index(metrics[k]["block_key"]))  # на кольце метрики идут блоками
    else:
        mkeys = sorted(metrics, key=lambda k: (bord.index(metrics[k]["block_key"]), metrics[k]["sort"], metrics[k]["name"]))
    if not mkeys:
        raise ConvertError("После metrics_include не осталось ни одной метрики.")
    if len(mkeys) > 20:
        report.warn(f"Метрик {len(mkeys)}: на кольце радара им тесно (удобно до 20). Оставьте главные через metrics_include.")

    # ---- безопасные идентификаторы: они попадают в атрибуты HTML
    safe_u, used = {}, set()
    for u in order:
        s = u if SAFE_ID.match(u) else (re.sub(r"[^A-Za-z0-9_.:-]", "_", u) or "u")
        base, n = s, 2
        while s in used:
            s, n = f"{base}_{n}", n + 1
        used.add(s)
        safe_u[u] = s

    # ---- сборка
    out_units = []

    def walk(u):
        x = units[u]
        out_units.append({
            "functional_unit_rk": safe_u[u], "functional_unit_nm": x["nm"],
            "lvl_unit": int(x["lvl"]) if isinstance(x["lvl"], (int, float)) else depth[u], "depth": depth[u],
            "parent_functional_unit_rk": safe_u.get(x["parent"]) if x["parent"] in kept else None,
            "headcount": rnd(hc[u], 1) if u in hc else None, "leaf": leaf[u],
        })
        for c in sorted(kkids[u], key=lambda c: (-(hc.get(c) or 0), units[c]["nm"])):
            walk(c)
    walk(root)

    out_metrics = []
    for k in mkeys:
        m = metrics[k]
        out_metrics.append({
            "eng": k, "name": m["name"], "block": safe_b[m["block_key"]], "type": m["type"], "vt": m["vt"],
            "change": m["change"], "red": m["red"], "yellow": m["yellow"], "tdir": m["tdir"], "ttype": m["ttype"],
            "desc": m["desc"], "cta": m["cta"], "unit_num": m["unit_num"], "unit_den": m["unit_den"],
            "gap_tpl": m["gap_tpl"], "threshold_scope": m["threshold_scope"],
        })
    out_facts = {safe_u[u]: {k: facts[u].get(k) for k in mkeys} for u in order}

    adts = [r.adt for r in cur_tot if r.adt]
    adt = max(adts) if adts else dt.date.today()
    period = f"{MONTHS_NOM[M - 1]} {Y}"
    mcfg = cfg.get("meta") or {}
    meta = {
        "product": mcfg.get("product") or "COO Hub",
        "title": mcfg.get("title") or f"COO Hub · {period}",
        "period_label": period,
        "business_month": f"{Y}-{M:02d}-01",
        "actual_data_dt": adt.isoformat(),
        "aggr_type": cfg.get("aggr_type") or "M",
        "year": Y,
        "months": MONTHS_SHORT,
        "n_fact": M,
        "root": safe_u[root],
        "source": mcfg.get("source") or "Витрина COO Hub",
        "owner": mcfg.get("owner") or "",
        "disclaimer": (mcfg.get("disclaimer") or "").replace("{date}", adt.strftime("%d.%m.%Y")),
        "real": True,
        "generated_at": dt.datetime.now().strftime("%Y-%m-%d %H:%M"),
        "input_file": Path(path).name,
    }
    doc = {"meta": meta, "blocks": blocks, "block_order": list(blocks), "block_meta": bmeta,
           "units": out_units, "metrics": out_metrics, "facts": out_facts}

    # ---- сводка
    lv = Counter(depth[u] for u in kept)
    report.title = f"Проверка выгрузки COO Hub · {period}"
    report.note(f"Отчётный месяц: {ym_label(rm)} (данные витрины на {adt.strftime('%d.%m.%Y')}). Окно рядов: {ym_label(lo)} — {ym_label(rm)}.")
    month_end = dt.date(Y + (M == 12), M % 12 + 1, 1) - dt.timedelta(days=1)
    if adts and adt < month_end:
        report.note(f"Месяц в витрине ещё не закрыт: данные на {adt.strftime('%d.%m.%Y')}, а {ym_label(rm)} кончается "
                    f"{month_end.strftime('%d.%m.%Y')}. Для промежуточного взгляда это нормально, для итогов месяца — рано.")
    report.note(f"Юнитов на странице: {len(kept)} — " + ", ".join(f"уровень {d}: {n}" for d, n in sorted(lv.items()))
                + f"; конечных: {sum(1 for u in kept if leaf[u])}. Корень: «{units[root]['nm']}».")
    bl = Counter(safe_b[metrics[k]["block_key"]] for k in mkeys)
    report.note(f"Метрик: {len(mkeys)} — " + ", ".join(f"{blocks[b]}: {n}" for b, n in bl.items()) + ".")
    crowded = [(units[u]["nm"], len(kkids[u])) for u in kept if len(kkids[u]) > 16]
    if crowded:
        report.warn("На карте продуктов тесно: " + ", ".join(f"у «{n}» {c} дочерних юнитов" for n, c in crowded[:5])
                    + ". Плитки станут мелкими — можно ограничить глубину через max_depth или выбрать другой root_rk.")
    return doc, {"units": units, "kept": kept, "leaf": leaf, "kkids": kkids, "root": root, "safe_u": safe_u, "rm": rm}


# --------------------------------------------------------------------------- как страница окрасит — та же логика, что в m_hub.js
def page_status(doc):
    U = {u["functional_unit_rk"]: u for u in doc["units"]}
    kids = defaultdict(list)
    for u in doc["units"]:
        if u["parent_functional_unit_rk"]:
            kids[u["parent_functional_unit_rk"]].append(u["functional_unit_rk"])
    F = doc["facts"]

    def leaves(rk):
        return [rk] if U[rk]["leaf"] else [x for c in kids[rk] for x in leaves(c)]

    def th(m, rk):
        f = F[rk].get(m["eng"])
        if f and "thr" in f:
            return tuple(f["thr"]) if f["thr"] else (None, None)
        return m["red"], m["yellow"]

    def prev_month(f):
        c, p = f["cur"], f["prev"]
        v = c[-2] if len(c) >= 2 else (p[11] if len(p) == 12 else None)
        if v is None and f["value_final"] is not None and f["mom_value_final"] is not None:
            v = f["value_final"] - f["mom_value_final"]  # в ряду пропуск — берём из изменения, как страница
        return v

    def raw(m, rk):
        f = F[rk].get(m["eng"])
        red, yel = th(m, rk)
        if f is None or red is None:
            return "none"
        if m["ttype"] == "mom":
            p = prev_month(f)
            if not p:
                return "none"
            v = 100 * (f["value_final"] - p) / abs(p)
        else:
            v = f["value_final"]
        if m["tdir"] == "up":
            return "red" if v < red else "amber" if v < yel else "ok"
        return "red" if v > red else "amber" if v > yel else "ok"

    def status(m, rk):
        if m["threshold_scope"] == "unit_level" and not U[rk]["leaf"]:
            st = [raw(m, x) for x in leaves(rk)]
            st = [s for s in st if s != "none"]
            return "none" if not st else "inner" if "red" in st else "ok"
        return raw(m, rk)
    return status, U, kids


def fmt_val(v, m):
    if v is None:
        return "—"
    if m["vt"] == "perc":
        return ru(v, 2) + "%"
    return ru(v, 1 if m["vt"] == "real" else 0)


def fmt_delta(v, m, known=True):
    if not known:
        return "нет базы"
    if v is None:
        return "—"
    s = "+" if v > 0 else "−" if v < 0 else "±"
    return s + (ru(abs(v), 2) + " п.п." if m["vt"] == "perc" else ru(abs(v), 1 if m["vt"] == "real" else 0))


def add_page_sections(doc, report):
    status, U, kids = page_status(doc)
    root = doc["meta"]["root"]
    MS = doc["metrics"]
    ST = {"red": "красная зона", "amber": "жёлтая зона", "ok": "в норме", "none": "без порога", "inner": "пробито внутри"}
    st_root = {m["eng"]: status(m, root) for m in MS}
    c = Counter(st_root.values())
    names = lambda s: ", ".join(m["name"] for m in MS if st_root[m["eng"]] == s)
    lines = [f"«{U[root]['functional_unit_nm']}»: **{c['red']}** в красной зоне"
             + (f" ({names('red')})" if c["red"] else "")
             + f", **{c['amber'] + c['inner']}** на грани" + (f" ({', '.join(x for x in (names('amber'), names('inner')) if x)})" if c["amber"] + c["inner"] else "")
             + f", {c['ok']} в норме, {c['none']} без порога или без данных."]
    rows = []
    for rk in kids[root]:
        s = Counter(status(m, rk) for m in MS)
        rows.append([U[rk]["functional_unit_nm"], s["red"], s["amber"], s["inner"], s["ok"], s["none"]])
    body = "\n".join(lines)
    if rows:
        body += "\n\n" + md_table(["Юнит", "красных", "жёлтых", "пробито внутри", "в норме", "без порога / данных"], rows)
    report.section("Что директор увидит на первом экране", body)

    F = doc["facts"][root]
    t = []
    for m in MS:
        f = F.get(m["eng"])
        if f is None:
            t.append([m["name"], "нет данных", "", "", "", ""])
            continue
        t.append([m["name"], fmt_val(f["value_final"], m), fmt_delta(f["mom_value_final"], m),
                  fmt_delta(f["yoy_value_final"], m, f["yoy_known"]), ST[st_root[m["eng"]]], "☐"])
    report.section("Сверка с Superset",
                   f"Откройте дашборд COO Hub за {doc['meta']['period_label'].lower()} на уровне «{U[root]['functional_unit_nm']}» и сверьте "
                   "хотя бы пять строк: по одной из каждого блока и все красные. Расхождение больше округления — "
                   "повод не отправлять, пока не найдена причина.\n\n"
                   + md_table(["Метрика", "Значение", "К прошлому месяцу", "К прошлому году", "Статус на странице", "Сошлось"], t))


def main(argv=None):
    for stream in (sys.stdout, sys.stderr):  # консоль Windows в cp1251 не знает «₽» и «→» — не падаем, а заменяем
        try:
            stream.reconfigure(errors="replace")
        except (AttributeError, ValueError):
            pass
    ap = argparse.ArgumentParser(description="Выгрузка витрины COO Hub → JSON страницы и отчёт проверок.")
    ap.add_argument("export", help="CSV или XLSX с выгрузкой витрины")
    ap.add_argument("--config", default=str(Path(__file__).with_name("coohub_config.json")))
    ap.add_argument("--month", help="отчётный месяц, например 2026-09 (по умолчанию — последний в выгрузке)")
    ap.add_argument("--out", help="куда записать JSON")
    ap.add_argument("--report", help="куда записать отчёт (Markdown)")
    ap.add_argument("--force", action="store_true", help="собрать черновик, даже если есть ошибки")
    a = ap.parse_args(argv)
    cfg = load_config(a.config if a.config and Path(a.config).exists() else None,
                      {"report_month": a.month} if a.month else None)
    report = Report()
    report.forced = a.force
    try:
        doc, _ = convert(a.export, cfg, report, force=a.force)
        add_page_sections(doc, report)
    except ConvertError as e:
        report.error(str(e))
        doc = None
    text = report.render()
    if a.report:
        Path(a.report).write_text(text, encoding="utf-8")
    print(text)
    if doc is None or (report.errors and not a.force):
        return 1
    if a.out:
        Path(a.out).write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
