# -*- coding: utf-8 -*-
"""核对四份 md 文档中的声明与 HTML 实际内容是否一致。"""
import re, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
html = open(os.path.join(ROOT, 'product-operations-growth-academy.html'), encoding='utf-8').read()
js = re.search(r'<script>(.*?)</script>', html, re.S).group(1)

def arr(name):
    m = re.search(r'var ' + name + r'\s*=\s*\[([\s\S]*?)\n\];', js)
    return m.group(1)

def entries(a, key):
    return re.findall(r'\{' + key + r':"', a)

docs = {}
for f in ['README.md', 'curriculum-map.md', 'source-library.md', 'practice-templates.md']:
    docs[f] = open(os.path.join(ROOT, f), encoding='utf-8').read()

print('=== 实际内容统计 ===')
gl = entries(arr('GLOSSARY'), 'zh')
sc = entries(arr('SOURCES_CORE'), 't')
st = entries(arr('SOURCES_TOOLS'), 't')
print('GLOSSARY        :', len(gl))
print('SOURCES_CORE    :', len(sc))
print('SOURCES_TOOLS   :', len(st))
print('tool cards      :', len(re.findall(r'<div class="card" id="tool-', html)))
print('units           :', len(re.findall(r'<section class="unit" id=', html)))
print('pages           :', len(re.findall(r'<section class="page[^"]*" id=', html)))
print('svg             :', len(re.findall(r'<svg', html)))
print('tables          :', len(re.findall(r'<table', html)))
print('copy-btn        :', len(re.findall(r'class="copy-btn"', html)))
print('quiz            :', len(re.findall(r'class="quiz"', html)))
print('calc inputs     :', len(re.findall(r'id="(?:aarrr|ab|rc|u|vwp)-', html)))

print()
print('=== 工具编号核对 ===')
tools = re.findall(r'<div class="card" id="tool-([0-9a-z]+)">\s*<h3>([^<]+)</h3>', html)
for tid, title in tools:
    print('  tool-%s  %s' % (tid, title.strip()))

print()
print('=== 来源 URL 一致性（HTML vs source-library.md）')
urls_js = re.findall(r'u:"(https?://[^"]+)"', arr('SOURCES_CORE')) + re.findall(r'u:"(https?://[^"]+)"', arr('SOURCES_TOOLS'))
doc = docs['source-library.md']
missing = [u for u in urls_js if u not in doc]
extra = []
for u in re.findall(r'\]\((https?://[^)]+)\)', doc):
    if u not in urls_js:
        extra.append(u)
print('HTML 中带链接的来源数:', len(urls_js))
print('文档中缺失的链接     :', len(missing), missing)
print('文档中多出的链接     :', len(extra), extra)

print()
print('=== 文档声明数字抽查 ===')
claims = [
    ('README.md', r'99 个知识单元', len(re.findall(r'<section class="unit" id=', html))),
    ('README.md', r'84 条', len(gl)),
    ('README.md', r'37 条', len(sc) + len(st)),
    ('README.md', r'共 36 个', len(re.findall(r'class="copy-btn"', html))),
    ('README.md', r'92 张表格', len(re.findall(r'<table', html))),
    ('README.md', r'21 张内联 SVG', len(re.findall(r'<svg', html))),
    ('README.md', r'18 个页面', len(re.findall(r'<section class="page[^"]*" id=', html))),
    ('README.md', r'219 个 id', len(set(re.findall(r'id="([^"]+)"', html)))),
    ('README.md', r'47668 字符', len(js)),
    ('curriculum-map.md', r'82–103 小时', 1),
]
for f, pat, actual in claims:
    txt = docs[f]
    found = re.search(pat, txt)
    print('%-18s %-16s %s' % (f, pat, ('文档命中 / 实际=' + str(actual)) if found else '!! 文档中未找到该声明'))

print()
print('=== 工具清单完整性（README vs 实际）===')
readme = docs['README.md']
for tid, title in tools:
    short = title.strip()
    key = re.sub(r'^工具 [0-9a-z]+ · ', '', short)
    ok = key in readme or key[:8] in readme
    if not ok:
        print('  !! README 未提及:', short)
