<script>
'use strict';
/* ================= 数据容器（内容文件在后面填充） ================= */
const STAGES = [];
const MODULES = {};
const GLOSSARY = {};
const SOURCES = [];
const TOOLS = {};
const DATABASES = [];
const READINGS = [];

/* ================= 本地存储 ================= */
const LS = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v===null?d:JSON.parse(v); }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); return true; }catch(e){ return false; } }
};
const store = {
  progress: LS.get('gbmr.progress.v1', {}),   // moduleId -> 'done' | 'mastered'
  visited:  LS.get('gbmr.visited.v1', {}),
  notes:    LS.get('gbmr.notes.v1', {}),      // moduleId -> [{t, text}]
  theme:    LS.get('gbmr.theme.v1', 'light'),
  tree:     LS.get('gbmr.tree.v1', {})        // stageId -> bool
};
function persist(){ LS.set('gbmr.progress.v1', store.progress); LS.set('gbmr.visited.v1', store.visited); LS.set('gbmr.notes.v1', store.notes); LS.set('gbmr.tree.v1', store.tree); }
function persistTheme(){ LS.set('gbmr.theme.v1', store.theme); }

/* ================= 工具函数 ================= */
const $  = (s, r) => (r||document).querySelector(s);
const $$ = (s, r) => Array.from((r||document).querySelectorAll(s));
function esc(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function stripHtml(h){ return String(h).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim(); }
function fmtTime(t){ const d = new Date(t); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); }
function stageOf(m){ return STAGES.find(s => s.id === m.stage); }
function moduleList(){ return STAGES.flatMap(s => s.modules.map(id => MODULES[id])); }
function prevNext(id){
  const all = moduleList(); const i = all.findIndex(m => m.id === id);
  return { prev: i>0 ? all[i-1] : null, next: i<all.length-1 ? all[i+1] : null };
}
function gradeBadge(g){ const map = {A:['gA','A 强证据'],B:['gB','B 较强证据'],C:['gC','C 有限证据'],D:['gD','D 待验证']}; const m = map[g]||map.C; return '<span class="badge '+m[0]+'">'+m[1]+'</span>'; }
const STAGE_COLORS = ['#17324D','#287D83','#4C6EF5','#7C5CBF','#B54708','#0B6E4F','#A03A3A','#5B6B7C'];

/* ================= 正文术语自动标记 ================= */
function markTerms(html, terms){
  if(!html || !terms || !terms.length) return html;
  const list = [];
  terms.forEach(tid => {
    const g = GLOSSARY[tid]; if(!g || !g.zh) return;
    const main = g.zh.split(/[（(]/)[0].trim();
    if(/^[\u4e00-\u9fff]{2,12}$/.test(main)) list.push({ id:tid, zh:main, cn:true });
    else if(/^[A-Z][A-Z0-9\/\-]{1,9}$/.test(main)) list.push({ id:tid, zh:main, cn:false });
  });
  if(!list.length) return html;
  list.sort((a,b) => b.zh.length - a.zh.length);
  const used = new Set();
  const parts = String(html).split(/(<[^>]+>)/);
  for(let i = 0; i < parts.length; i++){
    if(parts[i].indexOf('<') === 0) continue;          // 跳过标签段
    let text = parts[i];
    const cands = [];
    list.forEach(g => {
      if(used.has(g.id)) return;
      if(g.cn){
        const idx = text.indexOf(g.zh);
        if(idx >= 0) cands.push({ id:g.id, zh:g.zh, start:idx, end:idx + g.zh.length });
      } else {
        const re = new RegExp('(?<![A-Za-z])' + g.zh.replace(/[\/\-]/g, '\\$&') + '(?![A-Za-z])');
        const mm = re.exec(text);
        if(mm) cands.push({ id:g.id, zh:mm[0], start:mm.index, end:mm.index + mm[0].length });
      }
    });
    if(!cands.length) continue;
    cands.sort((a,b) => a.start - b.start || b.end - a.end);
    const accepted = []; let lastEnd = -1;
    cands.forEach(c => { if(c.start >= lastEnd){ accepted.push(c); lastEnd = c.end; used.add(c.id); } });
    for(let j = accepted.length - 1; j >= 0; j--){
      const c = accepted[j];
      text = text.slice(0, c.start) + '<span class="term" data-term="' + c.id + '">' + c.zh + '</span>' + text.slice(c.end);
    }
    parts[i] = text;
  }
  return parts.join('');
}

/* ================= 侧边目录 ================= */
function buildSidebar(){
  const sb = $('#sidebar'); let html = '';
  html += '<button class="tree-res" data-nav="#/map"><span class="ico">🗺</span>知识地图 · 全局结构</button>';
  STAGES.forEach((s, i) => {
    const open = store.tree[s.id] !== false;
    html += '<div class="tree-group'+(open?' open':'')+'" data-stage="'+s.id+'">'
      + '<button class="tree-stage" data-toggle="'+s.id+'"><span class="no">'+s.no+'</span>'+esc(s.title)+'<span class="arrow">▶</span></button>'
      + '<div class="tree-items">';
    s.modules.forEach(mid => {
      const m = MODULES[mid]; if(!m) return;
      const st = store.progress[mid];
      html += '<button class="tree-item'+(st?' done':'')+(store.mastered===mid?'':'')+'" data-nav="#/module/'+mid+'"><span class="dot"></span>'+esc(m.title)+'</button>';
    });
    html += '</div></div>';
  });
  html += '<div class="tree-sep">工具与资源</div>'
    + '<button class="tree-res" data-nav="#/tools"><span class="ico">🧮</span>交互式分析工具</button>'
    + '<button class="tree-res" data-nav="#/quiz"><span class="ico">✍️</span>学习自测题库</button>'
    + '<button class="tree-res" data-nav="#/glossary"><span class="ico">📖</span>专业术语词典</button>'
    + '<button class="tree-res" data-nav="#/sources"><span class="ico">🔗</span>来源数据库与证据等级</button>'
    + '<button class="tree-res" data-nav="#/databases"><span class="ico">🌐</span>官方数据库导航</button>'
    + '<button class="tree-res" data-nav="#/templates"><span class="ico">📋</span>研究模板与交付物</button>'
    + '<button class="tree-res" data-nav="#/reading"><span class="ico">📚</span>延伸阅读书目</button>';
  sb.innerHTML = html;
  $$('[data-nav]', sb).forEach(b => b.addEventListener('click', () => { location.hash = b.dataset.nav; closeSidebarMobile(); }));
  $$('[data-toggle]', sb).forEach(b => b.addEventListener('click', () => {
    const g = b.closest('.tree-group'); g.classList.toggle('open');
    store.tree[b.dataset.toggle] = g.classList.contains('open'); persist();
  }));
}
function highlightTree(){
  const h = location.hash || '#/map';
  $$('#sidebar .tree-item, #sidebar .tree-res').forEach(b => {
    b.classList.toggle('active', b.dataset.nav === h || (h.startsWith('#/module/') && b.dataset.nav === h));
  });
}
function closeSidebarMobile(){ $('#sidebar').classList.remove('open'); }

/* ================= 搜索索引 ================= */
let SEARCH_INDEX = [];
function buildSearchIndex(){
  SEARCH_INDEX = [];
  moduleList().forEach(m => {
    SEARCH_INDEX.push({type:'模块', id:m.id, nav:'#/module/'+m.id, title:m.title, where:'阶段'+stageOf(m).no+' · '+stageOf(m).title, text:stripHtml(m.goal||'')+' '+stripHtml(m.summary||'')});
    (m.sections||[]).forEach(sec => {
      SEARCH_INDEX.push({type:'章节', id:m.id, nav:'#/module/'+m.id+'~'+sec.id, title:sec.h, where:m.title, text:stripHtml(sec.html).slice(0, 4000)});
    });
    (m.exercises||[]).forEach(ex => {
      SEARCH_INDEX.push({type:'练习', id:m.id, nav:'#/module/'+m.id, title:ex.q.slice(0,60), where:m.title+' · 练习', text:ex.a});
    });
  });
  Object.keys(GLOSSARY).forEach(k => {
    const g = GLOSSARY[k];
    SEARCH_INDEX.push({type:'术语', id:k, nav:'#/glossary~'+k, title:g.zh+' '+g.en, where:'术语词典', text:g.def+' '+(g.ex||'')});
  });
  SOURCES.forEach(s => {
    SEARCH_INDEX.push({type:'来源', id:s.id, nav:'#/sources~'+s.id, title:s.title, where:s.org+' · '+s.year, text:(s.supports||'')+' '+(s.notes||'')});
  });
  Object.keys(TOOLS).forEach(k => {
    const t = TOOLS[k];
    SEARCH_INDEX.push({type:'工具', id:k, nav:'#/tool/'+k, title:t.title, where:'交互式分析工具', text:t.desc||''});
  });
}
function doSearch(q){
  q = q.trim(); const box = $('#searchResults');
  if(!q){ box.innerHTML = '<div class="sr-empty">输入关键词开始检索。支持模块、章节、术语、来源与工具。</div>'; return; }
  const low = q.toLowerCase();
  const hits = [];
  SEARCH_INDEX.forEach(it => {
    const t = it.title.toLowerCase(), w = it.where.toLowerCase(), x = it.text.toLowerCase();
    let score = 0, pos = -1;
    if(t.includes(low)){ score += 10; pos = t.indexOf(low); }
    if(w.includes(low)){ score += 4; }
    if(x.includes(low)){ score += 2; if(pos<0) pos = x.indexOf(low); }
    if(score > 0) hits.push({it, score, pos});
  });
  hits.sort((a,b) => b.score - a.score);
  const top = hits.slice(0, 40);
  if(!top.length){ box.innerHTML = '<div class="sr-empty">未找到与「'+esc(q)+'」匹配的内容。可尝试更短的关键词或英文术语。</div>'; return; }
  box.innerHTML = top.map(h => {
    const it = h.it;
    let snip = '';
    if(h.pos >= 0){ const s = Math.max(0, h.pos-50); snip = (s>0?'…':'')+esc(it.text.substr(s, 130))+'…'; }
    const hl = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'gi');
    return '<div class="sr-item" data-nav="'+it.nav+'"><div class="where">'+esc(it.type)+' · '+esc(it.where)+'</div>'
      + '<div class="what">'+esc(it.title).replace(hl, m=>'<mark>'+m+'</mark>')+'</div>'
      + (snip?'<div class="snip">'+snip.replace(hl, m=>'<mark>'+m+'</mark>')+'</div>':'') + '</div>';
  }).join('');
  $$('.sr-item', box).forEach(el => el.addEventListener('click', () => { location.hash = el.dataset.nav; closeSearch(); }));
}

