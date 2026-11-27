/* DOM 桩冒烟测试：执行全部渲染路径，捕获运行时错误 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function makeEl(id) {
  const el = {
    id: id || "",
    _html: "", _text: "",
    children: [], attrs: {}, style: {}, dataset: {},
    classList: { _s: new Set(), add(...c){c.forEach(x=>this._s.add(x));}, remove(...c){c.forEach(x=>this._s.delete(x));}, toggle(c,f){ if(f===undefined) f=!this._s.has(c); f?this._s.add(c):this._s.delete(c); return f;}, contains(c){return this._s.has(c);} },
    set innerHTML(v){ this._html = String(v); },
    get innerHTML(){ return this._html; },
    set textContent(v){ this._text = String(v); },
    get textContent(){ return this._text; },
    set className(v){ this._cls = v; }, get className(){ return this._cls||""; },
    set onclick(f){ this._onclick = f; }, get onclick(){ return this._onclick; },
    set onchange(f){}, 
    appendChild(c){ this.children.push(c); return c; },
    insertAdjacentHTML(pos, h){ this._html += h; },
    addEventListener(){}, removeEventListener(){},
    setAttribute(k,v){ this.attrs[k]=v; }, getAttribute(k){ return this.attrs[k]; },
    querySelector(){ return null; }, querySelectorAll(){ return []; },
    closest(){ return null; }, scrollIntoView(){}, focus(){}, blur(){},
    getBoundingClientRect(){ return {top:0,left:0,width:800,height:600}; }
  };
  return el;
}

const byId = {};
const document = {
  getElementById(id){ if(!byId[id]) byId[id]=makeEl(id); return byId[id]; },
  createElement(tag){ return makeEl(""); },
  querySelector(){ return null; },
  querySelectorAll(){ return []; },
  addEventListener(){},
  body: makeEl("body")
};
const store = {};
const sandbox = {
  document, console,
  window: { addEventListener(){}, scrollTo(){}, innerHeight: 800, scrollY: 0 },
  location: { hash: "#/" },
  localStorage: {
    getItem(k){ return store[k]||null; },
    setItem(k,v){ store[k]=String(v); },
    removeItem(k){ delete store[k]; }
  },
  navigator: { userAgent: "smoke-test" },
  setTimeout(f){ try{ f(); }catch(e){} return 0; },
  confirm(){ return false; },
  alert(){}
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

let failures = 0;
try {
  vm.runInContext(code, sandbox);
} catch (e) {
  console.error("FAIL: 顶层执行错误:", e.message);
  process.exit(1);
}

const COURSE = sandbox.COURSE;
if (!COURSE) { console.error("FAIL: COURSE missing"); process.exit(1); }

// 依次执行所有路由渲染
const routes = ["#/", "#/path", "#/project", "#/library"];
COURSE.modules.forEach(m => {
  routes.push("#/m/" + m.id);
  m.sections.forEach(s => routes.push("#/m/" + m.id + "/" + s.id));
  routes.push("#/m/" + m.id + "/quiz");
});
routes.push("#/library/S01", "#/unknown-route", "#/m/m0/badsec");

routes.forEach(h => {
  sandbox.location.hash = h;
  try {
    vm.runInContext("route()", sandbox);
    const art = byId["article"];
    if (!art || !art._html || art._html.length < 100) throw new Error("渲染结果为空");
  } catch (e) {
    failures++;
    console.error("FAIL route " + h + ": " + e.message);
  }
});

// 测试搜索
try {
  vm.runInContext("doSearch('信号')", sandbox);
  vm.runInContext("doSearch('TikTok')", sandbox);
  vm.runInContext("doSearch('不存在的词xyz')", sandbox);
} catch (e) { failures++; console.error("FAIL search: " + e.message); }

// 测试进度标记
try {
  vm.runInContext("store.data.sections['m0-1']=1; save(); route()", sandbox);
} catch (e) { failures++; console.error("FAIL progress: " + e.message); }

if (failures) { console.error("SMOKE TEST FAILED: " + failures); process.exit(1); }
console.log("SMOKE TEST PASSED: " + routes.length + " routes + search + progress");
console.log("首页渲染长度: " + byId["article"]._html.length + " chars");
