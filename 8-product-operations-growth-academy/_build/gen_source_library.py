# -*- coding: utf-8 -*-
"""从 HTML 内嵌数据源重新生成 source-library.md 的来源表格部分，保证文档与页面 100% 一致。"""
import re, os, io

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
html = open(os.path.join(ROOT, 'product-operations-growth-academy.html'), encoding='utf-8').read()
js = re.search(r'<script>(.*?)</script>', html, re.S).group(1)

def arr(name):
    return re.search(r'var ' + name + r'\s*=\s*\[([\s\S]*?)\n\];', js).group(1)

# 模块名映射
mods = {}
for m in re.finditer(r'\{n:"(\d+)",t:"([^"]+)"', arr('MODULES')):
    mods['m' + m.group(1)] = '模块 ' + m.group(1) + ' ' + m.group(2)

def parse(name):
    a = arr(name)
    out = []
    for m in re.finditer(
        r'\{t:"([^"]+)",o:"([^"]+)",d:"([^"]*)",ty:"([^"]*)",u:"([^"]*)",s:"([^"]+)",c:"([^"]+)",m:"([^"]+)"\}', a):
        out.append(dict(zip(['t','o','d','ty','u','s','c','m'], m.groups())))
    return out

core = parse('SOURCES_CORE')
tools = parse('SOURCES_TOOLS')

def esc(s):
    return s.replace('|', '\\|')

TY = {'official': '官方/原作者', 'paper': '学术论文', 'book': '著作', 'pro': '专业整理'}

def table(rows):
    L = []
    L.append('| # | 来源 | 作者 / 机构 | 时间 | 类型 | 支撑内容 | 可信度与局限 | 关联模块 |')
    L.append('|---|---|---|---|---|---|---|---|')
    for i, e in enumerate(rows, 1):
        title = '[%s](%s)' % (e['t'], e['u']) if e['u'] else e['t']
        L.append('| %d | %s | %s | %s | %s | %s | %s | %s |' % (
            i, esc(title), esc(e['o']), esc(e['d']) or '—', TY.get(e['ty'], e['ty']),
            esc(e['s']), esc(e['c']), mods.get(e['m'], e['m'])))
    return '\n'.join(L)

out = io.StringIO()
out.write('# 参考资料库（产品运营与增长策略）\n\n')
out.write('本文档与 `product-operations-growth-academy.html` 内「资料库」页面**同源生成**：下列表格直接由页面内嵌的 '
          '`SOURCES_CORE`（%d 条）与 `SOURCES_TOOLS`（%d 条）数据渲染，字段逐字一致，不会与页面内容漂移。'
          '第 4–6 节为人工补充说明。\n\n' % (len(core), len(tools)))
out.write('**检索时间**：2026-10-15（标注「检索于 2026-10-15」的条目均在该日可访问）。\n\n')
out.write('**检索方式**：中英双语检索；关键事实要求至少 2 个独立来源交叉印证；无法交叉印证的，在课程正文中明确标注为「单一来源」或「公开报道」。\n\n')
out.write('---\n\n')

out.write('## 1. 可信度分层规则\n\n')
out.write('| 层级 | 定义 | 使用方式 |\n|---|---|---|\n')
out.write('| **第一层（原始/权威）** | 框架提出者的原始文章/演讲、学术论文、官方公告与官方文档、原始著作 | 可直接作为「已验证事实」或「框架出处」引用 |\n')
out.write('| **第二层（专业整理）** | 行业机构、专业媒体、资深从业者的系统整理，且明确引用了第一层来源 | 作为框架细节、执行步骤与批判性评述的依据；涉及数字时注明「行业整理/公开报道」 |\n')
out.write('| **第三层（社区/转述）** | 个人博客、社区帖子、无明确出处的转述 | 仅用于补充视角，**不作为事实依据**；课程中极少使用，且明确标记 |\n')
out.write('| **原始著作（未在线核验全文）** | 经典书籍 | 作为理论归属引用（已核验书名、作者、年份与公开摘要），但**未核验全书原文**，涉及具体论断时以二手权威整理为辅 |\n\n')
out.write('> 类型字段说明：**官方/原作者** = 官方公告、原作者博客、厂商文档；**学术论文** = 期刊/会议论文；**著作** = 书籍；**专业整理** = 行业机构/专业媒体整理。\n\n')
out.write('---\n\n')