/* ================= 渲染：知识地图 ================= */
function renderMap(){
  const total = moduleList().length;
  const done = moduleList().filter(m => store.progress[m.id]).length;
  const W = 860, ROW1 = 118, ROW2 = 330, bw = 188, bh = 96;
  const cols = 4, gap = (W - 20 - cols*bw) / (cols-1);
  const pos = i => { const r = i < 4 ? 0 : 1, c = i % 4; return { x: 10 + c*(bw+gap), y: r ? ROW2 : ROW1 }; };
  let svg = '<svg viewBox="0 0 '+W+' 460" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="知识依赖地图">';
  svg += '<defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#98A2B3"/></marker></defs>';
  // 连线
  const edges = [[0,1],[1,2],[2,3],[4,5],[5,6],[6,7],[3,4],[0,4],[1,5],[2,6],[3,6],[4,7],[5,7],[2,4]];
  edges.forEach(([a,b]) => {
    const p1 = pos(a), p2 = pos(b);
    const x1 = p1.x + bw/2, y1 = p1.y + (b>a && a<4 && b>=4 ? bh : bh/2);
    const x2 = p2.x + bw/2, y2 = p2.y + (a<4 && b>=4 ? 0 : bh/2);
    let d;
    if(a<4 && b>=4){ d = 'M'+x1+','+y1+' C'+x1+','+(y1+70)+' '+x2+','+(y2-70)+' '+x2+','+y2; }
    else { const xa = p1.x+bw, xb = p2.x; d = 'M'+xa+','+(p1.y+bh/2)+' Q'+(xa+gap/2)+','+(p1.y+bh/2)+' '+xb+','+(p2.y+bh/2); }
    svg += '<path d="'+d+'" fill="none" stroke="#98A2B3" stroke-width="1.6" marker-end="url(#arr)" opacity=".8"/>';
  });
  STAGES.forEach((s, i) => {
    const p = pos(i), c = STAGE_COLORS[i];
    const doneN = s.modules.filter(id => store.progress[id]).length;
    svg += '<g class="gnode" data-nav="#/stage/'+s.id+'">'
      + '<rect x="'+p.x+'" y="'+p.y+'" width="'+bw+'" height="'+bh+'" rx="12" fill="'+c+'" fill-opacity="0.1" stroke="'+c+'" stroke-width="1.6"/>'
      + '<rect x="'+p.x+'" y="'+p.y+'" width="'+bw+'" height="26" rx="12" fill="'+c+'"/>'
      + '<rect x="'+p.x+'" y="'+p.y+'" width="'+bw+'" height="13" rx="0" fill="'+c+'"/>'
      + '<text x="'+(p.x+12)+'" y="'+(p.y+17)+'" fill="#fff" font-size="11.5" font-weight="700">阶段 '+s.no+'</text>'
      + '<text x="'+(p.x+12)+'" y="'+(p.y+50)+'" fill="#182433" font-size="14" font-weight="750">'+esc(s.title)+'</text>'
      + '<text x="'+(p.x+12)+'" y="'+(p.y+68)+'" fill="#667085" font-size="10.5">'+esc(s.en)+'</text>'
      + '<text x="'+(p.x+12)+'" y="'+(p.y+86)+'" fill="'+c+'" font-size="11" font-weight="700">'+s.modules.length+' 个模块 · 已完成 '+doneN+'</text>'
      + '</g>';
  });
  svg += '<text x="10" y="30" fill="#182433" font-size="17" font-weight="800">全球商业与国际市场研究 · 知识依赖图</text>'
    + '<text x="10" y="50" fill="#667085" font-size="11.5">箭头表示主要依赖方向：理论支撑分析，分析支撑决策，决策通过执行落地，风险与合规贯穿全程。点击任一阶段进入。</text>'
    + '<text x="10" y="452" fill="#98A2B3" font-size="10.5">学习进度：'+done+' / '+total+' 个模块已标记完成。阅读不等于掌握，请配合练习、自测与综合项目检验。</text>';
  svg += '</svg>';
  return '<div class="map-wrap">'+svg+'</div>';
}

