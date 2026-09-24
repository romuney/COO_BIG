#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Сборка самодостаточных HTML-макетов: шаблон + данные + библиотека графиков + рендер.

Запуск:  python3 mockups/src/build.py
Выход:   mockups/dist/exec_board_2026-08.html, mockups/dist/control_panel_variants.html
"""
import base64
import json
import re
from pathlib import Path

SRC = Path(__file__).resolve().parent
ROOT = SRC.parent
DIST = ROOT / "dist"
DATA = ROOT / "data" / "exec_board_2026-08.json"

def inline_json(path):
    obj = json.loads(path.read_text(encoding="utf-8"))
    s = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    # чтобы текст из данных не закрыл тег </script> и не переключил разбор скрипта через <!--
    return s.replace("</", "<\\/").replace("<!--", "<\\u0021--")

FONTS = [
    ("Golos Text", "Golos-Text", "400 700"),
    ("Playfair Display", "Playfair-Display", "700 900"),
    ("Unbounded", "Unbounded", "400 900"),
    ("IBM Plex Mono", "IBM-Plex-Mono", "400 600"),
]
CYR = "U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116"
LAT = "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+2000-206F,U+2070-209F,U+20B0-20BF,U+2116,U+2212"


def font_css():
    """Встраиваем шрифты в файл: макет самодостаточен и выглядит одинаково везде."""
    d = ROOT / "assets" / "fonts"
    out = []
    for family, slug, wrange in FONTS:
        for subset, urange in (("cyrillic", CYR), ("latin", LAT)):
            f = d / f"{slug}-{subset}.woff2"
            if not f.exists():
                continue
            b64 = base64.b64encode(f.read_bytes()).decode()
            out.append(
                f"@font-face{{font-family:'{family}';font-style:normal;font-weight:{wrange};"
                f"font-display:swap;src:url(data:font/woff2;base64,{b64}) format('woff2');"
                f"unicode-range:{urange};}}"
            )
    return "\n".join(out)


def build(template, out, app, data=None, out_dir=None, title=None):
    """out_dir — куда положить файл (по умолчанию dist); title — заголовок вкладки вместо шаблонного."""
    html = (SRC / "pages" / template).read_text(encoding="utf-8")
    if title:
        esc = title.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        html = re.sub(r"<title>.*?</title>", lambda _: f"<title>{esc}</title>", html, count=1)
    css_map = {"razbor": "razbor.css", "field": "field.css", "m_stories": "m_stories.css",
               "m_feed": "m_feed.css", "m_pult": "m_pult.css", "m_coohub": "m_coohub.css",
               "m_hub": "m_hub.css"}
    css_name = next((v for k, v in css_map.items() if k in app), "styles.css")
    html = html.replace("__FONTS__", font_css())
    html = html.replace("__CSS__", (SRC / css_name).read_text(encoding="utf-8"))
    html = html.replace("__CHARTS__", (SRC / "lib" / "charts.js").read_text(encoding="utf-8"))
    html = html.replace("__DEVICES__", (SRC / "lib" / "devices.js").read_text(encoding="utf-8"))
    html = html.replace("__MOBILE__", (SRC / "lib" / "mobile.js").read_text(encoding="utf-8"))
    html = html.replace("__APP__", (SRC / app).read_text(encoding="utf-8"))
    # данные — последними: текст из витрины не должен совпасть с меткой шаблона и подменить код
    html = html.replace("__DATA__", inline_json(data or DATA), 1)
    dest = Path(out_dir) if out_dir else DIST
    dest.mkdir(parents=True, exist_ok=True)
    (dest / out).write_text(html, encoding="utf-8")
    print(f"built {dest / out} ({(dest / out).stat().st_size // 1024} KB)")
    return dest / out

if __name__ == "__main__":
    build("exec_board.html", "exec_board_2026-08.html", "app.js")
    variants = SRC / "pages" / "variants.html"
    if variants.exists():
        build("variants.html", "control_panel_variants.html", "variants.js")
    razbor = SRC / "pages" / "razbor.html"
    if razbor.exists():
        build("razbor.html", "razbor_2026-08.html", "razbor.js")
    field = SRC / "pages" / "field.html"
    if field.exists():
        build("field.html", "field_2026-08.html", "field.js")
    for name in ("m_stories", "m_feed", "m_pult"):
        if (SRC / "pages" / f"{name}.html").exists():
            build(f"{name}.html", f"{name}_2026-08.html", f"{name}.js")
    if (SRC / "pages" / "m_coohub.html").exists():
        build("m_coohub.html", "m_coohub_2026-09.html", "m_coohub.js",
              data=ROOT / "data" / "coo_hub_2026-09.json")
    if (SRC / "pages" / "m_hub.html").exists():
        build("m_hub.html", "m_hub_2026-09.html", "m_hub.js",
              data=ROOT / "data" / "coo_hub_2026-09.json")
