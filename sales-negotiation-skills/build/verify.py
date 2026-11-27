#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""交付前验收：结构完整性、导航目标、图示key、引用ID、占位文字检查"""
import re, os, sys, subprocess, tempfile

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(BASE), "sales-negotiation-mastery.html")
html = open(OUT, encoding="utf-8").read()
problems, warnings = [], []

# 1. 页面与关键元素计数
pages = re.findall(r'<section class="page[^"]*" id="(p-[A-Z0-9]+)"', html)
need_pages = ["p-HOME","p-MAP","p-PATH"] + ["p-MOD%02d"%i for i in range(1,18)] + ["p-TOOLS","p-CASES","p-SIMS","p-ASSESS","p-GLOSSARY","p-REFS"]
for p in need_pages:
    if p not in pages: problems.append(f"缺少页面 {p}")
tools = re.findall(r'id="(tool-T\d+)"', html)
missing_tools = ["tool-T%02d"%i for i in range(1,37) if "tool-T%02d"%i not in tools]
if missing_tools: problems.append(f"缺少工具: {missing_tools}")
cases = re.findall(r'id="(case-[A-Z])"', html)
if sorted(set(cases)) != ["case-A","case-B","case-C"]: problems.append(f"案例不完整: {sorted(set(cases))}")
sims = re.findall(r'class="sim" id="(sim-\d+)"', html)
if len(set(sims)) < 8: warnings.append(f"模拟场景数量: {len(set(sims))}（期望8）")
quizzes = html.count('class="quiz"')
if quizzes < 25: warnings.append(f"随堂/阶段测验块数量偏少: {quizzes}")

# 2. data-nav / data-link 目标存在性
navs = set(re.findall(r'data-nav="(p-[A-Z0-9]+)"', html))
for n in navs:
    if n not in pages: problems.append(f"data-nav 目标不存在: {n}")
links = set(re.findall(r'data-link href="#(p-[A-Z0-9]+)"', html))
for n in links:
    if n not in pages: problems.append(f"data-link 目标不存在: {n}")
anchors = set(re.findall(r'href="#(m\d+-s\d+)"', html))
for a in anchors:
    if f'id="{a}"' not in html: warnings.append(f"锚点目标可能不存在: {a}")

# 3. 图示 key 覆盖
fig_keys = set(re.findall(r'data-diagram="([a-z-]+)"', html))
diag_keys = set(re.findall(r'D\["([a-z-]+)"\]', html))
for k in fig_keys:
    if k not in diag_keys: problems.append(f"图示未定义: {k}")
unused = diag_keys - fig_keys
if unused: warnings.append(f"未使用的图示: {sorted(unused)}")

# 4. 引用 ID 与参考页对应
ref_tags = set(re.findall(r'data-ref="(R\d+)"', html))
ref_ids = set(re.findall(r'<span class="rid">(R\d+)</span>', html))
for r in ref_tags:
    if r not in ref_ids: problems.append(f"引用 {r} 在参考页不存在")
if len(ref_ids) < 50: warnings.append(f"参考条目数: {len(ref_ids)}")

# 5. 计算器插槽
for k in ["zopa","price","forecast","qualify"]:
    if f'data-calc="{k}"' not in html: problems.append(f"缺少计算器插槽: {k}")

# 6. 占位文字检查
for pat in ["TODO", "待补充", "TODO-REF", "Lorem", "lorem", "XXX", "占位文字"]:
    if pat in html: problems.append(f"发现占位文字: {pat}")

# 7. 标签配对
for tag in ["section","div","main","aside","header","footer","article","nav","table","details","figure"]:
    o = len(re.findall(r"<"+tag+r"[\s>]", html)); c = html.count("</"+tag+">")
    if o != c: problems.append(f"标签不配对 <{tag}>: {o} open / {c} close")

# 8. JS 语法检查（node --check）
scripts = re.findall(r"<script>(.*?)</script>", html, re.S)
node = r"C:\Users\zoye\.workbuddy\binaries\node\versions\22.22.2-6\node.exe"
js_ok = True
for i, s in enumerate(scripts):
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as f:
        f.write(s); path = f.name
    r = subprocess.run([node, "--check", path], capture_output=True, text=True)
    if r.returncode != 0:
        js_ok = False
        problems.append(f"script#{i} JS语法错误: {r.stderr[:300]}")
    os.unlink(path)

print(f"页面数: {len(pages)} | 工具数: {len(set(tools))} | 案例: {len(set(cases))} | 模拟: {len(set(sims))} | 测验: {quizzes}")
print(f"参考条目: {len(ref_ids)} | 被引用: {len(ref_tags)} | 图示使用: {len(fig_keys)} | JS语法: {'OK' if js_ok else 'FAIL'}")
print(f"文件大小: {os.path.getsize(OUT)/1024:.0f} KB")
if problems:
    print("\n[问题]"); [print(" -", p) for p in problems]
if warnings:
    print("\n[提醒]"); [print(" -", w) for w in warnings]
sys.exit(1 if problems else 0)