/* ================= 渲染：阶段页 ================= */
function renderStage(sid){
  const s = STAGES.find(x => x.id === sid); if(!s) return renderMap();
  let html = '<div class="eyebrow">学习路线 · 阶段 '+s.no+' / 8</div>'
    + '<h1 class="pg-title">'+esc(s.title)+'</h1>'
    + '<p class="pg-sub">'+esc(s.en)+'</p>'
    + '<div class="meta-table">'
    + '<div class="cell"><div class="k">阶段目标</div><div class="v">'+esc(s.goal)+'</div></div>'
    + '<div class="cell"><div class="k">前置知识</div><div class="v">'+esc(s.prereq)+'</div></div>'
    + '<div class="cell"><div class="k">建议时长（规划估计）</div><div class="v">'+esc(s.hours)+'</div></div>'
    + '<div class="cell"><div class="k">进入下一阶段的能力标准</div><div class="v">'+esc(s.exit)+'</div></div>'
    + '</div>'
    + '<h2 class="sec">阶段学习成果</h2><ul>' + s.outcomes.map(o => '<li>'+esc(o)+'</li>').join('') + '</ul>'
    + '<h2 class="sec">本阶段模块</h2>';
  s.modules.forEach((mid, i) => {
    const m = MODULES[mid]; if(!m) return;
    const st = store.progress[mid];
    html += '<div class="card" style="margin:12px 0;cursor:pointer" data-nav="#/module/'+mid+'">'
      + '<div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap">'
      + '<span class="badge">模块 '+s.no+'.'+(i+1)+'</span>'
      + '<h5 style="font-size:15.5px;margin:0">'+esc(m.title)+'</h5>'
      + (st?'<span class="badge '+(st==='mastered'?'gA':'gB')+'">'+(st==='mastered'?'已自评掌握':'已完成')+'</span>':'')
      + '</div>'
      + '<p class="small" style="margin:7px 0 0">'+esc(m.summary||'')+'</p>'
      + '<p class="small" style="margin:5px 0 0;color:var(--accent)">建议时长 '+esc(m.hours||'—')+'（规划估计，非客观保证）</p>'
      + '</div>';
  });
  const idx = STAGES.findIndex(x => x.id === sid);
  const prevS = idx>0 ? STAGES[idx-1] : null, nextS = idx<STAGES.length-1 ? STAGES[idx+1] : null;
  html += '<div class="pg-foot">'
    + (prevS?'<a href="#/stage/'+prevS.id+'"><div class="dir">← 上一阶段</div><div class="t">'+esc(prevS.title)+'</div></a>':'<a href="#/map"><div class="dir">← 返回</div><div class="t">知识地图</div></a>')
    + (nextS?'<a href="#/stage/'+nextS.id+'" class="next"><div class="dir">下一阶段 →</div><div class="t">'+esc(nextS.title)+'</div></a>':'<a href="#/module/m32" class="next"><div class="dir">最终项目 →</div><div class="t">综合案例研究</div></a>')
    + '</div>';
  return html;
}

