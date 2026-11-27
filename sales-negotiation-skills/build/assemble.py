#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""装配 sales-negotiation-mastery.html：解析来源库 -> 生成参考页 -> 拼接所有片段 -> 输出单文件网站"""
import re, os, html, sys

BASE = os.path.dirname(os.path.abspath(__file__))
FRAG = os.path.join(BASE, "frag")
OUT = os.path.join(os.path.dirname(BASE), "sales-negotiation-mastery.html")

# ---------- 1. 解析来源库 ----------
def parse_sources(path):
    txt = open(path, encoding="utf-8").read()
    entries = []
    cur = None
    for line in txt.splitlines():
        m = re.match(r"^##\s+(R\d+)\s+(.*)$", line.strip())
        if m:
            if cur: entries.append(cur)
            cur = {"rid": m.group(1), "head": m.group(2).strip(), "fields": {}, "order": []}
            continue
        if cur is None: continue
        fm = re.match(r"^-\s+\*\*(.+?)\*\*[：:]\s*(.*)$", line.strip())
        if fm:
            key, val = fm.group(1).strip(), fm.group(2).strip()
            cur["fields"][key] = val
            cur["order"].append(key)
        elif line.strip() and cur["order"]:
            # 续行
            k = cur["order"][-1]
            cur["fields"][k] += " " + line.strip()
    if cur: entries.append(cur)
    return entries

def field(e, *keys):
    for k in keys:
        if k in e["fields"]: return e["fields"][k]
    return ""

def extract_year(e):
    for k in ("出版", "年份/出处", "年份"):
        v = field(e, k)
        m = re.search(r"(19|20)\d{2}", v)
        if m: return m.group(0)
    return ""

CATS = {
 "学术研究": "R03 R04 R05 R11 R12 R13 R14 R15 R16 R17 R18 R19 R20 R23 R24 R26 R27 R28 R29 R30 R31 R32 R33 R34 R35 R47 R55 R56 R57 R58".split(),
 "官方文件": "R48 R49 R50 R51".split(),
 "专业著作": "R02 R07 R10 R36 R37 R38 R39 R40 R41 R42 R43 R46 R52 R53".split(),
 "销售方法": "R01 R08 R09 R46 R53".split(),
 "谈判理论": "R02 R06 R23 R24 R39 R40 R41 R42 R52".split(),
 "客户心理": "R03 R04 R07 R13 R14 R15 R16 R17 R18 R19 R20 R26 R27 R28 R29 R30 R31 R32 R55 R56".split(),
 "采购与合同": "R12 R21 R47 R48 R49 R50 R51 R57".split(),
 "跨文化沟通": "R10 R35 R36 R37 R38".split(),
 "数据分析": "R44 R45 R46".split(),
}
CAT_ORDER = ["学术研究","官方文件","专业著作","销售方法","谈判理论","客户心理","采购与合同","跨文化沟通","数据分析"]

def esc(s): return html.escape(re.sub(r"\*+", "", str(s)), quote=False)

