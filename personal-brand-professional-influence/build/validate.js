/* 验证脚本：检查 index.html 的数据完整性与 JS 语法 */
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

// 1. 提取 <script> 内容做语法检查
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.error("FAIL: no script block"); process.exit(1); }
fs.writeFileSync(path.join(__dirname, "_check.js"), m[1]);

// 2. 提取数据段并在 Node 中执行以获取 COURSE（屏蔽 DOM 相关代码）
let dataCode = m[1];
// 截取到第一个引擎函数定义之前（"/* ==================== 工具函数" 之前）
const cut = dataCode.indexOf("/* ==================== 工具函数");
if (cut < 0) { console.error("FAIL: engine marker not found"); process.exit(1); }
const dataOnly = dataCode.slice(0, cut);
let COURSE;
eval(dataOnly.replace(/var COURSE/, "COURSE") + "; COURSE = COURSE;");
// 上面 eval 后 COURSE 为 undefined（var 作用域），改为沙箱执行：
const vm = require("vm");
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(dataOnly, sandbox);
COURSE = sandbox.COURSE;
if (!COURSE || !COURSE.modules || !COURSE.modules.length) { console.error("FAIL: COURSE not populated"); process.exit(1); }

const errors = [];
const srcIds = new Set(COURSE.sources.map(s => s.id));
if (srcIds.size !== COURSE.sources.length) errors.push("来源编号重复");
COURSE.sources.forEach(s => {
  ["id","title","author","url","type","date","note","mods","checked"].forEach(k => { if (!s[k]) errors.push("来源 "+s.id+" 缺字段 "+k); });
  if (!/^https?:\/\//.test(s.url)) errors.push("来源 "+s.id+" URL 非法");
});

const secIds = new Set();
const taskIds = new Set();
COURSE.modules.forEach(mod => {
  if (secIds.has(mod.id)) errors.push("模块 id 重复: "+mod.id);
  secIds.add(mod.id);
  ["id","num","title","sub","stage","hours","goals","questions","terms","related","sources","sections","exercise","quiz"].forEach(k => { if (mod[k] === undefined) errors.push(mod.id+" 缺字段 "+k); });
  if (mod.stage < 1 || mod.stage > 4) errors.push(mod.id+" stage 非法");
  mod.sections.forEach(sec => {
    if (secIds.has(sec.id)) errors.push("章节 id 重复: "+sec.id);
    secIds.add(sec.id);
    if (!sec.title || !sec.html) errors.push(sec.id+" 缺 title/html");
    if (!/^m\d+-\d+$/.test(sec.id)) errors.push("章节 id 格式异常: "+sec.id);
    // HTML 粗检：标签配对
    const open = (sec.html.match(/<(div|table|details|svg|p|ul|ol|blockquote|h3|h4)\b/g)||[]).length;
    const close = (sec.html.match(/<\/(div|table|details|svg|p|ul|ol|blockquote|h3|h4)>/g)||[]).length;
    if (open !== close) errors.push(sec.id+" HTML 标签疑似不配对: open="+open+" close="+close);
    if (sec.html.includes("`")) errors.push(sec.id+" 含反引号");
    if (sec.html.includes("${")) errors.push(sec.id+" 含 ${ 序列");
  });
  mod.exercise.tasks.forEach(t => {
    if (taskIds.has(t.id)) errors.push("任务 id 重复: "+t.id);
    taskIds.add(t.id);
    if (!t.t || !t.out) errors.push(t.id+" 缺字段");
  });
  mod.quiz.forEach((q, i) => {
    if (!q.q || !q.options || q.options.length < 2) errors.push(mod.id+" quiz"+i+" 缺字段");
    if (!(q.answer >= 0 && q.answer < q.options.length)) errors.push(mod.id+" quiz"+i+" answer 越界");
    if (!q.explain) errors.push(mod.id+" quiz"+i+" 缺 explain");
  });
  mod.sources.forEach(sid => { if (!srcIds.has(sid)) errors.push(mod.id+" 引用不存在来源 "+sid); });
  mod.related.forEach(rid => { const ok = COURSE.modules.some(x => x.id === rid); if (!ok) errors.push(mod.id+" related 引用不存在 "+rid); });
});

// 3. 正文中引用的 [Sxx] 是否都存在于来源表
const allHtml = COURSE.modules.map(mod => mod.sections.map(s => s.html).join(" ")).join(" ")
  + JSON.stringify(COURSE.modules.map(mod => mod.quiz));
const cited = new Set((allHtml.match(/data-src="(S\d+)"/g)||[]).map(x => x.slice(10, -1)));
cited.forEach(cid => { if (!srcIds.has(cid)) errors.push("正文引用了不存在的来源 "+cid); });
console.log("引用来源数: "+cited.size+" / "+COURSE.sources.length);

// 4. 引擎关键函数存在性（检查完整脚本）
["renderNav","renderHome","route","doSearch","svgKnowledgeMap","renderSectionPage","renderQuizPage","renderLibrary","renderProject","renderPath"].forEach(fn => { if (!dataCode.includes("function "+fn)) errors.push("引擎缺函数 "+fn); });
if (!dataCode.includes("STAGES") || !dataCode.includes("PROJECT")) errors.push("缺 STAGES/PROJECT");

// 5. 检查反引号模板字符串未转义问题（已在各文件检查）
if (errors.length) {
  console.log("FAIL ("+errors.length+"):");
  errors.forEach(e => console.log(" - "+e));
  process.exit(1);
} else {
  console.log("ALL CHECKS PASSED");
  console.log("模块数: "+COURSE.modules.length+" | 章节数: "+secIds.size+" | 来源数: "+COURSE.sources.length+" | 任务数: "+taskIds.size);
  const totalChars = COURSE.modules.reduce((n,mod)=>n+mod.sections.reduce((a,s)=>a+s.html.length,0),0);
  console.log("正文总字符数(含HTML): "+totalChars);
}
fs.unlinkSync(path.join(__dirname, "_check.js"));
