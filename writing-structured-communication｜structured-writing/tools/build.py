#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
writing-system 静态站点生成器
读取 content/*.md -> 生成 modules/*.html、*.html 与 assets/search-index.json
用法: python tools/build.py
"""
import os, re, json, html as H
import markdown

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
SRC = os.path.join(ROOT, 'content')
OUT = ROOT

MODULES = [
    ('00', '写作与结构化表达的总框架'),
    ('01', '问题定义、写作目的与读者分析'),
    ('02', '逻辑思维与结构化思考'),
    ('03', '金字塔原理与 MECE'),
    ('04', '论点、论据、推理与批判性思维'),
    ('05', '信息组织、段落与文本架构'),
    ('06', '清晰表达、简洁写作与语言控制'),
    ('07', '说明文与知识解释'),
    ('08', '分析报告与商业写作'),
    ('09', '研究报告、学术写作与文献综合'),
    ('10', '说服性写作、观点表达与决策影响'),
    ('11', '商业邮件与日常专业沟通'),
    ('12', '技术文档、操作指南与流程说明'),
    ('13', '叙事结构、案例表达与情境化说明'),
    ('14', '标题设计、摘要与执行摘要'),
    ('15', '编辑、修订、校对与文本质量控制'),
    ('16', '事实核查、引用与证据管理'),
    ('17', '信息可视化、图表与演示文稿'),
    ('18', 'AI 辅助写作与人机协作'),
    ('19', '综合训练与个人写作系统'),
]

PAGES = [('module-%s.md' % n, 'modules/module-%s.html' % n, 'module', n, t) for n, t in MODULES]
PAGES += [
    ('integration.md', 'integration.html', 'page', None, '整合设计'),
    ('glossary.md', 'glossary.html', 'page', None, '术语词典'),
    ('templates.md', 'templates.html', 'page', None, '模板库'),
    ('resources.md', 'resources.html', 'page', None, '资料库'),
    ('projects.md', 'projects.html', 'page', None, '综合项目'),
]

NAV = [
    ('index.html', '首页'),
    ('integration.html', '整合设计'),
    ('glossary.html', '术语词典'),
    ('templates.html', '模板库'),
    ('resources.html', '资料库'),
    ('projects.html', '综合项目'),
]

MD = markdown.Markdown(extensions=['tables', 'attr_list', 'fenced_code', 'sane_lists', 'md_in_html'])


def add_heading_ids(text):
    toc, out, n = [], [], 0
    for line in text.split('\n'):
        m = re.match(r'^(#{2,4})\s+(.+?)\s*$', line)
        if m and '{#' not in line:
            level, title = len(m.group(1)), m.group(2).strip()
            hid = 'sec-%d' % n
            n += 1
            toc.append((level, title, hid))
            out.append('%s %s {#%s}' % (m.group(1), title, hid))
        else:
            out.append(line)
    return '\n'.join(out), toc


def strip_tags(s):
    s = re.sub(r'<[^>]+>', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()


def render_header(base, active):
    nav = ''.join(
        '<a href="%s%s"%s>%s</a>' % (base, href, ' class="active"' if href == active else '', label)
        for href, label in NAV)
    return '''<header class="site-header">
  <div class="header-inner">
    <a class="brand" href="%sindex.html"><span class="brand-mark">W&amp;SE</span><span class="brand-name">写作与结构化表达<em>Writing &amp; Structured Expression</em></span></a>
    <nav class="site-nav" aria-label="全站导航">%s<a href="%smodules/module-00.html">课程模块</a></nav>
    <form class="search-box" role="search" id="search-form">
      <input id="global-search" type="search" placeholder="搜索全站课程内容…" aria-label="搜索课程内容" autocomplete="off">
      <button type="submit" aria-label="搜索">搜索</button>
    </form>
    <button class="toc-toggle" id="toc-toggle" aria-label="打开或关闭本页目录">目录</button>
  </div>
  <div class="reading-progress" id="reading-progress"></div>
</header>''' % (base, nav, base)


def render_footer(base):
    return '''<footer class="site-footer">
  <p>《写作与结构化表达》自学知识体系 · 现代知识档案馆风格课程站。学习进度仅保存在本机浏览器 localStorage，属于本地个人数据，不具备账号同步功能。</p>
  <p class="footer-links"><a href="%sindex.html">首页</a> · <a href="%sintegration.html">整合设计</a> · <a href="%sglossary.html">术语词典</a> · <a href="%stemplates.html">模板库</a> · <a href="%sresources.html">资料库</a> · <a href="%sprojects.html">综合项目</a></p>
</footer>''' % (base, base, base, base, base, base)


def render_toc(toc, module_no):
    items = []
    for level, title, hid in toc:
        items.append('<li class="toc-l%d"><a href="#%s">%s</a></li>' % (level, hid, H.escape(title)))
    toggle = ''
    if module_no:
        toggle = '<button class="progress-toggle" data-module="m%s" type="button">标记为已完成</button>' % module_no
    return '<aside class="toc" id="toc"><div class="toc-title">本页目录</div><ul class="toc-list">%s</ul>%s</aside>' % (''.join(items), toggle)


def build_page(src, out_rel, kind, module_no, title, all_pages):
    with open(os.path.join(SRC, src), encoding='utf-8') as f:
        text = f.read()
    text, toc = add_heading_ids(text)
    body = MD.reset().convert(text)
    base = '../' if kind == 'module' else ''
    active = out_rel if kind == 'page' else ('modules/module-%s.html' % module_no)

    if kind == 'module':
        mods = [p for p in all_pages if p[2] == 'module']
        idx = [i for i, p in enumerate(mods) if p[3] == module_no][0]
        prev_m = mods[idx - 1] if idx > 0 else None
        next_m = mods[idx + 1] if idx < len(mods) - 1 else None
        prev_html = ('<a class="prev" href="%smodules/module-%s.html"><span>上一模块</span><strong>模块 %s · %s</strong></a>'
                     % (base, prev_m[3], prev_m[3], H.escape(prev_m[4])) if prev_m else '<span class="prev disabled"><span>上一模块</span><strong>已是第一个模块</strong></span>')
        next_html = ('<a class="next" href="%smodules/module-%s.html"><span>下一模块</span><strong>模块 %s · %s</strong></a>'
                     % (base, next_m[3], next_m[3], H.escape(next_m[4])) if next_m else '<span class="next disabled"><span>下一模块</span><strong>已是最后一个模块</strong></span>')
    else:
        prev_html = next_html = ''

    prevnext = ''
    if kind == 'module':
        prevnext = '''<nav class="prev-next" aria-label="模块导航">
  %s<a class="up" href="%sindex.html#modules"><span>返回</span><strong>课程总览</strong></a>%s
</nav>''' % (prev_html, base, next_html)

    html_doc = '''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%s · 写作与结构化表达</title>
<meta name="description" content="《写作与结构化表达》自学知识体系——%s">
<link rel="stylesheet" href="%sassets/styles.css">
</head>
<body>
<script>window.WSE_BASE = "%s";</script>
%s
<div class="layout">
%s
<main class="article">
<article class="prose">
%s
</article>
%s
</main>
</div>
%s
<div class="search-overlay" id="search-overlay" hidden>
  <div class="search-panel" role="dialog" aria-label="站内搜索">
    <div class="search-panel-head"><input id="search-input" type="search" placeholder="输入关键词，如：MECE、执行摘要、Toulmin…" aria-label="搜索关键词"><button id="search-close" type="button" aria-label="关闭搜索">关闭</button></div>
    <div class="search-results" id="search-results"></div>
  </div>
</div>
<script src="%sassets/app.js" defer></script>
</body>
</html>''' % (
        H.escape(title), H.escape(title), base, base,
        render_header(base, active), render_toc(toc, module_no), body, prevnext,
        render_footer(base), base)

    out_path = os.path.join(OUT, out_rel)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(html_doc)
    return out_rel, title, toc, body


def build_index(all_meta):
    pages = []
    for out_rel, title, toc, body in all_meta:
        sections = []
        matches = list(re.finditer(r'<h([234])[^>]*id="([^"]+)"[^>]*>(.*?)</h\1>', body, re.S))
        for i, m in enumerate(matches):
            start = m.end()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(body)
            sections.append({'a': m.group(2), 'h': strip_tags(m.group(3)), 'x': strip_tags(body[start:end])[:600]})
        pages.append({'p': out_rel, 't': title, 's': sections})
    data = {'pages': pages}
    with open(os.path.join(OUT, 'assets', 'search-index.json'), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)
    # 同一份索引另存为 JS：file:// 协议下 fetch 受 CORS 限制，script 标签不受限
    with open(os.path.join(OUT, 'assets', 'search-index.js'), 'w', encoding='utf-8') as f:
        f.write('/* 自动生成：全站搜索索引（与 search-index.json 内容一致） */\n')
        f.write('window.WSE_INDEX = ')
        json.dump(data, f, ensure_ascii=False)
        f.write(';\n')


def main():
    all_meta = []
    for src, out_rel, kind, module_no, title in PAGES:
        if not os.path.exists(os.path.join(SRC, src)):
            print('SKIP (缺少源文件):', src)
            continue
        all_meta.append(build_page(src, out_rel, kind, module_no, title, PAGES))
        print('BUILT', out_rel)
    build_index(all_meta)
    print('INDEX assets/search-index.json (%d pages)' % len(all_meta))


if __name__ == '__main__':
    main()
