#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Собрать комплект для агента в контуре: шаблон страницы, формат данных, пример, SQL, инструменты.

    python3 mockups/tools/make_agent_kit.py

Результат:
    mockups/out/coo_hub_radar_kit/       папка комплекта (в git не попадает)
    mockups/dist/coo_hub_radar_kit.zip   тот же комплект одним архивом — его и передают в контур

В комплекте только вымышленные данные. Шаблон собирается из тех же исходников, что и макет,
поэтому после правок страницы достаточно запустить этот скрипт ещё раз.
"""
import json
import shutil
import sys
import zipfile
from pathlib import Path

TOOLS = Path(__file__).resolve().parent
ROOT = TOOLS.parent
sys.path.insert(0, str(TOOLS))
sys.path.insert(0, str(ROOT / "src"))

import build as page  # noqa: E402
import embed_data  # noqa: E402
import make_sample_export  # noqa: E402
import mart_to_json as conv  # noqa: E402
import validate_data  # noqa: E402

NAME = "coo_hub_radar_kit"
KIT_TOOLS = ["make_page.py", "mart_to_json.py", "validate_data.py", "embed_data.py", "coohub_config.json"]


def main():
    kit = ROOT / "out" / NAME
    if kit.exists():
        shutil.rmtree(kit)
    for d in ("page", "data", "sql", "tools"):
        (kit / d).mkdir(parents=True)

    # шаблон: та же страница, что макет, но вместо данных — одна метка
    null = kit / "_null.json"
    null.write_text("null", encoding="utf-8")
    tpl = page.build("m_hub.html", "template.html", "m_hub.js", data=null, out_dir=kit / "page", title="COO Hub · Радар")
    null.unlink()
    text = tpl.read_text(encoding="utf-8")
    assert text.count("window.DATA = null;") == 1, "в шаблоне страницы не нашлось место для данных"
    text = text.replace("window.DATA = null;", f"window.DATA = {embed_data.TOKEN};")
    tpl.write_text(text, encoding="utf-8")

    # пример данных: вымышленная выгрузка в формате витрины через тот же конвертер, что у агента
    export, _ = make_sample_export.write(out=kit / "_sample.csv")
    cfg = conv.load_config(TOOLS / "coohub_config.json", {
        "variants": {"*": {"metric_option": "Все юниты"}},
        "meta": {"disclaimer": "Пример на вымышленных данных: структура витрины настоящая, цифры сгенерированы."}})
    report = conv.Report()
    doc, _ = conv.convert(export, cfg, report)
    export.unlink()
    doc["meta"].update({"real": False, "input_file": "пример", "generated_at": ""})
    errors, _ = validate_data.validate(doc)
    assert not errors and not report.errors, errors + report.errors
    (kit / "data" / "example_data.json").write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (kit / "page" / "example_page.html").write_text(embed_data.embed(text, doc), encoding="utf-8")

    minimal = json.loads((ROOT / "agent_kit" / "minimal_example.json").read_text(encoding="utf-8"))
    errors, _ = validate_data.validate(minimal)
    assert not errors, errors
    shutil.copy(ROOT / "agent_kit" / "minimal_example.json", kit / "data" / "minimal_example.json")

    for f in ("README.md", "DATA_FORMAT.md"):
        shutil.copy(ROOT / "agent_kit" / f, kit / f)
    shutil.copy(ROOT / "sql" / "coo_hub_export.sql", kit / "sql" / "coo_hub_export.sql")
    for f in KIT_TOOLS:
        shutil.copy(TOOLS / f, kit / "tools" / f)

    for p in (kit / "page" / "template.html", kit / "page" / "example_page.html"):
        urls = embed_data.external_urls(p.read_text(encoding="utf-8"))
        assert not urls, f"{p.name}: внешние ссылки {urls[:3]}"

    zpath = ROOT / "dist" / f"{NAME}.zip"
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for p in sorted(kit.rglob("*")):
            if p.is_file() and "__pycache__" not in p.parts:
                z.write(p, f"{NAME}/{p.relative_to(kit).as_posix()}")
    files = sorted(p.relative_to(kit).as_posix() for p in kit.rglob("*") if p.is_file())
    print(f"Комплект: {kit}")
    for f in files:
        print(f"  {f}  ({(kit / f).stat().st_size // 1024} КБ)")
    print(f"Архив: {zpath} ({zpath.stat().st_size // 1024} КБ)")


if __name__ == "__main__":
    main()
