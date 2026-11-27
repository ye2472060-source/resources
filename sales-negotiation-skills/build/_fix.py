# -*- coding: utf-8 -*-
"""修复 _compress.py 造成的结构损坏：补回每个被替换 stage 的 </div>、sim 闭合与 </section>。"""
import re

PATH = "frag/31-sims.html"
html = open(PATH, encoding="utf-8").read()

parts = re.split(r'(<div class="sim" id="sim-\d+" data-sim="\d">)', html)
out = [parts[0]]
for i in range(1, len(parts), 2):
    tag, body = parts[i], parts[i+1]
    b = body.rstrip()
    assert b.endswith("</div>"), f"sim body not ending with div: {tag}"
    # 去掉脚本额外追加的 sim 闭合 </div>
    b = b[: b.rfind("</div>")].rstrip()
    stages = b.split('<div class="sim-stage">')
    head = stages[0]
    stlist = stages[1:]
    fixed = []
    for s in stlist:
        s2 = s.rstrip()
        if not s2.endswith("</div>"):
            s2 = s2 + "\n    </div>"
        fixed.append(s2)
    new_body = head + '<div class="sim-stage">' + '<div class="sim-stage">'.join(fixed)
    out.append(tag + new_body + "\n  </div>\n")

result = "".join(out)
# 末尾补 </section>
result = result.rstrip()
if not result.endswith("</section>"):
    result += "\n</section>\n"

open(PATH, "w", encoding="utf-8").write(result)
print("fixed, len:", len(result))
