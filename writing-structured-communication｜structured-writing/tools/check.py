#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""站点质量检查：链接完整性、标题层级、占位符残留、交互依赖检查"""
import os, re, sys, json

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

def read(p):
    with open(p, encoding='utf-8') as f:
        return f.read()

def main():
    errors, warnings = [], []
    html_files = []
    for dirpath, _, files in os.walk(ROOT):
        if 'content' in dirpath or 'tools' in dirpath:
            continue
        for fn in files:
            if fn.endswith('.html'):
                html_files.append(os.path.join(dirpath, fn))
    html_files.sort()

    # 1. 内部链接检查
    for path in html_files:
        base = os.path.dirname(path)
        for m in re.finditer(r'href="([^"]+)"', read(path)):
            href = m.group(1)
            if href.startswith(('http://', 'https://', '#', 'mailto:')):
                continue
            target = href.split('#')[0]
            if not target:
                continue
            tp = os.path.normpath(os.path.join(base, target))
            if not os.path.exists(tp):
                errors.append('%s: 失效链接 %s' % (os.path.relpath(path, ROOT), href))

    # 2. 资源引用检查
    for path in html_files:
        for m in re.finditer(r'(?:src|href)="(assets/[^"]+)"', read(path)):
            ap = os.path.join(os.path.dirname(path), m.group(1))
            if not os.path.exists(ap):
                errors.append('%s: 缺失资源 %s' % (os.path.relpath(path, ROOT), m.group(1)))

    # 3. 标题层级（h1 唯一、无跳级）
    for path in html_files:
        body = read(path)
        levels = [int(m.group(1)) for m in re.finditer(r'<h([1-4])[^>]*>', body)]
        if not levels:
            warnings.append('%s: 无标题' % os.path.relpath(path, ROOT))
            continue
        if levels[0] != 1:
            warnings.append('%s: 首个标题不是 h1' % os.path.relpath(path, ROOT))
        if levels.count(1) > 1:
            warnings.append('%s: 多个 h1' % os.path.relpath(path, ROOT))
        prev = levels[0]
        for lv in levels[1:]:
            if lv > prev + 1:
                warnings.append('%s: 标题跳级 h%d -> h%d' % (os.path.relpath(path, ROOT), prev, lv))
            prev = lv

    # 4. 占位符/未完成内容检查
    bad_patterns = [r'FIXME', r'XXX待', r'Lorem ipsum', r'待填写', r'占位文本', r'此处省略']
    for path in html_files:
        body = read(path)
        for bp in bad_patterns:
            if re.search(bp, body, re.I):
                warnings.append('%s: 疑似占位符 %s' % (os.path.relpath(path, ROOT), bp))

    # 5. 搜索索引检查
    idx_path = os.path.join(ROOT, 'assets', 'search-index.json')
    if not os.path.exists(idx_path):
        errors.append('缺少 assets/search-index.json')
    else:
        idx = json.loads(read(idx_path))
        for page in idx['pages']:
            tp = os.path.join(ROOT, page['p'])
            if not os.path.exists(tp):
                errors.append('搜索索引指向不存在的页面: %s' % page['p'])

    # 6. 交互依赖检查
    for path in html_files:
        body = read(path)
        if 'id="search-overlay"' not in body:
            warnings.append('%s: 缺少搜索浮层节点' % os.path.relpath(path, ROOT))
        if 'assets/app.js' not in body:
            errors.append('%s: 未加载 app.js' % os.path.relpath(path, ROOT))

    print('检查 HTML 文件数: %d' % len(html_files))
    if errors:
        print('\n[错误] %d 项:' % len(errors))
        for e in errors:
            print('  -', e)
    if warnings:
        print('\n[警告] %d 项:' % len(warnings))
        for w in warnings:
            print('  -', w)
    if not errors and not warnings:
        print('全部检查通过。')
    return 1 if errors else 0

if __name__ == '__main__':
    sys.exit(main())
