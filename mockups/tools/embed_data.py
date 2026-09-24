#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Встроить данные в страницу: page/template.html + data.json → готовый HTML.

    python3 tools/embed_data.py data.json
    python3 tools/embed_data.py data.json --template page/template.html --out coo_hub_2026-09.html

Перед встраиванием данные проверяются (validate_data.py): с ошибками страница не собирается.
Встраивание — это замена одной метки в шаблоне:

    <script>window.DATA = /*__COO_HUB_DATA__*/null;</script>
    →
    <script>window.DATA = {…данные…};</script>

Код страницы, стили и шрифты не меняются. Только стандартная библиотека Python 3.8+.
"""
import argparse
import json
import re
import sys
from pathlib import Path

TOOLS = Path(__file__).resolve().parent
sys.path.insert(0, str(TOOLS))

import validate_data  # noqa: E402

TOKEN = "/*__COO_HUB_DATA__*/null"
DEFAULT_TEMPLATE = TOOLS.parent / "page" / "template.html"


def to_script_json(doc):
    """JSON, безопасный внутри <script>: текст из данных не закроет тег и не переключит разбор скрипта."""
    s = json.dumps(doc, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
    return s.replace("</", "<\\/").replace("<!--", "<\\u0021--")


def embed(template_text, doc):
    n = template_text.count(TOKEN)
    if n != 1:
        raise ValueError(f"В шаблоне метка {TOKEN} встречается {n} раз, а должна один. Возьмите чистый page/template.html.")
    html = template_text.replace(TOKEN, to_script_json(doc), 1)
    meta = doc.get("meta", {})
    title = meta.get("title") or f"{meta.get('product') or 'COO Hub'} · {meta.get('period_label', '')}".strip(" ·")
    title = title.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return re.sub(r"<title>.*?</title>", lambda _: f"<title>{title}</title>", html, count=1)


def external_urls(html):
    """Страница не должна ходить в сеть: ссылок наружу в ней быть не должно."""
    return sorted(set(re.findall(r"https?://[^\s\"'<>)]+", html)))


def main(argv=None):
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(errors="replace")
        except (AttributeError, ValueError):
            pass
    ap = argparse.ArgumentParser(description="Встроить data.json в шаблон страницы COO Hub · Радар.")
    ap.add_argument("data", help="JSON с данными страницы (формат — DATA_FORMAT.md)")
    ap.add_argument("--template", default=str(DEFAULT_TEMPLATE))
    ap.add_argument("--out", help="куда записать HTML (по умолчанию coo_hub_ГГГГ-ММ.html рядом с данными)")
    ap.add_argument("--force", action="store_true", help="встроить, даже если проверка нашла ошибки (только для отладки)")
    a = ap.parse_args(argv)

    doc = json.loads(Path(a.data).read_text(encoding="utf-8-sig"))
    errors, warnings = validate_data.validate(doc)
    for i, e in enumerate(errors, 1):
        print(f"  ОШИБКА {i}. {e}")
    for w in warnings[:30]:
        print(f"  ! {w}")
    if errors and not a.force:
        print(f"Не встраиваю: {len(errors)} ошибок в данных. Исправьте их (формат — DATA_FORMAT.md) и запустите снова.")
        return 1
    html = embed(Path(a.template).read_text(encoding="utf-8"), doc)
    urls = external_urls(html)
    if urls:
        print("ОШИБКА: в странице появились внешние ссылки — она должна работать без сети: " + ", ".join(urls[:5]))
        return 1
    month = str(doc.get("meta", {}).get("business_month", ""))[:7] or "data"
    out = Path(a.out) if a.out else Path(a.data).with_name(f"coo_hub_{month}{'_draft' if errors else ''}.html")
    out.write_text(html, encoding="utf-8")
    print(f"Готово: {out} ({out.stat().st_size // 1024} КБ). Откройте в браузере и проверьте, что видны радар и карта продуктов.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
