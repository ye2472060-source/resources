// 测试脚本 v2：拼接执行（桩 + 脚本 + 校验）
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const html = fs.readFileSync(path.join(__dirname, '..', 'global_business_market_research.html'), 'utf8');
const scripts = [];
const re = /<script>([\s\S]*?)<\/script>/g;
let m;
while ((m = re.exec(html)) !== null) scripts.push(m[1]);
console.log('script 块数量:', scripts.length, '（应为 15）');
const js = scripts.join('\n;\n');
fs.writeFileSync(path.join(__dirname, '_all.js'), js);

// 语法检查
try {
  execSync('node --check "' + path.join(__dirname, '_all.js') + '"', { stdio: 'pipe' });
  console.log('✅ JS 语法检查通过');
} catch (e) {
  console.log('❌ JS 语法错误:\n', e.stderr ? e.stderr.toString() : e.message);
  process.exit(1);
}

// 拼接完整测试文件：DOM 桩 + 脚本 + 校验
const stubs = `
const elCache = {};
function mkEl() {
  return {
    addEventListener() {}, removeEventListener() {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    style: {}, dataset: {}, value: '', textContent: '', innerHTML: '',
    querySelector() { return null; }, querySelectorAll() { return []; },
    setAttribute() {}, getAttribute() { return null; }, prepend() {}, appendChild() {}, focus() {}, select() {},
    scrollIntoView() {}, getBoundingClientRect() { return { left: 0, top: 0, bottom: 0, right: 0 }; }, offsetHeight: 0
  };
}
var document = {
  querySelector(sel) { if (!elCache[sel]) elCache[sel] = mkEl(); return elCache[sel]; },
  querySelectorAll() { return []; }, getElementById(id) { if (!elCache['#' + id]) elCache['#' + id] = mkEl(); return elCache['#' + id]; },
  addEventListener() {}, documentElement: mkEl(), title: ''
};
var window = globalThis;
window.addEventListener = () => {};
window.scrollTo = () => {};
var location = { hash: '#/map' };
var localStorage = { _d: {}, getItem(k) { return this._d[k] || null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
var IntersectionObserver = class { constructor() {} observe() {} disconnect() {} };
var navigator = { clipboard: { writeText() { return Promise.resolve(); } } };
var Blob = class {}; var URL = { createObjectURL() { return ''; } };
var alert = () => {};
`;

const validate = `
;(function(){
const errs = [], warns = [];
const modIds = Object.keys(MODULES);
const stageModIds = STAGES.flatMap(s => s.modules);
if (STAGES.length !== 8) errs.push('阶段数量不等于 8: ' + STAGES.length);
stageModIds.forEach(id => { if (!MODULES[id]) errs.push('STAGES 引用不存在的模块: ' + id); });
modIds.forEach(id => { if (!stageModIds.includes(id)) errs.push('模块未加入任何阶段: ' + id); });
modIds.forEach(id => {
  const mod = MODULES[id];
  if (!mod.title || !mod.goal || !mod.outcome || !mod.prereqText) errs.push(id + ' 缺少头部字段');
  if (!mod.sections || mod.sections.length < 4) errs.push(id + ' 章节过少: ' + (mod.sections || []).length);
  (mod.sections || []).forEach(sec => { if (!sec.id || !sec.h || !sec.html) errs.push(id + ' 章节字段缺失'); });
  if (!mod.exercises || mod.exercises.length < 5) errs.push(id + ' 练习不足 5 题');
  (mod.exercises || []).forEach(ex => { if (!ex.type || !ex.q || !ex.a) errs.push(id + ' 练习字段缺失'); });
  (mod.sources || []).forEach(sid => { if (!SOURCES.find(s => s.id === sid)) errs.push(id + ' 引用不存在的来源: ' + sid); });
  (mod.terms || []).forEach(tid => { if (!GLOSSARY[tid]) errs.push(id + ' 引用不存在的术语: ' + tid); });
  (mod.prereq || []).concat(mod.related || []).forEach(pid => { if (!MODULES[pid]) errs.push(id + ' 关联不存在的模块: ' + pid); });
});
Object.keys(GLOSSARY).forEach(k => (GLOSSARY[k].related || []).forEach(r => { if (!GLOSSARY[r]) warns.push('术语 ' + k + ' 关联不存在术语: ' + r); }));
const nos = SOURCES.map(s => s.no);
if (new Set(nos).size !== nos.length) errs.push('来源编号重复');
console.log('模块数:', modIds.length, '｜术语数:', Object.keys(GLOSSARY).length, '｜来源数:', SOURCES.length, '｜工具数:', Object.keys(TOOLS).length, '｜数据库:', DATABASES.length, '｜书目:', READINGS.length);
console.log('练习题总数:', modIds.reduce((n, id) => n + MODULES[id].exercises.length, 0));

function renderRoute(hash) {
  location.hash = hash;
  try { route(); } catch (e) { errs.push('路由 ' + hash + ' 渲染异常: ' + e.message); return; }
  const out = elCache['#view'].innerHTML;
  if (!out || out.length < 200) errs.push('路由 ' + hash + ' 输出过短');
  if (out.includes('undefined') || out.includes('[object Object]') || out.includes('NaN')) errs.push('路由 ' + hash + ' 输出包含 undefined/NaN');
}
renderRoute('#/map');
STAGES.forEach(s => renderRoute('#/stage/' + s.id));
modIds.forEach(id => renderRoute('#/module/' + id));
renderRoute('#/tools');
Object.keys(TOOLS).forEach(k => renderRoute('#/tool/' + k));
['#/glossary', '#/sources', '#/databases', '#/templates', '#/reading', '#/quiz'].forEach(renderRoute);
console.log('✅ 全路由渲染完成（' + (2 + 8 + modIds.length + 1 + Object.keys(TOOLS).length + 6) + ' 个路由）');

try {
  doSearch('关税');
  if (!elCache['#searchResults'].innerHTML.includes('sr-item')) errs.push('搜索「关税」无结果');
  doSearch('comparative advantage');
  if (!elCache['#searchResults'].innerHTML.includes('sr-item')) errs.push('搜索英文术语无结果');
  doSearch('ZZZ不存在的关键词');
  if (!elCache['#searchResults'].innerHTML.includes('未找到')) errs.push('空结果提示缺失');
  console.log('✅ 搜索功能测试通过');
} catch (e) { errs.push('搜索功能异常: ' + e.message); }

try {
  const mapOut = renderMap();
  if (!mapOut.includes('<svg') || !mapOut.includes('阶段 8')) errs.push('知识地图渲染异常');
  console.log('✅ 知识地图渲染通过');
} catch (e) { errs.push('知识地图异常: ' + e.message); }

try {
  store.progress['m01'] = 'done'; persist(); updateProgressUI();
  if (elCache['#progressLabel'].textContent.indexOf('1 /') !== 0) errs.push('进度标签更新异常');
  console.log('✅ 进度持久化测试通过');
} catch (e) { errs.push('进度测试异常: ' + e.message); }

console.log('\\n========== 结果 ==========');
if (errs.length) { console.log('❌ 错误 ' + errs.length + ' 项:'); errs.forEach(e => console.log('  -', e)); process.exit(1); }
else console.log('✅ 全部测试通过，无错误');
if (warns.length) { console.log('⚠️ 警告 ' + warns.length + ' 项:'); warns.slice(0, 10).forEach(w => console.log('  -', w)); }
})();
`;

fs.writeFileSync(path.join(__dirname, '_test_full.js'), stubs + '\n' + js + '\n' + validate);
execSync('node "' + path.join(__dirname, '_test_full.js') + '"', { stdio: 'inherit' });
