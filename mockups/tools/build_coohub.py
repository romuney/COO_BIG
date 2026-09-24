#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Одна команда: выгрузка витрины → проверенные данные → один HTML-файл для исполнительного директора.

    python3 mockups/tools/build_coohub.py mockups/exports/coo_hub_2026-09.csv
    python3 mockups/tools/build_coohub.py выгрузка.xlsx --month 2026-09
    python3 mockups/tools/build_coohub.py --demo          # то же самое на вымышленной выгрузке

Результат — в mockups/out/ (эта папка не попадает в git):
    coo_hub_2026-09.html        страница: один файл, работает без интернета, шрифты внутри
    coo_hub_2026-09.json        данные страницы
    coo_hub_2026-09_check.md    отчёт проверок и таблица для сверки с Superset

Нужен только Python 3.8+ без сторонних библиотек и папка mockups из репозитория (шаблон, стили, шрифты).
"""
import argparse
import json
import sys
from pathlib import Path

TOOLS = Path(__file__).resolve().parent
ROOT = TOOLS.parent
sys.path.insert(0, str(TOOLS))
sys.path.insert(0, str(ROOT / "src"))

import build as page  # noqa: E402
import mart_to_json as conv  # noqa: E402


def main(argv=None):
    for stream in (sys.stdout, sys.stderr):  # консоль Windows в cp1251 не знает «₽» и «→» — не падаем, а заменяем
        try:
            stream.reconfigure(errors="replace")
        except (AttributeError, ValueError):
            pass
    ap = argparse.ArgumentParser(description="Выгрузка витрины COO Hub → HTML для исполнительного директора.")
    ap.add_argument("export", nargs="?", help="CSV или XLSX с выгрузкой витрины (SQL — mockups/sql/coo_hub_export.sql)")
    ap.add_argument("--month", help="отчётный месяц, например 2026-09 (по умолчанию — последний в выгрузке)")
    ap.add_argument("--config", default=str(TOOLS / "coohub_config.json"), help="файл настроек")
    ap.add_argument("--out-dir", default=str(ROOT / "out"), help="куда положить результат")
    ap.add_argument("--force", action="store_true", help="собрать черновик, даже если есть ошибки (не для отправки)")
    ap.add_argument("--demo", action="store_true", help="собрать на вымышленной выгрузке — проверить, что всё работает")
    a = ap.parse_args(argv)
    if not a.export and not a.demo:
        ap.error("укажите файл выгрузки или --demo")

    out_dir = Path(a.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    overrides = {}
    if a.demo:
        import make_sample_export
        export, n = make_sample_export.write(out=out_dir / "sample_export_2026-09.csv")
        print(f"Вымышленная выгрузка: {export} ({n} строк)")
        overrides = {"variants": {"*": {"metric_option": "Все юниты"}},
                     "meta": {"disclaimer": "Демо на вымышленной выгрузке: структура витрины настоящая, цифры сгенерированы."}}
    else:
        export = Path(a.export)
    if a.month:
        overrides["report_month"] = a.month

    cfg = conv.load_config(a.config if Path(a.config).exists() else None, overrides)
    report = conv.Report()
    report.forced = a.force
    doc = None
    try:
        doc, _ = conv.convert(export, cfg, report, force=a.force)
        conv.add_page_sections(doc, report)
    except conv.ConvertError as e:
        report.error(str(e))

    stem = f"coo_hub_{doc['meta']['business_month'][:7]}" if doc else "coo_hub"
    if a.demo:
        stem += "_demo"
    check = out_dir / f"{stem}_check.md"
    check.write_text(report.render(), encoding="utf-8")

    print()
    print(report.title)
    print(report.source)
    for i, e in enumerate(report.errors, 1):
        print(f"\n  ОШИБКА {i}. {e}")
    for w in report.warnings:
        print(f"\n  ! {w}")
    if doc is None or (report.errors and not a.force):
        print(f"\nСборка остановлена. Отчёт целиком: {check}")
        return 1

    data = out_dir / f"{stem}.json"
    data.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    name = f"{stem}{'_draft' if report.errors else ''}.html"
    html = page.build("m_hub.html", name, "m_hub.js", data=data, out_dir=out_dir, title=doc["meta"]["title"])
    first = next((b for t, b in report.sections if t.startswith("Что директор")), "").split("\n")[0]
    print(f"\n{first.replace('**', '')}")
    print(f"\nСтраница:  {html}  ({html.stat().st_size // 1024} КБ, открывается без интернета)")
    print(f"Проверка:  {check}  — прочитайте предупреждения и сверьте пять чисел с Superset")
    if report.errors:
        print("\nЭто черновик с ошибками (--force): директору не отправлять.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
