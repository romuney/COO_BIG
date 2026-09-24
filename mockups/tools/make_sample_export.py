#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Вымышленная выгрузка в формате витрины COO Hub — чтобы проверить конвейер без доступа к витрине.

Берёт данные макета (mockups/data/coo_hub_2026-09.json) и раскладывает их так, как их отдала бы витрина:
строка на месяц × юнит × метрику, строки разрезов по сотрудникам за отчётный месяц, два варианта
metric_option у метрик целей, проценты долями, в mom_ и yoy_ — прошлые значения, «;» и десятичная запятая,
как после русского Excel. Описание и призыв к действию — только в строках отчётного месяца, как в SQL-шаблоне.

    python3 mockups/tools/make_sample_export.py mockups/out/sample_export_2026-09.csv
"""
import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "data" / "coo_hub_2026-09.json"

COLUMNS = [
    "business_month", "actual_data_dt", "aggr_type", "current_year_flg", "last_12_months_flg",
    "functional_unit_rk", "functional_unit_id", "functional_unit_nm", "parent_functional_unit_rk",
    "parent_functional_unit_nm", "lvl_unit", "source_metrics_block", "source_metrics_block_ru",
    "metric_type", "metric_name", "metric_name_eng_lower", "change_type", "value_type", "metric_option",
    "data_type", "metric_desc", "call_to_action", "threshold_red", "threshold_yellow", "threshold_direction",
    "threshold_type", "metric_lvl", "sort_number", "value_done", "value_numerator", "value_denominator",
    "value_final", "mom_value_final", "yoy_value_final", "emp_specialization_oper_code",
    "emp_specialization_it_code", "seniority_group",
]
CUT_COL = {"oper": "emp_specialization_oper_code", "it": "emp_specialization_it_code", "seniority": "seniority_group"}


def num(v):
    """Число так, как его пишет русский Excel: десятичная запятая, без лишних нулей."""
    if v is None:
        return ""
    v = float(v)
    s = str(int(v)) if v.is_integer() else f"{v:.6f}".rstrip("0").rstrip(".")
    return s.replace(".", ",")


def write(src=SRC, out=None):
    d = json.loads(Path(src).read_text(encoding="utf-8"))
    meta, units, metrics, facts, blocks = d["meta"], d["units"], d["metrics"], d["facts"], d["blocks"]
    y = int(meta["business_month"][:4])
    n = meta["n_fact"]
    by_rk = {u["functional_unit_rk"]: u for u in units}
    rows = []

    def base_row(u, m, ym, option):
        p = by_rk.get(u["parent_functional_unit_rk"])
        k = 0.01 if m["vt"] == "perc" else 1  # проценты витрина хранит долями
        cur_month = ym == (y, n)
        return {
            "business_month": f"{ym[0]}-{ym[1]:02d}-01", "actual_data_dt": meta["actual_data_dt"], "aggr_type": "M",
            "current_year_flg": int(ym[0] == y), "last_12_months_flg": int((ym[0] * 12 + ym[1]) > (y * 12 + n - 12)),
            "functional_unit_rk": u["functional_unit_rk"], "functional_unit_id": "FU-" + u["functional_unit_rk"].upper(),
            "functional_unit_nm": u["functional_unit_nm"], "parent_functional_unit_rk": p["functional_unit_rk"] if p else "",
            "parent_functional_unit_nm": p["functional_unit_nm"] if p else "", "lvl_unit": u["lvl_unit"],
            "source_metrics_block": m["block"], "source_metrics_block_ru": blocks[m["block"]],
            "metric_type": m["type"], "metric_name": m["name"], "metric_name_eng_lower": m["eng"],
            "change_type": m["change"], "value_type": m["vt"], "metric_option": option, "data_type": "fact",
            "metric_desc": m["desc"] if cur_month else "", "call_to_action": m["cta"] if cur_month else "",
            "threshold_red": num(m["red"] * k) if m["red"] is not None and m["ttype"] == "value" else num(m["red"]),
            "threshold_yellow": num(m["yellow"] * k) if m["yellow"] is not None and m["ttype"] == "value" else num(m["yellow"]),
            "threshold_direction": m["tdir"], "threshold_type": m["ttype"], "metric_lvl": 3,
            "sort_number": [x["eng"] for x in metrics].index(m["eng"]) + 1,
        }, k

    for u in units:
        rk = u["functional_unit_rk"]
        for m in metrics:
            f = facts[rk][m["eng"]]
            known = f["yoy_known"]
            series = {}
            for i, v in enumerate(f["prev"]):
                if known:
                    series[(y - 1, i + 1)] = v
            for i, v in enumerate(f["cur"]):
                series[(y, i + 1)] = v
            options = ["Все юниты", "Фокусные юниты"] if m["block"] == "goals" else [""]
            for option in options:
                shift = 1.0 if option != "Фокусные юниты" else 0.93
                for ym, v in sorted(series.items()):
                    r, k = base_row(u, m, ym, option)
                    v = v * shift
                    prev_ym = (ym[0], ym[1] - 1) if ym[1] > 1 else (ym[0] - 1, 12)
                    pm = series.get(prev_ym)
                    py = series.get((ym[0] - 1, ym[1]))
                    r["value_final"] = num(round(v * k, 6))
                    r["value_done"] = num(v) if m["type"] == 1 else ""
                    if ym == (y, n):
                        r["value_numerator"] = num(f["value_numerator"])
                        r["value_denominator"] = num(f["value_denominator"])
                    r["mom_value_final"] = num(round(pm * shift * k, 6)) if pm is not None else ""
                    r["yoy_value_final"] = (num(round(py * shift * k, 6)) if py is not None else ("0" if ym[0] == y else ""))
                    rows.append(r)
            # разрезы по сотрудникам — только отчётный месяц, как в SQL-шаблоне
            for dim, cut in (f.get("cuts") or {}).items():
                for part in cut["parts"]:
                    r, k = base_row(u, m, (y, n), options[0])
                    r[CUT_COL[dim]] = part["name"]
                    if m["type"] == 2:
                        r["value_numerator"], r["value_denominator"] = num(part["num"]), num(part["den"])
                        r["value_final"] = num(round(part["num"] / part["den"] * (100 * k), 6)) if part["den"] else ""
                    else:
                        r["value_final"] = num(part["num"])
                        r["value_done"] = num(part["num"])
                        r["value_denominator"] = num(part["den"])
                    rows.append(r)
        # годовые агрегаты: в выгрузке встречаются, конвертер должен их пропустить
        m = metrics[0]
        r, _ = base_row(u, m, (y - 1, 12), "Все юниты")
        r["aggr_type"], r["value_final"] = "Y", "0,5"
        rows.append(r)

    out = Path(out or ROOT / "out" / f"sample_export_{meta['business_month'][:7]}.csv")
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", encoding="utf-8-sig", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=COLUMNS, delimiter=";", lineterminator="\r\n", extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)
    return out, len(rows)


if __name__ == "__main__":
    path, n = write(out=sys.argv[1] if len(sys.argv) > 1 else None)
    print(f"written {path} ({n} rows, {path.stat().st_size // 1024} KB)")