# 按模块分组
groups = {}
for e in core:
    groups.setdefault(e['m'], []).append(e)
order = ['m0','m1','m2','m3','m4','m5','m6','m7','m8','m9','m10']
out.write('## 2. 核心来源清单（%d 条，按关联模块分组）\n\n' % len(core))
n = 0
for k in order:
    if k not in groups:
        continue
    n += 1
    out.write('### 2.%d %s（%d 条）\n\n' % (n, mods[k], len(groups[k])))
    out.write(table(groups[k]) + '\n\n')
    n_reset = 0
# 重新按全局编号
out2 = io.StringIO()
out2.write('# 参考资料库（产品运营与增长策略）\n\n')
out2.write('本文档与 `product-operations-growth-academy.html` 内「资料库」页面**同源生成**：下列表格直接由页面内嵌的 '
           '`SOURCES_CORE`（%d 条）与 `SOURCES_TOOLS`（%d 条）数据渲染，字段逐字一致，不会与页面内容漂移。'
           '第 4–6 节为人工补充说明。\n\n' % (len(core), len(tools)))
out2.write('**检索时间**：2026-10-15（标注「检索于 2026-10-15」的条目均在该日可访问）。\n\n')
out2.write('**检索方式**：中英双语检索；关键事实要求至少 2 个独立来源交叉印证；无法交叉印证的，在课程正文中明确标注为「单一来源」或「公开报道」。\n\n')
out2.write('---\n\n')
out2.write('## 1. 可信度分层规则\n\n')
out2.write('| 层级 | 定义 | 使用方式 |\n|---|---|---|\n')
out2.write('| **第一层（原始/权威）** | 框架提出者的原始文章/演讲、学术论文、官方公告与官方文档、原始著作 | 可直接作为「已验证事实」或「框架出处」引用 |\n')
out2.write('| **第二层（专业整理）** | 行业机构、专业媒体、资深从业者的系统整理，且明确引用了第一层来源 | 作为框架细节、执行步骤与批判性评述的依据；涉及数字时注明「行业整理/公开报道」 |\n')
out2.write('| **第三层（社区/转述）** | 个人博客、社区帖子、无明确出处的转述 | 仅用于补充视角，**不作为事实依据**；课程中极少使用，且明确标记 |\n')
out2.write('| **原始著作（未在线核验全文）** | 经典书籍 | 作为理论归属引用（已核验书名、作者、年份与公开摘要），但**未核验全书原文**，涉及具体论断时以二手权威整理为辅 |\n\n')
out2.write('> 类型字段：**官方/原作者** = 官方公告、原作者博客、厂商文档；**学术论文** = 期刊/会议论文；**著作** = 书籍；**专业整理** = 行业机构/专业媒体整理。\n\n')
out2.write('---\n\n')
out2.write('## 2. 核心来源清单（%d 条，按关联模块分组，全局连续编号）\n\n' % len(core))
gi = 0
sec = 0
for k in order:
    if k not in groups:
        continue
    sec += 1
    out2.write('### 2.%d %s\n\n' % (sec, mods[k]))
    L = ['| # | 来源 | 作者 / 机构 | 时间 | 类型 | 支撑内容 | 可信度与局限 |',
         '|---|---|---|---|---|---|---|']
    for e in groups[k]:
        gi += 1
        title = '[%s](%s)' % (e['t'], e['u']) if e['u'] else e['t']
        L.append('| %d | %s | %s | %s | %s | %s | %s |' % (
            gi, esc(title), esc(e['o']), esc(e['d']) or '—', TY.get(e['ty'], e['ty']),
            esc(e['s']), esc(e['c'])))
    out2.write('\n'.join(L) + '\n\n')

