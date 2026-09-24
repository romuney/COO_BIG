#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Одна команда: выгрузка витрины (CSV или XLSX) → проверенные данные → готовая страница.

    python3 tools/make_page.py выгрузка.csv
    python3 tools/make_page.py выгрузка.xlsx --month 2026-09 --out-dir out

Результат в out/ (по умолчанию — рядом с папкой tools):
    coo_hub_2026-09.html        страница для исполнительного директора — один файл, работает без интернета
    coo_hub_2026-09.json        данные страницы в формате DATA_FORMAT.md
    coo_hub_2026-09_check.md    отчёт проверок, «что витрина показала о себе» и таблица сверки с Superset

Нужны только Python 3.8+ и соседние файлы комплекта: mart_to_json.py, validate_data.py, embed_data.py,
coohub_config.json и page/template.html.
"""
import argparse
import json
import sys
from pathlib import Path

TOOLS = Path(__file__).resolve().parent
sys.path.insert(0, str(TOOLS))

import embed_data  # noqa: E402
import mart_to_json as conv  # noqa: E402
import validate_data  # noqa: E402


def main(argv=None):
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(errors="replace")
        except (AttributeError, ValueError):
            pass
    ap = argparse.ArgumentParser(description="Выгрузка витрины COO Hub → страница «COO Hub · Радар».")
    ap.add_argument("export", help="CSV или XLSX — результат основного запроса из sql/coo_hub_export.sql")
    ap.add_argument("--month", help="отчётный месяц, например 2026-09 (по умолчанию — последний в выгрузке)")
    ap.add_argument("--config", default=str(TOOLS / "coohub_config.json"))
    ap.add_argument("--template", default=str(embed_data.DEFAULT_TEMPLATE))
    ap.add_argument("--out-dir", default=str(TOOLS.parent / "out"))
    ap.add_argument("--force", action="store_true", help="собрать черновик, даже если есть ошибки (не для отправки)")
    a = ap.parse_args(argv)

    out_dir = Path(a.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    cfg = conv.load_config(a.config if Path(a.config).exists() else None, {"report_month": a.month} if a.month else None)
    report = conv.Report()
    report.forced = a.force
    doc = None
    try:
        doc, _ = conv.convert(a.export, cfg, report, force=a.force)
        conv.add_page_sections(doc, report)
        v_err, v_warn = validate_data.validate(doc)  # вторая линия защиты: конвертер и формат проверяют друг друга
        for e in v_err:
            report.error("Проверка формата: " + e)
        for w in v_warn:
            if w not in report.warnings:
                report.warn("Проверка формата: " + w)
    except conv.ConvertError as e:
        report.error(str(e))

    stem = f"coo_hub_{doc['meta']['business_month'][:7]}" if doc else "coo_hub"
    check = out_dir / f"{stem}_check.md"
    check.write_text(report.render(), encoding="utf-8")
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
    data.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":"), allow_nan=False), encoding="utf-8")
    html_text = embed_data.embed(Path(a.template).read_text(encoding="utf-8"), doc)
    urls = embed_data.external_urls(html_text)
    if urls:
        print("\nОШИБКА: в странице внешние ссылки — она должна работать без сети: " + ", ".join(urls[:5]))
        return 1
    html = out_dir / f"{stem}{'_draft' if report.errors else ''}.html"
    html.write_text(html_text, encoding="utf-8")
    first = next((b for t, b in report.sections if t.startswith("Что директор")), "").split("\n")[0]
    print(f"\n{first.replace('**', '')}")
    print(f"\nСтраница:  {html}  ({html.stat().st_size // 1024} КБ, без интернета)")
    print(f"Данные:    {data}")
    print(f"Проверка:  {check}  — предупреждения и таблица для сверки с Superset")
    if report.errors:
        print("\nЭто черновик с ошибками (--force): директору не отправлять.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
