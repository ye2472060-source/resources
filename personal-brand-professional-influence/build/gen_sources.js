/* 从课程数据生成 sources.md */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const cut = code.indexOf("/* ==================== 工具函数");
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(code.slice(0, cut), sandbox);
const COURSE = sandbox.COURSE;

const typeMap = { "学术研究":"学术研究", "官方文档":"官方文档", "机构报告":"机构报告", "专业著作":"专业著作", "实践案例":"实践案例" };
let md = "# 核心参考资料目录（sources.md）\n\n";
md += "> 《个人品牌与专业影响力》交互式自学课程的完整来源清单。\n";
md += "> 链接核查日期分两批：国际来源为 2026-10-15，国内平台来源（S45–S51）为 2026-10-18；各条目的准确核查日期见正文。\n";
md += "> 课程正文中以上标编号（如 [S01]）引用下列来源，点击编号可跳转至资料库对应条目。\n\n";

const groups = ["学术研究","官方文档","机构报告","专业著作","实践案例"];
groups.forEach(t => {
  const list = COURSE.sources.filter(s => s.type === t);
  if (!list.length) return;
  md += "## " + t + "（" + list.length + " 项）\n\n";
  list.forEach(s => {
    md += "### " + s.id + " " + s.title + "\n";
    md += "- **作者/机构**：" + s.author + "\n";
    md += "- **链接**：" + s.url + "\n";
    md += "- **类型/日期**：" + s.type + " · " + s.date + "\n";
    md += "- **支撑模块**：" + s.mods.join("、") + "\n";
    md += "- **关键观点**：" + s.note + "\n";
    md += "- **核查日期**：" + s.checked + "\n\n";
  });
});

md += "## 来源类型与使用原则\n\n";
md += "| 类型 | 定义 | 使用原则 |\n|---|---|---|\n";
md += "| 学术研究 | 同行评审论文、系统综述与元分析 | 核心证据；注意样本范围、发表年份与效应边界 |\n";
md += "| 官方文档 | 平台帮助中心、法规原文、官方公告 | 平台规则以此为准；标注核查日期，规则可能变化 |\n";
md += " 机构报告 | 咨询机构与行业研究的调研报告 | 注意样本构成与自报偏差；第三方引述数字需标注局限 |\n";
md += "| 专业著作 | 从业者方法论书籍与散文 | 实践框架，未经普遍验证；按自身情境检验后使用 |\n";
md += "| 实践案例 | 公开个案与第三方跟踪分析 | 警惕幸存者偏差；区分机制事实与比例数字 |\n\n";
md += "## 引用规范说明\n\n";
md += "1. 课程中凡标注「研究证据」的结论，均可追溯到上表具体条目；\n";
md += "2. 凡标注「官方规则」的内容，来自平台/机构当前官方页面（核查日期见上表）；\n";
md += "3. 凡标注「实践方法」的内容，来自专业著作或从业经验，课程中已说明其未经学术验证；\n";
md += "4. 无法访问全文的文献，在 research_notes.md 中如实说明只核查了摘要或公开信息；\n";
md += "5. 第三方引述的平台数据（如 Substack 推荐贡献比例）已标注「未经官方页面直接核验」。\n";

fs.writeFileSync(path.join(__dirname, "..", "sources.md"), md, "utf8");
console.log("sources.md generated:", md.length, "chars");