/* ================= 渲染：模块页 ================= */
function renderModule(mid){
  const m = MODULES[mid]; if(!m) return '<h1 class="pg-title">模块不存在</h1>';
  const s = stageOf(m);
  store.visited[mid] = true; persist();
  const st = store.progress[mid] || '';
  let html = '<div class="mod-head"><div class="stage-line">阶段 '+s.no+' · '+esc(s.title)+' / 模块 '+esc(m.title)+'</div>'
    + '<h1 class="pg-title">'+esc(m.title)+'</h1>'
    + '<p class="pg-sub">'+esc(m.en||'')+'</p></div>'
    + '<div class="meta-table">'
    + '<div class="cell"><div class="k">学习目标</div><div class="v">'+esc(m.goal)+'</div></div>'
    + '<div class="cell"><div class="k">前置知识</div><div class="v">'+esc(m.prereqText)+'</div></div>'
    + '<div class="cell"><div class="k">建议时长</div><div class="v">'+esc(m.hours||'—')+'（规划估计）</div></div>'
    + '<div class="cell"><div class="k">学后能力</div><div class="v">'+esc(m.outcome||'')+'</div></div>'
    + '</div>'
    + '<div class="mod-actions">'
    + '<button class="btn '+(st==='done'?'done':'')+'" id="btnDone">'+(st==='done'?'✓ 已完成（点击取消）':'标记为已完成')+'</button>'
    + '<button class="btn '+(st==='mastered'?'done':'')+'" id="btnMaster">'+(st==='mastered'?'✓ 已自评掌握（点击取消）':'自评已掌握')+'</button>'
    + '<button class="btn ghost" id="btnNote">📝 记录本模块笔记</button>'
    + '</div>';
  if(m.summary) html += '<blockquote>'+m.summary+'</blockquote>';
  (m.sections||[]).forEach(sec => {
    html += '<h2 class="sec" id="'+sec.id+'">'+esc(sec.h)+'</h2>' + markTerms(sec.html, m.terms);
  });
  // 练习
  if(m.exercises && m.exercises.length){
    html += '<h2 class="sec" id="ex-'+mid+'">练习与自我检查</h2>'
      + '<p class="small">以下题目用于检验理解程度。参考答案默认折叠，建议先独立作答再展开核对。商业决策题通常没有唯一答案，重点比较不同方案的成立条件与取舍。</p>';
    m.exercises.forEach((ex, i) => {
      html += '<div class="quiz"><div class="q"><span class="qn">'+(i+1)+'.</span>['+esc(ex.type)+'] '+markTerms(esc(ex.q), m.terms)+'</div>'
        + '<button class="reveal">显示参考答案与评价标准</button>'
        + '<div class="ans">'+markTerms(ex.a, m.terms)+'</div></div>';
    });
  }
  // 来源
  if(m.sources && m.sources.length){
    html += '<h2 class="sec" id="src-'+mid+'">本模块引用来源</h2><p class="small">点击编号查看来源详情、证据等级与支持结论。完整列表见「来源数据库」。</p><div style="margin:12px 0">';
    m.sources.forEach(sid => {
      const so = SOURCES.find(x => x.id === sid);
      if(so) html += '<button class="src g'+so.grade+'" data-src="'+so.id+'" title="'+esc(so.org+' · '+so.year)+'">'+esc(so.no||'?')+'</button> <span class="small" style="margin-right:14px">'+esc(so.title.length>38?so.title.slice(0,38)+'…':so.title)+'</span>';
    });
    html += '</div>';
  }
  const pn = prevNext(mid);
  html += '<div class="pg-foot">'
    + (pn.prev?'<a href="#/module/'+pn.prev.id+'"><div class="dir">← 上一模块</div><div class="t">'+esc(pn.prev.title)+'</div></a>':'<a href="#/stage/'+s.id+'"><div class="dir">← 返回</div><div class="t">阶段总览</div></a>')
    + (pn.next?'<a href="#/module/'+pn.next.id+'" class="next"><div class="dir">下一模块 →</div><div class="t">'+esc(pn.next.title)+'</div></a>':'<a href="#/map" class="next"><div class="dir">完成全部模块 →</div><div class="t">返回知识地图</div></a>')
    + '</div>';
  return html;
}
function afterModuleRender(mid){
  const m = MODULES[mid];
  const btnD = $('#btnDone'), btnM = $('#btnMaster');
  if(btnD) btnD.addEventListener('click', () => { store.progress[mid] = store.progress[mid]==='done'?undefined:'done'; if(!store.progress[mid]) delete store.progress[mid]; persist(); rerender(); });
  if(btnM) btnM.addEventListener('click', () => { store.progress[mid] = store.progress[mid]==='mastered'?undefined:'mastered'; if(!store.progress[mid]) delete store.progress[mid]; persist(); rerender(); });
  const bn = $('#btnNote'); if(bn) bn.addEventListener('click', openNotes);
  // 右栏
  const rail = $('#rail');
  let rh = '<h4>本页目录</h4><div class="rail-toc" id="railToc">';
  (m.sections||[]).forEach(sec => {
    rh += '<a href="#'+sec.id+'" class="'+(sec.lvl===3?'lv3':'')+'" data-toc="'+sec.id+'">'+esc(sec.h)+'</a>';
  });
  if(m.exercises && m.exercises.length) rh += '<a href="#ex-'+mid+'" data-toc="ex-'+mid+'">练习与自我检查</a>';
  if(m.sources && m.sources.length) rh += '<a href="#src-'+mid+'" data-toc="src-'+mid+'">引用来源</a>';
  rh += '</div>';
  if(m.terms && m.terms.length){
    rh += '<h4>核心概念</h4><div>';
    m.terms.forEach(t => { const g = GLOSSARY[t]; if(g) rh += '<span class="rail-chip" data-term="'+t+'">'+esc(g.zh)+'</span>'; });
    rh += '</div>';
  }
  if(m.prereq && m.prereq.length){
    rh += '<h4>前置模块</h4>';
    m.prereq.forEach(pid => { const pm = MODULES[pid]; if(pm) rh += '<a class="rail-link" href="#/module/'+pid+'">'+esc(pm.title)+'</a>'; });
  }
  if(m.related && m.related.length){
    rh += '<h4>相关模块</h4>';
    m.related.forEach(pid => { const pm = MODULES[pid]; if(pm) rh += '<a class="rail-link" href="#/module/'+pid+'">'+esc(pm.title)+'</a>'; });
  }
  rh += '<div class="rail-note">进度与笔记保存在本浏览器 localStorage。清除浏览器数据前请先在「笔记」面板导出备份。</div>';
  rail.innerHTML = rh;
  $$('[data-term]', rail).forEach(el => el.addEventListener('click', e => popTerm(el.dataset.term, e)));
  // scrollspy
  const heads = $$('#view h2.sec, #view h3.sub');
  if(window._spy) window._spy.disconnect();
  window._spy = new IntersectionObserver(es => {
    es.forEach(en => { if(en.isIntersecting){ $$('#railToc a').forEach(a => a.classList.toggle('on', a.dataset.toc === en.target.id)); } });
  }, { rootMargin: '-70px 0px -70% 0px' });
  heads.forEach(h => window._spy.observe(h));
}

/* ================= 渲染：工具页 ================= */
function renderTools(){
  let html = '<div class="eyebrow">第五层 · 工具</div><h1 class="pg-title">交互式分析工具</h1>'
    + '<p class="pg-sub">辅助理解的模型工具，不是自动决策引擎</p>'
    + '<div class="callout warn"><span class="ico">⚠️</span><div><b>工具定位声明</b>以下工具用于帮助理解指标之间的关系与计算过程。除另有说明，内置示例数据为教学用的示意数据或已标注来源的公开数据；输出结果不构成商业结论。任何真实决策都需要完整数据、专业判断与必要的法律 / 海关 / 税务核验。</div></div>';
  Object.keys(TOOLS).forEach(k => {
    const t = TOOLS[k];
    html += '<div class="card" style="margin:14px 0;cursor:pointer" data-nav="#/tool/'+k+'">'
      + '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><span class="badge teal">'+esc(t.tag||'工具')+'</span><h5 style="font-size:15.5px;margin:0">'+esc(t.title)+'</h5></div>'
      + '<p class="small" style="margin:7px 0 0">'+esc(t.desc||'')+'</p></div>';
  });
  return html;
}
function renderTool(k){
  const t = TOOLS[k]; if(!t) return '<h1 class="pg-title">工具不存在</h1>';
  $('#rail').innerHTML = '<h4>工具说明</h4><p class="small">'+esc(t.desc||'')+'</p><div class="rail-note">'+esc(t.note||'')+'</div>';
  return '<div class="eyebrow">交互式分析工具</div><h1 class="pg-title">'+esc(t.title)+'</h1>'
    + '<p class="pg-sub">'+esc(t.desc||'')+'</p>'
    + '<div class="tool"><div class="tool-head"><span class="ttl">🧮 '+esc(t.title)+'</span><span class="sub">'+esc(t.sub||'')+'</span></div>'
    + '<div class="tool-body" id="toolBody-'+k+'"></div>'
    + (t.note?'<p class="tool-note">⚠️ '+esc(t.note)+'</p>':'') + '</div>'
    + '<div class="pg-foot"><a href="#/tools"><div class="dir">← 返回</div><div class="t">全部工具</div></a></div>';
}
function afterToolRender(k){ if(TOOLS[k] && TOOLS[k].mount) TOOLS[k].mount($('#toolBody-'+k)); }

