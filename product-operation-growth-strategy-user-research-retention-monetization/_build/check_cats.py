import re
from collections import Counter
s = open('../product-operations-growth-academy.html', encoding='utf-8').read()
js = re.search(r'<script>(.*?)</script>', s, re.S).group(1)
m = re.search(r'var GLOSSARY\s*=\s*\[([\s\S]*?)\n\];', js).group(1)
print('GLOSSARY cat 分布:', Counter(re.findall(r'cat:"([^"]+)"', m)))
m2 = re.search(r'var MODULES\s*=\s*\[([\s\S]*?)\n\];', js)
if m2:
    mods = set(re.findall(r'p:"(m\d+)"', m2.group(1)))
    print('MODULES 数量:', len(mods))
    gm = set(re.findall(r',m:"(m\d+)"', m))
    print('术语表引用但模块表没有的 m:', sorted(gm - mods))
    src = re.search(r'var SOURCES_CORE\s*=\s*\[([\s\S]*?)\n\];', js).group(1)
    sm = set(re.findall(r'm:"(m\d+)"', src))
    print('来源引用但模块表没有的 m:', sorted(sm - mods))
    print('模块表模块:', sorted(mods, key=lambda x: int(x[1:])))
else:
    print('MODULES not found')