def gen_refs_page(entries):
    items = []
    for e in entries:
        rid = e["rid"]
        title_cn = field(e, "中文题名")
        title_en = field(e, "原名")
        head = e["head"]
        authors = field(e, "作者", "作者（第一批待补项，已确认）", "发布机构", "来源", "作者/机构")
        pub = field(e, "出版", "年份/出处")
        stype = field(e, "来源类型")
        conf = field(e, "置信度")
        supports = field(e, "支持结论")
        limits = field(e, "局限")
        links = field(e, "链接")
        doi = field(e, "DOI")
        # 标题
        t = title_cn if title_cn else head
        if title_en and title_en not in t:
            t = t + " / " + title_en
        # 类别
        cats = [c for c, ids in CATS.items() if rid in ids]
        catstr = " ".join(cats) if cats else "其他"
        # 链接行
        linkparts = []
        doi_val = field(e, "DOI")
        if not doi_val:
            m = re.search(r"DOI[：:\s]*(10\.\d{4,9}/[^\s，,；;）)]+)", pub)
            if m: doi_val = m.group(1)
        if doi_val:
            doi_clean = doi_val.split("（")[0].split("；")[0].split("，")[0].strip().rstrip("。")
            linkparts.append(f'DOI：<a href="https://doi.org/{esc(doi_clean)}" target="_blank" rel="noopener">https://doi.org/{esc(doi_clean)}</a>')
        if links:
            for u in re.findall(r"https?://[^\s；;]+", links):
                linkparts.append(f'<a href="{esc(u)}" target="_blank" rel="noopener">{esc(u)}</a>')
        linkhtml = " · ".join(linkparts[:4]) if linkparts else "（本条目无外链，为概念/方法说明或会议论文）"
        meta_bits = [b for b in [esc(authors[:160]), esc(pub[:200]), esc(stype[:80])] if b]
        if conf: meta_bits.append("置信度：" + esc(conf[:40]))
        lim_html = f'<p class="rlim"><b>局限：</b>{esc(limits[:400])}</p>' if limits else ""
        items.append(f'''  <div class="ref-item" data-cat="{esc(catstr)}">
    <h4><span class="rid">{rid}</span>{esc(t)}</h4>
    <p class="rmeta">{" · ".join(meta_bits)}</p>
    <p class="rmeta">{linkhtml}</p>
    <p class="ruse"><b>支持结论：</b>{esc(supports[:500])}</p>{lim_html}
  </div>''')
    filters = "\n".join(
        f'    <button data-cat="{c}">{c}</button>' for i, c in enumerate(CAT_ORDER))
    filters = '    <button data-cat="ALL" class="on">全部</button>\n' + filters
    page = f'''<section class="page" id="p-REFS">
  <header class="page-head">
    <p class="kicker">REFERENCES</p>
    <h1>参考资料库</h1>
    <p class="lead">全站重要结论均就近引用本库条目。所有条目经联网核验：记录作者、出版信息、DOI 或稳定链接、支持的具体结论、研究方法与局限、置信度。引用指向原始资料而非搜索结果页；无法核实的条目已如实标注。</p>
    <ul class="goals">
      <li>证据分层：学术研究与官方文件优先；专业著作用于系统梳理；实践指南（企业方法论、HBR 文章）标注为实践级证据</li>
      <li>经典方法（SPIN、挑战者销售、Cialdini 原则等）注明其证据基础为实践研究或实验归纳，不等于因果验证</li>
      <li>法律与贸易术语内容区分司法辖区，不把任一国家规则当作全球通则</li>
    </ul>
  </header>
  <div class="ref-filter" id="refFilter">
{filters}
  </div>
  <div id="refList">
{chr(10).join(items)}
  </div>
  <div class="home-sec" style="margin-top:22px">
    <h2>核验方法与已知限制</h2>
    <div class="grid-2">
      <div class="card"><h4>核验方法</h4><p>通过 ScienceDirect、APA PsycNet、SAGE、Wiley、OUP、AAAS、Annual Reviews、Emerald、UNCITRAL、UNIDROIT、ICC、legislation.gov.uk、npc.gov.cn、PON 官网及各出版方官网逐条核对作者、卷期页与 DOI；仅能看到摘要的条目标注"仅摘要"；未找到可核实链接的条目不给出链接。</p></div>
      <div class="card"><h4>已知限制</h4><p>①部分经典著作（SPIN、挑战者销售）为商业实践研究，数据未公开供独立复核；②Challenger Sale 样本量在 HBR 文章（83 家）与原书（90 家）间存在冲突，引用时须注明口径；③BANT 的 IBM 起源说无一手文献支撑，标注为出处存疑；④少量 2020 年代重复研究对经典效应量提出修正，正文已注明。</p></div>
    </div>
  </div>
</section>'''
    return page

# ---------- 2. 拼接 ----------
ORDER = ["00-head.html","01-nav.html","02-home.html","03-map.html","04-path.html",
         "10-mod01-06.html","11-mod07-12.html","12-mod13-17.html",
         "20-tools-a.html","21-tools-b.html","30-cases.html","31-sims.html","32-assess.html",
         "41-glossary.html","50-refs.html","90-scripts.html","92-diagrams.html","91-footer.html"]

def main():
    srcs = parse_sources(os.path.join(BASE, "VERIFIED_SOURCES.md"))
    srcs += parse_sources(os.path.join(BASE, "VERIFIED_SOURCES_R2.md"))
    refs_page = gen_refs_page(srcs)
    with open(os.path.join(FRAG, "50-refs.html"), "w", encoding="utf-8") as f:
        f.write(refs_page)
    print(f"[refs] 生成 {len(srcs)} 条参考条目")

    parts, missing = [], []
    for name in ORDER:
        p = os.path.join(FRAG, name)
        if not os.path.exists(p):
            missing.append(name); continue
        parts.append(open(p, encoding="utf-8").read())
    if missing:
        print("[warn] 缺失片段:", missing)
    out = "\n".join(parts) + "\n"
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(out)
    size = os.path.getsize(OUT)
    print(f"[build] 输出 {OUT} ({size/1024:.0f} KB)")
    # 快速结构检查
    n_pages = out.count('<section class="page')
    n_sec_open = out.count("<section"); n_sec_close = out.count("</section>")
    n_div_open = out.count("<div"); n_div_close = out.count("</div>")
    print(f"[check] page sections={n_pages} section open/close={n_sec_open}/{n_sec_close} div open/close={n_div_open}/{n_div_close}")
    for pat in ["fig-slot", "quiz", "calc-slot", "sim-stage", "ref-tag", "data-nav", "tool-T"]:
        print(f"[check] {pat}: {out.count(pat)}")

if __name__ == "__main__":
    main()
