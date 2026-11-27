# -*- coding: utf-8 -*-
"""从 HTML 实际内容重新生成 curriculum-map.md 的「知识单元完整清单」章节。"""
import re, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
html = open(os.path.join(ROOT, 'product-operations-growth-academy.html'), encoding='utf-8').read()
doc_path = os.path.join(ROOT, 'curriculum-map.md')
doc = open(doc_path, encoding='utf-8').read()

# 模块元信息（标题、时长）
mods = {}
for m in re.finditer(r'<section class="page" id="page-(m\d+)"[\s\S]*?<h1>([^<]+)</h1>', html):
    mods[m.group(1)] = re.sub(r'\s+', ' ', m.group(2)).strip()
durs = dict(zip(re.findall(r'id="page-(m\d+)"', html),
                re.findall(r'预计时长：<b>([^<]+)</b>', html)))

# 各模块单元
units = {}
for m in re.finditer(r'<section class="page" id="page-(m\d+)"[^>]*>([\s\S]*?)(?=<section class="page" id="page-|\Z)', html):
    pid = m.group(1)
    us = []
    for um in re.finditer(r'<section class="unit" id="(u[^"]+)">\s*<div class="unit-head">\s*<span class="unit-no">([^<]+)</span>\s*<h3>([\s\S]*?)</h3>', m.group(2)):
        us.append((um.group(1), um.group(2).strip(), re.sub(r'\s+', ' ', um.group(3)).strip()))
    units[pid] = us

order = ['m%d' % i for i in range(11)]
total = sum(len(units[k]) for k in order)

L = []
L.append('## 4. 知识单元完整清单（%d 个，由页面实际内容提取）' % total)
L.append('')
L.append('下表直接提取自 `product-operations-growth-academy.html` 各模块页面的实际单元标题，与站内目录完全一致。')
L.append('')
for k in order:
    title = mods[k].replace(' · ', ' · ')
    L.append('### %s（%d 个单元，预计 %s）' % (title, len(units[k]), durs.get(k, '—')))
    L.append('')
    if k == 'm10':
        L.append('| 编号 | 标题 |')
        L.append('|---|---|')
        for uid, no, h in units[k]:
            L.append('| %s | %s |' % (no, h))
    else:
        L.append('| 编号 | 标题 |')
        L.append('|---|---|')
        for uid, no, h in units[k]:
            L.append('| %s | %s |' % (no, h))
    L.append('')

new_section = '\n'.join(L)

start = doc.index('## 4. 知识单元完整清单')
end = doc.index('## 5. 学习顺序建议')
doc = doc[:start] + new_section + '\n---\n\n' + doc[end:]

# 更新总时长与统计行
hours = []
for k in order:
    d = durs.get(k, '')
    m = re.match(r'(\d+)–(\d+)', d)
    if m:
        hours.append((int(m.group(1)), int(m.group(2))))
lo = sum(h[0] for h in hours)
hi = sum(h[1] for h in hours)
doc = re.sub(r'总时长估算：约 \*\*\d+–\d+ 小时\*\*', '总时长估算：约 **%d–%d 小时**' % (lo, hi), doc)
doc = doc.replace('- **11 个模块 / 99 个知识单元**',
                  '- **11 个模块 / %d 个知识单元**（与页面实际单元数一致）' % total)

open(doc_path, 'w', encoding='utf-8').write(doc)
print('已更新 curriculum-map.md')
print('单元总数:', total)
print('总时长: %d-%d 小时' % (lo, hi))
for k in order:
    print('  %-4s %-42s %2d 单元  %s' % (k, mods[k][:40], len(units[k]), durs.get(k, '—')))
