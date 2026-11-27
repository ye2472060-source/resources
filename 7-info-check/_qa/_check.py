import re, sys
from html.parser import HTMLParser

path = r"F:/个人研究 - 副本/项目7-信息检索与事实核查/index.html"
html = open(path, encoding="utf-8").read()

VOID = {"area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr","path","rect","line","circle","text","marker","use","stop","polygon","polyline","ellipse"}

class Checker(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.errors = []
        self.ids = {}
        self.in_script = False
    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if "id" in d:
            self.ids[d["id"]] = self.ids.get(d["id"], 0) + 1
        if tag == "script":
            self.in_script = True
        if tag not in VOID:
            self.stack.append((tag, self.getpos()))
    def handle_startendtag(self, tag, attrs):
        d = dict(attrs)
        if "id" in d:
            self.ids[d["id"]] = self.ids.get(d["id"], 0) + 1
    def handle_endtag(self, tag):
        if tag == "script":
            self.in_script = False
        if tag in VOID:
            return
        if not self.stack:
            self.errors.append(f"多余的闭合标签 </{tag}> at {self.getpos()}")
            return
        if self.stack[-1][0] == tag:
            self.stack.pop()
        else:
            # 查找栈中是否有该标签
            names = [t for t, _ in self.stack]
            if tag in names:
                idx = len(names) - 1 - names[::-1].index(tag)
                self.errors.append(f"标签嵌套错误: </{tag}> at {self.getpos()} 之前未闭合: {[ (t, str(p)) for t,p in self.stack[idx+1:] ]}")
                del self.stack[idx:]
            else:
                self.errors.append(f"找不到匹配的开始标签: </{tag}> at {self.getpos()}")

c = Checker()
c.feed(html)
print("=== 未闭合标签 ===")
for t, p in c.stack:
    print(f"  <{t}> opened at line {p[0]}")
print("=== 错误 ===")
for e in c.errors[:30]:
    print(" ", e)
print(f"=== 共 {len(c.errors)} 个错误, {len(c.stack)} 个未闭合 ===")

# 重复 ID
dups = {k: v for k, v in c.ids.items() if v > 1}
print("=== 重复 ID ===", dups if dups else "无")

# JS 中引用的 ID 检查
js = re.search(r"<script>(.*?)</script>", html, re.S).group(1)
refs = set(re.findall(r'\$\("#([A-Za-z0-9_-]+)"\)', js)) | set(re.findall(r'getElementById\("([A-Za-z0-9_-]+)"\)', js))
missing = [r for r in refs if r not in c.ids]
print("=== JS 引用但 HTML 缺失的 ID ===", missing if missing else "无")

# 导航锚点检查
hrefs = set(re.findall(r'href="#([A-Za-z0-9_-]+)"', html))
missing_href = [h for h in hrefs if h not in c.ids]
print("=== 锚点指向不存在的 ID ===", missing_href if missing_href else "无")

# data-copy 目标检查
copies = set(re.findall(r'data-copy="([A-Za-z0-9_-]+)"', html))
missing_copy = [x for x in copies if x not in c.ids]
print("=== data-copy 指向不存在的 ID ===", missing_copy if missing_copy else "无")

# 模块 ID 检查
for m in [f"m{i}" for i in range(1,13)] + ["tool-strategy","tool-source","tool-cross","tool-ai","tool-report","tool-decision","quizArea","dtTree","cvSources","aiClaims","seChecklist","sgOut","seOut","cvOut","quizScore","quizAnswered","progressText","progressFill","progressChipHome","progressFillHome","nextSuggestion","topProgressChip","globalSearch","searchInfo","sidebar","menuBtn","sbNav","topbarTitle","glossary-tip","resetProgressBtn","quizReset","sgInput","sgImp","sgGen","sgDemo","seName","seUrl","seType","seEval","seClear","cvClaim","cvType","cvAddRow","cvAnalyze","cvSave","cvExample","cvExport","cvClear","aiInput","aiSplit","aiExample","aiExport","aiClear","repText","repCopy","repFill","repReset","dtTree"]:
    if m not in c.ids:
        print("缺失关键 ID:", m)
print("=== 关键 ID 检查完成 ===")