/* ================= 渲染：术语词典 ================= */
function renderGlossary(){
  const keys = Object.keys(GLOSSARY).sort((a,b) => GLOSSARY[a].en.localeCompare(GLOSSARY[b].en));
  let html = '<div class="eyebrow">资源库</div><h1 class="pg-title">专业术语词典</h1>'
    + '<p class="pg-sub">共收录 '+keys.length+' 条术语。正文中的虚线标记词可随时点击查看。</p>'
    + '<div class="ctl"><input type="text" id="glossFilter" placeholder="输入中文或英文关键词过滤术语…" style="width:100%;border:1px solid var(--border-strong);border-radius:6px;padding:8px 12px;font-size:14px;font-family:var(--font);background:var(--surface);color:var(--text)"></div>'
    + '<div id="glossList">';
  keys.forEach(k => {
    const g = GLOSSARY[k];
    html += '<details class="ex" data-gloss="'+k+'"><summary>'+esc(g.zh)+' <span class="small" style="font-weight:400">'+esc(g.en)+'</span></summary>'
      + '<div class="ex-body"><p>'+g.def+'</p>'
      + (g.ex?'<div class="callout plain" style="margin:10px 0"><span class="ico">💡</span><div>'+g.ex+'</div></div>':'')
      + '<p class="small">所属模块：'+(g.module?('<a href="#/module/'+g.module+'">'+esc((MODULES[g.module]||{}).title||g.module)+'</a>'):'—')
      + (g.related?' ｜ 相关概念：'+g.related.map(r => '<a href="#/glossary" data-term="'+r+'">'+esc((GLOSSARY[r]||{}).zh||r)+'</a>').join('、'):'')+'</p></div></details>';
  });
  html += '</div>';
  return html;
}
function afterGlossaryRender(){
  const f = $('#glossFilter');
  f.addEventListener('input', () => {
    const q = f.value.trim().toLowerCase();
    $$('#glossList details').forEach(d => {
      const g = GLOSSARY[d.dataset.gloss];
      const hit = !q || (g.zh+g.en+g.def).toLowerCase().includes(q);
      d.style.display = hit ? '' : 'none';
    });
  });
}

/* ================= 渲染：来源数据库 ================= */
function renderSources(){
  const grades = ['A','B','C','D'];
  let html = '<div class="eyebrow">资源库</div><h1 class="pg-title">来源数据库与证据等级</h1>'
    + '<p class="pg-sub">共 '+SOURCES.length+' 条来源。等级针对具体结论，而非机构或作者的永久标签。</p>'
    + '<div class="callout info"><span class="ico">ℹ️</span><div><b>证据等级说明</b>'
    + '<b>A 强证据</b>：正式法规或原始政策文件、可核验官方统计、方法透明且高度相关的研究，或多种独立证据支持的结论。'
    + '<b>B 较强证据</b>：权威机构研究报告、方法明确的研究、资料充分的专业分析。'
    + '<b>C 有限证据</b>：可信专家观点、经验总结、个案研究或适用范围较窄的材料。'
    + '<b>D 待验证</b>：缺少独立证据的推断、争议性判断或尚未证实的假设。所有链接访问日期为 2026 年 10 月 21 日。</div></div>'
    + '<div class="ctl-row" style="margin:14px 0">'
    + '<div class="ctl"><label>证据等级</label><select id="srcGrade"><option value="">全部</option>'+grades.map(g=>'<option>'+g+'</option>').join('')+'</select></div>'
    + '<div class="ctl"><label>资料类型</label><select id="srcType"><option value="">全部</option></select></div>'
    + '<div class="ctl"><label>关键词</label><input type="text" id="srcKw" placeholder="标题 / 机构 / 结论"></div>'
    + '</div><div class="tbl-wrap"><table class="data" id="srcTable"><thead><tr><th>#</th><th>来源</th><th>机构 / 作者</th><th>年份</th><th>类型</th><th>等级</th><th>支持的主要结论</th></tr></thead><tbody></tbody></table></div>';
  return html;
}
function afterSourcesRender(){
  const types = [...new Set(SOURCES.map(s => s.type))];
  $('#srcType').innerHTML = '<option value="">全部</option>' + types.map(t => '<option>'+esc(t)+'</option>').join('');
  function paint(){
    const g = $('#srcGrade').value, t = $('#srcType').value, q = $('#srcKw').value.trim().toLowerCase();
    const rows = SOURCES.filter(s => (!g || s.grade===g) && (!t || s.type===t) && (!q || (s.title+s.org+s.supports+s.notes).toLowerCase().includes(q)));
    $('#srcTable tbody').innerHTML = rows.map(s =>
      '<tr><td class="num">'+esc(s.no||'')+'</td><td><a href="'+esc(s.url)+'" target="_blank" rel="noopener">'+esc(s.title)+'</a></td>'
      + '<td>'+esc(s.org)+'</td><td class="num">'+esc(s.year)+'</td><td>'+esc(s.type)+'</td>'
      + '<td>'+gradeBadge(s.grade)+'</td><td class="small">'+esc(s.supports||'')+'</td></tr>').join('')
      || '<tr><td colspan="7" class="center small">无匹配来源</td></tr>';
  }
  ['#srcGrade','#srcType'].forEach(s => $(s).addEventListener('change', paint));
  $('#srcKw').addEventListener('input', paint);
  paint();
}

/* ================= 渲染：数据库导航 ================= */
function renderDatabases(){
  let html = '<div class="eyebrow">资源库</div><h1 class="pg-title">官方数据库导航</h1>'
    + '<p class="pg-sub">按第一优先级来源整理的常用官方数据库与查询工具。访问方式与限制可能变化，使用前请以各官网当前说明为准。</p>'
    + '<div class="tbl-wrap"><table class="data"><thead><tr><th>数据库 / 工具</th><th>运营机构</th><th>主要内容</th><th>访问方式与限制</th><th>入口</th></tr></thead><tbody>';
  DATABASES.forEach(d => {
    html += '<tr><td><b>'+esc(d.name)+'</b></td><td>'+esc(d.org)+'</td><td>'+esc(d.content)+'</td><td class="small">'+esc(d.access)+'</td><td><a href="'+esc(d.url)+'" target="_blank" rel="noopener">打开 ↗</a></td></tr>';
  });
  html += '</tbody></table></div>'
    + '<div class="callout warn"><span class="ico">⚠️</span><div>第三方数据服务商（各类海关数据、行业报告库）质量参差：使用前必须核验其数据是否可追溯至官方统计、更新频率、样本覆盖与利益关系。不能把商业数据包装的图表当作官方统计。</div></div>';
  return html;
}

