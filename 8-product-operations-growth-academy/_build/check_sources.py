# -*- coding: utf-8 -*-
"""逐条比对 source-library.md 与 HTML 中 SOURCES 数据的支撑内容/局限描述是否一致。"""
import re, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
html = open(os.path.join(ROOT, 'product-operations-growth-academy.html'), encoding='utf-8').read()
js = re.search(r'<script>(.*?)</script>', html, re.S).group(1)
doc = open(os.path.join(ROOT, 'source-library.md'), encoding='utf-8').read()

def parse(name):
    a = re.search(r'var ' + name + r'\s*=\s*\[([\s\S]*?)\n\];', js).group(1)
    out = []
    for m in re.finditer(r'\{t:"([^"]+)",o:"([^"]+)",d:"([^"]*)",ty:"([^"]*)",u:"([^"]*)",s:"([^"]+)",c:"([^"]+)",m:"([^"]+)"\}', a):
        out.append(dict(zip(['t','o','d','ty','u','s','c','m'], m.groups())))
    return out

core = parse('SOURCES_CORE')
tools = parse('SOURCES_TOOLS')
print('解析到来源条目：核心 %d + 工具 %d' % (len(core), len(tools)))

bad = 0
for i, e in enumerate(core + tools, 1):
    s_short = e['s'][:18]
    c_short = e['c'][:18]
    s_ok = s_short in doc
    c_ok = c_short in doc
    if not (s_ok and c_ok):
        bad += 1
        print('!! #%d %s' % (i, e['t'][:40]))
        print('   s 文档缺失:' , not s_ok, '|', e['s'][:70])
        print('   c 文档缺失:' , not c_ok, '|', e['c'][:70])
print('不一致条目数：%d / %d' % (bad, len(core) + len(tools)))
