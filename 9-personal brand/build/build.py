#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""构建脚本：将模板与数据文件整合为单一 index.html"""
import os, io, sys

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(BASE), "index.html")

ORDER = ["data_meta.js", "data_sources.js"] + ["data_m%d.js" % i for i in range(10)]

def main():
    with io.open(os.path.join(BASE, "template.html"), "r", encoding="utf-8") as f:
        tpl = f.read()
    if "/*__DATA__*/" not in tpl:
        print("ERROR: template placeholder /*__DATA__*/ not found")
        sys.exit(1)
    parts = []
    for name in ORDER:
        p = os.path.join(BASE, name)
        if not os.path.exists(p):
            print("ERROR: missing data file:", name)
            sys.exit(1)
        with io.open(p, "r", encoding="utf-8") as f:
            parts.append("/* ===== %s ===== */\n%s" % (name, f.read()))
    html = tpl.replace("/*__DATA__*/", "\n".join(parts))
    with io.open(OUT, "w", encoding="utf-8") as f:
        f.write(html)
    print("OK ->", OUT)
    print("size: %.1f KB" % (len(html.encode("utf-8")) / 1024.0))

if __name__ == "__main__":
    main()