/* ================= 渲染：模板页 ================= */
const TEMPLATES = [
  { id:'tpl-market-score', name:'市场评价评分卡模板', desc:'用于多国市场初筛与比较。指标、权重与评分标准需按企业实际情况调整，评分只是决策输入之一。', body:
'# 市场评价评分卡（模板）\n评估日期：____  评估人：____  产品 / 业务：____\n\n| 指标 | 数据来源 | 权重 | 国家A | 国家B | 国家C |\n|---|---|---|---|---|---|\n| 市场规模（可服务市场） | | | | | |\n| 市场增长速度 | | | | | |\n| 竞争强度（分越高越有利） | | | | | |\n| 利润空间 | | | | | |\n| 进入成本（分越高越有利） | | | | | |\n| 政策与合规友好度 | | | | | |\n| 国家风险（分越高越有利） | | | | | |\n| 加权总分 | — | 100% | | | |\n\n权重设定方法：由决策团队独立打分后取中位数，或按战略重点直接设定；\n必须做权重敏感性分析：把每个指标权重 ±10 个百分点，观察排名是否翻转。\n使用限制：评分卡不能替代实地验证；高分市场可能因关键隐藏成本被排除。'},
  { id:'tpl-risk', name:'风险登记表模板', desc:'国家风险与项目风险的基础管理工具，配套风险矩阵与监测指标使用。', body:
'# 风险登记表（模板）\n\n| 编号 | 风险描述 | 类别 | 概率(1-5) | 影响(1-5) | 分值 | 传导路径 | 监测指标 / 先行信号 | 应对措施 | 责任人 | 复核日期 |\n|---|---|---|---|---|---|---|---|---|---|---|\n| R01 | | | | | | | | | | |\n\n填写要点：\n1. 传导路径必须写到企业经营结果：收入 / 成本 / 现金流 / 供应链 / 合规资质。\n2. 每个高风险项至少有一个可观测的先行指标与明确的触发动作。\n3. 概率与影响是主观判断，应记录判断依据，并定期复盘校准。'},
  { id:'tpl-report', name:'国际市场研究报告结构模板', desc:'面向管理层决策使用的报告结构。结论先行，证据分层，不确定性显式呈现。', body:
'# 国际市场研究报告（模板）\n\n1. 执行摘要（一页：结论、建议、关键风险、待验证事项）\n2. 研究问题与决策背景（要回答什么问题、决策者是谁、时间约束）\n3. 产品定义与统计口径（HS 编码、产品范围、数据年份与来源）\n4. 候选市场与筛选过程（候选池 → 指标 → 评分 → 入选理由）\n5. 市场分析（规模、增长、竞争格局、渠道、消费者）\n6. 准入环境（关税、非关税壁垒、认证、合规要求，逐项注明来源与生效日期）\n7. 进入模式比较与建议（控制权 / 成本 / 风险 / 速度四维权衡）\n8. 财务测算（价格、成本、税费、物流、汇率假设与敏感性）\n9. 风险分析与应对（风险登记表摘要 + 情景分析）\n10. 结论分级：已证实结论 / 需进一步验证 / 依赖假设的推演 / 未知信息\n11. 附录：数据表、计算过程、来源清单、访谈记录'},
  { id:'tpl-duediligence', name:'海外合作伙伴尽职调查清单', desc:'适用于代理商、经销商、进口商与供应商的初步筛选。', body:
'# 海外合作伙伴尽职调查清单（模板）\n\nA. 主体真实性：注册文件、税号、办公地址实地或视频验证、官网域名注册时间\nB. 经营能力：成立年限、团队规模、代理品牌、客户名单（抽样回访）、仓储与售后能力\nC. 财务状况：银行流水 / 审计报告（如可获得）、付款记录、涉诉与破产记录\nD. 合规风险：制裁与受限方筛查、商业贿赂记录、数据保护合规\nE. 合作条款：授权区域与期限、最低采购量、价格与折扣体系、业绩考核与退出机制\nF. 交叉验证：至少两个独立信息源确认关键事实（如官方注册库 + 行业访谈）\n\n注意：清单是初筛工具，重大合作决策应咨询当地律师与专业机构。'},
  { id:'tpl-sensitivity', name:'敏感性分析与情景假设表', desc:'用于检验关键假设对结论的影响，避免单点估计误导决策。', body:
'# 敏感性分析表（模板）\n\n基准情景：假设组合 ____ → 结果 ____\n\n| 变量 | 悲观 | 基准 | 乐观 | 结果对变量的敏感度 |\n|---|---|---|---|---|\n| 产品售价 | | | | |\n| 汇率 | | | | |\n| 关税率 / 优惠资格 | | | | |\n| 物流成本 | | | | |\n| 销量 / 渗透率 | | | | |\n\n三情景叙事：为每个情景写一段完整故事（触发条件 → 传导 → 结果 → 应对动作），\n而不是只改数字。重点关注：结论在哪个变量区间内保持稳健。'}
];
function renderTemplates(){
  let html = '<div class="eyebrow">资源库</div><h1 class="pg-title">研究模板与交付物</h1>'
    + '<p class="pg-sub">可直接复用的研究模板。复制后按需修改；模板本身不构成法律或商务意见。</p>';
  TEMPLATES.forEach(t => {
    html += '<div class="tool"><div class="tool-head"><span class="ttl">📋 '+esc(t.name)+'</span></div>'
      + '<div class="tool-body"><p class="small" style="margin-top:0">'+esc(t.desc)+'</p>'
      + '<textarea class="note-input" id="'+t.id+'" style="min-height:280px;font-family:var(--mono);font-size:12.5px">'+esc(t.body)+'</textarea>'
      + '<button class="btn primary" style="margin-top:9px" data-copy="'+t.id+'">复制模板内容</button></div></div>';
  });
  return html;
}
function afterTemplatesRender(){
  $$('[data-copy]').forEach(b => b.addEventListener('click', () => {
    const ta = document.getElementById(b.dataset.copy);
    ta.select();
    const ok = (navigator.clipboard && navigator.clipboard.writeText) ? navigator.clipboard.writeText(ta.value) : Promise.reject();
    ok.then(() => { b.textContent = '✓ 已复制'; setTimeout(()=>b.textContent='复制模板内容', 1600); })
      .catch(() => { document.execCommand('copy'); b.textContent = '✓ 已复制'; setTimeout(()=>b.textContent='复制模板内容', 1600); });
  }));
}

