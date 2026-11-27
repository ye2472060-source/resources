# 项目10 · 销售与谈判能力系统学习网站 — 长期笔记

## 项目定位
单文件交互式学习网站，面向销售与谈判从业者/学习者，强调"证据可信度分层"与"决策过程质量"而非成交结果。零外部依赖，可离线打开。

## 当前根目录
- **现路径**：`F:/个人想法实践记录-项目制-agent产出/项目10-销售与谈判学习平台/`
- 原路径 `F:/个人研究 - 副本/项目10-销售与谈判学习平台/` 已于 2026-10-18 前被移动/清空，旧位置的 `.workbuddy/memory/` 随之丢失，记忆已重建于此新位置。

## 关键交付物
- `sales-negotiation-mastery.html`（约 1102 KB / 20万中文字）：最终成品，双击即可打开。
- `README.md`：使用与扩展说明。
- `build/`：可复现构建管线（见下）。

## 构建管线（在 `build/` 下运行）
1. `assemble.py`：解析 `VERIFIED_SOURCES*.md` 生成参考页 + 拼接 `frag/*.html` 17 个片段为单文件 `../sales-negotiation-mastery.html`。注意其 ORDER 列表必须含全部片段。
2. `verify.py`：结构/导航/引用/图示/JS语法(node --check) 验收。
3. `smoke-test.js`：jsdom 运行时测试（读取 `../sales-negotiation-mastery.html`，相对路径，支持 `node smoke-test.js <可选html路径>` 覆盖）。依赖 jsdom 在 `C:/Users/zoye/.workbuddy/binaries/node/workspace/node_modules`，需 `NODE_PATH=...` 前置。
4. `frag/*.html`：内容片段（10-mod01-06 / 11-mod07-12 / 12-mod13-17 / 20-tools-a / 21-tools-b / 30-cases / 31-sims / 32-assess / 41-glossary / 50-refs / 90-scripts / 91-footer 等）。
5. `SPEC-fragments.md`：HTML class 契约规范，新增内容必须遵循。

## 内容体系
- 17 课程模块（每模块 12 必备部分）/ 36 工具 T01–T36（含 4 交互计算器：BATNA、ZOPA区间、降价利润、加权预测、资格评分）/ 3 贯穿综合案例 / 8 角色扮演模拟（隐藏信息分阶段揭示）/ 30 阶段测验题 + 17 模块随堂测验 / 70+ 术语 / 58 条核验参考。

## 来源核验（最高优先级）
两批共 58 条（R01–R22 主控联网核验 + R23–R58 代理核验），记录作者/出版/DOI/支持结论/局限/置信度。关键更正已落实：
- MESO 正式版作者 = **Leonardelli 等（OBHDP 2019, 152:64–83, DOI 10.1016/j.obhdp.2019.01.007）**，非"Schweinsberg 等"。
- Schultz 2007 = 家庭节能实验；酒店毛巾 = Goldstein 等 2008 JCR。
- Kühberger 元分析 = OBHDP 75(1) 23–55（非 76(2)）。
- Gelfand 2011 发表于 **Science**（非 PNAS）。
- BANT 的 IBM 起源说无一手文献 → 标注"出处存疑"。
- Challenger Sale 样本量：HBR 文章 83 家 / 原书 90 家冲突，已注明；54%/39% 双口径已区分。
- 证据分层标注：c-evidence(同行评审) / c-theory / c-practice / c-dispute。

## 验收基线
- verify.py：26 页面 / 36 工具 / 3 案例 / 8 模拟 / 58 参考 / JS语法 OK。
- smoke-test.js：35 项运行时测试通过（scrollTo 提示为 jsdom 限制，非失败）。
- 已知限制：未做真实浏览器截图（Chromium 下载超时两次）；进度/笔记仅存 localStorage 不跨设备；模块 01–03 字数略超建议区间（正文口径内）。

## 用户偏好 / 约定
- 用户对"资料真实性高于写作量"要求极高，所有事实必须可回溯到核验来源，禁止编造统计数字/页码/DOI。
- 法律内容严格限定来源库三法域入口 + CISG/UNIDROIT，正式交易须核对官方文本与法务意见。
