<script>
/* ================= 交互式分析工具 ================= */
Object.assign(TOOLS, {

/* ---- 工具 1：市场评分卡 ---- */
'market-score': {
  id:'market-score', tag:'市场筛选', title:'市场评分卡（加权决策矩阵）',
  desc:'调整指标权重，观察六个候选市场的加权得分与排序变化。内置评分来自 m32 综合案例的教学演示数据。',
  sub:'权重实时可调 · 排序动态更新',
  note:'本工具的评分为教学演示数据，真实研究必须替换为可核验数据（每个指标注明来源与年份）。评分卡是决策输入，不是决策本身。',
  mount(el){
    const criteria = [
      { key:'size',  name:'市场规模',   w:25 },
      { key:'growth',name:'增长速度',   w:20 },
      { key:'comp',  name:'竞争强度反向分', w:15 },
      { key:'profit',name:'利润空间',   w:15 },
      { key:'cost',  name:'进入成本反向分', w:15 },
      { key:'risk',  name:'风险反向分', w:10 }
    ];
    const markets = [
      { name:'沙特阿拉伯', scores:{size:5,growth:5,comp:4,profit:4,cost:3,risk:4} },
      { name:'巴西',       scores:{size:5,growth:4,comp:3,profit:3,cost:2,risk:3} },
      { name:'巴基斯坦',   scores:{size:4,growth:4,comp:3,profit:2,cost:3,risk:2} },
      { name:'德国',       scores:{size:4,growth:3,comp:2,profit:3,cost:3,risk:4} },
      { name:'南非',       scores:{size:3,growth:3,comp:4,profit:3,cost:3,risk:3} },
      { name:'印度尼西亚', scores:{size:3,growth:4,comp:4,profit:2,cost:3,risk:3} }
    ];
    let html = '<div class="ctl-row">';
    criteria.forEach(c => {
      html += '<div class="ctl"><label>'+c.name+' <output id="w-'+c.key+'">'+c.w+'%</output></label>'
        + '<input type="range" id="s-'+c.key+'" min="0" max="40" step="5" value="'+c.w+'"></div>';
    });
    html += '</div><div class="result-box" id="ms-out"></div>'
      + '<p class="small" style="margin-top:10px">提示：把任一指标权重 ±10 个百分点，观察前两名是否翻转——若频繁翻转，说明两市场无显著差异，应并列验证而非强行排序（m13 敏感性分析）。</p>';
    el.innerHTML = html;
    function calc(){
      const ws = {};
      let total = 0;
      criteria.forEach(c => { const v = +$('#s-'+c.key).value; ws[c.key] = v; total += v; $('#w-'+c.key).textContent = v+'%'; });
      const results = markets.map(m => {
        let s = 0; criteria.forEach(c => { s += m.scores[c.key] * ws[c.key]; });
        return { name:m.name, score: total ? s/total : 0 };
      }).sort((a,b) => b.score - a.score);
      const max = results[0].score || 1;
      $('#ms-out').innerHTML = '<b>加权得分排序（权重合计 '+total+'%）</b>'
        + results.map((r,i) => '<div class="bar-row'+(i===0?' top':'')+'"><span class="name">'+esc(r.name)+'</span>'
          + '<span class="track"><span class="fill" style="width:'+(r.score/max*100).toFixed(1)+'%"></span></span>'
          + '<span class="val">'+r.score.toFixed(2)+'</span></div>').join('')
        + '<p class="small" style="margin-top:8px">当前第一名：'+esc(results[0].name)+'。对比 m32 案例：基准权重下沙特 4.30 分居首。</p>';
    }
    criteria.forEach(c => $('#s-'+c.key).addEventListener('input', calc));
    calc();
  }
},

/* ---- 工具 2：TAM / SAM / SOM 计算器 ---- */
'tam-calc': {
  id:'tam-calc', tag:'市场规模', title:'市场规模计算器（TAM / SAM / SOM）',
  desc:'用自上而下与自下而上两条路径估算市场，展示计算过程并比较两条路径的差异。',
  sub:'双路径交叉验证 · 公式透明',
  note:'本工具的默认参数为教学假设。真实估算必须替换为可核验数据并标注来源、年份与口径（m12）。',
  mount(el){
    el.innerHTML =
      '<h4 class="mini">路径 A：自上而下</h4>'
      + '<div class="ctl-row">'
      + '<div class="ctl"><label>目标客群规模（万户）</label><input type="number" id="td-pop" value="1200" step="10"></div>'
      + '<div class="ctl"><label>渗透率（%）</label><input type="number" id="td-pen" value="8" step="0.5"></div>'
      + '<div class="ctl"><label>平均客单价（美元）</label><input type="number" id="td-arpu" value="900" step="10"></div>'
      + '</div>'
      + '<div class="ctl-row">'
      + '<div class="ctl"><label>可服务比例 SAM（%）</label><input type="number" id="td-sam" value="60" step="5"></div>'
      + '<div class="ctl"><label>3 年可获取比例 SOM（%）</label><input type="number" id="td-som" value="3" step="0.5"></div>'
      + '</div>'
      + '<h4 class="mini">路径 B：自下而上</h4>'
      + '<div class="ctl-row">'
      + '<div class="ctl"><label>主要渠道年销量合计（万台）</label><input type="number" id="bu-units" value="70" step="5"></div>'
      + '<div class="ctl"><label>渠道覆盖率（%）</label><input type="number" id="bu-cov" value="75" step="5"></div>'
      + '<div class="ctl"><label>平均成交价（美元）</label><input type="number" id="bu-price" value="950" step="10"></div>'
      + '</div>'
      + '<div class="result-box" id="tc-out"></div>'
      + '<p class="small" style="margin-top:10px">两条路径差异超过 2 倍时，应回到假设定位差异（口径 / 覆盖率 / 价格带），而不是取平均（m12）。</p>';
    function calc(){
      const pop = +$('#td-pop').value, pen = +$('#td-pen').value/100, arpu = +$('#td-arpu').value;
      const samR = +$('#td-sam').value/100, somR = +$('#td-som').value/100;
      const tam = pop * 10000 * pen * arpu;
      const sam = tam * samR, som = sam * somR;
      const units = +$('#bu-units').value, cov = +$('#bu-cov').value/100, price = +$('#bu-price').value;
      const bu = units * 10000 * cov * price;
      const diff = bu ? Math.abs(bu - tam)/tam*100 : 0;
      const fmt = v => v >= 1e8 ? (v/1e8).toFixed(2)+' 亿美元' : (v/1e4).toFixed(0)+' 万美元';
      $('#tc-out').innerHTML =
        '<div class="rline"><span>自上而下 TAM = 客群 '+pop+' 万户 × 渗透率 '+(pen*100).toFixed(1)+'% × 客单价 '+arpu+' 美元</span><span class="v">'+fmt(tam)+'</span></div>'
        + '<div class="rline"><span>SAM = TAM × 可服务比例 '+(samR*100)+'%</span><span class="v">'+fmt(sam)+'</span></div>'
        + '<div class="rline"><span>SOM = SAM × 3 年可获取 '+(somR*100)+'%</span><span class="v">'+fmt(som)+'</span></div>'
        + '<div class="rline"><span>自下而上 = 渠道销量 '+units+' 万台 × 覆盖率 '+(cov*100)+'% × 成交价 '+price+' 美元</span><span class="v">'+fmt(bu)+'</span></div>'
        + '<div class="rline"><span>两路径差异（相对 TAM）</span><span class="v">'+diff.toFixed(0)+'%</span></div>'
        + (diff > 100 ? '<p class="small" style="margin-top:8px;color:var(--warn)">差异超过 100%：必须定位差异来源（转口与库存？覆盖率假设？价格带错配？），不得取平均。</p>' : '');
    }
    ['td-pop','td-pen','td-arpu','td-sam','td-som','bu-units','bu-cov','bu-price'].forEach(id => $('#'+id).addEventListener('input', calc));
    calc();
  }
},

/* ---- 工具 3：风险矩阵 ---- */
'risk-matrix': {
  id:'risk-matrix', tag:'风险管理', title:'风险评估矩阵（概率 × 影响）',
  desc:'调整各风险的发生概率与影响程度，观察风险分值、象限位置与排序变化。',
  sub:'动态九宫格 · 排序更新',
  note:'概率与影响是主观判断，应记录判断依据并定期复盘校准（m30）。矩阵用于沟通与排序，不替代分析。',
  mount(el){
    const risks = [
      { name:'关税/政策上调', p:4, i:4, path:'成本上升 → 毛利压缩' },
      { name:'买方信用违约', p:3, i:5, path:'坏账 → 现金流断裂' },
      { name:'汇率大幅波动', p:4, i:3, path:'本币收入缩水' },
      { name:'物流中断', p:3, i:3, path:'交付延迟 → 违约与滞港' },
      { name:'出口管制扩大', p:2, i:5, path:'业务资格丧失' },
      { name:'价格战加剧', p:5, i:3, path:'全行业毛利下行' },
      { name:'需求突然萎缩', p:2, i:4, path:'收入下滑 + 库存积压' },
      { name:'合规处罚', p:2, i:4, path:'罚款 + 市场禁入' }
    ];
    let html = '<div class="tbl-wrap"><table class="data"><thead><tr><th>风险</th><th>传导路径</th><th>概率(1-5)</th><th>影响(1-5)</th><th>分值</th><th>等级</th></tr></thead><tbody>';
    risks.forEach((r, i) => {
      html += '<tr><td>'+esc(r.name)+'</td><td class="small">'+esc(r.path)+'</td>'
        + '<td><select id="rk-p'+i+'">'+[1,2,3,4,5].map(v=>'<option'+(v===r.p?' selected':'')+'>'+v+'</option>').join('')+'</select></td>'
        + '<td><select id="rk-i'+i+'">'+[1,2,3,4,5].map(v=>'<option'+(v===r.i?' selected':'')+'>'+v+'</option>').join('')+'</select></td>'
        + '<td class="num" id="rk-v'+i+'">—</td><td id="rk-l'+i+'">—</td></tr>';
    });
    html += '</tbody></table></div><div class="result-box" id="rm-out"></div>';
    el.innerHTML = html;
    function calc(){
      const arr = risks.map((r, i) => {
        const p = +$('#rk-p'+i).value, im = +$('#rk-i'+i).value, v = p*im;
        const lv = v >= 16 ? '高' : v >= 10 ? '中高' : v >= 5 ? '中' : '低';
        const color = v >= 16 ? 'var(--err)' : v >= 10 ? 'var(--warn)' : v >= 5 ? 'var(--info)' : 'var(--ok)';
        $('#rk-v'+i).textContent = v;
        $('#rk-l'+i).innerHTML = '<span class="badge" style="color:'+color+';border-color:'+color+'">'+lv+'</span>';
        return { name:r.name, v };
      }).sort((a,b) => b.v - a.v);
      const top3 = arr.slice(0,3);
      $('#rm-out').innerHTML = '<b>风险排序（前三位需配置 KRI 与触发动作）</b>'
        + top3.map((r,i) => '<div class="bar-row'+(i===0?' top':'')+'"><span class="name">'+esc(r.name)+'</span>'
          + '<span class="track"><span class="fill" style="width:'+(r.v/25*100)+'%"></span></span>'
          + '<span class="val">'+r.v+'</span></div>').join('')
        + '<p class="small" style="margin-top:8px">注意：低概率 × 高影响的风险（如「出口管制扩大」2×5=10）在分值上可能低于高概率低影响项，但属于生存级风险，必须零容忍管理（m30）。</p>';
    }
    risks.forEach((r, i) => { $('#rk-p'+i).addEventListener('change', calc); $('#rk-i'+i).addEventListener('change', calc); });
    calc();
  }
},

/* ---- 工具 4：到岸成本计算器 ---- */
'landed-cost': {
  id:'landed-cost', tag:'贸易执行', title:'到岸成本计算器（Incoterms 版）',
  desc:'选择贸易术语，输入货价、运费、关税与税费，计算卖方报价构成与买方总成本，展示完整成本栈。',
  sub:'术语驱动 · 成本栈可视化',
  note:'关税税率、增值税率与各项费用必须以进口国当期官方税则与真实报价为准（m18/m20）。本工具为教学模型。',
  mount(el){
    el.innerHTML =
      '<div class="ctl-row">'
      + '<div class="ctl"><label>贸易术语（Incoterms 2020）</label><select id="lc-term">'
      + '<option value="EXW">EXW 工厂交货</option><option value="FOB" selected>FOB 装运港船上交货</option>'
      + '<option value="CIF">CIF 成本加保险加运费</option><option value="DAP">DAP 目的地交货</option>'
      + '<option value="DDP">DDP 完税后交货</option></select></div>'
      + '<div class="ctl"><label>货物货值（美元，FOB 口径）</label><input type="number" id="lc-goods" value="10000" step="500"></div>'
      + '<div class="ctl"><label>出口报关与内陆费用（美元）</label><input type="number" id="lc-exp" value="350" step="50"></div>'
      + '</div>'
      + '<div class="ctl-row">'
      + '<div class="ctl"><label>海运运费（美元）</label><input type="number" id="lc-frt" value="1800" step="100"></div>'
      + '<div class="ctl"><label>保险费率（% 货值）</label><input type="number" id="lc-ins" value="0.5" step="0.1"></div>'
      + '<div class="ctl"><label>进口关税（% 完税价格）</label><input type="number" id="lc-duty" value="5" step="0.5"></div>'
      + '<div class="ctl"><label>增值税 / 消费税（% 含税基）</label><input type="number" id="lc-vat" value="19" step="1"></div>'
      + '<div class="ctl"><label>目的港杂费 + 内陆运输（美元）</label><input type="number" id="lc-port" value="700" step="50"></div>'
      + '<div class="ctl"><label>清关服务费与其他（美元）</label><input type="number" id="lc-oth" value="300" step="50"></div>'
      + '<div class="ctl"><label>目标毛利率（%，卖方）</label><input type="number" id="lc-mgn" value="15" step="1"></div>'
      + '</div>'
      + '<div class="result-box" id="lc-out"></div>'
      + '<p class="small" style="margin-top:10px">术语只改变「谁承担」，不改变总成本。比较不同供应商报价时，必须先统一折算到「买方总成本」口径（m18）。</p>';
    function calc(){
      const term = $('#lc-term').value;
      const goods = +$('#lc-goods').value, exp = +$('#lc-exp').value, frt = +$('#lc-frt').value;
      const ins = goods * (+$('#lc-ins').value)/100, dutyR = (+$('#lc-duty').value)/100;
      const vatR = (+$('#lc-vat').value)/100, port = +$('#lc-port').value, oth = +$('#lc-oth').value;
      const mgn = (+$('#lc-mgn').value)/100;
      const sellerFrt = ['CIF','DAP','DDP'].includes(term) ? frt : 0;
      const sellerIns = ['CIF','DAP','DDP'].includes(term) ? ins : 0;
      const sellerExp = term === 'EXW' ? 0 : exp;
      const sellerPort = ['DAP','DDP'].includes(term) ? port : 0;
      const sellerOth = term === 'DDP' ? oth : 0;
      const cif = goods + exp + frt + ins;
      const duty = cif * dutyR;
      const sellerDuty = term === 'DDP' ? duty : 0;
      const vatBase = cif + duty + port + oth;
      const vat = vatBase * vatR;
      const sellerQuote = goods + sellerExp + sellerFrt + sellerIns + sellerPort + sellerOth + sellerDuty;
      const buyerTotal = goods + exp + frt + ins + duty + port + oth;
      const sellerCost = goods * (1 - mgn) > 0 ? goods * (1 - mgn) : 0;
      const fmt = v => '$' + v.toLocaleString('en-US', { maximumFractionDigits: 0 });
      $('#lc-out').innerHTML =
        '<div class="rline"><span>卖方报价（'+term+' 口径）= 货值'+(sellerExp?' + 出口费用':'')+(sellerFrt?' + 运费':'')+(sellerIns?' + 保险':'')+(sellerPort?' + 目的港/内陆':'')+(sellerOth?' + 清关其他':'')+(sellerDuty?' + 关税':'')+'</span><span class="v">'+fmt(sellerQuote)+'</span></div>'
        + '<div class="rline"><span>买方额外承担（不含可抵扣增值税）</span><span class="v">'+fmt(buyerTotal - sellerQuote)+'</span></div>'
        + '<div class="rline"><span><b>买方总成本（到岸，不含增值税）</b></span><span class="v">'+fmt(buyerTotal)+'</span></div>'
        + '<div class="rline"><span>增值税（通常可抵扣，仅列示）</span><span class="v">'+fmt(vat)+'</span></div>'
        + '<div class="rline"><span>关税（完税价格 '+fmt(cif)+' × '+(dutyR*100).toFixed(1)+'%）</span><span class="v">'+fmt(duty)+'</span></div>'
        + '<div class="rline"><span>到岸成本较货值上浮</span><span class="v">'+((buyerTotal/goods-1)*100).toFixed(1)+'%</span></div>'
        + '<div class="rline"><span>卖方在目标毛利率 '+((mgn)*100).toFixed(0)+'% 下的可接受货值上限</span><span class="v">'+fmt(sellerCost)+'</span></div>'
        + '<p class="small" style="margin-top:8px">当前术语下：' + (term==='EXW' ? '买方承担出口报关与全部运输，报价最低但买方总责任最重。' : term==='FOB' ? '卖方负责出口通关，买方安排运输与保险、承担进口清关与关税。' : term==='CIF' ? '卖方支付运费与最低险别，风险仍在装运港转移；买方承担关税与清关。' : term==='DAP' ? '卖方运抵目的地但不负责清关与关税；买方完成进口手续。' : '卖方承担全部责任至目的地完税，报价最高、操作最难，需确认卖方具备进口资质。') + '</p>';
    }
    $('#lc-term').addEventListener('change', calc);
    ['lc-goods','lc-exp','lc-frt','lc-ins','lc-duty','lc-vat','lc-port','lc-oth','lc-mgn'].forEach(id => $('#'+id).addEventListener('input', calc));
    calc();
  }
},

/* ---- 工具 5：进入模式比较器 ---- */
'entry-mode': {
  id:'entry-mode', tag:'进入战略', title:'市场进入模式比较器',
  desc:'调整企业偏好（控制权需求、资本约束、速度、风险规避、本地知识依赖），比较六种进入模式的匹配度。',
  sub:'偏好驱动 · 排序更新',
  note:'比较器是结构化讨论工具，不能替代 OLI 匹配检验（m05/m16）与真实的财务测算（m31）。',
  mount(el){
    const dims = [
      { key:'ctrl', name:'控制权需求', w:25 },
      { key:'cap',  name:'资本约束（高分=偏好低投入）', w:20 },
      { key:'speed',name:'进入速度要求', w:15 },
      { key:'risk', name:'风险规避', w:20 },
      { key:'know', name:'本地知识依赖（高分=缺知识需借力）', w:20 }
    ];
    const modes = [
      { name:'间接出口',        s:{ctrl:1,cap:5,speed:5,risk:5,know:5} },
      { name:'直接出口',        s:{ctrl:2,cap:4,speed:4,risk:4,know:4} },
      { name:'代理/经销商',     s:{ctrl:3,cap:4,speed:4,risk:4,know:5} },
      { name:'许可/特许',       s:{ctrl:2,cap:5,speed:5,risk:5,know:4} },
      { name:'合资企业',        s:{ctrl:4,cap:2,speed:3,risk:3,know:4} },
      { name:'绿地/独资子公司', s:{ctrl:5,cap:1,speed:2,risk:2,know:2} }
    ];
    let html = '<div class="ctl-row">';
    dims.forEach(d => {
      html += '<div class="ctl"><label>'+d.name+' <output id="em-w-'+d.key+'">'+d.w+'%</output></label>'
        + '<input type="range" id="em-s-'+d.key+'" min="0" max="50" step="5" value="'+d.w+'"></div>';
    });
    html += '</div><div class="result-box" id="em-out"></div>'
      + '<p class="small" style="margin-top:10px">读法：得分高 = 该模式更匹配当前偏好组合。若「绿地」得分最高但企业资本约束很高，说明偏好设置矛盾——先统一战略优先级再比较。</p>';
    el.innerHTML = html;
    function calc(){
      const ws = {}; let total = 0;
      dims.forEach(d => { const v = +$('#em-s-'+d.key).value; ws[d.key] = v; total += v; $('#em-w-'+d.key).textContent = v+'%'; });
      const results = modes.map(m => {
        let s = 0; dims.forEach(d => { s += m.s[d.key] * ws[d.key]; });
        return { name:m.name, score: total ? s/total : 0 };
      }).sort((a,b) => b.score - a.score);
      const max = results[0].score || 1;
      $('#em-out').innerHTML = '<b>模式匹配度排序</b>'
        + results.map((r,i) => '<div class="bar-row'+(i===0?' top':'')+'"><span class="name">'+esc(r.name)+'</span>'
          + '<span class="track"><span class="fill" style="width:'+(r.score/max*100).toFixed(1)+'%"></span></span>'
          + '<span class="val">'+r.score.toFixed(2)+'</span></div>').join('')
        + '<p class="small" style="margin-top:8px">当前最匹配：'+esc(results[0].name)+'。对照 m16：进入模式还应通过 OLI（O/L/I 三优势）与战略类型（m15）双重检验。</p>';
    }
    dims.forEach(d => $('#em-s-'+d.key).addEventListener('input', calc));
    calc();
  }
},

/* ---- 工具 6：比较优势演示 ---- */
'comparative-advantage': {
  id:'comparative-advantage', tag:'理论演示', title:'比较优势交互演示（李嘉图模型）',
  desc:'修改两国生产两种产品的劳动投入，自动计算机会成本、分工方向、自给自足价格与可成交的贸易条件区间。',
  sub:'数值可编辑 · PPF 可视化',
  note:'李嘉图模型是两产品、单要素、无运输成本的静态模型，用于理解机制，不能直接套用于现实（m02 局限）。',
  mount(el){
    el.innerHTML =
      '<p class="small">默认值为李嘉图原始例子（英国与葡萄牙，布与葡萄酒，单位：人年/单位产品）。修改数字后所有结论自动重算。</p>'
      + '<div class="tbl-wrap"><table class="data"><thead><tr><th>产品</th><th>英国（劳动投入）</th><th>葡萄牙（劳动投入）</th></tr></thead><tbody>'
      + '<tr><td>1 单位布料</td><td><input type="number" id="ca-uk-c" value="100" style="width:90px"></td><td><input type="number" id="ca-pt-c" value="90" style="width:90px"></td></tr>'
      + '<tr><td>1 单位葡萄酒</td><td><input type="number" id="ca-uk-w" value="120" style="width:90px"></td><td><input type="number" id="ca-pt-w" value="80" style="width:90px"></td></tr>'
      + '</tbody></table></div>'
      + '<div class="result-box" id="ca-out"></div><div class="map-wrap" id="ca-chart"></div>';
    function calc(){
      const ukC = +$('#ca-uk-c').value, ukW = +$('#ca-uk-w').value, ptC = +$('#ca-pt-c').value, ptW = +$('#ca-pt-w').value;
      if(![ukC,ukW,ptC,ptW].every(v => v > 0)){ $('#ca-out').textContent = '所有投入必须为正数。'; return; }
      const ukCW = ukW/ukC, ukWC = ukC/ukW;   // 英国：多产 1 酒放弃的布；多产 1 布放弃的酒
      const ptCW = ptW/ptC, ptWC = ptC/ptW;
      const wineUK = ukCW < ptCW, clothUK = ukWC < ptWC;
      const ukSpec = wineUK ? '葡萄酒' : '布料';
      const ptSpec = wineUK ? '布料' : '葡萄酒';
      const lo = Math.min(ukCW, ptCW), hi = Math.max(ukCW, ptCW);
      const L = 1000;
      const ukMaxC = L/ukC, ukMaxW = L/ukW, ptMaxC = L/ptC, ptMaxW = L/ptW;
      function ppf(maxC, maxW, color, label){
        return '<svg viewBox="0 0 300 220" style="max-width:300px;flex:1;min-width:260px"><line x1="40" y1="190" x2="280" y2="190" stroke="#98A2B3"/><line x1="40" y1="190" x2="40" y2="10" stroke="#98A2B3"/>'
          + '<line x1="40" y1="'+(190-maxW/ (maxW>maxC?maxW:maxC) * 170)+'" x2="'+(40+maxC/(maxC>maxW?maxC:maxW)*240)+'" y2="190" stroke="'+color+'" stroke-width="2.5"/>'
          + '<text x="150" y="210" font-size="11" fill="#667085" text-anchor="middle">布料</text>'
          + '<text x="14" y="100" font-size="11" fill="#667085" transform="rotate(-90 14 100)" text-anchor="middle">葡萄酒</text>'
          + '<text x="160" y="24" font-size="12" fill="'+color+'" font-weight="700" text-anchor="middle">'+label+'（PPF）</text>'
          + '<text x="46" y="'+(190-maxW/(maxW>maxC?maxW:maxC)*170+14)+'" font-size="10" fill="#98A2B3">'+maxW.toFixed(1)+'</text>'
          + '<text x="'+(36+maxC/(maxC>maxW?maxC:maxW)*240)+'" y="205" font-size="10" fill="#98A2B3" text-anchor="middle">'+maxC.toFixed(1)+'</text></svg>';
      }
      $('#ca-out').innerHTML =
        '<div class="rline"><span>英国多产 1 单位酒的机会成本（布）</span><span class="v">'+ukCW.toFixed(2)+'</span></div>'
        + '<div class="rline"><span>葡萄牙多产 1 单位酒的机会成本（布）</span><span class="v">'+ptCW.toFixed(2)+'</span></div>'
        + '<div class="rline"><span>英国多产 1 单位布的机会成本（酒）</span><span class="v">'+ukWC.toFixed(2)+'</span></div>'
        + '<div class="rline"><span>葡萄牙多产 1 单位布的机会成本（酒）</span><span class="v">'+ptWC.toFixed(2)+'</span></div>'
        + '<div class="rline"><span><b>分工结论</b></span><span class="v">英国产'+ukSpec+'，葡萄牙产'+ptSpec+'</span></div>'
        + '<div class="rline"><span>可成交的贸易条件区间（1 单位酒换布）</span><span class="v">'+lo.toFixed(2)+' – '+hi.toFixed(2)+'</span></div>'
        + '<div class="rline"><span>各自专业化产出（1,000 人年）</span><span class="v">英 '+(wineUK?ukMaxW:ukMaxC).toFixed(1)+' / 葡 '+(wineUK?ptMaxC:ptMaxW).toFixed(1)+'</span></div>'
        + '<p class="small" style="margin-top:8px">原理：机会成本更低的一方专业化。只要成交比例落在区间内，两国都能消费到超出各自 PPF 的组合。注意英国在两种产品上投入都更高时（葡萄牙全面占优），分工依然成立——这就是比较优势的核心洞见。</p>';
      $('#ca-chart').innerHTML = '<div style="display:flex;gap:12px;flex-wrap:wrap">'
        + ppf(ukMaxC, ukMaxW, '#17324D', '英国') + ppf(ptMaxC, ptMaxW, '#287D83', '葡萄牙') + '</div>';
    }
    ['ca-uk-c','ca-uk-w','ca-pt-c','ca-pt-w'].forEach(id => $('#'+id).addEventListener('input', calc));
    calc();
  }
},

/* ---- 工具 7：汇率影响计算器 ---- */
'fx-calc': {
  id:'fx-calc', tag:'支付与汇率', title:'汇率影响计算器（交易暴露）',
  desc:'输入订单金额、签约与结算汇率，计算汇兑损益及其对毛利的影响，理解低毛利业务的汇率弹性。',
  sub:'损益即时可见 · 弹性量化',
  note:'远期锁汇放弃升值收益换取确定性；对冲比例（如 50%）是收益与确定性的平衡（m22）。',
  mount(el){
    el.innerHTML =
      '<div class="ctl-row">'
      + '<div class="ctl"><label>订单金额（外币）</label><input type="number" id="fx-amt" value="200000" step="10000"></div>'
      + '<div class="ctl"><label>计价货币</label><select id="fx-cur"><option>USD</option><option>EUR</option><option>JPY</option><option>GBP</option></select></div>'
      + '<div class="ctl"><label>签约日汇率（折人民币）</label><input type="number" id="fx-r0" value="7.10" step="0.01"></div>'
      + '<div class="ctl"><label>结算日汇率（或远期锁定价）</label><input type="number" id="fx-r1" value="7.10" step="0.01"></div>'
      + '<div class="ctl"><label>该订单毛利率（%）</label><input type="number" id="fx-mgn" value="15" step="1"></div>'
      + '</div><div class="result-box" id="fx-out"></div>';
    function calc(){
      const amt = +$('#fx-amt').value, r0 = +$('#fx-r0').value, r1 = +$('#fx-r1').value, m = (+$('#fx-mgn').value)/100;
      if(!amt || !r0 || !r1){ $('#fx-out').textContent = '请输入有效数值。'; return; }
      const rev0 = amt*r0, rev1 = amt*r1, delta = rev1 - rev0;
      const profit0 = rev0*m, profit1 = profit0 + delta;
      const chg = profit0 ? delta/profit0*100 : 0;
      const cur = $('#fx-cur').value;
      const fmt = v => (v<0?'-':'+') + '¥' + Math.abs(v).toLocaleString('zh-CN', { maximumFractionDigits: 0 });
      $('#fx-out').innerHTML =
        '<div class="rline"><span>签约日预期收入（'+cur+' '+amt.toLocaleString('en-US')+' × '+r0+'）</span><span class="v">¥'+rev0.toLocaleString('zh-CN',{maximumFractionDigits:0})+'</span></div>'
        + '<div class="rline"><span>结算日实际收入（× '+r1+'）</span><span class="v">¥'+rev1.toLocaleString('zh-CN',{maximumFractionDigits:0})+'</span></div>'
        + '<div class="rline"><span>汇兑损益</span><span class="v" style="color:'+(delta>=0?'var(--ok)':'var(--err)')+'">'+fmt(delta)+'</span></div>'
        + '<div class="rline"><span>毛利变化（签约时毛利 ¥'+profit0.toLocaleString('zh-CN',{maximumFractionDigits:0})+'）</span><span class="v" style="color:'+(chg>=0?'var(--ok)':'var(--err)')+'">'+(chg>=0?'+':'')+chg.toFixed(0)+'%</span></div>'
        + '<p class="small" style="margin-top:8px">汇率每变动 1%，本单利润变动约 '+Math.abs((amt*(r1*0.01))/profit0*100).toFixed(0)+'%（毛利率 '+(m*100).toFixed(0)+'% 下的弹性）。'+(Math.abs(chg) > 50 ? ' 当前情景下汇率已吞掉过半利润——这就是低毛利业务必须管理交易暴露的原因。' : '')+'</p>';
    }
    ['fx-amt','fx-r0','fx-r1','fx-mgn','fx-cur'].forEach(id => $('#'+id).addEventListener('input', calc));
    $('#fx-cur').addEventListener('change', calc);
    calc();
  }
}
});
</script>