/* ================= 渲染：延伸阅读 ================= */
function renderReading(){
  let html = '<div class="eyebrow">资源库</div><h1 class="pg-title">延伸阅读书目</h1>'
    + '<p class="pg-sub">按主题整理的经典与权威文献。优先阅读原始文献，再读二手综述。</p>';
  const groups = {};
  READINGS.forEach(r => { (groups[r.group] = groups[r.group] || []).push(r); });
  Object.keys(groups).forEach(g => {
    html += '<h2 class="sec">'+esc(g)+'</h2><ul>';
    groups[g].forEach(r => {
      html += '<li><b>'+esc(r.title)+'</b>（'+esc(r.author)+'，'+esc(r.year)+'）<span class="small"> — '+esc(r.note)+'</span></li>';
    });
    html += '</ul>';
  });
  return html;
}

/* ================= 渲染：自测题库 ================= */
function renderQuiz(){
  const all = [];
  moduleList().forEach(m => (m.exercises||[]).forEach((ex, i) => all.push({m, ex, i})));
  let html = '<div class="eyebrow">资源库</div><h1 class="pg-title">学习自测题库</h1>'
    + '<p class="pg-sub">共 '+all.length+' 题，来自各模块练习。先作答，再展开参考答案。</p>'
    + '<div class="callout info"><span class="ico">ℹ️</span><div>自测记录保存在本浏览器。「已自评掌握」与「阅读完成」是不同状态：本页答题情况仅作参考，不自动计入掌握度。</div></div>';
  all.forEach((it, n) => {
    html += '<div class="quiz"><div class="q"><span class="qn">'+(n+1)+'.</span>['+esc(it.ex.type)+' · <a href="#/module/'+it.m.id+'">'+esc(it.m.title)+'</a>] '+esc(it.ex.q)+'</div>'
      + '<button class="reveal">显示参考答案与评价标准</button><div class="ans">'+it.ex.a+'</div></div>';
  });
  return html;
}

/* ================= 术语浮层 ================= */
let popTimer = null;
function popTerm(id, evt){
  const g = GLOSSARY[id]; const pop = $('#termPop');
  if(!g){ pop.classList.remove('show'); return; }
  pop.innerHTML = '<div class="p-en">'+esc(g.en)+'</div><div class="p-zh">'+esc(g.zh)+'</div>'
    + '<div class="p-def">'+g.def+'</div>'
    + (g.ex?'<div class="p-ex">💡 '+g.ex+'</div>':'')
    + '<div class="p-meta">'+(g.module?'<span>📘 <a href="#/module/'+g.module+'">'+esc((MODULES[g.module]||{}).title||'')+'</a></span>':'')
    + (g.related||[]).map(r=>'<span>'+esc((GLOSSARY[r]||{}).zh||r)+'</span>').join('')+'</div>';
  const r = (evt && evt.target) ? evt.target.getBoundingClientRect() : { left: innerWidth/2-160, bottom: 120, top: 100 };
  pop.style.display = 'block';
  const pw = 320, ph = pop.offsetHeight;
  let x = Math.min(r.left + window.scrollX - 20, innerWidth - pw - 16); x = Math.max(10, x);
  let y = r.bottom + window.scrollY + 8;
  if(y + ph > innerHeight + window.scrollY - 10) y = r.top + window.scrollY - ph - 8;
  pop.style.left = x+'px'; pop.style.top = y+'px';
  pop.classList.add('show');
  clearTimeout(popTimer);
  popTimer = setTimeout(() => pop.classList.remove('show'), 12000);
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-term]');
  if(t){ e.preventDefault(); popTerm(t.dataset.term, e); return; }
  if(!e.target.closest('#termPop')) $('#termPop').classList.remove('show');
  const s = e.target.closest('[data-src]');
  if(s){ e.preventDefault(); openSource(s.dataset.src); }
});

/* ================= 来源弹层 ================= */
function openSource(id){
  const s = SOURCES.find(x => x.id === id); if(!s) return;
  $('#srcModalTitle').textContent = '来源 ' + (s.no||'') + ' · ' + s.title;
  $('#srcModalBody').innerHTML =
    '<div class="meta-table" style="margin-top:0">'
    + '<div class="cell"><div class="k">发布机构 / 作者</div><div class="v">'+esc(s.org)+'</div></div>'
    + '<div class="cell"><div class="k">年份 / 更新</div><div class="v">'+esc(s.year)+'</div></div>'
    + '<div class="cell"><div class="k">资料类型</div><div class="v">'+esc(s.type)+'</div></div>'
    + '<div class="cell"><div class="k">证据等级</div><div class="v">'+gradeBadge(s.grade)+'</div></div></div>'
    + '<p><b>支持的主要结论：</b>'+esc(s.supports||'—')+'</p>'
    + (s.notes?'<p><b>范围与限制：</b>'+esc(s.notes)+'</p>':'')
    + '<p><b>链接：</b><a href="'+esc(s.url)+'" target="_blank" rel="noopener">'+esc(s.url)+'</a></p>'
    + '<p class="small">访问日期：2026-10-21。若链接失效，请通过发布机构官网检索同名文件；失效来源不应被当作仍可引用的证据。</p>';
  $('#srcModal').classList.add('show');
}
$$('.m-close').forEach(b => b.addEventListener('click', () => b.closest('.modal-mask').classList.remove('show')));
$$('.modal-mask').forEach(mk => mk.addEventListener('click', e => { if(e.target === mk) mk.classList.remove('show'); }));

/* ================= 搜索弹层 ================= */
function openSearch(){ $('#searchModal').classList.add('show'); $('#searchInput').focus(); $('#searchInput').select(); }
function closeSearch(){ $('#searchModal').classList.remove('show'); }
$('#searchBtn').addEventListener('click', openSearch);
$('#searchGo').addEventListener('click', () => doSearch($('#searchInput').value));
$('#searchInput').addEventListener('input', () => doSearch($('#searchInput').value));
$('#searchInput').addEventListener('keydown', e => { if(e.key === 'Enter') doSearch($('#searchInput').value); });

