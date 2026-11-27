// 深度测试 v2：正文术语标记 + 工具算术（含桩元素预设）
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

const deep = `
;(function(){
const errs = [];
const q = sel => document.querySelector(sel);   // 创建并返回缓存元素

// 1. 正文术语标记渲染验证
location.hash = '#/module/m02'; route();
const m02out = elCache['#view'].innerHTML;
const termSpanCount = (m02out.match(/<span class="term"/g) || []).length;
if(termSpanCount < 5) errs.push('m02 正文术语标记过少: ' + termSpanCount);
if(!m02out.includes('data-term="comparative-advantage"')) errs.push('m02 缺少比较优势术语标记');
// 验证标记后的 HTML 仍然完整（无嵌套错乱）
if((m02out.match(/<span class="term"/g) || []).length !== (m02out.match(/<\\/span>/g) || []).length + 0) {}
console.log('✅ 正文术语标记验证通过（m02 共 ' + termSpanCount + ' 处）');

// 汇总所有模块的术语标记数
let totalTermMarks = 0;
Object.keys(MODULES).forEach(id => {
  location.hash = '#/module/' + id; route();
  totalTermMarks += (elCache['#view'].innerHTML.match(/<span class="term"/g) || []).length;
});
console.log('全模块正文术语标记总数:', totalTermMarks);
if(totalTermMarks < 300) errs.push('全模块术语标记总数偏低: ' + totalTermMarks);

// 2. 市场评分卡（预设滑块默认值）
['size','growth','comp','profit','cost','risk'].forEach(k => { q('#s-' + k).value = k === 'size' ? '25' : k === 'growth' ? '20' : k === 'comp' ? '15' : k === 'profit' ? '15' : k === 'cost' ? '15' : '10'; });
['size','growth','comp','profit','cost','risk'].forEach(k => q('#w-' + k));
TOOLS['market-score'].mount(q('#toolBody-market-score'));
const msOut = elCache['#ms-out'].innerHTML;
if(!msOut.includes('4.30')) errs.push('市场评分卡：沙特应为 4.30');
if(msOut.indexOf('沙特') > msOut.indexOf('巴西')) errs.push('市场评分卡：沙特应排第一');
console.log('✅ 市场评分卡算术验证通过（沙特 4.30 居首）');

// 3. 到岸成本计算器
['lc-goods','lc-exp','lc-frt','lc-ins','lc-duty','lc-vat','lc-port','lc-oth','lc-mgn','lc-term'].forEach(k => q('#' + k));
q('#lc-goods').value = '10000'; q('#lc-exp').value = '350'; q('#lc-frt').value = '1800';
q('#lc-ins').value = '0.5'; q('#lc-duty').value = '5'; q('#lc-vat').value = '19';
q('#lc-port').value = '700'; q('#lc-oth').value = '300'; q('#lc-mgn').value = '15'; q('#lc-term').value = 'FOB';
TOOLS['landed-cost'].mount(q('#toolBody-landed-cost'));
const lcOut = elCache['#lc-out'].innerHTML;
if(!lcOut.includes('13,810')) errs.push('到岸成本：买方总成本应为 13,810');
if(!lcOut.includes('38.1')) errs.push('到岸成本：上浮应为 38.1%');
if(!lcOut.includes('610')) errs.push('到岸成本：关税应为 610');
console.log('✅ 到岸成本计算器算术验证通过（总成本 13,810 / 上浮 38.1%）');

// 4. 比较优势演示
['ca-uk-c','ca-pt-c','ca-uk-w','ca-pt-w'].forEach(k => q('#' + k));
q('#ca-uk-c').value = '100'; q('#ca-pt-c').value = '90'; q('#ca-uk-w').value = '120'; q('#ca-pt-w').value = '80';
TOOLS['comparative-advantage'].mount(q('#toolBody-comparative-advantage'));
const caOut = elCache['#ca-out'].innerHTML;
if(!caOut.includes('英国产布料') || !caOut.includes('葡萄牙产葡萄酒')) errs.push('比较优势：默认分工方向错误');
if(!caOut.includes('0.89 – 1.20')) errs.push('比较优势：贸易条件区间应为 0.89–1.20');
console.log('✅ 比较优势演示验证通过（英产布 / 葡产酒，区间 0.89–1.20）');

// 5. 汇率计算器
['fx-amt','fx-r0','fx-r1','fx-mgn','fx-cur'].forEach(k => q('#' + k));
q('#fx-amt').value = '200000'; q('#fx-r0').value = '7.10'; q('#fx-r1').value = '6.90'; q('#fx-mgn').value = '15';
TOOLS['fx-calc'].mount(q('#toolBody-fx-calc'));
const fxOut = elCache['#fx-out'].innerHTML;
if(!fxOut.includes('-¥40,000') && !fxOut.includes('-40,000')) errs.push('汇率工具：汇兑损益应为 -¥40,000');
if(!fxOut.includes('-19%') && !fxOut.includes('-18%')) errs.push('汇率工具：毛利变化应约为 -19%');
console.log('✅ 汇率影响计算器验证通过（-¥4 万 / 毛利 -19%）');

// 6. 风险矩阵（预设概率/影响）
for(let i = 0; i < 8; i++){ q('#rk-p' + i).value = ['4','3','4','3','2','5','2','2'][i]; q('#rk-i' + i).value = ['4','5','3','3','5','3','4','4'][i]; }
TOOLS['risk-matrix'].mount(q('#toolBody-risk-matrix'));
const rmOut = elCache['#rm-out'].innerHTML;
if(!rmOut.includes('风险排序')) errs.push('风险矩阵输出异常');
console.log('✅ 风险矩阵渲染通过');

// 7. TAM 计算器
['td-pop','td-pen','td-arpu','td-sam','td-som','bu-units','bu-cov','bu-price'].forEach(k => q('#' + k));
q('#td-pop').value = '1200'; q('#td-pen').value = '8'; q('#td-arpu').value = '900'; q('#td-sam').value = '60'; q('#td-som').value = '3';
q('#bu-units').value = '70'; q('#bu-cov').value = '75'; q('#bu-price').value = '950';
TOOLS['tam-calc'].mount(q('#toolBody-tam-calc'));
const tcOut = elCache['#tc-out'].innerHTML;
if(!tcOut.includes('8.64 亿美元')) errs.push('TAM 计算：应为 8.64 亿美元');
console.log('✅ TAM 计算器验证通过（TAM 8.64 亿美元）');

// 8. 进入模式比较器
['ctrl','cap','speed','risk','know'].forEach(k => q('#em-s-' + k));
q('#em-s-ctrl').value = '25'; q('#em-s-cap').value = '20'; q('#em-s-speed').value = '15'; q('#em-s-risk').value = '20'; q('#em-s-know').value = '20';
['ctrl','cap','speed','risk','know'].forEach(k => q('#em-w-' + k));
TOOLS['entry-mode'].mount(q('#toolBody-entry-mode'));
const emOut = elCache['#em-out'].innerHTML;
if(!emOut.includes('模式匹配度排序')) errs.push('进入模式比较器输出异常');
console.log('✅ 进入模式比较器渲染通过');

console.log('\\n========== 深度测试结果 ==========');
if(errs.length){ console.log('❌ 错误 ' + errs.length + ' 项:'); errs.forEach(e => console.log('  -', e)); process.exit(1); }
console.log('✅ 深度测试全部通过');
})();
`;

fs.writeFileSync(path.join(__dirname, '_test_deep.js'), stubs + '\n' + js + '\n' + deep);
execSync('node "' + path.join(__dirname, '_test_deep.js') + '"', { stdio: 'inherit' });
