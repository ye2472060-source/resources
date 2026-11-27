#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""校验学习网站 HTML：标签配对、锚点引用、脚本语法占位检查"""
import re, sys
from html.parser import HTMLParser

import os
PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "product-operations-growth-academy.html")
VOID = {"area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr","circle","path","rect","line","polyline","polygon","text","marker","use","stop","ellipse"}

class Checker(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.errors = []
        self.ids = set()
        self.hrefs = []
    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if "id" in d:
            if d["id"] in self.ids:
                self.errors.append(f"重复 id: {d['id']} (line {self.getpos()[0]})")
            self.ids.add(d["id"])
        for k, v in attrs:
            if k == "href" and v and v.startswith("#") and len(v) > 2:
                self.hrefs.append(v)
        if tag not in VOID:
            self.stack.append((tag, self.getpos()[0]))
    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if not self.stack:
            self.errors.append(f"多余的闭合标签 </{tag}> line {self.getpos()[0]}")
            return
        if self.stack[-1][0] == tag:
            self.stack.pop()
        else:
            # 查找栈中是否有该标签（容忍隐式闭合）
            names = [t for t, _ in self.stack]
            if tag in names:
                idx = len(names) - 1 - names[::-1].index(tag)
                self.errors.append(f"标签交叉: </{tag}> line {self.getpos()[0]} 打断了 {self.stack[idx+1:]}")
                del self.stack[idx:]
            else:
                self.errors.append(f"未匹配的闭合标签 </{tag}> line {self.getpos()[0]}")

def main():
    html = open(PATH, encoding="utf-8").read()
    c = Checker()
    c.feed(html)
    if c.stack:
        c.errors.append(f"未闭合的标签: {c.stack[:10]}")
    # 检查页面锚点引用
    pages = set(re.findall(r'id="page-([a-z0-9]+)"', html))
    unit_ids = set(re.findall(r'id="(u\d+-\w+)"', html))
    bad_hash = []
    for h in c.hrefs:
        m = re.match(r"#/([a-z0-9]+)(?:/(\S+))?", h)
        if m:
            p, a = m.group(1), m.group(2)
            if p not in pages:
                bad_hash.append(h)
            elif a and a not in unit_ids and a not in c.ids:
                bad_hash.append(h)
    print("=== HTML 结构校验 ===")
    print(f"页面数: {len(pages)} -> {sorted(pages)}")
    print(f"知识单元数: {len(unit_ids)}")
    print(f"id 总数: {len(c.ids)}")
    if c.errors:
        print(f"\n发现 {len(c.errors)} 个结构问题:")
        for e in c.errors[:20]:
            print("  -", e)
    else:
        print("标签配对: OK")
    if bad_hash:
        print(f"\n发现 {len(bad_hash)} 个无效站内锚点:")
        for b in bad_hash[:10]:
            print("  -", b)
    else:
        print("站内锚点: OK")
    # 检查必须存在的交互元素 id
    required_ids = ["searchModal","searchModalInput","searchResults","sidebar","overlay","menuBtn","themeBtn",
                    "progressRing","progressText","sideProgress","sideProgressText","resetProgress","toTop",
                    "mainNav","toc","moduleOverview","glossaryList","glossarySearch","glossaryFilter","glossaryCount",
                    "srcCore","srcTools","calc-aarrr","aarrr-out","calc-absize","absize-out","calc-rice","rice-out",
                    "calc-retcurve","retcurve-out","calc-unit","unit-out","calc-vwp","vwp-out","vwp-chart"]
    missing = [i for i in required_ids if f'id="{i}"' not in html]
    if missing:
        print(f"\n缺失关键元素 id: {missing}")
    else:
        print("关键交互元素: OK")
    # 检查计算器输入 id
    calc_inputs = re.findall(r'id="((?:aarrr|ab|rc|u|vwp)-[a-z0-9]+)"', html)
    print(f"计算器输入元素: {len(calc_inputs)} 个")
    ok = not c.errors and not bad_hash and not missing
    print("\n结论:", "PASS" if ok else "FAIL")
    sys.exit(0 if ok else 1)

if __name__ == "__main__":
    main()
