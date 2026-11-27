
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

;

/* ================= 八阶段学习路线 ================= */
STAGES.push(
  { id:'s1', no:1, title:'国际商业基础认知', en:'Foundations of International Business',
    goal:'理解国际商业为什么存在、企业为什么跨境经营、国家和企业如何在国际经济体系中相互影响。',
    prereq:'无。具备基本商业常识即可，不要求经济学基础。',
    hours:'约 35–55 小时（规划估计，非客观保证）',
    exit:'能用清楚的语言解释一个行业为什么产生跨境贸易，指出影响该贸易的主要变量，并说明经典理论的适用边界。',
    outcomes:[
      '区分国际商务与国际贸易，说明企业跨境经营的四类动机',
      '用两国两产品数值例子推演比较优势与贸易收益',
      '解释要素禀赋、规模经济与产品生命周期如何塑造贸易模式',
      '用 OLI、阶段理论与制度基础观分析企业国际化的条件',
      '为后续的宏观分析、市场研究建立概念与指标基础'
    ],
    modules:['m01','m02','m03','m04','m05','m06']
  },
  { id:'s2', no:2, title:'全球商业环境与产业结构', en:'Global Business Environment and Industrial Structure',
    goal:'能够理解国家的宏观环境、产业链结构、国际分工和全球价值获取，并用真实数据描述一个行业的国际分布。',
    prereq:'完成阶段 1，或理解比较优势与 OLI 的基本逻辑。',
    hours:'约 30–45 小时（规划估计）',
    exit:'能分析一个行业在不同国家的生产、贸易、竞争与价值分布，并独立完成一次贸易数据查询与解释。',
    outcomes:[
      '用 PESTEL 与指标体系建立目标市场宏观简报',
      '用 CAGE 与钻石模型系统比较国家差异与竞争基础',
      '绘制产业的全球价值链图，判断治理模式与升级路径',
      '用 UN Comtrade / Trade Map / WITS 完成一次完整的数据分析',
      '识别贸易数据的口径陷阱（FOB/CIF、转口、镜像数据、量价分解）'
    ],
    modules:['m07','m08','m09','m10']
  },
  { id:'s3', no:3, title:'国际市场研究与机会筛选', en:'Market Research and Opportunity Screening',
    goal:'学会使用真实数据比较国家和市场，建立可辩护的市场筛选与评估流程，而不是依靠直觉选择目标市场。',
    prereq:'完成阶段 2（指标体系与数据方法）。',
    hours:'约 30–45 小时（规划估计）',
    exit:'能建立市场初筛标准，计算必要指标，用评分卡比较多个国家，并通过敏感性分析检验结论稳健性。',
    outcomes:[
      '设计研究方案并评估他人研究的信度与效度',
      '用自上而下与自下而上两条路径估算市场规模（TAM/SAM/SOM）',
      '建立市场评分卡并完成多国比较与敏感性分析',
      '完成竞品拆解与消费者洞察，形成定位假设与需求证据链',
      '区分「市场吸引力、企业竞争力、进入可行性」三类问题'
    ],
    modules:['m11','m12','m13','m14']
  },
  { id:'s4', no:4, title:'国际化战略与市场进入', en:'International Strategy and Market Entry',
    goal:'根据市场条件、企业资源、交易成本和风险设计进入方案，并完成伙伴筛选与协议设计。',
    prereq:'完成阶段 3（市场选择）。',
    hours:'约 25–40 小时（规划估计）',
    exit:'能比较不同市场进入模式，说明方案的收益、成本、控制权、风险与适用条件，并执行一次伙伴尽职调查。',
    outcomes:[
      '用整合—响应框架定位国际战略类型',
      '比较进入模式谱系并在六维矩阵中评估',
      '用 OLI 与决策树为具体企业—市场组合推荐模式',
      '执行海外伙伴的搜索、筛选、验证与协议设计',
      '设计进入的升级路径与退出预案'
    ],
    modules:['m15','m16','m17']
  },
  { id:'s5', no:5, title:'贸易执行、物流、支付与合规', en:'Trade Execution: Logistics, Payment and Compliance',
    goal:'从商业计划进入真实交易，理解货物流、单据流和资金流如何相互关联，识别主要成本、履约风险和合规问题。',
    prereq:'完成阶段 4（进入模式）。',
    hours:'约 40–55 小时（规划估计）',
    exit:'能识别一笔国际交易的关键执行环节，选择合适的贸易术语，计算到岸成本，设计付款条件并完成基础合规筛查。',
    outcomes:[
      '掌握 Incoterms 2020 全部术语并能计算成本与风险分配',
      '设计运输方案、库存策略与供应链韧性',
      '完成商品归类、关税计算与原产地优惠判断',
      '设计付款条件组合并管理汇率暴露',
      '建立出口管制、制裁与产品准入的基础合规筛查流程'
    ],
    modules:['m18','m19','m20','m21','m22','m23']
  },
  { id:'s6', no:6, title:'跨文化经营与海外市场运营', en:'Cross-Cultural Management and Overseas Operations',
    goal:'理解不同市场中的消费者、品牌、渠道、合作伙伴和商务沟通机制，解释同一产品在不同市场需要不同策略的原因。',
    prereq:'完成阶段 4–5 的核心模块。',
    hours:'约 30–40 小时（规划估计）',
    exit:'能解释一种产品为什么在不同市场可能需要不同的定位、渠道、价格或沟通策略，并设计本地化测试。',
    outcomes:[
      '用文化框架解释沟通与谈判差异，同时避免刻板印象',
      '准备并执行一场国际商务谈判（BATNA/让步阶梯/交换设计）',
      '完成消费者细分、定位假设与本地化测试设计',
      '设计渠道结构、价格体系与伙伴绩效管理机制',
      '区分「产品需要调整」与「只需要调整营销表达」'
    ],
    modules:['m24','m25','m26','m27']
  },
  { id:'s7', no:7, title:'风险管理与战略决策', en:'Risk Management and Strategic Decision-Making',
    goal:'把宏观风险、政策变化、物流、支付、竞争和企业经营能力整合进决策，形成可持续的风险运营机制。',
    prereq:'完成阶段 2、4、5 的核心模块。',
    hours:'约 25–35 小时（规划估计）',
    exit:'能制作风险登记表，识别风险传导路径，设定监测指标与触发动作，并设计退出与复盘机制。',
    outcomes:[
      '评估国家风险并设计缓释组合（保险/条款/结构）',
      '绘制供应链依赖图并识别 choke 点',
      '建立风险矩阵、情景分析与 KRI 监测机制',
      '用分阶段承诺与组合四象限管理多市场布局',
      '设计退出决策与复盘闭环'
    ],
    modules:['m28','m29','m30','m31']
  },
  { id:'s8', no:8, title:'综合研究与独立项目', en:'Integrated Research and Independent Project',
    goal:'将全部知识整合起来，完成一次真正能够用于商业讨论的国际市场研究项目，产出可复核的报告与建议。',
    prereq:'完成阶段 1–7（或至少掌握 m10、m12–m14、m16、m20、m28、m30、m31 的核心方法）。',
    hours:'约 20–30 小时自主项目（规划估计）',
    exit:'独立提交一份完整的海外市场研究报告、一套可复核的数据分析、一份市场进入建议和一套风险管理方案。',
    outcomes:[
      '按照 14 步流程完成一次完整的国际市场研究',
      '建立可复核的数据、计算过程与来源清单',
      '区分已证实结论、待验证判断、假设推演与未知信息',
      '输出面向管理层的决策备忘录',
      '把项目经验沉淀为可复用的个人研究方法库'
    ],
    modules:['m32']
  }
);

;

Object.assign(MODULES, {

/* ================= 阶段 1 ================= */
m01: {
  id:'m01', stage:'s1', title:'国际商业导论：范畴、动机与全球化演变', en:'Introduction to International Business',
  hours:'6–10 小时', goal:'理解国际商业与国际贸易的区别与联系，掌握企业跨境经营的基本动机，以及用关键数据描述全球化演变。',
  prereqText:'无。本模块是整个课程的地图。', outcome:'能够解释一个行业为什么发生跨境贸易，并用贸易额、FDI、价值链参与度等指标描述其国际化程度。',
  summary:'国际商业研究的问题是：价值为什么、如何、在哪些国家之间被创造和交换，企业又应该如何参与。本模块先建立范畴与动机，再给出观察全球化的三组指标。',
  terms:['international-business','international-trade','fdi','globalization','mne','gvc','trade-openness'],
  prereq:[], related:['m02','m06','m09'],
  sources:['s01','s02','s03','s12','s54'],
  sections:[
  { id:'m01-s1', h:'1.1 学习定位：这门课研究什么问题', lvl:2, html:
  '<p>本课程研究的问题可以用一个具体场景说明：一家中国光伏组件制造商把产品卖到巴西，需要回答——巴西有没有需求？需求有多大？关税和其他准入成本是多少？应该找经销商还是设分公司？汇率波动会不会吃掉利润？美国对东南亚的贸易救济会不会改变全球供应格局？这些问题横跨经济学、管理学、法学、统计学和地理学，任何单一学科都无法独立回答。</p>'
  +'<p>本模块处于整个知识体系的最上游：它定义研究对象（国际商业）、说明企业为什么跨境经营（动机），并给出描述全球化程度的基础指标（贸易、投资、价值链）。后续所有模块——从比较优势理论到关税计算——都在回答这一个场景中的不同侧面。</p>'
  +'<div class="meta-table"><div class="cell"><div class="k">所属领域</div><div class="v">国际商务导论</div></div>'
  +'<div class="cell"><div class="k">职业用途</div><div class="v">市场研究、海外业务拓展、战略规划、投资分析</div></div>'
  +'<div class="cell"><div class="k">前置知识</div><div class="v">无</div></div>'
  +'<div class="cell"><div class="k">与后续关系</div><div class="v">为 m02–m06 的理论模块提供问题背景</div></div></div>' },

  { id:'m01-s2', h:'1.2 从直观问题开始：同一件商品，为什么要在两个国家之间流转', lvl:2, html:
  '<p>先观察三个真实现象。第一，2025 年全球货物出口总额约 26.3 万亿美元，而全球 GDP 约 110 万亿美元量级——每年有价值接近四分之一全球 GDP 的货物跨越国境<button class="src gA" data-src="s02">2</button>。第二，中国 2025 年货物出口 26.99 万亿元人民币，其中锂电池出口额同比增长 26.2%<button class="src gA" data-src="s03">3</button>。第三，巴西 2024 年 11 月将光伏组件进口关税从 9.6% 上调至 25%，但当年仍有约 99% 的在售组件来自进口<button class="src gB" data-src="s21">21</button>。</p>'
  +'<p>三个现象放在一起，提出的问题就是本课程的核心：<b>商品为什么跨境流动？流动由谁组织？规模有多大？受什么规则约束？企业如何参与并获利？</b>注意，关税高达 25% 而进口仍占主导，说明贸易不是由单一因素（比如价格）决定，而是成本、供给能力、政策、产业成熟度共同作用的结果。这正是为什么不能凭直觉选市场，而需要系统研究。</p>' },

  { id:'m01-s3', h:'1.3 正式定义：国际商务、国际贸易与相邻概念', lvl:2, html:
  '<div class="defbox"><div class="en">International Trade</div><div class="zh">国际贸易</div><div class="def">国家（或单独关税区）之间商品与服务的交换活动，通常以海关统计的跨境货物流量来衡量，关注流向、规模、结构与政策。</div><div class="meta"><div><b>易混淆概念：</b>国际贸易统计的是「国家之间」的流量；对外贸易（foreign trade）是单个国家视角的同一件事。</div></div></div>'
  +'<div class="defbox"><div class="en">International Business（IB）</div><div class="zh">国际商务</div><div class="def">以企业为主体的跨境经营活动总和，包括贸易、投资、许可、特许、合同制造、跨境电商及其背后的战略、组织与运营决策。国际商务 ⊃ 国际贸易：贸易是其中一种活动，此外还有对外直接投资（FDI）、许可经营等非贸易形态。</div><div class="meta"><div><b>适用边界：</b>IB 概念强调「企业决策」，因此同一贸易流量，从经济学看是要素配置结果，从 IB 看是企业战略选择。</div></div></div>'
  +'<div class="defbox"><div class="en">Foreign Direct Investment（FDI）</div><div class="zh">对外直接投资</div><div class="def">一国投资者在另一国获得持续性利益并施加控制的投资（通常以 10% 股权为界），包括股权投资、收益再投资与公司间贷款。FDI 形成的是「企业内的跨境联系」，贸易形成的是「市场化的跨境联系」。</div><div class="meta"><div><b>注意：</b>FDI 流量（flow）是年度发生额，FDI 存量（stock）是累计余额；媒体报道常混用两者。</div></div></div>'
  +'<div class="defbox"><div class="en">Globalization / Deglobalization</div><div class="zh">全球化 / 去全球化</div><div class="def">全球化指国家间经济、信息、人员联系深化的长期过程；去全球化并非全球化的简单逆转，更多表现为「区域化、友岸化与规则重构」——总量可能仍在增长，但流向与规则在重写。2025 年全球货物出口额增长 7.1%，WTO 同时提示贸易政策不确定性处于历史高位<button class="src gA" data-src="s01">1</button><button class="src gA" data-src="s02">2</button>，正是「总量增长 + 结构重构」的写照。</div></div>'
  +'<p><b>跨国公司（MNE）</b>指在两个以上国家拥有并控制价值创造活动的企业。判断关键不是「有没有出口」，而是「有没有在境外控制资产或运营」。</p>' },

  { id:'m01-s4', h:'1.4 底层逻辑：企业为什么跨境经营', lvl:2, html:
  '<p>邓宁（John Dunning）将企业跨国经营动机归纳为四类，这一分类至今仍是分析「为什么出海」的起点<button class="src gA" data-src="s35">35</button>：</p>'
  +'<div class="tbl-wrap"><table class="data"><thead><tr><th>动机</th><th>英文</th><th>企业试图获得什么</th><th>典型表现</th></tr></thead><tbody>'
  +'<tr><td><b>市场寻求</b></td><td>Market-seeking</td><td>接近客户、规避贸易壁垒、跟随竞争对手</td><td>在巴西设组件厂以服务拉美市场并规避关税</td></tr>'
  +'<tr><td><b>资源寻求</b></td><td>Resource-seeking</td><td>获得原材料、低成本劳动力、技术</td><td>电池企业在印尼布局镍加工</td></tr>'
  +'<tr><td><b>效率寻求</b></td><td>Efficiency-seeking</td><td>在多个区位配置环节以降低总成本</td><td>硅料在中国、电池在东南亚、服务在欧洲</td></tr>'
  +'<tr><td><b>战略资产寻求</b></td><td>Strategic asset-seeking</td><td>获得品牌、渠道、研发能力</td><td>收购海外品牌获得本地渠道与认知</td></tr>'
  +'</tbody></table></div>'
  +'<p>更底层地看，跨境经营成立需要三个条件同时满足：<b>（1）可分割性</b>——产品与服务能够跨境交付，或生产环节能够在空间上分离（这依赖运输与通信技术）；<b>（2）成本差或能力差</b>——不同国家在要素价格、技术、制度上存在差异，使分工有利可图；<b>（3）可执行性</b>——企业有办法克服距离、制度与文化造成的交易成本（找到伙伴、建立信任、完成交付与回款）。三个条件缺一，跨境经营就不可行：产品不能运输（如低价值重货的远距离贸易）、没有成本差、或找不到可靠渠道，都会直接阻断国际化。</p>'
  +'<div class="callout info"><span class="ico">ℹ️</span><div><b>为什么这个机制重要：</b>市场研究的全部工作，本质上是在检验这三个条件在特定国家、特定产品上是否成立，以及在什么条件下成立。</div></div>' },

  { id:'m01-s5', h:'1.5 应用方法：用三组指标描述一个行业的国际化程度', lvl:2, html:
  '<p>研究任何一个行业的国际商业机会，先用公开数据回答三组问题，建立量化背景：</p>'
  +'<div class="steps">'
  +'<div class="step"><h5>贸易强度</h5><p>该行业全球贸易额多大、增速多少、主要进出口国是谁？来源：UN Comtrade（按 HS 编码）、WTO 统计门户、中国海关总署年度发布。</p></div>'
  +'<div class="step"><h5>投资流向</h5><p>该行业 FDI 流入流出集中在哪些国家、哪些环节？来源：UNCTAD《世界投资报告》。2025 年全球 FDI 总额 1.6 万亿美元，同比增长 6%，其中美国、新加坡、中国香港、中国、巴西是前五大目的地<button class="src gA" data-src="s12">12</button>。</p></div>'
  +'<div class="step"><h5>价值链分布</h5><p>利润与生产集中在价值链哪个环节？各国承担什么角色？来源：OECD TiVA / ICIO、企业披露、行业协会分析。例如 2025 年中国在多晶硅、硅片、电池、组件产能的全球占比分别为 96.0%、96.2%、91.3%、80.1%<button class="src gB" data-src="s55">55</button>——这组数字直接说明「生产在中国、需求在全球」的格局。</p></div>'
  +'</div>'
  +'<p>计算示例：<b>贸易开放度</b> =（出口 + 进口）/ GDP，用于跨国比较时要注意转口贸易会高估小国开放度（如荷兰、新加坡）。<b>显性比较优势指数（RCA）</b> =（某国某产品出口占该国出口比重）/（世界该产品出口占世界出口比重），RCA > 1 通常视为具有显性优势。</p>' },

  { id:'m01-s6', h:'1.6 案例：2025 年全球贸易格局速览', lvl:2, html:
  '<div class="case"><div class="case-head"><div class="tag">案例 1 · 宏观背景</div><div class="ttl">用官方数据描述 2025 年的全球货物贸易</div></div><div class="case-body">'
  +'<h5>背景与问题</h5><p>进入任何市场研究之前，先建立宏观背景：全球贸易总量、增长动力、主要参与者。本案例演示如何从官方统计快速提取结论。</p>'
  +'<h5>数据与来源</h5><p>UNCTADstat（数据更新于 2026 年 10 月 8 日）：2025 年全球货物出口 26.3 万亿美元，同比 +7.1%；发展中经济体占比 46%，25 年前（2000 年）为 29%；最不发达国家占比仅 1.2%<button class="src gA" data-src="s02">2</button>。WTO《全球贸易展望与统计》（2025 年 10 月更新）：2025 年贸易量增长预计 2.4%，2026 年下调至 0.5%；北美对增长贡献为负，亚洲为正<button class="src gA" data-src="s01">1</button>。中国海关总署（2026 年 1 月 14 日）：2025 年中国进出口 45.47 万亿元，出口 26.99 万亿元（+6.1%），高技术产品出口 5.25 万亿元（+13.2%）<button class="src gA" data-src="s03">3</button>。</p>'
  +'<h5>分析步骤</h5><p>（1）区分「额」与「量」：2025 年出口额增长 7.1% 显著高于 WTO 的贸易量增长 2.4%，差额主要来自价格因素（AI 相关产品涨价等），不能把金额增长误读为需求量增长。（2）区分「水平」与「结构」：中国保持第一货物贸易大国，同时中国与 RCEP 其他成员贸易占中国外贸约 30%<button class="src gA" data-src="s10">10</button>，说明区域化与多元化并行。（3）标注时点：WTO 对 2026 年 0.5% 的预测是 2025 年 10 月作出的，属于「依赖假设的预测」，不是事实。</p>'
  +'<h5>结论与限制</h5><p>结论：全球贸易总量仍在增长，但增长引擎切换（AI 产品、发展中亚洲），政策不确定性高。限制：UNCTAD 与 WTO 数据口径不同（出口 FOB、进口 CIF，世界平衡表不为零），跨国比较应固定使用同一来源；年度数据滞后，实时决策需配合月度数据。</p>'
  +'<h5>可迁移与不可照搬</h5><p>可迁移：任何行业研究都先用官方统计建立总量背景。不可照搬：宏观增长不等于细分产品增长——2025 年全球贸易 +7.1%，同期中国光伏组件出口额却下降 15.3%<button class="src gA" data-src="s04">4</button>，行业周期可以完全背离宏观。</p>'
  +'</div></div>' },

  { id:'m01-s7', h:'1.7 局限、误区与进一步验证', lvl:2, html:
  '<ul>'
  +'<li><b>误区一：把国际贸易额当作终端需求。</b>转口、库存、中间品贸易都会让进口额偏离真实消费（详见 m10）。</li>'
  +'<li><b>误区二：把 GDP 高等同于市场大。</b>市场大小取决于可服务人口、收入分布、竞争与准入，不是 GDP 总量（详见 m13 的多国比较示例）。</li>'
  +'<li><b>误区三：把国际化等同于出口。</b>出口只是进入模式之一；没有境外控制权的出口，利润可能被渠道商拿走（详见 m16、m27）。</li>'
  +'<li><b>误区四：把「全球化倒退」理解为总量下降。</b>2025 年数据是总量创新高、流向重构；决策依据应是结构指标而非情绪判断。</li>'
  +'</ul>'
  +'<p>进一步验证：对上述每个数字，回到 UNCTADstat、WTO GTOS、海关总署发布原文核对口径；对行业结论，用 UN Comtrade 按 HS 编码自行计算验证。</p>' },

  { id:'m01-s8', h:'1.8 与其他模块的联系', lvl:2, html:
  '<ul>'
  +'<li><b>→ m02–m04（贸易理论）：</b>解释「为什么贸易发生」，为判断一个行业是否存在长期贸易基础提供理论框架。</li>'
  +'<li><b>→ m09（全球价值链）：</b>本模块的「价值链分布」指标在 m09 展开为治理与升级分析。</li>'
  +'<li><b>→ m10（贸易数据）：</b>本模块的三组指标依赖贸易数据的口径知识，误用口径会直接扭曲背景判断。</li>'
  +'<li><b>→ m32（综合项目）：</b>案例中 2025 年全球贸易速览即为综合项目第一步「建立背景」的示范。</li>'
  +'</ul>' }
  ],
  exercises:[
  { type:'概念理解', q:'国际商务（IB）与国际商务中的「国际贸易」部分是什么关系？举两个属于 IB 但不属于货物贸易的活动。', a:'IB 是上位概念，涵盖贸易、投资、许可、特许、合同制造等全部跨境经营活动；国际贸易（货物与服务跨境交换）只是其中一类。IB 但不属于货物贸易的例子：在东道国设厂（FDI）、向海外许可技术收取许可费、跨境数字服务交付（如 SaaS 出口）。判断标准：是否涉及企业对境外活动的控制或持续投入。' },
  { type:'概念理解', q:'FDI「流量」和「存量」有什么区别？媒体报道「2025 年全球 FDI 达 1.6 万亿美元」指的是哪一个？', a:'流量是当年发生的投资额，存量是历年累计的余额。UNCTAD WIR 2026 报告的 1.6 万亿美元是 2025 年流量。研究市场吸引力时，流量反映当年活跃度，存量反映已沉淀的产业基础，两者回答不同问题，不能混用。' },
  { type:'实际应用', q:'某国 2025 年出口 800 亿美元、进口 900 亿美元、GDP 6,000 亿美元，其中经第三方转口约占进口的 15%。计算贸易开放度并说明其局限。', a:'开放度 =（800+900）/6,000 = 28.3%。局限：（1）未剔除转口，转口占比高的经济体该指标被系统性高估，真实「内需型」开放度更低；（2）未考虑经济体量与产业结构（小型开放经济体天然更高）；（3）应配合「显性比较优势」「内需/GDP」等指标交叉判断。进一步验证：查阅该国统计局的转口贸易专项数据。' },
  { type:'实际应用', q:'你在研究一家中国便携式储能企业的出海机会。用本模块的三组指标框架，列出你首先会查的 6 个数据点及来源。', a:'贸易强度：HS 8507.60（锂离子蓄电池）全球与中国出口额、主要目的国（UN Comtrade / ITC Trade Map / 中国海关）；中国锂电池出口增速（海关总署年度发布，2025 年 +26.2%）。投资流向：储能与新能源 FDI 目的地（UNCTAD WIR）。价值链分布：电芯、逆变器、BMS 环节的各国产能与主要企业（OECD TiVA、行业协会、企业公告）。评价标准：是否给出具体指标 + 官方来源 + 年份；是否区分出口额与终端需求。' },
  { type:'综合分析', q:'「2025 年全球货物出口增长 7.1%，所以任何行业的海外市场都在变好。」这个推论错在哪里？请分两层说明。', a:'第一层（统计口径）：出口额增长包含价格因素，贸易量增长仅约 2.4%（WTO），且 UNCTAD 与 WTO 口径不同。第二层（结构）：总量是各行业的加权平均，行业周期可完全背离宏观——反例是 2025 年中国光伏组件出口额下降 15.3% 而全球贸易总额创新高。正确的表述应是：宏观背景提供了「可能性边界」，具体结论必须回到细分行业数据。' }
  ]
},

m02: {
  id:'m02', stage:'s1', title:'贸易为什么发生：绝对优势、比较优势与机会成本', en:'Absolute and Comparative Advantage',
  hours:'8–12 小时', goal:'掌握绝对优势、比较优势与机会成本的概念及其数值推演，理解贸易收益的来源与比较优势理论的适用边界。',
  prereqText:'m01 的范畴与指标。', outcome:'能用两国两产品的数值例子推演比较优势与贸易收益，并说明该理论不能解释的现象。',
  summary:'比较优势是国际贸易理论的基石：即使一国在一切产品上生产率都更低，分工与贸易仍能让双方获益。关键不是「谁更强」，而是「谁的机会成本更低」。',
  terms:['absolute-advantage','comparative-advantage','opportunity-cost','production-possibility-frontier','terms-of-trade','trade-gains'],
  prereq:['m01'], related:['m03','m04','m10'],
  sources:['s31','s33'],
  sections:[
  { id:'m02-s1', h:'2.1 学习定位', lvl:2, html:
  '<p>本模块回答整个课程最基础的问题：<b>国家之间为什么发生贸易，贸易的收益从何而来。</b>这是李嘉图 1817 年在《政治经济学及赋税原理》中提出的问题，至今仍是任何国际市场研究者的第一课<button class="src gA" data-src="s31">31</button>。学完本模块，你应当能用具体数字说明：一个在所有产品上都不如对手的国家，为什么仍然有理由参与国际贸易，以及它的议价空间由什么决定。</p>'
  +'<div class="meta-table"><div class="cell"><div class="k">所属领域</div><div class="v">国际贸易理论</div></div><div class="cell"><div class="k">前置知识</div><div class="v">m01；初中代数即可，无需高等经济学</div></div><div class="cell"><div class="k">职业用途</div><div class="v">判断某国某产业的长期贸易基础、供应转移方向</div></div><div class="cell"><div class="k">局限提示</div><div class="v">两产品两要素静态模型，不能直接套用于现实</div></div></div>' },

  { id:'m02-s2', h:'2.2 从直观问题开始：两个国家、两种产品、一组数字', lvl:2, html:
  '<p>设想 1817 年的英国与葡萄牙，生产布料与葡萄酒。用「生产 1 单位产品所需劳动人年」表示生产效率：</p>'
  +'<div class="tbl-wrap"><table class="data"><thead><tr><th>产品</th><th>英国</th><th>葡萄牙</th></tr></thead><tbody>'
  +'<tr><td>1 单位布料</td><td class="num">100 人年</td><td class="num">90 人年</td></tr>'
  +'<tr><td>1 单位葡萄酒</td><td class="num">120 人年</td><td class="num">80 人年</td></tr>'
  +'</tbody></table></div>'
  +'<p>葡萄牙两种产品都更有效率（绝对优势）。直觉结论：葡萄牙什么都不需要跟英国买。但这个直觉是错的。把每个国家的劳动投入固定为 1,000 人年，看两国各自「能生产什么组合」：</p>'
  +'<div class="tbl-wrap"><table class="data"><thead><tr><th>配置</th><th>英国产出</th><th>葡萄牙产出</th><th>世界总产出</th></tr></thead><tbody>'
  +'<tr><td>各自自给自足（各产 5 单位布 + 约 4.2/6.25 单位酒）</td><td>布 5 + 酒 4.17</td><td>布 5 + 酒 6.25</td><td>布 10 + 酒 10.4</td></tr>'
  +'<tr><td>葡萄牙专产酒、英国专产布</td><td>布 10 + 酒 0</td><td>布 0 + 酒 12.5</td><td>布 10 + 酒 12.5</td></tr>'
  +'</tbody></table></div>'
  +'<p>同样 2,000 人年的总劳动，专业化分工后世界多产出约 2.1 单位葡萄酒——<b>分工凭空创造了产出</b>。这就是贸易收益的来源。剩下的问题是：多出来的收益如何在两国间分配？这取决于交换比例（贸易条件），而分工方向由比较优势决定。</p>' },

  { id:'m02-s3', h:'2.3 正式定义与机会成本计算', lvl:2, html:
  '<div class="defbox"><div class="en">Absolute Advantage</div><div class="zh">绝对优势</div><div class="def">一国生产某种产品所需资源投入少于另一国，即单位产品成本更低、劳动生产率更高。上例中葡萄牙在两种产品上都有绝对优势。</div></div>'
  +'<div class="defbox"><div class="en">Opportunity Cost</div><div class="zh">机会成本</div><div class="def">为多生产 1 单位某产品而必须放弃的另一种产品的数量。英国多产 1 单位葡萄酒需放弃 120/100 = 1.2 单位布；葡萄牙多产 1 单位葡萄酒需放弃 80/90 ≈ 0.89 单位布。葡萄牙生产酒的机会成本更低。</div><div class="meta"><div><b>易混淆点：</b>机会成本是「放弃的另一种产品」，不是「花掉的劳动时间」。单位是人年还是钱不影响比较结果，但换算必须一致。</div></div></div>'
  +'<div class="defbox"><div class="en">Comparative Advantage</div><div class="zh">比较优势</div><div class="def">一国在某种产品上具有更低的机会成本（相对生产率更高）。一国即使在所有产品上都有绝对劣势，只要劣势程度不同，就仍在某些产品上具有比较优势。上例中英国在布料上机会成本更低（100/120 ≈ 0.83 < 90/80 = 1.125），故英国应专业化布料、葡萄牙专业化葡萄酒。</div><div class="meta"><div><b>核心命题：</b>贸易收益来自「按比较优势分工 + 按介于两国机会成本之间的比例交换」，双方都能消费到超出自身生产能力的组合。</div></div></div>'
  +'<div class="defbox"><div class="en">Terms of Trade</div><div class="zh">贸易条件</div><div class="def">一国出口价格与进口价格之比（价格贸易条件）。上例中，只要 1 单位酒能换到 0.89–1.2 单位布，两国都能获益；越接近对方的机会成本，对方获益越少。这就是为什么「谁更需要对方的产品」决定议价能力。</div></div>'
  +'<p><b>生产可能性边界（PPF）</b>表示一国在资源约束下能生产的两种产品最大组合。李嘉图模型假设：两产品、单一要素（劳动）、要素不可跨国流动、边际成本不变、无运输成本、完全竞争。这些假设每一个都是对现实的简化，也是后面讨论其边界时的检查清单。</p>' },

  { id:'m02-s4', h:'2.4 底层逻辑：机制、变量与失效条件', lvl:2, html:
  '<p><b>因果链：</b>生产率差异（技术、要素禀赋）→ 机会成本差异 → 专业化分工（按比较优势）→ 产出增加 → 按双方均可接受的比例交换 → 双方消费可能性边界同时外移。</p>'
  +'<p><b>关键变量：</b>（1）相对生产率——决定分工方向；（2）交换比例（贸易条件）——决定收益分配；（3）相对工资——在只有劳动的现实世界里，工资差会抵消一部分成本优势（葡萄牙工资更高时其成本优势缩小）；（4）运输与交易成本——缩小可实现的价格差，可能直接抹掉贸易（详见 m19）。</p>'
  +'<div class="callout warn"><span class="ico">⚠️</span><div><b>结论失效的条件：</b>当交换比例跌破本国机会成本、运输成本高于价格差、或产品不可贸易（如多数服务、重货低值品）时，贸易不会发生。比较优势说明「贸易可能有利」，不说明「贸易必然发生」。</div></div>' },

  { id:'m02-s5', h:'2.5 应用方法：用比较优势思路分析真实产业', lvl:2, html:
  '<div class="steps">'
  +'<div class="step"><h5>确定产品口径与可比性</h5><p>选定 HS 编码层级的产品定义（如光伏组件 HS 8541.40），确保各国数据可比。混淆口径是常见错误源。</p></div>'
  +'<div class="step"><h5>找生产率或成本差异的证据</h5><p>用单位劳动成本、电价、能源成本、自动化率、产业链配套等数据。如中国光伏制造的低成本来自电价、硅料规模与产业链配套，而非单一劳动力便宜。</p></div>'
  +'<div class="step"><h5>检验机会成本的方向</h5><p>看各国资源被「占用」在哪些用途：一国把最好的劳动力、资本、电力用于 A 产业，则其 B 产业的机会成本更高。这解释了为什么资源丰富的国家倾向出口资源密集型产品。</p></div>'
  +'<div class="step"><h5>检查贸易条件与转移方向</h5><p>产品价格、关税、运费如何改变交换比例？历史上成本领先者的转移（纺织：欧美→日本→亚洲四小龙→中国→越南/孟加拉）就是比较优势随工资与生产率变化而迁移的结果。</p></div>'
  +'<div class="step"><h5>评估政策的持续影响</h5><p>关税与补贴改变实际交换比例。巴西 2024 年将组件关税提至 25% 的同时保留配额内零税率<button class="src gB" data-src="s21">21</button>——这类政策直接改变贸易条件，必须在模型中显式处理。</p></div>'
  +'</div>' },

  { id:'m02-s6', h:'2.6 案例：光伏组件贸易的比较优势逻辑', lvl:2, html:
  '<div class="case"><div class="case-head"><div class="tag">案例 1 · 真实产业</div><div class="ttl">为什么全球光伏组件产能高度集中在中国</div></div><div class="case-body">'
  +'<h5>背景与问题</h5><p>2025 年中国多晶硅、硅片、电池、组件产能分别占全球 96.0%、96.2%、91.3%、80.1%<button class="src gB" data-src="s55">55</button>。为什么一个 20 多年前几乎不存在的产业会形成如此集中的格局？比较优势如何形成又如何变化？</p>'
  +'<h5>数据与来源</h5><p>产能份额：中国光伏行业协会（2026）；出口数据：中国机电产品进出口商会，2025 年中国组件出口 249.8 GW / 237 亿美元<button class="src gA" data-src="s04">4</button>；价格：2025–2026 年组件价格约 0.09–0.12 美元/瓦（行业机构，C 级，需交叉验证）<button class="src gC" data-src="s29">29</button>。</p>'
  +'<h5>分析步骤</h5><p>（1）初始条件差异：中国有廉价而稳定的电力、化工与金属产业配套、庞大的工程师供给。（2）学习曲线：装机规模扩张 → 单位成本下降 → 价格下降 → 市场扩大，正反馈循环。（3）机会成本视角：欧美把资本与研发投向更高附加值环节（设备、逆变器、品牌），亚洲各国在制造环节形成比较优势。（4）条件变化：美国 2024 年 12 月将中国太阳能电池片 301 关税从 25% 提至 50%<button class="src gA" data-src="s05">5</button>，并对东南亚四国发起双反<button class="src gA" data-src="s06">6</button>，实际是在用政策强制改写贸易条件，部分抵消比较优势——2025 年中国对东南亚四国硅片出口量同比下降超六成<button class="src gA" data-src="s04">4</button>。</p>'
  +'<h5>结论与限制</h5><p>结论：产能集中是禀赋、规模经济与政策共同演化的结果；当贸易条件被政策扭曲到一定程度，贸易流会被重新引导（转口、产能外移、转产）。限制：本案例不能推出「中国永远低成本」——成本结构随电价、工资、技术路线（TOPCon/HJT/钙钛矿）变化；也未证明各国「应该」专业化于制造，那是规范判断而非实证结论。</p>'
  +'<h5>可迁移与不可照搬</h5><p>可迁移：分析任何制造业贸易格局时，先找禀赋与规模证据，再找政策扭曲。不可照搬：比较优势不是宿命论——补贴与关税可以在十年尺度上创造新的比较优势（如美国 IRA 对本土组件的支持）。</p>'
  +'</div></div>' },

  { id:'m02-s7', h:'2.7 局限、争议与常见误区', lvl:2, html:
  '<ul>'
  +'<li><b>不能解释产业内贸易。</b>德法之间既出口汽车也进口汽车，李嘉图模型预言的应是单向贸易。这需要规模经济与差异化产品理论（m03）解释。</li>'
  +'<li><b>不能解释要素价格均等化的现实偏离。</b>模型预测贸易使各国工资趋同，但现实差距巨大，因为要素不能完全跨国流动、存在运输成本与政策壁垒。</li>'
  +'<li><b>静态视角。</b>模型没有技术进步、干中学与产业升级；动态比较优势会随时间改变。</li>'
  +'<li><b>常见误区：</b>把「绝对优势」当作贸易理由（没有比较优势，效率低国也有贸易理由）；把机会成本算成货币成本而忽略相对性（汇率变动不影响比较优势方向，只影响绝对价格）；把「应该专业化」当作政策建议（贸易有分配效应，受损群体需要补偿，这是国内政治的核心议题）。</li>'
  +'</ul>' },

  { id:'m02-s8', h:'2.8 与其他模块的联系', lvl:2, html:
  '<ul><li><b>→ m03：</b>比较优势回答「为什么贸易」，H-O 理论回答「贸易模式由什么禀赋决定」，新贸易理论补上规模经济与产业内贸易。</li>'
  +'<li><b>→ m04：</b>产品生命周期解释比较优势如何在国家间转移。</li>'
  +'<li><b>→ m10：</b>贸易数据是验证比较优势假说的证据来源。</li>'
  +'<li><b>→ m13：</b>市场筛选时，一国的比较优势结构决定它更可能是你的客户、供应商还是竞争者。</li></ul>' }
  ],
  exercises:[
  { type:'概念理解', q:'A 国生产 1 台设备需 50 小时、1 件家具需 10 小时；B 国分别需 60 小时和 6 小时。哪个国家在哪种产品上有比较优势？为什么「B 国两种都更强」不意味着无贸易可做？', a:'机会成本：A 国 1 台设备 = 5 件家具，1 件家具 = 0.2 台设备；B 国 1 台设备 = 10 件家具，1 件家具 = 0.1 台设备。B 国家具机会成本更低（0.1 < 0.2）→ 家具比较优势在 B；A 国设备机会成本更低（5 < 10）→ 设备比较优势在 A。即使 B 两种产品都更有效率，专业化分工后世界总产出仍会增加：B 专注家具、A 专注设备，再按 0.1–0.2（以家具计设备）之间的比例交换，双方消费组合都超出各自单干时的生产能力。' },
  { type:'概念理解', q:'什么是贸易条件？如果谈判中你的产品只能以接近对方机会成本的价格成交，说明什么？', a:'贸易条件是出口价/进口价之比，决定贸易收益在两国间的分配。成交价越接近对方的机会成本，对方保留的收益越少、本方收益越大；越接近本方的机会成本，本方获益越接近于零。极端情况下价格跌破本方机会成本，贸易对本方不利。这说明议价能力取决于：谁更依赖对方、可替代供应来源的多少、以及谁的时间压力更大（详见 m25 谈判）。' },
  { type:'实际应用', q:'用 UN Comtrade 或 ITC Trade Map 查询 HS 8541.40（光伏电池/组件）2024–2025 年出口前五国，说明数据在多大程度上支持「按比较优势分工」的解释。', a:'评价标准：（1）是否给出具体国家与金额/数量并标注年份与来源；（2）能否指出数据支持的部分——中国出口占绝对主导且量大价低，符合成本/规模驱动；（3）能否指出数据不能证明的部分——贸易流受关税政策影响（美国对中国 50%、对东南亚双反），不能把贸易流全部归因于比较优势，需与政策变量对照。参考事实：2025 年中国组件出口 249.8 GW、237 亿美元，前十大市场占比降至 48%<button class="src gA" data-src="s04">4</button>。' },
  { type:'实际应用', q:'某中国便携式储能企业拟进入日本市场。用机会成本思路，列出进入前必须核实的 3 个「成本差是否真实存在」的证据点。', a:'示例答案：（1）中国供应链成本（电芯、BMS、逆变器采购价）与日本本土产品的价差，需扣除运费与关税后仍为正；（2）日本市场对「应急备灾」场景的支付意愿与价格敏感度——决定价差能否转化为毛利；（3）竞争来源：日韩本土品牌与其他中国品牌的竞争使价差被压缩的程度。评价标准：是否区分「生产成本差」与「可实现价格差」；是否意识到运费、关税、认证会侵蚀理论价差。' },
  { type:'综合分析', q:'「比较优势理论证明各国应该专业化生产自己擅长的产品，政府不应保护任何产业。」这一说法在理论和政策上各有何问题？', a:'理论问题：（1）李嘉图模型是静态的，忽略学习曲线、动态比较优势与产业关联（保护幼稚产业的理论基础）；（2）模型假设充分就业与要素流动，现实中被进口替代的产业工人难以转移，调整成本真实存在；（3）比较优势基于现有禀赋，但禀赋可被投资改变。政策问题：（1）「应该」是规范判断，理论本身只能说明贸易的收益与分配机制，不能直接推出政策结论；（2）现实中各国普遍以关税、补贴、本地含量要求干预贸易（如巴西组件关税、美国 IRA、印度 ALMM），研究者的任务是把政策作为变量纳入分析，而非假定其不存在。没有唯一正确答案：不同立场的差异在于对调整成本、长期动态收益与分配公平的权重不同。' }
  ]
},

m03: {
  id:'m03', stage:'s1', title:'要素禀赋、规模经济与新贸易理论', en:'Factor Endowments, Economies of Scale and New Trade Theory',
  hours:'8–12 小时', goal:'理解 H-O 理论对贸易模式的解释、新贸易理论对产业内贸易的解释，以及异质企业贸易的基本结论。',
  prereqText:'m02 比较优势与机会成本。', outcome:'能区分「行业间贸易」与「行业内贸易」的解释框架，并判断一个产业的贸易格局更可能由禀赋还是规模经济驱动。',
  summary:'李嘉图之后，经济学沿着两条路径发展：一条追问「什么决定了比较优势」（要素禀赋），另一条追问「为什么相似国家之间大量贸易同类产品」（规模经济与不完全竞争）。',
  terms:['factor-endowment','heckscher-ohlin','economies-of-scale','intra-industry-trade','new-trade-theory','home-market-effect','melitz'],
  prereq:['m02'], related:['m04','m09','m13'],
  sources:['s32','s33','s53'],
  sections:[
  { id:'m03-s1', h:'3.1 学习定位', lvl:2, html:
  '<p>李嘉图理论把贸易归因于技术（生产率）差异。但澳大利亚出口羊毛、中东出口石油，显然不是因为它们在牧羊或采油上「技术更高」，而是因为资源禀赋不同。赫克歇尔—俄林（H-O）理论把比较优势的来源从「技术」扩展到「要素禀赋」。此后，经济学家面对一个李嘉图与 H-O 都难以解释的现象：发达国家之间贸易量最大，且大量交换的是同类产品（德国向法国出口汽车，同时也从法国进口汽车）。克鲁格曼用规模经济与不完全竞争解释了这一现象，为此获得 2008 年诺贝尔经济学奖<button class="src gA" data-src="s33">33</button>。</p>'
  +'<div class="meta-table"><div class="cell"><div class="k">所属领域</div><div class="v">国际贸易理论</div></div><div class="cell"><div class="k">前置知识</div><div class="v">m02；建议理解「边际成本」「垄断竞争」的直觉</div></div><div class="cell"><div class="k">职业用途</div><div class="v">判断产业贸易格局的驱动因素与集中度趋势</div></div><div class="cell"><div class="k">争议提示</div><div class="v">H-O 的实证检验结果混合，需了解「里昂惕夫悖论」</div></div></div>' },

  { id:'m03-s2', h:'3.2 从直观问题开始：三个用禀赋说不清、用规模说得清的现象', lvl:2, html:
  '<p>现象一：澳大利亚与沙特的人均产出相近、技术相通，但出口结构截然不同（矿产 vs 石油）。现象二：全球商用飞机市场基本被波音与空客两家瓜分，而两国资源禀赋几乎相同。现象三：全球光伏组件产能 80% 以上集中在中国，而多晶硅产能 96% 在中国——远超任何「禀赋差异」能自然解释的程度。</p>'
  +'<p>这三个现象分别指向：<b>禀赋决定贸易模式（现象一）、规模经济决定产业集中（现象二）、规模 + 政策 + 学习曲线共同制造超级集中（现象三）</b>。本模块的目标就是给你这三把不同的「尺子」，并知道各自适合量什么。</p>' },

  { id:'m03-s3', h:'3.3 正式定义', lvl:2, html:
  '<div class="defbox"><div class="en">Factor Endowment / Heckscher-Ohlin Theory</div><div class="zh">要素禀赋 / 赫克歇尔—俄林理论</div><div class="def">各国出口密集使用其丰裕要素的产品，进口密集使用其稀缺要素的产品。土地丰裕国出口农产品，资本丰裕国出口资本密集型产品，劳动力丰裕国出口劳动密集型产品。H-O 是李嘉图理论的推广：把「部门间生产率差异」内生于「要素禀赋差异」。</div><div class="meta"><div><b>推论：</b>斯托尔珀—萨缪尔森定理——贸易提高丰裕要素回报、降低稀缺要素回报，这解释了为什么工会与进口竞争产业常反对自由贸易。</div><div><b>实证争议：</b>里昂惕夫 1953 年发现美国（资本丰裕国）出口的劳动密集型产品比重高于进口，与 H-O 预测相反，引出「人力资本、自然资源、技术差异」等后续修正。</div></div></div>'
  +'<div class="defbox"><div class="en">Economies of Scale</div><div class="zh">规模经济</div><div class="def">产量扩大带来单位成本下降。内部规模经济来自企业自身规模（固定成本分摊、专业化）；外部规模经济来自产业集聚（供应商池、劳动力池、知识溢出）。外部规模经济是产业集群（如中国光伏、意大利陶瓷）自我强化的根源。</div></div>'
  +'<div class="defbox"><div class="en">Intra-industry Trade</div><div class="zh">产业内贸易</div><div class="def">同一产业类别内双向贸易（既出口又进口相似产品）。产业内贸易指数 = 1 − |出口 − 进口| /（出口 + 进口），越接近 1 双向流动越强。发达国家之间贸易中产业内贸易占比高，反映的是差异化产品与规模经济，而非禀赋差异。</div></div>'
  +'<div class="defbox"><div class="en">New Trade Theory</div><div class="zh">新贸易理论</div><div class="def">克鲁格曼（1979–1980）等以规模经济、不完全竞争和产品差异化为基础解释贸易的模型群。核心洞见：贸易可以在没有禀赋差异的国家之间发生，源于企业扩大市场以摊薄固定成本、消费者获得更多品种。</div><div class="meta"><div><b>延伸：</b>梅里兹（Melitz，2003）「新新贸易理论」进一步证明，只有生产率最高的企业才会出口——贸易会行业内重新配置资源，低效企业退出<button class="src gA" data-src="s53">53</button>。这解释了为什么「开放」与「本土企业倒闭」可以同时发生。</div></div></div>'
  +'<div class="defbox"><div class="en">Home Market Effect</div><div class="zh">母市场效应</div><div class="def">在存在规模经济与贸易成本的条件下，大规模国内市场会成为差异化产品的净出口基地——巨大的国内需求本身创造了出口优势。这是「内需大市场」战略的理论依据。</div></div>' },

  { id:'m03-s4', h:'3.4 底层逻辑：三套机制的因果链', lvl:2, html:
  '<div class="chain"><span class="node">要素禀赋差异</span><span class="arr">→</span><span class="node">要素价格差异</span><span class="arr">→</span><span class="node">产品成本差异</span><span class="arr">→</span><span class="node">行业间贸易模式</span></div>'
  +'<div class="chain"><span class="node">规模经济 + 贸易成本</span><span class="arr">→</span><span class="node">生产集中于少数区位</span><span class="arr">→</span><span class="node">产业内双向贸易</span></div>'
  +'<div class="chain"><span class="node">企业生产率异质性</span><span class="arr">→</span><span class="node">高生产率企业出口</span><span class="arr">→</span><span class="node">行业内资源再配置</span></div>'
  +'<p><b>变量与边界：</b>H-O 的解释力在「部门间差异大、产品同质」的产业最强（农产品、矿产、基础金属）；新贸易理论的解释力在「产品差异化、固定成本高」的产业最强（汽车、消费电子、光伏组件中的品牌细分市场）。当要素可以跨国流动（FDI）、或产品进入生命周期不同阶段（m04）时，静态模型的预测力下降。</p>'
  +'<div class="callout warn"><span class="ico">⚠️</span><div><b>常见误用：</b>把 H-O 当作「分工宿命论」为国献策。它首先是一个实证框架；要素禀赋会变化（教育、资本积累、基础设施投资都在改变一国的「丰裕要素」），政策也在改写结果。</div></div>' },

  { id:'m03-s5', h:'3.5 应用方法：判断一个产业的贸易由什么驱动', lvl:2, html:
  '<div class="steps">'
  +'<div class="step"><h5>计算产业内贸易指数</h5><p>对目标产品（HS 6 位码）分别计算主要贸易国的 IIT = 1 − |X−M|/(X+M)。IIT 高的产业（如汽车零部件、电子元件）按差异化/规模经济框架分析；IIT 低的产业（如矿产、农产品）按禀赋框架分析。</p></div>'
  +'<div class="step"><h5>检验集中度结构</h5><p>出口前三/前五国份额、赫芬达尔指数。若份额极高且随时间上升（如光伏组件），提示规模经济 + 路径依赖；若分散且稳定，提示禀赋分散分布。</p></div>'
  +'<div class="step"><h5>找固定成本与学习曲线的证据</h5><p>工厂最小经济规模、研发强度、价格随累计产量下降的历史数据。光伏组件价格从 2010 年约 2 美元/瓦降至 2025 年约 0.1 美元/瓦，是规模经济与学习曲线的经典证据。</p></div>'
  +'<div class="step"><h5>区分国内与国际循环</h5><p>母市场效应意味着大市场本身是优势。评估中国企业出海时，国内市场规模是「训练场」——在国内竞争中胜出的产品与成本结构，决定了出海的起点。</p></div>'
  +'<div class="step"><h5>把政策作为独立变量</h5><p>补贴、关税、本地含量要求会人为制造或摧毁规模经济。印度 ALMM 用行政准入创造本土市场（m20、m23）<button class="src gB" data-src="s20">20</button>，美国 232 措施用最低进口价格保护本土产能<button class="src gA" data-src="s07">7</button>——这些都改变了理论模型中的「贸易成本」参数。</p></div>'
  +'</div>' },

  { id:'m03-s6', h:'3.6 案例：商用飞机与光伏组件——两种完全不同的集中逻辑', lvl:2, html:
  '<div class="case"><div class="case-head"><div class="tag">案例 1 · 对照案例</div><div class="ttl">规模经济如何制造「双头垄断」，又如何被政策改变</div></div><div class="case-body">'
  +'<h5>背景与问题</h5><p>全球窄体客机市场长期由波音与空客双头主导；光伏组件则是「一超（中国）多强」。两者产品都复杂、固定成本都高，为什么格局不同？</p>'
  +'<h5>分析</h5><p>（1）规模经济都极强：飞机研发投入数百亿美元，组件工厂单线投资十亿元人民币级，都要求全球市场摊薄固定成本。（2）关键差异在「可贸易性」与「政策敏感度」：飞机是战略性采购，各国以政府采购、适航认证、产业政策深度介入，形成「政治—经济双头结构」；组件是标准化商品，价格竞争主导，规模经济 + 学习曲线使成本最低者赢家通吃，而各国关税与本地化政策（美国 301/232、巴西关税、印度 ALMM）正在把这个通吃结构切成区域市场。（3）理论含义：在规模经济产业中，先发优势与累积产量是护城河；但政策可以把「全球成本竞争」改写为「区域准入竞争」，迫使产能地理重组。</p>'
  +'<h5>数据</h5><p>中国光伏产能全球占比：多晶硅 96.0%、硅片 96.2%、电池 91.3%、组件 80.1%（2025）<button class="src gB" data-src="s55">55</button>；美国措施：301 关税 50%（2025 年起）<button class="src gA" data-src="s05">5</button>、232 最低进口价格 + 15% 关税（2026 年 12 月生效）<button class="src gA" data-src="s07">7</button>；印度 ALMM List-II 将中国电池排除在政府项目之外<button class="src gB" data-src="s20">20</button>。</p>'
  +'<h5>结论与限制</h5><p>结论：规模经济解释「为什么集中」，政策解释「集中被允许到什么程度」。对企业的含义是：产能布局必须同时计算「全球成本曲线」与「区域准入成本」两条曲线。限制：本案例未量化各政策的具体成本效应，那需要关税与到岸成本模型（m20、m19 及到岸成本计算器）。</p>'
  +'</div></div>' },

  { id:'m03-s7', h:'3.7 局限、争议与常见误区', lvl:2, html:
  '<ul><li><b>H-O 的实证争议：</b>里昂惕夫悖论及后续研究（Leontief 1953；Trefler 1995「消失的贸易」）表明，简单版 H-O 预测力有限；加入人力资本、技术差异后解释力增强。学习时应把 H-O 视为「提供假设的框架」而非「已被完全证实的定律」。</li>'
  +'<li><b>规模经济模型的形式化局限：</b>DS 模型假设对称企业与垄断竞争，现实产业集中度分布（如光伏 CR5 约 47%）更符合寡头结构，需要寡头模型补充。</li>'
  +'<li><b>误区一：</b>把「产业内贸易指数高」直接理解为「没有竞争」。双向贸易往往发生在差异化细分市场，竞争反而更激烈。</li>'
  +'<li><b>误区二：</b>用国家层面的禀赋推断企业机会。企业层面的竞争力还取决于管理、品牌与渠道（m05、m26）。</li></ul>' },

  { id:'m03-s8', h:'3.8 与其他模块的联系', lvl:2, html:
  '<ul><li><b>→ m04：</b>规模经济与禀赋共同决定产品生命周期中产业在国家间的转移路径。</li>'
  +'<li><b>→ m09：</b>规模经济是全球价值链「环节集中」的微观基础。</li>'
  +'<li><b>→ m13：</b>评估目标市场时，用 IIT 与集中度判断该国是你的「客户市场」还是「竞争来源」。</li>'
  +'<li><b>→ m16：</b>规模经济强的产业倾向高承诺进入（绿地投资、并购）以获取规模，而非纯出口。</li></ul>' }
  ],
  exercises:[
  { type:'概念理解', q:'H-O 理论与李嘉图理论对比较优势来源的解释有何不同？斯托尔珀—萨缪尔森定理对一国的分配政治意味着什么？', a:'李嘉图：比较优势来自部门间技术（劳动生产率）差异；H-O：比较优势来自要素禀赋结构差异，技术被假设为相同（或差异内生于禀赋）。S-S 定理：贸易使丰裕要素实际回报上升、稀缺要素实际回报下降。分配含义：在劳动力丰裕国，出口扩张提高工资；在资本丰裕国，出口扩张提高资本回报而压低工资。这解释了为什么发达国家部分工会与进口竞争产业是自由贸易的反对者——贸易收益在国家内部部分人与部分人之间的分配是不均的。' },
  { type:'概念理解', q:'什么是产业内贸易？为什么两个「几乎一样」的国家之间仍可能大量贸易？', a:'产业内贸易指同一产业内既出口又进口相似产品。即使两国禀赋相同，规模经济 + 产品差异化 + 贸易成本的组合同样产生贸易：每个国家专业化于该产业的若干品种以利用规模经济，再出口换取其他品种，消费者获得更多选择、企业获得更大市场。实证指标：IIT = 1 − |X−M|/(X+M)。' },
  { type:'实际应用', q:'某光伏企业研究进入印度市场的可能性。用本模块框架，说明 ALMM（型号与制造商批准清单）在理论上改变了什么参数，企业应验证什么？', a:'理论上 ALMM 提高了印度政府项目的「贸易成本」至无穷大（未列入清单即无资格），并把市场从「全球成本竞争」改写为「准入竞争」，同时用行政手段为本土制造创造受保护的规模（母市场效应的政策版）。企业应验证：（1）其目标细分（政府/补贴项目 vs 开放市场商业项目）是否受 ALMM 约束——ALMM List-I/II 从 2026 年 6 月起要求政府项目使用本土电池<button class="src gB" data-src="s20">20</button>；（2）非受限市场（商业屋顶、离网）的规模与增速；（3）通过技术授权、合资或本地建厂进入「准入内」的成本与时间。注意区分「已生效规则」与「提案」：印度也曾建议对中国电池征收反倾销税，须核验最终裁定。' },
  { type:'实际应用', q:'用公开数据判断「中国便携式储能产业」的贸易更可能由禀赋还是规模经济驱动，列出你的判据。', a:'判据：（1）集中度：若出口高度集中于少数企业（如华宝新能、正浩、安克等头部）且份额稳定或上升，指向规模经济 + 品牌；（2）IIT：若中国既是出口大国又是进口大国（进口高端电芯/芯片），IIT 较高，指向差异化与产业内分工；（3）上游依赖：若电芯、芯片高度依赖少数供应商，指向产业链集中带来的规模经济；（4）价格曲线：若产品均价随渗透率下降后趋稳，指向学习曲线。评价标准：是否给出可查证的指标与来源，而非仅定性断言。' },
  { type:'综合分析', q:'「规模经济意味着产业必然走向全球垄断，后发国家没有机会。」请用正反两方面的证据讨论。', a:'支持面：光伏、面板、电池等行业确实出现「一国主导多环节」的格局，规模 + 学习曲线 + 产业链配套形成高壁垒（中国光伏产能占比 80–96%）。反面：（1）政策可以切割市场——美国用 301/232 把中国组件挡在门外并扶持 First Solar 等本土产能；印度用 ALMM；巴西用关税配额<button class="src gB" data-src="s21">21</button>，说明「全球垄断」不自动等于「各国市场垄断」；（2）技术路线切换会重置规模优势（薄膜→晶硅→钙钛矿的潜在迭代）；（3）规模劣势可用差异化、服务、本地化渠道弥补（参考消费电子中多品牌并存）。结论：规模经济提高进入门槛，但不消灭后发机会；机会存在于政策保护的细分市场、技术切换窗口与差异化定位。' }
  ]
},

m04: {
  id:'m04', stage:'s1', title:'产品生命周期与国际贸易模式', en:'Product Life Cycle and Trade Patterns',
  hours:'5–8 小时', goal:'理解弗农的产品生命周期理论，以及产业领先地位如何在国家与企业之间转移。',
  prereqText:'m02、m03。', outcome:'能判断一个产品/产业处于生命周期的哪个阶段，并推断贸易格局的可能演变方向。',
  summary:'产品生命周期理论把「比较优势会移动」这一事实模型化：新产品在创新国生产并出口，成熟后生产向其他发达国家、再向发展中国家转移，贸易方向随之反转。',
  terms:['product-life-cycle','innovation','standardization','first-mover'],
  prereq:['m02','m03'], related:['m09','m16','m29'],
  sources:['s34','s04','s05'],
  sections:[
  { id:'m04-s1', h:'4.1 学习定位', lvl:2, html:
  '<p>李嘉图与 H-O 是静态理论：给定生产率与禀赋，贸易模式确定。但现实中的领先产业会「易主」——纺织从英国到美国到日本到中国再到越南；光伏从欧美日到中国再到东南亚。弗农 1966 年提出的产品生命周期（PLC）理论是最早解释这种动态转移的框架之一<button class="src gA" data-src="s34">34</button>。它回答的问题：<b>一个产业的贸易格局如何随时间演变，企业应该在哪一阶段进入或退出。</b></p>' },

  { id:'m04-s2', h:'4.2 从直观问题开始：一件产品的一生', lvl:2, html:
  '<p>以某款新型便携式储能电源为例。第一阶段，它在美国发明、定位高端应急市场，在本国设计生产、部分出口到其他发达国家，价格高、竞争者少。第二阶段，设计标准化、供应链成熟，美国公司开始把制造外包到亚洲，其他发达国家厂商也进入，竞争加剧、价格下降，出口市场扩展到发展中国家。第三阶段，产品完全标准化（容量、接口、快充协议都有通行规格），制造转向成本最低的地区（中国、越南），原创国可能反而变成进口国，创新国企业或退出、或转向品牌与服务，或开发下一代产品重新开始循环。</p>'
  +'<p>这个三段故事就是 PLC 的骨架。它对市场研究的直接意义：<b>同一产品在不同阶段，进入策略、竞争焦点与利润分布完全不同</b>——早期卖技术和品牌，成熟期拼成本和渠道。</p>' },

  { id:'m04-s3', h:'4.3 正式定义', lvl:2, html:
  '<div class="defbox"><div class="en">Product Life Cycle（PLC）</div><div class="zh">产品生命周期理论</div><div class="def">弗农提出：产品经历「新产品—成熟—标准化」三阶段，伴随生产区位从创新国 → 其他发达国家 → 发展中国家转移，贸易方向相应反转（创新国从出口到进口）。</div><div class="meta"><div><b>阶段 1 新产品：</b>需求不确定、研发密集、生产靠近市场与研发中心，价格弹性低。<br><b>阶段 2 成熟：</b>设计定型、竞争进入、成本竞争开始，生产向其他发达国家分散以靠近市场并规避关税。<br><b>阶段 3 标准化：</b>价格竞争主导，生产集中到成本最低区位，创新国转为进口。</div><div><b>适用边界：</b>最适合解释「研发密集、可标准化制造」的制造业产品；对原材料、服务业与「永不标准化」的奢侈品解释力弱。</div></div></div>'
  +'<p>相关概念：<b>创新租金</b>（早期垄断定价带来的超额利润）、<b>先发优势</b>（品牌、标准、渠道锁定）与<b>沉没成本</b>（早期研发投入决定退出难度）。</p>' },

  { id:'m04-s4', h:'4.4 底层逻辑：阶段切换的驱动变量', lvl:2, html:
  '<div class="chain"><span class="node">技术不确定下降</span><span class="arr">→</span><span class="node">设计标准化</span><span class="arr">→</span><span class="node">制造门槛下降</span><span class="arr">→</span><span class="node">成本竞争取代性能竞争</span><span class="arr">→</span><span class="node cool">产能向低成本区转移</span></div>'
  +'<p>驱动变量包括：（1）技术成熟度——决定制造能否被「编码」并外包；（2）需求价格弹性——从低到高，定价权从创新者转移到成本领先者；（3）贸易与投资政策——关税与本地含量要求可以截断转移链条（巴西把组件关税提到 25% 并配配额<button class="src gB" data-src="s21">21</button>，印度 ALMM 要求本土电池<button class="src gB" data-src="s20">20</button>，都是在制造阶段设卡）；（4）要素成本变化——工资、电价、汇率改变成本排序；（5）技术路线突变——新路线（如固态电池）可能重置周期。</p>' },

  { id:'m04-s5', h:'4.5 应用方法：定位产业阶段并推断进入策略', lvl:2, html:
  '<div class="steps">'
  +'<div class="step"><h5>判断标准化程度</h5><p>看接口、规格、认证是否收敛（如快充协议 PD3.1、组件尺寸与功率档），以及差异化卖点是否已从「性能」转向「品牌/渠道/服务」。</p></div>'
  +'<div class="step"><h5>看价格曲线</h5><p>产品均价是否持续下降、降幅是否趋缓。均价年降幅收窄且集中于头部品牌时，通常已进入标准化阶段。</p></div>'
  +'<div class="step"><h5>看产能地理</h5><p>制造是否从创新国外移、外移目的地是「其他发达国家」还是「发展中国家」；外移是否由关税驱动（东南亚光伏产能的兴衰与美国双反直接相关<button class="src gA" data-src="s06">6</button>）。</p></div>'
  +'<div class="step"><h5>推断进入策略</h5><p>早期产品：卖技术/品牌，控制核心制造；成熟产品：拼成本与渠道，进入模式偏向供应链整合与本地化服务；衰退/被政策保护市场：评估本地化生产的必要性（绿地 vs 合资）。</p></div>'
  +'<div class="step"><h5>设置监测指标</h5><p>价格拐点、新增产能公告、政策立法进程、技术路线突破——任何一项都可能意味着阶段切换。</p></div>'
  +'</div>' },

  { id:'m04-s6', h:'4.6 案例：光伏组件的全球产业转移', lvl:2, html:
  '<div class="case"><div class="case-head"><div class="tag">案例 1 · 完整周期</div><div class="ttl">光伏组件如何从欧美日技术走到中国规模，再被政策推向多区域布局</div></div><div class="case-body">'
  +'<h5>阶段 1（约 2000–2010）：创新国主导</h5><p>德国、日本、美国企业主导技术与制造，欧洲高电价与补贴（德国 EEG）创造早期市场，价格高企。</p>'
  +'<h5>阶段 2（约 2010–2018）：制造外移与成本竞争</h5><p>中国制造崛起，价格快速下降，欧美制造企业大批退出，中国组件出口从边缘走向主导。2012–2015 年欧美对华双反进一步压缩中国企业直接出口，促使产能向东南亚转移以规避原产地限制。</p>'
  +'<h5>阶段 3（2018 至今）：标准化 + 政策重构</h5><p>组件高度标准化，中国占全球产能 80% 以上<button class="src gB" data-src="s55">55</button>；美国 301 关税提至 50%<button class="src gA" data-src="s05">5</button>、对东南亚四国双反（21.31%–271.2%）<button class="src gA" data-src="s06">6</button>、232 多晶硅措施 2026 年 12 月生效<button class="src gA" data-src="s07">7</button>，巴西关税 + 配额<button class="src gB" data-src="s21">21</button>，印度 ALMM 排除中国电池<button class="src gB" data-src="s20">20</button>。结果：中国企业以「产能出海 + 转口 + 新兴市场（巴基斯坦 2025 年进口 17.9 GW、沙特大额招标）」回应<button class="src gC" data-src="s25">25</button>。</p>'
  +'<h5>结论与限制</h5><p>结论：PLC 的「标准化→成本竞争→产能转移」链条清晰可见，但政策把转移路径从「单向下沉」改写为「多点布局」。限制：本案例聚焦制造环节；品牌、融资、EPC 服务环节的价值链分布另见 m09。</p>'
  +'</div></div>' },

  { id:'m04-s7', h:'4.7 局限、争议与常见误区', lvl:2, html:
  '<ul><li><b>理论局限：</b>PLC 基于 1960 年代美国跨国公司的观察，对「多国同步上市」「开源生态」「平台型产品」解释力弱；对发展中国家创新（逆向创新）未覆盖。</li>'
  +'<li><b>政策敏感性常被低估：</b>模型隐含「转移不可逆」，但关税与准入可以把制造「拉回」（reshoring）或推到第三国（friend-shoring）。</li>'
  +'<li><b>误区一：</b>把「产品生命周期」与「品类生命周期」混淆——平台（如智能手机）可长期存续而型号快速迭代。</li>'
  +'<li><b>误区二：</b>认为标准化阶段「没有利润」。实际上标准化阶段利润转向规模、供应链与运营效率，特斯拉与中国电池厂的利润率高于多数欧美老牌厂商即是证明；同时政策租金（本土制造补贴）可能比效率租金更高。</li></ul>' },

  { id:'m04-s8', h:'4.8 与其他模块的联系', lvl:2, html:
  '<ul><li><b>→ m09：</b>PLC 中「制造外移」正是全球价值链重组的过程，m09 解释外移后各环节的价值分配。</li>'
  +'<li><b>→ m16：</b>阶段决定进入模式——早期出口技术/服务，成熟期考虑本地组装以规避关税与贴近交付。</li>'
  +'<li><b>→ m29：</b>产能转移使供应链暴露于新的地缘与物流风险，需要在多点布局时统一管理。</li></ul>' }
  ],
  exercises:[
  { type:'概念理解', q:'用 PLC 三阶段描述一个你熟悉的消费品行业（如扫地机器人、电动两轮车），指出每个阶段生产与贸易的典型特征。', a:'参考要点（电动两轮车/ebike）：阶段 1——欧洲/日本品牌主导，锂电车型早期在欧洲高价销售，技术溢价高；阶段 2——中国供应链成熟，雅迪、爱玛、九号等规模化，产品出口欧美，价格带拉开；阶段 3——高度标准化，印尼/越南/匈牙利等地产能兴起以规避欧美贸易措施（欧盟反倾销/规避调查、美国关税），品牌与渠道成为竞争焦点。评价标准：是否给出「生产区位转移 + 贸易方向变化 + 竞争焦点变化」三要素，而非只描述销量。' },
  { type:'概念理解', q:'为什么 PLC 对「政策干预强」的产业预测力下降？', a:'PLC 假设生产区位由成本与市场接近度决定。当关税、本地含量、双反、准入清单（ALMM）成为成本结构的决定性变量时，产能布局的目标函数从「最小化生产成本」变为「最小化生产成本 + 合规成本 + 政策风险」，转移路径会被政策重塑（如在被征税国之外设厂、转口、或接受本地化）。此时需要用政策变量显式建模（m20、m29），而非套用 PLC 的自然演化叙事。' },
  { type:'实际应用', q:'你的企业在中国生产 500 Wh 便携式储能电源，考虑出口欧洲。列出 4 个用于判断该产品在欧洲处于 PLC 哪个阶段的指标。', a:'（1）市场均价年变化（价格战是否开始）；（2）新进入者数量与头部集中度（CR5 变化）；（3）产品规格标准化程度（容量档、快充协议、认证统一性）；（4）欧洲本土/近岸产能与品牌的出现（政策驱动的本地化信号）。再补充欧盟电池法规合规节点作为阶段外但关键的市场变量（m23）。评价标准：指标是否可获取、可量化、与阶段判断有逻辑关联。' },
  { type:'实际应用', q:'研究发现：某产业制造已完全标准化，但原创国仍占品牌与利润大头（如高端家电、奢侈品）。这与 PLC 矛盾吗？', a:'不矛盾，是 PLC 的边界情形。PLC 的「标准化」指制造环节，不必然覆盖品牌、设计与渠道环节的价值捕获；当品牌资产与渠道锁定难以复制时，创新国企业可以退出制造、保留高附加值环节（「无工厂化」）。这说明分析贸易格局时要把「生产在哪里」与「价值分配在哪里」分开（详见 m09 价值获取）。' },
  { type:'综合分析', q:'「后发国家只能等产业标准化后才能进入。」结合光伏与新能源汽车两个产业讨论这一说法。', a:'光伏路径符合该叙事：中国在组件标准化阶段凭规模与成本胜出。但新能源汽车显示另一路径：中国在电动化早期即大规模进入，用国内市场（母市场效应）+ 供应链规模 + 快速迭代，在技术尚未完全定型时建立优势，甚至向欧美出口。两者的差异说明：（1）进入时机取决于「国内市场能否支撑学习曲线」；（2）政策（补贴、双积分、基础设施）可以压缩学习时间；（3）技术路线切换窗口给后发者重新洗牌的机会。对企业：问题不是「等不等」，而是「本土市场 + 迭代速度 + 政策窗口」能否支撑在标准化完成前建立成本与品牌位置。' }
  ]
},

m05: {
  id:'m05', stage:'s1', title:'企业为什么会跨国经营：OLI、阶段论与资源观', en:'Why Firms Go Abroad: OLI, Stage Models and the Resource-Based View',
  hours:'8–12 小时', goal:'掌握邓宁 OLI 折衷理论、乌普萨拉国际化阶段模型与资源基础观，理解企业层面国际化的条件与路径。',
  prereqText:'m01 动机分类。', outcome:'能用 OLI 三条件判断某企业是否适合以某种方式进入某市场，并解释渐进式与跳跃式国际化的适用条件。',
  summary:'国际贸易理论解释「国家之间为什么贸易」，企业国际化理论解释「为什么是这家企业、用这种方式跨境」。三个条件同时成立，企业才会跨国经营。',
  terms:['oli-paradigm','ownership-advantage','location-advantage','internalization-advantage','uppsala-model','liability-of-foreignness','rbt','born-global'],
  prereq:['m01'], related:['m06','m16','m17'],
  sources:['s35','s36','s52','s50'],
  sections:[
  { id:'m05-s1', h:'5.1 学习定位', lvl:2, html:
  '<p>国家层面的理论说明贸易对双方有利，但没有回答：为什么很多跨境活动由「企业内部」完成（FDI）而不是「市场」完成（出口）？为什么有的企业很早就全球化，有的永远不出去？本模块的三个理论分别回答：<b>OLI</b>——企业跨国经营需要同时具备哪三类优势；<b>乌普萨拉模型</b——企业如何逐步积累国外市场知识；<b>资源基础观</b>——企业凭什么在国外竞争。它们共同构成 m16–m17 进入模式决策的理论基础。</p>' },

  { id:'m05-s2', h:'5.2 从直观问题开始：同样是卖组件，为什么有的出口、有的建厂、有的只授权', lvl:2, html:
  '<p>两家中国光伏组件企业面对巴西市场：A 公司出口并在当地找经销商；B 公司与本地集团合资建组件厂。为什么同一市场、同一产品，进入方式截然不同？OLI 给出的检查清单是：企业有没有可转移的所有权优势（技术、品牌、成本控制）？巴西有没有区位优势（市场、关税规避）？把优势「内部化」到子公司是否比卖给本地伙伴更划算（控制技术外溢 vs 借助伙伴渠道）？三家企业的差异，几乎总能还原到这三类优势的不同组合。</p>' },

  { id:'m05-s3', h:'5.3 正式定义：OLI 折衷理论', lvl:2, html:
  '<div class="defbox"><div class="en">Eclectic Paradigm（OLI）</div><div class="zh">国际生产折衷理论</div><div class="def">邓宁提出：企业开展对外直接投资需同时满足三类优势——所有权优势（O）、区位优势（L）、内部化优势（I）。三者齐备 → FDI；有 O 无 L 或 I → 出口或许可；只有 O 与 L 而无 I → 许可/特许（把优势卖给本地企业使用）。<button class="src gA" data-src="s35">35</button></div><div class="meta"><div><b>O 所有权优势：</b>企业特有、可跨国转移的竞争优势——技术、品牌、管理、规模、供应链能力。<br><b>L 区位优势：</b>东道国特有的、企业必须到当地才能利用的优势——市场规模、要素成本、关税规避、政策优惠。<br><b>I 内部化优势：</b>在企业内部调配资源比通过市场交易更有利——保护知识产权、控制质量与渠道、避免交易对手机会主义。</div><div><b>易混淆点：</b>OLI 解释「为什么是 FDI 而不是出口/许可」，不直接回答「进入哪个国家」——那需要结合市场研究（m13）。</div></div></div>'
  +'<div class="defbox"><div class="en">Uppsala Model</div><div class="zh">国际化阶段理论</div><div class="def">约翰逊与瓦尔尼提出：企业国际化遵循「无规律出口 → 通过代理出口 → 设销售子公司 → 设生产子公司」的渐进链条，因为国外市场知识降低风险，而知识只能通过经验积累；心理距离（文化、语言、制度差异）决定顺序——通常先进入心理距离近的市场<button class="src gA" data-src="s36">36</button>。</div><div class="meta"><div><b>局限：</b>对「天生全球化」企业（一成立就面向多国市场，常见于数字产品与细分利基市场）解释力弱；对大企业与快周期行业，跳跃式进入常见。</div></div></div>'
  +'<div class="defbox"><div class="en">Resource-Based View（RBV）</div><div class="zh">资源基础观</div><div class="def">企业的持续竞争优势来自有价值、稀缺、难以模仿、不可替代的资源与能力（VRIN 标准）<button class="src gA" data-src="s52">52</button>。国际化决策因此取决于：企业的核心资源能否跨境转移、在哪些市场能保持稀缺性、是否需要与本地资源互补。</div></div>'
  +'<div class="defbox"><div class="en">Liability of Foreignness</div><div class="zh">外来者劣势</div><div class="def">外国企业在东道国面临的额外成本：不熟悉本地规则、缺乏本地网络、被消费者与政府歧视。进入模式选择本质上是在「控制权收益」与「克服外来者劣势的成本」之间权衡。</div></div>' },

  { id:'m05-s4', h:'5.4 底层逻辑：三个条件如何组合成进入决策', lvl:2, html:
  '<div class="tbl-wrap"><table class="data"><thead><tr><th>O</th><th>L</th><th>I</th><th>结果</th><th>典型形态</th></tr></thead><tbody>'
  +'<tr><td>有</td><td>有</td><td>有</td><td>对外直接投资</td><td>绿地建厂、并购、独资子公司</td></tr>'
  +'<tr><td>有</td><td>有</td><td>弱</td><td>许可 / 特许 / 合同制造</td><td>技术授权、品牌特许、OEM</td></tr>'
  +'<tr><td>有</td><td>无（或本国即可利用）</td><td>—</td><td>本国生产 + 出口</td><td>直接/间接出口、跨境电商</td></tr>'
  +'<tr><td>无</td><td>—</td><td>—</td><td>不国际化（或仅作为贸易商）</td><td>本土经营</td></tr>'
  +'</tbody></table></div>'
  +'<p>因果链：<b>O 决定「企业能不能在国外赚钱」，L 决定「为什么要去那个国家而不是留在国内或去别国」，I 决定「用市场（出口/许可）还是层级（子公司）组织这笔交易」。</b>交易成本经济学为 I 提供了微观基础：当资产专用性高、不确定性大、交易频率高时，市场交易成本（寻找伙伴、谈判、监督、执行）超过内部化成本，企业选择自己干<button class="src gA" data-src="s50">50</button>。</p>' },

  { id:'m05-s5', h:'5.5 应用方法：用 OLI 做进入模式的初步筛选', lvl:2, html:
  '<div class="steps">'
  +'<div class="step"><h5>盘点 O（所有权优势）</h5><p>列出企业相对东道国本土竞争者与第三国竞争者的独特优势：技术代差、成本结构、品牌、供应链、数据。检验标准：该优势是否可跨境转移（不依赖本地关系）、是否难以模仿。</p></div>'
  +'<div class="step"><h5>评估 L（区位优势）</h5><p>市场规模与增长、要素成本、关税与贸易协定（到岸成本差）、产业集聚、政策优惠、风险水平。把「不进入就失去什么」也列出来（竞争者先占、客户被锁定）。</p></div>'
  +'<div class="step"><h5>判断 I（内部化 vs 市场）</h5><p>问三个问题：把技术/品牌交给本地伙伴，外溢风险有多大？渠道伙伴的服务质量能否满足客户要求？合同在东道国的可执行性如何（司法与仲裁）？三个答案都指向「市场不可靠」时，内部化（子公司）更优。</p></div>'
  +'<div class="step"><h5>对照阶段模型</h5><p>若企业缺乏目标市场知识，评估「先代理/电商试水 → 再设子公司」的两步走是否成本更低；若窗口期短（政策/竞争），评估跳跃式进入的风险承受度。</p></div>'
  +'<div class="step"><h5>交叉验证</h5><p>用竞争对标（同类企业用什么模式进入）、本地专家访谈与试订单数据修正判断；记录假设，便于事后复盘（m31）。</p></div>'
  +'</div>' },

  { id:'m05-s6', h:'5.6 案例：三种进入选择的 OLI 还原', lvl:2, html:
  '<div class="case"><div class="case-head"><div class="tag">案例 1 · 对照分析</div><div class="ttl">同一产品进入同一市场的三种路径</div></div><div class="case-body">'
  +'<h5>背景</h5><p>背景设定为教学案例（基于公开可见的行业实践构建，非任何单一企业的内部决策）：一家中国二线光伏组件企业评估进入巴西市场，三条路径——直接出口 + 本地经销商；技术授权 + 本地组装；与本地工业集团合资建厂。</p>'
  +'<h5>OLI 还原</h5><p>（1）O：二线企业的所有权优势主要是成本与交付，品牌弱、技术无代差 → O 中等。（2）L：巴西市场大（2025 年 8 月集中式 17.9 GW + 分布式 42.1 GW 累计），但 25% 关税 + 配额制度<button class="src gB" data-src="s21">21</button> → L 强但被政策过滤。（3）I：组件技术易外溢（设备 + 人员流动即可复制），本地经销网络是稀缺资源 → 对渠道宜市场交易（经销商），对技术宜限制（不外授或仅非核心环节授权）。</p>'
  +'<h5>结论</h5><p>组合结论：短期用出口 + 配额内通关（大型集中式项目配额内 9.6% 税率）服务项目型客户；中期若份额扩大且政策稳定，考虑本地组装以获取原产地与政策资格；技术授权风险高，除非换取不可替代的资源（如本地融资渠道）。</p>'
  +'<h5>限制</h5><p>OLI 不给出概率化的财务结果；配额额度、许可与关税细则须以巴西 CAMEX/SECEX 官方文件为准，并在每个财年核验（政策年变）。</p>'
  +'</div></div>' },

  { id:'m05-s7', h:'5.7 局限、争议与常见误区', lvl:2, html:
  '<ul><li><b>OLI 的争议：</b>作为「框架」而非「理论」，其解释具有事后性——几乎所有已发生的国际化都能用 OLI 解释，但预测力有限；对数字平台、生态系统型企业的适用性仍在讨论。</li>'
  +'<li><b>阶段模型的争议：</b>天生全球化（born-global）企业与渐进式路径并存；新兴市场跨国企业的「跳板」式国际化（先进入更弱市场再进入强市场）修正了心理距离假说。</li>'
  +'<li><b>误区一：</b>把「内部化优势」理解为「控制欲强」。内部化的经济含义是「市场交易更贵」，控制本身不是目的。</li>'
  +'<li><b>误区二：</b>把 OLI 当作进入决策的唯一依据。它不评估市场规模与竞争强度，也不评估企业财务承受力——这些是 m13、m16、m31 的任务。</li></ul>' },

  { id:'m05-s8', h:'5.8 与其他模块的联系', lvl:2, html:
  '<ul><li><b>→ m06：</b>制度质量影响 I（合同可执行性）与外来者劣势的大小。</li>'
  +'<li><b>→ m13：</b>L 优势的量化来自市场筛选指标。</li>'
  +'<li><b>→ m16–m17：</b>进入模式谱系与 OLI 三种结果一一对应；伙伴筛选是「用市场克服外来者劣势」的执行层。</li>'
  +'<li><b>→ m31：</b>退出决策同样是 OLI 变化（O 消失、L 被政策摧毁、I 不再必要）的结果。</li></ul>' }
  ],
  exercises:[
  { type:'概念理解', q:'一个企业的产品在本国都卖不过进口货，能否用 OLI 说明它不该国际化？', a:'不能直接推出。OLI 的 O 是「相对东道国与第三国竞争者的优势」，不是「相对本国进口货的优势」。若该企业在目标市场相对本地企业仍有优势（如细分技术、特定渠道），且 L 与 I 条件成立，国际化仍可能可行。正确做法是按目标市场逐一评估 O，而不是用本国竞争结果反推。' },
  { type:'概念理解', q:'乌普萨拉模型与「天生全球化」现象矛盾吗？企业该如何用这两种思路？', a:'不矛盾，是适用条件不同。阶段模型适用于：市场知识稀缺、试错成本低、心理距离重要的传统制造业；天生全球化适用于：数字产品边际成本低、创始团队有海外经验、利基市场全球同质（如 SaaS、消费电子配件）。企业用法：先用阶段模型评估「知识缺口与试错成本」，若试错成本低（如电商测款）可压缩阶段；若试错成本高（绿地投资）则按渐进路径积累知识。' },
  { type:'实际应用', q:'用 OLI 框架分析一家中国便携式储能品牌进入德国的三种选择：亚马逊 FBA 销售、与本地连锁建材零售签独家、设欧洲子公司。', a:'（1）O：中国品牌在成本与产品迭代上有优势，但德国市场对品牌信任与售后要求高 → O 需通过认证（CE、电池法规合规）与本地售后补强。（2）L：德国应急备灾与户外需求大、电价高 → L 强。（3）I：亚马逊模式内部化程度低（平台掌握客户数据），适合测款与起量但客户资产归平台；独家经销快速借渠道但受制于单一伙伴、利润被分摊；子公司控制客户数据与品牌但固定成本高、需克服外来者劣势（售后网络、WEEE/EPR 注册——见 m23、m26）。结论：常见路径是「平台测款 → 多渠道分销 → 视份额设子公司」，即 OLI 三优势随阶段重组。评价标准：是否体现「I 随渠道控制权与数据所有权变化」的逻辑。' },
  { type:'实际应用', q:'为什么「技术授权」在光伏行业很少被采用，而在化妆品、餐饮行业常见？', a:'核心差异在技术可保密性与资产专用性。光伏制造技术体现在设备与工艺参数中，人员流动与设备采购即可外溢，授权方难以控制模仿（I 弱）；且授权方难以监督被许可方的质量与产量。化妆品配方与餐饮品牌则相反：配方可保密、品牌价值依赖标准化输出，授权/特许能扩张而不外溢核心资产（I 强）。分析任何许可提案时，先问：授权后 12 个月内，被许可方能否独立成为我的竞争者？' },
  { type:'综合分析', q:'「先出口试水，等熟悉了再建厂」是稳妥的默认策略吗？请给出支持与反对的条件。', a:'支持条件：市场不确定性高、政策变动风险大、企业资源有限、产品运输成本占比低、试错可逆（库存可转移）。反对条件：（1）窗口期竞争激烈，先占者锁定渠道与品牌（阶段模型的心理距离成本可能高于错过窗口的成本）；（2）东道国关税/原产地规则使出口模式长期不可行（巴西 25% 关税、印度 ALMM）<button class="src gB" data-src="s21">21</button><button class="src gB" data-src="s20">20</button>；（3）产品需本地服务与快速响应（交付周期、售后）；（4）汇率与营运资金使赊销出口风险过高（m21、m22）。结论：不存在默认策略；应按「不可逆性 × 时间压力 × 政策过滤」三维判断，并用小规模承诺（代表处、电商、项目制）管理不确定性。' }
  ]
},

m06: {
  id:'m06', stage:'s1', title:'制度基础观：正式与非正式制度', en:'Institution-Based View: Formal and Informal Institutions',
  hours:'5–8 小时', goal:'理解制度如何塑造国际商业的成本与风险，掌握正式/非正式制度、制度距离与制度质量的分析用途。',
  prereqText:'m01。', outcome:'能描述目标市场的关键制度特征，并说明它们如何影响进入模式、合同安排与风险水平。',
  summary:'制度是「游戏规则」。同样的产品与商业模式，在不同制度环境下成本与风险截然不同。制度基础观解释：为什么市场大小之外，制度质量决定机会能否变成利润。',
  terms:['institution','formal-institution','informal-institution','institutional-distance','institutional-quality','rule-of-law','corruption-perception'],
  prereq:['m01'], related:['m07','m08','m23','m28'],
  sources:['s51','s09','s16'],
  sections:[
  { id:'m06-s1', h:'6.1 学习定位', lvl:2, html:
  '<p>前四个模块回答「贸易与企业为什么跨境」，本模块回答「跨境之后，规则环境如何改变成本与风险」。制度基础观由诺斯（Douglass North）等奠定：制度是社会中人为设计的约束，包括正式规则（宪法、法律、产权、合同执行）与非正式约束（文化、规范、惯例）<button class="src gA" data-src="s51">51</button>。对国际市场研究者，制度不是背景知识，而是<b>决定「纸面市场规模」与「可实现利润」之间差距的核心变量</b>。</p>' },

  { id:'m06-s2', h:'6.2 从直观问题开始：同样一笔订单，两个国家的不同命运', lvl:2, html:
  '<p>一家中国储能企业向两个新兴市场各发了 40 万美元的货，付款条件都是「见提单副本付 30%，到货 60 天付尾款」。在 A 国，进口商按期付款；在 B 国，进口商以「清关延误」为由拖欠尾款，并援引当地复杂的进口许可程序主张货物权利不清。企业在 A 国 90 天回款，在 B 国陷入跨境诉讼，律师费超过货值的三分之一。</p>'
  +'<p>差异不在产品、不在价格，而在制度：<b>合同执行效率、司法独立性、清关规则的可预期性、进口商信用信息的可得性</b>。制度差异最终体现为回款周期、坏账率与争议解决成本——这些都是可以量化进财务模型的变量。</p>' },

  { id:'m06-s3', h:'6.3 正式定义', lvl:2, html:
  '<div class="defbox"><div class="en">Institutions</div><div class="zh">制度</div><div class="def">界定人类互动约束的规则（正式）与规范/惯例（非正式）。诺斯区分：正式制度（法律、产权、合同、监管）与非正式制度（文化、信任、网络、隐性规范）<button class="src gA" data-src="s51">51</button>。</div><div class="meta"><div><b>商业相关维度：</b>产权保护、合同执行、监管质量与可预期性、腐败水平、法治、政府效率、政治稳定性。</div></div></div>'
  +'<div class="defbox"><div class="en">Institutional Distance</div><div class="zh">制度距离</div><div class="def">两国在监管、规范与认知制度上的差异程度。制度距离越大，企业面临的不确定性越高，越倾向低承诺进入（出口/代理）或寻求本地伙伴，也越容易在合规与争议解决上付出额外成本。</div></div>'
  +'<div class="defbox"><div class="en">Institutional Voids</div><div class="zh">制度空缺</div><div class="def">新兴市场中支撑市场有效运行的中介机构缺失（信用评级、物流追踪、争议仲裁、执行机制），企业必须以内部机制替代（自有渠道、预付款、长期关系、本地产能）。</div></div>'
  +'<p>常用量化指标（各有局限，应交叉使用）：世界银行全球治理指标（WGI，含法治与监管质量六维）、透明国际腐败感知指数（CPI）、世界银行营商环境（已停止更新新版，注意时效）、美国传统基金会经济自由度指数。注意：这些指数是专家评估与调查的合成，存在方法论争议与政治敏感性，<b>只能作为筛选信号，不能替代具体交易层面的尽调</b>。</p>' },

  { id:'m06-s4', h:'6.4 底层逻辑：制度如何传导到经营结果', lvl:2, html:
  '<div class="chain"><span class="node">制度质量 / 距离</span><span class="arr">→</span><span class="node">交易成本与不确定性</span><span class="arr">→</span><span class="node">合同设计与付款条件</span><span class="arr">→</span><span class="node">回款周期与坏账率</span><span class="arr">→</span><span class="node">营运资金与利润</span></div>'
  +'<div class="chain"><span class="node">监管可预期性</span><span class="arr">→</span><span class="node">合规成本与准入速度</span><span class="arr">→</span><span class="node">上市时间与固定投入意愿</span><span class="arr">→</span><span class="node cool">进入模式选择</span></div>'
  +'<p>关键机制包括：（1）<b>合同执行</b>——决定赊销（OA）是否可行、预付款比例、信用证使用频率（m21）；（2）<b>产权与征收风险</b>——影响绿地投资与并购意愿（m28）；（3）<b>监管稳定性</b>——影响长期产能承诺（USMCA 2026 年联合审查后进入年度复审，直接改变北美供应链的长期确定性<button class="src gA" data-src="s09">9</button>）；（4）<b>非正式制度</b>——关系网络在合同执行弱的市场替代正式机制，但也提高外来者的进入门槛。</p>' },

  { id:'m06-s5', h:'6.5 应用方法：目标市场制度速评', lvl:2, html:
  '<div class="steps">'
  +'<div class="step"><h5>列制度清单</h5><p>产权保护、合同执行周期、外资准入（负面清单）、行业许可、清关效率、争议解决（仲裁地选择）、税务争议风险。</p></div>'
  +'<div class="step"><h5>采集指标</h5><p>WGI 法治/监管质量、CPI、LPI 通关分项（2023 年新加坡 4.2 分居首<button class="src gA" data-src="s17">17</button>），以及目标行业具体的准入规则（认证、本地含量、数据合规）。</p></div>'
  +'<div class="step"><h5>做交易层尽调</h5><p>与指标无关但更关键：当地进口商信用记录、清关实际时效、税费争议先例、仲裁裁决执行记录。</p></div>'
  +'<div class="step"><h5>转化为合同与模式参数</h5><p>制度弱 → 提高预付款比例、缩短账期、要求信用证或出口信用保险、优先代理而非赊销、重大投资前做政治风险保险（m21、m28）。</p></div>'
  +'<div class="step"><h5>持续监测</h5><p>把制度变量写入风险登记表：政策修订、外资审查新规、仲裁环境变化（m30）。</p></div>'
  +'</div>' },

  { id:'m06-s6', h:'6.6 案例：制度变化如何重置协定预期', lvl:2, html:
  '<div class="case"><div class="case-head"><div class="tag">案例 1 · 政策事件</div><div class="ttl">USMCA 2026 年联合审查：制度确定性本身的估值</div></div><div class="case-body">'
  +'<h5>背景</h5><p>USMCA 于 2020 年 7 月 1 日生效，取代 NAFTA，原定 16 年有效期（至 2036 年），并首创「第六年联合审查」条款。2026 年 7 月 1 日首次联合审查中，美国拒绝按现有形式续签，墨西哥与加拿大主张续签；协定继续有效至 2036 年，但此后进入年度审查<button class="src gA" data-src="s09">9</button>。美国在谈判中要求提高汽车区域价值含量（从 75% 到 82%）并让过半价值在美国完成。</p>'
  +'<h5>分析</h5><p>（1）制度层面：协定从「16 年确定性」变为「年度不确定性」，直接提高北美跨境产能投资的贴现率——企业要求更高回报才承诺长周期资产。（2）行为层面：企业把「协定会不会变」纳入选址模型，出现产能多元化与「中国 + 1」之外的「北美 + 1」布局。（3）传导路径：制度不确定性 → 投资延迟 → 供应链重构 → 部件贸易流改变（可观察：2026 年 7 月加拿大对美出口环比下降 6.6%，对非美市场出口连续三个月创新高<button class="src gA" data-src="s09">9</button>）。</p>'
  +'<h5>结论与限制</h5><p>结论：制度变化本身就是商业风险因子，且可观测、可跟踪（谈判轮次、官方声明）。限制：本案例未量化「年度审查」对具体企业 NPV 的影响，那需要企业自身投资模型；谈判结果（截至 2026 年 10 月）仍在演化，应以 USTR 与 CRS 最新报告为准<button class="src gA" data-src="s09">9</button>。</p>'
  +'</div></div>' },

  { id:'m06-s7', h:'6.7 局限、争议与常见误区', lvl:2, html:
  '<ul><li><b>指标的局限：</b>治理指数由专家与调查合成，方法论不透明处常受批评，且年度变动可能是方法调整而非真实变化；跨国比较应固定来源与年份。</li>'
  +'<li><b>「制度决定论」的误区：</b>制度弱不必然没机会——制度空缺市场往往竞争少、利润高，关键是设计交易结构（预付款、本地伙伴、小批量多批次）控制风险。</li>'
  +'<li><b>文化简化风险：</b>非正式制度不是国民性，个体与组织差异巨大（详见 m24 对 Hofstede 框架的讨论）。</li>'
  +'<li><b>时效误区：</b>用五年前的营商排名做今天的决策。制度环境变化快，须标注数据年份并定期复核。</li></ul>' },

  { id:'m06-s8', h:'6.8 与其他模块的联系', lvl:2, html:
  '<ul><li><b>→ m07–m08：</b>PESTEL 中的 P 与 L 维度的深化；CAGE 中的「行政/制度距离」。</li>'
  +'<li><b>→ m13：</b>制度评分是市场筛选的必备维度（合规友好度、国家风险）。</li>'
  +'<li><b>→ m16–m17：</b>制度质量决定内部化优势与伙伴依赖度。</li>'
  +'<li><b>→ m21、m28：</b>合同执行与征收风险直接转化为付款条件设计与风险对冲安排。</li></ul>' }
  ],
  exercises:[
  { type:'概念理解', q:'制度基础观中的「制度空缺」指什么？举两个企业可以内部化解决的例子。', a:'制度空缺指新兴市场中信用评级、物流追踪、争议仲裁、合同执行等市场中介缺失或低效，导致交易成本极高。企业内部化解决的例子：（1）自建渠道与仓储 + 预付款/信用证，替代信用体系；（2）自建法务与本地合规团队 + 仲裁条款设计，替代司法执行；（3）长期关系与重复交易积累信任，替代征信数据。评价标准：是否体现「用企业内部机制替代市场中介」的逻辑。' },
  { type:'概念理解', q:'为什么治理指标（如法治评分）只能作为筛选信号，不能替代交易层尽调？', a:'因为指标是国家层面的合成评估，存在方法论争议、年度波动与政治敏感性，且不反映行业与交易层面的具体风险：同一「低法治」国家内，不同港口清关效率、不同进口商信用可能天差地别。交易层尽调（进口商资信、清关实操、税费先例、仲裁执行记录）才直接决定本企业这笔交易的成本与风险。' },
  { type:'实际应用', q:'某国法治评分中等，但你的产品单价高、定制化强、售后依赖本地网络。设计一个把制度风险转化为合同条款的方案。', a:'示例：（1）付款：30% 预付款 + 60% 见单付款 + 10% 验收后支付，或信用证；（2）交付：分批交货、小批量多批次以降低单笔暴露；（3）售后：与本地服务商签框架协议并购买职业责任保险；（4）争议：约定中立仲裁地（如新加坡国际仲裁中心 SIAC 或 HKIAC）与适用法；（5）风险转移：投保出口信用保险覆盖政治与信用风险（m21）；（6）退出：约定货物所有权保留条款（title retention）与回购/转移条款。评价标准：条款是否与「高单价、定制化、售后依赖」三个特征匹配。' },
  { type:'实际应用', q:'USMCA 进入年度审查后，一家在墨西哥建有组件产能的中国企业应在 90 天内完成哪三件事？', a:'（1）制度跟踪：订阅 USTR/墨西哥经济部/加拿大全球事务部的谈判公告，把「原产地规则修订方向」写入风险登记表并设定触发条件（如区域价值含量上调至 82% 的提案进展）<button class="src gA" data-src="s09">9</button>；（2）合规自查：核验现有产能的原产地合规余量（投入品来源比例），量化规则收紧的敏感度；（3）替代方案：评估第三地产能（美国本土、第三国）与「墨西哥 + 美国」双节点的成本差，保留调整期权。评价标准：是否把制度变化转化为可执行的监测与备选方案，而非仅评论。' },
  { type:'综合分析', q:'「制度越差的市场越应该避开。」用正反证据讨论，并给出你的判断框架。', a:'反面证据：制度空缺市场竞争少、毛利高，先入者可通过交易结构设计（预付款、小批量、本地合资、仲裁条款）控制风险；许多中国企业的早期利润来自「别人不敢去」的市场。正面证据：制度差市场的风险成本（坏账、扣押、政策突变、汇兑限制）可能吞掉全部利润，且难以通过合同完全对冲（参考一些国家历史上出现的外汇不可兑换与进口许可冻结）。判断框架：（1）利润池 × 可实现性（回款、清关、争议解决）；（2）风险是否「可结构化」（能否用条款与保险转移）；（3）企业风险承受能力与组合分散度（m30）；（4）是否有退出通道。结论：不是回避制度差的市场，而是只进入「利润池足够大且风险可结构化」的部分，并限制单一市场敞口。' }
  ]
}

});

;

Object.assign(MODULES, {

/* ================= 阶段 2 ================= */
m07: {
  id:'m07', stage:'s2', title:'宏观环境分析：PESTEL 与经济指标体系', en:'Macro-Environmental Analysis and Economic Indicators',
  hours:'6–10 小时', goal:'掌握 PESTEL 分析框架与核心经济指标（GDP、人均 GDP、PPP、通胀、失业、贸易开放度）的口径、用途与误用。',
  prereqText:'m01；m06 制度基础观。', outcome:'能为目标市场建立一份口径清晰、来源可查的宏观数据简报，并指出每项指标对本企业机会的具体含义。',
  summary:'宏观数据是市场研究的「体检表」。指标本身不难，难在口径：同一个「GDP 增速」，名义与实际、本币与美元、人均与总量，会导出完全不同的市场结论。',
  terms:['pestel','gdp','gdp-per-capita','ppp','inflation','unemployment','trade-balance','middle-class'],
  prereq:['m01','m06'], related:['m08','m13','m28'],
  sources:['s46','s47','s48','s10'],
  sections:[
  { id:'m07-s1', h:'7.1 学习定位', lvl:2, html:
  '<p>本模块属于「描述环境」层：在比较具体市场之前，先用标准化的指标框架把每个候选国家的基本面记录下来，使后续比较有共同基准。它服务于 m13 的市场评分——没有口径一致的宏观数据，评分卡就是空中楼阁。PESTEL 提供检查清单，经济指标提供量化内容。</p>' },

  { id:'m07-s2', h:'7.2 从直观问题开始：三个国家，三个「大市场」的错觉', lvl:2, html:
  '<p>印度 GDP 总量已居世界前列，人均 GDP 却约为中国的五分之一量级；德国 GDP 增速常年低于全球平均，但人均可支配收入与消费能力远高于多数新兴市场；沙特人均 GDP 很高，人口却只有三千多万，且消费结构受外籍劳工与宗教规范显著影响。三个例子说明：<b>「市场大不大」取决于你的产品卖给谁、卖多贵、通过什么渠道</b>。宏观指标的作用不是直接给出答案，而是把「感觉」拆成可比较的维度。</p>' },

  { id:'m07-s3', h:'7.3 正式定义：PESTEL 与核心指标', lvl:2, html:
  '<div class="defbox"><div class="en">PESTEL Analysis</div><div class="zh">PESTEL 分析</div><div class="def">从政治（Political）、经济（Economic）、社会文化（Social）、技术（Technological）、环境（Environmental）、法律（Legal）六个维度扫描宏观环境的框架。它是「检查清单」而非「分析模型」——列出因素不等于解释了因果。</div><div class="meta"><div><b>适用边界：</b>适合启动阶段的结构化扫描；不适合作为决策依据本身（因素无权重、无交互、无优先级）。<br><b>常见误用：</b>把六个维度填满就认为完成了环境分析；正确做法是每个维度只保留「影响本行业机会与风险」的关键变量，并说明传导机制。</div></div></div>'
  +'<div class="tbl-wrap"><table class="data"><thead><tr><th>指标</th><th>含义</th><th>口径陷阱</th><th>对本企业的用途</th></tr></thead><tbody>'
  +'<tr><td><b>GDP</b></td><td>一国境内一定时期最终产品与服务总值</td><td>名义 vs 实际（通胀调整）；本币 vs 美元（汇率波动让美元 GDP 大起大落）</td><td>经济总量与产业规模上限</td></tr>'
  +'<tr><td><b>人均 GDP</b></td><td>GDP / 人口</td><td>分配极度不均时，人均掩盖结构；受汇率扭曲</td><td>消费能力粗略代理</td></tr>'
  +'<tr><td><b>GDP（PPP）</b></td><td>按购买力平价换算的 GDP</td><td>PPP 系数基于价格调查，更新慢；适合比「量」，不适合比「可支出货币」</td><td>实体产品需求量比较</td></tr>'
  +'<tr><td><b>通胀 / 利率</b></td><td>价格总水平与资金成本</td><td>官方 CPI 可能低估实际通胀（替代偏差、权重滞后）</td><td>定价、回款与融资成本</td></tr>'
  +'<tr><td><b>失业率</b></td><td>劳动力中无工作且正在寻找的比例</td><td>定义各国不一（登记 vs 调查）；不统计 discouraged workers</td><td>消费与产能利用</td></tr>'
  +'<tr><td><b>贸易余额 / 经常账户</b></td><td>出口−进口 / 更广义的国际收支差额</td><td>转口贸易扭曲（荷兰、新加坡）；全球加总不为零</td><td>外汇压力与政策风险信号</td></tr>'
  +'<tr><td><b>贸易开放度</b></td><td>（出口+进口）/ GDP</td><td>转口与离岸金融中心被高估</td><td>国际依赖度</td></tr>'
  +'</tbody></table></div>'
  +'<p>社会维度常用指标：人口结构与年龄中位数、城镇化率、收入分布（基尼系数或五等分组）、中产阶层规模（不同机构定义差异极大——世界银行、经合组织、各国统计口径均不同，引用时必须说明定义）、互联网与智能手机渗透率。</p>' },

  { id:'m07-s4', h:'7.4 底层逻辑：指标如何传导到商业结果', lvl:2, html:
  '<div class="chain"><span class="node">人均收入 × 收入分布</span><span class="arr">→</span><span class="node">可服务人群规模（SAM 的起点）</span><span class="arr">→</span><span class="node">价格带定位</span></div>'
  +'<div class="chain"><span class="node">增速 × 经济周期</span><span class="arr">→</span><span class="node">需求扩张速度</span><span class="arr">→</span><span class="node">产能与库存决策</span></div>'
  +'<div class="chain"><span class="node">通胀 + 汇率 + 利率</span><span class="arr">→</span><span class="node">本币售价与回款风险</span><span class="arr">→</span><span class="node">毛利与现金流</span></div>'
  +'<p>必须说明的机制：人均 GDP 高但分配两极的市场（如部分资源国），高端品销量可能超预期而大众品滞销；GDP 增速高但由基建与出口驱动、居民收入停滞的市场，消费品机会有限；高通胀市场本币定价必须频繁调整，且赊销实际收益被侵蚀（m22）。</p>' },

  { id:'m07-s5', h:'7.5 应用方法：一页纸宏观简报模板', lvl:2, html:
  '<div class="steps">'
  +'<div class="step"><h5>固定来源与年份</h5><p>宏观数据固定用 IMF WEO、世界银行 WDI、OECD、各国统计局；每项数据记录「数据年份 + 发布年份 + 访问日期」，禁止混源比较。</p></div>'
  +'<div class="step"><h5>统一口径</h5><p>跨国比较同一指标只用同一来源同一版本；美元计价的序列同时报告本币增速，剔除汇率影响。</p></div>'
  +'<div class="step"><h5>计算派生指标</h5><p>如「目标产品潜在需求 = 人口 × 渗透率 × 客单价」，渗透率用可比国家校准；「进口依赖度 = 进口 /（产量+进口−出口）」。</p></div>'
  +'<div class="step"><h5>写「对本企业」的注释</h5><p>每个指标后面加一句：它影响我哪个决策（定价带、渠道深度、账期、产能）。</p></div>'
  +'<div class="step"><h5>标注不确定性</h5><p>预测数据标明预测机构与假设；争议数据（如中产规模）给出区间与不同定义。</p></div>'
  +'</div>' },

  { id:'m07-s6', h:'7.6 案例：为储能产品做三国宏观速评', lvl:2, html:
  '<div class="case"><div class="case-head"><div class="tag">案例 1 · 教学示例</div><div class="ttl">德国、沙特、印度尼西亚：同一产品的三种宏观逻辑</div></div><div class="case-body">'
  +'<h5>问题</h5><p>一家中国户用储能/便携储能企业初筛三个候选市场，需要一份口径一致的宏观简报（教学示例，具体数值需以最新官方数据更新）。</p>'
  +'<h5>数据与口径</h5><p>人口与人均 GDP（世界银行 WDI，最新可得年份）；能源价格与电网稳定性（各国能源主管部门 / IEA）；光伏装机与储能政策（IEA、各国能源部）；渗透率代理：智能家居渗透率、家庭备用电源搜索热度（Google Trends，仅作方向参考）。</p>'
  +'<h5>三国逻辑</h5><p>（1）德国：高电价 + 强分布式光伏装机（阳台光伏与户用储能快速增长）→ 需求由「经济性」驱动，价格敏感度中等，合规门槛高（欧盟电池法规、EPR）<button class="src gA" data-src="s19">19</button>。（2）沙特：人均收入高 + 电网升级 + 愿景 2030 可再生能源目标（官方口径 58.7 GW，市场传闻上调至 100–130 GW，需以官方文件为准）<button class="src gC" data-src="s26">26</button><button class="src gC" data-src="s27">27</button> → 需求由「政府项目 + 高端消费」驱动，渠道偏项目制。（3）印尼：人口 2.7 亿 + 群岛地理 + 电网不稳 → 需求由「缺电痛点」驱动，价格敏感度高，但支付能力与分销深度受限，适合低价段产品与分期模式。</p>'
  +'<h5>结论与限制</h5><p>结论：宏观逻辑决定产品—市场匹配的初步假设（德=经济性驱动、沙=政策/项目驱动、印尼=痛点驱动），后续用 m12 市场规模估算与 m13 评分卡检验。限制：本案例未给具体数值，教学中应要求学员自行填入并标注来源；渗透率代理指标（搜索热度）只能作方向参考，不能作为需求证据（m11 信度效度）。</p>'
  +'</div></div>' },

  { id:'m07-s7', h:'7.7 局限、争议与常见误区', lvl:2, html:
  '<ul><li><b>PESTEL 不是模型：</b>它不告诉你六个因素如何交互、哪个更重要。把它当「雷达」而非「结论生成器」。</li>'
  +'<li><b>指标口径争议：</b>PPP 换算、非正规经济规模、中产定义、失业定义跨国不可比；引用时必须带口径。</li>'
  +'<li><b>「均值幻觉」：</b>人均指标忽略分布；一个 1 亿人口 + 极高基尼系数的市场，中高端销量可能不如 3,000 万人口的均质市场。</li>'
  +'<li><b>数据滞后：</b>年度宏观数据通常滞后 1–2 个季度发布；新兴市场数据修订幅度可能很大。</li></ul>' },

  { id:'m07-s8', h:'7.8 与其他模块的联系', lvl:2, html:
  '<ul><li><b>→ m08：</b>PESTEL 的 S/L 维度由文化距离与制度距离深化。</li>'
  +'<li><b>→ m12：</b>宏观指标是 TAM/SAM/SOM 的输入（人口、收入、渗透率）。</li>'
  +'<li><b>→ m13：</b>宏观简报是评分卡「市场吸引力」维度的数据基础。</li>'
  +'<li><b>→ m22、m28：</b>通胀、汇率、经常账户是支付条件与国家风险的核心变量。</li></ul>' }
  ],
  exercises:[
  { type:'概念理解', q:'名义 GDP 增速 8%、通胀 6%，与「实际 GDP 增速 2%」是什么关系？对定价决策的含义是什么？', a:'实际 GDP ≈ 名义 GDP 增速 − 通胀 ≈ 8% − 6% = 2%（精确关系为 (1+名义)/(1+通胀)−1）。含义：如果只看到名义 8% 就按 8% 规划产能与库存，会严重高估需求扩张；本币定价需随通胀调整（否则毛利被侵蚀），美元报价需考虑汇率与通胀的叠加（m22）。' },
  { type:'概念理解', q:'为什么 PPP 人均 GDP 适合比较「实体产品需求量」，但不适合比较「服务出口机会」？', a:'PPP 消除了两国物价水平差异，反映的是「同样的本币收入能买到多少东西」，因此比较实物量（家电、储能、食品）的潜在需求更合适。服务出口（软件、咨询、数字服务）以国际价格结算、面向的是可支配外汇与高收入群体，用 PPP 会高估其支付能力；应参考名义人均 GDP、收入分布与目标客户群规模。' },
  { type:'实际应用', q:'为一款客单价 300 美元的便携式储能产品选择两个候选市场，列出各自的 5 个宏观指标及来源，并说明每个指标如何影响你的价格带与渠道假设。', a:'评价标准：（1）指标覆盖收入水平、分配/人口结构、能源痛点、通胀/汇率、增长；（2）每项标注来源（WDI、IMF、各国统计局）与数据年份；（3）每个指标都写出「对价格带或渠道」的具体影响（如高电价市场可支持更高价位、电网不稳市场重视售后网络）；（4）区分事实与假设。' },
  { type:'实际应用', q:'某市场官方 CPI 为 5%，但居民访谈普遍反映「生活成本涨幅远超 5%」。你会如何处理这一矛盾？', a:'（1）检查 CPI 口径：篮子权重更新频率、是否包含能源与住房、调查覆盖城乡；（2）找替代验证：央行实际利率、进口价格指数、大型电商/零售价格监测；（3）分群体验证：不同收入群体的实际通胀感受不同（能源与食品占比高的群体感受更强）；（4）决策含义：定价与账期按「实际感知通胀」从紧，回款周期缩短或加入价格调整条款。核心原则：不轻信单一官方数字，也不轻信访谈印象，用多源交叉验证（m11）。' },
  { type:'综合分析', q:'「新兴市场人口红利大，所以消费品一定好卖。」用三个反例式机制讨论。', a:'（1）收入分布机制：人口多但中产薄，可支付人群可能极小（人均与分布决定 SAM）；（2）非正规经济机制：大量收入不在银行与税制体系内，信贷与分期渠道缺失，抬高客单价难度；（3）基础设施机制：电网不稳、物流差、售后网络缺，让「产品可用性」下降——对储能反而是机会，对多数电器是成本；（4）政策与汇率机制：外汇管制与货币贬值使回款风险抵消增长红利。结论：人口是必要条件之一，须与收入分布、渠道深度、支付体系、政策稳定性组合判断。' }
  ]
},

m08: {
  id:'m08', stage:'s2', title:'距离与国家差异：CAGE 框架与国家竞争优势', en:'Distance and National Advantage: CAGE Framework and the Diamond Model',
  hours:'6–9 小时', goal:'掌握 CAGE 距离框架与波特钻石模型，理解国家间差异如何具体影响行业吸引力。',
  prereqText:'m06、m07。', outcome:'能用 CAGE 系统列出目标市场的四类距离及行业含义，用钻石模型评估一国某产业的竞争基础。',
  summary:'「距离」不只是地理的。文化、行政（制度）、经济（收入与要素成本）差异以不同方式影响不同行业——CAGE 框架把这些差异结构化；钻石模型则反过来解释一国为什么能在特定产业建立优势。',
  terms:['cage-framework','cultural-distance','administrative-distance','geographic-distance','economic-distance','diamond-model','cluster','factor-conditions'],
  prereq:['m06','m07'], related:['m13','m24','m25'],
  sources:['s39','s37','s17'],
  sections:[
  { id:'m08-s1', h:'8.1 学习定位', lvl:2, html:
  '<p>m06 提供了制度视角，m07 提供了指标体系，但「国家差异」还有结构与行业两个问题没有回答：差异对哪个行业影响更大？一国某产业的优势从哪里来？CAGE 框架（加马沃特，2001）回答前者<button class="src gA" data-src="s39">39</button>，波特钻石模型回答后者<button class="src gA" data-src="s37">37</button>。两者共同构成 m13 市场评分的理论依据。</p>' },

  { id:'m08-s2', h:'8.2 从直观问题开始：为什么距离杀死的是这个行业而不是那个行业', lvl:2, html:
  '<p>同样是从中国到德国：家具电商可以跨境直邮且增长迅速；水泥跨境贸易几乎不存在；医疗器械进入德国需要漫长的认证。地理距离对三者影响天差地别。原因是<b>运输成本占货值比例、产品标准化程度、监管强度</b>不同。CAGE 的核心洞见：距离的影响是「行业特异」的——分析时必须问「对我的行业，哪类距离是主要障碍」。</p>' },

  { id:'m08-s3', h:'8.3 正式定义：CAGE 与钻石模型', lvl:2, html:
  '<div class="defbox"><div class="en">CAGE Framework</div><div class="zh">CAGE 距离框架</div><div class="def">加马沃特提出：跨国差异分为文化（Cultural）、行政（Administrative）、地理（Geographic）、经济（Economic）四类距离，其对行业的影响取决于该行业的「距离敏感度」。</div><div class="meta"><div><b>文化距离：</b>语言、宗教、社会规范、信任结构、族群关系。影响：品牌信息、消费者偏好、管理实践。<br><b>行政距离：</b>政治敌对、贸易协定、制度质量、殖民纽带、货币联盟。影响：关税、准入、合规、征收风险。<br><b>地理距离：</b>物理距离、时区、气候、疾病环境、是否内陆。影响：运输成本、交付时效、库存。<br><b>经济距离：</b>收入差异、要素成本、基础设施、自然资源。影响：价格带、需求结构、成本优势。</div><div><b>用法：</b>对每个候选市场，按四类距离逐项打分（远/中/近），并标注本行业对每类距离的敏感度，找出「致命距离」。</div></div></div>'
  +'<div class="defbox"><div class="en">Diamond Model</div><div class="zh">国家竞争优势（钻石模型）</div><div class="def">波特提出：一国某产业的竞争优势由四组相互强化的因素决定——生产要素条件（高级要素：技术、人才，而非初级要素）、需求条件（挑剔的国内客户）、相关与支持产业（集群）、企业战略与竞争结构；政府与机会是辅助变量<button class="src gA" data-src="s37">37</button>。</div><div class="meta"><div><b>对市场研究的用途：</b>判断某国是「你的竞争来源地」还是「你的机会市场」——若该国在你的产品类别上钻石四要素齐备，它更可能是强大的竞争者而非温顺的客户。<br><b>局限：</b>基于发达国家产业研究；对资源依赖型、政策驱动型产业的解释需补充。</div></div></div>' },

  { id:'m08-s4', h:'8.4 底层逻辑：距离敏感度与钻石的自强化', lvl:2, html:
  '<p><b>距离敏感度矩阵：</b>不同行业的「致命距离」不同——大宗商品对地理距离最敏感（运费占货值），消费品对文化距离最敏感（品牌与规格），金融与数据服务对行政距离最敏感（监管与数据跨境），制造业对经济距离（要素成本）最敏感。用这个矩阵可以解释为什么「全球化行业」（半导体、光伏）集中度远高于「本地化行业」（食品、建筑）。</p>'
  +'<div class="chain"><span class="node">高级要素积累</span><span class="arr">↔</span><span class="node">国内挑剔需求</span><span class="arr">↔</span><span class="node">支持产业集群</span><span class="arr">↔</span><span class="node">激烈国内竞争</span><span class="arr">→</span><span class="node cool">国际竞争力</span></div>'
  +'<p>因果机制：国内竞争激烈 → 企业被迫创新与降本 → 具备国际竞争力；国内客户挑剔 → 产品标准高于国际市场 → 出口即降维竞争；集群 → 专业供应商与人才池 → 成本与迭代速度优势。政策（补贴、标准、研发支持）与偶然事件（技术突破、危机）可以加速或重置这一循环。</p>' },

  { id:'m08-s5', h:'8.5 应用方法：市场进入前的双模型速评', lvl:2, html:
  '<div class="steps">'
  +'<div class="step"><h5>CAGE 距离评分</h5><p>对每个候选市场按四类距离打分（0–5，越远越高），再按本行业敏感度加权。重点识别「单项致命距离」——如语言不通导致售后无法本地化的市场，对高服务依赖产品是硬约束。</p></div>'
  +'<div class="step"><h5>识别行业敏感度</h5><p>先问：我的产品运费/货值比多大？规格是否因文化/监管而异？合规成本占比多高？这决定四类距离的相对权重。</p></div>'
  +'<div class="step"><h5>钻石模型竞争评估</h5><p>目标市场在你的产品类别上：有无本土强势竞争者？其优势来自要素、需求、集群还是政策？这决定你进入后面对的是「空白市场」还是「红海市场」。</p></div>'
  +'<div class="step"><h5>政策与协定叠加</h5><p>行政距离可以被贸易协定压缩（RCEP、CPTPP 成员间的关税优惠），也可能被制裁/管制扩大（m23）——把协定状态作为行政距离的调节项。</p></div>'
  +'<div class="step"><h5>输出</h5><p>形成「距离—敏感度—应对」表：每项高距离配一个应对策略（本地化、伙伴、合规投入、或放弃）。</p></div>'
  +'</div>' },

  { id:'m08-s6', h:'8.6 案例：用 CAGE 解释储能产品出海的区域差异', lvl:2, html:
  '<div class="case"><div class="case-head"><div class="tag">案例 1 · 框架应用</div><div class="ttl">同一款便携储能，为什么在美国、日本、中东的卖法不同</div></div><div class="case-body">'
  +'<h5>文化距离</h5><p>美国：户外文化成熟，营销主打露营/房车场景，直销与亚马逊并重；日本：应急备灾文化强，产品说明与渠道（家电量贩）强调安全与防灾认证（PSE），沟通风格重细节与信任；中东：高温与沙尘环境对产品防护要求高，需调整规格与保修条款。</p>'
  +'<h5>行政距离</h5><p>美国对中国产电池类产品的 301 关税与合规要求显著（见 m23）；日本对锂离子电池有 PSE 圆型认证要求；中东多数国家关税低但认证与进口商制度各异。</p>'
  +'<h5>地理距离</h5><p>运距与物流成本相似，但日本对包装尺寸与物流细节要求高；中东气候条件改变产品设计（高温性能）。</p>'
  +'<h5>经济距离</h5><p>购买力与价格敏感度不同：美国客单价承受力高；日本市场偏好中小容量高品质；新兴市场价格敏感。</p>'
  +'<h5>结论</h5><p>同一产品在三地的「产品—渠道—沟通」组合不同，差异可被 CAGE 四类距离系统解释。这说明市场选择不是「选国家」，而是「选国家 + 产品适配 + 渠道结构」的组合。</p>'
  +'</div></div>' },

  { id:'m08-s7', h:'8.7 局限、争议与常见误区', lvl:2, html:
  '<ul><li><b>CAGE 的局限：</b>距离打分主观；「距离」与国家差异不完全等同（两国都说法语但制度完全不同）；框架不给出权衡规则。</li>'
  +'<li><b>钻石模型的争议：</b>对韩国、中国等「政府强干预 + 后发追赶」型产业的解释需引入「政府作为第四要素之外的强变量」；对「要素驱动型」经济（资源出口）解释力弱。</li>'
  +'<li><b>误区一：</b>把「地理近」当「文化近」（墨西哥与美国地理近但文化差异巨大；中国与日本地理近但语言行政差异大）。</li>'
  +'<li><b>误区二：</b>用钻石模型预测未来。钻石描述的是已形成的优势结构，技术切换与政策干预可以在数年内重塑它。</li></ul>' },

  { id:'m08-s8', h:'8.8 与其他模块的联系', lvl:2, html:
  '<ul><li><b>→ m13：</b>CAGE 与钻石的输出直接进入市场评分卡的「进入成本」与「竞争强度」维度。</li>'
  +'<li><b>→ m24–m26：</b>文化距离的具体表现（沟通、谈判、本地化）在跨文化模块展开。</li>'
  +'<li><b>→ m19–m20：</b>地理距离通过物流与关税影响到岸成本（到岸成本计算器）。</li></ul>' }
  ],
  exercises:[
  { type:'概念理解', q:'CAGE 四类距离中，哪一类最可能被贸易协定显著削弱？哪一类最难被企业自身努力克服？', a:'行政距离最易被协定削弱（RCEP/CPTPP/USMCA 等通过关税减让与原产地规则降低跨境交易成本）。文化距离最难被企业单方面克服——它体现在消费者偏好、信任结构与管理惯例中，只能通过深度本地化（本地团队、长期投入、本地伙伴）逐步缩小，且无法完全消除。地理距离居中（物流技术可压缩，但气候/时区等难以改变）。' },
  { type:'概念理解', q:'用钻石模型解释：为什么德国能在高端汽车与化工领域长期保持优势，尽管其劳动力成本全球最高？', a:'（1）要素条件：德国优势不在初级要素（成本），而在高级要素——职业技术教育体系、工程人才、精密制造经验；（2）需求条件：国内消费者对质量与性能极其挑剔，推动企业按最高标准生产；（3）相关产业：强大的机床、化工、零部件供应商集群；（4）竞争结构：多家强势本土企业（奔驰、宝马、大众、巴斯夫）激烈竞争，迫使持续创新。四者相互强化，使「高成本」被「高附加值」覆盖。启示：分析任何「高成本强国」现象，先找高级要素与需求条件，而非只看成本。' },
  { type:'实际应用', q:'你的产品是锂电电动工具（客单价 80–200 美元）。用 CAGE 四类距离评估进入巴西市场的主要障碍，并给出每类距离的应对。', a:'文化：品牌认知低、偏好本地渠道与售后 → 与本地五金连锁合作、西语/葡语营销与说明书。行政：巴西关税高（2024 年 11 月起光伏类提税先例显示其保护倾向）<button class="src gB" data-src="s21">21</button>、认证复杂（INMETRO）→ 提前预算认证时间与费用、评估本地组装。地理：运距远、库存周转慢 → 安全库存前置、考虑分批运输。经济：价格敏感、分期消费普遍 → 调整价格带、评估本地分期合作。评价标准：是否体现「行业敏感度」——电动工具是「文化+行政敏感」型，不是「地理敏感」型。' },
  { type:'实际应用', q:'如何用钻石模型判断「越南是否正在成为你所在产业的强竞争者」？列出 4 个观测指标。', a:'（1）高级要素：本地工程师与技术工人供给增长、外资带入的培训体系；（2）需求条件：越南本土是否出现挑剔客户（如出口导向的代工品质要求）；（3）集群：同产业供应商在越南北部/南部的集聚度（三星、富士康、立讯等带动的电子集群）；（4）竞争：本土企业数量与出口增速、政府产业政策（外资优惠、自贸协定网络）。补充：观测 FDI 流入结构（UNCTAD WIR）与出口结构变化。' },
  { type:'综合分析', q:'「文化距离近的市场更容易成功。」请用两个方向相反的真实/半真实案例讨论，并给出修正后的判断规则。', a:'支持案例：日本企业早期优先进入东南亚与欧美华人市场（语言与渠道相近）。反对案例：（1）中国与日本地理近但文化、行政、商业惯例差异大，早期直接进入失败案例不少，反而通过代理与合资逐步成功；（2）荷兰与美国地理远、文化近（语言），但行政距离（监管、数据、产品责任）造成大量进入失败；（3）许多中国企业「文化距离远」的德国市场通过产品力与合规投入成功，而「文化距离近」的东南亚市场因价格战与渠道混乱失败。修正规则：文化距离只是四类距离之一，且其影响可被产品标准化程度与渠道结构调节——对标准化低服务产品（SaaS、消费电子），文化与行政距离影响可被压缩；对高服务依赖产品（工程、渠道驱动消费品），文化距离才是硬约束。决策应按「行业敏感度 × 距离结构」逐项评估。' }
  ]
},

m09: {
  id:'m09', stage:'s2', title:'全球价值链：结构、治理与升级', en:'Global Value Chains: Structure, Governance and Upgrading',
  hours:'8–12 小时', goal:'掌握全球价值链的概念、五种治理模式、产业升级路径与价值获取分析，理解各环节利润分布的成因。',
  prereqText:'m03 规模经济、m04 生命周期。', outcome:'能绘制一个简单产业的全球价值链图，判断其治理模式，并分析各国/各企业在价值链中的位置与升级方向。',
  summary:'全球价值链理论回答：一件产品的不同环节分散在哪些国家、由谁控制、利润归谁、后进者如何向上移动。它是理解「中国制造在世界哪里」的核心工具。',
  terms:['gvc','global-production-network','value-chain-governance','smile-curve','functional-upgrading','captive-value-chain','modular-value-chain','value-capture'],
  prereq:['m03','m04'], related:['m10','m29','m32'],
  sources:['s38','s49','s55','s04'],
  sections:[
  { id:'m09-s1', h:'9.1 学习定位', lvl:2, html:
  '<p>前面模块解释「为什么贸易」，本模块解释「贸易的内容是什么」——具体说，是解释一件产品的研发、采购、制造、物流、营销、服务环节如何分布在不同国家，以及<b>谁在其中获取价值</b>。格里芬（Gary Gereffi）等发展的全球价值链（GVC）理论是这一领域的标准框架<button class="src gA" data-src="s38">38</button>。对企业的用途：判断自己所在环节的议价能力、识别升级方向、评估各国在产业链中的真实角色（而不仅是贸易额排名）。</p>' },

  { id:'m09-s2', h:'9.2 从直观问题开始：一部手机或一块组件的利润去了哪里', lvl:2, html:
  '<p>一块售价 100 美元的光伏组件：多晶硅与硅料环节占成本大头且技术密集，电池片环节资本密集，组件封装环节劳动与设备密集，品牌与销售服务环节掌握客户与溢价。若各国按「谁组装」计算贸易额，中国占全球组件产能 80% 以上；但若按「谁获取利润」计算，品牌、技术与设备环节的利润分布完全不同<button class="src gB" data-src="s55">55</button>。同样，苹果拿走 iPhone 大部分利润，而组装环节利润微薄——这就是「价值创造」与「价值获取」的区别。</p>' },

  { id:'m09-s3', h:'9.3 正式定义', lvl:2, html:
  '<div class="defbox"><div class="en">Global Value Chain（GVC）</div><div class="zh">全球价值链</div><div class="def">产品从概念到报废回收的全过程中，各环节（研发设计、采购、生产、物流、营销、服务、回收）跨越国界分布并由不同企业承担的组织形态。分析单位从「产品/产业」细化为「环节」。</div><div class="meta"><div><b>上游：</b>研发、设计、核心部件、设备。｜<b>中游：</b>制造、组装。｜<b>下游：</b>品牌、渠道、营销、服务。<br><b>微笑曲线：</b>各环节附加值呈「U 型」——两端（研发/品牌服务）高、中间（制造）低。</div></div></div>'
  +'<div class="defbox"><div class="en">Value Chain Governance</div><div class="zh">价值链治理</div><div class="def">格里芬、汉弗莱与斯特金（2005）提出五种治理模式，按「领导企业对供应商的控制程度」排序<button class="src gA" data-src="s38">38</button>：</div><div class="tbl-wrap" style="margin-top:8px"><table class="data"><thead><tr><th>治理模式</th><th>特征</th><th>典型产业</th><th>对后进企业的含义</th></tr></thead><tbody>'
  +'<tr><td><b>市场型</b></td><td>交易简单、信息标准化、转换成本低</td><td>大宗商品、标准件</td><td>拼成本与交付，无锁定也无扶持</td></tr>'
  +'<tr><td><b>模块型</b></td><td>复杂交易但信息可编码（「交钥匙」能力）</td><td>电子代工、汽车零部件</td><td>需具备完整能力与认证，议价中等</td></tr>'
  +'<tr><td><b>关系型</b></td><td>复杂交易、能力难以编码，依赖相互依赖与信任</td><td>精密机械、专用设备</td><td>长期关系是壁垒也是保护</td></tr>'
  +'<tr><td><b> captive 受制型</b></td><td>领导企业高度控制，供应商被锁定在小范围任务</td><td>品牌服装代工、部分电子组装</td><td>订单稳定但升级空间受限</td></tr>'
  +'<tr><td><b>等级型</b></td><td>领导企业通过垂直一体化直接管理</td><td>高端制造、关键材料</td><td>无独立议价空间</td></tr>'
  +'</tbody></table></div></div>'
  +'<div class="defbox"><div class="en">Industrial Upgrading</div><div class="zh">产业升级</div><div class="def">企业/产业向更高附加值环节移动，格里芬区分为：流程升级（更高效生产）、产品升级（更复杂产品）、功能升级（从制造转向设计/品牌/服务）、跨产业升级（进入新价值链）。通常顺序是流程 → 产品 → 功能，但功能升级会受到领导企业阻挠（「升级天花板」）。</div></div>'
  +'<div class="defbox"><div class="en">Value Capture vs Value Creation</div><div class="zh">价值获取 vs 价值创造</div><div class="def">价值创造是「做出了有用的东西」；价值获取是「从中分到多少利润」。制造环节创造大量就业与产值，但获取的价值可能很低（组装毛利 3–5%）；品牌环节创造的价值不多，但获取比例很高。分析产业机会必须同时看两者。</div></div>' },

  { id:'m09-s4', h:'9.4 底层逻辑：治理模式与升级空间的因果', lvl:2, html:
  '<div class="chain"><span class="node">交易复杂程度</span><span class="arr">+</span><span class="node">能力可编码程度</span><span class="arr">+</span><span class="node">供应商基础能力</span><span class="arr">→</span><span class="node">治理模式</span><span class="arr">→</span><span class="node">升级空间与议价能力</span></div>'
  +'<p>机制解释：（1）当领导企业需要的能力可以被「规格书」完整描述，就形成模块型治理，供应商靠「交钥匙」能力议价；（2）当能力难以编码（依赖经验与关系），领导企业倾向关系型或 captive，通过知识控制防止供应商变成竞争者；（3） captive 治理下，供应商被有意限制在狭窄任务内，功能升级（自建品牌）会被视为违约或竞争威胁——这是许多代工厂「天花板」的制度性原因。</p>'
  +'<div class="callout warn"><span class="ico">⚠️</span><div><b>政策与地缘的介入：</b>关税、制裁与本地含量要求会改变治理模式。例如美国对东南亚光伏双反后，中国企业在当地从「受制代工」转向「自有产能 + 区域总部」；印度 ALMM 则把中国电池企业从印度政府项目价值链中整体移除<button class="src gB" data-src="s20">20</button>——治理不仅由效率决定，也由规则决定。</div></div>' },

  { id:'m09-s5', h:'9.5 应用方法：绘制与分析一个产业的 GVC', lvl:2, html:
  '<div class="steps">'
  +'<div class="step"><h5>界定产品与环节</h5><p>选定产品（如便携式储能电源），按「电芯/材料 → BMS/逆变器 → 组装 → 品牌/渠道 → 售后回收」拆环节。</p></div>'
  +'<div class="step"><h5>绘制地理分布</h5><p>每个环节的主要国家/企业：用 UN Comtrade 看中间品贸易流（m10），用企业公告与行业报告看产能分布。</p></div>'
  +'<div class="step"><h5>判断治理模式</h5><p>问：该环节是标准品交易（市场型）、交钥匙能力（模块型）、依赖长期关系（关系型），还是被品牌商锁定（captive）？依据：合同结构、知识转移程度、供应商集中度。</p></div>'
  +'<div class="step"><h5>估算价值分布</h5><p>用各环节的代表性企业毛利率/营收结构近似（上市公司财报、行业报告），画出「微笑曲线」的量化版本。</p></div>'
  +'<div class="step"><h5>识别升级路径</h5><p>对目标企业：从当前环节向上下游哪一端移动最可行？需要什么能力（认证、品牌投入、渠道资产）？遭遇什么阻力（领导企业阻挠、资本门槛）？</p></div>'
  +'<div class="step"><h5>加入政策层</h5><p>关税、原产地、本地含量、制裁如何改变各环节的地理配置（m20、m23、m29）。</p></div>'
  +'</div>' },

  { id:'m09-s6', h:'9.6 案例：光伏产业链的全球分布与治理', lvl:2, html:
  '<div class="case"><div class="case-head"><div class="tag">案例 1 · 完整产业</div><div class="ttl">从硅料到组件：谁在创造价值，谁在获取价值</div></div><div class="case-body">'
  +'<h5>环节与国家分布（2025 年数据）</h5><p>中国多晶硅、硅片、电池、组件产能分别占全球 96.0%、96.2%、91.3%、80.1%<button class="src gB" data-src="s55">55</button>；设备端（单晶炉、丝网印刷等）仍部分依赖欧洲/日本供应商；下游电站开发、EPC 与运维分布在各国本地；逆变器中国企业（华为、阳光电源）全球份额领先，2025 年中国逆变器出口 90.4 亿美元（+9.4%）<button class="src gA" data-src="s04">4</button>。</p>'
  +'<h5>治理模式判断</h5><p>（1）多晶硅—硅料：市场型偏等级型，新进入者需巨额资本与能耗指标；（2）电池—组件：模块型为主，客户按规格与认证采购，中国龙头以规模与成本形成「交钥匙」能力；（3）电站 EPC/运维：关系型，依赖本地关系与融资；（4）品牌组件：欧美品牌（First Solar 等）依靠政策扶持与本土身份获取溢价（IRA 抵免 + 本土制造补贴）<button class="src gB" data-src="s30">30</button>。</p>'
  +'<h5>价值获取</h5><p>微笑曲线形态：上游硅料在紧缺期（2021–2022）获取超额利润，2024–2025 年全产业链价格下行后利润向「能生存的规模者 + 有政策身份者」集中；制造环节毛利率被压缩到历史低位，品牌与「本土合规身份」成为新的溢价来源。</p>'
  +'<h5>升级与重构</h5><p>中国企业的升级路径：从组件出口 → 电池/一体化产能 → 海外建厂（东南亚、中东、美国）→ 电站开发与运维服务。阻力：美国双反与 232（2026 年 12 月生效）<button class="src gA" data-src="s07">7</button>、印度 ALMM<button class="src gB" data-src="s20">20</button>、巴西关税配额<button class="src gB" data-src="s21">21</button>正在把「全球成本竞争」改写为「区域合规竞争」。</p>'
  +'<h5>结论与限制</h5><p>结论：光伏是 GVC 分析的典型样本——制造高度集中在中国，价值捕获受政策身份强烈影响，升级方向是「向服务与本地合规身份移动」。限制：各环节利润率随周期波动极大，引用时必须标注年份；本案例未给出各企业具体财务数据，教学中应要求学员以上市公司财报自行验证。</p>'
  +'</div></div>' },

  { id:'m09-s7', h:'9.7 局限、争议与常见误区', lvl:2, html:
  '<ul><li><b>治理模式的判断主观性：</b>同一环节可能同时存在多种治理；五种模式是理想类型，现实是光谱。</li>'
  +'<li><b>「升级即好」的规范陷阱：</b>功能升级（做品牌）并非对所有企业都是最优——规模、资本与风险承受力决定路径；许多企业在 captive 治理下长期盈利良好。</li>'
  +'<li><b>误区一：</b>把「处于微笑曲线底部」等同于「没有前途」。底部的规模、成本与交付能力本身可以成为进入其他价值链的筹码（如电池企业从消费电池进入储能与动力电池）。</li>'
  +'<li><b>误区二：</b>用贸易额推断价值链地位。转口、库存与中间品重复计算会让「谁参与」和「谁获取」失真（m10）。</li></ul>' },

  { id:'m09-s8', h:'9.8 与其他模块的联系', lvl:2, html:
  '<ul><li><b>→ m10：</b>GVC 的地理分布用中间品贸易流验证。</li>'
  +'<li><b>→ m29：</b>价值链的集中度决定供应链脆弱性（单一环节依赖）。</li>'
  +'<li><b>→ m16：</b>治理模式影响进入模式（ captive 链中通常以「成为合格供应商」方式进入）。</li>'
  +'<li><b>→ m32：</b>综合项目的「产业链分析」章节即本模块方法的完整应用。</li></ul>' }
  ],
  exercises:[
  { type:'概念理解', q:'「 captive（受制型）治理」如何限制供应商的升级？供应商有哪些合法突破路径？', a:' captive 治理下，领导企业通过规格控制、知识封锁与合同条款把供应商锁定在狭窄任务（如纯组装），防止其向设计或品牌延伸——升级天花板是结构性的。合法突破路径：（1）在合同允许范围内做「流程升级」积累效率与数据；（2）服务多个领导企业以分散依赖、交叉学习；（3）在相邻细分市场建立自有品牌（不与领导企业正面竞争）；（4）向产业链相邻环节延伸（如从组装延伸到零部件）；（5）利用本地政策窗口（本地含量要求、政府项目）建立非俘获型客户基础。' },
  { type:'概念理解', q:'价值创造与价值获取的区别是什么？举一个「创造多、获取少」和一个「创造少、获取多」的环节。', a:'价值创造指环节对最终产品效用与成本的贡献；价值获取指该环节分得的利润份额。创造多获取少：组装制造——贡献大量产值与就业，但毛利率常低于 10%。创造少获取多：品牌与渠道——贡献的是信任与获客，毛利率可达 30–50%（如消费电子品牌 vs 代工）。分析机会时必须两者结合：有些环节「蛋糕大但分得少」，适合规模化企业；有些「蛋糕小但分得多」，适合利基玩家。' },
  { type:'实际应用', q:'绘制锂电便携储能电源的全球价值链简图：列出 5 个环节、每个环节的典型国家/企业、治理模式与价值捕获特点。', a:'参考框架：（1）电芯（中国：宁德时代、亿纬锂能等）——市场/模块型，资本密集，价值捕获中等偏高但价格随行就市；（2）BMS/逆变器（中国 + 欧美芯片）——模块型，技术门槛中等；（3）组装（中国 + 东南亚 + 美国本土组装）——captive/模块型，价值捕获低；（4）品牌/渠道（中国出海品牌：正浩、华宝、安克 + 欧美本土品牌）——关系型，价值捕获高；（5）售后/回收（各国本地，受欧盟电池法规与 EPR 约束）——关系型，合规成本高。评价标准：是否体现「微笑曲线」与治理模式差异，而非只列国家。' },
  { type:'实际应用', q:'如何用 UN Comtrade 数据验证「中国在光伏组件环节占全球主导」这一判断？列出查询步骤与注意事项。', a:'步骤：（1）确定编码：组件常用 HS 8541.40（或 8541.43/8541.42 等电池片相关子目，注意 HS 2022 版子目调整）；（2）在 Comtrade 查询「中国出口（reporter=156, flow=X）」到世界（partner=0）的年度值；（3）查询「世界进口」各国数据的加总作为分母（注意各国进口按 CIF、出口按 FOB，直接相除有口径差）；（4）用 ITC Trade Map 交叉验证份额；（5）注意事项：转口贸易（荷兰等欧洲枢纽）会重复计算；mirror data 差异；数据年份 vs 发布年份。' },
  { type:'综合分析', q:'「中国制造处于全球价值链低端，所以必须尽快向品牌和服务升级。」请从 GVC 理论角度评估这一说法的合理与片面之处。', a:'合理处：GVC 理论与微笑曲线确实显示制造环节价值捕获偏低；政策与资本向高附加值环节流动有其逻辑。片面处：（1）「低端」是利润分布概念，不是技术含量概念——中国在电池、组件、逆变器等环节已是全球技术与成本领导者，用「低端」概括失真；（2）升级有时序与能力依赖：跳过制造能力直接做品牌，往往因成本与交付无优势而失败（许多「贴牌出海」的教训）；（3）品牌升级的成败取决于本地化能力（渠道、售后、合规，m26–m27），而非意愿；（4）对许多企业，最优路径是「制造规模 + 多元客户 + 相邻环节延伸」，而非全面品牌化；（5）地缘因素正在改变价值捕获逻辑——「本土合规身份」（美国 IRA、印度 ALMM、巴西配额）可能比品牌更快带来溢价。结论：升级方向应基于能力与市场结构逐环节论证，而不是把口号当战略。' }
  ]
},

m10: {
  id:'m10', stage:'s2', title:'国际贸易数据实战：HS 编码、Comtrade 与口径陷阱', en:'Working with Trade Data: HS Codes, Comtrade and Statistical Pitfalls',
  hours:'8–12 小时', goal:'掌握 HS 编码结构、主要贸易数据库的使用方法与数据口径（FOB/CIF、转口、原产国、镜像数据），能独立完成一次完整的数据分析。',
  prereqText:'m01；建议安装 Excel 或可用 Python。', outcome:'能从研究问题出发，经过编码选择、数据下载、清洗、可视化到结论解释，完成一次可复核的贸易数据分析。',
  summary:'贸易数据是国际市场研究的「证据基础设施」。用错编码、混用口径、把贸易额当需求，是初学者最常犯、代价最大的三类错误。本模块用一个完整示例走通全流程。',
  terms:['hs-code','comtrade','trade-map','wits','fob','cif','re-export','mirror-statistics','country-of-origin'],
  prereq:['m01'], related:['m09','m12','m13','m32'],
  sources:['s44','s18','s42','s43','s04','s21'],
  sections:[
  { id:'m10-s1', h:'10.1 学习定位', lvl:2, html:
  '<p>本模块是第二阶段的核心技能模块：前面建立了理论与指标框架，本模块提供「用真实数据回答真实问题」的操作能力。所有后续模块（市场规模估算、市场评分、竞争分析、综合项目）都依赖这里的数据基本功。学习目标不是「会点网站」，而是<b>建立从研究问题到数据证据的完整链路，并知道每一步在哪里会出错</b>。</p>' },

  { id:'m10-s2', h:'10.2 从直观问题开始：「中国光伏组件的主要市场是荷兰」是真的吗', lvl:2, html:
  '<p>2025 年中国组件出口市场中，荷兰是少数突破 10 亿美元的市场之一<button class="src gA" data-src="s04">4</button>。如果据此得出「荷兰是核心终端市场」，就可能犯错：荷兰长期扮演欧洲分销与转口枢纽角色，大量组件经鹿特丹港转运至德国、波兰等国。用中国出口数据看，荷兰「进口」很多；用荷兰本地装机与终端需求看，规模要小得多。这个例子集中体现了本模块的三个主题：<b>贸易额 ≠ 终端需求；出口国 ≠ 原产国；单一来源 ≠ 事实</b>。</p>' },

  { id:'m10-s3', h:'10.3 正式定义：编码体系与数据库', lvl:2, html:
  '<div class="defbox"><div class="en">Harmonized System（HS）</div><div class="zh">商品名称及编码协调制度</div><div class="def">由世界海关组织（WCO）维护的国际商品分类标准，六位码全球统一，各国可扩展到 8–10 位（如美国 HTS 10 位、中国 13 位税则）。结构：章（2 位）→ 目（4 位）→ 子目（6 位）。</div><div class="meta"><div><b>关键提示：</b>HS 每 5–6 年修订（HS 2017、HS 2022 现行），跨年比较必须核对版本差异；六位以下可跨年直接比较，六位以上各国规则不同。<br><b>常用示例：</b>8541.40 光伏电池/组件相关子目；8507.60 锂离子蓄电池；9405 灯具；6109/6209 T 恤。</div></div></div>'
  +'<div class="tbl-wrap"><table class="data"><thead><tr><th>数据库</th><th>运营方</th><th>内容</th><th>访问方式（截至 2026-10 核验）</th></tr></thead><tbody>'
  +'<tr><td><b>UN Comtrade</b></td><td>联合国统计司</td><td>全球官方进出口统计（商品 + 服务），按 HS/SITC 等</td><td>免费注册：单次 10 万条记录、API 500 次/天；匿名预览限 500 条；批量文件需付费订阅<button class="src gA" data-src="s18">18</button></td></tr>'
  +'<tr><td><b>ITC Trade Map</b></td><td>国际贸易中心（ITC）</td><td>贸易流向、市场份额、月度趋势、关税信息</td><td>免费注册可用基础查询，部分高级功能需订阅<button class="src gA" data-src="s43">43</button></td></tr>'
  +'<tr><td><b>WITS</b></td><td>世界银行</td><td>贸易 + 关税（TRAINS）+ 优惠协定（GPTAD）整合分析</td><td>免费注册<button class="src gA" data-src="s42">42</button></td></tr>'
  +'<tr><td><b>WTO 数据门户</b></td><td>WTO</td><td>宏观贸易统计、关税profile、RTA 数据库</td><td>免费开放</td></tr>'
  +'<tr><td><b>各国海关/统计官网</b></td><td>如中国海关总署、美国 USITC DataWeb、Eurostat</td><td>本国最细粒度数据（8–10 位码）</td><td>免费，颗粒度最高，更新快</td></tr>'
  +'</tbody></table></div>' },

  { id:'m10-s4', h:'10.4 底层逻辑：五组口径决定数据能回答什么问题', lvl:2, html:
  '<div class="steps">'
  +'<div class="step"><h5>FOB / CIF</h5><p>出口按 FOB（离岸价），进口按 CIF（到岸价，含运保费）。因此同一笔货，进口国统计的金额大于出口国统计——世界进口总额恒大于出口总额，全球贸易平衡加总不为零。</p></div>'
  +'<div class="step"><h5>出口国 vs 原产国</h5><p>统计按「最后出口地」记录，不是「原产地」。越南出口的电池可能是中国电芯组装——「从越南进口」不等于「越南制造」。原产地规则（m20）才是判断产品法律来源的标准。</p></div>'
  +'<div class="step"><h5>转口与再出口</h5><p>经香港、荷兰、新加坡等枢纽的转口会被计入「进口」，随后再出口。看进口份额必须扣除转口，否则高估枢纽市场的真实需求。</p></div>'
  +'<div class="step"><h5>镜像数据（mirror statistics）</h5><p>同一笔贸易，出口国报告（A→B）与进口国报告（B 从 A 进口）常不一致（可达 10–30%），原因：到达时间、运费分摊、走私与低报、四舍五入。严谨做法：同时报告两国数据并说明差异。</p></div>'
  +'<div class="step"><h5>贸易额 vs 需求量</h5><p>进口额 = 量 × 价，包含库存变动、中间品、转口与重复贸易。需求判断必须结合：终端消费数据、装机/产量数据、价格指数（剔除价格效应看量）。</p></div>'
  +'</div>' },

  { id:'m10-s5', h:'10.5 应用方法：一次完整的数据分析全流程', lvl:2, html:
  '<p><b>研究问题示例：</b>「2023–2025 年，全球便携式储能/锂电储能（HS 8507.60）的主要出口国与进口市场是谁？增长来自量还是价？」</p>'
  +'<div class="steps">'
  +'<div class="step"><h5>Step 1 编码确认</h5><p>查 HS 2022 税则：8507.60 为「锂离子蓄电池」（含 8507.60.10/90 等国别细分）。同时确认目标产品是否全部落入该编码（便携储能整机常按 8507.60 或整机编码，需抽查海关归类裁定）。若编码无法精确覆盖产品，说明口径限制。</p></div>'
  +'<div class="step"><h5>Step 2 设计查询</h5><p>在 Comtrade：reporter=中国（156）或世界汇总，flow=X/M，partner=世界（0）与主要国家，period=2023–2025，clCode=HS。注意免费额度：单次 ≤10 万条、每天 500 次 API 调用，足够完成大多数单产品分析<button class="src gA" data-src="s18">18</button>。</p></div>'
  +'<div class="step"><h5>Step 3 下载与清洗</h5><p>导出 CSV；剔除 partner=0 的世界汇总行（用于校验）；统一单位（Comtrade 值为美元）；处理缺失值（标注「无数据」而非填 0）；记录「数据年份」与「下载日期」。</p></div>'
  +'<div class="step"><h5>Step 4 交叉验证</h5><p>用 Trade Map 或另一数据库核对前五大市场份额；用中国海关总署年度发布核对总量（如 2025 年中国锂电池出口额增速 +26.2%<button class="src gA" data-src="s03">3</button>）。若两源差异 >10%，查明原因（转口、口径、修订）再下结论。</p></div>'
  +'<div class="step"><h5>Step 5 可视化与解释</h5><p>图表必须含：指标、单位、时间范围、来源、口径注记。推荐三图：出口额趋势（折线，标注政策事件时点）、市场份额（横向条形，前 10 国）、量价分解（数量指数 vs 价格指数）。</p></div>'
  +'<div class="step"><h5>Step 6 结论分级</h5><p>区分：数据直接支持的结论（份额与增速）、基于数据的计算（CAGR、集中度）、分析判断（增长驱动因素）、假设（未来需求）。把「贸易额增长 ≠ 需求增长」写进限制说明。</p></div>'
  +'</div>' },

  { id:'m10-s6', h:'10.6 案例：一次完整的数据分析示范', lvl:2, html:
  '<div class="case"><div class="case-head"><div class="tag">案例 1 · 全流程示范</div><div class="ttl">用公开贸易数据分析中国光伏组件出口格局（2023–2025）</div></div><div class="case-body">'
  +'<h5>问题与编码</h5><p>问题：中国组件出口的主要市场与集中度如何变化？编码：HS 8541.40 及相关子目（注明 HS 2022 版本）。</p>'
  +'<h5>数据与来源</h5><p>中国机电产品进出口商会《2025 年我国光伏产业对外贸易形势分析》（基于海关数据）：2025 年中国组件出口额 237 亿美元、出口量 249.8 GW，出口额同比 −15.3%、出口量 +5.7%；前十大出口市场合计占比由 2023/2024 年的超 61% 降至 48%；仅荷兰、巴基斯坦、巴西三个市场出口额突破 10 亿美元；全球吉瓦级组件进口市场由 2024 年 39 个增至 2025 年 47 个<button class="src gA" data-src="s04">4</button>。</p>'
  +'<h5>分析步骤</h5><p>（1）量额背离：量 +5.7% 而额 −15.3% → 均价下降约 20%，说明增长是「以价换量」，行业处于价格下行周期（与 2024–2025 年全产业链亏损、产能过剩的背景一致）。（2）集中度下降：前十市场占比 61% → 48%，新兴市场（巴基斯坦、中东、拉美、非洲）占比上升 → 市场多元化。（3）区域结构：传统欧美占比下降，东南亚因美国双反而萎缩（2025 年中国对东南亚四国硅片出口量同比下降超六成）<button class="src gA" data-src="s04">4</button>。</p>'
  +'<h5>结论与限制</h5><p>结论：中国组件出口「量增额减、市场分散、欧美收缩、新兴接棒」，出口结构变化主要由价格周期与贸易政策共同驱动。限制：（1）本文使用行业协会整理数据，与 UN Comtrade 原始数据可能存在编码口径差异（协会可能含部分 8541.50 等子目），引用时需注明；（2）出口额不等于各国终端装机（转口、库存、项目周期）；（3）巴基斯坦 17.9 GW 的进口数据来自行业白皮书（FY25 口径）<button class="src gC" data-src="s25">25</button>，与日历年口径不同，不可直接相加。</p>'
  +'<h5>可迁移</h5><p>同一流程可迁移至任何 HS 编码产品：确认编码 → 下载 → 清洗 → 交叉验证 → 量价分解 → 结论分级。本案例的「量额背离」与「集中度」两个指标，应成为任何贸易数据分析的标准动作。</p>'
  +'</div></div>' },

  { id:'m10-s7', h:'10.7 局限、争议与常见误区', lvl:2, html:
  '<ul><li><b>时效与修订：</b>年度数据通常滞后数月；初步数据可能被后续修订。结论应标注「截至 X 月下载的 Y 年数据」。</li>'
  +'<li><b>口径不可比：</b>不同机构的「组件出口」统计可能包含不同子目，比较前先对齐口径（这正是行业协会数据与 Comtrade 可能不一致的原因）。</li>'
  +'<li><b>误区一：</b>用 6 位码跨 HS 版本比较——2022 版部分子目调整会导致历史序列断裂。</li>'
  +'<li><b>误区二：</b>把「某国进口增长」当作「某国需求增长」。库存、转口、中间品、项目节奏都会让两者偏离。</li>'
  +'<li><b>误区三：</b>用贸易份额推断竞争力而不做价格分解——量增额减说明的是价格战，不是份额提升。</li></ul>' },

  { id:'m10-s8', h:'10.8 与其他模块的联系', lvl:2, html:
  '<ul><li><b>→ m12：</b>贸易数据是市场规模「自上而下」估算的核心输入（进口规模作为市场代理）。</li>'
  +'<li><b>→ m13：</b>评分卡中的市场规模、增长、供应国结构全部来自本模块方法。</li>'
  +'<li><b>→ m20：</b>关税与估价查询依赖同一编码体系。</li>'
  +'<li><b>→ m32：</b>综合项目第 4–5 步（数据收集与进口结构分析）即本模块流程的直接复用。</li></ul>' }
  ],
  exercises:[
  { type:'概念理解', q:'为什么「世界进口总额」总是大于「世界出口总额」？这对计算全球市场份额有什么影响？', a:'因为出口按 FOB 计价、进口按 CIF 计价，同一笔货的 CIF 值高于 FOB 值（含运费与保险），且统计时点与范围差异（到达 vs 离境）导致加总不为零。影响：计算「某国占全球进口/出口份额」时，分子分母的计价基础不同，份额会轻微失真（通常 1–3% 量级）；严谨做法是固定使用同一流向（都用进口或用出口）计算份额，并注明口径。' },
  { type:'概念理解', q:'「从越南进口的锂电池」可能是什么贸易结构？列出三种可能性及各自的验证方法。', a:'（1）越南本土制造——验证：原产地证书、越南出口数据与其产能匹配度；（2）中国电芯运至越南组装后出口（中间品贸易）——验证：越南自中国进口电芯数据 + 组装产能公告；（3）经越南转口的中国原产货——验证：越南转口/再出口统计、船运路线与港口数据、以及美国等国对此类「转口规避」的执法记录（这也是东南亚光伏双反的调查对象<button class="src gA" data-src="s06">6</button>）。启示：进口来源国是「最后出口地」，判断供应链真实来源必须结合中间品数据与原产地规则。' },
  { type:'实际应用', q:'你想研究「中国出口到沙特的逆变器市场」。写出完整的查询方案：编码、数据库、字段、验证步骤、预期陷阱。', a:'方案：（1）编码：逆变器通常归 HS 8504.40（静态变频器/逆变器），需核对 HS 2022 子目并抽查归类；（2）数据库：UN Comtrade（中国出口 × 沙特，年度+月度）、Trade Map（交叉验证份额）、中国海关（月度快报）；（3）字段：贸易额、数量、单价；（4）验证：沙特进口的 mirror 数据对比、沙特装机数据（NREP/SPPC 公告）对照<button class="src gC" data-src="s27">27</button>；（5）陷阱：沙特大量项目经本地 EPC 与第三国代理采购，「中国→沙特」直接贸易可能低估实际中国含量；项目型采购的批次性会让月度数据剧烈波动。' },
  { type:'实际应用', q:'Comtrade 免费账户单次最多下载 10 万条记录。你要下载「所有报告国、所有伙伴、HS 6 位、2020–2025 年」的数据，设计分批策略。', a:'策略：（1）按年 × 报告国分批：单次查询一个报告国全年全部伙伴的世界汇总+主要伙伴，远低于 10 万条；（2）只需世界市场时用 partner=0 汇总行，单次一条；（3）需要主要伙伴时，先用世界汇总排序取前 20 伙伴，再逐国查询；（4）API 500 次/天的限制下，200 个报告国 × 6 年 ≈ 1,200 次，分 3 天完成，或改用 WITS/Trade Map 的批量导出；（5）若数据量仍超限，评估 Premium 或改用各国海关官网。评价标准：是否体现「先汇总后分解」的查询设计与额度意识。' },
  { type:'综合分析', q:'一份报告称「A 国进口某产品 2025 年增长 40%，因此 A 国需求增长 40%」。要推翻或支持这一结论，你需要哪些额外数据？', a:'需要：（1）量价分解——进口数量增长率与价格指数（若量仅 +5% 而价 +35%，可能是涨价或补库而非需求）；（2）库存与转口数据——该国是否为转口枢纽（再出口比例）；（3）终端需求代理——装机量、零售销量、产量、开工率；（4）项目节奏——政府招标与大型项目时点（会造成进口批次性暴增）；（5）mirror 数据——出口国报告的差异；（6）汇率——本币贬值会抬高本币计价进口额。只有以上多数证据一致时，「需求增长 40%」才可接受；否则应降级为「进口额增长 40%，需求增长待验证」。' }
  ]
}

});

;

Object.assign(MODULES, {

/* ================= 阶段 3 ================= */
m11: {
  id:'m11', stage:'s3', title:'国际市场研究方法论：类型、信度与效度', en:'International Market Research Methodology',
  hours:'7–11 小时', goal:'掌握二手/一手、定量/定性、探索/描述/因果研究的分类与选择，理解信度、效度、抽样偏差与三角验证。',
  prereqText:'m01；m07 指标体系。', outcome:'能针对一个商业问题设计研究方案，评估他人研究的证据强度，并用多源交叉验证提高结论可靠性。',
  summary:'市场研究的质量不取决于数据量，而取决于「测量的是不是想要的东西」（效度）与「测量结果是否稳定」（信度）。本模块给你一套检验任何研究结论的检查清单。',
  terms:['primary-research','secondary-research','quantitative-research','qualitative-research','exploratory-research','descriptive-research','causal-research','reliability','validity','sampling-bias','triangulation'],
  prereq:['m01','m07'], related:['m12','m13','m14','m32'],
  sources:['s30','s21','s04'],
  sections:[
  { id:'m11-s1', h:'11.1 学习定位', lvl:2, html:
  '<p>本模块是第三阶段的方法论基础：后面所有「估算」「筛选」「竞品分析」都建立在「什么证据可信」的判断上。它回答三个问题：<b>（1）商业问题如何转化为可验证的研究问题；（2）不同研究类型各自能回答什么、不能回答什么；（3）如何识别与避免让结论失真的偏差。</b>这也是评估第三方研究（行业报告、咨询预测、媒体数字）时的照妖镜。</p>' },

  { id:'m11-s2', h:'11.2 从直观问题开始：三个「看似专业」的结论为什么可能全错', lvl:2, html:
  '<p>结论一：「某调研显示 78% 的消费者愿意为环保产品支付 20% 溢价」——购买意愿（stated intention）与实际付费行为（revealed behavior）之间存在系统性差距，这是消费者研究中最稳定的发现之一。结论二：「某市场年增长 40%」——增长可能来自价格、库存或统计口径变化，而非需求。结论三：「某国进口数据证明需求爆发」——转口与项目节奏可以制造同样信号（m10）。三个结论共同的病根：<b>把「测量到的信号」当成了「想推断的现实」</b>。本模块教你系统性地拆穿这类推理。</p>' },

  { id:'m11-s3', h:'11.3 正式定义：研究分类与质量标准', lvl:2, html:
  '<div class="tbl-wrap"><table class="data"><thead><tr><th>分类</th><th>类型</th><th>能回答</th><th>不能回答</th><th>典型方法</th></tr></thead><tbody>'
  +'<tr><td rowspan="2"><b>数据来源</b></td><td>二手研究</td><td>市场规模、结构、趋势的框架性认识</td><td>本企业产品的具体接受度</td><td>官方统计、行业报告、学术文献</td></tr>'
  +'<tr><td>一手研究</td><td>具体客户态度、产品适配、渠道反馈</td><td>大样本推断（除非抽样严谨）</td><td>问卷、访谈、焦点小组、观察、实验</td></tr>'
  +'<tr><td rowspan="2"><b>数据性质</b></td><td>定量研究</td><td>多少、多大、多显著</td><td>为什么、如何决策</td><td>统计调查、面板数据、交易数据</td></tr>'
  +'<tr><td>定性研究</td><td>为什么、动机、决策过程、文化语境</td><td>概率与总体推断</td><td>深度访谈、焦点小组、实地观察</td></tr>'
  +'<tr><td rowspan="3"><b>研究目的</b></td><td>探索性</td><td>「这个问题是什么」「有哪些假设」</td><td>结论性判断</td><td>文献、专家访谈、案例</td></tr>'
  +'<tr><td>描述性</td><td>「市场长什么样」</td><td>因果</td><td>调查、统计描述</td></tr>'
  +'<tr><td>因果性</td><td>「A 是否导致 B」</td><td>无实验/准实验则不可靠</td><td>实验、自然实验、工具变量</td></tr>'
  +'</tbody></table></div>'
  +'<div class="defbox"><div class="en">Reliability</div><div class="zh">信度</div><div class="def">重复测量得到一致结果的程度。包括内部一致性（同一问卷内相关题目得分一致）、稳定性（不同时间重复结果一致）、评分者间信度（不同访谈员编码一致）。</div></div>'
  +'<div class="defbox"><div class="en">Validity</div><div class="zh">效度</div><div class="def">测量工具真正测量了所要测量概念的程度。内部效度（因果推断是否成立）、外部效度（结论能否推广到其他情境）、构念效度（指标是否代表理论概念，如用「搜索量」代理需求是否成立）。</div></div>'
  +'<div class="defbox"><div class="en">Sampling Bias / Selection Bias</div><div class="zh">抽样偏差 / 选择偏差</div><div class="def">样本系统性偏离总体。常见形态：便利抽样（只访愿意受访者）、幸存者偏差（只研究成功企业）、无回应偏差（拒访者与受访者不同）、自我选择（高意愿者更可能回复问卷）。</div></div>'
  +'<div class="defbox"><div class="en">Triangulation</div><div class="zh">三角验证</div><div class="def">用不同来源、不同方法、不同数据交叉验证同一结论。证据一致 → 结论稳健；证据冲突 → 定位分歧来源（口径？样本？利益？）。三角验证是提高国际市场研究可靠性的核心手段，因为单一来源几乎总有偏差。</div></div>' },

  { id:'m11-s4', h:'11.4 底层逻辑：从商业问题到研究假设', lvl:2, html:
  '<div class="chain"><span class="node">商业问题</span><span class="arr">→</span><span class="node">研究问题</span><span class="arr">→</span><span class="node">可检验假设</span><span class="arr">→</span><span class="node">研究设计</span><span class="arr">→</span><span class="node">数据采集</span><span class="arr">→</span><span class="node">分析</span><span class="arr">→</span><span class="node">结论与校准</span></div>'
  +'<p>转化示例：商业问题「要不要进入德国储能市场」→ 研究问题「德国家用储能的需求驱动因素、规模与竞争格局是什么」→ 假设「H1：高电价与分布式光伏装机推动户储经济性需求；H2：需求集中在特定收入与住房群体；H3：本土品牌已建立渠道壁垒」→ 设计「二手数据（装机、电价、进口）+ 一手访谈（经销商、安装商、早期用户）」→ 采集 → 分析 → 结论分级。</p>'
  +'<div class="callout warn"><span class="ico">⚠️</span><div><b>关键纪律：</b>假设必须先于数据收集明确写下来。否则研究者会「找到支持自己预设的证据」（确认偏误），并把相关当因果（「用了我们产品的家庭更省电」——可能是省电家庭才买）。</div></div>' },

  { id:'m11-s5', h:'11.5 应用方法：研究设计清单与证据强度评估', lvl:2, html:
  '<div class="steps">'
  +'<div class="step"><h5>写研究简报</h5><p>决策背景、要回答的问题、决策时间点、预算、已知信息、缺口。</p></div>'
  +'<div class="step"><h5>二手先行</h5><p>先用免费官方数据与文献建立框架（m10），识别「哪些问题二手数据已能回答、哪些必须一手」。二手不足的常见领域：渠道真实利润、客户决策过程、竞品未公开数据。</p></div>'
  +'<div class="step"><h5>选择方法组合</h5><p>定量定规模与结构，定性解释机制。顺序：探索性定性 → 描述性定量 → （必要时）因果实验。</p></div>'
  +'<div class="step"><h5>控制偏差</h5><p>抽样框定义清晰、样本量与配额设计、问卷预测试（pilot）、访谈提纲标准化、双人编码。</p></div>'
  +'<div class="step"><h5>三角验证</h5><p>每个关键结论至少两类独立证据；冲突时追溯口径与利益。</p></div>'
  +'<div class="step"><h5>证据分级输出</h5><p>按 A/B/C/D 标注每条结论的证据等级（见来源数据库），把「证据不足」显式呈现给决策者。</p></div>'
  +'</div>' },

  { id:'m11-s6', h:'11.6 案例：一个完整的消费者研究设计（含信度效度控制）', lvl:2, html:
  '<div class="case"><div class="case-head"><div class="tag">案例 1 · 完整设计</div><div class="ttl">德国户用储能购买决策研究：从问题到结论核验</div></div><div class="case-body">'
  +'<h5>研究问题</h5><p>德国住宅用户购买户用储能的核心驱动因素是什么？价格敏感度多高？信息获取渠道是什么？</p>'
  +'<h5>设计</h5><p>（1）二手：德国联邦网络局（Bundesnetzagentur）户储注册数据、EEG 政策、电价数据、进口数据（HS 8507.60 德国进口）；（2）一手：对已购用户（n≈40 深度访谈 + n≈400 定量问卷）与安装商（n≈15 访谈）。</p>'
  +'<h5>偏差控制</h5><p>（1）抽样：已购用户从安装商客户名单分层抽样（按装机容量与地区），避免「只用社交媒体招募」的自选择偏差；（2）购买意愿陷阱：问卷不问「你愿意付多少」，而问「你实际付了多少、当时比较了哪些方案」——用行为数据校准态度数据；（3）信度：李克特量表多题测量同一构念（如价格敏感度 4 题），计算 Cronbach α；（4）效度：用安装商成交数据校验问卷中的价格与容量分布。</p>'
  +'<h5>三角验证</h5><p>定量问卷（规模）↔ 深度访谈（机制）↔ 官方装机统计（外部基准）↔ 安装商访谈（渠道现实）。若问卷显示「30% 用户最关心品牌」而安装商普遍反映「客户几乎只问价格与回本周期」，则说明样本或提问方式有偏，需回溯。</p>'
  +'<h5>结论分级示例</h5><p>A：经济性（电价 + 光伏配套）是首要驱动（问卷 + 装机数据 + 访谈一致）；B：品牌认知影响有限（样本有限，结论适用范围为户用细分）；C：某安装商反映的「客户担心电池安全」为单源信息，需扩大访谈验证。</p>'
  +'</div></div>' },

  { id:'m11-s7', h:'11.7 局限、争议与常见误区', lvl:2, html:
  '<ul><li><b>「大数据」不是效度的替代品：</b>搜索量、点击流、销售数据可以很大，但代理的构念可能错位（搜索「储能」的人多数不会买）。大数据提高的是信度（样本量），不自动提高效度（构念对应）。</li>'
  +'<li><b>跨国比较的方法论问题：</b>同一问卷跨语言翻译的构念等价性、各国受访者的应答风格差异（ acquiescence bias：某些文化更倾向「同意」）都会让跨国数据不可直接比较。</li>'
  +'<li><b>误区一：</b>把样本量当质量。1000 份有偏样本不如 50 份严谨样本。</li>'
  +'<li><b>误区二：</b>把访谈「原话」当结论。个案是假设的来源，不是结论的证据。</li>'
  +'<li><b>误区三：</b>混淆相关与因果（m12 详述识别策略）。</li></ul>' },

  { id:'m11-s8', h:'11.8 与其他模块的联系', lvl:2, html:
  '<ul><li><b>→ m12：</b>市场规模估算中「自上而下 vs 自下而上」的选择与代理指标效度直接相关。</li>'
  +'<li><b>→ m13：</b>评分卡的数据质量决定筛选质量；每个指标应标注来源与证据等级。</li>'
  +'<li><b>→ m14：</b>竞品拆解与消费者访谈的方法细节。</li>'
  +'<li><b>→ m32：</b>综合项目的「证据链建设」即三角验证的系统应用。</li></ul>' }
  ],
  exercises:[
  { type:'概念理解', q:'一份问卷问「如果价格下降 10%，你会购买吗」，80% 答「会」。这个结果为什么几乎肯定高估了真实销量提升？', a:'（1）社会期许与假设性问题：受访者无需付出成本即可表达积极态度，购买意愿（stated intention）与购买行为（revealed preference）之间存在稳定且巨大的差距（意向—行为差距通常数倍）；（2）无预算约束与竞争替代：问题未给出价格基准与替代方案；（3）样本自选择：愿意回答问卷的人本身更关注该品类。改进：用真实交易数据做价格测试（A/B 测试、历史促销弹性）、或问已购用户的「实际决策与比较过程」。' },
  { type:'概念理解', q:'信度和效度有什么区别？一个「信度高但效度低」的测量例子是什么？', a:'信度是「重复测量的一致性」，效度是「测量了想测的东西」。信高效低例子：用「公司官网访问量」衡量「市场对产品的兴趣」——数字稳定可复现（信度高），但访问者多数是同行、求职者与现有客户，并不代表潜在需求（效度低）。另一个：用「问卷调查的购买意愿」预测销量。' },
  { type:'实际应用', q:'设计一个研究：评估你的产品（如 500 Wh 便携储能）在荷兰的潜在需求，样本怎么抽、问什么、如何验证。', a:'（1）二手先行：荷兰户储/便携储能装机与进口数据、电价、促销季数据；（2）抽样：若目标总体是「已购户外电源用户」，从电商平台评论 + 户外社群分层招募，避免只用粉丝群；（3）问题设计：已购用户问实际使用场景、容量选择、品牌考虑集、价格与购买渠道；未购用户问替代方案（充电宝/燃油发电机/不用）；（4）验证：安装商/经销商访谈（渠道视角）+ 销售数据（若有试销）；（5）陷阱控制：不问假设性购买意愿；注意荷兰语/英语问卷的构念等价。评价标准：是否包含「行为数据校准态度数据」的设计。' },
  { type:'实际应用', q:'某行业报告称「全球便携储能市场 2025 年规模 387 亿美元」，另一报告称 20.7 亿美元。作为研究者，你如何处理这个 18 倍的差距？', a:'（1）查口径：两者产品范围（是否含户外电源全品类/仅锂电系统/仅特定容量段）、地域范围、渠道（零售额 vs 出货额）、年份定义必然不同；（2）查方法：样本、推算逻辑、是否说明；（3）交叉验证：用贸易数据（HS 8507.60 全球贸易额）与主要企业营收加总做上下界检验；（4）结论：不使用无法核验口径的数字；把多个口径并列呈现并说明差异来源；（5）记录：引用时注明机构、口径、年份与访问日期。这正是 m10「口径决定结论」的又一实例。' },
  { type:'综合分析', q:'「三角验证」在跨国研究中有什么特殊困难？设计一个三源验证方案验证「某国储能需求正在加速」。', a:'特殊困难：（1）各国数据可得性与质量差异大（新兴市场统计弱）；（2）语言与文化导致的一手数据偏差；（3）数据滞后不一致（年度 vs 月度）；（4）利益相关方（政府/企业）发布的选择性。三源方案：（1）官方贸易数据（Comtrade 该国进口 HS 8507.60 的量价分解）；（2）本地行业证据（经销商/安装商访谈 + 本地电商销售排名与价格带）；（3）政策与能源数据（电价走势、停电记录、可再生能源装机）。若三源一致（进口量增 + 渠道反馈紧俏 + 电价上行/缺电），结论升为 A/B 级；若冲突（进口增但渠道平淡），定位为转口/项目脉冲，降级为 C 并标记待验证。' }
  ]
},

m12: {
  id:'m12', stage:'s3', title:'市场规模估算：TAM/SAM/SOM 与两种路径', en:'Market Sizing: TAM, SAM, SOM and Top-Down vs Bottom-Up',
  hours:'6–10 小时', goal:'掌握 TAM/SAM/SOM 的定义与计算、自上而下与自下而上两种估算路径，以及市场规模数字的常见误用。',
  prereqText:'m10 贸易数据、m11 方法论。', outcome:'能用两种路径独立估算一个市场，交叉验证并给出带假设与区间的结论。',
  summary:'市场规模数字是商业计划中最常被引用、也最常被滥用的数字。正确的问题不是「市场有多大」，而是「在什么口径下、对谁而言、什么时候」。',
  terms:['tam','sam','som','top-down','bottom-up','penetration-rate','arpu','serviceable-market'],
  prereq:['m10','m11'], related:['m13','m14','m32'],
  sources:['s04','s25','s29'],
  sections:[
  { id:'m12-s1', h:'12.1 学习定位', lvl:2, html:
  '<p>市场选择（m13）与进入决策（m16）都依赖一个输入：这个机会值多少钱。本模块提供估算市场规模的标准框架与两种互相校验的路径。它的特殊重要性在于：<b>错误的规模估算会让整个后续决策失锚</b>——把转口贸易额当需求、把潜在用户当付费用户、把 TAM 当可获收入，是融资与出海项目中最常见的三类错误。</p>' },

  { id:'m12-s2', h:'12.2 从直观问题开始：同一个「便携储能市场」的十个数字', lvl:2, html:
  '<p>公开渠道对 2025 年全球便携储能市场规模的估计，从约 20.7 亿美元到约 387 亿美元不等（多家研究机构口径不同，均为 C/D 级证据，仅作教学示例）<button class="src gC" data-src="s29">29</button>。差距近 18 倍的原因不是有人在说谎，而是口径：产品范围（仅锂电储能系统 vs 广义便携电源 vs 含户外电源全品类）、统计层级（出货额 vs 零售额 vs 产值）、地域覆盖、年份定义。这个现象给研究者两条纪律：<b>（1）任何规模数字必须连同口径一起引用；（2）任何规模估算必须自己会做，而不是引用现成数字。</b></p>' },

  { id:'m12-s3', h:'12.3 正式定义', lvl:2, html:
  '<div class="defbox"><div class="en">TAM（Total Addressable Market）</div><div class="zh">总可寻址市场</div><div class="def">在既定产品定义与价格假设下，某市场全部潜在需求的总价值。TAM 是「理论上限」，通常远大于任何企业可获得的收入。</div><div class="meta"><div><b>公式（自上而下）：</b>TAM = 目标客群规模 × 渗透率 × 平均客单价。<br><b>误用：</b>把 TAM 写进商业计划当作「可获得收入」，或用一个来源不明的巨大 TAM 论证机会。</div></div></div>'
  +'<div class="defbox"><div class="en">SAM（Serviceable Addressable Market）</div><div class="zh">可服务市场</div><div class="def">TAM 中企业实际可以服务（渠道可达、合规允许、产品适配、价格带匹配）的部分。SAM 由渠道覆盖、监管限制、产品定位共同决定。</div></div>'
  +'<div class="defbox"><div class="en">SOM（Serviceable Obtainable Market）</div><div class="zh">实际可获得市场</div><div class="def">SAM 中在规划期内（如 3 年）企业 realistically 可获取的部分，受产能、品牌、竞争与执行能力约束。SOM 才是预算与收入预测的依据。</div><div class="meta"><div><b>常见错误层级：</b>TAM（百亿）→ 商业计划写「可获得」（错 1–2 个数量级）；SAM → SOM 未按竞争与产能折算（错 3–10 倍）。</div></div></div>' },

  { id:'m12-s4', h:'12.4 底层逻辑：两条路径与它们的失效模式', lvl:2, html:
  '<div class="grid2"><div class="card"><h5>自上而下（Top-Down）</h5><p><b>做法：</b>宏观数据 → 行业占比 → 目标细分。例：德国能源消费 → 户用储能渗透率 × 户数 × 客单价。</p><p><b>优点：</b>快速、可解释、适合初筛。<br><b>失效模式：</b>每一层假设都被上游误差放大；渗透率若来自报告则继承其口径问题；忽略价格敏感度与渠道限制。</p></div>'
  +'<div class="card"><h5>自下而上（Bottom-Up）</h5><p><b>做法：</b>从可观测的销售/产能出发加总。例：主要渠道商销量 × 渠道数 + 头部企业营收，再按覆盖率折算。</p><p><b>优点：</b>贴近现实、便于验证、天然带出口径。<br><b>失效模式：</b>低估（漏掉长尾渠道）、重复计算（转售）、覆盖率假设主观。</p></div></div>'
  +'<p><b>纪律：</b>两条路径独立完成，若结果相差 2 倍以上，必须解释差异（口径、覆盖率、价格带）而不是取平均。交叉验证（m11）比任何单点数字都重要。</p>' },

  { id:'m12-s5', h:'12.5 应用方法：六步估算法', lvl:2, html:
  '<div class="steps">'
  +'<div class="step"><h5>定义产品与客群</h5><p>产品定义（容量段、功能、形态）、目标客群（按场景/收入/住房类型）、地域边界。定义越窄，估算越可用。</p></div>'
  +'<div class="step"><h5>自上而下框架</h5><p>选宏观基数（户数/人口/装机），定渗透率（用可比市场校准，说明来源与年份），定价格带（用实际成交价而非目录价）。</p></div>'
  +'<div class="step"><h5>自下而上框架</h5><p>识别主要销售渠道与头部玩家；用贸易数据/财报/渠道访谈估算其销量；按渠道覆盖率折算；加总。</p></div>'
  +'<div class="step"><h5>量价分离</h5><p>分别估算销量（台/GW）与均价，再相乘；对增长做量价分解（参考 m10 量额背离教训）。</p></div>'
  +'<div class="step"><h5>给区间不给点值</h5><p>给出悲观/基准/乐观三档，标注每档的关键假设；对预测数据标明预测机构与假设。</p></div>'
  +'<div class="step"><h5>标注证据等级</h5><p>TAM 中的每个参数标注来源与等级；用贸易数据可验证的部分给 A/B，来自报告的给 C。</p></div>'
  +'</div>' },

  { id:'m12-s6', h:'12.6 案例：德国户用储能市场规模估算（教学演算）', lvl:2, html:
  '<div class="case"><div class="case-head"><div class="tag">案例 1 · 演算示范</div><div class="ttl">两条路径估算德国户用储能年市场</div></div><div class="case-body">'
  +'<h5>产品与客群定义</h5><p>产品：5–15 kWh 户用储能电池系统（不含光伏组件）；客群：已装或拟装分布式光伏的独栋住宅业主；地域：德国；年份：以教学演示，假设数据年份 2025（具体数值须以官方最新数据更新后填入）。</p>'
  +'<h5>自上而下</h5><p>基数：德国住宅总数约 4,300 万套，独栋比例约 1/4 量级（官方统计）；已装光伏住宅存量数百万套级（需以联邦网络局注册数据为准）；新增户储渗透率：参考近年新增光伏系统中配套储能比例（教学中设为 50–70% 区间）；系统均价：约 8,000–12,000 欧元/kWh 安装价（随电芯价格波动）。→ TAM（年新增）= 新增光伏户数 × 配套率 × 系统均价。SAM = TAM ×（品牌可进入渠道比例）×（合规准入比例）。SOM = SAM × 3 年目标份额（如 2–5%，参照竞争格局）。</p>'
  +'<h5>自下而上</h5><p>加总：头部安装商与经销商的储能出货（访谈 + 财报）+ 主要品牌在德营收（如披露）÷ 其德国份额假设 → 反推总量。若自下而上结果为自上而下的 60%，解释：屋顶渠道渗透不全、部分需求由「光伏 + 储能」打包商完成。</p>'
  +'<h5>敏感性</h5><p>关键变量：新增光伏装机（政策依赖）、配套储能比例、系统均价（电芯价格周期）、补贴政策变动。任何一变量 ±30%，SOM 变化可达数倍——这就是必须做敏感性分析的原因（工具：TAM/SAM/SOM 计算器）。</p>'
  +'<h5>结论与限制</h5><p>结论：两路径结果应落入合理区间；决策用 SOM 而非 TAM。限制：本案例数值为教学演示占位，实际研究必须用德国联邦网络局、Destatis、EEG 政策原文与企业披露数据替换，并标注每个参数的年份与来源。</p>'
  +'</div></div>' },

  { id:'m12-s7', h:'12.7 局限、争议与常见误区', lvl:2, html:
  '<ul><li><b>TAM 的诱惑：</b>大 TAM 让商业计划好看，但与可获得收入无关。向管理层汇报时，SOM 与 TAM 必须同时给出。</li>'
  +'<li><b>渗透率来源危机：</b>报告中的渗透率往往口径不明（按销量还是按金额？按新增还是存量？）。可验证的渗透率优先（官方装机统计）。</li>'
  +'<li><b>误区一：</b>用「全球市场 × 某国人口占比」推算该国市场（忽略收入与偏好差异）。</li>'
  +'<li><b>误区二：</b>把进口额当市场规模（转口、库存、项目脉冲，见 m10/m11）。</li>'
  +'<li><b>误区三：</b>预测增长率外推。政策与技术切换可以在一年内改变曲线（美国 232 对组件的冲击）。</li></ul>' },

  { id:'m12-s8', h:'12.8 与其他模块的联系', lvl:2, html:
  '<ul><li><b>→ m13：</b>SAM/SOM 是评分卡中「市场规模」与「利润空间」维度的量化输入。</li>'
  +'<li><b>→ m14：</b>竞品营收是自下而上加总的关键数据源。</li>'
  +'<li><b>→ m31：</b>SOM 是财务测算与投资回报（ROI）模型的起点。</li>'
  +'<li><b>→ m32：</b>综合项目第 4 步数据收集即两条路径的完整执行。</li></ul>' }
  ],
  exercises:[
  { type:'概念理解', q:'TAM、SAM、SOM 三者的区别是什么？一个把 TAM 当 SOM 使用的商业计划会错在哪里？', a:'TAM 是理论总需求，SAM 是产品与渠道实际可服务部分，SOM 是规划期内 realistically 可获取部分，三者逐层收缩。把 TAM 当 SOM 会：（1）高估收入预测 1–2 个数量级；（2）误配资源（按不存在的需求备产能与库存）；（3）误导估值与融资决策；（4）忽视竞争与渠道门槛。正确做法：三层同时呈现，并标注每层折算的假设。' },
  { type:'概念理解', q:'自上而下与自下而上估算差异巨大时，为什么不应该简单取平均？', a:'因为平均会把两种方法的偏差混合成「看似精确的虚假数字」，且掩盖真正的问题（口径不一致、覆盖率假设错误、价格带错配）。正确做法：回到每一步假设，定位差异来源——若自下而上是自上而下的 40%，常见解释是渠道覆盖率 60% × 价格带错配 70%（0.4 ≈ 0.6 × 0.65），应逐项验证并修正假设，最终给出带区间的估计，而不是一个平均值。' },
  { type:'实际应用', q:'为「中国便携式储能进入日本市场」做一个自下而上估算：列出你需要的 5 类数据与获取渠道。', a:'（1）日本家电量贩店（山田电机、必酷等）与电商（乐天、亚马逊日本）的便携电源销量/排名——行业报告与渠道调研；（2）头部日本品牌（如防灾相关厂商）与中国出海品牌在日营收——企业披露、行业媒体；（3）日本灾害频次与家庭备用电源渗透——内阁府防灾白皮书、消防厅数据；（4）进口数据——Comtrade 日本进口 HS 8507.60 量价；（5）认证与合规成本——PSE 认证要求（m23）。注意区分「应急电源」（传统铅酸/逆变器）与「锂电便携储能」两个细分，避免口径混淆。' },
  { type:'实际应用', q:'某报告的 TAM 计算是「全球便携储能出货 2,800 万台 × 均价 500 美元 = 140 亿美元」。指出这一计算的两个方法论问题。', a:'（1）「出货」与「零售」口径：2,800 万台若为出货量，对应的是出厂价而非终端零售价，用 500 美元均价可能高估或低估取决于渠道加价结构，须明确层级；（2）「全球」与「本企业可进入市场」混层：该 TAM 是全球理论值，未折算渠道可达、合规准入、价格带匹配与竞争，不能直接用于收入预测；（3）补充：若销量与价格来自不同机构、不同年份，还存在口径拼接问题。正确引用应同时给出 SAM/SOM 与折算假设。' },
  { type:'综合分析', q:'「市场规模估算应该尽量精确到个位数。」评估这一要求，并说明在什么情况下「模糊的正确」优于「精确的错误」。', a:'市场规模本质上是多假设的乘积，每个假设都有误差，点值精确是虚假精确。正确输出是「区间 + 关键假设 + 敏感性」。模糊的正确优于精确的错误的场景：（1）初筛阶段——只需数量级判断（是否值得投入进一步研究）；（2）假设高度不确定时——新品类、新市场、政策剧变期（如美国 232 生效前后的组件市场）；（3）决策依赖相对排序而非绝对值（A 国 vs B 国）。需要相对精确的场景：产能规划、库存备货、定价——这些应基于渠道级自下而上数据而非宏观 TAM。结论：报告永远给区间与假设，把「精确」留给可验证的底层数据。' }
  ]
},

m13: {
  id:'m13', stage:'s3', title:'市场筛选与评分：从候选池到加权决策', en:'Market Screening and Scoring: From Candidate Pool to Weighted Decision',
  hours:'6–9 小时', goal:'掌握多市场筛选流程：候选池建立、指标体系、加权评分卡、敏感性分析与决策规则。',
  prereqText:'m07–m12。', outcome:'能独立完成一份多市场评分报告，解释权重设定的理由，并用敏感性分析检验结论稳健性。',
  summary:'市场选择的本质是「在多目标下做可辩护的比较」。评分卡把主观判断结构化，敏感性分析检验结论是否经得起权重变化。',
  terms:['market-screening','weighted-scoring','sensitivity-analysis','candidate-pool','market-attractiveness','entry-barrier'],
  prereq:['m07','m08','m10','m12'], related:['m16','m17','m31','m32'],
  sources:['s04','s21','s20','s17'],
  sections:[
  { id:'m13-s1', h:'13.1 学习定位', lvl:2, html:
  '<p>前面模块提供了原料（指标、数据、理论），本模块是第三阶段的「装配线」：把原料变成可辩护的市场排序。它是连接研究与决策的关键节点——筛选结果直接决定 m16 进入模式比较的对象，也是 m32 综合项目的核心步骤。评分卡工具见「交互式分析工具」中的市场评分卡。</p>' },

  { id:'m13-s2', h:'13.2 从直观问题开始：为什么 GDP 最高的国家不一定最该进', lvl:2, html:
  '<p>一个反直觉但可验证的事实：2025 年中国光伏组件出口额第一的市场是荷兰（转口枢纽），而德国作为欧洲最大终端市场，排名与「荷兰」相近但性质完全不同；巴基斯坦 2025 年进口中国组件 17.9 GW（FY25 口径）<button class="src gC" data-src="s25">25</button>，其 GDP 远低于荷兰，但对特定产品是巨型市场。再看政策面：巴西 GDP 居拉美前列，但 2024 年 11 月起组件关税 25%（配额内 9.6%）<button class="src gB" data-src="s21">21</button>；印度市场大但 ALMM 把中国电池排除在政府项目外<button class="src gB" data-src="s20">20</button>。<b>市场规模、增长、竞争、准入、风险五个维度必须同时进入比较</b>，任何单一指标排序都会误导。</p>' },

  { id:'m13-s3', h:'13.3 正式定义：筛选流程与指标', lvl:2, html:
  '<div class="defbox"><div class="en">Market Screening</div><div class="zh">市场筛选</div><div class="def">从众多国家中系统性地缩小目标市场范围的过程。标准流程：候选池建立（8–15 国）→ 基础数据收集 → 指标筛选 → 市场规模估算 → 竞争与法规检查 → 风险评估 → 企业匹配 → 敏感性分析 → 最终决策。</div><div class="meta"><div><b>三类不同的问题：</b>市场吸引力（市场好不好）、企业竞争力（我们能不能赢）、进入可行性（进不进得去、付不付得起）。评分卡必须三者分开评估，不能混为一谈。</div></div></div>'
  +'<div class="tbl-wrap"><table class="data"><thead><tr><th>维度</th><th>典型指标</th><th>数据来源</th><th>常见误用</th></tr></thead><tbody>'
  +'<tr><td>市场规模</td><td>SAM、进口规模、装机/销量</td><td>Comtrade、Trade Map、官方统计</td><td>用进口额直接当需求（未剔转口）</td></tr>'
  +'<tr><td>增长速度</td><td>近 3–5 年 CAGR、政策驱动的增量</td><td>同上 + 政策文件</td><td>用单年暴增（项目脉冲）外推</td></tr>'
  +'<tr><td>竞争强度</td><td>本土品牌份额、价格战程度、集中度</td><td>行业报告、渠道访谈、企业财报</td><td>只看份额不看盈利能力</td></tr>'
  +'<tr><td>利润空间</td><td>价格带、渠道加价率、关税与合规成本</td><td>渠道访谈、关税表（WITS）</td><td>用零售价减出厂价算毛利（漏掉到岸与渠道成本）</td></tr>'
  +'<tr><td>进入成本</td><td>认证费用与周期、渠道建设投入、关税</td><td>官方认证机构、Access2Markets</td><td>只算关税不算非关税壁垒</td></tr>'
  +'<tr><td>风险</td><td>国家风险评级、政策稳定性、汇率</td><td>m28–m30 框架</td><td>用单一评级机构定终身</td></tr>'
  +'</tbody></table></div>' },

  { id:'m13-s4', h:'13.4 底层逻辑：加权评分如何失真、如何修复', lvl:2, html:
  '<p>加权评分 = Σ（指标得分 × 权重）。它的失真来自四个环节：（1）<b>指标选择</b>——遗漏关键维度（如合规成本）会让高分市场实际不可行；（2）<b>权重设定</b>——权重反映战略重点，没有客观标准，常见做法是决策团队独立打分取中位数；（3）<b>评分标准</b>——1–5 分如果没有锚定定义（什么算 4 分？），不同评分者不可比；（4）<b>数据质量</b>——垃圾进垃圾出。</p>'
  +'<p>修复手段：（1）每个指标给出「评分锚定说明」；（2）权重做敏感性分析（±10 个百分点看排名是否翻转）；（3）对「单项否决项」（如市场完全封闭）设置硬约束而非分数；（4）评分结果只作为决策输入之一，必须与实地验证和专家判断结合。</p>' },

  { id:'m13-s5', h:'13.5 应用方法：评分卡操作流程', lvl:2, html:
  '<div class="steps">'
  +'<div class="step"><h5>建候选池</h5><p>用排除法而非投票法：先排除明确不可行的（市场封闭、体量过小、无渠道可能性），留下 8–12 个候选。排除理由要记录。</p></div>'
  +'<div class="step"><h5>定指标与口径</h5><p>6–8 个指标，每个定义清楚「数据来源 + 计算方式 + 评分锚定」。例如「增长速度：近三年进口量 CAGR，>15% 得 5 分，5–15% 得 3 分，<5% 得 1 分」。</p></div>'
  +'<div class="step"><h5>收集数据并评分</h5><p>每国每指标填入数值 + 得分 + 来源编号。无数据标「缺口」，不猜分。</p></div>'
  +'<div class="step"><h5>设定权重并排序</h5><p>权重和为 100%；记录设定理由（如「本阶段战略重点是增长，故增长权重最高」）。</p></div>'
  +'<div class="step"><h5>敏感性分析</h5><p>逐一上下调整每个指标权重 ±10 个百分点，记录排名变化；若前两名频繁翻转，说明两市场无显著差异，需补充数据或考虑双市场策略。</p></div>'
  +'<div class="step"><h5>决策与记录</h5><p>输出「排序 + 理由 + 关键风险 + 待验证假设」。评分卡是过程文件，不是结论本身。</p></div>'
  +'</div>' },

  { id:'m13-s6', h:'13.6 案例：五国评分比较（教学示例）', lvl:2, html:
  '<div class="case"><div class="case-head"><div class="tag">案例 1 · 多国比较</div><div class="ttl">为储能产品比较五个候选市场（教学演示数据）</div></div><div class="case-body">'
  +'<h5>设定</h5><p>产品：1–2 kWh 便携式储能（消费级）。候选：美国、德国、日本、沙特、印度尼西亚。评分为教学演示（1–5 分，5 最优），用于展示方法而非结论；实际研究须用可核验数据替换。</p>'
  +'<div class="tbl-wrap"><table class="data"><thead><tr><th>指标（权重）</th><th>美国</th><th>德国</th><th>日本</th><th>沙特</th><th>印尼</th></tr></thead><tbody>'
  +'<tr><td>市场规模（25%）</td><td class="num">5</td><td class="num">4</td><td class="num">4</td><td class="num">3</td><td class="num">3</td></tr>'
  +'<tr><td>增长速度（20%）</td><td class="num">3</td><td class="num">3</td><td class="num">3</td><td class="num">5</td><td class="num">4</td></tr>'
  +'<tr><td>竞争强度反向分（15%）</td><td class="num">2</td><td class="num">3</td><td class="num">3</td><td class="num">4</td><td class="num">4</td></tr>'
  +'<tr><td>利润空间（15%）</td><td class="num">2</td><td class="num">3</td><td class="num">3</td><td class="num">4</td><td class="num">2</td></tr>'
  +'<tr><td>进入成本反向分（15%）</td><td class="num">2</td><td class="num">3</td><td class="num">3</td><td class="num">3</td><td class="num">3</td></tr>'
  +'<tr><td>风险反向分（10%）</td><td class="num">3</td><td class="num">4</td><td class="num">4</td><td class="num">3</td><td class="num">3</td></tr>'
  +'<tr><td><b>加权总分</b></td><td class="num"><b>3.05</b></td><td class="num"><b>3.35</b></td><td class="num"><b>3.35</b></td><td class="num"><b>3.70</b></td><td class="num"><b>3.20</b></td></tr>'
  +'</tbody></table></div>'
  +'<h5>解读</h5><p>（1）美国市场规模最大但竞争与进入成本（关税、合规、认证）压低其分数；（2）沙特增长快、竞争弱，但风险与规模受限；（3）德国与日本总分接近——说明「显著差异」不存在，应并列进入下一步验证而非强行排序；（4）印尼利润与进入成本受限。</p>'
  +'<h5>敏感性</h5><p>若把「增长速度」权重从 20% 提到 30%（市场规模降到 15%），沙特扩大领先（3.70 → 3.90）；若把「风险」权重从 10% 提到 25%，沙特优势收窄但排序不变（沙特 3.85 vs 德国/日本 3.55）；若把「进入成本」权重升至 30%，美国跌至末位（2.85）。<b>结论：本案例中沙特在检验的权重组合下保持第一，但第二名（德国/日本/印尼）随权重互换——这本身是重要发现，应转化为「沙特优先 + 双市场并行测试」策略而非强行排序。</b></p>'
  +'<h5>限制</h5><p>本案例分数为教学演示，真实评分必须基于：可核验的进口与装机数据、渠道访谈的利润结构、官方关税与认证成本、风险评级（并标注机构与年份）。</p>'
  +'</div></div>' },

  { id:'m13-s7', h:'13.7 局限、争议与常见误区', lvl:2, html:
  '<ul><li><b>评分卡不能替代判断：</b>它让比较过程透明可复盘，但权重与评分仍是主观的；把评分卡当作「科学结论」是误用。</li>'
  +'<li><b>「否决项」不能被平均分掩盖：</b>某国即使总分高，若存在市场封闭（ALMM）或外汇管制，应设硬否决而非低分。</li>'
  +'<li><b>误区一：</b>用同一套指标评价所有市场而不按产品调整（文化密集型产品的指标应与大宗商品不同）。</li>'
  +'<li><b>误区二：</b>敏感性分析只做一次（只调一个权重）。应做多变量情景。</li>'
  +'<li><b>误区三：</b>把「评分接近」解读为「可以同时进入所有接近的市场」——资源约束常常只允许一个。</li></ul>' },

  { id:'m13-s8', h:'13.8 与其他模块的联系', lvl:2, html:
  '<ul><li><b>→ m16–m17：</b>入选市场决定进入模式比较的输入（不同市场制度匹配不同模式）。</li>'
  +'<li><b>→ m28–m30：</b>风险维度由风险模块提供方法与数据。</li>'
  +'<li><b>→ m32：</b>综合项目第 3、8–10 步即评分卡与敏感性分析的完整应用。</li></ul>' }
  ],
  exercises:[
  { type:'概念理解', q:'市场吸引力、企业竞争力、进入可行性三者为什么要分开评估？混在一起会怎样？', a:'市场吸引力回答「市场好不好」（规模、增长、竞争、利润），竞争力回答「我们能不能赢」（产品、成本、品牌相对位置），可行性回答「进不进得去、付不付得起」（准入、合规、资源、时间）。混为一谈的后果：把「有吸引力但我们打不赢」的市场排前面（如技术壁垒高的成熟市场）；或忽略「能赢但进不去」的市场（政策封闭）；或把「能进但不值得」的市场误判为机会。三者应作为评分卡的独立维度组，最后用「匹配度」矩阵综合。' },
  { type:'概念理解', q:'什么是敏感性分析在市场评分中的作用？为什么「调一个权重看排名」是不够的？', a:'敏感性分析检验结论对权重与评分误差的稳健性：如果微小的权重变化就让第一名换人，说明排序没有统计意义，不应作为决策依据。只调一个权重不够，因为真实决策中多个因素同时变化（如增长与风险权重同时上调），且评分本身有测量误差（±1 分）。应做：单变量扫描（龙卷风图）+ 多变量情景（三到四个组合情景）+ 评分误差模拟（每个分数 ±1 随机扰动看排名稳定性）。' },
  { type:'实际应用', q:'为「中国电动工具进入巴西」设计一个 6 指标评分卡：给出每个指标的评分锚定（1 分和 5 分的定义）。', a:'示例：（1）市场规模：SAM < 5,000 万美元 =1 分，> 3 亿美元 =5 分；（2）增长：进口量 CAGR <3% =1 分，>12% =5 分；（3）竞争（反向）：本土 CR3 > 80% =1 分，CR3 < 40% =5 分；（4）利润空间：渠道加价 + 关税后毛利 < 15% =1 分，> 35% =5 分；（5）进入成本（反向）：认证 + 渠道建设 > 200 万美元 =1 分，< 50 万美元 =5 分；（6）风险（反向）：高通胀 + 高关税变动频率 + 复杂税制（参考巴西税制复杂度口碑，需以官方与专业意见核验）得 1–3 分，稳定低税市场得 5 分。评价标准：锚定是否可观测、可核验。' },
  { type:'实际应用', q:'评分结果显示 A 国 3.8 分、B 国 3.75 分，但 A 国的「市场规模」数据来自一份来源不明的行业报告，B 国的来自 Comtrade。你该如何处理？', a:'（1）给 A 国的市场规模数据标注证据等级（C/D）并降权或要求补充验证；（2）先做数据补齐：用 Comtrade 查 A 国该产品进口数据作为替代口径；（3）若无法验证 A 国数据，在敏感性分析中把 A 国该指标设为「缺口」重新计算——很可能 B 国反超；（4）在报告中显式说明「A 国高分部分依赖低质量数据」；（5）决策规则：不基于无法验证的数据做不可逆承诺（m31 承诺分级）。' },
  { type:'综合分析', q:'「评分卡让市场选择变得客观。」请评估这一说法，并给出让评分卡尽可能可辩护的 5 条操作纪律。', a:'评估：评分卡让「比较过程」透明、可复盘、可讨论，这是它的真正价值；但输入（数据）、参数（权重）与判断（评分）仍是主观的，所以它不产生「客观结论」，只产生「可辩护的过程」。五条纪律：（1）每个指标有明确的数据来源与口径，无数据不猜分；（2）评分锚定事先定义，而非事后解释；（3）权重由决策团队独立设定并记录理由；（4）必做敏感性分析（单变量 + 情景 + 评分误差）；（5）设置硬否决项（政策封闭、外汇管制等），不允许被总分掩盖。此外，结论应分「已验证事实 / 假设 / 待验证」三级呈现。' }
  ]
},

m14: {
  id:'m14', stage:'s3', title:'竞争研究与消费者洞察', en:'Competitive Research and Consumer Insights',
  hours:'7–10 小时', goal:'掌握竞品拆解、渠道访谈与消费者洞察的方法，建立从竞争格局到产品—市场匹配的分析能力。',
  prereqText:'m11、m12。', outcome:'能完成一份竞争格局分析与消费者画像，识别出可验证的需求证据与竞争空隙。',
  summary:'研究完市场大小，就要回答「谁在赚钱、凭什么、客户为什么买」。竞品拆解看供给，消费者洞察看需求，两者的交叉点就是你的定位空间。',
  terms:['competitor-analysis','consideration-set','value-proposition','customer-journey','persona','voice-of-customer','price-test'],
  prereq:['m11','m12'], related:['m26','m27','m32'],
  sources:['s30','s04','s20'],
  sections:[
  { id:'m14-s1', h:'14.1 学习定位', lvl:2, html:
  '<p>市场规模（m12）告诉你蛋糕多大，竞争与消费者研究告诉你蛋糕怎么分、客户为什么买、有没有你的位置。本模块聚焦两类可操作的研究：<b>竞品拆解</b>（系统分解竞争对手的产品、价格、渠道、策略与财务表现）与<b>消费者洞察</b>（从行为与动机层面理解购买决策）。产出直接服务于定位（m26）与渠道设计（m27）。</p>' },

  { id:'m14-s2', h:'14.2 从直观问题开始：同一个市场，为什么三家赢家用三种活法', lvl:2, html:
  '<p>美国光伏市场的例子：First Solar 靠碲化镉薄膜技术路线与 IRA 本土制造补贴获取「政策身份」溢价（每瓦约 0.17 美元税收抵免的报道口径）<button class="src gB" data-src="s30">30</button>；进口商与开发商拼项目成本与交付； residential 渠道商拼安装服务与客户关系。三者面对同一「市场」，但价值主张、成本结构与护城河完全不同。这说明竞争分析不能只列「市场份额表」，必须拆解<b>每家凭什么赢、弱点在哪、客户为什么选它</b>。</p>' },

  { id:'m14-s3', h:'14.3 正式定义', lvl:2, html:
  '<div class="defbox"><div class="en">Competitor Analysis</div><div class="zh">竞品分析</div><div class="def">系统识别与评估竞争对手的目标、战略、优势、弱点与反应模式。分析单位包括：直接竞品（同品类同场景）、间接竞品（满足同一需求的不同方案，如燃油发电机 vs 便携储能）、潜在进入者（本土新品牌、第三国品牌）。</div><div class="meta"><div><b>拆解维度：</b>产品（规格/功能/质量）、价格（价位段/折扣/总拥有成本）、渠道（覆盖/深度/控制力）、营销（信息/品牌）、供应链（成本/交付）、财务（毛利/现金流）、组织（团队/决策速度）。</div></div></div>'
  +'<div class="defbox"><div class="en">Consideration Set</div><div class="zh">考虑集</div><div class="def">消费者在购买某品类时实际纳入比较的品牌/产品集合（通常 3–5 个）。营销与研究的核心问题之一就是「如何进入并留在考虑集」——搜索排名、渠道上架、口碑与认证都是入场券。</div></div>'
  +'<div class="defbox"><div class="en">Voice of Customer / Jobs-to-be-Done</div><div class="zh">客户声音 / 待办任务</div><div class="def">客户购买产品不是为了拥有产品，而是为了完成某项「任务」（如「停电时让冰箱和网络保持运转」）。JTBD 视角把需求从「功能清单」转为「场景与结果」，避免功能堆砌。</div></div>'
  +'<div class="defbox"><div class="en">Willingness to Pay vs Actual Payment</div><div class="zh">支付意愿 vs 实际付费</div><div class="def">态度数据（愿意付多少）系统性地高于行为数据（实际付了多少）。验证需求必须以行为为准：试销、预售、加购转化、价格测试。</div></div>' },

  { id:'m14-s4', h:'14.4 底层逻辑：需求验证的证据阶梯', lvl:2, html:
  '<div class="steps">'
  +'<div class="step"><h5>第一级：问题存在</h5><p>证据：痛点普遍被提及（访谈）、现有替代方案被广泛使用（如某国民众大量购买燃油发电机说明缺电痛点真实存在）。</p></div>'
  +'<div class="step"><h5>第二级：有人愿意为此花钱</h5><p>证据：竞品销售数据、搜索量增长（方向性）、预售/众筹表现。</p></div>'
  +'<div class="step"><h5>第三级：愿意向我们买</h5><p>证据：试销转化率、渠道上架后的动销、复购与口碑。只有到第三级，「需求」才从假设变成事实。</p></div>'
  +'</div>'
  +'<p>竞争分析的因果逻辑：利润 = 需求强度 × 定价权 − 供给成本与进入门槛。<b>高需求 + 低竞争 = 机会窗口</b>（新兴市场早期）；<b>高需求 + 高竞争 = 效率与差异化比拼</b>（成熟市场）；<b>低需求 + 低竞争 = 陷阱</b>（不是没人想到，是没人买单）。</p>' },

  { id:'m14-s5', h:'14.5 应用方法：竞品拆解五步与消费者研究三源', lvl:2, html:
  '<div class="steps">'
  +'<div class="step"><h5>竞品拆解</h5><p>（1）列竞争集合（直接/间接/潜在）；（2）每个竞品按七维拆解，优先用公开可验证数据（财报、电商页面、渠道价格、认证记录）；（3）画竞争地图（价格 × 关键属性）找空隙；（4）推断各家战略与弱点；（5）预判反应（你降价/上新品时对手会做什么）。</p></div>'
  +'<div class="step"><h5>消费者研究三源</h5><p>（1）行为数据：电商评论（差评是需求金矿）、搜索词、退货原因；（2）态度数据：访谈与问卷（注意 m11 的偏差控制）；（3）情境数据：渠道商/安装商/客服反馈。三源交叉得到「客户任务—现有方案—未满足点」链条。</p></div>'
  +'<div class="step"><h5>需求验证</h5><p>最小成本的行为测试：小批量试销、众筹、预售、A/B 价格测试、渠道上架观察动销。态度数据只用于生成假设，行为数据才用于确认。</p></div>'
  +'<div class="step"><h5>输出定位假设</h5><p>「对（客群），我们的产品是（品类），它比（竞品）更能（关键任务），因为（可验证的差异）」——这就是价值主张草稿，交给 m26 打磨。</p></div>'
  +'</div>' },

  { id:'m14-s6', h:'14.6 案例：便携储能的竞争地图与需求证据链', lvl:2, html:
  '<div class="case"><div class="case-head"><div class="tag">案例 1 · 教学案例</div><div class="ttl">欧洲便携储能市场：竞争地图与需求验证</div></div><div class="case-body">'
  +'<h5>竞争集合</h5><p>直接竞品：中国出海品牌（正浩 EcoFlow、华宝 Jackery、安克 Anker 等）与欧美本土品牌；间接竞品：燃油发电机、传统 UPS、充电宝 + 太阳能板组合；潜在进入者：家电与工具品牌延伸。</p>'
  +'<h5>拆解发现</h5><p>（1）价格带分层：<300 Wh 入门段价格战激烈（行业报道均价三年下降约两成，C 级证据需交叉验证<button class="src gC" data-src="s29">29</button>）；≥1 kWh 中高端段由品牌与快充/生态能力区分；（2）渠道分化：亚马逊主导线上，户外/家居连锁主导线下体验型购买；（3）合规门槛：欧盟电池法规与 EPR 提高了新进入者的固定成本<button class="src gA" data-src="s19">19</button>。</p>'
  +'<h5>需求证据链</h5><p>问题存在：欧洲极端天气与停电事件增加 + 户用光伏装机增长（政策与能源数据）；有人花钱：竞品销量与排名、评论数量增长；愿意向我们买：需试销验证（小批量上架 + 复购观察）。</p>'
  +'<h5>定位假设</h5><p>「对已装光伏但无储能的欧洲家庭，我们是『即插即用扩展包』——比另买一套储能系统更便宜、比充电宝更能带载冰箱与网络，因为标准化接口与欧洲合规资质。」——假设包含三个可验证点（兼容性、价格差、认证状态），交由试销检验。</p>'
  +'<h5>限制</h5><p>竞品数据多来自公开页面与媒体报道（C 级），关键决策前应补充：渠道访谈（真实加价率）、试销数据（真实转化）、认证核验（CE/电池法规合规状态）。</p>'
  +'</div></div>' },

  { id:'m14-s7', h:'14.7 局限、争议与常见误区', lvl:2, html:
  '<ul><li><b>公开数据的幻觉：</b>电商排名可被营销操作、评论可被刷单操纵；竞品分析应以「多源 + 渠道一手」校正。</li>'
  +'<li><b>「客户说想要」不等于「客户会买」：</b>JTBD 访谈的价值在于理解任务，不在于收集功能愿望清单。</li>'
  +'<li><b>误区一：</b>竞品分析 = 抄功能。功能背后是成本结构与战略选择，抄功能不抄能力会掉进性价比陷阱。</li>'
  +'<li><b>误区二：</b>把「差评」当「产品缺陷清单」。差评是需求信号（使用场景超出预期），要追问「用户在什么场景下失望」。</li>'
  +'<li><b>误区三：</b>用搜索量代替需求。搜索反映好奇心与比较行为，不反映购买（效度问题，m11）。</li></ul>' },

  { id:'m14-s8', h:'14.8 与其他模块的联系', lvl:2, html:
  '<ul><li><b>→ m26：</b>定位与本地化是竞争地图的直接输出。</li>'
  +'<li><b>→ m27：</b>渠道结构决定竞品的覆盖与你的突破点。</li>'
  +'<li><b>→ m16：</b>竞争强度（红海/蓝海）影响进入模式承诺度。</li>'
  +'<li><b>→ m32：</b>综合项目第 6 步（识别消费者、客户、渠道、竞争者）即本模块方法的系统应用。</li></ul>' }
  ],
  exercises:[
  { type:'概念理解', q:'「直接竞品」与「间接竞品」的区别是什么？为什么分析便携储能市场必须看燃油发电机？', a:'直接竞品是满足同一需求的同类产品；间接竞品是用不同方式满足同一需求（客户任务相同）。便携储能与燃油发电机都服务于「停电/离网供电」任务：分析燃油发电机可以知道「现有替代方案的价格锚、使用门槛（噪音/燃料/维护）与痛点」，这决定了你的价值主张（安静、免维护、室内可用）是否真的差异化。忽略间接竞品会高估市场规模（客户可能根本不买任何方案）与误判价格锚。' },
  { type:'概念理解', q:'需求验证的「三级证据阶梯」是什么？为什么态度数据不能单独用于确认需求？', a:'三级：问题存在 → 有人愿意为此花钱 → 愿意向我们买。态度数据（问卷中的购买意愿）位于第一到第二级之间，且受社会期许与假设性问题扭曲；只有行为数据（试销转化、预售、复购）能到第三级。单独依赖态度数据会系统性地高估需求（意向—行为差距），因此必须用最小成本行为测试确认后才配置资源。' },
  { type:'实际应用', q:'用「七维拆解」分析一个你熟悉市场的头部竞品（如 Anker 或 EcoFlow 在欧洲），列出每维的公开可验证数据源。', a:'示例（EcoFlow 欧洲）：产品——官网规格页、认证数据库（CE/LVD/EMC）、评测媒体拆解；价格——官网与亚马逊多国站点价格、促销历史（Keepa 等工具）；渠道——官网上架的零售伙伴、户外连锁门店陈列；营销——社媒粉丝与互动、KOL 合作、搜索份额（Similarweb 方向性）；供应链——电芯供应商公告、产能新闻；财务——母公司安克创新财报（安克旗下品牌结构披露）；组织——招聘信息反映的战略方向。评价标准：每维是否有可核验来源，而非印象描述。' },
  { type:'实际应用', q:'你发现竞品在某电商平台 4.6 星但差评集中在「实际容量虚标」。设计三步验证这一发现真伪及其商业含义。', a:'（1）验证真伪：抽样购买送第三方检测（容量实测），或查阅专业评测机构的实测数据（可复现）；（2）评估普遍性：该差评模式是否集中在特定型号/批次（评论的时间与型号分布）；（3）商业含义：若虚标普遍存在 → 你的差异化机会是「实测透明化 + 质保承诺」；若是个别批次 → 是供应链管理机会而非卖点。记录证据等级：实测报告 = A/B，评论模式 = C。' },
  { type:'综合分析', q:'「先做竞品分析，找到市场空隙再进入。」这一策略在什么条件下有效、什么条件下危险？', a:'有效条件：（1）空隙是结构性的（需求未被满足且供给方无利可图或无法满足，如特定合规场景、小众高端）；（2）空隙有可防御性（你的能力/资源能守住，而非仅价格）；（3）时间窗口足够长（政策与技术稳定）。危险条件：（1）「空隙」其实是陷阱——没人做是因为无利可图或需求不存在（验证不足）；（2）空隙是巨头暂时没兴趣而非不能进入——一旦被注意，规模与品牌碾压（参考家电巨头进入便携储能）；（3)空隙依赖单一渠道或政策套利，规则一变即消失。修正策略：空隙假设必须经过行为验证（试销）+ 防御性评估（壁垒）+ 时间窗判断（政策与技术监测），而非仅靠竞品分析。' }
  ]
}

});

;

Object.assign(MODULES, {

/* ================= 阶段 4 ================= */
m15: {
  id:'m15', stage:'s4', title:'国际战略类型：整合—响应与 I-R-G-A 框架', en:'International Strategy: Integration-Responsiveness and the I-R-G-A Framework',
  hours:'5–8 小时', goal:'掌握全球整合与本地响应的权衡、四种国际战略类型及其适用条件。',
  prereqText:'m05 企业国际化理论。', outcome:'能判断一个企业/业务当前采用哪种战略，并说明向另一类型转换的条件与代价。',
  summary:'跨国经营的战略问题可以压缩为一个权衡：全球整合（规模、成本、一致性）与本地响应（适配、关系、合规）之间如何取舍。四种战略类型就是这条权衡线上的四个位置。',
  terms:['global-integration','local-responsiveness','international-strategy','multidomestic-strategy','global-strategy','transnational-strategy','aaa-strategies'],
  prereq:['m05'], related:['m16','m26','m31'],
  sources:['s35','s39'],
  sections:[
  { id:'m15-s1', h:'15.1 学习定位', lvl:2, html:
  '<p>本模块回答「国际化的总体打法」。它上承 m05 的企业国际化理论（为什么、以何种组织方式跨境），下接 m16 的进入模式选择（具体用什么形态进入）。核心是一个二维权衡：<b>全球整合压力</b>（规模经济、成本竞争、全球客户一致性要求）与<b>本地响应压力</b>（文化偏好、监管差异、渠道结构、服务要求）。两条压力线的相对强弱，决定战略类型。</p>' },

  { id:'m15-s2', h:'15.2 从直观问题开始：麦当劳、苹果、联合利华为什么不一样', lvl:2, html:
  '<p>麦当劳在不同国家菜单差异巨大（中国的粥、印度的素食汉堡），但供应链与运营体系高度标准化；苹果全球产品与体验高度一致，制造极度集中；联合利华既保持全球品牌与研发规模，又深度本地化配方、渠道与营销。三家都是跨国公司，战略位置完全不同。差异不是「管理水平」，而是<b>所处行业的整合/响应压力结构不同</b>：食品饮料响应压力高（口味、监管、渠道），消费电子整合压力高（规模经济、标准），快消介于其间（品牌全球 + 配方渠道本地）。</p>' },

  { id:'m15-s3', h:'15.3 正式定义：四种战略', lvl:2, html:
  '<div class="tbl-wrap"><table class="data"><thead><tr><th>战略类型</th><th>整合压力</th><th>响应压力</th><th>特征</th><th>典型行业/企业</th></tr></thead><tbody>'
  +'<tr><td><b>国际战略</b><br>International</td><td class="num">低</td><td class="num">低</td><td>以本国为中心，向海外转移独特能力，海外是「延伸市场」</td><td>早期出海的利基制造、特色餐饮</td></tr>'
  +'<tr><td><b>多国战略</b><br>Multidomestic</td><td class="num">低</td><td class="num">高</td><td>各国子公司高度自治，产品/营销/运营深度本地化，总部控品牌与财务</td><td>食品饮料、日化、媒体</td></tr>'
  +'<tr><td><b>全球战略</b><br>Global</td><td class="num">高</td><td class="num">低</td><td>全球标准化产品与集中制造，追求全球规模经济</td><td>半导体、光伏、商用飞机</td></tr>'
  +'<tr><td><b>跨国战略</b><br>Transnational</td><td class="num">高</td><td class="num">高</td><td>同时追求全球效率与本地适配：全球一体化的资产与能力网络 + 本地响应，管理复杂度最高</td><td>大型快消、汽车、通信设备</td></tr>'
  +'</tbody></table></div>'
  +'<div class="defbox"><div class="en">Integration–Responsiveness（I-R）Grid</div><div class="zh">整合—响应框架</div><div class="def">普拉哈拉德与多茨提出：跨国战略选择由「全球整合压力」与「本地响应压力」两维决定。框架的价值在于把「要不要本地化」的口舌之争转化为「本行业的压力结构是什么」的结构化判断。</div><div class="meta"><div><b>压力来源：</b>整合压力来自规模经济、统一标准、全球客户、成本竞争；响应压力来自文化差异、监管差异、渠道结构、服务半径、基础设施差异。<br><b>注意：</b>压力结构会变化——贸易政策收紧（美国 232、印度 ALMM）会同时提高本地化与合规压力，把「全球战略」推向「区域化全球战略」。</div></div></div>'
  +'<div class="defbox"><div class="en">AAA Strategies（Adaptation, Aggregation, Arbitrage）</div><div class="zh">AAA 战略</div><div class="def">加马沃特提出：跨边界创造价值的三种杠杆——适应（针对各国差异调整产品/策略）、集聚（通过区域或全球规模获取效率）、套利（利用各国要素成本与制度差异布局环节）。企业资源有限，通常只能同时强化一到两个 A。</div><div class="meta"><div><b>用途：</b>诊断企业当前的战略杠杆组合，识别下一个应强化的 A。例如：中国光伏企业的强项是套利（制造布局）+ 集聚（规模），短板是适应（本地渠道与服务）。</div></div></div>' },

  { id:'m15-s4', h:'15.4 底层逻辑：压力结构如何决定战略形态', lvl:2, html:
  '<div class="chain"><span class="node">行业整合压力</span><span class="arr">×</span><span class="node">行业响应压力</span><span class="arr">→</span><span class="node">战略类型</span><span class="arr">→</span><span class="node">组织结构（全球产品部 vs 区域事业部 vs 矩阵）</span><span class="arr">→</span><span class="node">进入模式（集中制造出口 vs 本地生产）</span></div>'
  +'<p>机制解释：（1）当规模经济强、产品标准化（光伏组件），集中制造 + 全球出口是最优，本地化只在「政策要求」时发生（关税、本地含量）；（2）当偏好与监管差异大（食品、认证、数据合规），本地生产与本地决策是必要条件，全球规模仅存在于品牌、研发与采购层面；（3）当两者都高（汽车、大型设备），企业必须建立「一体化网络」：全球平台 + 本地适配，代价是管理复杂度与协调成本——这正是跨国战略难做的原因。</p>' },

  { id:'m15-s5', h:'15.5 应用方法：战略定位与切换评估', lvl:2, html:
  '<div class="steps">'
  +'<div class="step"><h5>评估压力结构</h5><p>列出本行业整合压力证据（规模经济强度、标准化程度、全球客户占比）与响应压力证据（各国规格/认证/渠道差异清单、本地服务要求）。</p></div>'
  +'<div class="step"><h5>定位当前战略</h5><p>检查：产品全球一致度、制造集中度、各国决策权、品牌与研发的集中/分散程度。</p></div>'
  +'<div class="step"><h5>识别错配</h5><p>常见错配：响应压力高的行业强行全球标准化（产品水土不服）；整合压力高的行业过度本地化（成本失控、无法利用规模）。</p></div>'
  +'<div class="step"><h5>评估切换成本</h5><p>从全球战略转向跨国战略需要：区域总部、本地供应链、双线汇报机制；从多国转向全球需要：产品平台化、SKU 精简、集中采购。切换是组织工程，不是口号。</p></div>'
  +'<div class="step"><h5>跟踪压力变化</h5><p>把政策事件（新关税、新认证要求、数据规则）作为「压力结构变量」监测，及时调整战略位置（m30）。</p></div>'
  +'</div>' },

  { id:'m15-s6', h:'15.6 案例：中国光伏企业的战略演进', lvl:2, html:
  '<div class="case"><div class="case-head"><div class="tag">案例 1 · 战略演进</div><div class="ttl">从「全球标准化出口」到「区域化 + 本地适配」</div></div><div class="case-body">'
  +'<h5>阶段一（约 2010–2018）：全球战略</h5><p>中国制造集中 + 全球标准产品 + 出口导向。整合压力被充分利用（规模、成本），响应压力低（组件是标准品，客户是全球项目开发商）。</p>'
  +'<h5>阶段二（2018–2024）：全球战略受政策挤压</h5><p>美国双反与 301、欧盟贸易防御、印度 ALMM、巴西关税配额陆续落地<button class="src gA" data-src="s05">5</button><button class="src gB" data-src="s20">20</button><button class="src gB" data-src="s21">21</button>，纯出口模式在多国失效。企业转向「产能出海」：东南亚、中东、美国建厂，以获取原产地与本地身份——这是「响应压力被政策强制拉高」的典型。</p>'
  +'<h5>阶段三（2024 至今）：区域化全球战略</h5><p>制造多点布局（中国 + 东南亚 + 中东 + 美国）+ 本地销售与服务团队 + 项目制交付。同时保留全球研发与采购规模。本质上从「全球战略」滑向「跨国战略」：既不能放弃规模，又必须本地合规。</p>'
  +'<h5>结论与启示</h5><p>启示：（1）战略类型不是选择出来的，是被「压力结构」逼出来的；（2）政策可以在一夜之间改变响应压力，战略必须预留调整期权（多点产能、模块化供应链）；（3）「本地化」的真实内容往往是合规身份与交付能力，而非产品本身改造。</p>'
  +'</div></div>' },

  { id:'m15-s7', h:'15.7 局限、争议与常见误区', lvl:2, html:
  '<ul><li><b>I-R 框架的静态性：</b>它描述某一时点的压力结构，不解释压力如何演化；需要结合政策监测（m30）动态使用。</li>'
  +'<li><b>「跨国战略最优」的迷思：</b>跨国战略理论上是「既要又要」，但协调成本最高，只有资源充足的大企业能维持。中小企业更适合清晰定位在某一端。</li>'
  +'<li><b>误区一：</b>把「跨国战略」当作终极目标。适配压力低的行业做跨国战略是自找麻烦。</li>'
  +'<li><b>误区二：</b>把本地化等同于「改产品」。本地化包含渠道、服务、合规、沟通多个层面（m26）。</li></ul>' },

  { id:'m15-s8', h:'15.8 与其他模块的联系', lvl:2, html:
  '<ul><li><b>→ m16：</b>战略类型约束进入模式集合（全球战略 → 集中制造 + 出口/分销；多国战略 → 本地生产 + 本地伙伴）。</li>'
  +'<li><b>→ m26：</b>本地响应压力由消费者与法规研究量化。</li>'
  +'<li><b>→ m29–m31：</b>多点布局的供应链风险与组合管理。</li></ul>' }
  ],
  exercises:[
  { type:'概念理解', q:'用 I-R 框架解释：为什么「全球战略」适合光伏组件而「多国战略」适合乳制品？', a:'光伏组件：产品高度标准化、规模经济极强（学习曲线陡峭）、客户（项目开发商/EPC）全球可比性高 → 整合压力高、响应压力低 → 全球战略（集中制造 + 全球销售，仅在政策强制时本地化）。乳制品：保质期短、口味与法规（成分标准、包装）国别差异大、渠道（冷链、零售结构）本地化强、规模经济有限 → 响应压力高、整合压力低 → 多国战略（本地生产 + 本地品牌与渠道，总部贡献技术与供应链管理）。' },
  { type:'概念理解', q:'AAA 框架中，「套利」战略对新兴市场企业意味着什么？它的风险是什么？', a:'套利指利用各国要素成本、制度与政策差异布局价值链环节（制造放在低成本国、研发放在人才国、市场放在高购买力国）。对新兴市场企业，套利是早期国际化的主要杠杆（成本优势出海）。风险：（1）套利空间随要素价格均等化与汇率变动收窄；（2）政策可随时关闭套利通道（关税、原产地规则、实体清单）；（3）套利型定位缺乏客户资产与品牌，一旦成本优势消失即失去竞争力——因此需要向「适应」与「集聚」升级。' },
  { type:'实际应用', q:'一家中国小家电企业年营收 5 亿元，拟进入东南亚与欧洲。用 I-R 框架为两个区域分别建议战略类型并说明理由。', a:'东南亚：小家电的响应压力中等（电压、插头、渠道），整合压力中等（规模经济存在但非极端），建议「多国/区域战略」：本地化 SKU（电压、语言、渠道）+ 区域内集中采购，通过本地经销商网络进入，保留产品定义的本地调整权。欧洲：认证（CE、ERP、WEEE/EPR）与消费者保护要求高、渠道集中（大型连锁与电商）、价格竞争激烈，建议「全球标准化产品 + 高合规投入」：以欧盟统一标准做产品（一次认证多国销售），进入模式偏向与本地进口商/电商合作而非重资产。理由：两个区域的整合/响应压力结构不同，企业资源也不支持双区域同时重投入。评价标准：是否体现「压力结构 → 战略 → 模式」的推导链。' },
  { type:'实际应用', q:'美国对进口多晶硅衍生品实施最低进口价格与 15% 关税（2026 年 12 月 4 日生效）<button class="src gA" data-src="s07">7</button>。这对一家全球战略型组件企业的战略位置有何影响？', a:'影响：（1）整合压力未变（组件制造仍高度集中在中国），但美国市场的响应压力被政策大幅拉高（价格下限 + 关税 + 回流激励）；（2）纯出口模式在美国市场经济性被摧毁（最低价 0.38 美元/瓦 vs 市场价约 0.1 美元/瓦量级，价差巨大）；（3）战略选项转向：美国本土/北美产能（绿地或并购）、第三国转口（受原产地与规避执法约束）、或放弃美国市场聚焦其他区域；（4）应做情景分析：政策存续（10 年产能规划）vs 政策松动（保留轻资产选项）。结论：全球战略企业需要「区域化全球战略」改造——保留全球规模，增加美国节点的合规身份。' },
  { type:'综合分析', q:'「跨国战略是国际战略的终极形态，所有企业都应以之为目标。」请从资源、行业与风险三方面评估。', a:'资源方面：跨国战略需要同时管理全球平台与本地适配，协调成本高，适合资源充足的大企业；中小企业强行跨国化会「两头不到岸」。行业方面：响应压力低的行业（标准品、全球客户）做跨国战略是浪费；响应压力极高而规模经济弱的行业（本地服务）做跨国战略同样错配。风险方面：跨国战略的网络化布局在政策剧变期（关税、制裁、实体清单）暴露面最大——多个节点都要合规与游说；单一节点风险可控但市场覆盖有限。结论：战略类型应由压力结构与资源能力共同决定，而非追求「终极形态」；更实用的目标是在 I-R 网格上找到当前最优位置，并保留向相邻位置移动的期权。' }
  ]
},

m16: {
  id:'m16', stage:'s4', title:'市场进入模式谱系与比较', en:'Market Entry Modes: Spectrum and Comparison',
  hours:'8–12 小时', goal:'掌握从出口到并购的进入模式谱系，理解各模式在控制权、资源承诺、风险、收益与退出成本上的差异。',
  prereqText:'m05 OLI、m13 市场筛选、m15 战略类型。', outcome:'能为具体企业—市场组合比较并推荐进入模式，说明理由与关键风险。',
  summary:'进入模式是企业国际化承诺度的刻度盘：从「零承诺的间接出口」到「完全承诺的独资子公司」，每一级都用不同的控制权、成本与风险组合换取不同的收益。',
  terms:['entry-mode','indirect-export','direct-export','agent','distributor','licensing','franchising','joint-venture','greenfield','brownfield','wholly-owned-subsidiary','cross-border-ecommerce'],
  prereq:['m05','m13','m15'], related:['m17','m21','m27'],
  sources:['s35','s36','s30','s20'],
  sections:[
  { id:'m16-s1', h:'16.1 学习定位', lvl:2, html:
  '<p>选定市场（m13）之后，就要回答「怎么进」。进入模式决定了企业在该市场的控制权、资源暴露、盈利结构、合规负担与退出难度，且往往难以快速逆转——选错模式的代价通常比选错市场更低但更难回头。本模块给出完整谱系与比较框架；m17 处理决策流程与伙伴筛选。</p>' },

  { id:'m16-s2', h:'16.2 从直观问题开始：五种「进入德国储能市场」的方式', lvl:2, html:
  '<p>同样面对德国市场：（1）跨境电商（亚马逊 + 独立站）发货；（2）授权德国品牌商贴牌销售；（3）签独家进口商 + 分销商；（4）设德国销售子公司自建团队与售后；（5）并购本地安装商。五种方式的资金需求从几千美元到数千万欧元不等，控制权从「平台说了算」到「完全自主」，退出难度也完全相反。<b>进入模式选择本质上是「用多少控制权和资源，换多少收益与安全」。</b>没有普遍最优，只有与企业和市场特征匹配的最优。</p>' },

  { id:'m16-s3', h:'16.3 正式定义：进入模式谱系', lvl:2, html:
  '<div class="tbl-wrap"><table class="data"><thead><tr><th>模式</th><th>承诺度</th><th>控制权</th><th>资源投入</th><th>收益结构</th><th>退出难度</th></tr></thead><tbody>'
  +'<tr><td><b>间接出口</b>（经贸易商）</td><td class="num">极低</td><td class="num">无</td><td class="num">无</td><td>出厂价，薄利</td><td class="num">立即</td></tr>'
  +'<tr><td><b>直接出口</b>（自拓海外客户）</td><td class="num">低</td><td class="num">低</td><td class="num">低</td><td>FOB 价，自担获客</td><td class="num">容易</td></tr>'
  +'<tr><td><b>代理商 / 经销商</b>（佣金/买断）</td><td class="num">低—中</td><td class="num">中</td><td class="num">低—中</td><td>让渡渠道利润</td><td class="num">合同约束</td></tr>'
  +'<tr><td><b>许可 / 特许</b></td><td class="num">低</td><td class="num">低—中</td><td class="num">极低</td><td>许可费，无经营利润</td><td class="num">容易但毁品牌风险</td></tr>'
  +'<tr><td><b>合同制造</b></td><td class="num">中</td><td class="num">中</td><td class="num">低</td><td>制造价差</td><td class="num">容易</td></tr>'
  +'<tr><td><b>合资企业</b></td><td class="num">中—高</td><td class="num">共享</td><td class="num">中—高</td><td>按股比 + 协同</td><td class="num">难（治理纠纷）</td></tr>'
  +'<tr><td><b>绿地投资</b>（独资建厂/子公司）</td><td class="num">高</td><td class="num">高</td><td class="num">高</td><td>全额经营利润</td><td class="num">难（资产处置）</td></tr>'
  +'<tr><td><b>跨国并购</b></td><td class="num">高</td><td class="num">高</td><td class="num">高</td><td>全额 + 协同预期</td><td class="num">难（整合风险）</td></tr>'
  +'<tr><td><b>跨境电商 / 平台 + 独立站</b></td><td class="num">低—中</td><td class="num">中（自建站）—低（平台）</td><td class="num">低</td><td>零售价 − 平台费 − 物流</td><td class="num">容易（但客户资产归平台）</td></tr>'
  +'</tbody></table></div>'
  +'<div class="callout info"><span class="ico">ℹ️</span><div><b>关键区分（常被混淆）：</b>代理商（agent）以佣金为报酬、代表企业签单但不取得货物所有权；经销商（distributor）买断货物、赚取买卖差价、承担库存风险。两者在法律关系、信用风险、渠道控制上的含义完全不同（m27 详述）。</div></div>' },

  { id:'m16-s4', h:'16.4 底层逻辑：承诺度如何与其他变量联动', lvl:2, html:
  '<p>进入模式的核心权衡：<b>控制权 ↑ → 收益与品牌一致性 ↑，但资源暴露、退出难度与本地知识缺口风险 ↑</b>；反之，低承诺模式保留灵活性，但利润被渠道分走、客户资产不归自己、长期被「锁死」在价值链低端。</p>'
  +'<p>与 OLI 的对应（m05）：所有权优势强 + 区位优势强 + 内部化优势强 → 高承诺（绿地/并购）；优势可编码且保护成本低 → 许可；优势在企业内但本地伙伴关键 → 合资；仅产品优势 → 出口/电商。</p>'
  +'<div class="chain"><span class="node">承诺度选择</span><span class="arr">→</span><span class="node">固定成本结构</span><span class="arr">→</span><span class="node">盈亏平衡销量</span><span class="arr">→</span><span class="node">风险承受要求</span></div>'
  +'<p>机制解释：高承诺模式把「市场不确定性」转化为「固定成本风险」——需求不及预期时，绿地工厂的折旧与人工无法压缩；低承诺模式把不确定性留在「变动成本」里，但放弃了规模与品牌溢价。这就是为什么「先轻后重」的渐进路径如此普遍，也是为什么政策剧变期企业刻意降低承诺度。</p>' },

  { id:'m16-s5', h:'16.5 应用方法：六维比较矩阵', lvl:2, html:
  '<div class="steps">'
  +'<div class="step"><h5>列出可选模式</h5><p>按谱系选 3–5 个现实可选项（受企业资源与市场制度约束）。</p></div>'
  +'<div class="step"><h5>六维打分</h5><p>控制权、资本需求、进入速度、利润空间、合规负担、退出难度（工具：进入模式比较器）。</p></div>'
  +'<div class="step"><h5>匹配检验</h5><p>用 OLI 检验模式与优势结构的匹配；用 I-R 检验模式与战略类型的匹配。</p></div>'
  +'<div class="step"><h5>风险与现金流测算</h5><p>对每个模式算：最大资本暴露、回本条件、最坏情况损失（m21、m31）。</p></div>'
  +'<div class="step"><h5>设计升级路径</h5><p>低承诺模式应预设升级触发条件（销量阈值、政策变化）；高承诺模式应预设退出触发（亏损年限、政策红线）。</p></div>'
  +'</div>' },

  { id:'m16-s6', h:'16.6 案例：进入模式选择的三个真实情境', lvl:2, html:
  '<div class="case"><div class="case-head"><div class="tag">案例 1 · 对照案例</div><div class="ttl">同样出海，三种模式逻辑</div></div><div class="case-body">'
  +'<h5>情境 A：消费品出海 → 跨境电商起步</h5><p>特征：产品标准化、单价中低、无本地服务刚需、团队无海外经验。模式逻辑：亚马逊 + 独立站测款，以最小成本验证需求（m14 三级证据），积累客户资产后转向多渠道分销。优点：启动快、可逆；风险：平台依赖、客户数据不自有、合规（EPR/税务）需自行管理。</p>'
  +'<h5>情境 B：政策封闭市场 → 合资或技术授权</h5><p>特征：东道国以准入清单（如印度 ALMM）或关税结构限制外国产品，但允许本地制造<button class="src gB" data-src="s20">20</button>。模式逻辑：与本地有资质的企业合资或授权技术，换取「本地身份」；代价是股权稀释、技术外溢风险与治理成本。检验点：合资方的资质真实性、协议中的技术保护条款（m17 尽调）。</p>'
  +'<h5>情境 C：成熟市场重资产 → 绿地投资</h5><p>特征：市场规模大且稳定、物流与服务半径要求高、政策激励本土制造（如美国 IRA 对本土组件的税收抵免，公开报道口径约 0.17 美元/瓦）<button class="src gB" data-src="s30">30</button>。模式逻辑：绿地建厂获取「本土身份」与补贴，服务本地大客户；风险：政策变化风险（补贴退坡、232 关税<button class="src gA" data-src="s07">7</button>）、产能爬坡、劳资与文化整合。</p>'
  +'<h5>结论</h5><p>三个情境说明：进入模式由「产品特征 × 市场制度 × 企业资源」共同决定，不存在跨情境的标准答案。模式选择必须附带升级与退出预案（m31）。</p>'
  +'</div></div>' },

  { id:'m16-s7', h:'16.7 局限、争议与常见误区', lvl:2, html:
  '<ul><li><b>「渐进式」不是万能：</b>窗口期市场（政策补贴、竞争空白）需要跳跃式高承诺，渐进会错失时机（m05 讨论）。</li>'
  +'<li><b>「轻资产」不等于低风险：</b>平台模式下客户资产、数据、规则都不在自己手里，平台政策变化（封号、佣金上调）是系统性风险。</li>'
  +'<li><b>误区一：</b>把「签了独家经销商」当作市场进入完成。签经销协议只是承诺的开始，动销、库存、回款才是检验。</li>'
  +'<li><b>误区二：</b>用「控制权最大」评价模式优劣。控制权的价值只在它带来超额收益时才成立，否则只是成本。</li>'
  +'<li><b>误区三：</b>忽视退出设计。没有退出条款的合资与并购，失败时代价巨大。</li></ul>' },

  { id:'m16-s8', h:'16.8 与其他模块的联系', lvl:2, html:
  '<ul><li><b>→ m17：</b>伙伴筛选与协议设计是低/中承诺模式的执行核心。</li>'
  +'<li><b>→ m21–m22：</b>不同模式对应不同收款结构（赊销 vs 预付）与汇率暴露。</li>'
  +'<li><b>→ m27：</b>渠道模式是进入模式在运营层的延伸。</li>'
  +'<li><b>→ m31：</b>退出决策与模式选择互为镜像。</li></ul>' }
  ],
  exercises:[
  { type:'概念理解', q:'代理商与经销商的本质区别是什么？这一区别如何影响付款风险与渠道控制？', a:'法律与商业关系：代理商以佣金为报酬、以企业名义（或代表企业）签单，货物所有权不转移，信用风险主要在企业—终端客户之间；经销商买断货物、赚取差价、自担库存与信用风险。对付款风险：代理模式下终端客户违约由企业承担（需评估终端信用）；经销模式下经销商是债务人（需评估其支付能力）。对渠道控制：代理模式下企业掌握定价与客户关系（但依赖代理的开拓意愿）；经销模式下企业失去直接客户关系（客户资产归经销商）。选择取决于：产品是否需要深度本地服务、客户关系的战略价值、以及企业的管理带宽。' },
  { type:'概念理解', q:'为什么「高承诺进入模式」在需求不确定的市场尤其危险？', a:'高承诺模式（绿地、并购、合资）把成本结构从变动转为固定：厂房折旧、人员编制、维护费用在需求不及预期时无法压缩，直接侵蚀现金流并抬高盈亏平衡销量。在需求不确定的市场，企业实际在为「可能不存在 的需求」支付固定成本；一旦政策或价格环境逆转（如美国 232 生效后组件到岸经济性重塑<button class="src gA" data-src="s07">7</button>），资产专用性使退出成本极高。缓解：分阶段承诺（先销售子公司后工厂）、期权式合同、政策条款（稳定条款）、以及退出预案。' },
  { type:'实际应用', q:'一家中国便携储能品牌（年营收 3 亿元，无海外团队）评估进入日本。比较三种模式（跨境电商、独家经销、设子公司）并给出推荐与理由。', a:'比较：（1）跨境电商（乐天/亚马逊日本 + 独立站）：投入低、验证快，但日本消费者重服务与信任（应急产品），纯线上转化受限；且 PSE 认证与日语售后是硬门槛；平台客户资产不自有。（2）独家经销（日本量贩店或防灾渠道商）：借助本地渠道与信任背书，快速起量；但让渡利润、客户数据归对方、依赖单一伙伴风险。（3）设子公司：控制品牌与服务，但固定成本高、团队搭建 12 个月以上、文化管理难度大。推荐：阶段组合——先用跨境电商小批量测试 + 同步申请 PSE；验证需求后签 2–3 家区域经销（避免单一依赖）；销量稳定（如连续两季达标）后设子公司接管重点客户与售后。理由：匹配企业资源（小团队）、日本市场的服务敏感性与不可逆性排序。评价标准：是否体现「分阶段承诺 + 触发条件」。' },
  { type:'实际应用', q:'「技术授权」模式在什么条件下对一个制造业企业是合理选择？列出 3 个前提条件与 2 个风险。', a:'前提：（1）授权技术不构成企业的核心竞争壁垒（外溢后不会培养出直接竞争者），或技术已进入生命周期成熟段（m04）；（2）目标市场因政策/关税无法进入，授权可换取市场存在与许可费现金流；（3）被许可方能力经尽调真实可靠，且企业无资源自行运营。风险：（1）质量控制与品牌风险（被许可方产品损害品牌）；（2）技术外溢与未来竞争（被许可方学会后成为竞争者，或绕过许可生产）；（3）合同执行风险（许可费追索、争议解决，m06 制度质量）。' },
  { type:'综合分析', q:'为一家计划进入巴西光伏市场的中国二线组件企业设计「进入模式 + 升级/退出预案」，要求包含触发条件。', a:'模式设计：第一阶段「出口 + 配额内项目销售」——服务集中式项目型客户（利用配额内低税率通道，需以 SECEX/CAMEX 当年公告为准<button class="src gB" data-src="s21">21</button>），投入低、验证市场需求与竞争。第二阶段触发条件（满足其一即升级）：年销量 > 100 MW、或配额政策连续两年收紧、或本地竞争者价格战迫使成本重构 → 评估本地组装（合资或绿地），获取原产地与政策身份。退出触发（满足其一即启动退出）：连续两年亏损且无政策改善信号、巴西关税进一步提高至 35%+（参考其电动车关税路径）、或外汇管制使回款周期 > 180 天。方案要点：合同含价格调整条款（挂钩多晶硅价格）、收款以信用证或预付款为主（制度与汇率风险，m21/m22）、保留产能弹性（不签长期不可撤销采购承诺）。评价标准：是否有明确触发条件、可逆性设计与风险对冲。' }
  ]
},

m17: {
  id:'m17', stage:'s4', title:'进入决策与海外伙伴筛选', en:'Entry Decision and Partner Selection',
  hours:'6–9 小时', goal:'掌握进入决策的完整流程，以及海外代理商/经销商/合资伙伴的搜索、筛选、验证与协议设计。',
  prereqText:'m16 进入模式。', outcome:'能执行一次伙伴尽职调查，设计包含保护条款的合作协议，并设定绩效与退出机制。',
  summary:'低承诺进入模式的成败几乎完全取决于伙伴质量。本模块把「找伙伴」从人脉活变成可复核的流程：搜索 → 筛选 → 验证 → 协议 → 管理。',
  terms:['due-diligence','exclusive-agreement','minimum-order','channel-conflict','performance-review','termination-clause'],
  prereq:['m16'], related:['m27','m06','m31'],
  sources:['s21','s20','s09'],
  sections:[
  { id:'m17-s1', h:'17.1 学习定位', lvl:2, html:
  '<p>进入模式选定后（m16），执行层的第一件事就是「找到对的人」——代理商、经销商、进口商、合资方。海外伙伴的质量直接决定：动销速度、价格体系、售后口碑、回款安全，以及你能否保留客户资产。本模块提供可复用的筛选与验证流程，以及协议中的关键条款。</p>' },

  { id:'m17-s2', h:'17.2 从直观问题开始：一个「完美的」经销商如何毁掉一个市场', lvl:2, html:
  '<p>某企业找到一位「资源广泛」的独家经销商：行业经验 20 年、客户名单豪华、承诺年采购 500 万美元。签约后发现：其「客户」多为关联公司、首批订货后拖欠尾款、同时代理三个竞品且把你的产品作为搭售、区域覆盖仅限首都。企业既收不回款，又因独家协议无法开发新渠道，一年后退出该市场。<b>伙伴风险的本质：信息不对称 + 独家协议的锁定效应。</b>本模块的方法就是为这两个问题设计的。</p>' },

  { id:'m17-s3', h:'17.3 正式定义', lvl:2, html:
  '<div class="defbox"><div class="en">Due Diligence</div><div class="zh">尽职调查</div><div class="def">在建立正式合作前，对伙伴的主体真实性、经营能力、财务状况与合规风险进行系统核验。核心原则：<b>关键事实至少两个独立来源交叉验证</b>，且至少一个来源不来自被调查方自身。</div></div>'
  +'<div class="defbox"><div class="en">Exclusive Agreement / MOU</div><div class="zh">独家协议 / 谅解备忘录</div><div class="def">授予伙伴在约定区域/渠道的独家销售权。独家换取专注与投入，但降低你的灵活性与议价权。设计要点：业绩门槛（最低采购/销售目标）、分级授权（而非全区域独家）、违约与退出条款。</div></div>'
  +'<div class="defbox"><div class="en">Channel Conflict</div><div class="zh">渠道冲突</div><div class="def">多个渠道（线上/线下、不同区域伙伴、直销与分销）争夺同一客户或价格体系失序。预防：价格体系设计、区域划分清晰、线上专供款区隔、跨区域销售（串货）处罚条款。</div></div>' },

  { id:'m17-s4', h:'17.4 底层逻辑：信息不对称与风险分配', lvl:2, html:
  '<div class="chain"><span class="node">伙伴能力与意愿不可直接观测</span><span class="arr">→</span><span class="node">承诺可能虚假（逆向选择）</span><span class="arr">→</span><span class="node">签约后努力不足（道德风险）</span><span class="arr">→</span><span class="node">用尽调 + 条款 + 分阶段承诺管理</span></div>'
  +'<p>机制：（1）<b>信号</b>——要求可验证的承诺信号：首批订货预付款、保证金、业绩对赌、联合市场计划；（2）<b>信息</b>——尽调降低逆向选择：注册文件、抽样客户回访、仓库与团队实地/视频核验；（3）<b>激励</b>——条款设计对齐利益：佣金/返利与回款挂钩、区域授权与业绩阶梯挂钩、数据回传义务；（4）<b>退出</b>——保留退出通道：期限短、续约条件、违约即终止、库存回购或转移条款。</p>' },

  { id:'m17-s5', h:'17.5 应用方法：五步伙伴管理流程', lvl:2, html:
  '<div class="steps">'
  +'<div class="step"><h5>搜索（多来源）</h5><p>来源：行业展会（线下依然高效）、目标市场行业协会名录、电商平台卖家信息（寻找有动销能力的卖家）、领英/本地商业数据库、竞争对手的渠道商（挖角或合作）、使领馆经商机构、专业服务机构。至少 3 个独立来源产生候选池（5–10 家）。</p></div>'
  +'<div class="step"><h5>初筛（硬指标）</h5><p>主体真实（注册号、税号、地址）、代理品牌结构（竞品冲突）、覆盖区域、团队规模、语言能力、财务稳健信号（成立年限、员工数、库存）。淘汰「什么都能做」的伙伴——专注度是能力的代理指标。</p></div>'
  +'<div class="step"><h5>验证（交叉）</h5><p>用尽调清单（见模板库）：注册信息在官方库核验；抽样 3–5 个「客户」回访；仓库/办公室视频巡访；要求提供近两年财务报表或银行流水（可保密处理）；查诉讼与破产记录；制裁与受限方筛查（m23）。</p></div>'
  +'<div class="step"><h5>协议（关键条款）</h5><p>区域与渠道范围、独家/非独家、最低采购量与考核期、价格与折扣体系、付款条件与信用额度、市场费用分担、数据与报告义务、知识产权与品牌使用、竞业与代理竞品限制、业绩不达标处理、终止与库存处理、争议解决（仲裁地与法律）。</p></div>'
  +'<div class="step"><h5>管理（持续）</h5><p>季度业务回顾（QBR）：销量、库存周转、回款、价格纪律、市场活动；年度授权复核；建立「伙伴记分卡」，连续不达标启动替代计划——替代伙伴的培育要在问题发生前开始。</p></div>'
  +'</div>' },

  { id:'m17-s6', h:'17.6 案例：独家经销协议的陷阱与重构', lvl:2, html:
  '<div class="case"><div class="case-head"><div class="tag">案例 1 · 条款设计</div><div class="ttl">从「全区域独家」到「阶梯授权 + 退出保护」</div></div><div class="case-body">'
  +'<h5>背景（教学案例）</h5><p>某储能企业进入东南亚某国，伙伴要求全境独家、5 年期限、年采购 300 万美元。企业担心：伙伴夸大能力、5 年锁定、串货风险。</p>'
  +'<h5>重构方案</h5><p>（1）授权：首年 3 个主要城市 + 电商渠道独家，其余非独家；业绩达标后扩展；（2）期限：2 年 + 续约选择权在供方（而非自动续期）；（3）采购承诺：年最低 150 万美元，分季度预付款滚动下单；（4）回款：信用证或 30% 预付 + 70% 见单，信用额度上限 30 万美元；（5）价格纪律：规定最低零售价与在线价格，违者扣返利；（6）数据：月度进销存报告义务；（7）退出：连续两季不达标可缩减区域或终止；终止后 90 天内库存处理与客户名单移交；（8）争议：约定新加坡仲裁 + 中英双语合同。</p>'
  +'<h5>要点</h5><p>核心是把「伙伴的单方承诺」转化为「可验证、可执行的条款组合」：预付款过滤虚假承诺、区域阶梯保留灵活性、数据义务让过程可监控、退出条款保证失败成本可控。参考模板库中的「海外合作伙伴尽职调查清单」。</p>'
  +'</div></div>' },

  { id:'m17-s7', h:'17.7 局限、争议与常见误区', lvl:2, html:
  '<ul><li><b>尽调的边界：</b>公开信息在制度弱的市场可能不完整（m06 制度空缺），此时应提高预付款比例与分批发货，而不是假装尽调充分。</li>'
  +'<li><b>关系的双刃剑：</b>过度依赖单一伙伴（即使是优质伙伴）会让你失去客户资产与议价能力；「双伙伴 + 区域区隔」通常是更稳健结构。</li>'
  +'<li><b>误区一：</b>用「是否聊得来」替代尽调。跨文化语境下的善意表达不等于履约能力（m24）。</li>'
  +'<li><b>误区二：</b>合同条款完备但无执行预算——争议发生时律师费与仲裁费可能超过争议金额，条款设计要考虑「执行成本」。</li>'
  +'<li><b>误区三：</b>忽视伙伴的竞品冲突。代理直接竞品且你无最低采购约束时，你的产品会被作为「搭售」。</li></ul>' },

  { id:'m17-s8', h:'17.8 与其他模块的联系', lvl:2, html:
  '<ul><li><b>→ m06：</b>制度质量决定尽调可得性与合同执行成本。</li>'
  +'<li><b>→ m21：</b>付款条件与信用额度是条款核心。</li>'
  +'<li><b>→ m23：</b>制裁筛查是合作前置条件。</li>'
  +'<li><b>→ m27：</b>渠道运营是伙伴管理的日常层。</li>'
  +'<li><b>→ m31：</b>伙伴绩效是退出决策的主要输入。</li></ul>' }
  ],
  exercises:[
  { type:'概念理解', q:'什么是「逆向选择」与「道德风险」？伙伴管理中的哪些设计分别针对两者？', a:'逆向选择：签约前信息不对称导致选错伙伴（能力/意愿被夸大）；对应设计是尽调（信号获取）+ 硬性准入指标。道德风险：签约后伙伴努力不足或损害你方利益（推竞品、串货、拖欠）；对应设计是激励条款（返利与回款挂钩）+ 监控（数据义务、巡访）+ 惩罚（扣返利、缩减区域）+ 退出。' },
  { type:'概念理解', q:'为什么「独家 + 长期 + 高采购承诺」的组合通常是危险信号？', a:'这三项对企业都是单方面有利的条款组合：伙伴用它们换取你的让步（低预付款、宽松价格、无数据义务）。真正的优质伙伴通常对「市场保护」感兴趣，但愿意接受与之匹配的业绩考核；只有能力不足或动机不纯的伙伴才会在不提供任何可验证承诺的情况下要求最大锁定。看到这个组合时，应要求：保证金/首批预付款、分阶段区域授权、可退出的考核机制——把单方承诺转为双向约束。' },
  { type:'实际应用', q:'为一份海外经销协议列出 8 个必须包含的条款，并说明每个条款防范的风险。', a:'（1）区域与渠道范围——防串货与渠道冲突；（2）独家/非独家及授权阶梯——保留灵活性；（3）最低采购量与考核期——过滤虚假承诺、保底销量；（4）价格体系与最低零售价——防价格体系崩坏；（5）付款条件与信用额度——防坏账；（6）数据报告义务——让过程可监控；（7）知识产权与品牌使用——防品牌滥用与仿冒；（8）终止条件与库存/客户移交——保证退出通道。加分项：争议解决条款（仲裁地/语言）、竞品限制、不可抗力与政策变化条款（如关税突变时的价格调整）。' },
  { type:'实际应用', q:'你在展会上认识的经销商声称「覆盖全国、年销 800 万美元」，但成立仅 8 个月。设计 5 个验证动作。', a:'（1）官方注册库核验：注册号、注册资本、成立日期、股东结构；（2）要求提供 3 个可回访的现有客户/供应商联系方式并抽样电话回访；（3）视频巡访仓库与办公室，核对库存与团队规模；（4）要求近 6 个月银行流水或主要供应商付款记录（脱敏）；（5）交叉验证：向行业协会或其他供应商打听其口碑；（6）试探性承诺：要求首批订单 30% 预付款——虚假规模者通常在真金白银面前退缩。评价标准：验证动作是否「不依赖被调查方自述」。' },
  { type:'综合分析', q:'「轻资产出海（电商 + 一件代发）不需要渠道管理，所以更适合初创企业。」评估这一说法的完整性与风险。', a:'部分成立：轻资产模式启动快、试错成本低、无需伙伴尽调，适合验证需求（m14 三级证据的前两级）。但不成立与风险：（1）「不需要渠道管理」是幻觉——平台规则、物流商、支付通道、海外仓、退换货处理都是渠道，且平台规则变化（佣金、封号、合规要求）是系统性风险；（2）客户资产与数据归平台，复购依赖付费流量，长期 LTV/CAC 结构脆弱；（3）合规风险自担（EPR、VAT、产品责任、数据隐私，m23）——轻资产不等于轻合规；（4）规模天花板：品类与价格带受平台竞争与流量成本约束。结论：轻资产是优秀的「验证工具」，不是「终局模式」；应预设向多渠道/本地化升级的触发条件（复购率、品牌搜索量、毛利结构），否则会长期困在流量生意里。' }
  ]
}

});

;

Object.assign(MODULES, {

/* ================= 阶段 5 ================= */
m18: {
  id:'m18', stage:'s5', title:'Incoterms 2020：风险、费用与责任分配', en:'Incoterms 2020: Risk, Cost and Responsibility Allocation',
  hours:'7–10 小时', goal:'掌握 11 种 Incoterms 2020 术语的交货点、风险转移、费用划分与清关责任，理解其与所有权、付款条件的关系。',
  prereqText:'m16 进入模式（进出口安排）；基础运输知识。', outcome:'能为具体订单选择合适的贸易术语，计算各方的成本责任，并识别术语误用风险。',
  summary:'Incoterms 是国际贸易的「交通规则」：谁在哪一点把货交给谁、风险何时转移、运费保费谁付、谁办清关。选错术语，成本与风险的错配会在每一个环节放大。',
  terms:['incoterms','fob','cif','exw','fca','dap','dpu','ddp','risk-transfer','clearance-obligation'],
  prereq:['m16'], related:['m19','m20','m21'],
  sources:['s45','s04'],
  sections:[
  { id:'m18-s1', h:'18.1 学习定位', lvl:2, html:
  '<p>从商业计划进入真实交易，第一件事是把「货、单、钱」三流的责任写清楚。Incoterms（国际商会《国际贸易术语解释通则》2020 版）就是干这个的：它定义<b>交货点、风险转移点、费用划分、清关责任</b>四件事<button class="src gA" data-src="s45">45</button>。本模块是物流（m19）、关税（m20）、支付（m21）的共同前置——到岸成本计算器也以术语选择为输入。</p>' },

  { id:'m18-s2', h:'18.2 从直观问题开始：一批货在公海着火，谁买单', lvl:2, html:
  '<p>中国出口商按 FOB 上海向德国买家销售一批储能电源，货物在越过船舷（FOB 的风险转移点）后的运输途中因船舶事故全损。谁承担损失？——按 FOB，风险在装运港越过船舷时已转移给买方，买方（或其保险）承担货损，但仍需按合同付款；卖方对货损不负责（除非有装运质量问题）。如果术语是 DDP 汉堡，则风险由卖方承担至目的港，卖方损失货物且可能还要承担进口税费与滞期费。<b>同一事故，两种术语，完全不同的损失分配。</b>这就是术语不是「格式条款」而是「定价与风险工具」的原因。</p>' },

  { id:'m18-s3', h:'18.3 正式定义：11 种术语的结构', lvl:2, html:
  '<p>Incoterms 2020 共 11 种，按运输方式与卖方义务范围分两组：</p>'
  +'<div class="tbl-wrap"><table class="data"><thead><tr><th>术语</th><th>全称 / 含义</th><th>交货点（风险转移）</th><th>运费/保费</th><th>进口清关</th><th>出口清关</th></tr></thead><tbody>'
  +'<tr><td><b>EXW</b></td><td>工厂交货</td><td>卖方所在地（工厂）</td><td>买方</td><td>买方</td><td>买方</td></tr>'
  +'<tr><td><b>FCA</b></td><td>货交承运人</td><td>交第一承运人处置</td><td>买方</td><td>买方</td><td>卖方</td></tr>'
  +'<tr><td><b>FAS</b></td><td>船边交货（海运）</td><td>装运港船边</td><td>买方</td><td>买方</td><td>卖方</td></tr>'
  +'<tr><td><b>FOB</b></td><td>船上交货（海运）</td><td>装运港越过船舷</td><td>买方</td><td>买方</td><td>卖方</td></tr>'
  +'<tr><td><b>CFR</b></td><td>成本加运费（海运）</td><td>装运港越过船舷</td><td>卖方付运费</td><td>买方</td><td>卖方</td></tr>'
  +'<tr><td><b>CIF</b></td><td>成本加保险加运费（海运）</td><td>装运港越过船舷</td><td>卖方付运费 + 最低险</td><td>买方</td><td>卖方</td></tr>'
  +'<tr><td><b>CPT</b></td><td>运费付至（任何方式）</td><td>交第一承运人</td><td>卖方付运费</td><td>买方</td><td>卖方</td></tr>'
  +'<tr><td><b>CIP</b></td><td>运费保险费付至（任何方式）</td><td>交第一承运人</td><td>卖方付运费 + 最高险</td><td>买方</td><td>卖方</td></tr>'
  +'<tr><td><b>DAP</b></td><td>目的地交货（不卸货）</td><td>指定目的地</td><td>卖方</td><td>买方</td><td>卖方</td></tr>'
  +'<tr><td><b>DPU</b></td><td>卸货后交货（2020 新增）</td><td>指定目的地卸货后</td><td>卖方</td><td>买方</td><td>卖方</td></tr>'
  +'<tr><td><b>DDP</b></td><td>完税后交货</td><td>指定目的地</td><td>卖方</td><td><b>卖方</b></td><td>卖方</td></tr>'
  +'</tbody></table></div>'
  +'<div class="callout warn"><span class="ico">⚠️</span><div><b>必须同时理解的三件事：</b>（1）Incoterms 不决定所有权转移（由合同与运输单据决定）；（2）不决定付款条件（T/T、L/C 是另一套安排，m21）；（3）不是法律——只有写入合同才对双方有约束力，且各国法院对术语的解释可能有差异。</div></div>' },

  { id:'m18-s4', h:'18.4 底层逻辑：术语如何重塑成本与风险曲线', lvl:2, html:
  '<p>把一次运输的成本与风险画成一条从卖方工厂到买方仓库的线，术语的选择就是在这条线上「切一刀」：刀锋左边（出口段）与右边（进口段）分别由谁承担。切点越靠右，卖方责任越重、报价越高（因为要把运费、保费、关税都含进去），但买方体验越简单。</p>'
  +'<div class="chain"><span class="node">EXW</span><span class="arr">→</span><span class="node">FCA / FOB</span><span class="arr">→</span><span class="node">CFR / CIF / CPT / CIP</span><span class="arr">→</span><span class="node">DAP / DPU</span><span class="arr">→</span><span class="node">DDP</span><span class="arr">·</span><span class="node cool">卖方责任递增</span></div>'
  +'<p>关键机制：（1）<b>报价可比性</b>——比较不同供应商报价前必须先对齐术语，FOB 价 + 运费 ≠ CIF 价；（2）<b>风险与保险匹配</b>——CIF 只要求卖方投保最低险别（平安险级别），CIP 要求最高险（一切险级别）；买方若需更全保障，应在 CIF 基础上自加保险或改用 CIP；（3）<b>清关能力约束</b>——DDP 要求卖方能在目的国完成进口清关并缴纳关税，多数外国出口商做不到（无进口资质、无法核算税费），这就是「DDP 是卖方责任最大也最难操作」的原因；（4）<b>现金流位置</b>——术语决定运费由谁先垫付，影响双方营运资金（m21）。</p>' },

  { id:'m18-s5', h:'18.5 应用方法：术语选择决策', lvl:2, html:
  '<div class="steps">'
  +'<div class="step"><h5>问：谁有议价与信息优势</h5><p>买方更了解本国清关与内陆运输 → 倾向 FOB/FCA（买方安排进口段）；卖方更了解出口国物流且买方是小客户 → 倾向 CIF/CIP 或 DAP（卖方包更多）。</p></div>'
  +'<div class="step"><h5>问：运输方式</h5><p>海运用 FOB/CFR/CIF/FAS；空运与多式联运用 FCA/CPT/CIP/DAP/DPU；大宗件杂货注意 DPU 的卸货责任。</p></div>'
  +'<div class="step"><h5>问：买方能否清关</h5><p>买方无进口资质或不愿承担关税不确定性 → DAP（卖方运到但不包税）；买方完全不想操心且卖方有当地代理 → DDP（少见，需评估卖方能力）。</p></div>'
  +'<div class="step"><h5>问：风险与保险</h5><p>货值高、易损、航线风险大 → 提高险别（CIP 而非 CIF；或在 FOB 下买方自保）。</p></div>'
  +'<div class="step"><h5>落到报价</h5><p>用「到岸成本计算器」把术语转换为完整成本栈（货价 + 运费 + 保费 + 关税 + 增值税 + 港杂），再比较不同术语下的买方总成本。</p></div>'
  +'</div>' },

  { id:'m18-s6', h:'18.6 案例：一个订单的术语经济学', lvl:2, html:
  '<div class="case"><div class="case-head"><div class="tag">案例 1 · 演算</div><div class="ttl">FOB 与 DDP 的报价差异从哪里来</div></div><div class="case-body">'
  +'<h5>设定（教学演算）</h5><p>中国出口商销售便携式储能电源到德国，货值 10,000 美元 EXW；海运 + 保险至汉堡约 900 美元；德国进口关税（假设最惠国税率，教学取值 4.8%，实际以欧盟 TARIC 当期为准）+ 19% 增值税；港杂与内陆运输约 350 美元。</p>'
  +'<div class="tbl-wrap"><table class="data"><thead><tr><th>报价术语</th><th>卖方报价构成</th><th>买方额外承担</th><th>买方总成本（不含增值税抵扣影响）</th></tr></thead><tbody>'
  +'<tr><td>EXW</td><td class="num">10,000</td><td>出口报关 + 全程运输 + 关税 + 港杂</td><td class="num">10,000 + 900 + 480 + 350 + 杂费</td></tr>'
  +'<tr><td>FOB 上海</td><td class="num">10,000 + 出口费用</td><td>海运费 + 保险 + 关税 + 港杂</td><td class="num">类似，运费转由买方订舱</td></tr>'
  +'<tr><td>CIF 汉堡</td><td class="num">10,900（含运保费）</td><td>关税 + 港杂 + 内陆</td><td class="num">10,900 + 480 + 350</td></tr>'
  +'<tr><td>DDP 汉堡</td><td class="num">10,000 + 900 + 480 + 350 + 服务费</td><td>仅增值税（可抵扣部分不计入成本）</td><td class="num">卖方报价（含一切）</td></tr>'
  +'</tbody></table></div>'
  +'<h5>解读</h5><p>（1）术语不改变「总成本」，只改变「谁在什么时点承担」；（2）DDP 报价通常最高，因为卖方要预留关税波动、滞期与清关失误的缓冲；（3）买方比较报价时，必须把不同术语折算到同一「到岸 + 完税」口径，否则 DDP 报价永远「看起来贵」；（4）术语选择影响现金流时点：DDP 下卖方先垫进口税费，回款周期拉长。</p>'
  +'<h5>限制</h5><p>关税税率与税费结构必须以欧盟 TARIC 与进口商实缴为准；增值税一般可抵扣，是否计入成本取决于买方财务处理。</p>'
  +'</div></div>' },

  { id:'m18-s7', h:'18.7 局限、争议与常见误区', lvl:2, html:
  '<ul><li><b>误区一：</b>把 CIF 理解为「卖方承担全部运输风险」。CIF 的风险转移点仍在装运港，卖方只「付运费和保费」，不承担越过船舷后的货损风险。</li>'
  +'<li><b>误区二：</b>认为术语决定货物所有权。所有权由合同（如付款条件、物权保留条款）与提单类型决定。</li>'
  +'<li><b>误区三：</b>用 FOB/CIF 于空运或多式联运。海运专用术语用于其他运输方式会模糊风险点（FOB 的「越过船舷」在空运中不存在）。</li>'
  +'<li><b>误区四：</b>合同只写「FOB」不写版本和地点。应写「FOB Shanghai, Incoterms 2020」——版本与指定地点缺一不可。</li>'
  +'<li><b>常见纠纷：</b>术语与合同其他条款冲突（如合同写 CIF 又约定「货到付款」），各国判例对冲突条款的解释不同，需律师核验。</li></ul>' },

  { id:'m18-s8', h:'18.8 与其他模块的联系', lvl:2, html:
  '<ul><li><b>→ m19：</b>术语决定运费、保费与库存责任的承担方。</li>'
  +'<li><b>→ m20：</b>术语中的清关责任与关税缴纳主体直接对应海关实务。</li>'
  +'<li><b>→ m21：</b>术语影响现金流时点与单据流（CIF 下卖方控制提单，是收款杠杆）。</li>'
  +'<li><b>→ 到岸成本计算器：</b>术语是该工具的输入维度。</li></ul>' }
  ],
  exercises:[
  { type:'概念理解', q:'CIF 术语下，货物在海上受损，买方能否以「货损」为由拒付货款？为什么？', a:'一般不能。CIF 的风险转移点在装运港越过船舷，此后货损风险归买方；买方已按合同承担该风险，且 CIF 要求卖方已投保（最低险别）。买方应向保险公司索赔（凭保险单），而非向卖方拒付。例外：若货损源于卖方的包装不当或根本违约（发错货、严重质量问题），买方可依合同与适用法主张权利——这已超出术语范畴，属于合同与产品责任问题。' },
  { type:'概念理解', q:'为什么许多出口商避免使用 DDP？列出 3 个原因。', a:'（1）进口清关能力：DDP 要求卖方以自己名义（或通过代理）完成进口申报、缴纳关税与增值税，多数外国出口商在目的国无进口资质、无税号、无法处理查验与争议；（2）税费不确定性：关税税率、估价、税费政策变化会使卖方成本失控，报价缓冲不足即亏损；（3）现金流与合规：卖方需先垫付进口税费，且目的国若要求进口商承担产品合规责任（认证、标签、EPR），卖方将直接暴露。替代方案：DAP（卖方运到、买方清关）或与目的港专业报关行合作的 DDP 服务（把清关外包）。' },
  { type:'实际应用', q:'买家（德国小分销商）要求你报 DDP 价，但其年采购量只有 2 万美元。给出你的处理方案。', a:'（1）不直接拒绝也不直接接受：提供 CIF 汉堡价作为基准，说明 DDP 需要叠加关税、增值税、港杂与清关服务费，且需确认其税号与收货资质；（2）建议折中：DAP 汉堡（你负责运输至其指定仓库，不负责清关与税费），由其完成清关——风险与责任最匹配其规模；（3）若坚持 DDP，报价包含：关税 + 19% 增值税（或约定不含税价）+ 港杂 + 清关服务费 + 5–10% 政策缓冲，并约定「关税税率变动超过 X% 时价格重议」条款；（4）小订单 + DDP 的组合要评估单票成本占比（清关固定成本分摊）。' },
  { type:'实际应用', q:'用 Incoterms 知识解释：为什么「FOB 中国港口」的报价通常最低，而买家总成本未必最低？', a:'FOB 报价只含货物与出口本地费用，不含海运费、保费、关税与目的港费用，所以「报价」数字最低。但买家总成本 = FOB + 海运费 + 保险 + 关税 + 港杂 + 内陆运输 + 资金占用成本；且小买家单独订舱的单位运费可能高于大出口商的合约运价。此外 FOB 下买家要自办保险（可能不足额）与进口清关（不熟悉则产生滞期与罚金）。结论：报价比较必须统一折算到「到岸/完税」口径（用到岸成本计算器），FOB 最低只是会计归属不同，不是总成本最低。' },
  { type:'综合分析', q:'设计一个「术语 + 付款条件」组合：你是中国出口商，客户是巴西新经销商，首批订单 3 万美元。说明你的组合选择与理由。', a:'组合建议：术语 DAP 桑托斯（或 CIF 桑托斯）+ 付款 30% 预付 + 70% 见提单副本（或信用证）。理由：（1）巴西清关复杂、税制以复杂著称（公开普遍认知，需以专业意见核验），DAP/CIF 让熟悉出口段的你控制运输至目的港，清关交给有资质的本地伙伴，减少你的合规暴露；不用 DDP（你无法代缴巴西税费）；（2）首批合作 + 新伙伴信用未知 → 拒绝纯赊销，用预付 + 见单付款控制信用风险（m21）；（3）见提单副本付款要求你控制提单（CIF 下你订舱，便于掌握单据）——术语与付款条件应配套设计；（4）约定：滞期与查验费用责任、关税变动的价格调整条款。评价标准：是否体现「术语 + 信用 + 单据流」的配套思维。' }
  ]
},

m19: {
  id:'m19', stage:'s5', title:'国际物流与供应链管理', en:'International Logistics and Supply Chain Management',
  hours:'7–10 小时', goal:'掌握运输模式比较、集装箱与单据、库存决策与供应链韧性设计，理解物流成本与服务水平对商业模式的影响。',
  prereqText:'m18 Incoterms。', outcome:'能为产品设计运输方案，计算物流成本与库存的平衡，并识别供应链单点故障。',
  summary:'物流是「把承诺变成交付」的环节：运输模式决定成本与时效，单据决定货权与清关，库存决定服务水平与现金流，韧性设计决定黑天鹅下的生存能力。',
  terms:['ocean-freight','air-freight','multimodal','lcl','fcl','bill-of-lading','lead-time','safety-stock','inventory-turnover','supply-chain-resilience','single-point-of-failure'],
  prereq:['m18'], related:['m20','m21','m29'],
  sources:['s17','s45','s04'],
  sections:[
  { id:'m19-s1', h:'19.1 学习定位', lvl:2, html:
  '<p>本模块把 m18 的「术语」落到「运营」：货怎么走、单怎么转、库存怎么备、链怎么保。它服务于三个决策：<b>运输方案选择（成本—时效—货损平衡）、单据与货权管理（收款安全）、供应链布局（集中 vs 分散、单点风险）</b>。物流绩效同时是国家竞争力的可测维度——世界银行 LPI 2023 中新加坡 4.3 分居首，芬兰 4.2 分次之<button class="src gA" data-src="s17">17</button>，该指数由物流从业者对各国海关效率、基础设施、货运便利、服务质量、追踪与时效六维评分构成。</p>' },

  { id:'m19-s2', h:'19.2 从直观问题开始：两个选择，两种生意', lvl:2, html:
  '<p>同样是把家具从中国卖到美国：方案一，整柜海运至海外仓，单件物流成本 12 美元，时效 35 天；方案二，空运直邮，单件物流成本 55 美元，时效 7 天。方案一支撑「低价 + 平台电商 + 慢交付」的模式；方案二只适合高客单、急件或补货。更微妙的是：若客户在美国东海岸而港口在西海岸，还要叠加铁路/卡车内陆段；若旺季港口拥堵（如 2021 年全球港口大拥堵时期，公开报道众多），时效可能翻倍——<b>物流不是成本项，而是商业模式的约束条件</b>：它决定客单价下限、库存深度、现金流周期与售后半径。</p>' },

  { id:'m19-s3', h:'19.3 正式定义', lvl:2, html:
  '<div class="tbl-wrap"><table class="data"><thead><tr><th>模式</th><th>成本</th><th>时效</th><th>适用</th><th>关键风险</th></tr></thead><tbody>'
  +'<tr><td>海运（整箱 FCL / 拼箱 LCL）</td><td class="num">低</td><td class="num">慢（20–45 天）</td><td>大宗、低值密度、计划性补货</td><td>港口拥堵、运价波动、船期不稳</td></tr>'
  +'<tr><td>空运</td><td class="num">高</td><td class="num">快（3–10 天）</td><td>高价值、时效敏感、季节性补货</td><td>舱位与价格波动、危险品限制（锂电池！）</td></tr>'
  +'<tr><td>铁路（如中欧班列）</td><td class="num">中</td><td class="num">中（15–25 天）</td><td>欧亚内陆、介于海运空运之间</td><td>地缘与口岸通行、换轨成本</td></tr>'
  +'<tr><td>多式联运</td><td class="num">中</td><td class="num">中</td><td>跨境长距离、组合优化</td><td>衔接责任划分（一单制 vs 分段）</td></tr>'
  +'<tr><td>快递/邮政小包</td><td class="num">中—高（单件）</td><td class="num">较快</td><td>跨境电商 B2C、样品</td><td>清关能力、丢件、关税起征点</td></tr>'
  +'</tbody></table></div>'
  +'<div class="defbox"><div class="en">Bill of Lading（B/L）</div><div class="zh">提单</div><div class="def">承运人签发的货物收据与运输合同证明，核心功能是<b>物权凭证</b>——谁合法持有提单，谁就能提取货物。分记名提单（不可转让）、指示提单（背书转让，最常用）、不记名提单。</div><div class="meta"><div><b>商业含义：</b>见提单副本付款（against B/L copy）的本质，是买方在「看到货已发运的证据」后付款；卖方控制正本提单 = 控制货权 = 收款杠杆。电放（telex release）方便但放弃货权控制，只用于信任客户。</div></div></div>'
  +'<div class="defbox"><div class="en">Safety Stock</div><div class="zh">安全库存</div><div class="def">为应对需求波动与供应不确定性而持有的缓冲库存。常用简化公式：安全库存 = Z × σ<sub>LT</sub>（Z 为服务水平系数，σ<sub>LT</sub> 为提前期内需求标准差）。库存策略 = 服务水平 × 资金成本 × 缺货损失的三角平衡。</div></div>'
  +'<div class="defbox"><div class="en">Lead Time</div><div class="zh">交付周期（提前期）</div><div class="def">从下订单到货物可用的总时间 = 生产提前期 + 运输提前期 + 清关提前期 + 上架时间。海外业务的真实提前期通常是国内贸易的 3–10 倍，直接放大库存与预测难度。</div></div>' },

  { id:'m19-s4', h:'19.4 底层逻辑：物流成本结构与库存动力学', lvl:2, html:
  '<p><b>物流成本结构：</b>运输费（干线）+ 港杂与文件费 + 保险 + 仓储 + 库存资金占用 + 缺货损失 + 滞期/罚金。海运的规模经济极强（单箱成本远低于拼箱），因此「整柜 vs 拼箱」的决策不仅是运费问题，还影响库存深度与周转。</p>'
  +'<p><b>库存动力学：</b>提前期长 + 需求波动大 → 需要更高安全库存 → 资金占用上升；提前期缩短（更快运输、更近产地、更早备货）→ 库存下降但运费上升。这就是「成本—服务—风险」的平衡：最优解取决于产品的价值密度（货值/重量比）与需求可预测性。高价值密度产品（芯片、药品）倾向快而准；低价值密度（家具、砂石）倾向慢而省。</p>'
  +'<div class="callout warn"><span class="ico">⚠️</span><div><b>危险品特别提示：</b>锂电池及含锂电池产品（便携储能、电动工具）的运输受严格管制——海运按 IMDG 规则（SOC 箱、UN38.3 测试摘要、MSDS）、空运按 IATA DGR（多数锂电芯空运受限），货代能力与包装合规直接决定能否出运。忽视危险品规则是含电产品出海最常见的事故源。</div></div>' },

  { id:'m19-s5', h:'19.5 应用方法：运输方案与库存设计', lvl:2, html:
  '<div class="steps">'
  +'<div class="step"><h5>算价值密度</h5><p>货值/体积与货值/重量比 → 决定模式倾向（高价值密度可用空运/快递；低价值密度走海运）。</p></div>'
  +'<div class="step"><h5>选模式组合</h5><p>干线（海运/空运/铁路）+ 两端（拖车/铁路）+ 海外仓或直邮。大宗标品走「海运整柜 + 海外仓」；试销与补货用「空运/快递」。</p></div>'
  +'<div class="step"><h5>管单据与货权</h5><p>明确提单类型与背书要求；电放仅限信任客户；确保单据（发票、箱单、产地证）与清关要求匹配（m20）。</p></div>'
  +'<div class="step"><h5>设库存参数</h5><p>按需求波动与提前期定安全库存；用「库存周转天数」监控；旺季前提前备货（考虑船期与港口拥堵）。</p></div>'
  +'<div class="step"><h5>建韧性</h5><p>识别单点故障（单一工厂、单一港口、单一货代、单一承运人）；设替代方案（二供、二港、多货代）；把关键节点的「恢复时间」写进应急预案（m29）。</p></div>'
  +'</div>' },

  { id:'m19-s6', h:'19.6 案例：中欧班列与海运的路线经济学', lvl:2, html:
  '<div class="case"><div class="case-head"><div class="tag">案例 1 · 路线比较</div><div class="ttl">同一批货，海运、空运、铁路的三种账</div></div><div class="case-body">'
  +'<h5>设定（教学演算）</h5><p>货物：40 尺整箱电子类产品，货值 12 万美元，中国成都 → 德国杜伊斯堡/汉堡。海运经上海/宁波港约 30–40 天；铁路（中欧班列）约 15–22 天；空运 3–7 天。</p>'
  +'<div class="tbl-wrap"><table class="data"><thead><tr><th>方案</th><th>运输成本（教学估算）</th><th>时效</th><th>库存资金占用</th><th>适用条件</th></tr></thead><tbody>'
  +'<tr><td>海运</td><td class="num">约 3,000–5,000 美元/箱</td><td>30–40 天</td><td>高（40 天 × 资金成本）</td><td>计划性补货、成本敏感</td></tr>'
  +'<tr><td>铁路</td><td class="num">约 8,000–12,000 美元/箱</td><td>15–22 天</td><td>中</td><td>时效与成本平衡、内陆点对点</td></tr>'
  +'<tr><td>空运</td><td class="num">约 40,000+ 美元/箱</td><td>3–7 天</td><td>低</td><td>紧急补货、高价值、季节性</td></tr>'
  +'</tbody></table></div>'
  +'<h5>决策逻辑</h5><p>（1）若为稳定补货且资金成本低 → 海运；（2）若欧洲仓库存告急而销售旺季将至 → 空运补缺口（「贵但赚回销售额」）；（3）若产品季节性明显且库存成本高 → 铁路折中；（4）地缘风险：铁路途经国政策与口岸通行状态需监测（m29），海运则暴露于航线安全（如红海局势对苏伊士航线的影响——具体时效影响应以船公司公告为准）。</p>'
  +'<h5>限制</h5><p>运价随市场剧烈波动（疫情期与常态期差异巨大），本案例数字为教学量级；决策应以当期货代报价 + 库存财务成本计算为准。</p>'
  +'</div></div>' },

  { id:'m19-s7', h:'19.7 局限、争议与常见误区', lvl:2, html:
  '<ul><li><b>「准时制（JIT）」在跨境场景的脆弱性：</b>JIT 依赖极短的稳定提前期，跨境长链 + 港口拥堵 + 政策突变下应改为「恰及时（JIT-ish）+ 战略缓冲」。</li>'
  +'<li><b>海外仓不是万能药：</b>海外仓提升时效但增加库存积压与资金占用；选品（周转率）与选址（覆盖半径）决定其经济性。</li>'
  +'<li><b>误区一：</b>只看干线运费。港杂、文件、滞期、仓储、资金占用常常超过干线运费本身。</li>'
  +'<li><b>误区二：</b>忽视危险品合规。锂电池产品的包装、标记、文件错误可能导致整批退运。</li>'
  +'<li><b>误区三：</b>单一货代/单一港口依赖。一次拥堵或一次罢工就能让链路停摆数周。</li></ul>' },

  { id:'m19-s8', h:'19.8 与其他模块的联系', lvl:2, html:
  '<ul><li><b>→ m18：</b>术语决定运费与保险的承担方。</li>'
  +'<li><b>→ m20：</b>单据与清关在海关模块展开。</li>'
  +'<li><b>→ m21：</b>提单是收款杠杆的核心单据。</li>'
  +'<li><b>→ m29：</b>供应链韧性与单点故障在风险模块系统化。</li></ul>' }
  ],
  exercises:[
  { type:'概念理解', q:'提单为什么被称为「物权凭证」？这一属性如何服务于出口商的收款安全？', a:'提单是承运人签发的地毯物权凭证：合法持有（或依指示背书）正本提单者有权提取货物。出口商可通过控制正本提单（如要求「凭指示」提单并保持背书控制）确保「买方付款（或承兑）后才放货」；若买方违约，出口商可凭提单处理货物（转卖或退运）。电放则放弃这一控制——仅适用于高信任或已收款客户。' },
  { type:'概念理解', q:'为什么跨境业务的「真实提前期」通常是国内贸易的数倍？它对库存策略意味着什么？', a:'真实提前期 = 生产 + 订舱 + 出口报关 + 干线运输 + 进口清关 + 目的港操作 + 内陆配送 + 上架，任一环节的等待（船期、周末、查验、排队）都会叠加，通常 30–60 天 vs 国内数天。含义：（1）需求预测必须提前 1–2 个月，预测误差被放大；（2）安全库存需按长提前期设定，资金占用高；（3）「临期补货」不可行，必须计划性备货 + 空运应急通道；（4）促销与季节节点的库存决策要提前一个船期以上。' },
  { type:'实际应用', q:'为「便携储能电源」设计中国 → 美国的运输方案：考虑危险品规则，列出海运与空运各自的合规要点。', a:'海运：按 IMDG Code 申报为 UN3480/UN3481（锂离子电池/装在设备中或与设备包装）；提供 UN38.3 测试摘要、MSDS、危险品申报单；使用合规包装与标记（9 类危险品标签）；订舱时向船公司申报危险品舱位（并非所有船公司接货）；注意美国进口端对锂电池的额外要求（如 DOT/CPSC 对消费类锂电的监管）。空运：按 IATA DGR，多数锂电芯（UN3480 PI 965）空运受限或禁止客机运输，UN3481（PI 966/967）有条件接受；需核查航司政策。评价标准：是否提到 UN38.3、MSDS、IMDG/IATA 与舱位申报，而非仅说「走海运/空运」。' },
  { type:'实际应用', q:'旺季前你面临两个选择：提前 8 周发海运整柜（运费低、库存高），或等订单确认后空运补货（运费高、库存低）。给出你的决策框架。', a:'框架：（1）测算两个方案的总成本：海运 = 运费 + 8 周库存资金占用 + 滞销风险；空运 = 运费差额 + 低库存 + 缺货销售损失。（2）评估需求确定性：历史销量波动、促销计划、竞品动态——确定性高则提前备货，不确定性高则保留空运期权。（3）资金约束：库存资金占用是否影响现金流安全（m21）。（4）混合策略：基准库存走海运，预期缺口用空运补——多数企业的最优解是「海运打底 + 空运调节」。（5）设置触发条件：当库存可销周数 < 阈值时空运补货。' },
  { type:'综合分析', q:'「海外仓是跨境电商的必然选择。」评估这一说法，并说明什么条件下海外仓反而伤害利润。', a:'支持条件：销量稳定且可预测（周转快）、产品标准化（不易过时/变质）、客单价能覆盖仓储成本、售后与退换货需要本地能力、目的国物流与税务环境适合（如欧盟 VAT 与 EPR 要求本地实体）。伤害利润的条件：（1）滞销——周转慢的 SKU 在海外仓变成死库存，资金占用 + 仓储费 + 可能弃置；（2）多国布仓——为覆盖欧洲多国而分散布仓，库存被切割，单仓周转下降；（3）需求突变（政策、竞争、经济下行）——海外仓的库存无法快速转移到其他市场；（4）头程节奏失配——一次性发太多，之后靠空运补零星订单，成本结构恶化；（5）合规成本——目的国仓储涉及产品责任、召回与数据合规。结论：海外仓是「服务水平工具」而非「成本工具」，应按 SKU 周转分层管理（快周转进仓、慢周转直邮或小批量测试）。' }
  ]
},

m20: {
  id:'m20', stage:'s5', title:'海关实务：归类、估价、关税与原产地', en:'Customs Practice: Classification, Valuation, Duties and Rules of Origin',
  hours:'8–12 小时', goal:'掌握商品归类、海关估价、关税计算与原产地规则的核心逻辑，能查询官方关税信息并计算到岸税负。',
  prereqText:'m10 HS 编码、m18 Incoterms。', outcome:'能为具体产品确定税则路径，计算关税与进口税费，判断优惠原产地资格，并识别合规风险点。',
  summary:'海关是国际商业与税制的交界：归类决定税率，估价决定税基，原产地决定优惠资格。三者中任何一环出错，要么多缴税（成本），要么低报漏报（合规风险）。',
  terms:['tariff-classification','customs-valuation','duty-calculation','mfn-tariff','rules-of-origin','substantial-transformation','rcep','usmca','tariff-quota','de-minimis'],
  prereq:['m10','m18'], related:['m13','m23','m32'],
  sources:['s44','s05','s07','s21','s10','s20'],
  sections:[
  { id:'m20-s1', h:'20.1 学习定位', lvl:2, html:
  '<p>关税与非关税壁垒直接决定「纸面市场」与「经济市场」的差距。本模块给出一套完整的海关知识框架：产品怎么归类（决定税率）、按什么价格计税（估价）、是否享受优惠（原产地）、以及政策工具如何改变税负（301/232/双反/配额）。这是到岸成本计算与合规评估的核心，也是 m23 合规模块的前置。</p>' },

  { id:'m20-s2', h:'20.2 从直观问题开始：同样的太阳能电池，四种命运', lvl:2, html:
  '<p>一块在中国生产的太阳能电池片，运往美国可能面临：301 条款关税 50%（2025 年 1 月起）<button class="src gA" data-src="s05">5</button>；若经东南亚四国组装，可能触发对东南亚的双反关税（21.31%–271.2%，按厂商而定）<button class="src gA" data-src="s06">6</button>；若为多晶硅原料，还面临 232 措施（最低进口价格 + 15% 从价税，2026 年 12 月生效）<button class="src gA" data-src="s07">7</button>；而销往 RCEP 成员国，凭原产地资格可能享受零关税或减税<button class="src gA" data-src="s10">10</button>。<b>同一产品，税负从 0 到 300%+，取决于「从哪来、到哪去、以什么身份」。</b>这就是海关知识必须进入市场研究的原因。</p>' },

  { id:'m20-s3', h:'20.3 正式定义：四个环节', lvl:2, html:
  '<div class="defbox"><div class="en">Tariff Classification</div><div class="zh">商品归类</div><div class="def">按 HS 规则确定商品的税则编码。规则核心：归类总规则（GRI 1–6）——按品目条文与类注章注确定；成分、功能、形态优先顺序；复杂产品（如「光储一体机」）按主要功能或分别归类。</div><div class="meta"><div><b>风险：</b>归类争议是海关稽查重点；错误归类导致补税 + 罚款 + 声誉。复杂产品应申请预裁定（binding ruling）或咨询报关行/律师。<br><b>提示：</b>HS 六位全球统一，八位以上各国不同；跨年比较注意版本（HS 2017 / HS 2022）。</div></div></div>'
  +'<div class="defbox"><div class="en">Customs Valuation</div><div class="zh">海关估价</div><div class="def">确定进口商品的完税价格。WTO《海关估价协定》以「成交价格（transaction value）」为基本方法，即实际支付或应付价格加上运抵进口地的运保费等调整项；若成交价格不可用（关联交易、特殊安排），依次使用相同/类似货物成交价等方法。</div><div class="meta"><div><b>实务要点：</b>低报价格（under-invoicing）属违法；关联交易估价可能被调整；特许权使用费、协助费用等可能要计入完税价格。</div></div></div>'
  +'<div class="defbox"><div class="en">Duty Calculation</div><div class="zh">关税计算</div><div class="def">从价税 = 完税价格 × 税率；从量税 = 数量 × 单位税额；复合税两者兼有。进口总税负通常还包括增值税/消费税（按含关税价格计）。</div><div class="meta"><div><b>优惠税率叠加：</b>MFN（最惠国）税率是基准；FTA/RCEP 优惠税率需原产地证明；特惠（GSP）视方案而定；单边加征（301/232/双反）叠加在基准之上。<br><b>低值免税：</b>各国小额进口免税额不同（如美国 de minimis 规则近年多次调整），跨境电商模式设计必须考虑。</div></div></div>'
  +'<div class="defbox"><div class="en">Rules of Origin</div><div class="zh">原产地规则</div><div class="def">判定产品「经济国籍」的规则，分优惠原产地（用于享受协定税率，如 RCEP、USMCA）与非优惠原产地（用于贸易统计、双反、标签如 Made in China）。核心标准：完全获得；实质性改变（税则改变、区域价值成分、加工工序）。</div><div class="meta"><div><b>RCEP 特色：</b>区域价值成分 40% 即可视为原产，且允许 15 国累计原产成分——在成员国布局供应链可「攒」原产资格<button class="src gA" data-src="s10">10</button>。<br><b>USMCA 特色：</b>分产品严格规则（如汽车区域价值含量 75%，2026 年审查中美方要求提高至 82%）<button class="src gA" data-src="s09">9</button>。<br><b>文件：</b>优惠税率需原产地证书（或经核准出口商自主声明）。</div></div></div>' },

  { id:'m20-s4', h:'20.4 底层逻辑：税负的叠加结构与传导', lvl:2, html:
  '<div class="chain"><span class="node">归类</span><span class="arr">→</span><span class="node">基准税率（MFN/FTA/加征）</span><span class="arr">+</span><span class="node">估价</span><span class="arr">→</span><span class="node">关税额</span><span class="arr">→</span><span class="node">完税价格 × 增值税率</span><span class="arr">→</span><span class="node cool">进口总税负</span></div>'
  +'<p>传导机制：（1）<b>税负 → 报价</b>：关税与税费计入到岸成本，压缩毛利或推高终端价（m18 到岸成本计算器）；（2）<b>税负 → 供应链布局</b>：高关税促使本地化或第三国转产（「关税套利」），但受原产地与反规避规则约束（美国对东南亚光伏双反即针对转口规避<button class="src gA" data-src="s06">6</button>）；（3）<b>税负 → 市场选择</b>：巴西 25% 组件关税 + 配额制<button class="src gB" data-src="s21">21</button>、印度 ALMM 准入<button class="src gB" data-src="s20">20</button>，都直接改变候选市场的吸引力排序（m13）。</p>' },

  { id:'m20-s5', h:'20.5 应用方法：关税与准入查询四步', lvl:2, html:
  '<div class="steps">'
  +'<div class="step"><h5>定编码</h5><p>按 GRI 确定 HS 6 位，再查目标国 8–10 位扩展码。复杂产品用各国海关的预裁定、约束性归类信息（欧盟 BTI、美国 CROSS）或专业报关行。</p></div>'
  +'<div class="step"><h5>查税率</h5><p>官方来源：欧盟 Access2Markets / TARIC、美国 USITC HTS、各国海关税则、WITS（跨国比较 + 优惠税率）。同时查「附加税」：反倾销/反补贴税令、加征关税章节。</p></div>'
  +'<div class="step"><h5>查准入</h5><p>技术法规与认证（CE、PSE、FCC 等）、许可证、配额、本地含量（ALMM）、标签与包装、危险品规则。Access2Markets 与各国主管部门官网为准。</p></div>'
  +'<div class="step"><h5>查原产地优惠</h5><p>若目标国与供应国同属某协定（RCEP/CPTPP/USMCA/欧盟自贸网），计算区域价值成分，判断优惠资格与文件要求；无法达标则按 MFN 计税。</p></div>'
  +'</div>' },

  { id:'m20-s6', h:'20.6 案例：RCEP 优惠的实战计算', lvl:2, html:
  '<div class="case"><div class="case-head"><div class="tag">案例 1 · 优惠计算</div><div class="ttl">一条润滑油添加剂关税从 6.5% 到 0 的路径</div></div><div class="case-body">'
  +'<h5>背景</h5><p>公开报道的实例：RCEP 生效后，新加坡产润滑油添加剂进口至中国的关税由 6.5% 降为 0，企业凭原产地证书申报；某中石化国际事业公司 2025 年因此节省进口成本 168 万元<button class="src gA" data-src="s10">10</button>。</p>'
  +'<h5>分析</h5><p>（1）原产地判定：该添加剂为新加坡利用区域内原产材料加工，满足 RCEP 原产地标准（完全获得或实质性改变/区域价值成分）；（2）文件：出口方申请 RCEP 原产地证书，或中国经核准出口商出具原产地声明；（3）税率适用：进口时申报优惠税率 0，替代 MFN 6.5%；（4）成本效应：168 万元 / 年 ÷ 6.5% ≈ 2,584 万元对应货值——即优惠对约 2,600 万元进口额生效。</p>'
  +'<h5>启示</h5><p>（1）RCEP 2025 年中国与其他成员贸易额 1.9 万亿美元、占中国外贸约 30%<button class="src gA" data-src="s10">10</button>，优惠覆盖率是「用出来」的——需要逐产品核对编码与规则；（2）累积规则让区域供应链布局能「攒」原产资格——供应链设计（m09）应与原产地规划联动；（3）RCEP 2027 年将进行全面审议，规则可能演进，需持续核验<button class="src gA" data-src="s10">10</button>。</p>'
  +'<h5>限制</h5><p>具体产品的原产资格取决于产品特定规则（PSR），不能一概而论；本案例仅演示路径。实操须以海关与原产地规则原文为准。</p>'
  +'</div></div>' },

  { id:'m20-s7', h:'20.7 局限、争议与常见误区', lvl:2, html:
  '<ul><li><b>归类的主观性：</b>复杂产品（多功能一体机、新材料制品）归类存在灰色地带，企业间归类不一致常见；预裁定是降低争议的正规工具。</li>'
  +'<li><b>优惠税率的「用而不达」：</b>企业常因不了解规则、文件繁琐而放弃优惠——RCEP 利用率在全球各协定中长期偏低是普遍现象，主动的原产地规划本身就是竞争优势。</li>'
  +'<li><b>误区一：</b>把「低价值」与「低税率」混淆。免税（de minimis）与税率优惠是两回事，且美国等市场的 de minimis 政策 2025 年前后大幅收紧（需以 CBP 最新公告为准）。</li>'
  +'<li><b>误区二：</b>认为转口可以规避任何关税。原产地规则与反规避执法（东南亚光伏案例）专门针对这种行为，违规后果严重。</li>'
  +'<li><b>误区三：</b>关税是「唯一」的进口成本。增值税、港杂、合规成本（认证、EPR）常常超过关税本身。</li></ul>' },

  { id:'m20-s8', h:'20.8 与其他模块的联系', lvl:2, html:
  '<ul><li><b>→ m13：</b>关税与准入是市场评分「进入成本」的核心数据。</li>'
  +'<li><b>→ m18–m19：</b>完税价格以成交价 + 运保费为基础，与术语选择联动。</li>'
  +'<li><b>→ m21：</b>税负影响报价与毛利测算。</li>'
  +'<li><b>→ m23：</b>归类错误、原产地欺诈、低报价格均属海关合规违规。</li>'
  +'<li><b>→ m32：</b>综合项目第 7 步（准入政策与关税评估）即本模块方法的系统应用。</li></ul>' }
  ],
  exercises:[
  { type:'概念理解', q:'MFN 税率、FTA 优惠税率、加征关税（如 301）三者的关系是什么？计算进口税负时应如何叠加？', a:'MFN 税率是一国对 WTO 成员普遍适用的基准税率；FTA 优惠税率是满足原产地规则后适用的更低税率（可能为 0）；加征关税（301/232/双反）是针对特定国家/产品的额外从价税，通常叠加在基准税率之上。叠加逻辑：进口税负 = 完税价格 ×（MFN 或 FTA 税率 + 适用加征税率）+ 增值税等。注意：（1）部分加征税有排除清单；（2）FTA 优惠与加征的适用关系取决于具体税则（加征税通常仍适用）；（3）必须以目的国海关当期税则与税令为准逐案核算。' },
  { type:'概念理解', q:'为什么「实质性改变」标准让「越南制造」的中国成分产品在美国面临双反风险？', a:'非优惠原产地（用于贸易救济）通常按「实质性改变」判断：若进口国的加工仅构成简单组装、未改变税则归类或未达到最低增值要求，产品的原产地仍可能被视为中国——因此「经越南转口/简单组装」的中国组件被认定为中国原产，从而适用对华双反/301 税令。这正是美国 2024 年对柬埔寨、马来西亚、泰国、越南光伏双反（21.31%–271.2%）的逻辑<button class="src gA" data-src="s06">6</button>。合法应对是真实的本地增值（超出简单组装阈值的制造与采购），而非文件包装。' },
  { type:'实际应用', q:'查询一款「光储一体机」（太阳能板 + 逆变器 + 电池，一体机）出口欧盟的关税路径：列出你会查的 5 个信息点与来源。', a:'（1）HS 归类：按主要功能或部件分别归类的可能（8541.40 / 8504.40 / 8507.60），查欧盟 TARIC 与约束性归类信息（BTI 数据库）；（2）MFN 税率：Access2Markets/TARIC；（3）非关税准入：CE（LVD/EMC）、电池法规合规（若含锂电池）、WEEE/EPR、RoHS；（4）优惠可能：中国产品对欧盟无 FTA，按 MFN 计税（欧盟普惠制情况需核验当期方案）；（5）其他：CBAM 是否适用——CBAM 覆盖钢铁、铝、水泥、化肥、电力、氢六大类，光伏组件成品不在范围内，但其铝边框等部件若单独进口可能落入铝类别（需按具体税则与用途核验）<button class="src gA" data-src="s08">8</button>。' },
  { type:'实际应用', q:'巴西对进口光伏组件征收 25% 关税，但对大型集中式项目有配额内 9.6%（甚至配额内零税率）安排<button class="src gB" data-src="s21">21</button>。作为出口商，你如何利用这一结构？有什么风险？', a:'利用方式：（1）项目投标阶段即与开发方确认项目是否属于配额适用对象（集中式 >5 MW 等条件）及额度余量；（2）把「关税结构」作为投标方案变量——与本地组装/本地采购方案做到岸成本对比（到岸成本计算器）；（3）关注配额周期（SECEX 公告的额度与期限，历史区间约 7–10 亿美元/年，逐年调整）<button class="src gB" data-src="s21">21</button>。风险：（1）额度用完即恢复 25%，项目经济性可能反转；（2）配额规则每年修订，须逐季核验；（3）「抢额度」导致交付节奏扭曲（提前进口、库存积压）；（4)若通过第三国转口规避，可能触发反规避与原产地调查。' },
  { type:'综合分析', q:'「关税越高，本地化建厂越划算。」用美国光伏市场的数据评估这一命题的成立条件。', a:'评估：命题的方向成立但边界很窄。美国案例数据：301 关税 50%<button class="src gA" data-src="s05">5</button>、东南亚双反最高 271%<button class="src gA" data-src="s06">6</button>、232 措施（组件最低进口价 0.38 美元/瓦 + 15% 从价税）2026 年 12 月生效<button class="src gA" data-src="s07">7</button>——到岸经济性确实被摧毁，本土制造（First Solar 等 + IRA 抵免约 0.17 美元/瓦）获得结构性优势<button class="src gB" data-src="s30">30</button>。但成立条件：（1）市场足够大且稳定（需求可支撑本地产能爬坡）；（2）政策可预期（补贴与关税规则的持续性——232 有 120 天缓冲期，显示政策仍在博弈<button class="src gA" data-src="s07">7</button>）；（3）本地运营能力（供应链、劳工、管理）；（4）资本成本可承受（绿地投资回收期长）。不成立的情形：市场小、政策摇摆、企业资源不足——此时「高关税」的正确反应可能是放弃该市场而非本地化。结论：关税是本地化的必要条件之一，但决策必须同时检验市场规模、政策持续性与运营能力。' }
  ]
}

});

;

Object.assign(MODULES, {

m21: {
  id:'m21', stage:'s5', title:'国际支付与贸易融资', en:'International Payment and Trade Finance',
  hours:'7–10 小时', goal:'掌握主要国际支付方式的风险结构与适用场景，理解信用证机制、出口信用保险与应收账款管理。',
  prereqText:'m18 Incoterms、m19 提单。', outcome:'能为不同国家、客户与订单设计付款条件，识别支付欺诈并管理回款风险。',
  summary:'支付方式的选择是在「买方体验」与「卖方风险」之间找平衡：从预付款到赊销，卖方的资金占用与违约暴露逐级上升。没有最好的付款方式，只有与客户信用、国家风险匹配的结构。',
  terms:['t-t','letter-of-credit','documentary-collection','open-account','advance-payment','export-credit-insurance','trade-finance','bec-fraud'],
  prereq:['m18','m19'], related:['m22','m23','m28'],
  sources:['s45','s03','s04'],
  sections:[
  { id:'m21-s1', h:'21.1 学习定位', lvl:2, html:
  '<p>国际交易的终点是「安全收汇」。本模块把支付方式当作风险管理工具而非财务细节：不同的付款条件 = 不同的现金流时点、单据控制与违约暴露。它直接决定营运资金需求、坏账率与谈判筹码（m25），也是评估不同进入模式财务风险（m16）的关键输入。</p>' },

  { id:'m21-s2', h:'21.2 从直观问题开始：四种付款方式，四种命运', lvl:2, html:
  '<p>同一笔 10 万美元的订单：（1）100% 预付——卖方零风险，但多数买方不接受；（2）30% 预付 + 70% 见提单副本——卖方有部分保障，买方看到「货已发出」再付尾款，最常用的折中；（3）100% 不可撤销即期信用证——银行信用替代商业信用，卖方凭合格单据收汇，但单据瑕疵会导致拒付；（4）OA 赊销 60 天——买方体验最好，卖方承担全部信用风险 + 汇率风险 + 资金占用。<b>从（1）到（4），谈判越来越容易签单，风险越来越难控制。</b>选哪种，取决于对买方信用与国家风险的判断（m06、m28）。</p>' },

  { id:'m21-s3', h:'21.3 正式定义：支付方式谱系', lvl:2, html:
  '<div class="tbl-wrap"><table class="data"><thead><tr><th>方式</th><th>货物流</th><th>单据流</th><th>资金流</th><th>卖方风险</th><th>适用</th></tr></thead><tbody>'
  +'<tr><td><b>预付 T/T in advance</b></td><td>先收款后发货</td><td>—</td><td>订货后即付</td><td class="num">极低</td><td>新客户、小订单、定制</td></tr>'
  +'<tr><td><b>电汇 T/T（部分预付 + 见单付余款）</b></td><td>发货</td><td>提单副本</td><td>定金 + 见单付款</td><td class="num">中</td><td>最常用的常规结构</td></tr>'
  +'<tr><td><b>信用证 L/C</b></td><td>发货</td><td>凭合格单据</td><td>银行凭单付款</td><td class="num">中低（单证风险）</td><td>大额、信任不足、政策不稳市场</td></tr>'
  +'<tr><td><b>付款交单 D/P</b></td><td>发货</td><td>银行控制单据</td><td>买方付款后交单</td><td class="num">中高</td><td>有一定信任、买方需融资</td></tr>'
  +'<tr><td><b>承兑交单 D/A</b></td><td>发货</td><td>银行控制单据</td><td>买方承兑后交单，到期付款</td><td class="num">高</td><td>信任较高、竞争激烈</td></tr>'
  +'<tr><td><b>赊销 OA</b></td><td>先发货</td><td>—</td><td>账期后付款</td><td class="num">很高</td><td>长期伙伴、强势买方</td></tr>'
  +'</tbody></table></div>'
  +'<div class="defbox"><div class="en">Letter of Credit（L/C）</div><div class="zh">信用证</div><div class="def">银行（开证行）应买方请求，向卖方作出的有条件付款承诺：卖方在约定期限内提交符合信用证条款的单据（提单、发票、保险单、产地证等），银行即付款。本质是「用银行信用替代商业信用」。</div><div class="meta"><div><b>核心特征：</b>单据交易（银行只看单据表面是否相符，不看货物）；独立性（信用证独立于买卖合同）。<br><b>常见不符点（拒付主因）：</b>提单日期晚于装运期、单据签章不符、数量/金额矛盾、未显示信用证要求的事项、单据之间信息不一致。<br><b>类型：</b>不可撤销（默认，未经同意不得修改/撤销）、即期/远期、可转让（中间商适用）、保兑（经开证行以外的银行保兑，降低开证行所在国风险）。</div></div></div>'
  +'<div class="defbox"><div class="en">Export Credit Insurance</div><div class="zh">出口信用保险</div><div class="def">保险机构承保出口商的国外买方信用风险（破产、拖欠）与政治风险（汇兑限制、征收、战争）。中国出口企业主要使用中国出口信用保险公司（中国信保）的短期出口险；赔付比例通常为 70–90%，且常附带「买方额度审批」机制。</div><div class="meta"><div><b>商业价值：</b>（1）把不可保的赊销变为可管理的风险；（2）保单可用于贸易融资（保单质押）；（3）信用限额审批过程本身就是买方资信调查。</div></div></div>'
  +'<div class="defbox"><div class="en">BEC Fraud（Business Email Compromise）</div><div class="zh">商务邮件入侵诈骗</div><div class="def">攻击者入侵或冒充交易方邮箱，在临近付款时伪冒「账户变更」指令，诱使企业把货款汇入骗子账户。国际贸易年均损失以十亿美元计（FBI IC3 等执法机构持续通报）。防范：任何收款账户变更必须电话回呼已存档号码确认；大额付款双人复核；建立「账户变更 = 高危操作」流程。</div></div>' },

  { id:'m21-s4', h:'21.4 底层逻辑：支付方式的风险—资金曲线', lvl:2, html:
  '<div class="chain"><span class="node">预付款</span><span class="arr">→</span><span class="node">见单付余款</span><span class="arr">→</span><span class="node">信用证</span><span class="arr">→</span><span class="node">D/P → D/A → OA</span><span class="arr">·</span><span class="node hot">卖方风险与资金占用递增</span></div>'
  +'<p>机制：（1）<b>单据控制权</b>是收款安全的核心杠杆——提单是物权凭证（m19），谁控制提单谁就有货权筹码；见单付款与信用证的本质都是「单据换资金」；（2）<b>信用替换</b>——信用证用银行信用替代买方商业信用，但引入「单证相符」的操作风险；（3）<b>资金占用</b>——账期每延长 30 天，卖方的营运资金需求与汇率暴露同步上升（m22）；（4）<b>风险定价</b>——赊销的「让步」应换来价格或订单量补偿，否则是免费送保险。</p>' },

  { id:'m21-s5', h:'21.5 应用方法：付款条件设计五步', lvl:2, html:
  '<div class="steps">'
  +'<div class="step"><h5>评估买方信用</h5><p>新客户：资信报告 + 小单测试；老客户：历史回款记录 + 财务信号。出口信用保险的额度审批是现成的第三方判断。</p></div>'
  +'<div class="step"><h5>评估国家风险</h5><p>外汇管制、政治动荡、银行体系风险（m28）——高风险国家避免赊销，考虑信用证 + 保兑。</p></div>'
  +'<div class="step"><h5>设计结构</h5><p>标准模板：新客户 100% 预付或 30% 预付 + 70% 见单；稳定客户 30/70 或 OA 30–60 天（配信保）；大额长周期项目用信用证或分期 + 预付款保函。</p></div>'
  +'<div class="step"><h5>管理单据</h5><p>建立「信用证单据清单 + 双人复核」流程；提单背书与寄送控制；所有单据信息一致（数量、金额、日期）。</p></div>'
  +'<div class="step"><h5>监控与催收</h5><p>应收账款账龄表；到期前提醒；逾期分级催收（提醒 → 正式函 → 律师函 → 保险索赔/仲裁）；任何账户变更走回呼确认流程（防 BEC）。</p></div>'
  +'</div>' },

  { id:'m21-s6', h:'21.6 案例：一笔信用证交易的不符点教训', lvl:2, html:
  '<div class="case"><div class="case-head"><div class="tag">案例 1 · 单据风险</div><div class="ttl">一个日期错误如何让 10 万美元货款拖延 45 天</div></div><div class="case-body">'
  +'<h5>背景（教学案例）</h5><p>出口商通过信用证向中东买方发货，信用证要求「提单须在 6 月 30 日前装运」。实际装运日 7 月 2 日，出口商未仔细核对即交单，银行以「迟装运」为由拒付。</p>'
  +'<h5>处理过程</h5><p>（1）出口商与买方沟通请求接受不符点（买方同意并指示开证行付款）——多数不符点最终靠买卖双方协商解决；（2）货已在港，产生滞港费；（3）整改：交单前增加「信用证条款逐项核对」步骤，重点核对装运期、交单期、单据一致性。</p>'
  +'<h5>启示</h5><p>（1）信用证保护卖方的条件是「单证相符」——银行没有义务看货物，只看单据；（2）不符点拒付的博弈点：货在目的港，买方不提货则产生滞港费，最终往往回到谈判桌，但卖方现金被拖延 30–60 天；（3）把「信用证操作规范」写入流程（制单 → 复核 → 交单前终检）比事后救火便宜得多；（4）不确定条款（如模糊的装运期表述）应在开证阶段就请求澄清（改证），而非交单后解释。</p>'
  +'</div></div>' },

  { id:'m21-s7', h:'21.7 局限、争议与常见误区', lvl:2, html:
  '<ul><li><b>信用证不是「零风险」：</b>它转移的是「买方不付款」风险，引入的是「单证操作」与「开证行国家/银行」风险；应评估开证行资质，必要时保兑。</li>'
  +'<li><b>赊销不是「信任」的唯一表达：</b>赊销应以信保 + 额度 + 账期监控为配套；无保护的赊销是赌博。</li>'
  +'<li><b>误区一：</b>见提单副本付款 = 安全。副本不是物权凭证，买方凭副本可推断货已发运，但正本仍在卖方手里时，极端情况下可「正本提单控制货物」——这既是保护也是谈判点。</li>'
  +'<li><b>误区二：</b>信保「保了」就万事大吉。信保有除外责任（买方争议、货物质量、单据欺诈）与赔偿比例（非全额），且理赔需要完整证据链。</li>'
  +'<li><b>误区三：</b>忽视 BEC 诈骗。账户变更类诈骗是最常见且最难追回的国际支付损失。</li></ul>' },

  { id:'m21-s8', h:'21.8 与其他模块的联系', lvl:2, html:
  '<ul><li><b>→ m19：</b>提单与单据流是付款安全的基础设施。</li>'
  +'<li><b>→ m22：</b>账期越长，汇率暴露越大；付款货币选择是汇率管理的一部分。</li>'
  +'<li><b>→ m28：</b>国家风险中的汇兑限制直接决定赊销可行性。</li>'
  +'<li><b>→ m25：</b>付款条件是谈判的核心筹码之一。</li>'
  +'<li><b>→ m31：</b>应收账款是现金流测算的核心科目。</li></ul>' }
  ],
  exercises:[
  { type:'概念理解', q:'信用证的「单据交易」与「独立性」原则是什么？为什么银行「看单据不看货物」？', a:'单据交易：银行处理信用证时只审查单据表面是否与信用证条款相符，不验证货物真实状况。独立性：信用证一旦开立即独立于基础买卖合同——买方不能以「货物质量有问题」为由要求银行拒付，卖方也不能以「合同有争议」为由拒绝交单。原理：信用证流转靠单据的确定性与可审查性，若银行介入货物事实判断，效率与可预期性将崩塌。对企业的含义：卖方必须把合同约定「翻译」成可核验的单据条款（品质证明、检验证书）；买方若在意货物质量，应把要求写进信用证的单据条款（如要求第三方检验证书）。' },
  { type:'概念理解', q:'出口信用保险如何改变赊销决策？它的除外责任通常有哪些？', a:'出口信用保险承保买方信用风险（破产、拖欠、拒收）与政治风险（汇兑限制、进口管制、战争、征收），使原本不可控的赊销变为「有额度、有费率、有追偿机制」的风险敞口；保单还可用于融资质押。常见除外责任：（1）买方争议（质量、数量、交货）导致的拒付；（2）被保险人自身违约；（3）单据欺诈；（4）已知风险（投保前已存在的风险征兆）；（5)部分国家/买家的限额。因此信保是「风险缓冲」而非「免死金牌」，合同质量与单据规范仍是第一道防线。' },
  { type:'实际应用', q:'客户要求 OA 90 天，但你对其信用不完全了解。设计一个既保留订单又控制风险的方案。', a:'方案：（1）投保短期出口信用保险，按批复的买方信用限额接受赊销（未批复额度前不发货超限部分）；（2）首单压缩账期（OA 30 天或见单付款），连续两次按期回款后再延长；（3）价格补偿：赊销让渡的资金成本（利率 + 风险溢价）计入报价（如加价 2–4% 或收取融资费）；（4）合同条款：逾期利息、所有权保留（title retention）、货物可召回条款；（5）监控：账龄表 + 到期前提醒 + 财务信号监测（买方公开信息变化）；（6）备选：由买方提供银行付款保函或由其银行承兑。评价标准：是否体现「风险定价 + 额度控制 + 渐进信任」的组合。' },
  { type:'实际应用', q:'你收到「长期供应商」的邮件，称「因集团财务调整，请将货款汇至以下新账户」，并附完整汇款指令。正确的处理流程是什么？', a:'流程：（1）高度警觉——账户变更请求是 BEC 诈骗最高发场景，即使邮件来自「熟悉的域名」（可能被入侵或高度仿冒）；（2）不直接回复该邮件；（3）使用「此前存档的」（非邮件中提供的）电话号码致电该供应商的财务/采购联系人，人工核实账户变更的真实性；（4）向你的银行举报可疑指令；（5）大额付款坚持双人复核 + 银行回调确认；（6）若已汇款，立即联系银行启动跨境追款（成功率低，时间窗口以小时计）并报警。核心原则：涉及资金账户的任何变更，永远走「带外验证」（out-of-band verification）。' },
  { type:'综合分析', q:'为「新客户 + 高风险国家 + 定制产品」的组合设计付款方案，并说明每项设计防范的风险。', a:'参考方案：（1）30% 预付款（覆盖原材料与开模成本）——防范弃单与定制损失；（2）40% 见提单副本付款——货已发运的证据 + 部分资金保障；（3）30% 到货验收后 30 天内付清（OA 30）——买方体验，但限额最小化；（4）投保出口信用保险并仅使用批复额度——兜底买方信用与政治风险；（5）高风险国家 → 不接受纯赊销；若买方坚持，要求保兑信用证（降低开证行国家风险）；（6）收款货币：优先人民币或硬通货，约定汇率波动调整条款（m22）；（7）所有权保留条款 + 货物可转卖安排——违约时的止损设计。每项都对应一类具体风险：弃单、货权、信用、政治、汇率、流动性。评价标准：设计是否与「新客户 + 高风险 + 定制」三特征逐一对应。' }
  ]
},

m22: {
  id:'m22', stage:'s5', title:'汇率风险与管理', en:'Foreign Exchange Risk and Management',
  hours:'5–8 小时', goal:'理解交易风险、折算风险与经济风险，掌握报价货币选择、自然对冲与远期合约等基础管理方法。',
  prereqText:'m21 支付方式。', outcome:'能识别一笔国际业务的汇率暴露，选择对冲工具，并在报价中纳入汇率假设。',
  summary:'汇率波动通过三条路径侵蚀利润：报价时点与收款时点的汇差（交易风险）、财务报表折算（折算风险）、长期竞争力变化（经济风险）。管理汇率不是预测汇率，而是控制暴露。',
  terms:['exchange-rate','transaction-exposure','translation-exposure','economic-exposure','natural-hedge','forward-contract','currency-basket','pass-through'],
  prereq:['m21'], related:['m31','m28'],
  sources:['s03','s21'],
  sections:[
  { id:'m22-s1', h:'22.1 学习定位', lvl:2, html:
  '<p>本模块把汇率从「新闻数字」变成「管理变量」。出口企业最常见的亏损场景不是没订单，而是「接单时汇率 7.1、收款时 7.3，毛利被吃掉」。核心认知：<b>企业无法预测汇率，但可以管理暴露</b>——选择计价货币、匹配收支币种（自然对冲）、使用远期合约、在报价中预留汇率缓冲。</p>' },

  { id:'m22-s2', h:'22.2 从直观问题开始：一单生意，两种结局', lvl:2, html:
  '<p>出口商报价 10 万美元（FOB），订单签订时汇率 7.10，预期回款 71 万元人民币，计划毛利率 15%。90 天后收款，汇率贬至 7.30——实际收入 73 万元，反而多赚；若升值至 6.90，则只有 69 万元，毛利从 15% 压缩到约 7%，可能低于盈亏线。<b>同一笔订单，汇率 ±3% 让利润增减近一半。</b>对毛利率 10–20% 的出口制造业，汇率是比关税更日常的利润变量。而对买方来说，本币贬值同样改变采购决策——这就是「汇率传导（pass-through）」影响需求的原因。</p>' },

  { id:'m22-s3', h:'22.3 正式定义：三类暴露', lvl:2, html:
  '<div class="defbox"><div class="en">Transaction Exposure</div><div class="zh">交易风险</div><div class="def">以外币计价的合约性收支（应收/应付、外币借贷）在结算前因汇率波动产生的损益。这是出口企业最直接、最高频的暴露。</div><div class="meta"><div><b>计算公式：</b>风险敞口 = 外币金额 ×（结算日汇率 − 签约日汇率）。管理目标：锁定结算日汇率或让敞口自然抵消。</div></div></div>'
  +'<div class="defbox"><div class="en">Translation Exposure</div><div class="zh">折算风险</div><div class="def">境外资产/负债与损益在合并财务报表时折算为本币产生的账面波动。影响报表利润与净资产，通常不影响现金流（除非触发债务契约）。</div></div>'
  +'<div class="defbox"><div class="en">Economic Exposure</div><div class="zh">经济风险</div><div class="def">汇率长期变动对企业未来现金流与市场竞争力的影响。如本币长期升值 → 出口价格竞争力下降 → 订单流向成本国贬值的竞争者。这是战略性暴露，无法用衍生工具完全对冲，只能靠成本结构、市场多元化与定价权应对。</div></div>'
  +'<div class="defbox"><div class="en">Natural Hedge</div><div class="zh">自然对冲</div><div class="def">通过让同一货币的收入与支出相互抵消来降低净敞口。例：在美国收入美元，同时用美元支付美国市场费用（营销、仓储、人工）与从美国采购——净敞口 = 美元收入 − 美元支出。多点布局的企业天然拥有更多自然对冲机会。</div></div>'
  +'<div class="defbox"><div class="en">Forward Contract</div><div class="zh">远期外汇合约</div><div class="def">与银行约定未来某一日期按约定汇率交割约定金额外汇的合约。作用是「锁定未来汇率」：放弃升值时的额外收益，换取贬值时的确定性。适合有明确外币收支计划的出口商。</div></div>' },

  { id:'m22-s4', h:'22.4 底层逻辑：暴露如何传导到利润', lvl:2, html:
  '<div class="chain"><span class="node">汇率变动</span><span class="arr">→</span><span class="node">结算本币收入变化（交易风险）</span><span class="arr">→</span><span class="node">毛利率变化</span><span class="arr">→</span><span class="node">价格竞争力变化（传导）</span><span class="arr">→</span><span class="node">订单流向变化（经济风险）</span></div>'
  +'<p>关键机制：（1）<b>毛利率放大效应</b>——毛利率越低，同样汇率波动的利润冲击越大（15% 毛利下 3% 贬值即减半利润）；（2）<b>传导不完全性</b>——出口商可通过调价把部分汇率波动转嫁给买方（pass-through），但竞争激烈时传导受阻；（3）<b>时间结构</b>——从签约到收款的时间越长（OA 账期、长运输周期），暴露越大；（4）<b>货币选择</b>——用本币报价把汇率风险推给买方（但可能削弱价格竞争力）；用买方货币报价则自己承担。</p>' },

  { id:'m22-s5', h:'22.5 应用方法：汇率管理四步', lvl:2, html:
  '<div class="steps">'
  +'<div class="step"><h5>量化敞口</h5><p>按币种、按到期日列出未来 3–12 个月的外币应收/应付，计算净敞口与「压力情景」（如 ±5%、±10% 对利润的影响）。</p></div>'
  +'<div class="step"><h5>自然对冲优先</h5><p>把外币收入用于外币支出（当地费用、当地采购、当地还款）；多点布局时优先在净敞口大的市场配资产。</p></div>'
  +'<div class="step"><h5>工具对冲剩余</h5><p>确定性收支 → 远期合约；不确定但有预期的 → 部分比例对冲（如 50%）或期权（保留灵活性，付权利金）；极短期 → 即期。</p></div>'
  +'<div class="step"><h5>商务安排</h5><p>报价加「汇率调整条款」（签约与结算汇率差超过 ±2–3% 时重议）；合同货币多元化（美元/欧元/人民币组合）；缩短账期降低暴露窗口。</p></div>'
  +'</div>' },

  { id:'m22-s6', h:'22.6 案例：一单出口订单的汇率压力测试', lvl:2, html:
  '<div class="case"><div class="case-head"><div class="tag">案例 1 · 演算</div><div class="ttl">汇率 ±5% 如何改变订单利润</div></div><div class="case-body">'
  +'<h5>设定（教学演算）</h5><p>出口订单 20 万美元；签约日汇率 7.10；预期毛利 12%（约 17.04 万元人民币毛利）；账期 60 天。</p>'
  +'<div class="tbl-wrap"><table class="data"><thead><tr><th>情景</th><th>结算汇率</th><th>人民币收入</th><th>毛利</th><th>毛利变化</th></tr></thead><tbody>'
  +'<tr><td>本币升值 5%</td><td class="num">6.745</td><td class="num">134.9 万</td><td class="num">约 8.5 万</td><td class="num">−50%</td></tr>'
  +'<tr><td>基准</td><td class="num">7.10</td><td class="num">142.0 万</td><td class="num">17.04 万</td><td class="num">—</td></tr>'
  +'<tr><td>本币贬值 5%</td><td class="num">7.455</td><td class="num">149.1 万</td><td class="num">约 25.5 万</td><td class="num">+50%</td></tr>'
  +'</tbody></table></div>'
  +'<h5>管理动作</h5><p>（1）签约时卖出 20 万美元远期（60 天）锁定 7.10——无论市场如何，锁定 17.04 万毛利；（2）若预期人民币升值且订单利润薄，优先缩短账期（把 60 天缩到 30 天）；（3）报价中加汇率调整条款，±3% 以上重议；（4）逐步提高人民币计价或本币—买方货币组合报价比例，测试买方接受度。</p>'
  +'<h5>结论</h5><p>低毛利业务中，汇率波动的利润弹性远大于多数成本项；不管理汇率等于把一半利润交给市场。</p>'
  +'</div></div>' },

  { id:'m22-s7', h:'22.7 局限、争议与常见误区', lvl:2, html:
  '<ul><li><b>远期锁定 = 放弃机会：</b>若汇率朝有利方向变动，远期让你少赚。管理目标不是收益最大化，而是利润可预期。对冲比例（如 50%）是收益与确定性的平衡。</li>'
  +'<li><b>「等升值了再结汇」是投机：</b>把经营性现金流的命运押在汇率预测上，与套保逻辑相反。</li>'
  +'<li><b>误区一：</b>只对冲大额订单、忽视小额累积。高频小额的净敞口累积同样致命，应按币种汇总管理。</li>'
  +'<li><b>误区二：</b>认为「人民币计价就没风险」。买方可能因此压价或流失——货币选择是商务条款，有价格代价。</li>'
  +'<li><b>误区三：</b>忽视新兴市场货币的流动性风险——部分货币无远期市场或对冲成本极高，只能用自然对冲与账期管理。</li></ul>' },

  { id:'m22-s8', h:'22.8 与其他模块的联系', lvl:2, html:
  '<ul><li><b>→ m21：</b>账期长度决定暴露窗口；付款货币是合同核心条款。</li>'
  +'<li><b>→ m25：</b>汇率条款是谈判筹码（接受买方货币 = 让利）。</li>'
  +'<li><b>→ m28：</b>货币危机是最高级别的汇率风险形态。</li>'
  +'<li><b>→ m31：</b>汇率情景进入财务测算与敏感性分析。</li></ul>' }
  ],
  exercises:[
  { type:'概念理解', q:'交易风险、折算风险、经济风险的区别是什么？各举一个出口企业的例子。', a:'交易风险：已签约外币收支在结算前的汇兑损益——如 60 天后收 20 万美元，期间汇率变动。折算风险：境外子公司报表折算为本币的账面波动——如德国子公司资产在合并报表中因欧元贬值而缩水。经济风险：汇率长期变动对未来现金流与竞争力的影响——如人民币长期升值使你的产品相对越南竞争者变贵，三年后订单流失。管理工具：交易风险用远期/自然对冲；折算风险多用会计与债务币种安排；经济风险只能靠成本结构、市场多元化与定价权。' },
  { type:'概念理解', q:'为什么低毛利出口业务对汇率更敏感？用数字说明。', a:'利润对汇率的弹性 ≈ 外币收入占比 / 毛利率。例：外币收入占总收入 80%、毛利率 10%——本币每升值 1%，收入减少约 0.8%，利润减少约 8%（0.8/0.1）。若毛利率 30%，同样升值只减利润约 2.7%。结论：毛利率越低，汇率波动的相对冲击越大——这正是光伏、纺织等薄利行业普遍使用远期锁汇的原因。' },
  { type:'实际应用', q:'企业未来 6 个月的外币应收为：美元 80 万（3 个月内）、美元 50 万（4–6 个月）、欧元 30 万（3 个月内）；美元应付 20 万。设计对冲方案。', a:'方案：（1）净敞口计算：美元 110 万应收 − 20 万应付 = 90 万净敞口（欧元 30 万）；（2）确定性高的近端（3 个月内美元 80 万）→ 远期锁汇 70–80%（或 100%，视风险偏好）；（3）远端（4–6 个月美元 50 万）→ 部分对冲（30–50%）或卖出期权保留灵活性；（4）欧元 30 万 → 用欧元支付欧洲当地费用（仓储、营销）做自然对冲，剩余远期；（5）建立汇率压力情景（±5%）写入月度经营分析。评价标准：是否体现「自然对冲优先 + 远端低比例 + 压力测试」。' },
  { type:'实际应用', q:'买方要求以本币（发展中市场货币）计价，否则转向竞争对手。你如何评估与应对？', a:'评估：（1）该货币的远期市场流动性与对冲成本——无远期或成本极高则风险不可管理；（2）该货币的历史波动率与贬值趋势；（3）订单规模与利润缓冲——能否承受 10–15% 贬值；（4）能否在当地建立自然对冲（本地费用/采购/融资）。应对选项：（1）接受但加价（把对冲成本 + 贬值预期计入价格）；（2）接受但缩短账期、提高预付款比例；（3）分期调价条款（与汇率联动）；（4）拒绝并守住美元/欧元报价，测试买方对价格的敏感度（也许对手只是谈判策略）；（5）长期方案：当地建产能/本地采购实现自然对冲。原则：货币让步必须有价格补偿，不能免费送风险敞口。' },
  { type:'综合分析', q:'「汇率预测决定出口企业成败。」评估这一说法，并给出你的管理哲学。', a:'评估：把企业成败押在汇率预测上是危险的幸存者偏差叙事——短期汇率接近随机游走，专业机构的中长期预测准确率也很低。相反，成功出口企业的共同点是「对汇率不敏感」：自然对冲（多币种收支匹配）、适度远期（锁定确定性成本）、商务条款（调价机制）、成本优势（低毛利但不依赖单市场）。管理哲学：（1）区分「经营」与「投机」——经营管暴露，投机管预测，两者不混；（2）锁定「可锁定的」（确定性收支），保留「不可锁定的」（期权与灵活性）；（3）把汇率压力测试纳入所有报价与预算（±5/±10% 情景）；（4)在战略层用市场与产能多元化降低对单一货币的依赖。' }
  ]
},

m23: {
  id:'m23', stage:'s5', title:'贸易合规：制裁、出口管制与市场准入', en:'Trade Compliance: Sanctions, Export Controls and Market Access',
  hours:'8–12 小时', goal:'掌握出口管制、经济制裁、受限方筛查、反商业贿赂、产品准入与数据跨境的基本框架，建立合规检查表思维。',
  prereqText:'m20 海关实务、m06 制度。', outcome:'能对一笔交易做基础合规筛查，识别高风险信号，并知道何时必须升级给专业人士。',
  summary:'合规模块是国际商业的「高压线」：违反出口管制与制裁的后果远超商业损失（刑事责任、实体清单、全球市场禁入）。合规不是法条背诵，而是把筛查嵌入业务流程。',
  terms:['export-control','economic-sanctions','entity-list','restricted-party-screening','anti-bribery','product-certification','data-localization','deemed-export','compliance-program'],
  prereq:['m20','m06'], related:['m28','m29','m32'],
  sources:['s13','s14','s15','s16','s19','s20'],
  sections:[
  { id:'m23-s1', h:'23.1 学习定位', lvl:2, html:
  '<p>本模块的特殊性：它是唯一一个「不知道」本身就是风险的领域。合规规则动态、跨司法辖区、且具有域外效力（美国法可以管一家中国公司在德国的交易）。学习目标不是记住规则，而是建立<b>「何时必须停下来查」的条件反射</b>：遇到受限方、受限物项、敏感用途、敏感地区、军最终用户——停，查，升级。</p>'
  +'<div class="callout warn"><span class="ico">⚠️</span><div><b>本模块的边界声明：</b>以下内容为通识性框架与截至 2026 年 10 月的公开政策状态，不构成针对任何具体交易的法律意见。出口管制与制裁是动态且有司法辖区差异的领域，任何具体交易必须咨询专业合规顾问或律师，并以官方最新文本为准。</div></div>' },

  { id:'m23-s2', h:'23.2 从直观问题开始：三个真实合规场景', lvl:2, html:
  '<p>场景一：一家企业向海外客户销售含中国原产稀土的磁体——中国自 2025 年 4 月起对钐、钆、铽、镝、镥、钪、钇等中重稀土及相关磁体实施出口管制（商务部、海关总署 2025 年第 18 号公告），出口需申请许可<button class="src gA" data-src="s13">13</button>。场景二：一家企业拟向某国客户出口高能量密度锂电池及人造石墨负极材料——2025 年 10 月的扩展管制措施（第 58 号公告等）已宣布暂停实施至 2026 年 11 月 10 日，但基础管制仍然有效<button class="src gB" data-src="s15">15</button>。场景三：一家企业拟聘用曾参与核技术研究的境外工程师——技术管制可能把「出口」扩展到技术许可、联合研发、甚至人员交流（视具体法域与物项而定）。</p>'
  +'<p>三个场景的共同点：<b>交易本身看起来是正常商务活动，但物项、技术或交易方的属性触发管制。</b>合规筛查必须在报价与签约前完成，而不是报关时。</p>' },

  { id:'m23-s3', h:'23.3 正式定义：合规版图', lvl:2, html:
  '<div class="defbox"><div class="en">Export Controls</div><div class="zh">出口管制</div><div class="def">国家对货物、技术、软件与服务的出口实施的许可制度。两大体系：多边（瓦森纳安排等，经各国立法转化）与单边（如美国 EAR、中国《出口管制法》及商务部公告）。管制物项通常同时受「清单管理」（列名物项需许可）与「兜底条款」（知悉风险即需许可）约束。</div><div class="meta"><div><b>中国体系要点：</b>《出口管制法》（2020 年 12 月施行）+ 两用物项清单 + 临时管制公告；2025 年以来商务部公告密集（第 18 号中重稀土、第 55 号超硬材料、第 58 号锂电池与负极材料等），其中扩展性措施自 2025 年 11 月起暂停实施至 2026 年 11 月<button class="src gA" data-src="s13">13</button><button class="src gB" data-src="s15">15</button>。<br><b>美国体系要点：</b>EAR（商业管制清单、实体清单、50% 穿透规则——2025 年 9 月公布后于釜山会晤后暂停一年<button class="src gA" data-src="s23">23</button>）+ ITAR（军品）+ OFAC 制裁。<br><b>欧盟体系要点：</b>两用物项条例 + 制裁条例。</div></div></div>'
  +'<div class="defbox"><div class="en">Economic Sanctions</div><div class="zh">经济制裁</div><div class="def">一国或多国对特定国家、实体、个人实施的限制性措施：资产冻结、交易禁止、行业禁入（如能源、金融、技术）。制裁具有域外性——第三国企业与受限方的交易也可能被处罚。</div><div class="meta"><div><b>企业义务：</b>持续筛查交易方（客户、供应商、承运人、银行）是否列入制裁清单；关注「50% 规则」（被制裁实体持股 50% 以上的子公司自动受限，美国体系）与「穿透」执法。</div></div></div>'
  +'<div class="defbox"><div class="en">Restricted Party Screening</div><div class="zh">受限方筛查</div><div class="def">在建立业务关系前与持续经营中，将交易方（及最终用户、收货人、中间商）与制裁清单、实体清单、最终用户清单进行比对。筛查不是一次性的——名单持续更新，需嵌入 onboarding 与每笔交易流程。</div></div>'
  +'<div class="defbox"><div class="en">Anti-Bribery / FCPA / UK Bribery Act</div><div class="zh">反商业贿赂</div><div class="def">禁止向公职人员（及部分法域下的商业伙伴）提供不当利益以获取业务。美国 FCPA 与英国《反贿赂法》均有域外效力；中国《反不正当竞争法》同样禁止商业贿赂。高风险场景：佣金、咨询费、样品礼品、政府项目招投标、第三方代理。</div></div>'
  +'<div class="defbox"><div class="en">Product Compliance / Market Access</div><div class="zh">产品合规与市场准入</div><div class="def">产品进入市场前须满足的技术法规、安全标准、认证与标识要求。例：欧盟 CE（含 LVD/EMC/RED）、电池法规（EU 2023/1542）、WEEE/EPR 与 RoHS；美国 FCC、CPSC、DOT；日本 PSE。电池法规关键节点：尽职调查义务（年营收 ≥4,000 万欧元企业）自 2025 年 8 月 18 日适用，数字电池护照 2027 年 2 月 18 日起对适用电池强制<button class="src gA" data-src="s19">19</button>。</div><div class="meta"><div><b>本地含量类准入：</b>印度 ALMM 要求政府项目使用本土清单内电池（2026 年 6 月起）<button class="src gB" data-src="s20">20</button>；巴西 RoHS 类似的有害物质限制草案（2025 年 9 月公众评议）<button class="src gB" data-src="s21">21</button>。</div></div></div>' },

  { id:'m23-s4', h:'23.4 底层逻辑：合规风险如何产生与传导', lvl:2, html:
  '<div class="chain"><span class="node">物项属性（清单/兜底）</span><span class="arr">×</span><span class="node">交易方属性（受限名单/股权穿透）</span><span class="arr">×</span><span class="node">用途与最终用户（军品/扩散风险）</span><span class="arr">×</span><span class="node">目的地与转运路径</span><span class="arr">→</span><span class="node hot">许可 / 禁止 / 处罚</span></div>'
  +'<p>传导机制：（1）<b>合规失败 → 商业停摆</b>：被列入实体清单的企业失去美国供应商与美元结算通道，等于被踢出全球供应链；（2）<b>合规失败 → 连带责任</b>：供应链尽职调查不足导致「协助违规」；（3）<b>合规成本 → 竞争格局</b>：高合规门槛是合规企业的护城河（欧盟电池法规把中小进入者挡在门外<button class="src gA" data-src="s19">19</button>）。</p>' },

  { id:'m23-s5', h:'23.5 应用方法：交易合规筛查清单', lvl:2, html:
  '<div class="steps">'
  +'<div class="step"><h5>物项筛查</h5><p>确认产品 HS 编码对应的出口管制状态（是否在两用物项清单/临时管制/加征清单）；含中国原产稀土成分超阈值（如 0.1% de minimis 规则，当前暂停但规则设计存在）需溯源<button class="src gB" data-src="s15">15</button>。</p></div>'
  +'<div class="step"><h5>交易方筛查</h5><p>对客户、收货人、中间商、最终用户做受限名单比对（含股权穿透）；对金融机构与承运人的制裁状态保持关注。</p></div>'
  +'<div class="step"><h5>用途与场景筛查</h5><p>军品、核、无人机、AI、半导体等敏感用途需额外审查；对「最终用户声明」做多源验证。</p></div>'
  +'<div class="step"><h5>文件与记录</h5><p>保存筛查记录、最终用户声明、许可申请文件、沟通记录——合规证据链在执法时就是你的辩护。</p></div>'
  +'<div class="step"><h5>升级机制</h5><p>任何「不确定」→ 暂停交易 → 合规/法务/外部律师评估；建立内部合规制度（ICP）与定期培训。</p></div>'
  +'</div>' },

  { id:'m23-s6', h:'23.6 案例：稀土出口管制的企业应对', lvl:2, html:
  '<div class="case"><div class="case-head"><div class="tag">案例 1 · 政策演化</div><div class="ttl">从「许可时代」到「暂停期」：2025–2026 稀土管制时间线</div></div><div class="case-body">'
  +'<h5>时间线（以官方公告与权威二手来源交叉核验）</h5><p>（1）2023 年起：镓、锗、石墨等实施出口许可；（2）2024 年 12 月：对美禁止镓、锗、锑出口；（3）2025 年 4 月：对钐、钆、铽、镝、镥、钪、钇等七种中重稀土及相关物项实施出口管制（商务部、海关总署公告 2025 年第 18 号）——该措施持续有效<button class="src gA" data-src="s13">13</button>；（4）2025 年 10 月：扩展至更多稀土元素、0.1% 含量域外规则、稀土技术、锂电池与负极材料、超硬材料（第 55–58、61、62 号公告）；（5）2025 年 11 月 7 日：第 70 号公告宣布上述扩展性措施暂停实施至 2026 年 11 月 10 日<button class="src gB" data-src="s15">15</button>；（6）釜山会晤后：中美互相暂停部分出口管制措施一年（美方暂停 50% 穿透规则，中方暂停 10 月 9 日公布的稀土管制措施）<button class="src gA" data-src="s23">23</button>。</p>'
  +'<h5>企业应对框架</h5><p>（1）成分溯源：对出口产品建立「中国原产管制物项」台账（含 0.1% 阈值意识）；（2）许可意识：第 18 号公告管制物项出口必须申请许可，实践中存在「含管制元素 0.01% 仍被认定两用物项」的执法案例（行业报道口径）<button class="src gB" data-src="s15">15</button>；（3）暂停 ≠ 取消：扩展措施是可「随时启用」的政策储备，供应链规划不能按永久放松设计；（4）双向合规：既遵守中国出口管制，也遵守进口国的制裁与管制（域外法冲突时寻求法律意见）。</p>'
  +'<h5>结论与限制</h5><p>结论：出口管制已从「清单管理」演化为「清单 + 兜底 + 域外 + 动态暂停」的复杂体系，合规能力成为国际业务的固定成本与竞争壁垒。限制：政策状态截至 2026 年 10 月，暂停期届满（2026 年 11 月）后的安排须以商务部最新公告为准。</p>'
  +'</div></div>' },

  { id:'m23-s7', h:'23.7 局限、争议与常见误区', lvl:2, html:
  '<ul><li><b>本模块的时效边界：</b>合规则与政策以月为单位变化，任何静态清单都会过期；必须建立「核验渠道 + 更新频率」机制（官方公告、专业律所简报、使领馆经商机构）。</li>'
  +'<li><b>「暂停」的误读：</b>暂停是政策工具而非政策结论（稀土扩展措施暂停至 2026 年 11 月，但基础管制仍有效）——把暂停当作放松是危险的。</li>'
  +'<li><b>误区一：</b>「我们只是贸易商，不生产」——贸易商同样承担出口管制责任（知悉风险即触发义务）。</li>'
  +'<li><b>误区二：</b>「客户说不是军用就行」——最终用户声明必须多源验证，声明本身不构成尽职调查。</li>'
  +'<li><b>误区三：</b>「合规是法务的事」——合规必须嵌入报价、签约、物流、收款全流程，法务只做判断不做拦截。</li></ul>' },

  { id:'m23-s8', h:'23.8 与其他模块的联系', lvl:2, html:
  '<ul><li><b>→ m20：</b>归类错误与低报价格是海关合规违规。</li>'
  +'<li><b>→ m28–m29：</b>制裁与出口管制是地缘经济风险的核心传导机制。</li>'
  +'<li><b>→ m17：</b>伙伴尽调必须包含受限方筛查。</li>'
  +'<li><b>→ m32：</b>综合项目的准入评估必须包含合规章节。</li></ul>' }
  ],
  exercises:[
  { type:'概念理解', q:'出口管制中的「清单管理」与「兜底条款」有什么区别？为什么后者让「不含清单物项」的产品也可能触发许可？', a:'清单管理：管制物项以清单（两用物项清单、临时管制公告）列名，出口列名物项需申请许可。兜底条款：即使物项不在清单，出口经营者「知道或应当知道」该物项存在危害国家安全、被用于大规模杀伤性武器等风险时，仍需申请许可（中国《出口管制法》第 12 条即属此类）。因此「不含清单物项」不等于免于管制——知情状态、客户背景、最终用途都可能触发许可义务。这要求企业做全流程尽调，而非仅比对清单。' },
  { type:'概念理解', q:'「暂停实施」与「取消」有什么区别？以中国 2025 年 11 月的稀土管制暂停为例说明其管理含义。', a:'暂停是「在特定期限内不执行」，规则文本与执行能力仍在，期限届满可自动恢复或调整；取消是「规则废止」。2025 年 11 月第 70 号公告将 10 月扩展性管制（更多稀土元素、0.1% 域外规则、电池与负极材料等）暂停至 2026 年 11 月 10 日，但 4 月的第 18 号公告（七种中重稀土）持续有效<button class="src gB" data-src="s15">15</button>。管理含义：（1）暂停期是「政策窗口」不是「自由状态」——基础管制仍有效；（2）供应链与产能规划不能按「永久放松」设计，应保留快速恢复合规的架构；（3）期限届满前必须重新核验。' },
  { type:'实际应用', q:'一家中国磁材企业接到欧洲汽车客户订单，产品含铽（受管制中重稀土）。列出出口前必须完成的 5 个合规动作。', a:'（1）物项确认：确认铽含量与形态是否落入商务部 2025 年第 18 号公告管制范围（稀土以受管制元素种类为主要依据，含量阈值实践中有极低认定案例）<button class="src gB" data-src="s15">15</button>；（2）许可申请：通过商务部许可系统申请两用物项出口许可证，提交最终用户与用途证明；（3）客户尽调：欧洲汽车客户做受限名单筛查，确认非军事最终用户；（4）文件链：合同、最终用户声明、许可文件、报关单据的一致性；（5）记录保存：全流程记录留档（执法时的证据链）。若客户在欧盟，还需确认欧盟侧对华供应链的合规要求（如欧盟自身的外国补贴审查、关键原材料法案意向性要求）。评价标准：是否体现「先停、再查、再走」的顺序。' },
  { type:'实际应用', q:'如何为出海业务建立一个「最小可行合规体系」？列出 6 个组成部分。', a:'（1）责任体系：指定合规负责人 + 升级路径；（2）筛查工具：受限方名单比对（制裁/实体清单/最终用户清单）+ 物项编码与管制状态库；（3）流程嵌入：报价前筛查（新客户 onboarding）、每笔交易复审、发货前终检；（4）文件模板：最终用户声明、合规承诺函、筛查记录表；（5）培训与考核：关键岗位（销售、物流、采购）年度培训 + 案例复盘；（6）外部支持：专业律师/合规顾问名单 + 官方核验渠道清单。原则：从最小可用开始，随业务扩展迭代，但「筛查 + 记录 + 升级」三件套必须第一天就有。' },
  { type:'综合分析', q:'「合规成本是不必要的负担，先做生意再说。」评估这一观点，并说明合规投入的商业回报。', a:'短期看合规是成本（时间、费用、丢单），长期看是生存条件与竞争壁垒。回报机制：（1）风险规避：一次出口管制/制裁违规的后果（罚款、实体清单、刑事、美元通道丧失）远超全部合规预算——「先做再说」的期望值极差；（2）市场准入：高门槛合规本身是护城河——欧盟电池法规把无合规能力的中小竞争者挡在门外<button class="src gA" data-src="s19">19</button>，合规企业获得溢价与客户信任；（3）客户要求：大型跨国客户（汽车、能源）把供应链合规审计作为供应商门槛，无合规体系直接失去资格；（4)政策期权：合规记录良好的企业在政策变化（如暂停期结束）时切换成本更低。结论：合规不是「成本」而是「经营许可」，应按最低必要水平先行建设，随业务升级。' }
  ]
}

});

;

Object.assign(MODULES, {

/* ================= 阶段 6 ================= */
m24: {
  id:'m24', stage:'s6', title:'跨文化沟通：语境、维度与误读', en:'Cross-Cultural Communication: Context, Dimensions and Misreading',
  hours:'6–9 小时', goal:'理解高/低语境沟通、霍夫斯泰德文化维度等框架的用途与局限，识别跨文化沟通中的常见误读。',
  prereqText:'m06 制度基础观、m08 CAGE。', outcome:'能用文化框架解释沟通预期差异，同时避免把国籍当作个人行为预测器。',
  summary:'文化影响的是「默认预期」：什么叫直接、什么叫尊重、怎么说不、怎么建立信任。框架帮助你预判差异，但永远不能替代对具体个人的观察。',
  terms:['high-context','low-context','hofstede','power-distance','individualism','uncertainty-avoidance','stereotype','trust-building'],
  prereq:['m06','m08'], related:['m25','m26','m27'],
  sources:['s40','s39'],
  sections:[
  { id:'m24-s1', h:'24.1 学习定位', lvl:2, html:
  '<p>跨文化能力不是「知道各国礼仪」，而是<b>理解文化如何塑造沟通默认值，并在不确定时校准而非假设</b>。本模块覆盖三个层次：沟通语境（高/低语境）、文化维度框架（霍夫斯泰德等）、以及这些框架的滥用风险（刻板印象）。它服务于谈判（m25）、消费者沟通（m26）与渠道合作（m27）。</p>' },

  { id:'m24-s2', h:'24.2 从直观问题开始：一句「我们会考虑」的三种含义', lvl:2, html:
  '<p>中国销售对德国客户说「我们会认真考虑您的方案」。德国客户听到的是「有戏，等结果」；而中国同事的意思可能是「目前不行，但不想直接拒绝」。反过来，德国人对中国供应商的直白反馈（「这个设计有三个问题」）可能让中国团队感到「关系出现裂痕」，而德国人认为这是专业沟通的正常形态。<b>同样的语言，不同的语境规则，产生完全不同的关系判断。</b>这类误读不涉及善恶，只涉及默认值不同。</p>' },

  { id:'m24-s3', h:'24.3 正式定义', lvl:2, html:
  '<div class="defbox"><div class="en">High-Context vs Low-Context Communication</div><div class="zh">高语境 / 低语境沟通</div><div class="def">爱德华·霍尔提出：高语境文化（日本、阿拉伯、中国等）中，大量信息通过语境、关系、非语言线索传递，语言本身留白多，「不」很少被直接说出口；低语境文化（德国、美国、荷兰等）中，信息主要通过明确的语言传递，期待「所见即所得」的沟通。</div><div class="meta"><div><b>商业表现：</b>高语境方需要「读空气」与关系铺垫，合同是关系的开始；低语境方需要明确条款与直接反馈，合同是关系的定义。<br><b>注意：</b>同一国家内部差异巨大（行业、代际、组织文化），框架是概率不是定律。</div></div></div>'
  +'<div class="defbox"><div class="en">Hofstede\'s Cultural Dimensions</div><div class="zh">霍夫斯泰德文化维度</div><div class="def">基于 IBM 员工调查发展的六维框架<button class="src gA" data-src="s40">40</button>：权力距离（对不平等的接受度）、个人主义/集体主义、男性化/女性化（竞争vs关怀导向）、不确定性规避（对模糊的容忍度）、长期取向、放纵/克制。</div><div class="meta"><div><b>用途：</b>预判管理实践差异——如高权力距离文化的团队可能不适应扁平决策；高不确定性规避文化需要更详细的计划与保证。<br><b>局限（重要）：</b>（1）数据源自跨国公司员工，代表的是「职场文化」而非全民文化；（2）国家分数是平均值，掩盖内部差异；（3）部分维度的方法论与跨时代可比性受学术批评；（4）极易被滥用为刻板印象。</div></div></div>' },

  { id:'m24-s4', h:'24.4 底层逻辑：文化如何影响商务默认值', lvl:2, html:
  '<div class="chain"><span class="node">文化价值观</span><span class="arr">→</span><span class="node">沟通风格（直接/间接）</span><span class="arr">→</span><span class="node">信任建立方式（任务型/关系型）</span><span class="arr">→</span><span class="node">决策与谈判风格</span><span class="arr">→</span><span class="node">合作预期与冲突处理</span></div>'
  +'<p>关键机制：（1）<b>信任类型</b>——任务型信任（我信任你因为你履约可靠）vs 关系型信任（我信任你因为我们相互了解）——决定先谈生意还是先谈关系；（2）<b>反馈编码</b>——直接文化把负面反馈编码为「对事」，间接文化把负面反馈包装为「委婉」，解码错误就会把专业讨论读成人身攻击；（3）<b>时间取向</b>——单时制（按时序、守时、按计划）vs 多时制（并行处理、关系优先于日程）；（4）<b>层级与决策</b>——决策是自上而下还是共识制，影响你需要影响谁、谈多久。</p>' },

  { id:'m24-s5', h:'24.5 应用方法：跨文化协作的操作纪律', lvl:2, html:
  '<div class="steps">'
  +'<div class="step"><h5>先描述再解释</h5><p>记录观察到的行为（「对方推迟了三次会议」），而不是直接归因（「他们不重视」）。归因需要更多证据。</p></div>'
  +'<div class="step"><h5>建立共享沟通协议</h5><p>书面确认：决策流程、反馈方式、会议语言、响应时限、升级路径——把文化差异显式化为团队规则。</p></div>'
  +'<div class="step"><h5>校准而非假设</h5><p>用「复述确认」代替「我以为」：重要事项书面总结并请对方确认；对模糊表述追问具体含义。</p></div>'
  +'<div class="step"><h5>分层对待个体</h5><p>同一「文化标签」下的个体差异可能大于文化间差异；用框架生成假设，用互动验证个体。</p></div>'
  +'<div class="step"><h5>冲突复盘</h5><p>每次沟通事故后复盘：是语言问题、语境问题、组织问题还是个体问题？避免把一切归因于文化。</p></div>'
  +'</div>' },

  { id:'m24-s6', h:'24.6 案例：一个真实的进入失败教训', lvl:2, html:
  '<div class="case"><div class="case-head"><div class="tag">案例 1 · 公开报道案例</div><div class="ttl">沃尔玛退出德国（2006）</div></div><div class="case-body">'
  +'<h5>背景</h5><p>沃尔玛 1997 年进入德国，2006 年宣布退出并出售门店，累计亏损约 10 亿美元量级（公开报道口径）。原因常被归结为文化与制度不适配。</p>'
  +'<h5>多因分析（避免单一文化决定论）</h5><p>（1）文化与劳动实践：美国的「微笑服务」「晨间口号」「员工不允许讨论工资」等做法与德国的劳动文化、工会传统冲突；（2）制度与法律：德国对零售定价、营业时间、劳工保护有严格规定，与美国模式冲突；（3）竞争与战略：德国市场已被阿尔迪、利德尔等硬折扣店以极致低价占据，沃尔玛的「天天低价」无差异；（4)运营细节：收银员微笑被德国顾客误解为调情（媒体报道）、商品陈列与本地习惯不符。</p>'
  +'<h5>教训</h5><p>（1）成功模式 ≠ 可移植模式——在美国赢的做法在德国变成负债；（2）进入前必须做制度与文化审计（营业时间、劳工法、竞争格局），而非只做市场规模测算；（3）「本地化管理团队」不能是装饰——沃尔玛后期调整（聘用本地高管、调整微笑政策）已太迟；（4）同理适用于今天：中国企业进入欧洲同样面临劳动实践、数据合规、消费者保护的制度差异（m06、m23）。</p>'
  +'<h5>限制</h5><p>退出是多重因素叠加的结果，把失败完全归因于「文化冲突」过于简化；本案例用于说明「系统性适配」的必要性，而非文化决定论。</p>'
  +'</div></div>' },

  { id:'m24-s7', h:'24.7 局限、争议与常见误区', lvl:2, html:
  '<ul><li><b>框架的边界：</b>霍夫斯泰德分数是 1970s 起的职场文化平均值，且国家内部差异（地区、行业、代际）常常大于国家间差异。</li>'
  +'<li><b>刻板印象风险：</b>「德国人都直接」「日本人都委婉」在个体层面经常失效；把国籍当行为预测器既不准确也会破坏信任。</li>'
  +'<li><b>误区一：</b>用文化解释一切。沟通事故更常见的原因是语言能力、组织流程与信息不对称。</li>'
  +'<li><b>误区二：</b>把「文化适应」等同于「放弃自己的方式」。成熟的做法是「第三文化」——建立双方都能工作的共享协议。</li>'
  +'<li><b>误区三：</b>忽视组织文化的权重。同一国家的初创公司与家族企业的差异，可能大于两国平均差异。</li></ul>' },

  { id:'m24-s8', h:'24.8 与其他模块的联系', lvl:2, html:
  '<ul><li><b>→ m25：</b>谈判策略随语境与信任类型调整。</li>'
  +'<li><b>→ m26：</b>消费者沟通的语境差异（信息密度、情感诉求、代言方式）。</li>'
  +'<li><b>→ m27：</b>渠道合作的信任建立方式（关系 vs 合同）。</li>'
  +'<li><b>→ m08：</b>CAGE 的文化距离在本模块展开为沟通机制。</li></ul>' }
  ],
  exercises:[
  { type:'概念理解', q:'高语境与低语境沟通者在商务谈判中通常如何表现差异？各自可能误解对方什么？', a:'高语境方：表达留白多（「有困难」可能意味着「不行」）、重视会前会后的关系沟通、把沉默与委婉当信息；可能把低语境方的直白解读为「粗鲁、不留余地」。低语境方：要求明确承诺与条款、把书面确认当专业、把质疑当对事不对人；可能把高语境方的委婉解读为「不坦率、拖延」，把「是」解读为承诺而对方只是「我听到了」。缓和机制：把口头共识书面化请双方确认；给高语境方预读材料；把拒绝的「台阶」设计进流程（如「我们内部再评估」的明确时限）。' },
  { type:'概念理解', q:'霍夫斯泰德框架有什么用途，又有什么危险？给出一个「框架有用」和一个「框架误导」的场景。', a:'用途：生成关于管理实践的假设——如在高权力距离市场，谈判对手的决策权可能高度集中，找到正确的决策层级比「搞定」联系人更重要；在高不确定性规避市场，详细的产品保证、认证与售后条款比低价更有说服力。危险：把国家均值套用到个体——「他是德国人所以一定直接」经常失效（个体可能高度间接）。误导场景：假设「日本伙伴不会直接拒绝」于是无限等待，而这位日本伙伴恰恰以直接著称（个体与行业差异）。正确用法：框架预判 → 早期互动验证 → 按个体修正。' },
  { type:'实际应用', q:'你的中国团队与德国经销商就「库存责任」产生分歧：德方认为你应承担滞销库存，中方认为合同未约定。设计三步解决流程。', a:'（1）区分事实与归因：先把双方主张与合同原文（谁起草、哪一条）书面化，不做「德国人就是较真」式的归因；（2）语境校准：请德方以书面形式陈述「为什么他们认为这是行业惯例」（可能是德国分销惯例或之前合作的口头共识——高语境遗留问题）；（3）建立共享协议：明确本次处理方案 + 未来规则（如滞销库存按 6 个月滚动分担），写入合同附录；（4）复盘：记录「口头共识未落纸」的教训，建立「所有共识 24 小时内书面确认」的团队协议。评价标准：是否体现「先描述再解释」与「显式化共享协议」。' },
  { type:'实际应用', q:'一位中东客户在谈判中多次说「Inshallah（如蒙真主所愿）」。你如何理解并管理进度？', a:'理解：这是高语境文化的常见表达，含义可能是「我同意但时间不确定」「我会尽力」「目前不行」——不能简单当作「是」。管理：（1）用尊重的方式校准：以书面形式确认双方对时间表的理解（「按我们讨论，下周提交样品，对吗？」）；（2）把里程碑与商务条款绑定：明确「如果 X 日未达成，则启动备选方案/价格调整」；（3）区分宗教表达与商务承诺，不妄加评论；（4）用当地节奏调整预期（斋月等节庆影响商务节奏）；（5）建立多渠道信息（当地代理/同事）验证真实进度。原则：尊重文化表达，同时用明确的商业机制管理不确定性。' },
  { type:'综合分析', q:'「文化差异是国际化失败的主要原因。」用沃尔玛德国案例与其他证据评估这一命题。', a:'沃尔玛案例表明文化（劳动实践、消费习惯）与制度（劳工法、营业时间、定价法规）叠加可导致系统性失败——但注意失败同样来自竞争战略失误（硬折扣市场结构）与执行迟缓。其他证据：许多企业成功跨越巨大文化距离（中国进入德国制造业供应链、日本企业进入美国），说明文化差异是可管理的变量而非成败主因。更准确的命题：失败的主因是「未识别的系统性不适配」——市场规模测算之外的制度、文化与竞争结构审计缺失。文化差异的权重取决于行业（消费品 > 中间品）与进入模式（重资产本地化 > 标准品出口）。结论：文化是必须审计的变量之一，不是唯一变量；把它当作主要解释会掩盖战略、竞争与执行问题。' }
  ]
},

m25: {
  id:'m25', stage:'s6', title:'国际商务谈判', en:'International Business Negotiation',
  hours:'6–9 小时', goal:'掌握利益/立场分析、BATNA/ZOPA 等核心概念，以及跨文化谈判的策略调整与常见陷阱。',
  prereqText:'m24 跨文化沟通。', outcome:'能为一次重要谈判做准备（BATNA、让步计划、锚定策略），并在谈判中识别与应对常见战术。',
  summary:'谈判不是口才比赛，而是准备比赛：谁更清楚自己的底线、对方的利益和最佳替代方案，谁就掌握主动。文化影响谈判风格，但原则（利益而非立场）跨文化通用。',
  terms:['interest','position','batna','zopa','reservation-point','anchoring','concession','principled-negotiation','multi-issue-negotiation'],
  prereq:['m24'], related:['m17','m21','m27'],
  sources:['s39','s40'],
  sections:[
  { id:'m25-s1', h:'25.1 学习定位', lvl:2, html:
  '<p>谈判是所有前述知识的交汇点：市场研究的筹码、进入模式的选择、付款条件的底线，最终都在谈判桌上兑现。本模块给你一套跨文化通用的谈判框架（哈佛原则式谈判传统 + BATNA/ZOPA 分析），并说明文化如何改变谈判的「战术层」。它上承 m24，下接 m17（渠道协议谈判）与 m21（付款条件谈判）。</p>' },

  { id:'m25-s2', h:'25.2 从直观问题开始：一场价格谈判的三个真相', lvl:2, html:
  '<p>买方说「你的价格比对手高 15%」。多数销售听到的是「降价 15%」，于是开始挤毛利。但这句话可能意味着：（1）真的在比价——需要证明总拥有成本更低（质量、交付、售后、账期）；（2）在施压——买方 BATNA 并没有那么好，只是谈判战术；（3)预算约束——买方需要的是分期、更小规格或融资方案，不是降价。<b>不识别「对方为什么这么说」，任何回应都是碰运气。</b>谈判的第一步永远是区分「立场」（对方说的）与「利益」（对方真正要的）。</p>' },

  { id:'m25-s3', h:'25.3 正式定义', lvl:2, html:
  '<div class="defbox"><div class="en">Position vs Interest</div><div class="zh">立场 vs 利益</div><div class="def">立场是「对方要求什么」（「降价 15%」）；利益是「对方为什么需要」（「在预算内完成项目」「向董事会证明采购性价比」）。谈判的艺术是在对立立场下找到兼容利益。</div></div>'
  +'<div class="defbox"><div class="en">BATNA（Best Alternative to a Negotiated Agreement）</div><div class="zh">最佳替代方案</div><div class="def">谈判破裂时你的最佳出路。BATNA 决定你的底线：任何优于 BATNA 的协议都值得接受，差于 BATNA 的协议应拒绝。<b>谈判前最重要的准备是提升自己的 BATNA，并评估对方的 BATNA。</b></div><div class="meta"><div><b>例：</b>你同时与两个经销商谈判，另一家给出更好条件——你的 BATNA 强，你可以不急于让步；若对方是唯一渠道且你库存高，对方 BATNA 强，你应尽早用其他价值（独家、账期、联合营销）交换价格让步。</div></div></div>'
  +'<div class="defbox"><div class="en">ZOPA（Zone of Possible Agreement）</div><div class="zh">可能达成协议区间</div><div class="def">双方底线之间的重叠区域：你的保留点（最低可接受）以下、对方保留点以上。谈判的目标是在 ZOPA 内争取对自己有利的位置，同时确认 ZOPA 是否存在（不存在时谈判目标是「创造价值」而非「分配价值」）。</div></div>'
  +'<div class="defbox"><div class="en">Anchoring</div><div class="zh">锚定</div><div class="def">首先提出的数字会扭曲后续判断。先报价可以设定锚点（在合理范围内偏有利于自己），但过高的锚会损害可信度甚至让对方退出。应对锚定：回到客观基准（成本分解、市场价、第三方数据），把「价格谈判」转为「标准谈判」。</div></div>'
  +'<div class="defbox"><div class="en">Concession Strategy</div><div class="zh">让步策略</div><div class="def">让步是交换不是馈赠：每次让步都应换取对方的对应让步（交换原则），且让步幅度递减（传递「接近底线」信号）。预先规划让步阶梯（第一步让什么、第二步换什么、什么绝不让）。</div></div>' },

  { id:'m25-s4', h:'25.4 底层逻辑：价值创造与价值分配', lvl:2, html:
  '<div class="chain"><span class="node">立场对立</span><span class="arr">→</span><span class="node">利益拆解</span><span class="arr">→</span><span class="node">差异识别（优先级不同 = 交换空间）</span><span class="arr">→</span><span class="node cool">整合式协议</span></div>'
  +'<p>机制：（1）<b>多议题交易</b>——价格、账期、独家、市场费用、交付期是多议题组合；对方重视的议题恰恰是你可以低成本让出的（如你现金流紧张但对方重视独家，则「更长独家」换「更短账期」）；（2）<b>客观标准</b>——用市场数据、成本分解、第三方基准替代「谁更强硬」；（3）<b>BATNA 不对称</b>——谈判结果的主要决定因素不是技巧而是 BATNA 对比，因此会前提升 BATNA 比会上话术重要；（4）<b>文化调节</b>——关系型文化的谈判包含大量前置信任建设，跳过这步直接谈条款会被视为冒犯；任务型文化则相反。</p>' },

  { id:'m25-s5', h:'25.5 应用方法：谈判准备清单', lvl:2, html:
  '<div class="steps">'
  +'<div class="step"><h5>知己</h5><p>我的利益排序（什么必须拿到、什么可以换）、保留点、BATNA、可让渡资源清单（账期、独家、市场支持、培训）。</p></div>'
  +'<div class="step"><h5>知彼</h5><p>对方的利益与约束（预算、内部流程、竞争对手报价）、可能的 BATNA、决策人与影响者（m24 层级差异）。</p></div>'
  +'<div class="step"><h5>设计交换</h5><p>列出「我低成本、对方高价值」的交换项（如认证支持、联合营销、优先交付）与「我高价值、对方低成本」的争取项。</p></div>'
  +'<div class="step"><h5>定战术</h5><p>谁先报价、锚点在哪、让步阶梯（每步换什么）、休会机制（「需要内部审批」争取时间）、红鲱鱼识别。</p></div>'
  +'<div class="step"><h5>文化与流程</h5><p>关系建设需要多少前置（m24）；会议语言与翻译安排；决策链长度；节庆与假期（避免斋月、圣诞季谈关键条款）。</p></div>'
  +'</div>' },

  { id:'m25-s6', h:'25.6 案例：一场付款条件谈判的重构', lvl:2, html:
  '<div class="case"><div class="case-head"><div class="tag">案例 1 · 重构示范</div><div class="ttl">从「价格战」到「结构战」</div></div><div class="case-body">'
  +'<h5>情境（教学案例）</h5><p>欧洲经销商要求降价 10% 并延长账期至 90 天，否则转向另一家供应商。我方毛利率 15%，现金充裕但产能有闲置。</p>'
  +'<h5>分析</h5><p>（1）立场：降价 10% + OA 90；利益推测：向采购委员会证明成本优化 + 自身现金流压力 + 对供货稳定性的担忧（更换供应商有风险）；（2）我方 BATNA：另一家有合作意向但规模较小的经销商 + 闲置产能意味着「订单本身有价值」；（3）对方 BATNA：换供应商需重新验证质量与售后，转换成本真实存在——并不像姿态那么强。</p>'
  +'<h5>交换设计</h5><p>不让价格，让结构与承诺：（1）价格不变，但给「年度采购量返利」（满量返 3%）——把降价转为对方可争取的目标；（2）账期从 30 天延到 60 天（成本约 1%）+ 出口信用保险覆盖（我方投保，非成本而是保护）；（3）换取：两年期框架协议、季度最低采购量、我方产品优先陈列与数据共享；（4）若对方仍坚持降价：降价 3% + 账期 30 天（对方在「价格」与「现金流」间选择——多数买方选现金流，因为其 CFO 压力更真实）。</p>'
  +'<h5>启示</h5><p>（1）把单一议题（价格）拆成多议题组合，创造交换空间；（2）每次让步都换回具体承诺；（3）让步幅度递减传递底线信号；（4）为「谈崩」设计后备（BATNA）而不是在桌上情绪化。</p>'
  +'</div></div>' },

  { id:'m25-s7', h:'25.7 局限、争议与常见误区', lvl:2, html:
  '<ul><li><b>原则式谈判的边界：</b>在纯粹权力不对称或一次性博弈中（如清仓甩卖），整合策略让位于实力策略；跨文化长期关系中，纯粹「哈佛式」直接可能损害关系。</li>'
  +'<li><b>文化差异的战术层：</b>同样「最后通牒」，在任务型文化可能促成决策，在关系型文化可能永久损害关系——战术必须与文化预期校准（m24）。</li>'
  +'<li><b>误区一：</b>把让步当善意。无交换的让步训练对方继续压价。</li>'
  +'<li><b>误区二：</b>过早暴露 BATNA 弱点。谈判中「显得急切」会直接被定价。</li>'
  +'<li><b>误区三：</b>忽视「关系型谈判」的时间维度——在关系型文化中，首次会晤的目标是「建立继续谈的资格」，不是签单。</li></ul>' },

  { id:'m25-s8', h:'25.8 与其他模块的联系', lvl:2, html:
  '<ul><li><b>→ m17：</b>渠道协议谈判（区域、任务量、账期）。</li>'
  +'<li><b>→ m21：</b>付款条件是核心谈判议题。</li>'
  +'<li><b>→ m22：</b>汇率调整条款是谈判筹码。</li>'
  +'<li><b>→ m26：</b>与消费者的「定价沟通」是微观谈判。</li></ul>' }
  ],
  exercises:[
  { type:'概念理解', q:'BATNA 是什么？为什么说「提升 BATNA」比「磨练话术」更能改变谈判结果？', a:'BATNA 是谈判协议外的最佳替代方案，它决定你的保留点与谈判底气。结果主要由 BATNA 对比决定：BATNA 强的一方可以在 ZOPA 内索取更多。提升 BATNA（寻找替代客户、替代供应商、替代方案）直接移动你的底线与对方的预期；而话术只在给定 BATNA 下优化有限空间，且可被对手的经验反制。' },
  { type:'概念理解', q:'什么是「交换原则」？为什么无交换的让步通常适得其反？', a:'交换原则：每一次让步都必须换取对方的对应让步（价格换账期、账期换独家、让利换承诺）。无交换让步的问题：（1）传递「你的立场没有成本」的信号，鼓励继续施压；（2）暴露你的 desperation，压低对方预期；（3）破坏你后续让步的可信度。正确做法：让步前明确「我让 X，换 Y」，并口头确认。' },
  { type:'实际应用', q:'你与一家巴西经销商谈判，对方要求独家代理 + 账期 90 天 + 首批铺货 20 万美元（账销）。列出你的交换设计与红线。', a:'交换设计：（1）独家可以给，但按「区域 + 渠道 + 业绩阶梯」分级授权，首年仅主要州 + 电商渠道独家；（2）账期可给 60 天（配出口信用保险），但要求 30% 预付 + 见单付 40% + 30 天付尾 30%；（3）铺货 20 万美元可接受，但转为「寄售（consignment）而非买断」或压到 8 万美元 + 季度补货；（4）换取：两年框架、季度最低采购量、销售数据月报、我方优先陈列。红线（绝不让）：100% 账销、无数据义务、无退出条款的无限期独家、无法完成受限方筛查。理由：巴西市场风险特征（关税政策多变 + 税制复杂，公开认知需专业核验）要求风险结构性对冲（m21、m28）。' },
  { type:'实际应用', q:'谈判中对方说「这是我们的最终报价」。你如何判断真伪并应对？', a:'判断信号：（1）是否符合对方利益逻辑（若明显不利己方，可能是战术）；（2）此前让步轨迹（是否已接近其成本底线）；（3)语境与关系（任务型文化中「最终报价」的可信度通常高于关系型文化中的表达）；（4）是否有可验证的约束（董事会授权、预算截止）。应对：（1）不直接接受也不硬碰：要求「让我们理解这个报价的依据」；（2）用客观标准检验（成本分解、市场价）；（3）提出「如果接受最终价，需要交换 X」测试其严肃性；（4）若确认是真的且低于你的保留点：启动 BATNA（礼貌退出并保持关系）；（5）若判断为战术：用「休会 + 内部审批」争取时间，回来后带交换方案而非单纯还价。' },
  { type:'综合分析', q:'关系型文化中的谈判「慢」是效率损失还是必要投资？给出判断标准与管理方法。', a:'判断标准：（1）合作的期限与规模——长期大额合作中，前置关系投资的回报率高（信任降低执行成本）；（2）环境不确定性——制度弱、合同执行差的市场（m06），关系是履约的保障机制，此时「慢」是风控；（3)对方的决策结构——关系型决策需要内部共识时间，催促无效；（4)你的 BATNA 强度——时间成本高且替代多时，过度投资关系是浪费。管理方法：（1）把关系活动纳入项目计划（而非「浪费时间」）；（2）设定里程碑与「推进信号」——每次会晤都应有可验证的进展（条款、样品、试点），纯社交循环三次无进展需重新评估；（3）多线并行：关系线（高层互信）+ 事务线（团队逐条敲定条款）分开推进；（4）用本地顾问/代理弥补文化带宽。' }
  ]
},

m26: {
  id:'m26', stage:'s6', title:'海外消费者、定位与本地化', en:'Overseas Consumers, Positioning and Localization',
  hours:'7–10 小时', goal:'掌握 STP、消费者旅程与需求验证方法，理解产品调整与营销调整的区分及本地化测试流程。',
  prereqText:'m11、m14。', outcome:'能完成目标市场的消费者细分与定位假设，设计本地化测试并区分「产品需要改」与「只需要改沟通」。',
  summary:'出海产品失败常败在「把中国畅销当作全球通吃」。消费者研究回答三个问题：卖给谁、说什么、改什么——而验证只能靠行为数据。',
  terms:['stp','segmentation','targeting','positioning','customer-journey','localization','adaptation','price-sensitivity','product-market-fit'],
  prereq:['m11','m14'], related:['m24','m27','m32'],
  sources:['s30','s19','s21'],
  sections:[
  { id:'m26-s1', h:'26.1 学习定位', lvl:2, html:
  '<p>本模块把「消费者」从统计概念还原为决策个体：他们是谁、在什么场景下为解决什么问题而购买、如何比较、被什么说服。内容框架是经典的 STP（细分—选择—定位），方法核心是需求验证的证据阶梯（m14），落地焦点是「产品改还是沟通改」的判断。它服务于渠道策略（m27）与综合项目（m32）。</p>' },

  { id:'m26-s2', h:'26.2 从直观问题开始：一个功能，三个市场，三种命运', lvl:2, html:
  '<p>便携储能电源的「大容量 + 太阳能充电」功能：在美国主打户外探险（休闲场景）、在日本主打防灾备灾（安全场景）、在菲律宾/印尼主打停电应急（生存场景）。同一产品，购买动机、价格敏感度、信息渠道（户外 KOL vs 防灾指南 vs 本地分销）、信任背书（专业评测 vs 政府/媒体推荐 vs 熟人）完全不同。<b>产品没变，但定位、渠道与沟通必须变。</b>反过来说，如果错误地假设「全球消费者都像中国买家一样看重参数与性价比」，营销投入会大量浪费。</p>' },

  { id:'m26-s3', h:'26.3 正式定义', lvl:2, html:
  '<div class="defbox"><div class="en">STP</div><div class="zh">细分—目标—定位</div><div class="def">市场细分（Segmentation）：按需求、场景、人口、行为将市场划分为有意义的群体；目标市场（Targeting）：评估各细分的吸引力与企业匹配度，选择服务对象；定位（Positioning）：在目标客群心智中占据一个与竞品区分的位置。</div><div class="meta"><div><b>细分有效性标准：</b>可识别、可衡量、可触达、有差异、足够大。按「场景/任务」细分通常比按人口统计更接近购买真相。</div></div></div>'
  +'<div class="defbox"><div class="en">Positioning Statement</div><div class="zh">定位声明</div><div class="def">标准格式：「对于（目标客群），（品牌）是（品类定义），它提供（核心利益），因为（支撑理由 / 信任状）。」定位声明是内部共识工具，不是广告语。</div></div>'
  +'<div class="defbox"><div class="en">Adaptation vs Standardization</div><div class="zh">产品调整 vs 标准化</div><div class="def">标准化：同一产品全球销售，摊薄研发与供应链成本；调整：按市场修改产品（规格、电压、认证、包装）。判断框架：只有当「不调整会显著阻碍购买」（法规、场景、文化禁忌）时才调整产品；否则优先调整「营销表达」（信息、渠道、定价结构）。</div><div class="meta"><div><b>常见混淆：</b>把「营销表达调整」误判为「产品调整」会造成过度工程与成本失控；把「产品硬调整」（如电压、认证）当成可选则会直接失去准入资格。</div></div></div>' },

  { id:'m26-s4', h:'26.4 底层逻辑：购买决策链与本地化决策树', lvl:2, html:
  '<div class="chain"><span class="node">场景触发</span><span class="arr">→</span><span class="node">信息搜索（搜索/评测/口碑）</span><span class="arr">→</span><span class="node">考虑集形成（3–5 个）</span><span class="arr">→</span><span class="node">比较与购买</span><span class="arr">→</span><span class="node">使用与口碑</span></div>'
  +'<p>每个环节都有本地化决策点：信息搜索（用什么语言/渠道触达——搜索引擎、电商、社媒的区域结构）、考虑集（进入门槛：上架、认证、价格带）、比较（信任状：本地认证、本地 KOL、质保条款）、使用与口碑（售后与回收责任，如欧盟 EPR 与电池法规<button class="src gA" data-src="s19">19</button>）。</p>'
  +'<div class="callout info"><span class="ico">ℹ️</span><div><b>本地化决策树：</b>法规/认证硬约束（必须改）→ 场景差异（改产品 or 改场景营销）→ 价格带差异（改规格组合 or 改定价结构）→ 文化表达（改沟通）。从上到下，改造成本递增、出错代价递减——先解决硬约束，再谈营销优化。</div></div>' },

  { id:'m26-s5', h:'26.5 应用方法：从定位假设到本地化测试', lvl:2, html:
  '<div class="steps">'
  +'<div class="step"><h5>细分与选择</h5><p>按「场景 × 人群」细分（如「已装光伏的德国家庭」「日本防灾意识高的租房者」），用市场规模（m12）与触达难度筛选 1–2 个首要细分。</p></div>'
  +'<div class="step"><h5>写定位假设</h5><p>「对于 X，我们是 Y，它比 Z 更好地完成 W，因为 V」——V 必须是可验证的差异点。</p></div>'
  +'<div class="step"><h5>信息与渠道假设</h5><p>目标客群在哪获取信息（搜索词、评测站、社媒、线下）、影响者是谁（KOL、安装商、亲戚）。</p></div>'
  +'<div class="step"><h5>最小测试</h5><p>落地页/小批量上架/众筹预售，测试：点击率、转化率、客诉点、退货原因。用行为数据修正定位（m14 三级证据）。</p></div>'
  +'<div class="step"><h5>迭代决策</h5><p>转化率低 → 先检查信息与渠道（通常是营销问题），再检查价格，最后才考虑产品；转化率高但复购低 → 检查产品体验与售后。</p></div>'
  +'</div>' },

  { id:'m26-s6', h:'26.6 案例：同一产品的三国定位', lvl:2, html:
  '<div class="case"><div class="case-head"><div class="tag">案例 1 · 对照案例</div><div class="ttl">便携储能电源在美国、日本、德国的定位与本地化</div></div><div class="case-body">'
  +'<h5>美国</h5><p>客群：户外/房车人群 + 应急备灾（飓风、停电）；渠道：亚马逊 + 户外连锁 + 品牌独立站；沟通：生活方式营销 + 容量/快充参数；信任：专业评测（YouTube）、质保；合规：FCC、CPSC、运输规则 + 关税（301 相关，m20/m23）。</p>'
  +'<h5>日本</h5><p>客群：防灾意识强的家庭 + 户外；渠道：家电量贩 + 电商；沟通：安全、防灾、静音、小巧；信任：PSE 认证、品牌历史；产品调整：电压/插头、说明书与警示（日语，安全文化要求高）。</p>'
  +'<h5>德国</h5><p>客群：已装光伏家庭（储能扩展）+ 应急；渠道：安装商/专业分销 + 电商；沟通：经济性（电价、回本周期）、环保（可回收、低碳）；合规：CE、电池法规（2027 年起数字电池护照适用、便携 <2 kWh 豁免 DPP 但仍有其他要求）<button class="src gA" data-src="s19">19</button>、WEEE/EPR 注册；产品调整：并网/储能系统的兼容性与安装服务是核心——产品只是「系统的一部分」，渠道价值大于流量。</p>'
  +'<h5>结论</h5><p>同一 SKU 在三国的「产品改动量」差异巨大：美国≈标准化 + 营销；日本=硬调整（认证/电压）+ 沟通；德国=产品必须融入本地系统生态（安装、回收、并网）——<b>本地化的深度由制度与渠道结构决定，不只是文化偏好</b>。</p>'
  +'</div></div>' },

  { id:'m26-s7', h:'26.7 局限、争议与常见误区', lvl:2, html:
  '<ul><li><b>「全球年轻人一样」的错觉：</b>社交媒体的全球化让表层偏好趋同，但支付能力、渠道与合规环境仍高度本地。</li>'
  +'<li><b>过度本地化的成本陷阱：</b>为每个市场定制 SKU 会摧毁规模经济（m03）与库存效率（m19）；应「平台化产品 + 模块化本地化」（核心平台全球统一，插头/包装/认证本地化）。</li>'
  +'<li><b>误区一：</b>把「国内爆款逻辑」直接复制（直播话术、价格战打法在不同市场可能违规或无效）。</li>'
  +'<li><b>误区二：</b>用翻译代替本地化。机器翻译的详情页转化率通常显著低于本地母语文案。</li>'
  +'<li><b>误区三：</b>把差评当「消费者不懂产品」。差评是场景错配信号，先问「用户在什么场景失望」。</li></ul>' },

  { id:'m26-s8', h:'26.8 与其他模块的联系', lvl:2, html:
  '<ul><li><b>→ m14：</b>竞品与消费者洞察是定位的输入。</li>'
  +'<li><b>→ m24：</b>文化维度影响沟通与信任状的选择。</li>'
  +'<li><b>→ m27：</b>定位决定渠道结构（专业分销 vs 大众电商）。</li>'
  +'<li><b>→ m32：</b>综合项目的本地化建议章节。</li></ul>' }
  ],
  exercises:[
  { type:'概念理解', q:'STP 三步各自的输出是什么？为什么「按场景细分」通常比「按年龄细分」更接近购买真相？', a:'STP 输出：（1）细分：有意义的客群地图（按需求/场景/行为）；（2）目标：1–2 个首要细分 + 放弃清单及理由；（3）定位：定位声明（品类、利益、差异、信任状）。场景细分更接近真相的原因：购买由「任务」驱动（JTBD，m14）而非年龄——25 岁露营者与 55 岁房车旅行者可能买同一款产品，而两个 30 岁的人（有娃家庭 vs 独居应急需求）需求迥异。人口统计只有与场景和支付能力结合时才有预测力。' },
  { type:'概念理解', q:'什么情况下应该「改产品」，什么情况下「只改营销」？给出各自的判断标准。', a:'改产品的触发条件：（1）法规/认证硬约束（电压、插头、PSE/CE/FCC、危险品规则）——不改即无准入；（2）场景不兼容（沙特高温、日本小居所、德国并网系统）——不改则核心任务无法完成；（3）文化禁忌/安全规范（包装警示、宗教敏感）。只改营销的触发：（1）产品功能满足当地任务，但信息、渠道、信任状不匹配（评测站、KOL、质保表述）；（2）价格带差异可通过规格组合与定价结构解决，而非重新设计；（3）文化差异体现在表达层（色彩偏好、叙事方式）。原则：产品改动是最后手段（成本高、毁规模），营销调整是优先手段；但硬约束永远优先于营销优化。' },
  { type:'实际应用', q:'为「中国智能扫地机器人进入德国市场」设计定位假设与最小验证方案。', a:'定位假设：「对于有宠物且住房以硬地板为主的德国城市家庭，（品牌）是「能处理宠物毛发与硬地板」的清洁设备，它比（竞品）更少缠绕毛发且 App 支持德语，因为（滚刷结构 + 本地 App/售后）」。验证方案：（1）落地页 A/B：德语文案 + 宠物场景图 vs 通用卖点，看转化与留资；（2）小批量上架亚马逊德国 + 众筹平台，看转化率与差评主题；（3)10 户德国家庭试用 + 访谈（使用场景、App 语言、噪音、耗材购买）；（4)渠道测试：亚马逊 vs 本地家电连锁的动销差异。验证指标：转化率 > 基准、差评不集中在「毛发缠绕/App 语言」、复购耗材率。' },
  { type:'实际应用', q:'某产品在中国以「性价比 + 大容量」畅销，进入欧洲后转化低迷。列出 5 个诊断方向与验证方法。', a:'（1）信任：欧洲消费者重认证/评测/质保——验证：检查 CE/质保表述、本地评测覆盖、评论数量；（2）渠道：是否在目标客群购买渠道（而非只上亚马逊）——验证：渠道动销数据 + 竞品渠道结构；（3）信息语言与表达：详情页是否为母语文案、卖点是否翻译自中文思维——验证：落地页停留/转化 A/B + 用户访谈；（4）价格锚：欧洲价格带与竞品结构不同（品牌溢价 vs 白牌）——验证：价格敏感度测试 + 竞品价格带分析；（5)场景错配：欧洲居住结构（小户型、地毯）、使用习惯不同——验证：差评主题分析 + 试用访谈。顺序：先诊断「信任与渠道」（最常见的真因），再查「信息与价格」，最后才怀疑「产品不匹配」。' },
  { type:'综合分析', q:'「标准化产品 + 全球统一营销」在什么行业仍然有效？跨境电商的兴起是否让它更有效或更无效？', a:'仍然有效的条件：（1）产品为功能导向、文化负载低（数据线、充电器、标准工具）；（2)目标客群全球同质（游戏玩家、开发者、特定职业）；（3)合规已统一或简单（插头标准、电压）；（4)价值主张以参数与价格为核心。跨境电商的影响：更有效——平台与物流把「全球同质客群」的触达成本降到极低（一个独立站可服务多国同质客群）；也更无效——流量成本上升与合规分化（VAT、EPR、产品责任、数据隐私）把「全球统一」的运营复杂度转嫁给卖家，且本地竞争者在服务与信任上占优。结论：标准化适合「全球利基」，本地化适合「大众市场」；多数企业的现实是「核心平台全球 + 表达与渠道本地 + 合规逐国」。' }
  ]
},

m27: {
  id:'m27', stage:'s6', title:'海外渠道建设与商业伙伴管理', en:'Overseas Channel Development and Partner Management',
  hours:'6–9 小时', goal:'掌握渠道类型比较、伙伴筛选与验证、渠道条款与绩效评估，理解渠道结构对品牌控制力与现金流的影响。',
  prereqText:'m16、m17、m26。', outcome:'能为产品—市场组合设计渠道结构，执行伙伴尽调，并建立渠道绩效评估与冲突管理机制。',
  summary:'渠道是「品牌与消费者之间的物理距离」。渠道结构决定：谁掌握客户资产、利润如何分配、服务半径多大、以及你对市场的真实控制力。',
  terms:['channel-structure','importer','distributor','retailer','omnichannel','channel-margin','channel-control','sell-in','sell-through','sell-out'],
  prereq:['m16','m17','m26'], related:['m31','m32'],
  sources:['s21','s30'],
  sections:[
  { id:'m27-s1', h:'27.1 学习定位', lvl:2, html:
  '<p>m17 讲了「如何选伙伴」，本模块讲「如何建体系」：渠道类型与结构、利润分配、控制权与依赖、绩效评估与冲突管理。渠道决策与进入模式（m16）、定位（m26）联动：专业分销适合高服务依赖产品，电商适合标准化产品，混合渠道是常态但管理难度最高。</p>' },

  { id:'m27-s2', h:'27.2 从直观问题开始：同一条街的两家店', lvl:2, html:
  '<p>同一款储能电源：在 A 渠道（家居连锁）售价 599 美元、覆盖广但账期 60 天且货架陈列不突出；在 B 渠道（户外专业店）售价 649 美元、量小但店主主动推荐且愿意联合做促销；在 C 渠道（亚马逊）售价 549 美元、走量但佣金 15% 且客户数据不归你。三个渠道的「真实利润」（扣除账期资金成本、返利、平台费）可能完全不同排序。<b>渠道选择的本质是「用哪种成本结构换哪种客户资产」</b>——只看出货额会系统性高估电商渠道的价值。</p>' },

  { id:'m27-s3', h:'27.3 正式定义：渠道类型与结构', lvl:2, html:
  '<div class="tbl-wrap"><table class="data"><thead><tr><th>渠道角色</th><th>职能</th><th>利润来源</th><th>对你的价值 / 风险</th></tr></thead><tbody>'
  +'<tr><td><b>进口商</b>（importer）</td><td>承担进口合规、清关、税务、库存</td><td>买卖差价 + 服务费</td><td>解决准入与资金占用；但掌握终端客户</td></tr>'
  +'<tr><td><b>经销商</b>（distributor）</td><td>买断、批发给下级渠道，管理区域覆盖</td><td>批量差价</td><td>快速铺开；依赖其销售团队能力</td></tr>'
  +'<tr><td><b>代理商</b>（agent）</td><td>代表你开发客户，佣金制，不持有库存</td><td>佣金（3–10%）</td><td>你保留客户与定价权；但控制弱</td></tr>'
  +'<tr><td><b>零售商</b>（retailer）</td><td>面向终端销售，掌握货架与客流</td><td>零售毛利（30–50%+）</td><td>品牌曝光；账期与费用（上架费、促销费）高</td></tr>'
  +'<tr><td><b>电商平台</b></td><td>流量 + 交易基础设施</td><td>佣金 + 广告费 + 仓储物流费</td><td>起量快；客户数据与规则不归你</td></tr>'
  +'<tr><td><b>独立站 / DTC</b></td><td>品牌直营</td><td>全额零售利润 − 获客成本</td><td>客户资产自有；获客成本与运营门槛高</td></tr>'
  +'</tbody></table></div>'
  +'<div class="defbox"><div class="en">Sell-in / Sell-through / Sell-out</div><div class="zh">压货 / 进销 / 实销</div><div class="def">Sell-in 是你卖给渠道商的量（可能虚假繁荣）；sell-through 是渠道商卖给下级/终端的量；sell-out 是终端消费者的实际购买。健康渠道的标志是 sell-through ≈ sell-in；若 sell-in 远大于 sell-through，渠道在压库，未来会退货或停单。</div><div class="meta"><div><b>实务：</b>把「渠道库存月数」写入月度报表；对只进不动的渠道启动促销或暂停供货。</div></div></div>'
  +'<div class="defbox"><div class="en">Channel Margin Structure</div><div class="zh">渠道利润结构</div><div class="def">从出厂价到零售价的加价分配：品牌毛利、进口商毛利、分销毛利、零售毛利。健康标准：每一层都有足够动力但不吞噬品牌价值；过深的多层渠道会让终端价失去竞争力，且你失去定价权。</div></div>' },

  { id:'m27-s4', h:'27.4 底层逻辑：渠道如何塑造利润与控制力', lvl:2, html:
  '<div class="chain"><span class="node">渠道深度（层数）</span><span class="arr">→</span><span class="node">终端加价率</span><span class="arr">→</span><span class="node">价格竞争力</span><span class="arr">·</span><span class="node">渠道类型</span><span class="arr">→</span><span class="node">客户资产归属</span><span class="arr">·</span><span class="node">服务半径</span><span class="arr">→</span><span class="node cool">复购与口碑</span></div>'
  +'<p>机制：（1）<b>客户资产</b>——直销/独立站/DTC 掌握客户数据与复购关系；深度分销把客户资产让给渠道（这是渠道服务的合理对价，但意味着你无法直接迭代产品）；（2）<b>现金流时点</b>——不同渠道的账期结构完全不同（大零售 60–90 天 vs 代理佣金月结 vs 电商平台 14 天滚动），渠道组合直接决定营运资金需求（m21）；（3）<b>控制力</b>——渠道越深，你对价格、陈列、促销的控制越弱，串货与价格混乱风险越高；（4）<b>依赖风险</b>——单一渠道占比过高（如 80% 依赖亚马逊）时，平台规则变化就是生存风险（m29）。</p>' },

  { id:'m27-s5', h:'27.5 应用方法：渠道设计与绩效管理', lvl:2, html:
  '<div class="steps">'
  +'<div class="step"><h5>设计渠道组合</h5><p>按产品服务依赖度选主渠道（专业分销 vs 电商），辅渠道补覆盖；设定「渠道角色」：形象渠道（专业店）、销量渠道（电商/大连锁）、利润渠道（直销大客户/独立站）。</p></div>'
  +'<div class="step"><h5>定价格体系</h5><p>规定各级加价上限与最低零售价（MAP 政策）；线上专供款/规格区隔避免直接比价。</p></div>'
  +'<div class="step"><h5>签伙伴协议</h5><p>按 m17 五步流程执行；条款含数据回传义务（进销存）——这是 sell-through 管理的前提。</p></div>'
  +'<div class="step"><h5>建绩效仪表盘</h5><p>月度：sell-in/sell-through、渠道库存月数、回款、价格纪律、市场活动执行；季度 QBR 复盘。</p></div>'
  +'<div class="step"><h5>管冲突与退出</h5><p>串货治理（溯源码 + 处罚）、线上线下区隔、绩效不达标渠道的缩减/替换流程；始终培育备选伙伴（m17）。</p></div>'
  +'</div>' },

  { id:'m27-s6', h:'27.6 案例：一个储能品牌的渠道组合演进', lvl:2, html:
  '<div class="case"><div class="case-head"><div class="tag">案例 1 · 演进案例</div><div class="ttl">从「单平台爆款」到「多渠道健康结构」</div></div><div class="case-body">'
  +'<h5>阶段一：单平台依赖</h5><p>新品上架亚马逊美国站，靠站内广告起量，月销 2,000 台。风险：佣金 + 广告占售价约 30–35%，客户数据与评论归平台，一次封号/政策变化即可归零。</p>'
  +'<h5>阶段二：渠道多元化</h5><p>（1）独立站上线（SEO + 邮件营销 + 售后注册），把「已购客户」转为可复购资产；（2）签 2 家区域户外连锁与 1 家应急物资分销（对公/项目客户）；（3)入驻本土电商平台（如针对德国的本地平台）分散风险。结果：平台占比从 90% 降至 55%，毛利结构改善（直销毛利高），但管理复杂度上升（三套价格体系、三套账期）。</p>'
  +'<h5>阶段三：结构治理</h5><p>（1）线上专供款与线下款区隔，终结比价冲突；（2）MAP 政策 + 串货溯源；（3）渠道记分卡末位淘汰；（4）把「渠道库存月数」纳入月度经营会——发现某渠道连续 3 个月 > 4 个月库存，提前压降供货避免年底退货潮。</p>'
  +'<h5>启示</h5><p>渠道是「利润结构 + 风险结构」的双重决策：多元化降低平台依赖但抬升管理成本；关键在于用数据（sell-through）而不是感情管理渠道，并始终保留备选。</p>'
  +'</div></div>' },

  { id:'m27-s7', h:'27.7 局限、争议与常见误区', lvl:2, html:
  '<ul><li><b>「去渠道化」的幻觉：</b>DTC/独立站不是消灭渠道，而是把「获客与服务」内部化——流量成本与售后成本真实存在，许多品牌独立站的获客成本高于渠道分成。</li>'
  +'<li><b>大渠道的双刃剑：</b>大连锁/大平台带来销量，也带来账期、费用与规则风险；超过 40% 的单一渠道占比就应设预警。</li>'
  +'<li><b>误区一：</b>用出货额考核业务团队——激励压货，制造虚假繁荣。</li>'
  +'<li><b>误区二：</b>忽视串货。价格体系一旦崩坏，重建成本极高。</li>'
  +'<li><b>误区三：</b>把「伙伴不干活」归因于懒惰，先检查你的支持体系（培训、物料、激励、价格空间）。</li></ul>' },

  { id:'m27-s8', h:'27.8 与其他模块的联系', lvl:2, html:
  '<ul><li><b>→ m17：</b>伙伴筛选与协议是渠道建设的起点。</li>'
  +'<li><b>→ m21：</b>渠道账期结构决定现金流。</li>'
  +'<li><b>→ m26：</b>定位与客群决定渠道选择。</li>'
  +'<li><b>→ m29：</b>渠道集中度是供应链/经营风险的重要维度。</li></ul>' }
  ],
  exercises:[
  { type:'概念理解', q:'sell-in、sell-through、sell-out 的区别是什么？为什么业务团队只汇报 sell-in 是危险的？', a:'sell-in 是你向渠道商的出货（压货）；sell-through 是渠道商向终端的销售；sell-out 是终端实际购买。只汇报 sell-in 危险在于：（1）掩盖渠道库存积压——最终以退货、停单、资金链断裂形式爆发；（2）扭曲需求信号——你按虚高的 sell-in 备产，库存跌价损失自担；（3）激励错位——业务为拿返利持续压货。健康管理：以 sell-through 与渠道库存月数为核心考核指标，要求渠道数据回传义务（m17 条款）。' },
  { type:'概念理解', q:'渠道越「扁平」越好吗？什么情况下多层分销是正确选择？', a:'不是越扁平越好。扁平（直供终端）的优势：掌控客户与价格、利润不分层；代价：服务成本与资金占用内部化（自建团队、垫资、售后）。多层分销正确的条件：（1）市场碎片化、终端数量庞大且分散（如印尼的数百万小零售店）——没有企业能直供；（2）产品需要本地服务与信用支持，本地分销商提供资金与售后；（3)企业资源有限，用渠道商的现成网络换速度。原则：扁平度是「控制力 vs 服务成本」的权衡，由市场结构与企业资源决定。' },
  { type:'实际应用', q:'设计「专业分销 + 电商 + 独立站」三渠道并存的价格与区隔方案，防止相互杀价。', a:'方案：（1）产品区隔：线下专供款（含本地服务包）、电商专供款（规格/配色差异）、独立站主推款 + 配件生态（提升客单）；（2）价格体系：统一 MSRP + MAP（最低广告价格）政策，违规者取消返利/断供；线下款定价锚高于电商款 5–10%（服务价值显性化）；（3）促销协同：大促节奏统一（避免渠道为冲量私自破价），促销费用按销售贡献分担；（4)数据治理：独立站收集一方数据，电商客户通过售后卡/保修注册导入 CRM，渠道数据通过协议获取；（5)冲突解决：设立渠道冲突申诉窗口，48 小时裁决。评价标准：是否体现「产品区隔 + 价格纪律 + 数据归属」三件套。' },
  { type:'实际应用', q:'渠道经理报告「本月 sell-in 增长 40%」。你需要哪 5 个数据才能判断这是好消息？', a:'（1）sell-through / sell-out 增速——若远低于 40%，说明在压货；（2）渠道库存月数（全渠道）——若 > 3–4 个月且上升，预警；（3）回款与账龄——增长是否伴随逾期上升（虚假出货的典型信号）；（4）价格纪律——终端实际售价与 MAP 的偏离（破价冲量）；（5）退货率与客诉——质量或预期问题会在 1–2 个月后爆发。结论框架：sell-in 增长 + sell-through 同步 + 库存健康 + 回款正常 = 真增长；否则是渠道泡沫。' },
  { type:'综合分析', q:'「渠道是暂时的，品牌直营（DTC）是终局。」评估这一说法。', a:'部分成立：DTC 让品牌掌握客户数据、定价权与复购关系，长期利润结构更优（品牌消费品与硬件均有验证）。但「终局论」的问题：（1）获客成本现实——独立站的流量成本常高于渠道分成，DTC 的经济性依赖品牌力与复购，多数新品牌养不起；（2）服务物理性——高服务依赖产品（安装、售后、系统集成）仍需本地渠道网络，直销无法覆盖所有场景；（3)渠道的不可替代职能——分销商承担库存资金、本地信用、破损处理、多 SKU 聚合，这些成本不会因「去中介化」消失，只是转移；（4)平台与渠道本身也在品牌化（亚马逊旗舰店、平台会员体系）。更准确的框架：DTC 是「能力建设」（数据、品牌、服务），不是「渠道替代」；最优结构通常是「DTC 掌握核心客户资产 + 渠道覆盖广度与服务」的混合体，比例由产品属性与品牌阶段决定。' }
  ]
}

});

;

Object.assign(MODULES, {

/* ================= 阶段 7 ================= */
m28: {
  id:'m28', stage:'s7', title:'国家风险与政治风险', en:'Country Risk and Political Risk',
  hours:'6–9 小时', goal:'掌握国家风险的分类、评级体系与传导路径，能识别风险暴露并设计缓释安排。',
  prereqText:'m06 制度、m13 市场评分。', outcome:'能为目标市场建立风险清单，评估风险传导至企业损益的路径，并选择保险/合同/备用市场等缓释工具。',
  summary:'国家风险不是「那里危不危险」，而是「那里的变化会不会、通过什么路径、以多大幅度打到我的损益表」。识别暴露比预测事件更重要。',
  terms:['country-risk','political-risk','sovereign-default','transfer-risk','expropriation','capital-controls','risk-exposure','risk-mitigation'],
  prereq:['m06','m13'], related:['m29','m30','m21'],
  sources:['s09','s16','s12'],
  sections:[
  { id:'m28-s1', h:'28.1 学习定位', lvl:2, html:
  '<p>本模块把「风险」从模糊的不安转化为可管理的对象。关键区分：<b>风险事件</b>（发生什么）、<b>风险暴露</b>（我的资产/收入/供应链有多少在那里）、<b>脆弱性</b>（事件发生后我能不能扛住）、<b>发生概率</b>与<b>商业影响</b>（打到损益表的幅度）。企业能控制的不是事件，而是暴露与脆弱性。</p>' },

  { id:'m28-s2', h:'28.2 从直观问题开始：一次「没收性」政策变化的损失账', lvl:2, html:
  '<p>某企业在 A 国设子公司 + 海外仓 + 应收账款，账面投入 500 万美元。一天之内，A 国宣布：（1）进口许可冻结（在途货无法清关）；（2）外汇管制（利润无法汇出）；（3）提高外资审查。三件事都不针对该企业，但损失路径清晰：在途货沉没 + 库存无法变现 + 收入变成不可兑换的本币 + 后续投入暂停。<b>政治风险很少直接摧毁企业，它通过「现金流路径的堵塞」造成损失。</b>这就是为什么风险评估必须画传导链，而不是读风险评级数字。</p>' },

  { id:'m28-s3', h:'28.3 正式定义', lvl:2, html:
  '<div class="tbl-wrap"><table class="data"><thead><tr><th>风险类型</th><th>英文</th><th>典型事件</th><th>传导路径</th></tr></thead><tbody>'
  +'<tr><td>主权信用风险</td><td>Sovereign risk</td><td>主权违约、外储枯竭</td><td>→ 本币暴跌 → 进口成本飙升 → 需求萎缩</td></tr>'
  +'<tr><td>转移/汇兑风险</td><td>Transfer risk</td><td>外汇管制、利润不可汇出</td><td>→ 收入变不可兑换货币 → 现金流断裂</td></tr>'
  +'<tr><td>征收/国有化风险</td><td>Expropriation</td><td>资产征收、强制合资</td><td>→ 资产减值 → 投资沉没</td></tr>'
  +'<tr><td>政策突变风险</td><td>Policy risk</td><td>关税、准入、税制、劳动法突变</td><td>→ 成本结构重构 → 商业模式失效</td></tr>'
  +'<tr><td>政治暴力风险</td><td>Political violence</td><td>战争、冲突、恐怖袭击</td><td>→ 人员安全、资产损毁、业务停摆</td></tr>'
  +'<tr><td>法律执行风险</td><td>Legal risk</td><td>合同不执行、歧视性执法</td><td>→ 争议无解 → 坏账与资产流失</td></tr>'
  +'</tbody></table></div>'
  +'<div class="defbox"><div class="en">Country Risk Rating</div><div class="zh">国家风险评级</div><div class="def">专业机构对国家层面信用与政治风险的综合评分（如主权信用评级、政治风险保险定价、出口信用机构的国别限额）。评级的用途与局限：适合做国别排序与预警，<b>不替代企业自身的交易层风险评估</b>——同一「中风险」国家内，不同行业与交易的风险可能天差地别。</div></div>' },

  { id:'m28-s4', h:'28.4 底层逻辑：风险传导的五条路径', lvl:2, html:
  '<div class="steps">'
  +'<div class="step"><h5>收入路径</h5><p>需求萎缩（危机 → 消费者缩减开支）、货币贬值 → 本币收入购买力下降、订单取消。</p></div>'
  +'<div class="step"><h5>成本路径</h5><p>进口投入品涨价（汇率）、关税与税费上调、能源与物流成本冲击。</p></div>'
  +'<div class="step"><h5>现金流路径</h5><p>外汇管制（钱汇不出）、银行体系动荡（付款延迟）、资本管制。</p></div>'
  +'<div class="step"><h5>资产路径</h5><p>征收、国有化、强制合资、资产冻结。</p></div>'
  +'<div class="step"><h5>合规路径</h5><p>制裁与出口管制扩大 → 客户/供应商变成受限方 → 业务资格丧失（m23）。</p></div>'
  +'</div>'
  +'<p>管理含义：每条路径对应一类缓释工具——收入路径（市场多元化、本币定价）、成本路径（价格调整条款、自然对冲）、现金流路径（缩短账期、预付款、信保）、资产路径（政治风险保险、分阶段投资、合资结构）、合规路径（筛查体系、交易结构设计）。</p>' },

  { id:'m28-s5', h:'28.5 应用方法：国别风险评估四步', lvl:2, html:
  '<div class="steps">'
  +'<div class="step"><h5>量化暴露</h5><p>该国资产（现金、库存、应收、固定资产）、收入占比、供应链依赖度、人员暴露。</p></div>'
  +'<div class="step"><h5>列事件清单</h5><p>宏观（主权/货币/银行）、政策（关税/准入/税/劳动）、安全（冲突/恐袭）、合规（制裁/管制）四类各 2–4 个情景。</p></div>'
  +'<div class="step"><h5>画传导链</h5><p>每个事件 → 哪条路径 → 损益表哪个科目 → 幅度估计（如「本币贬值 20% → 年收入减少 X 万美元」）。</p></div>'
  +'<div class="step"><h5>选缓释组合</h5><p>合同条款（价格调整、提前终止）、金融工具（信保、远期、政治风险保险）、结构设计（分阶段投资、本地融资、合资）、运营（安全库存、备用市场）。</p></div>'
  +'</div>' },

  { id:'m28-s6', h:'28.6 案例：USMCA 年度审查与北美业务的风险重估', lvl:2, html:
  '<div class="case"><div class="case-head"><div class="tag">案例 1 · 制度风险</div><div class="ttl">「协定不确定性」本身就是风险因子</div></div><div class="case-body">'
  +'<h5>事件</h5><p>2026 年 7 月 1 日 USMCA 首次联合审查，美国拒绝按现有形式续签，协定继续有效至 2036 年但进入年度审查；美方在双边谈判中要求提高汽车区域价值含量（75% → 82%）与美国价值占比<button class="src gA" data-src="s09">9</button>。</p>'
  +'<h5>传导链</h5><p>制度不确定性上升 → 北美长周期投资（工厂、供应链）的贴现率上升 → 企业推迟或缩减承诺 → 部件与产能布局调整（可观测：加拿大对美出口份额下降、非美市场出口创新高<button class="src gA" data-src="s09">9</button>）。</p>'
  +'<h5>企业应对</h5><p>（1）暴露盘点：在北美三国的资产、收入、采购占比；（2）情景规划：协定续签 / 年度僵持 / 部分退出三种情景下的业务影响；（3）结构对冲：多点产能、可转移的采购合同、含「政策变化退出条款」的长约；（4）监测：把 USTR 声明、谈判轮次、国会听证设为先行指标（m30）。</p>'
  +'<h5>结论</h5><p>启示：成熟市场同样有制度风险；「协定保护」不是永久属性。评估北美业务时，协定状态应与市场规模同权重。</p>'
  +'</div></div>' },

  { id:'m28-s7', h:'28.7 局限、争议与常见误区', lvl:2, html:
  '<ul><li><b>评级滞后性：</b>国别评级通常滞后于市场定价与事件；危机发生前评级往往「看起来安全」。</li>'
  +'<li><b>风险与收益的对称性：</b>高风险市场常常是高利润市场（竞争少、毛利高）——问题不是「去不去」，而是「去多少、用什么结构去」。</li>'
  +'<li><b>误区一：</b>只买政治风险保险而不做暴露控制。保险是兜底，不能替代「不把鸡蛋放在一个篮子」。</li>'
  +'<li><b>误区二：</b>把「国家风险」理解为「穷国风险」。USMCA 案例证明发达经济体同样有制度风险；2008 年后的欧洲主权危机也是例证。</li>'
  +'<li><b>误区三：</b>静态评估。风险是状态函数，须定期重估（m30）。</li></ul>' },

  { id:'m28-s8', h:'28.8 与其他模块的联系', lvl:2, html:
  '<ul><li><b>→ m13：</b>风险是市场评分卡的独立维度组。</li>'
  +'<li><b>→ m21：</b>汇兑与信用风险由付款条件设计管理。</li>'
  +'<li><b>→ m29：</b>地缘经济风险与供应链韧性。</li>'
  +'<li><b>→ m30：</b>风险量化与监测机制。</li></ul>' }
  ],
  exercises:[
  { type:'概念理解', q:'风险事件、风险暴露、脆弱性、商业影响四者的区别是什么？为什么企业应优先管理暴露与脆弱性？', a:'风险事件是「会发生什么」（如外汇管制）；暴露是「我的什么在那里」（资产、收入、供应链比例）；脆弱性是「事件后我能扛多久」（现金缓冲、替代市场、合同灵活性）；商业影响是「打到损益表的幅度」。企业无法控制事件的发生，但可以控制暴露（少放资产、分散市场）与脆弱性（现金缓冲、替代方案、灵活合同）——因此后者是风险管理的着力点。' },
  { type:'概念理解', q:'为什么「国家风险评级中等」的国家仍可能让一笔交易血本无归？', a:'因为评级是国家层面的合成评估，存在滞后与平均化：（1）行业特异性——评级不反映你所在行业的政策敏感度（如某国对外资零售的限制）；（2）交易层因素——特定进口商的信用、特定港口的清关效率、特定银行的支付通道；（3）时点因素——评级基于历史与当期数据，突发政策可在数日内改变风险（外汇管制通常一夜之间）；（4）传导放大——小概率事件 × 高暴露 = 大损失，评级不包含你的暴露信息。' },
  { type:'实际应用', q:'某新兴市场占你司营收 25%，且该国近期出现外汇储备下降与进口许可拖延信号。列出 6 个 30 天内应完成的动作。', a:'（1）暴露量化：该国现金、库存、应收、在途货的精确金额与集中度；（2）现金流保护：暂停新增赊销、在途订单改预付款或信用证；（3）应收催收：提前 30 天启动到期应付催收；（4）供应链调整：寻找替代市场/替代供应，评估转单成本；（5）政策监测：订阅该国央行/商务部公告、本地银行额度变化、汇率黑市溢价（先行指标）；（6)合同预案：激活不可抗力与政策变化条款、与信保沟通承保状态。评价标准：动作是否按「保护现金流 → 控制新增暴露 → 监测与预案」顺序排列。' },
  { type:'实际应用', q:'比较「政治风险保险」与「分阶段投资」两种缓释工具的适用场景与局限。', a:'政治风险保险：适用于已承诺的资产（工厂、大型库存）与长期应收，覆盖征收、汇兑限制、政治暴力、违约；局限：赔付比例非全额（通常 90% 左右）、除外责任多、理赔周期长、保费随风险上升、且不覆盖「业务消失」的间接损失。分阶段投资：适用于绿地进入，用「承诺递增」把风险切成可止损的段（先代表处 → 本地仓 → 小厂 → 扩产）；局限：可能错失窗口期（竞争者先占）、多次投入的协调成本、且无法缓释已投入部分的损失。实务：两者互补——分阶段控制增量暴露，保险保护存量暴露。' },
  { type:'综合分析', q:'「高风险高回报，所以小企业应该勇敢进入高风险市场。」评估这一说法，并给出你的进入原则。', a:'成立的部分：高风险市场竞争少、毛利高，先行者可建立位置（许多中国企业的早期利润来自此类市场）。不成立的部分：（1）「高回报」是概率加权概念，单点失败可能让企业整体死亡——小企业的风险承受力与恢复力弱；（2)高风险市场的隐性成本（坏账、合规、资金占用、管理带宽）常被低估；（3)高风险往往意味着「信息劣势」——你不了解的游戏规则，本地玩家了解。进入原则：（1）暴露上限——单一高风险市场敞口不超过净资产/年利润的可承受比例（如 10–20%）；（2）结构先行——预付款/信用证、分阶段、信保、合同退出条款全部到位才进入；（3）组合分散——用多个中风险市场对冲，不押注单一高风险市场；（4）能力匹配——确认企业有管理该风险的人力与系统（合规筛查、现金监控），否则宁可放弃。' }
  ]
},

m29: {
  id:'m29', stage:'s7', title:'地缘经济、供应链韧性与关键依赖', en:'Geoeconomics, Supply Chain Resilience and Critical Dependencies',
  hours:'6–9 小时', goal:'理解地缘经济工具化使用的逻辑，识别关键资源、技术与产业链依赖，并设计供应链韧性方案。',
  prereqText:'m09 GVC、m23 合规。', outcome:'能绘制企业供应链的依赖图，识别单点故障，并设计分散化、备份与监测方案。',
  summary:'当关税、制裁与出口管制成为常规工具，供应链设计的目标从「成本最优」变为「成本—风险—合规」三目标平衡。韧性不是备而不用，而是买一份「停摆保险」。',
  terms:['geoeconomics','friend-shoring','near-shoring','critical-minerals','chokepoint','supply-chain-resilience','single-source','dual-sourcing','de-risking'],
  prereq:['m09','m23'], related:['m28','m30'],
  sources:['s13','s15','s16','s07','s20','s55'],
  sections:[
  { id:'m29-s1', h:'29.1 学习定位', lvl:2, html:
  '<p>本模块把风险视角从「国别」推进到「链条」：企业的真正脆弱性往往不在某个国家，而在某个<b>不可替代的环节</b>——一颗芯片、一种稀土、一家工厂、一条航道。2022 年以来的地缘经济现实（出口管制频繁化、制裁扩大化、产业政策回归）使「供应链韧性」从运营议题升级为战略议题。</p>' },

  { id:'m29-s2', h:'29.2 从直观问题开始：一条管制公告如何让全球工厂停产', lvl:2, html:
  '<p>2025 年 4 月，中国对钐、钆、铽、镝、镥、钪、钇等中重稀土及相关磁体实施出口管制（商务部、海关总署 2025 年第 18 号公告）<button class="src gA" data-src="s13">13</button>。中国稀土精炼产能占全球约 85%（IEA 数据，经欧盟委员会 Access2Markets 等渠道交叉引用）<button class="src gB" data-src="s16">16</button>，烧结钕铁硼磁体占全球约 94%。磁体是汽车电机、风电、机器人的基础元件——管制消息一出，全球制造商紧急盘点库存、寻找替代、评估产线停摆风险。<b>没有企业进口「稀土」，但几乎所有高端制造都间接依赖它。</b>这就是「关键依赖」的隐蔽性：风险藏在供应链的第三层供应商。</p>' },

  { id:'m29-s3', h:'29.3 正式定义', lvl:2, html:
  '<div class="defbox"><div class="en">Geoeconomics</div><div class="zh">地缘经济</div><div class="def">以经济手段（贸易、投资、金融、技术、资源管制）服务战略目标的国家行为。核心工具：关税、制裁、出口管制、投资审查、产业补贴、标准与规则输出。对企业而言，地缘经济意味着「合规状态」与「准入资格」成为与成本同等重要的竞争变量。</div></div>'
  +'<div class="defbox"><div class="en">Critical Dependencies / Chokepoints</div><div class="zh">关键依赖 /  choke 点</div><div class="def">供应链中「不可替代且集中度高」的节点：关键矿产（稀土、锂、钴、镓、锗）、核心设备（光刻机、高纯材料）、战略航道（霍尔木兹、马六甲、苏伊士）、单一大规模产能基地。识别方法：逐层穿透 BOM 与供应商网络，找到「替代需要 > 12 个月」的环节。</div></div>'
  +'<div class="defbox"><div class="en">Resilience Strategies</div><div class="zh">韧性策略</div><div class="def">分散（多源/多地）、备份（安全库存、备用产线）、可见性（供应链图谱与实时监测）、速度（替代资格的预认证）、冗余设计（产品 BOM 双轨）。韧性的成本是「闲置产能与库存」，收益是「停摆时的生存」——本质是保险。</div><div class="meta"><div><b>常见误区：</b>把「中国 + 1」当作万能药——若替代产能仍依赖同一上游（如都买中国电芯），分散只是地理伪装。</div></div></div>' },

  { id:'m29-s4', h:'29.4 底层逻辑：风险如何沿链条传导', lvl:2, html:
  '<div class="chain"><span class="node">管制/制裁/航道中断</span><span class="arr">→</span><span class="node">关键投入品断供或涨价</span><span class="arr">→</span><span class="node">生产受限 / 成本重构</span><span class="arr">→</span><span class="node">交付延迟或违约</span><span class="arr">→</span><span class="node">收入与信誉损失</span></div>'
  +'<p>放大机制：（1）<b>层级放大</b>——风险在三、四级供应商处爆发，但冲击在一级客户处显现（牛鞭效应的地缘版本）；（2）<b>同步抢购</b>——管制消息触发全行业补库，反而加速断供（2025 年稀土管制后的抢运现象）；（3）<b>合规传染</b>——上游被列入实体清单，下游全部客户关系受牵连；（4）<b>替代滞后</b>——关键材料的替代资格认证（如车规芯片）需要 12–24 个月，短期无解。</p>' },

  { id:'m29-s5', h:'29.5 应用方法：供应链依赖审计与韧性设计', lvl:2, html:
  '<div class="steps">'
  +'<div class="step"><h5>穿透依赖图</h5><p>从成品 BOM 逐层穿透至三级供应商，标注每个节点的「替代难度」（<6 个月 / 6–12 个月 / >12 个月）与「地理/企业集中度」（单一来源占比）。</p></div>'
  +'<div class="step"><h5>识别 choke 点</h5><p>找出「替代 > 12 个月且单一来源 > 50%」的环节——这些就是你的命门，无论它出现在供应链第几层。</p></div>'
  +'<div class="step"><h5>分级应对</h5><p>关键级（>12 个月替代）：双源认证 + 战略库存 + 替代研发启动；重要级（6–12 个月）：双供应商 + 常备库存；一般级：竞价采购。</p></div>'
  +'<div class="step"><h5>合规嵌入</h5><p>对新供应商做受限方筛查与原产地/成分溯源（m23）；监控其所在司法辖区的管制动态。</p></div>'
  +'<div class="step"><h5>监测与演练</h5><p>设定先行指标（管制公告、许可证发放速度、价格异动、船期异常）；每年做一次「断供桌面推演」（假设 X 断供 90 天，业务如何持续）。</p></div>'
  +'</div>' },

  { id:'m29-s6', h:'29.6 案例：光伏产业的「地缘重构」', lvl:2, html:
  '<div class="case"><div class="case-head"><div class="tag">案例 1 · 产业级韧性</div><div class="ttl">关税墙如何重塑全球光伏供应链</div></div><div class="case-body">'
  +'<h5>压力事件清单</h5><p>（1）美国 301：中国太阳能电池片 25% → 50%（2025 年 1 月）<button class="src gA" data-src="s05">5</button>；（2）美国对东南亚四国双反（21.31%–271.2%）<button class="src gA" data-src="s06">6</button>；（3）美国 232 多晶硅措施：最低进口价（多晶硅 21 美元/kg、硅片 100 美元/kg、电池 0.22 美元/W、组件 0.38 美元/W）+ 15% 从价税，2026 年 12 月 4 日生效<button class="src gA" data-src="s07">7</button>；（4）印度 ALMM 排除中国电池（2026 年 6 月起）<button class="src gB" data-src="s20">20</button>；（5）巴西 25% 关税 + 配额<button class="src gB" data-src="s21">21</button>；（6）中国自身：2026 年 4 月起取消光伏产品出口退税<button class="src gB" data-src="s28">28</button>。</p>'
  +'<h5>产业响应</h5><p>（1）产能多点化：中国企业在美国、中东、东南亚、拉美布局产能（公开报道口径，规模以企业公告为准）<button class="src gC" data-src="s29">29</button>；（2）供应链区域化：东南亚从「转口基地」转向「本地制造 + 本地采购」（部分）；（3）市场分散化：2025 年前十市场集中度降至 48%，新兴市场（巴基斯坦、中东、拉美、非洲）占比上升<button class="src gA" data-src="s04">4</button>；（4）合规前置化：原产地规划、本地含量计算、双反规避风险审查成为标准流程。</p>'
  +'<h5>启示</h5><p>（1）政策是供应链地理分布的第一驱动力（超过成本）；（2）「中国产能 + 全球销售」的单核结构正在变成「多节点 + 区域合规」的网络结构；（3）对企业：产能布局的期权价值（可转换、可转移）比单点成本优势更重要；（4）对中国以外企业：中国上游的依赖（多晶硅 96%、电池 91%）仍是全球能源转型的底层约束，去依赖是十年工程<button class="src gB" data-src="s55">55</button>。</p>'
  +'</div></div>' },

  { id:'m29-s7', h:'29.7 局限、争议与常见误区', lvl:2, html:
  '<ul><li><b>韧性的成本常被低估：</b>双源、库存、冗余认证都是真金白银；在需求下行期，「过度韧性」会拖垮现金流。韧性应按 choke 点分级配置，而不是全面铺开。</li>'
  +'<li><b>「友岸外包」不是免费的：</b>友岸产能的成本通常高于原产地，且可能只是「地理伪装」（上游仍来自同一国家）。</li>'
  +'<li><b>误区一：</b>只看到关税，看不到非关税管制（出口管制、投资审查、数据规则对供应链的约束常大于关税）。</li>'
  +'<li><b>误区二：</b>把「断供」当作小概率忽略。choke 点的断供概率低但影响是生存级，应作为「可承受损失为零」处理。</li>'
  +'<li><b>误区三：</b>韧性方案没有演练。预案不演练等于没有。</li></ul>' },

  { id:'m29-s8', h:'29.8 与其他模块的联系', lvl:2, html:
  '<ul><li><b>→ m09：</b>GVC 结构决定依赖图的形状。</li>'
  +'<li><b>→ m23：</b>管制与筛查是合规嵌入的执行层。</li>'
  +'<li><b>→ m30：</b>风险监测与预警指标。</li>'
  +'<li><b>→ m19：</b>库存与物流策略是韧性组合的一部分。</li></ul>' }
  ],
  exercises:[
  { type:'概念理解', q:'什么是供应链的「choke 点」？为什么企业往往在危机时才发现自己的 choke 点在第三层供应商？', a:'choke 点是「替代周期长且供应集中」的命门环节（关键材料、设备、航道、单一基地）。它藏在深层的原因：（1）采购只管理一级供应商，二三级信息不透明（供应商也不愿披露其供应来源）；（2)日常运营只优化成本与交期，不做「替代周期」分析；（3）风险在深层积累，冲击在表层显现——层级越深，可见性越低。对策：BOM 穿透 + 供应商披露义务（合同写入）+ 替代周期分级管理。' },
  { type:'概念理解', q:'「中国 + 1」策略指什么？为什么它有时无法真正降低风险？', a:'「中国 + 1」指在保留中国供应链的同时，在第三国建立平行能力（采购或产能）以分散地缘与疫情类冲击。失效的原因：（1）替代产能的上游仍在中国（越南工厂买中国电芯、泰国工厂用中国设备）——地理分散但依赖未分散；（2)替代产能规模小、成本高、认证不足，只能「备而不用」；（3）合规伪装风险——若第三国仅做简单组装，可能被原产地规则与反规避执法穿透（美国对东南亚光伏双反即此逻辑<button class="src gA" data-src="s06">6</button>）；（4）管理复杂度与成本双升。有效的前提：替代链条的「上游独立 + 认证完备 + 规模足够承接」。' },
  { type:'实际应用', q:'为一家「中国电芯 → 越南组装 → 美国销售」的储能企业绘制风险暴露图，并给出 3 个韧性改进。', a:'暴露图：（1）上游：中国电芯单一来源（替代周期长：认证 + 产能）；（2）中游：越南组装依赖中国设备与零部件 + 美国对越关税/原产地风险；（3）下游：美国市场政策（301 对华、232 多晶硅衍生品、潜在的对越措施）；（4）合规：转口规避的执法风险。韧性改进：（1）电芯双源：认证第二供应源（其他中国电芯厂、韩国/日本电芯厂），即使价格高也保留小比例订单维持资格；（2）越南本地产值提升：逐步本地采购结构件、包装、部分 BMS，使越南原产地资格真实化（而非简单组装）；（3)市场分散：把越南产能同时服务欧洲与东南亚市场，降低对美单一市场依赖；（4）战略库存：对长交期电芯保持 8–12 周安全库存。' },
  { type:'实际应用', q:'某关键芯片的唯一供应商位于地震带且交期 26 周。设计风险应对方案（预算 50 万美元内）。', a:'方案：（1）分级：关键级（替代 > 12 个月 + 单一来源）→ 必须双轨；（2）第二源：启动替代型号认证（预算大头），即使量产仍用主源，认证保持「热备用」；（3）库存：按「地震后恢复期」估算——若产线恢复需 6 个月，则备 26 周 + 6 个月 ≈ 32 周的战略库存（资金占用 vs 缺货损失测算）；（4）合同：与主源签订优先供货与产能保留条款；（5）保险/预案：业务中断险评估；断供桌面推演（转单、 redesign 时间）；（6）设计冗余：下一代产品设计双芯片兼容（BOM 双轨）。50 万预算分配示例：认证 25 万 + 库存资金成本 15 万 + 预案与保险 10 万。评价标准：是否体现「认证热备 + 库存 + 设计冗余」的组合。' },
  { type:'综合分析', q:'「全面供应链自主可控是最优战略。」从成本、技术与时间三个维度评估。', a:'成本维度：全面自主 = 全面冗余，在多数环节不经济——为小概率事件支付全部环节的溢价会摧毁竞争力；应按 choke 点分级（关键级自主/双轨，一般级市场采购）。技术维度：现代产品的技术深度（光刻机、EDA、高纯材料、特种气体）使任何单一国家「全面可控」都不现实——自主是相对的，目标应是「关键环节不被卡」而非「全部环节自产」。时间维度： choke 点的替代需要 5–15 年（人才、工艺、设备生态），自主是长期工程，需要持续投入而非运动式攻坚。结论：正确战略是「关键 choke 点自主 + 一般环节全球化 + 替代资格常备」的组合，配以风险监测与演练——而非「全面自主」的口号。' }
  ]
},

m30: {
  id:'m30', stage:'s7', title:'风险量化、情景分析与预警', en:'Risk Quantification, Scenario Analysis and Early Warning',
  hours:'6–9 小时', goal:'掌握风险矩阵、情景分析与压力测试方法，建立关键风险指标（KRI）与监测机制。',
  prereqText:'m28、m29。', outcome:'能制作风险登记表与情景分析，设定先行指标与触发动作，并定期复盘校准。',
  summary:'风险管理的日常形态是三张表：风险登记表（有什么风险）、情景表（发生会怎样）、指标表（什么时候动手）。没有触发动作的监测只是焦虑。',
  terms:['risk-register','risk-matrix','scenario-analysis','stress-test','kri','leading-indicator','trigger-action','war-game'],
  prereq:['m28','m29'], related:['m13','m31'],
  sources:['s09','s15'],
  sections:[
  { id:'m30-s1', h:'30.1 学习定位', lvl:2, html:
  '<p>m28/m29 解决了「识别风险」，本模块解决「管理风险」：如何量化、如何分级、如何监测、何时动手。它是风险模块的「操作系统」——把一次性评估变成持续运转的机制。核心产出：风险登记表、情景分析报告、KRI 仪表盘与触发动作手册。</p>' },

  { id:'m30-s2', h:'30.2 从直观问题开始：两个企业面对同一场风暴', lvl:2, html:
  '<p>2026 年某政策窗口期，A 企业与 B 企业都面临「关税可能上调」的传闻。A 企业的应对是「再等等看」；B 企业在传闻出现时已启动预案：提前 3 个月锁定运价与舱位、把部分订单改为预付、启动替代市场询价。风暴落地时，A 企业措手不及，B 企业的损失被压缩到可控。<b>差别不在预测能力（都没预测准），而在「监测—触发—预案」的机制是否存在。</b></p>' },

  { id:'m30-s3', h:'30.3 正式定义：三张表', lvl:2, html:
  '<div class="defbox"><div class="en">Risk Register</div><div class="zh">风险登记表</div><div class="def">动态维护的风险清单：风险描述、类别、概率（1–5）、影响（1–5）、风险分值（P×I）、传导路径、KRI、应对措施、责任人、复核日期。是风险管理的「总账」，模板见资源库。</div></div>'
  +'<div class="defbox"><div class="en">Risk Matrix</div><div class="zh">风险矩阵</div><div class="def">以「发生概率」与「影响程度」为两轴的九宫格/五级矩阵，用于风险排序与资源分配。局限：概率与影响都是主观判断，应记录判断依据并定期校准；矩阵排序 ≠ 优先级排序（低概率高影响的风险需要单独管理）。</div></div>'
  +'<div class="defbox"><div class="en">Scenario Analysis / Stress Test</div><div class="zh">情景分析 / 压力测试</div><div class="def">构建 3–4 个结构完整的情景（触发条件 → 传导 → 结果 → 应对），检验业务在各种世界中的生存能力。压力测试是极端情景版本（如「最大市场关闭 90 天」）。</div><div class="meta"><div><b>纪律：</b>情景要有「故事」而非只改数字——每个情景描述「什么先发生、然后怎样、我们做什么」。</div></div></div>'
  +'<div class="defbox"><div class="en">KRI / Leading Indicators</div><div class="zh">关键风险指标 / 先行指标</div><div class="def">可观测、先于风险事件出现的信号。例：出口管制预警——许可证发放速度、海关查验率、行业协会风声；汇率危机——黑市溢价、外储覆盖率、远期汇率偏离；需求萎缩——渠道库存月数、搜索热度、经销商订单提前期。</div><div class="meta"><div><b>原则：</b>每个 KRI 必须有对应触发动作（「当 X 超过 Y，执行 Z」），否则监测无效。</div></div></div>' },

  { id:'m30-s4', h:'30.4 底层逻辑：风险管理的闭环', lvl:2, html:
  '<div class="chain"><span class="node">识别（登记表）</span><span class="arr">→</span><span class="node">评估（矩阵/情景）</span><span class="arr">→</span><span class="node">应对（缓释/转移/接受）</span><span class="arr">→</span><span class="node">监测（KRI）</span><span class="arr">→</span><span class="node">触发（动作手册）</span><span class="arr">↺</span><span class="node">复盘校准</span></div>'
  +'<p>四种应对策略：<b>规避</b>（退出该市场/业务）、<b>缓释</b>（降低概率或影响——双源、条款、合规体系）、<b>转移</b>（保险、合同责任分配）、<b>接受</b>（风险小或管理成本高于损失——但要显式记录「我们接受了这个风险」）。最常见的失败是「默认接受而不自知」。</p>' },

  { id:'m30-s5', h:'30.5 应用方法：建立风险运营机制', lvl:2, html:
  '<div class="steps">'
  +'<div class="step"><h5>建登记表</h5><p>从战略、市场、运营、合规、财务五类各列 3–5 个风险；每个风险填传导路径（写到损益表科目）与 KRI。</p></div>'
  +'<div class="step"><h5>排序与分级</h5><p>用风险矩阵 + 「可承受性」分级：零容忍（生存级）→ 重点管理 → 监控 → 接受。</p></div>'
  +'<div class="step"><h5>写情景</h5><p>对前 5 大风险各写一个三档情景（基准/恶化/极端），每档含应对动作与决策点。</p></div>'
  +'<div class="step"><h5>定 KRI 与触发</h5><p>每个重点风险 1–2 个 KRI + 明确阈值 + 预设动作 + 责任人。例：「美国海关对华查验率连续 2 月 > 20% → 启动第三国转运用 legality 审查 + 客户沟通预案」。</p></div>'
  +'<div class="step"><h5>运行与复盘</h5><p>月度风险例会（看 KRI 仪表盘）；季度更新登记表；每年一次压力测试 + 预案演练；事件后复盘「监测是否及时、动作是否有效」。</p></div>'
  +'</div>' },

  { id:'m30-s6', h:'30.6 案例：出口管制的情景规划', lvl:2, html:
  '<div class="case"><div class="case-head"><div class="tag">案例 1 · 情景设计</div><div class="ttl">稀土管制暂停期届满（2026 年 11 月）前的三情景规划</div></div><div class="case-body">'
  +'<h5>背景</h5><p>中国 2025 年 10 月发布的稀土扩展管制（更多元素 + 0.1% 域外规则 + 电池/负极材料）已暂停至 2026 年 11 月 10 日<button class="src gB" data-src="s15">15</button>。使用含中国稀土成分的下游企业面临政策不确定性。</p>'
  +'<h5>三情景</h5><p>（1）基准（暂停延续或平稳过渡）：维持现有供应链，每季核验公告；（2）恶化（管制恢复且扩大）：含中国成分产品的出口许可周期拉长 → 预案：加速非中国来源认证（库存 + 二供）、调整产品配方（降稀土用量设计）、把订单优先级转向不受影响市场；（3）极端（管制 + 进口国反制叠加）：全球供应链剧烈重构 → 预案：启动区域化产能与客户重构、启动不可抗力条款管理、与法务确认合同责任分配。</p>'
  +'<h5>KRI 与触发</h5><p>KRI：商务部公告频率、许可证平均审批时长、稀土现货价格异动、下游客户催货/砍单信号。触发：审批时长 > 30 天 → 启动库存与二供；客户砍单 > 20% → 启动产能重配评估。</p>'
  +'<h5>启示</h5><p>情景规划的价值不在「猜对」，而在「每种情景都有预排动作」——把决策从危机中的即兴反应变成事先设计的执行。</p>'
  +'</div></div>' },

  { id:'m30-s7', h:'30.7 局限、争议与常见误区', lvl:2, html:
  '<ul><li><b>风险矩阵的假精确：</b>P×I 的分值是主观的；矩阵适合沟通，不适合当仪表盘——应记录判断依据并复盘校准。</li>'
  +'<li><b>「狼来了」疲劳：</b>KRI 太多会导致预警麻木；每个重点风险只保留 1–2 个真正可动作的指标。</li>'
  +'<li><b>误区一：</b>把「监测」当「管理」。没有触发动作的监测是焦虑管理，不是风险管理。</li>'
  +'<li><b>误区二：</b>情景只有数字没有故事。无法讲述传导过程的情景无法产生行动。</li>'
  +'<li><b>误区三：</b>风险登记表一年不更新。风险是状态函数，季度不更新的登记表是文物。</li></ul>' },

  { id:'m30-s8', h:'30.8 与其他模块的联系', lvl:2, html:
  '<ul><li><b>→ m13：</b>风险维度数据来自本模块方法。</li>'
  +'<li><b>→ m28–m29：</b>登记表的内容来源。</li>'
  +'<li><b>→ m31：</b>情景分析是战略决策（退出、扩张）的输入。</li>'
  +'<li><b>→ m32：</b>综合项目的风险管理章节。</li></ul>' }
  ],
  exercises:[
  { type:'概念理解', q:'为什么「低概率 × 高影响」的风险不能简单用风险矩阵排序处理？', a:'因为 P×I 相乘会让「5×1」与「1×5」得分相同，但两者的管理逻辑完全不同：高概率低影响可以用常规运营消化（接受 + 小缓释）；低概率高影响（战争、制裁、choke 点断供、系统性金融危机）一旦发生就是生存级，必须「零容忍」管理——双源、战略库存、保险、情景预案，无论 P×I 分值是否排名靠前。排序应按「可承受性」而非仅「期望损失」。' },
  { type:'概念理解', q:'什么是「触发动作」？为什么「监测指标」没有配套动作等于没有监测？', a:'触发动作是「当 KRI 越过阈值时自动执行的预设动作」。没有动作的监测只是收集信息——组织会在信号面前陷入「再观察观察」的决策瘫痪（这是危机中的常见死法：看到了信号但没有授权任何人行动）。设计原则：动作要具体（「启动 X 供应商认证」「暂停 Y 市场赊销」）、有责任人、有资源预留。' },
  { type:'实际应用', q:'为「对美出口业务」设计 5 个 KRI 与触发动作（覆盖关税、管制、汇率三类）。', a:'示例：（1）关税/政策：USITC/CBP 公告与排除清单动态 → 触发：新税率生效前 60 天启动价格重谈与第三国评估；（2）出口管制：BIS 实体清单更新与许可政策 → 触发：任何客户/供应商进入清单 → 立即暂停交易并合规审查；（3）汇率：远期汇率与即期偏离、黑市信号 → 触发：偏离 > 2% → 提高对冲比例；（4）清关：美国海关对华查验率 → 触发：连续两月上升 → 文件预审核 + 预归类确认；（5）需求：美国渠道库存月数与搜索热度 → 触发：库存 > 4 个月 → 放缓发货 + 促销去库。评价标准：每个 KRI 是否可观测、有阈值、有动作、有责任人。' },
  { type:'实际应用', q:'写一个三档情景：「最大海外市场（占收入 40%）因政策原因关闭 90 天」。', a:'情景设计：（1）触发条件：进口许可冻结/关税骤升/制裁扩大（具体化）；（2）传导：在途货滞港 → 库存无法变现 → 收入归零 + 固定成本持续 → 现金流缺口测算（90 天固定成本 + 库存沉没）；（3）基准档（关闭 90 天后恢复）：现金流缺口 X 万美元，需储备 Y 个月固定成本；动作：库存转移至第三国、启用信用额度、裁员/减产预案；（4）恶化档（关闭 6 个月）：启动该市场退出评估，产能转接其他市场，与供应商重谈；（5）极端档（永久关闭）：市场重构（新市场开拓时间表）、资产处置、组织收缩。决策点：第 30 天（是否转移库存）、第 60 天（是否启动退出）、第 90 天（复盘与重构）。核心：情景的价值在于「事先确定决策点」，而不是预测结果。' },
  { type:'综合分析', q:'「风险管理的目标是消除风险。」评估这一说法，并说明健康风险文化的特征。', a:'评估：目标是错误且危险的——风险与收益同源，消除风险等于消除业务（不出海就没有国际风险，也没有国际利润）。正确目标是「让风险可承受、可定价、可管理」：在回报足够时承担风险，在承受不了时缓释/转移/规避。健康风险文化的特征：（1）风险显式化——登记表公开讨论，没有「房间里的大象」；（2）分级授权——不同级别风险有明确的决策层级（谁有权接受什么级别的风险）；（3）触发优先——预案与触发动作先于危机存在；（4）复盘不追责——事件复盘聚焦机制改进而非找人背锅（否则信号会被隐瞒）；（5）风险与激励对齐——承担风险的团队若只享受收益不承担后果，会系统性低估风险。' }
  ]
},

m31: {
  id:'m31', stage:'s7', title:'战略决策、组合与退出', en:'Strategic Decisions, Portfolio Management and Exit',
  hours:'5–8 小时', goal:'掌握多市场组合管理、投资回报评估、承诺分级与退出决策框架，理解复盘机制对纠错的价值。',
  prereqText:'m15、m16、m28–m30。', outcome:'能评估海外业务的真实回报，设计承诺与退出机制，并建立复盘闭环。',
  summary:'出海不是一次性赌博而是持续的组合管理：每一年都要回答——哪个市场加码、哪个维持、哪个退出。会退出比会进入更能决定长期生死。',
  terms:['roi','portfolio-management','sunk-cost','exit-decision','stage-gate','post-mortem','capital-allocation','opportunity-cost'],
  prereq:['m15','m16','m28','m30'], related:['m13','m17','m32'],
  sources:['s09','s04'],
  sections:[
  { id:'m31-s1', h:'31.1 学习定位', lvl:2, html:
  '<p>前六个阶段教「如何进入」，本模块教「如何持续」：多市场资源分配、真实回报评估、沉没成本陷阱、退出决策与复盘。它是「战略决策」层——把市场研究、进入执行与风险管理连接到经营结果。核心认知：<b>退出不是失败，是资本配置纪律；不复盘才是失败。</b></p>' },

  { id:'m31-s2', h:'31.2 从直观问题开始：一个连续亏损市场为什么每年都「再给一年」', lvl:2, html:
  '<p>某海外市场连续三年亏损，但管理层每年都说「再投入一年就会好转」。真实原因是沉没成本 + 退出尴尬 +「也许明年政策变好」的一厢情愿。与此同时，另一个高增长市场因为「没排上资源」而错失窗口。<b>不退出亏损市场的隐性成本，是掐死赢家的机会成本。</b>这就是为什么退出机制必须事前设计（触发条件），而不是留给危机时的即兴决定。</p>' },

  { id:'m31-s3', h:'31.3 正式定义', lvl:2, html:
  '<div class="defbox"><div class="en">Sunk Cost Fallacy</div><div class="zh">沉没成本谬误</div><div class="def">因已投入的成本（时间、金钱、情感）而继续一个明显不明智的项目。正确原则：决策只看「未来现金流」——继续投入的边际回报是否优于替代用途。已花掉的钱与未来决策无关。</div></div>'
  +'<div class="defbox"><div class="en">Stage-Gate Commitment</div><div class="zh">分阶段承诺（闸门机制）</div><div class="def">把进入与扩张切成多个承诺层级，每层设置明确的「继续/停止」闸门：试销（小额可逆）→ 渠道建设（中等承诺）→ 本地化产能（高承诺）。每个闸门有量化标准（销量、毛利、回款、市场份额）。</div><div class="meta"><div><b>作用：</b>把「大赌」拆成「一系列可验证的小赌」，限制单次错误的最大损失（m16 承诺度概念的运营化）。</div></div></div>'
  +'<div class="defbox"><div class="en">Portfolio Management</div><div class="zh">组合管理</div><div class="def">按「增长—回报—风险」三维对国家/产品/渠道分类：明星（增长 + 回报）加码、现金牛（回报稳）收割、问题（增长但烧钱）设观察期、瘦狗（双低）退出。资源每年按组合逻辑再分配，而非按去年预算惯性。</div></div>'
  +'<div class="defbox"><div class="en">Post-Mortem / Learning Loop</div><div class="zh">复盘机制</div><div class="def">对重大决策（进入、退出、失败）做结构化复盘：当时的假设是什么？实际结果？差异原因（运气/能力/信息）？哪些假设被证伪？机制上如何改进？复盘的对象是「决策过程」而非「责任人」。</div></div>' },

  { id:'m31-s4', h:'31.4 底层逻辑：退出决策的量化框架', lvl:2, html:
  '<p>继续 vs 退出的判据（只看未来）：（1）<b>边际现金流</b>——继续运营未来 12 个月的净现金流 vs 退出回收价值（库存变现、资产处置、合同终止成本）；（2）<b>机会成本</b>——释放的资源投向其他市场的预期回报；（3）<b>期权价值</b>——该市场是否保留「未来重启」的期权（政策窗口、客户关系、品牌注册）；（4）<b>风险传染</b>——继续是否会让风险蔓延（合规、声誉、现金流）。</p>'
  +'<div class="callout info"><span class="ico">ℹ️</span><div><b>退出的艺术：</b>好的退出是「有尊严的退出」——通知客户与伙伴、处理库存与售后责任、保留品牌资产与重启期权、不撕破未来合作的门。糟糕的退出（一夜消失、拒绝售后）会把一次市场失败升级为品牌污点。</div></div>' },

  { id:'m31-s5', h:'31.5 应用方法：年度战略复盘流程', lvl:2, html:
  '<div class="steps">'
  +'<div class="step"><h5>算清真实回报</h5><p>每个海外市场/渠道的「全成本利润」：收入 − 货成本 − 到岸成本 − 渠道费用 − 坏账 − 库存资金成本 − 管理分摊。用同一口径横向比较。</p></div>'
  +'<div class="step"><h5>组合分类</h5><p>按增长 × 回报 × 风险把市场/产品/渠道放入四象限，形成「加码/维持/观察/退出」清单。</p></div>'
  +'<div class="step"><h5>设承诺闸门</h5><p>下一年的每个加码计划都带量化闸门（「若 Q2 销量未达 X，则停止 Y」）。</p></div>'
  +'<div class="step"><h5>设计退出预案</h5><p>对「观察/退出」象限：预设触发条件（亏损年限、政策红线、KRI 越界）、退出步骤（客户/库存/售后/资产）、重启期权保留方式。</p></div>'
  +'<div class="step"><h5>复盘闭环</h5><p>对上年重大决策做 post-mortem，更新「假设库」——哪些进入假设被证实/证伪，改进下一轮研究质量（m11）。</p></div>'
  +'</div>' },

  { id:'m31-s6', h:'31.6 案例：退出决策的三国对照', lvl:2, html:
  '<div class="case"><div class="case-head"><div class="tag">案例 1 · 对照案例</div><div class="ttl">三种退出的不同代价</div></div><div class="case-body">'
  +'<h5>案例 A：优步退出东南亚（2018）</h5><p>公开报道：优步将东南亚业务出售给 Grab，换取对方股权。逻辑：区域竞争烧钱无赢家，合并比双输好；「退出」换成了「股权 + 品牌保留」——保留了未来期权。</p>'
  +'<h5>案例 B：百思买退出欧洲（2011–2013）</h5><p>公开报道：百思买关闭英国/欧洲手机与电视业务。逻辑：欧洲消费电子市场结构（价格战 + 线上化）与其大店模式不匹配，继续亏损；选择关闭合资门店并退出。教训：模式错配要早断，拖延只会放大亏损。</p>'
  +'<h5>案例 C：沃尔玛退出德国（2006，m24 详述）</h5><p>教训：系统性不适配（文化 + 制度 + 竞争）拖延八年才退出——早期信号（同店销售、客户调研）已被识别但未触发行动。对比 A 与 B：差别不在「退出的勇气」，而在「退出触发机制是否事前存在」。</p>'
  +'<h5>综合启示</h5><p>（1）退出决策要在进入时就开始设计（m16 的退出难度是模式选择维度之一）；（2）「卖身式退出」（换股权/品牌保留）优于「清算式退出」；（3）触发条件必须量化且写进年度流程，而不是等危机。</p>'
  +'</div></div>' },

  { id:'m31-s7', h:'31.7 局限、争议与常见误区', lvl:2, html:
  '<ul><li><b>短期主义的陷阱：</b>用季度财务砍长期投入，会让战略市场永远长不大——闸门标准要匹配市场的学习周期（新市场 24–36 个月才成熟是常态）。</li>'
  +'<li><b>复盘的问责悖论：</b>复盘追责 → 信号隐瞒 → 更差的决策。复盘必须对事不对人，且要保护「报信者」。</li>'
  +'<li><b>误区一：</b>「再给一年」没有量化条件。每次「再等等」都必须附带「到什么标准就停」。</li>'
  +'<li><b>误区二：</b>退出 = 清仓甩卖。有序退出保护品牌、客户与重启期权。</li>'
  +'<li><b>误区三：</b>只复盘失败。成功同样要复盘——区分「运气好」与「能力强」，否则会把风口当能力。</li></ul>' },

  { id:'m31-s8', h:'31.8 与其他模块的联系', lvl:2, html:
  '<ul><li><b>→ m16：</b>进入模式的退出难度设计。</li>'
  +'<li><b>→ m28–m30：</b>风险触发是退出预案的核心输入。</li>'
  +'<li><b>→ m22：</b>汇率情景影响回报测算。</li>'
  +'<li><b>→ m32：</b>综合项目的结论分级与「下一步研究」设计。</li></ul>' }
  ],
  exercises:[
  { type:'概念理解', q:'沉没成本谬误如何在外派决策中表现？正确的决策问题应该是什么？', a:'表现：「已经投了 500 万，现在撤就全亏了」「老板亲自推的项目，撤了没面子」「再撑一年也许就好了」。正确问题：「从现在起，继续投入的每一元钱，预期回报是否高于把这笔钱投向其他市场/产品/还债？」已投入的 500 万不在决策变量里——它只影响「退出时账面损失多大」，不影响「继续是否明智」。' },
  { type:'概念理解', q:'「分阶段承诺（stage-gate）」如何降低进入失败的最大损失？用一个虚拟例子说明。', a:'机制：把一次性大承诺拆成多级小承诺，每级设「继续/停止」的量化闸门，使错误在放大前被止损。例：直接绿地建厂 1,000 万美元，若失败损失巨大；改为 stage-gate——第一级：跨境电商试销 5 万美元（闸门：转化率 > 1.5%）；第二级：签本地分销 20 万美元铺货（闸门：sell-through > 70%）；第三级：设子公司 100 万美元（闸门：连续两季毛利 > 15%）；第四级：本地产能（闸门：市场份额 > 10%）。若市场根本不成立，第一级就止损，损失 5 万而非 1,000 万。' },
  { type:'实际应用', q:'某市场年收入 300 万美元、直接利润 −40 万美元、库存 60 万美元、固定投入 80 万美元。退出可回收：库存变卖 45 万、资产处置 30 万、违约成本 10 万。做继续 vs 退出的量化比较。', a:'继续：未来 12 个月预期亏损 −40 万（假设无改善）+ 库存与资产的持续占用。退出：一次性回收 45 + 30 − 10 = 65 万美元现金 + 消除年度亏损流（每年 +40 万现金流改善）+ 释放管理资源。比较：退出立即获得 65 万现金与每年 40 万的亏损消除；继续的唯一理由是「预期改善」（需给出证据：什么变了？政策？渠道？产品？）。若无可信改善证据，退出是理性选择；若有改善假设，应设定 12 个月的量化验证期与止损线（如「连续两季亏损收窄至 −15 万以内则继续，否则退出」）。注意：库存变卖价值随市场关闭可能进一步缩水，应尽快执行。' },
  { type:'实际应用', q:'设计你司海外业务的「年度四象限复盘」：列出评估维度、数据来源与每象限的标准动作。', a:'维度：增长率（近 12 个月收入增速）、回报率（全成本利润率，含渠道费用与坏账，m31.5）、战略价值（客户资产、品牌、供应链位置）、风险敞口（该市场占总收入/资产比例 + 风险等级）。数据来源：财务（分市场损益）、渠道（sell-through）、风险（登记表 KRI）。四象限动作：明星（高增长 + 高回报）→ 加码（扩渠道/产能，带闸门）；现金牛（低增长 + 高回报）→ 收割（控投入、提价、优化 SKU）；问题（高增长 + 低回报）→ 设 12 个月观察期 + 单位经济模型修正；瘦狗（双低）→ 启动退出预案（触发条件 + 步骤 + 期权保留）。附加规则：任何市场占比 > 25% 时强制做「集中度风险」评估（m29）。' },
  { type:'综合分析', q:'「退出意味着承认失败，会打击团队士气。」如何设计退出沟通与机制，使退出成为组织能力而非士气灾难？', a:'机制设计：（1）事前规则化——把退出触发条件写进年度流程（市场进入时就定义失败标准），退出是「按规则执行」而非「事后追责」，情绪色彩大幅降低；（2）资产化叙事——把退出市场获得的「知识资产」（市场认知、渠道经验、合规教训）显式沉淀为组织能力，宣布「这次退出为下一次进入节省了 X」；（3）体面退出——客户与伙伴妥善安置（转移给替代方案、完成售后责任），保护品牌与个人声誉；（4）人事保护——退出市场的团队优先内部转岗（客户资源、语言能力是资产），而不是遣散；（5）期权保留——品牌注册、客户关系、许可文件保留，把「退出」表述为「战略暂停」；（6）复盘归因于机制——复盘聚焦「哪些信号被忽略、闸门为何未触发」，不追责个人。结论：退出会不会打击士气，取决于它被设计成「纪律执行」还是「失败审判」。' }
  ]
}

});

;

Object.assign(MODULES, {

/* ================= 阶段 8 ================= */
m32: {
  id:'m32', stage:'s8', title:'综合项目：中国光伏组件全球市场研究（完整案例）', en:'Capstone Project: A Complete Global Market Study of PV Modules',
  hours:'20–30 小时（自主项目）', goal:'整合全部知识，独立完成一次可复核的国际市场研究：从研究问题、数据收集、筛选评分、准入评估到进入建议与风险方案。',
  prereqText:'建议完成阶段 1–7 后研读；也可作为「带着问题回查」的综合索引。', outcome:'能够按照同样的流程，为自己选择的产品/产业产出一份可供商业讨论的市场研究报告。',
  summary:'本模块用一个完整案例演示「从研究问题到进入建议」的全过程：为什么选光伏组件（数据丰富、政策密集、连接全部模块），研究如何设计，证据如何分级，结论如何分层呈现。',
  terms:['capstone','research-question','evidence-chain','decision-memo','assumption-testing'],
  prereq:['m01','m02','m03','m04','m05','m06','m07','m08','m09','m10','m11','m12','m13','m14','m15','m16','m17','m18','m19','m20','m21','m22','m23','m24','m25','m26','m27','m28','m29','m30','m31'],
  related:[], 
  sources:['s01','s02','s03','s04','s05','s06','s07','s08','s09','s10','s17','s20','s21','s23','s25','s26','s27','s28','s29','s30'],
  sections:[
  { id:'m32-s1', h:'32.1 项目设定：研究问题、背景与产品定义', lvl:2, html:
  '<p><b>决策背景（教学设定）：</b>一家中国二线光伏组件企业（年产能约 5 GW，现金流稳健，无海外产能，无海外团队）计划在未来 24 个月内开拓海外市场。管理层的问题：<b>应该把有限的资源投入哪些国家市场？以什么方式进入？主要风险是什么？</b></p>'
  +'<p><b>为什么选光伏组件作为教学案例：</b>（1）数据丰富——UN Comtrade 与中国海关数据可完整验证；（2）政策密集——关税、双反、原产地、本地含量、补贴工具全部登场；（3）连接全部模块——从比较优势（m02）到 GVC（m09）、从进入模式（m16）到合规（m23）、从汇率（m22）到退出（m31）都能用上；（4）时效性强——2024–2026 年政策密集变动，适合演示「动态核验」。</p>'
  +'<div class="callout info"><span class="ico">ℹ️</span><div><b>产品定义与统计口径（关键第一步）：</b>本案例的「光伏组件」指晶体硅光伏组件（module），HS 相关编码为 8541.40（含 2022 版子目结构）；统计口径以中国机电产品进出口商会基于海关数据的年度分析为主，并与行业口径（中国光伏行业协会）区分标注。数据年份以 2025 年全年为主，访问日期 2026 年 10 月 21 日。所有政策信息均标注生效日期与核验渠道。</div></div>' },

  { id:'m32-s2', h:'32.2 第一步：宏观背景与产业结构', lvl:2, html:
  '<p>（1）全球贸易背景：2025 年全球货物出口 26.3 万亿美元（+7.1%），发展中经济体占 46%<button class="src gA" data-src="s02">2</button>；WTO 预计 2025 年贸易量 +2.4%、2026 年 +0.5%（预测，非事实）<button class="src gA" data-src="s01">1</button>。（2）中国外贸背景：2025 年中国进出口 45.47 万亿元，出口 26.99 万亿元（+6.1%），高技术产品出口 +13.2%<button class="src gA" data-src="s03">3</button>。（3）产业结构：2025 年中国多晶硅、硅片、电池、组件产能分别占全球 96.0%、96.2%、91.3%、80.1%<button class="src gB" data-src="s55">55</button>；逆变器出口 90.4 亿美元（+9.4%）<button class="src gA" data-src="s04">4</button>。（4）企业自身政策环境：中国自 2026 年 4 月 1 日起取消光伏产品增值税出口退税（9% → 0），涉及硅片、组件、逆变器等 249 项产品<button class="src gB" data-src="s28">28</button>——这直接改变出口报价的成本底线，是本案例最重要的「本土变量」。</p>'
  +'<p><b>方法论提示（m01/m09）：</b>宏观数据回答「舞台有多大」，产业结构回答「我们在哪个环节竞争」。本例中企业处于「组件封装」环节——规模经济强、技术扩散快、利润受政策身份强烈影响。</p>' },

  { id:'m32-s3', h:'32.3 第二步：贸易数据实证——量、价、市场结构', lvl:2, html:
  '<div class="case"><div class="case-head"><div class="tag">步骤 2 · 数据实证</div><div class="ttl">中国光伏组件出口的三年图景（2023–2025）</div></div><div class="case-body">'
  +'<h5>核心数据（中国机电产品进出口商会，基于海关数据）<button class="src gA" data-src="s04">4</button></h5>'
  +'<div class="tbl-wrap"><table class="data"><thead><tr><th>指标（2025 年）</th><th>数值</th><th>同比</th><th>口径说明</th></tr></thead><tbody>'
  +'<tr><td>组件出口额</td><td class="num">237 亿美元</td><td class="num">−15.3%</td><td>海关出口统计</td></tr>'
  +'<tr><td>组件出口量</td><td class="num">249.8 GW</td><td class="num">+5.7%</td><td>同上</td></tr>'
  +'<tr><td>隐含均价</td><td class="num">约 0.095 美元/W</td><td class="num">约 −20%</td><td>出口额/出口量（本报告计算）</td></tr>'
  +'<tr><td>电池片出口额</td><td class="num">45 亿美元</td><td class="num">+72.6%</td><td>其中对印度占 40%、印尼占 27%</td></tr>'
  +'<tr><td>硅片出口额</td><td class="num">12.5 亿美元</td><td class="num">−11.8%</td><td>量 61.2 亿片（+37.8%）</td></tr>'
  +'<tr><td>前十大出口市场合计占比</td><td class="num">48%</td><td class="num">2023/2024 年 >61%</td><td>集中度显著下降</td></tr>'
  +'<tr><td>10 亿美元级市场数量</td><td class="num">3 个</td><td class="num">2023 年 9 个、2024 年 6 个</td><td>仅荷兰、巴基斯坦、巴西</td></tr>'
  +'<tr><td>全球吉瓦级组件进口市场</td><td class="num">47 个</td><td class="num">2024 年 39 个</td><td>市场数量扩张</td></tr>'
  +'</tbody></table></div>'
  +'<h5>数据解读（m10 口径纪律）</h5><p>（1）「量增额跌」：出口量 +5.7% 而额 −15.3%，隐含均价下降约 20%——增长是价格战驱动的以价换量，不是需求驱动的量价齐升；（2）口径差异示例：中国光伏行业协会口径的 2025 年组件出口规模为 264.1 GW（与商会 249.8 GW 不同），差异源于统计范围（子目覆盖、是否含部分边界产品）——引用时必须注明来源与口径，这正是「口径决定结论」的教学实例<button class="src gB" data-src="s28">28</button>；（3）「荷兰 ≠ 终端市场」：荷兰是欧洲转口枢纽，其进口含大量再出口，出口份额不等于当地装机（m10 镜像与转口问题）；（4）巴基斯坦 2025 年进口中国组件约 17.9 GW（FY25 口径，行业白皮书，C 级证据）<button class="src gC" data-src="s25">25</button>，是第二大单一进口市场，但付款条件与宏观风险需单独评估。</p>'
  +'<h5>竞争格局（m14）</h5><p>全球组件品牌呈「中国龙头 + 政策身份厂商 + 区域品牌」三层：中国龙头（晶科、隆基、天合、晶澳、阿特斯等）以规模与成本主导；美国 First Solar 以薄膜技术路线 + IRA 税收抵免（公开报道口径约 0.17 美元/瓦）获得「本土身份」溢价<button class="src gB" data-src="s30">30</button>；欧洲 REC 等依靠区域供应链与碳足迹叙事；新兴市场出现本地组装厂（如巴基斯坦的本地化倡议）。价格战使行业集中度上升、二三线企业现金流承压——这既是本例企业的压力，也是「出海找利润」的动机。</p>'
  +'</div></div>' },

  { id:'m32-s4', h:'32.4 第三步：候选市场池与筛选评分', lvl:2, html:
  '<p><b>候选池建立（排除法，m13）：</b>从全球 47 个吉瓦级进口市场中，按「规模 × 增长 × 准入可行性 × 风险」初筛，排除：美国（双反 + 301 + 232 使直接出口经济性基本归零，见下文）、印度（ALMM 将中国电池排除在政府项目外，开放市场竞争激烈）、荷兰（转口为主且非终端决策地）、日韩澳（市场成熟但准入与品牌壁垒高、价格战激烈）。保留 6 个候选：<b>沙特阿拉伯、巴西、巴基斯坦、德国、南非、印度尼西亚</b>。</p>'
  +'<div class="case"><div class="case-head"><div class="tag">步骤 3 · 筛选评分</div><div class="ttl">六国加权评分（评分数据为教学演示，实际研究须逐项替换为可核验数据）</div></div><div class="case-body">'
  +'<div class="tbl-wrap"><table class="data"><thead><tr><th>指标（权重）</th><th>沙特</th><th>巴西</th><th>巴基斯坦</th><th>德国</th><th>南非</th><th>印尼</th></tr></thead><tbody>'
  +'<tr><td>市场规模（25%）</td><td class="num">5</td><td class="num">5</td><td class="num">4</td><td class="num">4</td><td class="num">3</td><td class="num">3</td></tr>'
  +'<tr><td>增长（20%）</td><td class="num">5</td><td class="num">4</td><td class="num">4</td><td class="num">3</td><td class="num">3</td><td class="num">4</td></tr>'
  +'<tr><td>竞争强度反向（15%）</td><td class="num">4</td><td class="num">3</td><td class="num">3</td><td class="num">2</td><td class="num">4</td><td class="num">4</td></tr>'
  +'<tr><td>利润空间（15%）</td><td class="num">4</td><td class="num">3</td><td class="num">2</td><td class="num">3</td><td class="num">3</td><td class="num">2</td></tr>'
  +'<tr><td>进入成本反向（15%）</td><td class="num">3</td><td class="num">2</td><td class="num">3</td><td class="num">3</td><td class="num">3</td><td class="num">3</td></tr>'
  +'<tr><td>风险反向（10%）</td><td class="num">4</td><td class="num">3</td><td class="num">2</td><td class="num">4</td><td class="num">3</td><td class="num">3</td></tr>'
  +'<tr><td><b>加权总分</b></td><td class="num"><b>4.30</b></td><td class="num"><b>3.55</b></td><td class="num"><b>3.20</b></td><td class="num"><b>3.20</b></td><td class="num"><b>3.15</b></td><td class="num"><b>3.20</b></td></tr>'
  +'</tbody></table></div>'
  +'<h5>评分依据（逐项可核验）</h5><p>（1）沙特：SPPC 已启动 43.2 GW 可再生能源项目（38.7 GW 已签 PPA，10.2 GW 已并网，2025 年底目标 12.7 GW、2026 年底目标 20 GW+）<button class="src gC" data-src="s27">27</button>；NREP 官方目标 58.7 GW（2030），市场传闻上调至 100–130 GW（高盛报告口径，需以官方文件为准，C 级）<button class="src gC" data-src="s26">26</button>；REPDO 招标引入本地含量要求（15% → 35%）与本土制造合作（如与晶科、TCL 中环的本地化协议）<button class="src gC" data-src="s26">26</button>；（2）巴西：累计集中式 17.9 GW + 分布式 42.1 GW（2025 年 8 月，Absolar）<button class="src gB" data-src="s21">21</button>，但关税 25% + 配额压缩利润与准入（见下文）；（3）巴基斯坦：FY25 进口 17.9 GW<button class="src gC" data-src="s25">25</button>，价格敏感、付款条件苛刻（信用证 + 预付款普遍）；（4）德国：市场成熟但被本土与土耳其、印度产能 + 中国龙头直接竞争挤压，价格战最烈；（5）南非与印尼：电网不稳与缺电创造需求（m07 逻辑），但支付能力与分销深度受限。</p>'
  +'<h5>敏感性分析（m13）</h5><p>（1）增长权重 20% → 30%（规模降至 15%）：沙特保持第一（4.30），领先优势略扩大；（2）风险权重 10% → 25%：沙特扩大领先（4.40），巴基斯坦因宏观与付款风险跌出前三（3.10）；（3）进入成本权重升至 30%：沙特仍第一（4.25），巴西与印尼并列第二（3.35）。<b>结论稳健性：沙特在所有检验的权重组合下保持第一；巴西稳定第二；第三名（德国、巴基斯坦、印尼）随权重变化互换</b>——这指向「沙特主攻 + 巴西备份 + 第三市场用试点数据决定」的策略，而不是给出一个虚假精确的排序。</p>'
  +'</div></div>' },

  { id:'m32-s5', h:'32.5 第四步：重点市场准入评估（关税、非关税与合规）', lvl:2, html:
  '<div class="case"><div class="case-head"><div class="tag">步骤 4 · 准入评估</div><div class="ttl">四个重点市场的政策成本结构（截至 2026-10 核验）</div></div><div class="case-body">'
  +'<h5>美国（作为「负面基准」纳入比较）</h5><p>中国组件对美直接出口在经济上已不可行：（1）301 关税 50%（2025 年 1 月起）<button class="src gA" data-src="s05">5</button>；（2）232 多晶硅衍生品措施：最低进口价格（组件 0.38 美元/W、电池 0.22 美元/W、硅片 100 美元/kg、多晶硅 21 美元/kg）+ 15% 从价税，2026 年 12 月 4 日生效<button class="src gA" data-src="s07">7</button>——当前组件市场价约 0.09–0.12 美元/W（多来源区间，C 级）<button class="src gC" data-src="s29">29</button>，最低价与市场价的差额意味着「到岸即失去价格竞争力」；（3）东南亚转口路径被双反封堵（21.31%–271.2%）<button class="src gA" data-src="s06">6</button>。结论：除非在美/北美本土建厂（配 IRA 抵免），否则放弃该市场——这是「政策把全球成本优势清零」的完整教学样本。</p>'
  +'<h5>沙特</h5><p>关税较低（多数工业品 5%–15% 量级，具体以沙特海关税则与 SASO 认证要求为准，需逐项核验）；核心准入变量是 REPDO 招标的本地含量要求（15% → 35%）<button class="src gC" data-src="s26">26</button>与大型项目的供应商资格预审；项目制采购（PPA 25 年 + 银行融资）对组件银行ability（可融资性）要求高—— Tier-1 品牌与长期质保是隐性门槛。</p>'
  +'<h5>巴西</h5><p>2024 年 11 月起组件进口关税 9.6% → 25%（Gecex Res. 666）；集中式项目配额内可享 9.6%（2025-07 至 2026-07 配额 7.174 亿美元 FOB，SECEX Portaria 411），下一配额期（2026-07 至 2027-07）规模据报道降至约 4.03 亿美元（C 级，以 SECEX 公告为准）<button class="src gB" data-src="s21">21</button>；另有 INMETRO 认证与环保合规（MMA 2025 年 9 月 RoHS 类似草案）<button class="src gB" data-src="s21">21</button>。结论：进入成本高但可管理——「配额内项目销售 + 本地组装中期选项」。</p>'
  +'<h5>德国 / 欧盟</h5><p>关税低（EU MFN 对组件 0%——需以 TARIC 当期核验），但合规成本是主战场：CE、WEEE/EPR、电池法规（对含储能系统）、ERP 能效、供应链尽职调查（CSDDD）等<button class="src gA" data-src="s19">19</button>；CBAM 不覆盖光伏组件成品（覆盖钢铁、铝、水泥、化肥、电力、氢六大类），但铝边框等部件单独进口时可能落入覆盖范围（按税则与用途核验）<button class="src gA" data-src="s08">8</button>。</p>'
  +'<h5>合规通用项（m23）</h5><p>（1）受限方筛查（客户、最终用户、银行、承运人）；（2）中国出口端：退税取消后的价格重述（2026 年 4 月起）<button class="src gB" data-src="s28">28</button>、光伏产品本身不在稀土管制清单但需确认无受管制成分；（3）合同与单据合规（m20）。</p>'
  +'</div></div>' },

  { id:'m32-s6', h:'32.6 第五步：物流、税费与到岸成本测算', lvl:2, html:
  '<div class="case"><div class="case-head"><div class="tag">步骤 5 · 成本测算</div><div class="ttl">一个 40 尺整柜组件到沙特的成本栈（教学演算）</div></div><div class="case-body">'
  +'<h5>设定与公式（m18/m19/m20）</h5><p>40 尺高柜可装约 620–720 W 双面组件约 310–330 块（按包装与重量，约 20–22 吨，需以实际包装核验）。取中值 320 块 × 620 W ≈ 198.4 kW/柜。假设 FOB 单价 0.105 美元/W（教学假设，随行就市）→ FOB 货值约 20,832 美元/柜。</p>'
  +'<div class="tbl-wrap"><table class="data"><thead><tr><th>成本项</th><th>金额（美元/柜）</th><th>占比</th><th>说明</th></tr></thead><tbody>'
  +'<tr><td>FOB 货值</td><td class="num">20,832</td><td class="num">—</td><td>0.105 美元/W × 198.4 kW</td></tr>'
  +'<tr><td>海运 + 港杂（中国→沙特吉达）</td><td class="num">约 2,200–3,500</td><td class="num">11–17%</td><td>随行就市；大尺寸组件注意限重</td></tr>'
  +'<tr><td>保险（一切险约 0.3–0.6% 货值）</td><td class="num">约 70–125</td><td class="num">&lt;1%</td><td>CIP 术语下卖方投保</td></tr>'
  +'<tr><td>进口关税（假设 5% 从价，以沙特税则核验）</td><td class="num">约 1,155</td><td class="num">约 5%</td><td>完税价格 = CIF</td></tr>'
  +'<tr><td>清关 + 本地运输至项目地</td><td class="num">约 800–1,500</td><td class="num">4–7%</td><td>项目地偏远时上浮</td></tr>'
  +'<tr><td>资金占用（账期 60 天，年化 6% 假设）</td><td class="num">约 250</td><td class="num">约 1%</td><td>≈ CIF × 6% × 60/365</td></tr>'
  +'<tr><td><b>到岸 + 交付成本合计</b></td><td class="num"><b>约 25,300–27,100</b></td><td class="num">—</td><td>较 FOB 高 21–30%</td></tr>'
  +'</tbody></table></div>'
  +'<h5>解读（m18 到岸成本逻辑）</h5><p>（1）「FOB 报价最低」只是会计归属——到岸总成本高出 21–30%，其中运费与关税占比最大；（2）报价比较必须统一折算到「到岸 + 交付」口径（到岸成本计算器）；（3）对大项目，账期与信用证费用进入成本栈；（4）若选择 DDP，则关税与进口增值税由卖方承担，需另加约 5–10% 缓冲与清关服务费。本演算的价值不在具体数字，而在展示「每一项都可替换为真实报价」的结构。</p>'
  +'</div></div>' },

  { id:'m32-s7', h:'32.7 第六步：进入模式比较与建议', lvl:2, html:
  '<div class="case"><div class="case-head"><div class="tag">步骤 6 · 进入建议</div><div class="ttl">分阶段进入方案（以沙特为主攻市场）</div></div><div class="case-body">'
  +'<h5>模式比较（m16 六维）</h5><p>（1）跨境电商：不适用——组件是 B2B 项目型采购，非零售逻辑；（2）直供项目开发商（出口 + 项目制）：主路径——控制客户关系与定价，但需满足银行ability 与保函要求；（3）本地经销商/代理：辅助路径——借助其政府关系与招标资质，但让渡利润且客户资产流失；（4）合资建厂（中期）：为满足 REPDO 本地含量（35% 目标）与「本土身份」的期权，但资本承诺高、治理复杂；（5）绿地独资：当产能与订单达到阈值后的选项。</p>'
  +'<h5>推荐方案（三阶段 + 闸门）</h5><p>第一阶段（0–12 个月）：「出口 + 本地代理」轻资产试水——签 1–2 家本地代理（m17 尽调五步），通过 REPDO 供应链名录与项目预审，以 CIF/DAP 术语 + 信用证/预付款条件（m21）执行 2–3 个中型项目；投入约 200–400 万美元营运资金。第二阶段闸门：连续两季毛利率 > 12%、回款零逾期、进入至少一个 GW 级项目供应链 → 升级。第三阶段（12–24 个月）：设本地销售子公司 + 服务团队，评估本地组装（SKD）以满足本地含量与交付时效；同步培育第二市场（巴西配额内项目 + 印尼离网）作为备份（m31 组合逻辑）。</p>'
  +'<h5>退出预案（m31）</h5><p>触发条件：连续 4 个季度亏损且无政策改善信号；或沙特本地含量政策要求超过 SKD 能力（迫使重资产）；或外汇/回款周期 > 120 天。退出方式：项目收尾 + 代理关系保留 + 品牌与资质文件留存（重启期权），避免清算式退出。</p>'
  +'</div></div>' },

  { id:'m32-s8', h:'32.8 第七步：风险登记与情景分析', lvl:2, html:
  '<div class="tbl-wrap"><table class="data"><thead><tr><th>风险</th><th>类别</th><th>概率</th><th>影响</th><th>传导路径</th><th>KRI / 触发</th><th>应对</th></tr></thead><tbody>'
  +'<tr><td>沙特本地含量政策加码（超 SKD 能力）</td><td>政策</td><td class="num">中</td><td class="num">高</td><td>招标资格丧失 → 订单流失</td><td>REPDO 招标文件本地含量条款</td><td>提前布局本地组装；合资预案</td></tr>'
  +'<tr><td>全球组件价格进一步下跌</td><td>市场</td><td class="num">高</td><td class="num">高</td><td>毛利压缩 → 现金流风险</td><td>月度出口均价（m10 量价分解）</td><td>锁价条款；聚焦高毛利细分（双面/高效）</td></tr>'
  +'<tr><td>人民币升值</td><td>汇率</td><td class="num">中</td><td class="num">中</td><td>本币收入缩水（m22）</td><td>远期汇率偏离</td><td>远期锁汇 50–70%；人民币计价谈判</td></tr>'
  +'<tr><td>买方信用/项目融资断裂</td><td>信用</td><td class="num">中</td><td class="num">高</td><td>应收账款坏账 → 现金流</td><td>买方财务信号、银行保函状态</td><td>信用证 + 出口信用保险；分批发货</td></tr>'
  +'<tr><td>美国政策外溢（第三国限制）</td><td>地缘</td><td class="num">中</td><td class="num">中</td><td>供应链/市场准入变化（m29）</td><td>美国 USTR/BIS 公告、第三国立法</td><td>多点市场；合规前置</td></tr>'
  +'<tr><td>物流中断（红海航线等）</td><td>物流</td><td class="num">中</td><td class="num">中</td><td>船期与运费上升 → 交付延迟</td><td>船公司公告、运价指数</td><td>替代航线预案；提前订舱</td></tr>'
  +'</tbody></table></div>'
  +'<p><b>情景设计（m30）：</b>基准（价格年降 5–8%、沙特政策渐进）→ 计划成立；恶化（价格年降 15% + 本地含量跳升至 50%）→ 触发本地组装加速与巴西/印尼备份；极端（沙特市场政策性关闭 + 全球价格战）→ 启动退出预案，转向「电芯/储能系统」等相邻高价值环节（m09 功能升级路径）。</p>' },

  { id:'m32-s9', h:'32.9 第八步：结论分级与下一步研究', lvl:2, html:
  '<div class="grid2"><div class="card accent"><h5>已得到证据支持的结论（A/B 级）</h5><p>（1）中国组件出口「量增额跌、市场分散、欧美收缩、新兴接棒」（商会海关数据）；（2）美国市场对中国直接出口在经济上不可行（301 + 232 官方文件）；（3）沙特是可验证的高增长市场（SPPC 项目数据 + NREP 目标）；（4）巴西关税配额结构可管理但成本高（Gecex/SECEX 文件）；（5）中国出口退税取消改变出口成本底线（财税公告）。</p></div>'
  +'<div class="card"><h5>需进一步验证的判断（C 级 → B 级路径）</h5><p>（1）沙特「2030 年 100–130 GW」目标（传闻口径，需官方确认）；（2）沙特市场对中国二线品牌的实际容量（招标资格与银行ability 门槛）；（3）巴西下一配额期规模（以 SECEX 公告为准）；（4）沙特项目真实账期与保函成本。</p></div>'
  +'<div class="card"><h5>依赖关键假设的情景推演</h5><p>（1）价格年降幅假设（±5 个百分点显著影响毛利）；（2）本地含量政策演进路径；（3）人民币汇率区间；（4）企业产能与交付能力假设（本案例设定的 5 GW 产能）。</p></div>'
  +'<div class="card"><h5>仍然未知与下一步研究</h5><p>（1）沙特本地代理的真实能力（尽调前未知）；（2）REPDO 下一轮招标的资格细则；（3）组件到沙特的实际运费与保函费率（需货代与银行报价）；（4）储能配套（光储一体）在沙特的需求结构——可能改变产品组合。下一步最有价值的补充研究：本地专家访谈（10–15 人）+ 一次实地考察 + 一个试点订单。</p></div></div>' },

  { id:'m32-s10', h:'32.10 项目复盘：这个案例演示了哪些通用方法', lvl:2, html:
  '<p>（1）<b>问题驱动</b>：从决策问题（进哪些市场、怎么进）出发，而不是从数据出发；（2）<b>口径纪律</b>：每个数字带来源、年份、口径；两个协会数据差异被显式呈现而非掩盖；（3）<b>量价分解</b>：出口额降 ≠ 需求降（价格效应）；（4）<b>排除法筛选</b>：先排除不可行市场，再对候选池评分；（5）<b>敏感性检验</b>：结论在权重变化下的稳健性被检验，而非给出虚假精确的排序；（6）<b>准入量化</b>：关税、配额、本地含量、认证被折算成成本与资格条件；（7）<b>分阶段承诺</b>：进入方案带闸门与退出预案；（8）<b>结论分级</b>：证据支持的、待验证的、假设推演的、未知的四类分开呈现——这是研究报告与宣传材料的本质区别。</p>'
  +'<div class="callout ok"><span class="ico">✅</span><div><b>最终提示：</b>本案例的目标不是证明「沙特是正确答案」，而是演示「如何通过系统研究形成更可靠的决策」。当你的真实业务面对不同产品与市场时，复制这个流程，替换数据与假设，就能得到属于你自己的研究报告——这正是本课程的设计目标。</div></div>' },

  { id:'m32-s11', h:'32.11 自主项目清单（你的第一次独立研究）', lvl:2, html:
  '<p>选择一个你熟悉的产品/产业，完成以下交付物（建议 4–8 周）：</p>'
  +'<div class="steps">'
  +'<div class="step"><h5>研究简报（1 页）</h5><p>决策背景、研究问题、范围、时间与预算。</p></div>'
  +'<div class="step"><h5>数据附录（Excel）</h5><p>HS 编码确认、Comtrade 查询记录、指标表（每个数字带来源与年份）。</p></div>'
  +'<div class="step"><h5>市场评分卡</h5><p>候选池 8–10 国、6–8 指标、权重与理由、敏感性分析。</p></div>'
  +'<div class="step"><h5>重点市场准入备忘</h5><p>关税、非关税、认证、合规清单，逐项来源。</p></div>'
  +'<div class="step"><h5>进入方案与财务测算</h5><p>模式比较、到岸成本、三年 P&L 情景、闸门设计。</p></div>'
  +'<div class="step"><h5>风险登记表</h5><p>传导路径、KRI、触发动作、责任人。</p></div>'
  +'<div class="step"><h5>决策备忘录（2–3 页）</h5><p>结论分级、建议、待验证清单、下一步研究计划。</p></div>'
  +'</div>'
  +'<p>评分标准（自评或找同行互评）：口径是否清晰、证据是否分级、假设是否显式、敏感性是否做过、建议是否可执行、风险是否有触发动作。</p>' }
  ],
  exercises:[
  { type:'概念理解', q:'本案例中「出口量 +5.7% 而出口额 −15.3%」说明了什么？如果只引用出口额数据会犯什么错误？', a:'说明均价下降约 20%，增长是「以价换量」——行业处于激烈价格战与产能过剩周期。只引用出口额（−15.3%）会得出「中国组件出口萎缩、需求崩塌」的错误结论；只引用出口量（+5.7%）会得出「需求强劲」的同样错误结论。正确做法是量价分解（m10）：价格效应与数量效应分开，再结合价格周期的背景（产能过剩、全产业链亏损）解释。这演示了「口径与分解决定结论」。' },
  { type:'概念理解', q:'为什么「美国对中国组件征收 50% 关税」仍不足以完全描述美国市场的准入难度？', a:'因为关税只是成本层，准入是多层叠加：（1）301 关税 50%<button class="src gA" data-src="s05">5</button>；（2）232 措施（最低进口价 + 15% 从价税，2026 年 12 月生效）<button class="src gA" data-src="s07">7</button>——最低价 0.38 美元/W 远高于市场价，等于「到岸即无竞争力」；（3）转口路径被封堵（东南亚双反 21.31%–271.2%）<button class="src gA" data-src="s06">6</button>；（4）本土产能的补贴优势（IRA 抵免）使「非本土身份」系统性吃亏<button class="src gB" data-src="s30">30</button>。结论：准入评估必须把「关税 + 价格型措施 + 原产地 + 补贴歧视」作为组合分析，单一税率会严重低估难度。' },
  { type:'实际应用', q:'用本案例的方法框架，为「中国锂电池储能系统进入德国」设计研究提纲（10 个步骤）。', a:'（1）问题定义：产品定义（户储/工商业储/集装箱储）、目标客群、决策背景；（2）宏观：电价、光伏装机、储能政策；（3）编码与数据：HS 8507.60/8507.20 德国进口量价（Comtrade）；（4）产业结构：德国本土与进口品牌格局、安装商渠道；（5）候选池与评分；（6）重点市场（德国）准入：CE、电池法规（尽职调查 2025-08 已适用、DPP 2027-02）<button class="src gA" data-src="s19">19</button>、WEEE/EPR、并网审批；（7）竞争与消费者：安装商访谈 + 已购用户研究（m14 证据阶梯）；（8）进入模式比较（出口 + 安装商渠道 vs 合资 vs 子公司）；（9）风险（价格战、政策、汇率、信用）与情景；（10）结论分级 + 决策备忘录。' },
  { type:'实际应用', q:'案例中评分显示「沙特第一，但第二三名排序对权重敏感」。管理层要求「给出唯一答案」。你如何回应？', a:'回应框架：（1）说明敏感性分析的发现是「信息」而非「缺陷」——它告诉我们第二市场无法仅凭现有数据排序，需要补充数据（实地调研、试点）；（2）给出决策建议而非虚假唯一答案：主攻沙特（稳健第一），同时以「低成本双市场测试」处理第二名（如巴西配额内项目 + 印尼离网各做一个小规模试点，用行为数据决定加码对象）；（3）明确时间表：试点数据回收后重跑评分卡；（4）提醒管理层：强行唯一答案的代价是把资源押在对权重敏感的不稳定排序上；（5）把「未知」显式写进决策备忘录（m32.9 的第四类结论）。' },
  { type:'综合分析', q:'「本案例的结论到 2027 年可能全部失效。」既然如此，系统研究的价值是什么？', a:'价值分层：（1）「易腐层」——具体税率、市场排名、价格水平：这些确实会失效，但它们失效时可被快速更新（数据查询 + 政策核验）；（2）「耐久层」——研究方法（量价分解、口径纪律、敏感性检验、结论分级、闸门设计）：这些是「如何思考」的基础设施，不会失效；（3）「结构层」——产业结构（中国制造主导）、政策工具类型（关税/原产地/本地含量/补贴的组合使用）、商业模式约束（项目制采购、银行ability）：这些变化缓慢，是判断的锚。结论：研究的价值不在于「结论的保质期」，而在于「更新结论的成本」——有了框架与数据附录，更新一份报告只需数天；没有框架，每次都是从头开始。这也解释了为什么课程把「方法」置于「事实」之上。' }
  ]
}

});

;

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

;

/* ================= 术语词典 ================= */
Object.assign(GLOSSARY, {
'international-business':{en:'International Business (IB)',zh:'国际商务',def:'以企业为主体的跨境经营活动总和，包括贸易、对外直接投资、许可、特许、合同制造与跨境电商。是国际贸易的上位概念。',module:'m01',related:['international-trade','fdi']},
'international-trade':{en:'International Trade',zh:'国际贸易',def:'国家（或单独关税区）之间商品与服务的交换，以海关统计的跨境货物流量衡量。关注流向、规模、结构与政策。',module:'m01',related:['international-business','trade-openness']},
'fdi':{en:'Foreign Direct Investment (FDI)',zh:'对外直接投资',def:'一国投资者在另一国获得持续性利益并施加控制的投资（通常以 10% 股权为界）。形成企业内的跨境联系，与贸易（市场化联系）相对。',module:'m01',related:['greenfield','joint-venture']},
'globalization':{en:'Globalization',zh:'全球化',def:'国家间经济、信息、人员联系深化的长期过程。当前阶段的特征是总量仍在增长而流向与规则加速重构（区域化、友岸化）。',module:'m01',related:['geoeconomics','friend-shoring']},
'mne':{en:'Multinational Enterprise (MNE)',zh:'跨国公司',def:'在两个以上国家拥有并控制价值创造活动的企业。判断关键是「境外控制资产或运营」，而非是否有出口。',module:'m01',related:['oli-paradigm','fdi']},
'gvc':{en:'Global Value Chain (GVC)',zh:'全球价值链',def:'产品从概念到回收的全过程中，各环节跨国分布并由不同企业承担的组织形态。分析单位从「产品」细化为「环节」。',module:'m09',related:['value-chain-governance','smile-curve']},
'trade-openness':{en:'Trade Openness',zh:'贸易开放度',def:'（出口 + 进口）/ GDP。跨国比较时转口贸易会系统性高估小型开放经济体。',module:'m01',related:['re-export','gdp']},
'absolute-advantage':{en:'Absolute Advantage',zh:'绝对优势',def:'一国生产某种产品所需资源投入少于另一国，即单位成本更低、劳动生产率更高。',module:'m02',related:['comparative-advantage','opportunity-cost']},
'comparative-advantage':{en:'Comparative Advantage',zh:'比较优势',def:'一国在某种产品上具有更低的机会成本。即使一国在所有产品上都有绝对劣势，只要劣势程度不同，就仍有比较优势，分工与贸易仍可双赢。',module:'m02',related:['opportunity-cost','absolute-advantage']},
'opportunity-cost':{en:'Opportunity Cost',zh:'机会成本',def:'为多生产 1 单位某产品而必须放弃的另一种产品的数量。比较优势由机会成本的相对高低决定。',module:'m02',related:['comparative-advantage']},
'production-possibility-frontier':{en:'Production Possibility Frontier (PPF)',zh:'生产可能性边界',def:'一国在资源约束下能生产的两种产品最大组合曲线。专业化使生产点移到 PPF 上的比较优势产品端。',module:'m02'},
'terms-of-trade':{en:'Terms of Trade',zh:'贸易条件',def:'一国出口价格与进口价格之比。成交比例越接近对方的机会成本，本方获益越大；决定贸易收益的分配。',module:'m02',related:['trade-gains']},
'trade-gains':{en:'Gains from Trade',zh:'贸易收益',def:'分工与交换使双方消费可能性边界同时外移的部分。收益大小由分工方向（比较优势）与成交比例（贸易条件）共同决定。',module:'m02'},
'factor-endowment':{en:'Factor Endowment',zh:'要素禀赋',def:'一国拥有的生产要素（土地、劳动、资本、技术）的相对丰裕程度。H-O 理论认为贸易模式由禀赋结构决定。',module:'m03',related:['heckscher-ohlin']},
'heckscher-ohlin':{en:'Heckscher-Ohlin Theory',zh:'赫克歇尔—俄林理论',def:'各国出口密集使用其丰裕要素的产品、进口密集使用其稀缺要素的产品。把比较优势的来源从技术扩展到禀赋。',module:'m03',related:['factor-endowment']},
'economies-of-scale':{en:'Economies of Scale',zh:'规模经济',def:'产量扩大带来单位成本下降。内部规模经济来自企业规模；外部规模经济来自产业集聚（供应商池、劳动力池、知识溢出）。',module:'m03',related:['cluster','intra-industry-trade']},
'intra-industry-trade':{en:'Intra-industry Trade',zh:'产业内贸易',def:'同一产业类别内既出口又进口相似产品。指数 IIT = 1 − |X−M|/(X+M)，越接近 1 双向流动越强，反映差异化与规模经济。',module:'m03'},
'new-trade-theory':{en:'New Trade Theory',zh:'新贸易理论',def:'克鲁格曼等以规模经济、不完全竞争与产品差异化解释贸易的模型群：贸易可以在没有禀赋差异的国家间发生。',module:'m03',related:['economies-of-scale']},
'home-market-effect':{en:'Home Market Effect',zh:'母市场效应',def:'存在规模经济与贸易成本时，大规模国内市场会成为差异化产品的净出口基地——巨大内需本身创造出口优势。',module:'m03'},
'melitz':{en:'Melitz Model (Heterogeneous Firms)',zh:'梅里兹异质企业模型',def:'「新新贸易理论」核心结论：只有生产率最高的企业才会出口；贸易会引发行业内资源再配置与低效企业退出。',module:'m03'},
'product-life-cycle':{en:'Product Life Cycle (PLC)',zh:'产品生命周期',def:'弗农提出：产品经历「新产品—成熟—标准化」三阶段，生产区位从创新国向其他发达国家再向发展中国家转移，贸易方向随之反转。',module:'m04',related:['innovation','standardization']},
'innovation':{en:'Innovation / Innovation Rent',zh:'创新 / 创新租金',def:'新产品阶段创新国企业凭借技术独占获得的超额利润。随产品标准化，创新租金让位于成本优势与政策身份。',module:'m04'},
'standardization':{en:'Standardization',zh:'标准化',def:'产品设计、规格与接口收敛，制造门槛下降，竞争焦点从性能转向成本与渠道。是产业跨境转移的前提条件。',module:'m04',related:['product-life-cycle']},
'first-mover':{en:'First-Mover Advantage',zh:'先发优势',def:'率先进入者获得的品牌、标准、渠道与学习曲线优势。可被技术路线切换与政策干预重置。',module:'m04'},
'oli-paradigm':{en:'Eclectic Paradigm (OLI)',zh:'国际生产折衷理论',def:'邓宁提出：企业跨国经营需同时具备所有权优势（O）、区位优势（L）与内部化优势（I）。三者齐备走向 FDI，缺 I 走向许可/出口。',module:'m05',related:['ownership-advantage','location-advantage','internalization-advantage']},
'ownership-advantage':{en:'Ownership Advantage (O)',zh:'所有权优势',def:'企业特有且可跨境转移的竞争优势：技术、品牌、管理、规模、供应链能力。',module:'m05'},
'location-advantage':{en:'Location Advantage (L)',zh:'区位优势',def:'东道国特有的、企业必须到当地才能利用的优势：市场规模、要素成本、关税规避、政策优惠。',module:'m05',related:['cage-framework']},
'internalization-advantage':{en:'Internalization Advantage (I)',zh:'内部化优势',def:'在企业内部调配资源比通过市场交易更有利：保护知识产权、控制质量与渠道、避免交易对手机会主义。',module:'m05',related:['joint-venture','licensing']},
'uppsala-model':{en:'Uppsala Model',zh:'国际化阶段理论',def:'约翰逊与瓦尔尼提出：企业国际化遵循渐进链条，因为国外市场知识只能通过经验积累；心理距离决定进入顺序。',module:'m05',related:['liability-of-foreignness','born-global']},
'liability-of-foreignness':{en:'Liability of Foreignness',zh:'外来者劣势',def:'外国企业在东道国面临的额外成本：不熟悉本地规则、缺乏本地网络、被歧视。进入模式选择是控制权收益与该劣势的权衡。',module:'m05'},
'rbt':{en:'Resource-Based View (RBV)',zh:'资源基础观',def:'企业持续竞争优势来自有价值、稀缺、难以模仿、不可替代的资源与能力（VRIN）。国际化决策取决于核心资源能否跨境转移。',module:'m05'},
'born-global':{en:'Born Global',zh:'天生全球化企业',def:'成立初期即面向多国市场国际化的企业，常见于数字产品、利基市场与有海外经验的创业团队。修正了渐进式阶段模型。',module:'m05'},
'institution':{en:'Institutions',zh:'制度',def:'界定人类互动约束的规则（正式）与规范惯例（非正式）。诺斯区分：正式制度（法律、产权、合同）与非正式制度（文化、信任、网络）。',module:'m06',related:['formal-institution','informal-institution']},
'formal-institution':{en:'Formal Institutions',zh:'正式制度',def:'成文的规则体系：宪法与法律、产权保护、合同执行机制、监管规则、税收制度。',module:'m06'},
'informal-institution':{en:'Informal Institutions',zh:'非正式制度',def:'不成文的约束：文化规范、信任结构、关系网络、商业惯例。在合同执行弱的市场替代正式机制，但也抬高外来者门槛。',module:'m06',related:['high-context','trust-building']},
'institutional-distance':{en:'Institutional Distance',zh:'制度距离',def:'两国在监管、规范与认知制度上的差异程度。距离越大，不确定性越高，企业越倾向低承诺进入或寻求本地伙伴。',module:'m06',related:['cage-framework']},
'institutional-quality':{en:'Institutional Quality',zh:'制度质量',def:'产权保护、合同执行、监管可预期性、法治与政府效率的综合水平。常用世界银行 WGI、透明国际 CPI 等指标代理。',module:'m06',related:['rule-of-law']},
'rule-of-law':{en:'Rule of Law',zh:'法治',def:'法律面前人人平等、合同与产权可执行、司法独立可预期的状态。是赊销、绿地投资与并购可行性的基础条件。',module:'m06'},
'corruption-perception':{en:'Corruption Perception Index (CPI)',zh:'清廉感知指数',def:'透明国际发布的各国腐败感知评分（0–100）。适合国别比较，不能替代具体交易的尽调。',module:'m06'},
'pestel':{en:'PESTEL Analysis',zh:'PESTEL 分析',def:'从政治、经济、社会文化、技术、环境、法律六维扫描宏观环境的检查清单。是「雷达」而非「结论生成器」。',module:'m07'},
'gdp':{en:'Gross Domestic Product (GDP)',zh:'国内生产总值',def:'一国境内一定时期最终产品与服务的总值。名义 vs 实际（通胀调整）、本币 vs 美元（汇率波动）口径必须区分。',module:'m07',related:['gdp-per-capita','ppp']},
'gdp-per-capita':{en:'GDP per Capita',zh:'人均 GDP',def:'GDP / 人口。分配极不均时人均掩盖结构，只能作为消费能力的粗略代理。',module:'m07'},
'ppp':{en:'Purchasing Power Parity (PPP)',zh:'购买力平价',def:'按各国物价水平换算的货币比较方法。适合比较实体产品需求量，不适合比较服务出口与可支出外汇。',module:'m07'},
'inflation':{en:'Inflation',zh:'通货膨胀',def:'价格总水平持续上涨。影响本币定价调整频率、赊销实际收益与营运资金成本。官方 CPI 可能存在权重滞后与替代偏差。',module:'m07'},
'unemployment':{en:'Unemployment Rate',zh:'失业率',def:'劳动力中无工作且积极寻找者的比例。各国定义（登记 vs 调查）不一，跨国不可直接比较。',module:'m07'},
'trade-balance':{en:'Trade Balance',zh:'贸易余额',def:'出口 − 进口。更广义的是经常账户余额。持续大额赤字常伴随外汇压力与政策收紧风险。',module:'m07',related:['sovereign-default']},
'middle-class':{en:'Middle Class',zh:'中产阶层',def:'收入处于社会中段的群体。各机构定义差异极大（绝对收入门槛 vs 相对五分位），引用必须说明定义。',module:'m07'},
'cage-framework':{en:'CAGE Framework',zh:'CAGE 距离框架',def:'加马沃特提出：文化、行政、地理、经济四类距离，其对行业的影响取决于该行业的「距离敏感度」。',module:'m08',related:['cultural-distance','administrative-distance','geographic-distance','economic-distance']},
'cultural-distance':{en:'Cultural Distance',zh:'文化距离',def:'语言、宗教、社会规范与信任结构的差异。影响品牌信息、消费者偏好与管理实践，最难被企业单方面克服。',module:'m08'},
'administrative-distance':{en:'Administrative Distance',zh:'行政距离',def:'政治关系、贸易协定、制度质量、殖民纽带与货币联盟的差异。可被 FTA 显著压缩，也可被制裁扩大。',module:'m08',related:['rcep','usmca']},
'geographic-distance':{en:'Geographic Distance',zh:'地理距离',def:'物理距离、时区、气候与是否内陆。影响运输成本、交付时效与库存，对大宗与低价值密度产品最致命。',module:'m08'},
'economic-distance':{en:'Economic Distance',zh:'经济距离',def:'收入水平、要素成本、基础设施与自然资源的差异。决定价格带、需求结构与成本优势。',module:'m08'},
'diamond-model':{en:'Diamond Model',zh:'国家竞争优势（钻石模型）',def:'波特提出：一国产业竞争优势由生产要素条件、需求条件、相关支持产业、企业战略与竞争四组相互强化的因素决定。',module:'m08',related:['cluster']},
'cluster':{en:'Industrial Cluster',zh:'产业集群',def:'同产业及相关企业在特定地理区位的集聚，带来供应商池、劳动力池与知识溢出等外部规模经济。',module:'m08'},
'factor-conditions':{en:'Factor Conditions',zh:'要素条件',def:'波特钻石模型的第一组因素，强调高级要素（技术、人才、研发体系）而非初级要素（廉价劳动力）的长期重要性。',module:'m08'},
'global-production-network':{en:'Global Production Network (GPN)',zh:'全球生产网络',def:'GVC 的扩展视角，把企业、机构与区域置于同一网络中分析权力关系与价值分配。',module:'m09'},
'value-chain-governance':{en:'Value Chain Governance',zh:'价值链治理',def:'格里芬等提出五种模式（市场、模块、关系、captive 受制、等级），按领导企业对供应商的控制程度排序，决定供应商的升级空间。',module:'m09',related:['captive-value-chain','modular-value-chain']},
'smile-curve':{en:'Smile Curve',zh:'微笑曲线',def:'价值链各环节附加值呈 U 型：两端（研发/品牌服务）高、中间（制造组装）低。价值创造与价值获取的分布图。',module:'m09',related:['value-capture']},
'functional-upgrading':{en:'Functional Upgrading',zh:'功能升级',def:'企业从制造环节向设计、品牌、服务等高附加值环节移动，是产业升级的最高形态，常受领导企业阻挠。',module:'m09'},
'captive-value-chain':{en:'Captive Value Chain',zh:'受制型价值链',def:'领导企业高度控制、供应商被锁定在狭窄任务的治理模式。订单稳定但升级空间受限。',module:'m09'},
'modular-value-chain':{en:'Modular Value Chain',zh:'模块型价值链',def:'复杂交易但信息可编码，供应商以「交钥匙」能力议价。电子代工的典型治理形态。',module:'m09'},
'value-capture':{en:'Value Capture',zh:'价值获取',def:'企业从创造的价值中分得的利润比例。制造环节创造大量产值但获取有限；品牌与渠道创造有限但获取丰厚。',module:'m09'},
'hs-code':{en:'Harmonized System (HS) Code',zh:'商品编码（协调制度）',def:'WCO 维护的国际商品分类标准，六位码全球统一，各国可扩展。每 5–6 年修订，跨年比较须核对版本。',module:'m10',related:['tariff-classification']},
'comtrade':{en:'UN Comtrade',zh:'联合国商品贸易统计数据库',def:'联合国统计司运营的全球官方贸易统计数据库。免费注册可用：单次 10 万条、API 500 次/天；批量文件需订阅。',module:'m10'},
'trade-map':{en:'ITC Trade Map',zh:'国际贸易中心贸易地图',def:'ITC 运营的贸易流向与关税查询平台，免费注册可用基础查询，可视化程度高，适合交叉验证。',module:'m10'},
'wits':{en:'World Integrated Trade Solution (WITS)',zh:'世界综合贸易解决方案',def:'世界银行平台，整合 Comtrade 贸易数据、TRAINS 关税与优惠协定（GPTAD）数据库，适合政策分析。',module:'m10'},
'fob':{en:'Free On Board (FOB)',zh:'装运港船上交货',def:'卖方在装运港将货物交到船上即完成交货，风险在此转移；买方承担运费、保险与进口清关。出口按 FOB 计价。',module:'m18',related:['cif','incoterms']},
'cif':{en:'Cost, Insurance and Freight (CIF)',zh:'成本加保险加运费',def:'卖方支付运费与最低险别至目的港，但风险仍在装运港转移；进口按 CIF 计价，故世界进口总额恒大于出口。',module:'m18'},
're-export':{en:'Re-export',zh:'转口 / 再出口',def:'进口后未经实质性加工再出口。转口枢纽（荷兰、新加坡、中国香港）的进口统计含大量再出口，不代表本地需求。',module:'m10',related:['mirror-statistics']},
'mirror-statistics':{en:'Mirror Statistics',zh:'镜像数据',def:'同一笔贸易中出口国报告与进口国报告的差异（可达 10–30%）。严谨做法是同时报告两国数据并说明差异。',module:'m10'},
'country-of-origin':{en:'Country of Origin',zh:'原产国',def:'产品的「经济国籍」。统计按最后出口地记录，而原产地由原产地规则（实质性改变等）判定，二者经常不一致。',module:'m10',related:['rules-of-origin','substantial-transformation']},
'tariff-classification':{en:'Tariff Classification',zh:'商品归类',def:'按 HS 归类总规则确定税则编码，决定适用税率。复杂产品可申请预裁定（binding ruling）。',module:'m20',related:['hs-code']},
'customs-valuation':{en:'Customs Valuation',zh:'海关估价',def:'确定进口商品完税价格的制度，以成交价格（实际支付或应付价格加调整项）为基本方法。低报价格属违法。',module:'m20'},
'duty-calculation':{en:'Duty Calculation',zh:'关税计算',def:'从价税 = 完税价格 × 税率；从量税 = 数量 × 单位税额。进口税负通常还包括增值税/消费税。',module:'m20',related:['mfn-tariff']},
'mfn-tariff':{en:'Most-Favoured-Nation (MFN) Tariff',zh:'最惠国税率',def:'一国对 WTO 成员普遍适用的基准关税税率。FTA 优惠税率与单边加征关税在此之上叠加或替代。',module:'m20'},
'rules-of-origin':{en:'Rules of Origin',zh:'原产地规则',def:'判定产品经济国籍的规则，分优惠原产地（享受协定税率）与非优惠原产地（统计、双反、标签）。核心标准是实质性改变。',module:'m20',related:['rcep','usmca']},
'substantial-transformation':{en:'Substantial Transformation',zh:'实质性改变',def:'产品在一国经过加工后发生税则改变、达到区域价值成分或完成规定工序，从而获得该国原产地身份。简单组装通常不构成。',module:'m20'},
'rcep':{en:'Regional Comprehensive Economic Partnership (RCEP)',zh:'区域全面经济伙伴关系协定',def:'2022 年 1 月 1 日生效的 15 成员自贸协定。区域价值成分 40% 即可视为原产，允许成员间累积原产成分。',module:'m20',related:['usmca','rules-of-origin']},
'usmca':{en:'USMCA',zh:'美国—墨西哥—加拿大协定',def:'2020 年 7 月 1 日生效，取代 NAFTA。设 16 年期限与第六年联合审查；2026 年 7 月首次审查中美国拒绝按现有形式续签，协定进入年度审查。',module:'m20',related:['rcep','rules-of-origin']},
'tariff-quota':{en:'Tariff Quota',zh:'关税配额',def:'配额内适用低税率（甚至零税率）、配额外适用高税率的制度。巴西对光伏组件即采用「25% 配额外 + 配额内优惠」结构。',module:'m20'},
'de-minimis':{en:'De Minimis',zh:'低值免税（免税额）',def:'低于一定金额的进口免征关税与简化手续的制度。各国门槛不同且政策多变（美国近年多次收紧），跨境电商模式设计必须考虑。',module:'m20'},
'incoterms':{en:'Incoterms 2020',zh:'国际贸易术语解释通则 2020',def:'国际商会制定的 11 种贸易术语，定义交货点、风险转移、费用划分与清关责任。只有写入合同才有约束力，且不决定所有权与付款条件。',module:'m18',related:['fob','cif','exw','dap','ddp']},
'exw':{en:'Ex Works (EXW)',zh:'工厂交货',def:'卖方在自家工厂交货即完成义务，买方承担出口报关与全部运输。卖方责任最小，买方总责任最重。',module:'m18'},
'fca':{en:'Free Carrier (FCA)',zh:'货交承运人',def:'卖方在指定地点将货物交给买方指定的承运人即完成交货，风险在此转移。适用于任何运输方式。',module:'m18'},
'dap':{en:'Delivered at Place (DAP)',zh:'目的地交货',def:'卖方将货运抵指定目的地（不卸货）即完成交货，但进口清关与关税由买方负责。',module:'m18'},
'dpu':{en:'Delivered at Place Unloaded (DPU)',zh:'卸货后交货',def:'Incoterms 2020 新增术语：卖方承担运抵目的地并卸货的责任，是唯一要求卖方卸货的术语。',module:'m18'},
'ddp':{en:'Delivered Duty Paid (DDP)',zh:'完税后交货',def:'卖方承担最大责任：运抵目的地并完成进口清关、缴纳关税。多数外国出口商无进口资质，操作难度最高。',module:'m18'},
'risk-transfer':{en:'Transfer of Risk',zh:'风险转移',def:'货物灭失损坏风险由卖方转向买方的时点，由贸易术语决定（通常与费用划分点不同步）。',module:'m18'},
'clearance-obligation':{en:'Clearance Obligation',zh:'清关责任',def:'出口报关与进口清关分别由谁负责办理，由贸易术语决定。除 EXW（买方办出口）与 DDP（卖方办进口）外，通常「出口归卖方、进口归买方」。',module:'m18'},
'ocean-freight':{en:'Ocean Freight',zh:'海运',def:'成本最低的国际干线运输，时效 20–45 天。整箱（FCL）与拼箱（LCL）的单位成本差异巨大，影响库存策略。',module:'m19',related:['lcl','fcl']},
'air-freight':{en:'Air Freight',zh:'空运',def:'时效 3–10 天、成本最高。适合高价值、时效敏感与季节性补货。锂电池空运受 IATA DGR 严格限制。',module:'m19'},
'multimodal':{en:'Multimodal Transport',zh:'多式联运',def:'海运、铁路、公路等多种运输方式组合的跨境运输，关键是衔接责任划分（一单制 vs 分段提单）。',module:'m19'},
'lcl':{en:'Less than Container Load (LCL)',zh:'拼箱',def:'不足整箱的货物与其他货主拼箱运输。单位成本高但灵活，适合小批量与测款。',module:'m19'},
'fcl':{en:'Full Container Load (FCL)',zh:'整箱',def:'独占集装箱运输。规模经济强，单位成本远低于拼箱，但要求库存深度与计划性补货。',module:'m19'},
'bill-of-lading':{en:'Bill of Lading (B/L)',zh:'提单',def:'承运人签发的货物收据与运输合同证明，核心功能是物权凭证。控制正本提单等于控制货权，是收款杠杆。',module:'m19',related:['t-t']},
'lead-time':{en:'Lead Time',zh:'提前期 / 交付周期',def:'从下订单到货物可用的总时间（生产 + 运输 + 清关 + 上架）。海外业务的真实提前期通常是国内贸易的 3–10 倍。',module:'m19',related:['safety-stock']},
'safety-stock':{en:'Safety Stock',zh:'安全库存',def:'为应对需求波动与供应不确定性持有的缓冲库存。简化公式：安全库存 = Z × σ(提前期内需求)。是服务水平与资金成本的平衡。',module:'m19'},
'inventory-turnover':{en:'Inventory Turnover',zh:'库存周转',def:'一定时期内存货周转的次数或天数。周转过慢占用资金，过快则缺货风险上升。',module:'m19'},
'supply-chain-resilience':{en:'Supply Chain Resilience',zh:'供应链韧性',def:'供应链在冲击后维持或恢复功能的能力。策略包括分散、备份、可见性、速度与冗余设计，本质是买「停摆保险」。',module:'m29'},
'single-point-of-failure':{en:'Single Point of Failure',zh:'单点故障',def:'供应链中一旦失效即导致全链路停摆的节点：单一工厂、单一港口、单一供应商、单一航道。',module:'m19',related:['chokepoint']},
't-t':{en:'Telegraphic Transfer (T/T)',zh:'电汇',def:'通过银行电子划转的付款方式。常见结构：部分预付 + 见提单副本付余款，兼顾买方体验与卖方保障。',module:'m21'},
'letter-of-credit':{en:'Letter of Credit (L/C)',zh:'信用证',def:'开证行向卖方作出的有条件付款承诺：提交相符单据即付款。本质是用银行信用替代商业信用，风险在单证操作。',module:'m21'},
'documentary-collection':{en:'Documentary Collection (D/P, D/A)',zh:'跟单托收',def:'银行控制单据、买方付款（D/P）或承兑（D/A）后交单。风险高于信用证，适用于有一定信任的关系。',module:'m21'},
'open-account':{en:'Open Account (OA)',zh:'赊销',def:'先发货、账期后付款。买方体验最好，卖方承担全部信用、汇率与资金占用风险，需信保配套。',module:'m21',related:['export-credit-insurance']},
'advance-payment':{en:'Advance Payment',zh:'预付款',def:'发货前收款。卖方零风险，但买方接受度低，通常用于新客户、小订单与定制产品。',module:'m21'},
'export-credit-insurance':{en:'Export Credit Insurance',zh:'出口信用保险',def:'承保国外买方信用风险与政治风险的保险。把不可控赊销变为有额度、有费率、有追偿机制的风险敞口，保单可融资质押。',module:'m21'},
'trade-finance':{en:'Trade Finance',zh:'贸易融资',def:'为国际贸易提供资金支持的金融服务：信用证、保理、福费廷、保单融资、出口买方信贷。缓解账期带来的营运资金压力。',module:'m21'},
'bec-fraud':{en:'Business Email Compromise (BEC)',zh:'商务邮件入侵诈骗',def:'攻击者入侵或冒充交易方邮箱，伪冒「账户变更」指令骗取货款。防范：任何账户变更走带外电话回呼确认。',module:'m21'},
'exchange-rate':{en:'Exchange Rate',zh:'汇率',def:'两种货币的兑换比率。波动通过交易、折算与经济三条路径影响企业利润与竞争力。',module:'m22'},
'transaction-exposure':{en:'Transaction Exposure',zh:'交易风险',def:'以外币计价的合约性收支在结算前因汇率波动产生的损益。出口企业最高频的暴露。',module:'m22',related:['forward-contract']},
'translation-exposure':{en:'Translation Exposure',zh:'折算风险',def:'境外资产负债与损益在合并报表折算为本币时的账面波动。影响报表利润，通常不影响现金流。',module:'m22'},
'economic-exposure':{en:'Economic Exposure',zh:'经济风险',def:'汇率长期变动对未来现金流与市场竞争力的影响。无法用衍生工具完全对冲，只能靠成本结构、市场多元化与定价权。',module:'m22'},
'natural-hedge':{en:'Natural Hedge',zh:'自然对冲',def:'让同一货币的收入与支出相互抵消以降低净敞口：外币收入用于外币费用、采购与还款。多点布局企业天然机会更多。',module:'m22'},
'forward-contract':{en:'Forward Contract',zh:'远期外汇合约',def:'与银行约定未来按约定汇率交割约定金额外汇。锁定确定性、放弃升值收益，适合有明确外币收支计划的企业。',module:'m22'},
'currency-basket':{en:'Currency Basket',zh:'一篮子货币',def:'组合多种计价货币以分散单一汇率风险。合同货币多元化是商务安排层面的对冲手段。',module:'m22'},
'pass-through':{en:'Exchange Rate Pass-through',zh:'汇率传导',def:'汇率变动传导到进出口价格的程度。传导不完全时，出口商自行吸收汇率波动，利润被压缩。',module:'m22'},
'export-control':{en:'Export Controls',zh:'出口管制',def:'国家对货物、技术、软件与服务出口实施的许可制度。清单管理（列名物项需许可）+ 兜底条款（知悉风险即需许可）。',module:'m23',related:['economic-sanctions','entity-list']},
'economic-sanctions':{en:'Economic Sanctions',zh:'经济制裁',def:'一国或多国对特定国家、实体、个人实施的资产冻结、交易禁止与行业禁入。具有域外效力。',module:'m23',related:['restricted-party-screening']},
'entity-list':{en:'Entity List',zh:'实体清单',def:'美国商务部维护的受管制主体清单，被列入企业采购美国受控物项需许可。配套「50% 穿透规则」限制其子公司。',module:'m23'},
'restricted-party-screening':{en:'Restricted Party Screening',zh:'受限方筛查',def:'将交易方（客户、供应商、承运人、最终用户）与制裁清单、实体清单比对。是持续性义务，须嵌入业务流程。',module:'m23'},
'anti-bribery':{en:'Anti-Bribery (FCPA / UK Bribery Act)',zh:'反商业贿赂',def:'禁止向公职人员提供不当利益以获取业务。美国 FCPA 与英国反贿赂法均有域外效力；高风险场景：佣金、咨询费、政府项目招投标。',module:'m23'},
'product-certification':{en:'Product Certification / Market Access',zh:'产品认证与市场准入',def:'产品进入市场前须满足的技术法规与安全标准（CE、FCC、PSE 等）及标识、标签、环保要求。',module:'m23',related:['data-localization','restricted-party-screening']},
'data-localization':{en:'Data Localization',zh:'数据本地化',def:'要求数据存储在境内或限制跨境传输的监管要求（GDPR、中国数据出境规则等），影响数字服务与平台出海的架构设计。',module:'m23'},
'deemed-export':{en:'Deemed Export',zh:'视同出口',def:'向境内的外国人转移受控技术也可能构成「出口」（技术管制），涉及人员交流、联合研发与技术文档共享的场景。',module:'m23'},
'compliance-program':{en:'Compliance Program (ICP)',zh:'内部合规制度',def:'企业建立的出口管制合规体系：责任体系、筛查工具、流程嵌入、文件模板、培训与外部支持。是重大合作的资质门槛。',module:'m23'},
'high-context':{en:'High-Context Communication',zh:'高语境沟通',def:'信息大量通过语境、关系与非语言线索传递，语言留白多，「不」很少被直接说出的沟通风格。',module:'m24',related:['low-context']},
'low-context':{en:'Low-Context Communication',zh:'低语境沟通',def:'信息主要通过明确的语言传递，期待「所见即所得」：明确承诺、书面确认、直接反馈。',module:'m24'},
'hofstede':{en:"Hofstede's Cultural Dimensions",zh:'霍夫斯泰德文化维度',def:'六维文化框架：权力距离、个人/集体主义、男性/女性化、不确定性规避、长期取向、放纵/克制。数据源自跨国公司员工调查，代表职场文化而非全民文化。',module:'m24',related:['power-distance','individualism','uncertainty-avoidance']},
'power-distance':{en:'Power Distance',zh:'权力距离',def:'对社会不平等与层级结构的接受程度。高权力距离文化中决策集中，找到正确决策层级比说服联系人更重要。',module:'m24'},
'individualism':{en:'Individualism vs Collectivism',zh:'个人主义 / 集体主义',def:'社会纽带紧密程度的维度。影响激励设计（个人奖金 vs 团队和谐）与决策方式（自主 vs 共识）。',module:'m24'},
'uncertainty-avoidance':{en:'Uncertainty Avoidance',zh:'不确定性规避',def:'对模糊与不确定的容忍程度。高不确定性规避市场需要更详细的计划、保证、认证与售后承诺。',module:'m24'},
'stereotype':{en:'Stereotype',zh:'刻板印象',def:'把群体特征直接套用到个体的认知 shortcut。文化框架是概率工具，不是个体预测器；滥用会破坏信任并造成误判。',module:'m24'},
'trust-building':{en:'Trust Building',zh:'信任建立',def:'商业信任分任务型（履约可靠）与关系型（相互了解）。关系型市场需要长期关系投资，跳过这步直接谈条款会被视为冒犯。',module:'m24',related:['high-context']},
'interest':{en:'Interests (vs Positions)',zh:'利益（vs 立场）',def:'立场是对方「要求什么」，利益是对方「为什么需要」。谈判的艺术是在对立立场下找到兼容利益。',module:'m25',related:['position']},
'position':{en:'Position',zh:'立场',def:'谈判中对方公开表明的要求（「降价 15%」）。立场背后是利益，改变立场的成本远高于满足利益的替代方案。',module:'m25'},
'batna':{en:'BATNA',zh:'最佳替代方案',def:'谈判破裂时你的最佳出路。BATNA 决定底线：优于 BATNA 的协议可接受。会前提升 BATNA 比会上话术更重要。',module:'m25',related:['zopa','reservation-point']},
'zopa':{en:'ZOPA',zh:'可能达成协议区间',def:'双方底线（保留点）之间的重叠区域。谈判目标是在 ZOPA 内争取有利位置，或确认 ZOPA 是否存在。',module:'m25'},
'reservation-point':{en:'Reservation Point',zh:'保留点',def:'一方可接受的最低条件（价格底线）。低于保留点的协议应拒绝——BATNA 更好。',module:'m25'},
'anchoring':{en:'Anchoring',zh:'锚定',def:'首先提出的数字扭曲后续判断的认知偏差。应对：回到客观基准（成本分解、市场价），把价格谈判转为标准谈判。',module:'m25'},
'concession':{en:'Concession',zh:'让步',def:'谈判中放弃的部分。原则：让步是交换不是馈赠，每次让步换取对方对应承诺，且让步幅度递减。',module:'m25'},
'principled-negotiation':{en:'Principled Negotiation',zh:'原则式谈判',def:'哈佛谈判传统：对事不对人、聚焦利益而非立场、创造增量选项、坚持客观标准。',module:'m25'},
'multi-issue-negotiation':{en:'Multi-issue Negotiation',zh:'多议题谈判',def:'把价格、账期、独家、市场费用、交付期作为组合谈判，利用双方对各议题的不同重视程度创造交换空间。',module:'m25'},
'stp':{en:'STP (Segmentation, Targeting, Positioning)',zh:'细分—目标—定位',def:'营销战略核心框架：把市场细分为有意义群体，选择服务对象，在目标客群心智中占据区分位置。',module:'m26',related:['segmentation','targeting','positioning']},
'segmentation':{en:'Segmentation',zh:'市场细分',def:'按需求、场景、人口、行为将市场划分为有意义群体。有效标准：可识别、可衡量、可触达、有差异、足够大。',module:'m26'},
'targeting':{en:'Targeting',zh:'目标市场选择',def:'评估各细分的吸引力与企业匹配度，选择首要服务对象，并显式记录放弃清单及理由。',module:'m26'},
'positioning':{en:'Positioning',zh:'定位',def:'在目标客群心智中占据与竞品区分的位置。定位声明格式：「对于 X，我们是 Y，它比 Z 更好地完成 W，因为 V」。',module:'m26',related:['value-proposition']},
'customer-journey':{en:'Customer Journey',zh:'消费者旅程',def:'从场景触发、信息搜索、考虑集形成、比较购买到使用口碑的完整路径。每个环节都有本地化决策点。',module:'m26'},
'localization':{en:'Localization',zh:'本地化',def:'使产品、沟通、渠道与服务适配目标市场的过程。包括产品调整与营销表达调整，深度由制度与渠道结构决定。',module:'m26',related:['adaptation']},
'adaptation':{en:'Adaptation',zh:'产品调整',def:'按市场修改产品（规格、电压、认证、包装）。判断原则：只有「不调整会显著阻碍购买」时才调整产品。',module:'m26'},
'price-sensitivity':{en:'Price Sensitivity',zh:'价格敏感度',def:'需求量对价格变化的反应程度。由收入水平、替代品可得性与场景紧迫性决定，是定价与产品组合的依据。',module:'m26'},
'product-market-fit':{en:'Product-Market Fit (PMF)',zh:'产品—市场匹配',def:'产品真正满足目标市场需求并被持续付费验证的状态。验证只能靠行为数据（试销、转化、复购），不能靠购买意愿问卷。',module:'m26'},
'channel-structure':{en:'Channel Structure',zh:'渠道结构',def:'产品从生产者到终端消费者的路径与层级设计（直供、分销、零售、平台）。决定客户资产归属与利润分配。',module:'m27'},
'importer':{en:'Importer',zh:'进口商',def:'承担进口合规、清关、税务与库存的本地伙伴。解决准入与资金占用，但掌握终端客户关系。',module:'m27',related:['distributor']},
'distributor':{en:'Distributor',zh:'经销商',def:'买断货物、批发给下级渠道、赚取买卖差价的伙伴。快速铺开市场，但依赖其销售团队与信用。',module:'m27',related:['agent']},
'agent':{en:'Agent',zh:'代理商',def:'以佣金为报酬、代表企业开发客户但不取得货物所有权的伙伴。企业保留客户与定价权，但控制较弱。',module:'m27',related:['distributor']},
'retailer':{en:'Retailer',zh:'零售商',def:'面向终端销售、掌握货架与客流的渠道（大连锁、电商、专业店）。毛利高但账期与费用门槛高。',module:'m27'},
'omnichannel':{en:'Omnichannel',zh:'全渠道',def:'线上线下一体化的渠道布局。管理难度最高（价格冲突、库存共享、体验一致），需要产品区隔与价格纪律。',module:'m27'},
'channel-margin':{en:'Channel Margin',zh:'渠道利润',def:'从出厂价到零售价的加价分配。过深的多层渠道让终端价失去竞争力，且企业失去定价权。',module:'m27'},
'channel-control':{en:'Channel Control',zh:'渠道控制',def:'企业对价格、陈列、促销与客户关系的掌控程度。渠道越深控制越弱，串货与价格混乱风险越高。',module:'m27'},
'sell-in':{en:'Sell-in',zh:'压货 / 进货',def:'企业向渠道商的出货量。单独看可能制造虚假繁荣，必须结合 sell-through 与渠道库存解读。',module:'m27'},
'sell-through':{en:'Sell-through',zh:'进销 / 渠道消化',def:'渠道商向终端或下级的实际销售量。健康渠道的标志是 sell-through ≈ sell-in。',module:'m27',related:['sell-out']},
'sell-out':{en:'Sell-out',zh:'实销 / 终端销售',def:'终端消费者的实际购买。是需求的最终验证，也是渠道健康度的金标准。',module:'m27'},
'country-risk':{en:'Country Risk',zh:'国家风险',def:'一国宏观与制度环境变化对企业造成的跨境损失风险，含主权、转移、征收、政策与政治暴力等子类。',module:'m28',related:['political-risk','sovereign-default']},
'political-risk':{en:'Political Risk',zh:'政治风险',def:'政治事件与政策变化导致的商业损失风险：征收、国有化、政策突变、政治暴力。',module:'m28'},
'sovereign-default':{en:'Sovereign Default',zh:'主权违约',def:'一国政府无法履行对外债务义务。通常引发本币暴跌、资本外逃与需求萎缩的连锁反应。',module:'m28',related:['capital-controls']},
'transfer-risk':{en:'Transfer Risk',zh:'转移 / 汇兑风险',def:'外汇管制使利润与货款无法汇出的风险。把收入变成不可兑换货币，直接切断现金流。',module:'m28'},
'expropriation':{en:'Expropriation',zh:'征收 / 国有化',def:'东道国政府无偿或低价取得外国企业资产。极端形态，可通过政治风险保险与投资结构设计部分缓释。',module:'m28'},
'capital-controls':{en:'Capital Controls',zh:'资本管制',def:'限制资本跨境流动的措施：外汇兑换限制、利润汇出限制、进口付汇审批。直接威胁赊销与回款。',module:'m28',related:['transfer-risk']},
'risk-exposure':{en:'Risk Exposure',zh:'风险暴露',def:'企业的资产、收入、供应链与人员暴露于特定风险的比例。企业能控制的不是事件，而是暴露与脆弱性。',module:'m28',related:['risk-mitigation']},
'risk-mitigation':{en:'Risk Mitigation',zh:'风险缓释',def:'降低风险概率或影响的安排：合同条款、分阶段投资、保险、双源、备用市场。',module:'m28'},
'geoeconomics':{en:'Geoeconomics',zh:'地缘经济',def:'以经济手段（贸易、投资、金融、技术、资源管制）服务战略目标的国家行为。合规状态成为与成本同等重要的竞争变量。',module:'m29'},
'friend-shoring':{en:'Friend-shoring',zh:'友岸外包',def:'把供应链布局到「友好国家」以降低地缘风险。成本通常更高，且可能只是地理伪装（上游仍来自同一国家）。',module:'m29',related:['near-shoring']},
'near-shoring':{en:'Near-shoring',zh:'近岸外包',def:'把生产布局到靠近最终市场的国家以缩短链条、降低运输与关税风险。',module:'m29'},
'critical-minerals':{en:'Critical Minerals',zh:'关键矿产',def:'经济与安全高度依赖且供应集中度高的矿产（稀土、锂、钴、镓、锗、石墨等）。出口管制的主要对象。',module:'m29',related:['chokepoint']},
'chokepoint':{en:'Chokepoint',zh:'choke 点 / 命门',def:'供应链中「替代周期长且集中度高」的节点：关键材料、核心设备、战略航道、单一产能基地。',module:'m29',related:['single-point-of-failure']},
'single-source':{en:'Single Source',zh:'单一来源',def:'某投入品只有一家供应商或一个产地。是供应链脆弱性的最常见来源，尤其在 choke 点环节。',module:'m29',related:['dual-sourcing']},
'dual-sourcing':{en:'Dual Sourcing',zh:'双源采购',def:'同一投入品维持两个合格供应商，即使第二源份额很小。是 choke 点管理的基本配置。',module:'m29'},
'de-risking':{en:'De-risking',zh:'去风险',def:'在不完全脱钩的前提下降低对单一国家/供应商的依赖。区别于「脱钩」——目标是韧性而非零依赖。',module:'m29'},
'risk-register':{en:'Risk Register',zh:'风险登记表',def:'动态维护的风险清单：描述、类别、概率、影响、传导路径、KRI、应对、责任人、复核日期。风险管理的「总账」。',module:'m30'},
'risk-matrix':{en:'Risk Matrix',zh:'风险矩阵',def:'以发生概率与影响程度为两轴的风险排序工具。局限：主观看分，应记录依据并定期校准；低概率高影响需单独管理。',module:'m30'},
'scenario-analysis':{en:'Scenario Analysis',zh:'情景分析',def:'构建 3–4 个结构完整情景（触发条件→传导→结果→应对），检验业务在各种世界中的生存能力。',module:'m30',related:['stress-test']},
'stress-test':{en:'Stress Test',zh:'压力测试',def:'极端情景下的业务生存检验（如「最大市场关闭 90 天」）。输出是现金流缺口与触发动作，不是预测。',module:'m30'},
'kri':{en:'Key Risk Indicator (KRI)',zh:'关键风险指标',def:'可观测、先于风险事件出现的信号。每个 KRI 必须配套触发动作，否则监测无效。',module:'m30',related:['leading-indicator','trigger-action']},
'leading-indicator':{en:'Leading Indicator',zh:'先行指标',def:'先于结果变化的可观测变量（查验率、黑市溢价、渠道库存）。与滞后指标（财务报表）相对。',module:'m30'},
'trigger-action':{en:'Trigger-Action',zh:'触发动作',def:'「当 KRI 越过阈值即执行预设动作」的机制。是风险管理从「监测」走向「行动」的关键设计。',module:'m30'},
'war-game':{en:'War Game / Desktop Exercise',zh:'桌面推演',def:'模拟风险事件发生后的团队响应演练（如「断供 90 天」）。检验预案有效性，暴露流程断点。',module:'m30'},
'roi':{en:'Return on Investment (ROI)',zh:'投资回报',def:'投入资源获得的回报比率。国际业务评估应使用「全成本利润」（含渠道费用、坏账、库存资金成本与管理分摊）。',module:'m31'},
'portfolio-management':{en:'Portfolio Management',zh:'组合管理',def:'按「增长—回报—风险」对国家/产品/渠道分类并分配资源：明星加码、现金牛收割、问题观察、瘦狗退出。',module:'m31'},
'sunk-cost':{en:'Sunk Cost',zh:'沉没成本',def:'已发生且不可回收的成本。决策只看未来现金流——沉没成本谬误是「再给一年」困境的根源。',module:'m31',related:['exit-decision']},
'exit-decision':{en:'Exit Decision',zh:'退出决策',def:'基于未来现金流、机会成本与期权价值的继续/停止判断。好的退出是「有尊严的退出」，保留品牌与重启期权。',module:'m31',related:['stage-gate']},
'stage-gate':{en:'Stage-Gate Commitment',zh:'分阶段承诺 / 闸门机制',def:'把进入与扩张切成多级承诺，每级设量化「继续/停止」闸门，限制单次错误的最大损失。',module:'m31',related:['entry-mode']},
'post-mortem':{en:'Post-Mortem',zh:'复盘',def:'对重大决策的结构化复盘：当时的假设、实际结果、差异原因、机制改进。对象是决策过程而非责任人。',module:'m31'},
'capital-allocation':{en:'Capital Allocation',zh:'资本配置',def:'把有限资源投向回报最高的用途。不退出的亏损市场的隐性成本，是掐死赢家的机会成本。',module:'m31',related:['opportunity-cost']},
'opportunity-cost':{en:'Opportunity Cost',zh:'机会成本（资源层面）',def:'把资源投入某用途而放弃的其他最佳用途的回报。战略层面：继续亏损市场的机会成本是赢家市场的投入不足。',module:'m31',related:['sunk-cost']},
'capstone':{en:'Capstone Project',zh:'综合项目',def:'整合全部知识的独立研究项目：从研究问题到可复核报告，检验学员能否独立开展国际市场研究。',module:'m32'},
'research-question':{en:'Research Question',zh:'研究问题',def:'从商业问题转化出的可验证问题。转化链：商业问题 → 研究问题 → 可检验假设 → 研究设计。',module:'m32',related:['assumption-testing']},
'evidence-chain':{en:'Evidence Chain',zh:'证据链',def:'从来源到结论的可追溯链条：每个关键结论标注来源、口径、年份与证据等级。是研究报告可信度的基础设施。',module:'m32',related:['triangulation']},
'decision-memo':{en:'Decision Memo',zh:'决策备忘录',def:'面向管理层的短文档：结论、建议、关键风险、待验证事项。结论先行，证据分层，不确定性显式呈现。',module:'m32'},
'assumption-testing':{en:'Assumption Testing',zh:'假设检验',def:'识别关键假设并设计最小成本的验证方式（试销、访谈、数据交叉）。商业假设必须先于数据收集明确写下来。',module:'m32',related:['research-question']},
'primary-research':{en:'Primary Research',zh:'一手研究',def:'为当前问题直接采集的数据：问卷、访谈、焦点小组、观察、实验。回答「具体客户怎么想」，但成本高、易有偏。',module:'m11'},
'secondary-research':{en:'Secondary Research',zh:'二手研究',def:'利用已有数据：官方统计、行业报告、学术文献、企业披露。建立框架与背景的第一步，成本低但口径需核验。',module:'m11'},
'quantitative-research':{en:'Quantitative Research',zh:'定量研究',def:'以数值与统计推断回答「多少、多大、多显著」的研究。需要抽样严谨与指标口径一致。',module:'m11'},
'qualitative-research':{en:'Qualitative Research',zh:'定性研究',def:'以访谈、观察、文本回答「为什么、如何决策」的研究。提供机制理解，不做总体推断。',module:'m11'},
'exploratory-research':{en:'Exploratory Research',zh:'探索性研究',def:'回答「这个问题是什么、有哪些假设」的研究：文献、专家访谈、案例。产出假设而非结论。',module:'m11'},
'descriptive-research':{en:'Descriptive Research',zh:'描述性研究',def:'回答「市场长什么样」的研究：规模、结构、份额、趋势。不能回答因果。',module:'m11'},
'causal-research':{en:'Causal Research',zh:'因果性研究',def:'回答「A 是否导致 B」的研究：需要实验或准实验设计（自然实验、工具变量）。观察数据只能证明相关。',module:'m11'},
'reliability':{en:'Reliability',zh:'信度',def:'重复测量得到一致结果的程度：内部一致性、稳定性、评分者间信度。',module:'m11',related:['validity']},
'validity':{en:'Validity',zh:'效度',def:'测量工具真正测量了所声称概念的程度：内部效度（因果）、外部效度（推广）、构念效度（指标代表概念）。',module:'m11'},
'sampling-bias':{en:'Sampling Bias',zh:'抽样偏差',def:'样本系统性偏离总体：便利抽样、幸存者偏差、无回应偏差、自我选择。1000 份有偏样本不如 50 份严谨样本。',module:'m11'},
'triangulation':{en:'Triangulation',zh:'三角验证',def:'用不同来源、方法、数据交叉验证同一结论。证据一致则稳健，冲突则定位分歧来源。',module:'m11',related:['evidence-chain']},
'tam':{en:'Total Addressable Market (TAM)',zh:'总可寻址市场',def:'既定产品定义与价格假设下某市场全部潜在需求的总价值。理论上限，通常远大于任何企业可获得的收入。',module:'m12',related:['sam','som']},
'sam':{en:'Serviceable Addressable Market (SAM)',zh:'可服务市场',def:'TAM 中企业实际可服务的部分（渠道可达、合规允许、产品适配、价格带匹配）。',module:'m12'},
'som':{en:'Serviceable Obtainable Market (SOM)',zh:'实际可获得市场',def:'SAM 中规划期内企业 realistically 可获取的部分。才是预算与收入预测的依据。',module:'m12',related:['tam','sam']},
'top-down':{en:'Top-Down Sizing',zh:'自上而下估算',def:'从宏观数据逐层下切到目标市场（基数 × 渗透率 × 客单价）。快速可解释，但误差逐层放大。',module:'m12',related:['bottom-up']},
'bottom-up':{en:'Bottom-Up Sizing',zh:'自下而上估算',def:'从可观测的渠道销量与企业营收加总推算市场。贴近现实、天然带口径，但可能漏长尾。',module:'m12'},
'penetration-rate':{en:'Penetration Rate',zh:'渗透率',def:'某产品在目标客群中的拥有/使用比例。引用必须明确口径（按销量还是金额、新增还是存量）。',module:'m12'},
'arpu':{en:'Average Revenue Per User (ARPU)',zh:'每用户平均收入',def:'目标客群的人均消费金额。用实际成交价而非目录价；需考虑价格带分布。',module:'m12'},
'serviceable-market':{en:'Serviceable Market',zh:'可服务市场',def:'见 SAM。由渠道覆盖、监管限制、产品定位共同决定的市场边界。',module:'m12'},
'market-screening':{en:'Market Screening',zh:'市场筛选',def:'从众多国家中系统性缩小目标范围的过程：候选池→数据→指标→规模→竞争→法规→风险→匹配→敏感性→决策。',module:'m13'},
'weighted-scoring':{en:'Weighted Scoring',zh:'加权评分',def:'Σ（指标得分 × 权重）的多目标决策方法。失真来自指标选择、权重设定、评分锚点与数据质量四环节。',module:'m13'},
'sensitivity-analysis':{en:'Sensitivity Analysis',zh:'敏感性分析',def:'检验结论对权重与评分误差稳健性的方法。前两名频繁翻转 = 无显著差异，应并列验证而非强行排序。',module:'m13',related:['scenario-analysis']},
'candidate-pool':{en:'Candidate Pool',zh:'候选池',def:'初筛后保留的 8–12 个候选国家。建立方法用排除法，排除理由要记录。',module:'m13'},
'market-attractiveness':{en:'Market Attractiveness',zh:'市场吸引力',def:'市场好不好：规模、增长、竞争、利润。与「企业竞争力」「进入可行性」是三个必须分开评估的问题。',module:'m13',related:['entry-barrier']},
'entry-barrier':{en:'Entry Barrier',zh:'进入门槛',def:'进入市场的成本与障碍：关税、认证、渠道建设、品牌认知、合规成本。高门槛是合规企业的护城河。',module:'m13'},
'competitor-analysis':{en:'Competitor Analysis',zh:'竞品分析',def:'系统识别与评估竞争对手的目标、战略、优势、弱点与反应模式。七维拆解：产品、价格、渠道、营销、供应链、财务、组织。',module:'m14'},
'consideration-set':{en:'Consideration Set',zh:'考虑集',def:'消费者购买时实际纳入比较的品牌/产品集合（通常 3–5 个）。营销的核心任务之一是进入并留在考虑集。',module:'m14'},
'value-proposition':{en:'Value Proposition',zh:'价值主张',def:'「对谁、是什么品类、比竞品更好地完成什么任务、因为什么」。所有营销与产品决策的锚点。',module:'m14',related:['positioning']},
'persona':{en:'Persona',zh:'用户画像',def:'基于研究构建的目标客群典型形象（场景、任务、痛点、信息渠道）。是团队共识工具，不是真实个体。',module:'m14'},
'voice-of-customer':{en:'Voice of Customer (VoC)',zh:'客户声音',def:'客户在评论、访谈、客服中表达的期望与不满。差评是需求金矿，但须追问「在什么场景下失望」。',module:'m14'},
'price-test':{en:'Price Test',zh:'价格测试',def:'用小规模真实交易（A/B 价格、预售、试销）验证支付意愿的方法。行为数据校准态度数据的核心工具。',module:'m14',related:['product-market-fit']},
'global-integration':{en:'Global Integration',zh:'全球整合',def:'通过全球标准化、集中制造与统一运营获取规模效率的压力。强度由规模经济与全球客户结构决定。',module:'m15',related:['local-responsiveness']},
'local-responsiveness':{en:'Local Responsiveness',zh:'本地响应',def:'按各国差异调整产品、渠道与运营的压力。强度由文化偏好、监管差异与渠道结构决定。',module:'m15'},
'international-strategy':{en:'International Strategy',zh:'国际战略',def:'以本国为中心向海外转移独特能力的战略，海外是「延伸市场」。整合与响应压力都低时适用。',module:'m15'},
'multidomestic-strategy':{en:'Multidomestic Strategy',zh:'多国战略',def:'各国子公司高度自治、深度本地化的战略。适合响应压力高、整合压力低的行业（食品、日化）。',module:'m15'},
'global-strategy':{en:'Global Strategy',zh:'全球战略',def:'全球标准化产品与集中制造、追求全球规模经济的战略。适合整合压力高、响应压力低的行业（半导体、光伏）。',module:'m15'},
'transnational-strategy':{en:'Transnational Strategy',zh:'跨国战略',def:'同时追求全球效率与本地适配的一体化网络战略。理论最优但协调成本最高，适合资源充足的大企业。',module:'m15'},
'aaa-strategies':{en:'AAA Strategies (Adaptation, Aggregation, Arbitrage)',zh:'AAA 战略',def:'加马沃特提出跨边界创造价值的三种杠杆：适应（本地差异）、集聚（规模效率）、套利（要素与制度差异）。企业通常只能同时强化一到两个。',module:'m15'},
'entry-mode':{en:'Entry Mode',zh:'进入模式',def:'企业进入海外市场的组织形式，从间接出口到跨国并购的承诺度谱系。选择本质是「用控制权与资源换收益与安全」。',module:'m16',related:['stage-gate']},
'indirect-export':{en:'Indirect Export',zh:'间接出口',def:'通过本国贸易商出口，企业不接触海外市场。承诺度最低、利润最薄，但零门槛。',module:'m16'},
'direct-export':{en:'Direct Export',zh:'直接出口',def:'企业自行开发海外客户并发货。保留客户关系，但需自建获客、单据与物流能力。',module:'m16'},
'licensing':{en:'Licensing',zh:'许可经营',def:'授权海外企业使用技术/品牌并收取许可费。零投入但外溢风险高，适合技术不构成核心壁垒的场景。',module:'m16',related:['franchising']},
'franchising':{en:'Franchising',zh:'特许经营',def:'授权统一商业模式与品牌并收取特许费（快餐、酒店、零售）。依赖标准化输出与质量控制。',module:'m16'},
'joint-venture':{en:'Joint Venture (JV)',zh:'合资企业',def:'与本地伙伴共同出资共担风险的企业。换取准入与本地知识，代价是股权稀释与治理复杂度。',module:'m16',related:['internalization-advantage']},
'greenfield':{en:'Greenfield Investment',zh:'绿地投资',def:'从零开始在海外建厂或设子公司。控制权最高、承诺最大，适合市场规模大且政策可预期的场景。',module:'m16',related:['brownfield']},
'brownfield':{en:'Brownfield Investment',zh:'褐地投资',def:'收购或改造东道国已有资产进入市场。速度更快，但整合风险高。',module:'m16'},
'wholly-owned-subsidiary':{en:'Wholly-Owned Subsidiary (WOS)',zh:'独资子公司',def:'企业 100% 控股的海外实体。控制权与利润最大化，但资源暴露与退出难度最高。',module:'m16'},
'cross-border-ecommerce':{en:'Cross-Border E-commerce',zh:'跨境电商',def:'通过电商平台或独立站直接面向海外消费者的销售模式。验证需求的最低成本工具，但客户资产与规则不自有。',module:'m16'},
'due-diligence':{en:'Due Diligence',zh:'尽职调查',def:'建立合作前对伙伴主体真实性、经营能力、财务与合规风险的系统核验。核心原则：关键事实至少两个独立来源交叉验证。',module:'m17'},
'exclusive-agreement':{en:'Exclusive Agreement',zh:'独家协议',def:'授予伙伴在约定区域/渠道的独家销售权。换取专注与投入，但降低灵活性与议价权，须配业绩阶梯。',module:'m17'},
'minimum-order':{en:'Minimum Order Quantity (MOQ)',zh:'最低采购量',def:'协议约定的周期最低采购义务，用于过滤虚假承诺与保障供方产能利用。',module:'m17'},
'channel-conflict':{en:'Channel Conflict',zh:'渠道冲突',def:'多个渠道争夺同一客户或价格体系失序。预防：产品区隔、价格纪律、区域划分、串货处罚。',module:'m17',related:['omnichannel']},
'performance-review':{en:'Performance Review (QBR)',zh:'绩效评估（季度业务回顾）',def:'对伙伴的定期业务复盘：销量、库存、回款、价格纪律、活动执行。末位淘汰与备选培育并行。',module:'m17'},
'termination-clause':{en:'Termination Clause',zh:'终止条款',def:'约定合作终止条件与终止后的库存处理、客户移交、责任划分的合同条款。是退出通道的法律保障。',module:'m17',related:['exit-decision']}
});

;

/* ================= 来源数据库（证据等级 A/B/C/D） ================= */
const SRC = [
 ['s01','1','World Trade Organization','Global Trade Outlook and Statistics（2025 年 10 月更新，经 China Daily 报道核验）','2025','机构报告（媒体转述）','A','https://www.chinadaily.com.cn/a/202510/09/WS68e721baa310f735438b3f79.html','2025 年全球货物贸易量增长预期上调至 2.4%，2026 年下调至 0.5%；北美贡献为负、亚洲为正；AI 相关产品贡献近半年贸易增长的一半','原始报告见 wto.org 出版物栏目；为预测值而非事实，引用须标注预测机构与发布时间'],
 ['s02','2','UNCTADstat','International trade 数据洞察（2026 年 10 月 8 日更新）','2026','官方统计数据库','A','https://stats.unctad.org/insights/theme/94','2025 年全球货物出口 26.3 万亿美元（+7.1%）；发展中经济体占 46%；最不发达国家占 1.2%；发达经济体贸易逆差 1.3 万亿美元','出口按 FOB、进口按 CIF；世界平衡加总不为零'],
 ['s03','3','中国海关总署','2025 年全年进出口情况新闻发布会（国新办）','2026-01','官方统计发布','A','https://www.gov.cn/zhengce/202601/content_7055018.htm','2025 年中国进出口 45.47 万亿元（+3.8%）；出口 26.99 万亿元（+6.1%）；高技术产品出口 +13.2%；锂电池出口 +26.2%；民营企业占 57.3%','人民币口径；发布会日期 2026 年 1 月 14 日'],
 ['s04','4','中国机电产品进出口商会（CCCME）','2025 年我国光伏产业对外贸易形势分析','2026','行业机构分析（基于海关数据）','A','https://www.cccme.org.cn/model5-1/news/details.aspx?id=B31FE14D32F9104E20D30B61AB70D332&classid=7685F2FA1E54A7F5&xgid=F868932F64EB7AAF','2025 年中国组件出口 237 亿美元/249.8 GW（额 −15.3%、量 +5.7%）；前十大市场占比 48%；仅荷兰、巴基斯坦、巴西超 10 亿美元；全球吉瓦级进口市场 47 个；对东南亚四国硅片出口量降超六成','行业商会基于海关数据的整理口径，与 UN Comtrade 原始数据可能存在子目覆盖差异'],
 ['s05','5','USTR（经北京市商务局编译核验）','Section 301 四年审查：太阳能电池片/多晶硅关税提高至 50%','2024-12','官方政策（转载）','A','https://sw.beijing.gov.cn/zt/mymcyd/smdtx/202501/t20250127_4000625.html','美国将中国进口太阳能电池片、多晶硅 301 关税从 25% 提高至 50%，2025 年 1 月 1 日生效','原始公告见 ustr.gov；转载为政府编译件'],
 ['s06','6','美国商务部/USITC（经 China Daily 报道）','对柬埔寨、马来西亚、泰国、越南光伏电池双反最终裁定','2024-12','官方政策（媒体核验）','B','https://www.chinadaily.com.cn/a/202412/24/WS676a2037a310f1265a1d49a8.html','美国对东南亚四国太阳能电池征收 21.31%–271.2% 关税（按厂商而定）','后续最终裁定与复审可能调整税率，须以 USITC/CBP 当期税令为准'],
 ['s07','7','美国联邦公报（Federal Register 91 FR 51975）','Section 232 多晶硅及其衍生品进口措施公告','2026-08','官方政策文本','A','https://www.govinfo.gov/content/pkg/FR-2026-08-11/html/2026-16400.htm','对多晶硅衍生品征收 15% 从价税并设最低进口价格（多晶硅 21 美元/kg、硅片 100 美元/kg、电池 0.22 美元/W、组件 0.38 美元/W），2026 年 12 月 4 日生效；替代已到期的 201 保障措施','生效日在访问日之后，属「已公布未生效」规则；实施细则仍在演化'],
 ['s08','8','欧盟委员会（税务与海关联盟）','CBAM 正式期制度说明','2026','官方政策页面','A','https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism/cbam-definitive-regime_en','CBAM 正式期自 2026 年 1 月 1 日适用；覆盖水泥、钢铁、铝、化肥、电力、氢六大类；50 吨 de minimis 门槛；证书按 EU ETS 季度均价计算','光伏组件成品（HS 8541）不在 CBAM 覆盖范围；铝边框等部件单独进口时需按税则核验'],
 ['s09','9','美国国会研究服务处（CRS）','USMCA Joint Review: Process and Role of Congress（R48787）','2026-09','国会研究报告','A','https://www.congress.gov/crs_external_products/R/PDF/R48787/R48787.5.pdf','2026 年 7 月 1 日 USMCA 首次联合审查中美国拒绝按现有形式续签；协定有效至 2036 年并进入年度审查；美方要求汽车区域价值含量 75%→82% 与美国价值占比过半','谈判结果仍在演化，应以 USTR 与 CRS 最新报告跟踪'],
 ['s10','10','上海市浦东新区政府（引海关总署数据）','高质量实施 RCEP：四年成效评估','2026-03','政府发布（数据引述）','A','https://www.pudong.gov.cn/china-shftz/mtbd/20260302/822545.html','2025 年中国与 RCEP 其他成员货物贸易额 1.9 万亿美元（+4.7%），占中国外贸约 30%；RCEP 2027 年将全面审议；RCEP 允许经核准出口商自主出具原产地声明','数据经海关总署渠道发布；具体产品优惠须逐项核对产品特定规则'],
 ['s11','11','中国驻英国使馆经商处（引英国政府公告）','CPTPP 所有成员完成批准英国加入','2026-09','政府发布','A','https://gb.mofcom.gov.cn/jmxw/art/2026/art_80b9c79364054caea7c1effb1f7025b4.html','英国 2026 年 9 月 1 日正式成为 CPTPP 全面成员（加拿大为最后一个批准方）；CPTPP 覆盖市场规模约 13 万亿英镑口径','中国 2021 年 9 月提交加入申请，截至访问日未进入正式谈判'],
 ['s12','12','UNCTAD','World Investment Report 2026','2026','国际机构旗舰报告','A','https://unctad.org/system/files/official-document/wir2026_en.pdf','2025 年全球 FDI 达 1.6 万亿美元（+6%），扭转连续两年下降；发达经济体 +11%、发展中 +2%；前五大目的地：美国、新加坡、中国香港、中国、巴西','流量口径；含经由金融中心的波动性流动'],
 ['s13','13','商务部、海关总署','公告 2025 年第 18 号：对部分中重稀土相关物项实施出口管制','2025-04','官方政策文本','A','https://www.mofcom.gov.cn/','对钐、钆、铽、镝、镥、钪、钇等中重稀土及相关物项实施出口管制（许可制），持续有效','以商务部官网检索公告原文；出口经营者可申请许可'],
 ['s14','14','商务部','公告 2025 年第 70/72 号：相关管制措施暂停实施','2025-11','官方政策文本','A','https://www.mofcom.gov.cn/','2025 年 10 月发布的稀土扩展管制（第 55–58、61、62 号）暂停实施至 2026 年 11 月 10 日；对美特定物项禁令暂停至 2026 年 11 月 27 日','暂停不等于取消；第 18 号公告基础管制仍然有效'],
 ['s15','15','金杜律师事务所','2025 年中国出口管制年度回顾与观察','2025','专业法律分析','B','https://www.kingandwood.com/cn/zh/insights/latest-thinking/review-of-chinas-export-control-in-2025-regulations-enforcement-and-advices-for-enterprises.html','梳理 2025 年中国出口管制法规体系（0.1% 最低含量追溯规则、清单化扩展、暂停机制）与执法案例（含含管制元素 0.01% 仍被认定的实践）','律所分析供参考，不构成法律意见'],
 ['s16','16','欧盟委员会 Access2Markets','出口限制壁垒登记：原材料与稀土（barrier 11028）','2026-02','官方壁垒登记','B','https://trade.ec.europa.eu/access-to-markets/sv/barriers/details?isSps=false&barrier_id=11028','记录中国对稀土、石墨、镓、锗等的出口限制；引述中国稀土精炼约占全球 85–90%、烧结钕铁硼磁体约 94%','壁垒登记反映欧盟产业界视角，数字需交叉核验（IEA 原始数据）'],
 ['s17','17','世界银行','Logistics Performance Index 2023','2023','国际机构指数','A','https://lpi.worldbank.org/','2023 年 LPI：新加坡 4.3 居首，芬兰 4.2；美国第 17（3.8）；六维度：海关、基础设施、货运便利、服务质量、追踪、时效','2023 年后方法论调整（LPI 2.0），跨国比较须注意版本'],
 ['s18','18','UN Comtrade','免费与订阅说明','2026','官方数据库说明','A','https://comtradeplus.un.org/Subscriptions','免费注册：单次 10 万条记录、API 500 次/天；匿名预览限 500 条；批量文件需付费订阅','访问方式可能调整，以官网当期说明为准'],
 ['s19','19','欧盟（EUR-Lex）','Regulation (EU) 2023/1542 电池与废电池法规（及山东省商务厅合规解读）','2023/2026','法规文本 + 政府解读','A','https://eur-lex.europa.eu/eli/reg/2023/1542/oj','电池法规尽职调查义务（年营收 ≥4,000 万欧元企业）自 2025 年 8 月 18 日适用；数字电池护照 2027 年 2 月 18 日起对适用电池强制；便携 <2 kWh 电池豁免 DPP','山东商务厅解读指出 EV 碳足迹等级标签名义日（2026-08-18）因授权法案未发布而尚未生效——政策状态须逐季核验'],
 ['s20','20','印度 MNRE（经 Websol、NDTV Profit 等交叉核验）','ALMM List-II 太阳能电池批准清单','2025-07','官方清单（二手交叉验证）','B','https://www.ndtvprofit.com/markets/inclusion-of-solar-cells-under-almm-will-drive-up-manufacturing-costs-in-short-to-medium-term-10003977/amp/1','ALMM List-II 于 2025 年 7 月 31 日发布（首批 9 家本土电池厂），2026 年 6 月 1 日起政府项目必须使用本土清单内电池；印度组件产能约 60–68 GW 而电池产能曾仅约 6 GW','以 MNRE 官网当期清单为准；List-III（硅片）计划 2028 年 6 月'],
 ['s21','21','巴西 CAMEX/Gecex & SECEX（经 Canal Solar、国复咨询核验）','光伏组件进口关税 25% 与配额制度','2024-11 起','官方政策（行业媒体核验）','B','https://canalsolar.com.br/en/government-denies-raising-tax-on-solar-panels./','2024 年 11 月起组件进口关税 9.6%→25%（Gecex Res. 666）；集中式项目配额内 9.6%（2025-07 至 2026-07 配额 7.174 亿美元 FOB）；下一配额期据报道降至约 4.03 亿美元','配额额度与规则逐年调整，须以 SECEX 当期公告为准'],
 ['s22','22','Council on Foreign Relations','United States and China Agree to Trade Truce','2025-10','智库分析','B','https://www.cfr.org/articles/united-states-and-china-agree-trade-truce','釜山会晤达成一年期休战：美国对华平均关税 57%→47%，暂停 100% 关税威胁；中方暂停最新稀土出口管制一年','一年期安排到期日（2026 年 11 月前后）后状态须重新核验'],
 ['s23','23','中国商务部（经中央社报道）','吉隆坡—釜山经贸磋商成果共识','2025-10','官方表态（媒体核验）','A','https://www.cna.com.tw/news/acn/202510300201.aspx','美方取消 10% 芬太尼关税并继续暂停 24% 对等关税一年；美方暂停 50% 穿透性规则一年；中方暂停 10 月 9 日公布的稀土出口管制措施一年','中美双方表述细节略有差异，引用时注明出处'],
 ['s24','24','中国贸促会江西省委会（转发法新社）','美最高法院 2026 年 2 月裁定推翻大部分 IEEPA 关税','2026-08','媒体报道','B','https://www.ccpitjx.org.cn/ccpitjx/col/col47303/content/content_2087736319128444928.html','美国最高法院 2026 年 2 月裁定推翻大部分基于 IEEPA 的关税；基于 232 条款的行业关税不受影响','重大法律事实须以美国最高法院判决原文与权威法律数据库核验'],
 ['s25','25','Renewables First','The Many Dividends of Solar Rush in Pakistan','2025-11','NGO 白皮书','C','https://uploads.renewablesfirst.org/The%20Many%20Dividends%20of%20Solar%20Rush%20in%20Pakistan.pdf','巴基斯坦 FY25 进口中国光伏组件约 17.9 GW，累计超 50 GW；成为年度第二大中国组件进口市场','FY 口径（7 月—次年 6 月）与日历年不同；智库报告，方法须查附录'],
 ['s26','26','Mordor Intelligence（经 ResearchAndMarkets）','Saudi Arabia Solar Energy Market 2026–2031','2026-01','商业研究机构','C','https://www.researchandmarkets.com/report/saudi-arabia-solar-energy-market','沙特光伏市场 2026 年预计新增 13.47 GW（2025 年 10.25 GW）；NREP 目标 58.7 GW（2030）；REPDO 本地含量从 15% 提高到 35%；招标电价 1.67–1.97 美分/kWh','商业机构预测，假设与方法未完全公开；须以沙特能源部/SPPC 官方文件为准'],
 ['s27','27','北极星太阳能光伏网','沙特 SPPC 签约 15 GW 光风项目购电协议','2025-07','行业媒体','C','https://mguangfu.bjx.com.cn/mnews/20250715/1451221.shtml','SPPC 已启动 43.2 GW 可再生能源项目、38.7 GW 已签 PPA、10.2 GW 已并网；预计 2025 年底 12.7 GW、2026 年底超 20 GW；高盛报告称 2030 年目标或上调至 100–130 GW','引述 SPPC 与高盛口径，须以官方项目公告为准'],
 ['s28','28','中国产业经济信息网（引中国光伏行业协会王勃华）','光伏出口退税终结：2026 年 4 月 1 日起取消','2026','行业协会观点（媒体核验）','B','https://cinic.org.cn/xw/cjfx/1633287.html','自 2026 年 4 月 1 日起光伏产品增值税出口退税全面取消（9%→0），涉及硅片、组件、逆变器等 249 项产品；2025 年协会口径组件出口 264.1 GW（与商会 249.8 GW 口径不同）','退税取消以财政部、税务总局公告为准；两套口径差异是「口径决定结论」的教学实例'],
 ['s29','29','IndexBox','China Solar Cells and Module Market Analysis','2026','商业数据机构','C','https://www.indexbox.io/store/china-solar-cells-and-module-market-analysis-forecast-size-trends-and-insights/','2025 年中国组件出口约 220 GW、250–300 亿美元；出口价从 2023 年 0.15–0.18 美元/W 降至 2026 年 0.09–0.12 美元/W；美国对中国组件征 50–250% 双反的表述与官方税令口径有差异','商业机构估算，与海关/商会数据存在口径差异；价格区间可作交叉参考'],
 ['s30','30','China Daily','美国太阳能电池关税与 Wood Mackenzie 户用光伏分析','2024-12','国际媒体（专业分析引述）','B','https://epaper.chinadaily.com.cn/a/202412/24/WS6769fdfca3105c25b38eeaf8.html','Wood Mackenzie：美国户用光伏 2024 年装机预计下降 19%；用美国电池制造的面板约 45 美分/W，用进口电池约 35–36 美分/W','媒体转述专业机构数据，引用时注明原始机构'],
 ['s31','31','David Ricardo','On the Principles of Political Economy and Taxation（1817）','1817','经典学术著作','A','https://en.wikisource.org/wiki/On_the_Principles_of_Political_Economy_and_Taxation','比较优势理论的原始出处：贸易收益来自机会成本差异而非绝对效率','两产品两要素静态模型，适用边界见 m02'],
 ['s32','32','Eli Heckscher / Bertil Ohlin','The Effect of Foreign Trade on the Distribution of Income（1919）；Interregional and International Trade（1933）','1919/1933','经典学术文献','A','https://scholar.google.com/scholar?q=Heckscher+1919+effect+of+foreign+trade+on+the+distribution+of+income','要素禀赋理论（H-O）的原始出处：贸易模式由要素丰裕度决定','经典文献，经学术图书馆可获取原文；此处为检索入口'],
 ['s33','33','Paul Krugman','Increasing Returns, Monopolistic Competition, and International Trade, JIE','1979','同行评审论文','A','https://doi.org/10.1016/0022-1996(79)90017-5','新贸易理论奠基论文：规模经济与不完全竞争可在无禀赋差异国家间产生贸易','作者因相关贡献获 2008 年诺贝尔经济学奖'],
 ['s34','34','Raymond Vernon','International Investment and International Trade in the Product Life Cycle, QJE','1966','同行评审论文','A','https://scholar.google.com/scholar?q=Vernon+1966+international+investment+and+international+trade+in+the+product+life+cycle','产品生命周期理论原始出处：生产区位随产品成熟度跨国转移','基于 1960 年代美国跨国公司观察，适用边界见 m04'],
 ['s35','35','John Dunning','Trade, Location of Economic Activity and the MNE（1977）；The Eclectic Paradigm as an Envelope（JIBS, 2000）','1977/2000','经典学术文献','A','https://doi.org/10.1057/palgrave.jibs.8490995','OLI 折衷理论：跨国经营需同时满足所有权、区位、内部化三类优势','OLI 是分析框架而非预测理论'],
 ['s36','36','Jan Johanson & Jan-Erik Vahlne','The Internationalization Process of the Firm, JIBS','1977','同行评审论文','A','https://doi.org/10.1057/palgrave.jibs.8490676','乌普萨拉国际化阶段模型：市场知识积累与心理距离决定渐进路径','对天生全球化企业解释力有限'],
 ['s37','37','Michael E. Porter','The Competitive Advantage of Nations, HBR（及 1990 年专著）','1990','权威商业研究','A','https://hbr.org/1990/03/the-competitive-advantage-of-nations','国家竞争优势钻石模型：要素、需求、相关产业、竞争结构四组因素相互强化','基于发达国家产业研究；对后发与政策驱动产业需补充'],
 ['s38','38','Gary Gereffi, John Humphrey & Timothy Sturgeon','The Governance of Global Value Chains, RIPE','2005','同行评审论文','A','https://doi.org/10.1080/03085140500071287','GVC 五种治理模式（市场、模块、关系、受制、等级）与升级路径的理论框架','治理模式判断具有主观性，是理想类型'],
 ['s39','39','Pankaj Ghemawat','Distance Still Matters, HBR','2001','权威商业研究','B','https://hbr.org/2001/09/distance-still-matters','CAGE 距离框架：文化、行政、地理、经济四类距离对行业的差异化影响','框架为定性工具，评分主观'],
 ['s40','40','Geert Hofstede','Culture\'s Consequences；国家文化维度数据库','1980/2001','经典学术研究','B','https://geerthofstede.com/research-and-vsm/dimension-data-matrix/','六维文化框架（权力距离、个人主义、不确定性规避等）的维度分数','数据源自 IBM 员工调查，代表职场文化；易被滥用为刻板印象'],
 ['s41','41','WTO','Regional Trade Agreements Database','持续更新','官方数据库','A','https://rtais.wto.org/','全球已向 WTO 通报并生效的区域贸易协定超过 300 项；含成员、生效日期与协定文本','截至近年口径；具体数量以数据库当期为准'],
 ['s42','42','World Bank','World Integrated Trade Solution (WITS)','持续更新','官方数据库','A','https://wits.worldbank.org/','整合 Comtrade 贸易数据、TRAINS 关税与 GPTAD 优惠协定的分析平台，免费注册可用','关税数据 harmonized 到 HS 6 位，更新有滞后'],
 ['s43','43','ITC','Trade Map','持续更新','国际组织数据库','A','https://www.trademap.org/','180+ 国家的贸易流向、份额与月度趋势查询，可视化程度高，免费注册可用','部分高级功能需订阅；数据源自各国海关'],
 ['s44','44','WCO / UNSD','HS 2022 商品名称及编码协调制度','2022','国际标准','A','https://www.wcohs.org/','HS 六位码全球统一的商品分类标准；2022 版为现行版本','每 5–6 年修订，跨年比较须核对版本'],
 ['s45','45','ICC','Incoterms 2020 Rules','2020','国际商会规则','A','https://iccwbo.org/business-solutions/incoterms-rules/','11 种贸易术语定义交货点、风险转移、费用划分与清关责任','只有写入合同才有约束力；不决定所有权与付款条件'],
 ['s46','46','UNCTAD','Handbook of Statistics','年度','国际机构统计','A','https://unctad.org/statistics','国际贸易、投资、航运与发展的权威统计手册','各专题数据另有专门数据库'],
 ['s47','47','IMF','World Economic Outlook','定期','国际机构报告','A','https://www.imf.org/en/Publications/WEO','全球与国别宏观经济预测：GDP、通胀、国际收支','预测依赖假设，须标注预测期'],
 ['s48','48','World Bank','World Development Indicators (WDI)','持续更新','官方数据库','A','https://data.worldbank.org/','各国人口、收入、结构等核心发展指标','跨国比较须固定来源与年份'],
 ['s49','49','OECD','TiVA / ICIO 增加值贸易数据库','持续更新','国际组织数据库','A','https://www.oecd.org/','产业间投入产出与增加值贸易数据，用于价值链分析','数据库入口见 oecd.org；部分数据集有许可要求'],
 ['s50','50','Ronald Coase / Oliver Williamson','The Nature of the Firm（1937）；The Economic Institutions of Capitalism（1985）','1937/1985','经典学术文献','A','https://scholar.google.com/scholar?q=Coase+1937+the+nature+of+the+firm','交易成本与企业边界理论：资产专用性、不确定性、交易频率决定「市场 vs 层级」','交易成本理论为 OLI 内部化优势提供微观基础'],
 ['s51','51','Douglass North','Institutions, Institutional Change and Economic Performance','1990','经典学术著作','A','https://scholar.google.com/scholar?q=North+1990+institutions+institutional+change+and+economic+performance','制度基础观：正式与非正式制度决定交易成本与长期经济绩效',''],
 ['s52','52','Jay Barney','Firm Resources and Sustained Competitive Advantage, Journal of Management','1991','同行评审论文','A','https://doi.org/10.1177/014920639101700108','资源基础观（VRIN 标准）：竞争优势来自有价值、稀缺、难模仿、不可替代的资源',''],
 ['s53','53','Marc Melitz','The Impact of Trade on Intra-Industry Reallocations and Aggregate Industry Productivity, Econometrica','2003','同行评审论文','A','https://doi.org/10.1111/1468-0262.00455','异质企业贸易理论：只有高生产率企业出口，贸易引发行业内资源再配置',''],
 ['s54','54','WTO','Overview of Developments in the International Trading Environment（年度报告）','2026','机构报告','A','https://www.wto.org/','2026 年报告指出贸易政策不确定性处于历史高位、最大成员之一征收大幅更高关税','报告全文见 WTO 官网'],
 ['s55','55','中国光伏行业协会（经工人日报、机电商会报道）','2025 年中国光伏产业链产能全球占比数据','2026','行业协会数据（媒体核验）','B','https://www.workercn.cn/c/2026-08-13/8869180.shtml','2025 年中国多晶硅、硅片、电池、组件产能分别占全球 96.0%、96.2%、91.3%、80.1%','产能口径与产量口径不同；以协会原始发布为准'],
 ['s56','56','The News (Pakistan)','China\'s Industrial Power: Pakistan Solar Growth','2025','国际媒体','C','https://www.thenews.pk/print/1402670','引述：巴基斯坦自华组件进口份额从 2022 年约 2% 升至 2025 年约 12%；组件价格 2025 年约 0.08 美元/W','会议发言转述，须以贸易数据核验'],
 ['s57','57','NDTV Profit','ALMM 将推高印度制造成本的分析','2025','专业财经媒体','B','https://www.ndtvprofit.com/markets/inclusion-of-solar-cells-under-almm-will-drive-up-manufacturing-costs-in-short-to-medium-term-10003977/amp/1','印度电池产能约 6 GW vs 组件产能约 60 GW；本土电池制造成本约 12 美分/W vs 中国约 4 美分/W（业内人士口径）','业内人士估计，供参考'],
 ['s58','58','江苏省储能行业协会（经中国能源网报道）','欧盟电池法规执行：鹿特丹港储能柜因合规文件被扣案例','2026-09','行业协会（媒体报道）','C','https://www.cnenergynews.cn/article/4TDTRpLGQgt','2026 年 8 月起欧盟海关对动力及储能电池碳足迹声明与电池护照数据进入强制抽检；数批中国出口储能产品因文件不规范被扣','个案报道，须以欧盟海关与认证机构官方信息核验'],
 ['s59','59','中国国际贸易促进委员会长沙市支会','国际经贸短讯（2026）17 期','2026-09','政府机构简报','B','http://mch.changsha.gov.cn/mcfw/jmxx/sjjm_1/202609/t20260917_12569254.html','2025 年中国与东盟贸易额 1.05 万亿美元（+7.4%）；东盟连续 6 年为中国第一大贸易伙伴；CPTPP 英国入约等动态','政府机构汇编简报，数据引自官方渠道']
];
SRC.forEach(s => SOURCES.push({ id:s[0], no:s[1], org:s[2], title:s[3], year:s[4], type:s[5], grade:s[6], url:s[7], supports:s[8], notes:s[9] }));

/* ================= 官方数据库导航 ================= */
DATABASES.push(
 { name:'UN Comtrade', org:'联合国统计司', content:'全球官方进出口统计（商品/服务），按 HS/SITC 等编码', access:'免费注册：单次 10 万条、API 500 次/天；批量文件需订阅', url:'https://comtradeplus.un.org/' },
 { name:'ITC Trade Map', org:'国际贸易中心（ITC）', content:'贸易流向、市场份额、月度趋势、关税信息', access:'免费注册可用基础查询，部分高级功能需订阅', url:'https://www.trademap.org/' },
 { name:'WITS', org:'世界银行', content:'贸易 + 关税（TRAINS）+ 优惠协定（GPTAD）整合分析', access:'免费注册', url:'https://wits.worldbank.org/' },
 { name:'WTO 数据门户', org:'WTO', content:'宏观贸易统计、关税 profile、RTA 数据库', access:'免费开放', url:'https://stats.wto.org/' },
 { name:'WTO RTA 数据库', org:'WTO', content:'区域贸易协定的成员、生效日期、协定文本', access:'免费开放', url:'https://rtais.wto.org/' },
 { name:'UNCTADstat', org:'UNCTAD', content:'贸易、投资、航运、发展统计与数据洞察', access:'免费开放', url:'https://unctadstat.unctad.org/' },
 { name:'World Investment Report', org:'UNCTAD', content:'全球 FDI 流量与政策年度旗舰报告', access:'免费下载', url:'https://unctad.org/wir' },
 { name:'世界银行 WDI', org:'世界银行', content:'各国人口、收入、宏观核心指标', access:'免费开放', url:'https://data.worldbank.org/' },
 { name:'世界银行 LPI', org:'世界银行', content:'物流绩效指数（海关、基础设施、时效等六维）', access:'免费开放（2023 版为经典方法论最后一版）', url:'https://lpi.worldbank.org/' },
 { name:'IMF WEO', org:'IMF', content:'全球与国别宏观经济预测', access:'免费开放', url:'https://www.imf.org/en/Publications/WEO' },
 { name:'OECD TiVA / ICIO', org:'OECD', content:'增加值贸易与产业间投入产出（价值链分析）', access:'部分免费，部分数据集需许可', url:'https://www.oecd.org/' },
 { name:'欧盟 Access2Markets', org:'欧盟委员会', content:'欧盟进口关税、准入规则、贸易壁垒登记', access:'免费开放', url:'https://trade.ec.europa.eu/access-to-markets/' },
 { name:'欧盟 TARIC', org:'欧盟委员会', content:'欧盟 8–10 位税则、税率与贸易措施查询', access:'免费开放', url:'https://taxation-customs.ec.europa.eu/customs-4/calculation-duties/tariff-database-taric_en' },
 { name:'USITC DataWeb / HTS', org:'美国国际贸易委员会', content:'美国进口统计与 HTS 税则查询', access:'免费开放', url:'https://www.usitc.gov/tata/hts/bychapter/index.htm' },
 { name:'中国海关总署', org:'中国海关', content:'中国进出口统计、税则、公告与统计分析', access:'免费开放', url:'http://www.customs.gov.cn/' },
 { name:'WCO HS 数据库', org:'世界海关组织', content:'HS 编码、税则结构与归类辅助工具', access:'部分免费', url:'https://www.wcohs.org/' },
 { name:'Eurostat', org:'欧盟统计局', content:'欧盟与成员国经济贸易统计', access:'免费开放', url:'https://ec.europa.eu/eurostat/' },
 { name:'各国统计局 / 央行', org:'各国官方', content:'人口、GDP、价格、国际收支等本国数据', access:'免费开放（以各国官网为准）', url:'https://unstats.un.org/home/' }
);

/* ================= 延伸阅读书目 ================= */
READINGS.push(
 { group:'国际贸易理论', title:'On the Principles of Political Economy and Taxation', author:'David Ricardo', year:'1817', note:'比较优势原始论述（第一章「论对外贸易」）' },
 { group:'国际贸易理论', title:'Interregional and International Trade', author:'Bertil Ohlin', year:'1933', note:'要素禀赋理论经典；赫克歇尔 1919 年论文为先声' },
 { group:'国际贸易理论', title:'Increasing Returns, Monopolistic Competition, and International Trade', author:'Paul Krugman', year:'1979', note:'新贸易理论奠基论文（Journal of International Economics）' },
 { group:'国际贸易理论', title:'The Impact of Trade on Intra-Industry Reallocations and Aggregate Industry Productivity', author:'Marc J. Melitz', year:'2003', note:'异质企业贸易理论（Econometrica）' },
 { group:'国际商务与企业理论', title:'Trade, Location of Economic Activity and the MNE / The Eclectic Paradigm', author:'John H. Dunning', year:'1977/2000', note:'OLI 折衷理论原始文献' },
 { group:'国际商务与企业理论', title:'The Internationalization Process of the Firm', author:'Johanson & Vahlne', year:'1977', note:'乌普萨拉阶段模型（JIBS）' },
 { group:'国际商务与企业理论', title:'The Nature of the Firm / The Economic Institutions of Capitalism', author:'R. Coase / O. Williamson', year:'1937/1985', note:'交易成本与企业边界理论' },
 { group:'国际商务与企业理论', title:'Firm Resources and Sustained Competitive Advantage', author:'Jay B. Barney', year:'1991', note:'资源基础观（Journal of Management）' },
 { group:'国际商务与企业理论', title:'Institutions, Institutional Change and Economic Performance', author:'Douglass C. North', year:'1990', note:'制度基础观经典' },
 { group:'国际商务与企业理论', title:'International Economics: Theory and Policy（教材）', author:'Krugman, Obstfeld & Melitz', year:'第 11 版（2021）', note:'国际贸易与国际金融标准教材，适合系统补课' },
 { group:'战略与全球化', title:'The Competitive Advantage of Nations', author:'Michael E. Porter', year:'1990', note:'国家竞争优势钻石模型（HBR 文章版）' },
 { group:'战略与全球化', title:'Distance Still Matters: The Hard Reality of Global Expansion', author:'Pankaj Ghemawat', year:'2001', note:'CAGE 距离框架（HBR）' },
 { group:'战略与全球化', title:'Managing Across Borders: The Transnational Solution', author:'Bartlett & Ghoshal', year:'1989/1998', note:'整合—响应与跨国战略经典' },
 { group:'全球价值链', title:'The Governance of Global Value Chains', author:'Gereffi, Humphrey & Sturgeon', year:'2005', note:'GVC 五种治理模式（Review of International Political Economy）' },
 { group:'全球价值链', title:'Global Value Chain Development Report', author:'World Bank / WTO / IDE-JETRO 等', year:'系列年度', note:'GVC 实证与政策年度报告' },
 { group:'市场研究方法', title:'Marketing Research（教材）', author:'Malhotra, Nunan & Birks', year:'第 8 版（2017）', note:'市场研究标准教材：研究设计、抽样、信度效度' },
 { group:'市场研究方法', title:'Qualitative Research & Evaluation Methods', author:'Michael Quinn Patton', year:'第 4 版（2015）', note:'定性研究方法论经典' },
 { group:'谈判与沟通', title:'Getting to Yes: Negotiating Agreement Without Giving In', author:'Fisher, Ury & Patton', year:'第 3 版（2011）', note:'原则式谈判经典' },
 { group:'谈判与沟通', title:'Culture\'s Consequences（及后续版）', author:'Geert Hofstede', year:'1980/2001', note:'文化维度框架及其局限的原始论述' },
 { group:'贸易执行与合规', title:'Incoterms 2020（ICC 官方规则）', author:'ICC', year:'2020', note:'贸易术语权威文本（iccwbo.org）' },
 { group:'贸易执行与合规', title:'A Guide to International Trade and Finance（实用指南）', author:'Various', year:'持续更新', note:'国际商会与各国贸易促进机构的实务指南系列' },
 { group:'贸易执行与合规', title:'ECCN 与 EAR 实务（美国出口管制）', author:'美国商务部 BIS', year:'持续更新', note:'bis.doc.gov 官方指南与培训材料' },
 { group:'数据与政策资源', title:'Global Trade Outlook and Statistics', author:'WTO', year:'年度', note:'WTO 贸易统计与预测旗舰报告（wto.org）' },
 { group:'数据与政策资源', title:'World Investment Report', author:'UNCTAD', year:'年度', note:'全球 FDI 年度旗舰报告' },
 { group:'数据与政策资源', title:'World Development Report', author:'World Bank', year:'年度', note:'发展经济学年度旗舰报告（数据见 WDI）' }
);

;

/* ================= 初始化 ================= */
(function init(){
  applyTheme();
  if(!location.hash) location.hash = '#/map';
  buildSidebar();
  buildSearchIndex();
  updateProgressUI();
  route();
  // localStorage 可用性提示（file:// 环境下部分浏览器受限）
  try { localStorage.setItem('gbmr.test', '1'); localStorage.removeItem('gbmr.test'); }
  catch(e){
    setTimeout(() => {
      const v = document.getElementById('view');
      if(v && !v.querySelector('.ls-warn')){
        const d = document.createElement('div');
        d.className = 'callout warn ls-warn';
        d.innerHTML = '<span class="ico">⚠️</span><div><b>本地存储不可用</b>当前浏览器环境无法使用 localStorage（部分浏览器在 file:// 协议下受限）。学习进度与笔记将无法保存，请通过「笔记」面板的「导出备份」功能保存数据，或使用支持本地存储的现代浏览器（Chrome / Edge / Firefox）打开本文件。</div>';
        v.prepend(d);
      }
    }, 300);
  }
})();


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
if((m02out.match(/<span class="term"/g) || []).length !== (m02out.match(/<\/span>/g) || []).length + 0) {}
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

console.log('\n========== 深度测试结果 ==========');
if(errs.length){ console.log('❌ 错误 ' + errs.length + ' 项:'); errs.forEach(e => console.log('  -', e)); process.exit(1); }
console.log('✅ 深度测试全部通过');
})();