/* ================= 笔记抽屉 ================= */
let notesCtxId = null;
function openNotes(){
  notesCtxId = (location.hash.match(/^#\/module\/(m\d+)/)||[])[1] || null;
  $('#notesCtx').textContent = notesCtxId ? '当前：'+((MODULES[notesCtxId]||{}).title||'') : '全局（未在模块页打开时保存为全局笔记）';
  paintNotes();
  $('#notesDrawer').classList.add('show'); $('#drawerMask').classList.add('show');
  $('#noteInput').focus();
}
function paintNotes(){
  const list = notesCtxId ? (store.notes[notesCtxId]||[]) : Object.keys(store.notes).flatMap(k => (store.notes[k]||[]).map(n => ({...n, k})));
  $('#notesList').innerHTML = list.length ? list.map((n, i) =>
    '<div class="note-item"><div class="n-meta"><span>'+fmtTime(n.t)+(n.k?' · '+esc((MODULES[n.k]||{}).title||n.k):'')+'</span>'
    + '<button class="n-del" data-del="'+i+'" data-k="'+(n.k||notesCtxId)+'">删除</button></div>'
    + '<div class="n-text">'+esc(n.text)+'</div></div>').join('')
    : '<p class="small">暂无笔记。笔记按模块保存在本浏览器 localStorage 中。</p>';
  $$('[data-del]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.k, i = +b.dataset.del;
    if(store.notes[k]){ store.notes[k].splice(i,1); if(!store.notes[k].length) delete store.notes[k]; persist(); paintNotes(); }
  }));
}
$('#notesBtn').addEventListener('click', openNotes);
$('#notesClose').addEventListener('click', closeNotes);
$('#drawerMask').addEventListener('click', closeNotes);
function closeNotes(){ $('#notesDrawer').classList.remove('show'); $('#drawerMask').classList.remove('show'); }
$('#noteSave').addEventListener('click', () => {
  const v = $('#noteInput').value.trim(); if(!v) return;
  const k = notesCtxId || 'global';
  (store.notes[k] = store.notes[k] || []).push({ t: Date.now(), text: v });
  persist(); $('#noteInput').value = ''; paintNotes();
});
$('#noteExport').addEventListener('click', () => {
  const data = { exportedAt: new Date().toISOString(), progress: store.progress, notes: store.notes };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'gbmr-backup-'+new Date().toISOString().slice(0,10)+'.json'; a.click();
});
$('#noteImport').addEventListener('click', () => $('#noteImportFile').click());
$('#noteImportFile').addEventListener('change', e => {
  const f = e.target.files[0]; if(!f) return;
  const rd = new FileReader();
  rd.onload = () => { try{
      const d = JSON.parse(rd.result);
      if(d.progress) store.progress = Object.assign(store.progress, d.progress);
      if(d.notes) store.notes = Object.assign(store.notes, d.notes);
      persist(); buildSidebar(); paintNotes(); updateProgressUI();
      alert('备份已导入。');
    }catch(err){ alert('导入失败：文件不是有效的备份 JSON。'); } };
  rd.readAsText(f);
});

/* ================= 主题 ================= */
function applyTheme(){ document.documentElement.setAttribute('data-theme', store.theme); }
$('#themeBtn').addEventListener('click', () => { store.theme = store.theme === 'light' ? 'dark' : 'light'; persistTheme(); applyTheme(); });

/* ================= 进度 ================= */
function updateProgressUI(){
  const all = moduleList(); const done = all.filter(m => store.progress[m.id]).length;
  $('#progressLabel').textContent = done + ' / ' + all.length;
  $('#progressFill').style.width = (all.length ? done/all.length*100 : 0) + '%';
}

/* ================= 路由 ================= */
function route(){
  const h = location.hash || '#/map';
  const [path, anchor] = h.split('~');
  const parts = path.replace(/^#\//,'').split('/');
  const view = $('#view'); const rail = $('#rail');
  rail.innerHTML = '';
  window.scrollTo({ top: 0 });
  let after = null;
  if(parts[0] === 'map' || !parts[0]){ view.innerHTML = renderMap(); after = null; }
  else if(parts[0] === 'stage'){ view.innerHTML = renderStage(parts[1]); }
  else if(parts[0] === 'module'){ view.innerHTML = renderModule(parts[1]); after = () => afterModuleRender(parts[1]); }
  else if(parts[0] === 'tools'){ view.innerHTML = renderTools(); }
  else if(parts[0] === 'tool'){ view.innerHTML = renderTool(parts[1]); after = () => afterToolRender(parts[1]); }
  else if(parts[0] === 'glossary'){ view.innerHTML = renderGlossary(); after = afterGlossaryRender; }
  else if(parts[0] === 'sources'){ view.innerHTML = renderSources(); after = afterSourcesRender; }
  else if(parts[0] === 'databases'){ view.innerHTML = renderDatabases(); }
  else if(parts[0] === 'templates'){ view.innerHTML = renderTemplates(); after = afterTemplatesRender; }
  else if(parts[0] === 'reading'){ view.innerHTML = renderReading(); }
  else if(parts[0] === 'quiz'){ view.innerHTML = renderQuiz(); }
  else { view.innerHTML = renderMap(); }
  // 卡片跳转
  $$('[data-nav]', view).forEach(el => el.addEventListener('click', () => { location.hash = el.dataset.nav; }));
  // 术语与来源
  $$('[data-term]', view).forEach(el => el.addEventListener('click', e => { e.preventDefault(); popTerm(el.dataset.term, e); }));
  $$('[data-src]', view).forEach(el => el.addEventListener('click', e => { e.preventDefault(); openSource(el.dataset.src); }));
  // 折叠答案
  $$('.quiz .reveal', view).forEach(b => b.addEventListener('click', () => {
    const ans = b.nextElementSibling; ans.classList.toggle('show');
    b.textContent = ans.classList.contains('show') ? '隐藏参考答案' : '显示参考答案与评价标准';
  }));
  if(after) after();
  highlightTree(); updateProgressUI();
  if(anchor){ const el = document.getElementById(anchor); if(el){ setTimeout(() => el.scrollIntoView({ behavior:'smooth', block:'start' }), 60); } }
  document.title = ((MODULES[parts[1]]||{}).title ? MODULES[parts[1]].title+' · ' : '') + '全球商业与国际市场研究';
}
function rerender(){ route(); }
window.addEventListener('hashchange', route);
$('#menuBtn').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
document.addEventListener('keydown', e => {
  if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'){ e.preventDefault(); openSearch(); }
  if(e.key === 'Escape'){ closeSearch(); closeNotes(); $('#termPop').classList.remove('show'); $$('.modal-mask').forEach(m => m.classList.remove('show')); }
  if(e.altKey && e.key === 'ArrowLeft'){ const h = location.hash; if(h.startsWith('#/module/')){ const p = prevNext(h.split('/')[2]); if(p.prev) location.hash = '#/module/'+p.prev.id; } }
  if(e.altKey && e.key === 'ArrowRight'){ const h = location.hash; if(h.startsWith('#/module/')){ const p = prevNext(h.split('/')[2]); if(p.next) location.hash = '#/module/'+p.next.id; } }
});
window.addEventListener('beforeprint', () => { $$('details.ex').forEach(d => d.open = true); $$('.quiz .ans').forEach(a => a.classList.add('show')); });
</script>