out2.write('## 3. 工具与平台官方文档（%d 条）\n\n' % len(tools))
L = ['| # | 来源 | 机构 | 时间 | 类型 | 支撑内容 | 可信度与局限 | 关联模块 |',
     '|---|---|---|---|---|---|---|---|']
for i, e in enumerate(tools, len(core) + 1):
    title = '[%s](%s)' % (e['t'], e['u']) if e['u'] else e['t']
    L.append('| %d | %s | %s | %s | %s | %s | %s | %s |' % (
        i, esc(title), esc(e['o']), esc(e['d']) or '—', TY.get(e['ty'], e['ty']),
        esc(e['s']), esc(e['c']), mods.get(e['m'], e['m'])))
out2.write('\n'.join(L) + '\n\n')

manual = u'''---

## 4. 公开案例来源说明（4 个案例，均为二手公开报道）

| 案例 | 引用内容 | 性质与局限 |
|---|---|---|
| **Airbnb 摄影计划** | 早期增长团队手动上门拍摄房源照片、显著提升预订转化 | 经典公开案例，**具体提升幅度在不同报道中数字不一致**，课程只讲机制与可迁移逻辑，不引用具体百分比 |
| **Dropbox 推荐计划** | 双向奖励推荐带来的增长 | 广泛引用的公开案例，**增长倍数等数字未经原公司确认**，已标注为「公开报道」 |
| **Superhuman PMF** | Sean Ellis 测试从 22% 提升至 58% 的过程 | 创始人公开分享 + First Round Review，**为创始人自述**，存在幸存者偏差 |
| **Netflix DVD → 流媒体** | 商业模式演进与用户价值迁移 | 公开商业史材料，用于说明「用户任务不变、解决方案变化」 |

---

## 5. 需要特别注意的「非事实」内容

以下内容在课程中被广泛使用，但**本质是经验启发或简化模型，不是定律**，请勿当作普适基准直接套用：

1. **LTV/CAC ≥ 3**：行业经验值。高毛利长留存业务可低于 3，低毛利短留存业务可能需要远高于 3，且必须结合**回本周期**一起看。
2. **PMF 40%（Sean Ellis 测试）**：Ellis 在有限样本中观察到的经验阈值，受样本构成、问题措辞、产品阶段影响；课程已给出误读警示。
3. **Rule of 40**：SaaS 行业的经验启发式，不是财务定律。
4. **Freemium 自助转化率 15–20%**：OpenView 行业调研参考值，不同品类差异极大。
5. **A/B 偷看到 26% 假阳性**：Evan Miller 在**特定参数设定下**的示例/模拟值，用于说明方向，不是普适常数。
6. **计算器结果**：LTV 使用**未折现简化模型**；Van Westendorp 使用**对数正态假设**的简化模型。两者都用于教学演示，不能替代正式财务/定价研究。
7. **教学模拟数据**：模块 4 的三个实验案例、模块 5 的同期群表、模块 7 的教学案例、模块 10 的三个综合项目，全部为**虚构数据**，不代表任何真实产品或行业基准。

---

## 6. 引用规范（给后续维护者）

- 新增来源时，必须填写 8 个字段：`t`（标题）、`o`（作者/机构）、`d`（时间）、`ty`（official/paper/book/pro）、`u`（链接）、`s`（支撑内容）、`c`（可信度与局限备注）、`m`（关联模块）。
- **不要**把第二层来源写成第一层；**不要**为增强说服力编造链接或把社区数字写成官方数据。
- 链接失效时，保留原链接并在 `c` 字段注明「链接已迁移/失效，原始出处为 X」。
- 修改来源后，重跑 `_build/check_sources.py` 与 `_build/check_docs.py` 核对文档与页面一致性。
'''
out2.write(manual)

path = os.path.join(ROOT, 'source-library.md')
open(path, 'w', encoding='utf-8').write(out2.getvalue())
print('已重新生成 source-library.md，字符数:', len(out2.getvalue()))
print('核心来源 %d 条 + 工具文档 %d 条 = %d' % (len(core), len(tools), len(core) + len(tools)))
