import re
s = open('../product-operations-growth-academy.html', encoding='utf-8').read()
js = re.search(r'<script>(.*?)</script>', s, re.S).group(1)

def arr(name):
    m = re.search(r'var ' + name + r'\s*=\s*\[([\s\S]*?)\n\];', js)
    return m.group(1) if m else ''

def count(a, key='t'):
    return len(re.findall(r'\{' + key + r':"', a))

print('GLOSSARY      ', count(arr('GLOSSARY'), 'zh'))
print('SOURCES_CORE  ', count(arr('SOURCES_CORE')))
print('SOURCES_TOOLS ', count(arr('SOURCES_TOOLS')))
print('MODULES       ', count(arr('MODULES')))
print('tool cards    ', len(re.findall(r'class="tool" id=', s)))
print('copy-btn      ', len(re.findall(r'class="copy-btn"', s)))
print('units         ', len(re.findall(r'<section class="unit" id=', s)))
print('svg blocks    ', len(re.findall(r'<svg', s)))
print('pages         ', len(re.findall(r'<section class="page" id=', s)))
print('tables        ', len(re.findall(r'<table', s)))
print('quiz blocks   ', len(re.findall(r'class="quiz"', s)))
print('calc inputs   ', len(re.findall(r'class="calc-input"|id="rc-|id="ab-|id="aarrr-|id="u-|id="vwp-', s)))
print('size KB       ', round(len(s.encode('utf-8')) / 1024))
