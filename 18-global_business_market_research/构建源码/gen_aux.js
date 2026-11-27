// 生成辅助交付文件：来源索引 + 术语词典 JSON + 使用说明
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const html = fs.readFileSync(path.join(__dirname, '..', 'global_business_market_research.html'), 'utf8');
const scripts = [];
const re = /<script>([\s\S]*?)<\/script>/g;
let m;
while ((m = re.exec(html)) !== null) scripts.push(m[1]);
const js = scripts.join('\n;\n');
const stubs = fs.readFileSync(path.join(__dirname, 'test.js'), 'utf8').match(/const stubs = `([\s\S]*?)`;/)[1];

const gen = `
;(function(){
const outDir = require('path').dirname(process.argv[1]);
// 1. 术语词典 JSON
fs.writeFileSync(path.join(outDir, 'gbmr_glossary.json'), JSON.stringify(GLOSSARY, null, 2));
console.log('✅ gbmr_glossary.json 生成（' + Object.keys(GLOSSARY).length + ' 条）');

// 2. 来源索引 Markdown
let md = '# 《全球商业与国际市场研究》来源索引\\n\\n'
  + '> 生成日期：2026 年 10 月 21 日｜共 ' + SOURCES.length + ' 条来源\\n'
  + '> 证据等级：A 强证据（正式法规/原始政策文件/可核验官方统计/方法透明的高质量研究）；B 较强证据（权威机构报告/方法明确的研究）；C 有限证据（专家观点/经验总结/个案）；D 待验证。等级针对具体结论，非机构永久标签。\\n\\n'
  + '| # | 来源 | 机构/作者 | 年份 | 类型 | 等级 | 支持的主要结论 | 链接 |\\n|---|---|---|---|---|---|---|---|\\n';
SOURCES.forEach(s => {
  md += '| ' + s.no + ' | ' + s.title.replace(/\\|/g, '/') + ' | ' + s.org + ' | ' + s.year + ' | ' + s.type + ' | ' + s.grade + ' | ' + (s.supports || '').replace(/\\|/g, '/').slice(0, 90) + ' | [链接](' + s.url + ') |\\n';
});
md += '\\n## 使用说明\\n\\n1. 所有链接访问日期为 2026-10-21；失效链接请通过发布机构官网检索同名文件。\\n2. 政策类来源（关税、管制、协定）具有时效性，使用前须核验当期状态。\\n3. 引用本索引时应同时引用 HTML 课程中对应章节，以保证「来源—结论」绑定。\\n';
fs.writeFileSync(path.join(outDir, 'gbmr_sources_index.md'), md);
console.log('✅ gbmr_sources_index.md 生成');

// 3. 统计
const stats = {
  modules: Object.keys(MODULES).length,
  stages: STAGES.length,
  glossary: Object.keys(GLOSSARY).length,
  sources: SOURCES.length,
  tools: Object.keys(TOOLS).length,
  exercises: Object.keys(MODULES).reduce((n, id) => n + MODULES[id].exercises.length, 0),
  databases: DATABASES.length,
  readings: READINGS.length
};
fs.writeFileSync(path.join(outDir, 'gbmr_stats.json'), JSON.stringify(stats, null, 2));
console.log('✅ 统计:', JSON.stringify(stats));
})();
`;

const tmpFile = path.join(__dirname, '_gen_aux.js');
const wrapped = stubs + '\n' + js + '\n' + 'var fs = require("fs"); var path = require("path");\n' + gen;
fs.writeFileSync(tmpFile, wrapped);
execSync('node "' + tmpFile + '" "' + path.join(__dirname, '..') + '"', { stdio: 'inherit' });
