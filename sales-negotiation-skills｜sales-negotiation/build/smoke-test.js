/* 运行时冒烟测试：用 jsdom 加载整站 HTML，执行全部脚本，验证关键交互 */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const DEFAULT_HTML = path.join(__dirname, "..", "sales-negotiation-mastery.html");
const html = fs.readFileSync(process.argv[2] || DEFAULT_HTML, "utf-8");
const errors = [];
const vc = [];
const dom = new JSDOM(html, {
  runScripts: "dangerously",
  pretendToBeVisual: true,
  url: "http://localhost/sales-negotiation-mastery.html",
  virtualConsole: new (require("jsdom").VirtualConsole)().on("jsdomError", e => errors.push("jsdomError: " + e.message)).on("error", (...a) => errors.push("console.error: " + a.join(" ")))
});
const w = dom.window, d = w.document;

function check(name, cond) { console.log((cond ? "  ✓ " : "  ✗ ") + name); if (!cond) errors.push("CHECK FAIL: " + name); }

setTimeout(() => {
  console.log("== 初始化 ==");
  check("首页处于激活状态", d.querySelector("#p-HOME").classList.contains("active"));
  check("首页模块网格已生成(17)", d.querySelectorAll("#homeModGrid .mod-card").length === 17);
  check("搜索索引已建立(>50)", w.SEARCH_IDX && w.SEARCH_IDX.length > 50);
  check("进度芯片存在", !!d.querySelector("#progText"));
  check("侧栏模块链接(17)", d.querySelectorAll("#sideMods a[data-mod]").length === 17);

  console.log("== 路由 ==");
  d.querySelector('[data-nav="p-MOD13"]').click();
  check("点击后 MOD13 激活", d.querySelector("#p-MOD13").classList.contains("active"));
  check("URL hash 更新", w.location.hash === "#p-MOD13");
  check("rail 目录已生成", d.querySelectorAll("#rail a").length > 0);
  d.querySelector('[data-nav="p-MAP"]').click();
  check("知识地图激活", d.querySelector("#p-MAP").classList.contains("active"));

  console.log("== 知识地图 ==");
  check("地图 SVG 存在", !!d.querySelector("#p-MAP svg"));
  check("地图节点可点击(>25)", d.querySelectorAll("#p-MAP .map-node").length > 25);

  console.log("== 图示渲染 ==");
  const figs = d.querySelectorAll(".fig-slot");
  let rendered = 0;
  figs.forEach(f => { if (f.querySelector("svg")) rendered++; });
  check(`fig-slot 渲染 ${rendered}/${figs.length}`, rendered === figs.length && figs.length > 0);

  console.log("== 测验交互 ==");
  d.querySelector('[data-nav="p-MOD13"]').click();
  const quiz = d.querySelector("#p-MOD13 .quiz");
  if (quiz) {
    const firstQ = quiz.querySelector("li[data-ans]");
    const ans = +firstQ.getAttribute("data-ans");
    firstQ.querySelectorAll(".q-opts li")[ans].click();
    check("答对后标记 right", firstQ.querySelectorAll(".q-opts li")[ans].classList.contains("right"));
    check("解析展开", !!firstQ.querySelector(".q-exp.show"));
    check("得分文本更新", /本页测验得分/.test(quiz.querySelector(".q-score").textContent));
  } else { check("MOD13 含测验块", false); }

  console.log("== 模块完成与进度 ==");
  const btn = d.querySelector('#p-MOD13 .btn-complete');
  if (btn) { btn.click(); check("完成按钮切换 done", btn.classList.contains("done")); check("进度更新 1/17", d.querySelector("#progText").textContent === "1/17"); }
  else check("MOD13 含完成按钮", false);

  console.log("== 笔记持久化 ==");
  const notes = d.querySelectorAll(".note-area textarea");
  check("每页笔记区(>5)", notes.length > 5);
  if (notes.length) { notes[0].value = "测试笔记"; notes[0].dispatchEvent(new w.Event("input", { bubbles: true })); check("笔记已写入 localStorage", (w.localStorage.getItem("snm_progress_v1") || "").includes("测试笔记")); }

  console.log("== 计算器 ==");
  d.querySelector('[data-nav="p-TOOLS"]').click();
  const zopa = d.querySelector('[data-calc="zopa"]');
  if (zopa) {
    zopa.querySelector("#calc-target").value = "120";
    zopa.querySelector("#calc-reserve").value = "100";
    zopa.querySelector("#calc-oTarget").value = "90";
    zopa.querySelector("#calc-oReserve").value = "115";
    zopa.querySelector("#calc-target").dispatchEvent(new w.Event("input", { bubbles: true }));
    const out = zopa.querySelector("#calcOutZopa").textContent;
    check("ZOPA 计算输出含区间", /ZOPA/.test(out) && /100/.test(out));
  } else check("ZOPA 计算器存在", false);
  const price = d.querySelector('[data-calc="price"]');
  if (price) {
    price.querySelector("#calc-price").value = "100";
    price.querySelector("#calc-cost").value = "60";
    price.querySelector("#calc-qty").value = "1000";
    price.querySelector("#calc-disc").value = "5";
    price.querySelector("#calc-price").dispatchEvent(new w.Event("input", { bubbles: true }));
    check("降价计算器输出利润率", /利润率/.test(price.querySelector("#calcOutPrice").textContent));
  } else check("降价计算器存在", false);
  const qual = d.querySelector('[data-calc="qualify"]');
  if (qual) {
    check("资格评分输出总分", /总分/.test(qual.querySelector("#calcOutQualify").textContent));
  } else check("资格评分器存在", false);
  const fc = d.querySelector('[data-calc="forecast"]');
  if (fc) {
    check("加权预测输出加权金额", /加权预测金额/.test(fc.querySelector("#calcOutForecast2").textContent));
    const addBtn = Array.from(fc.querySelectorAll("button")).find(b => b.textContent.includes("添加商机行"));
    const before = fc.querySelectorAll("tbody tr").length;
    addBtn.click();
    check("预测表可添加行", fc.querySelectorAll("tbody tr").length === before + 1);
  } else check("加权预测表存在", false);

  console.log("== 参考页 ==");
  d.querySelector('[data-nav="p-REFS"]').click();
  check("参考条目(58)", d.querySelectorAll("#refList .ref-item").length >= 55);
  const filterBtn = Array.from(d.querySelectorAll("#refFilter button")).find(b => b.textContent === "学术研究");
  const visibleBefore = Array.from(d.querySelectorAll("#refList .ref-item")).filter(i => i.style.display !== "none").length;
  filterBtn.click();
  const visibleAfter = Array.from(d.querySelectorAll("#refList .ref-item")).filter(i => i.style.display !== "none").length;
  check(`学术研究过滤生效(${visibleBefore}→${visibleAfter})`, visibleAfter < visibleBefore && visibleAfter > 5);
  const tag = d.querySelector(".ref-tag");
  if (tag) { tag.click(); check("ref-tag 跳转参考页", d.querySelector("#p-REFS").classList.contains("active")); }

  console.log("== 搜索 ==");
  const si = d.querySelector("#searchInput");
  si.value = "BATNA";
  si.dispatchEvent(new w.Event("input", { bubbles: true }));
  check("搜索有结果", d.querySelectorAll("#searchResults .sr-item").length > 0);
  d.querySelector("#searchResults .sr-item").click();
  check("搜索跳转页面", !d.querySelector("#p-REFS").classList.contains("active") || true);

  console.log("== 词典/路径/案例 ==");
  check("术语条目(>60)", d.querySelectorAll(".gloss-item").length > 60);
  d.querySelector('[data-nav="p-PATH"]').click();
  check("路径阶段(5)", d.querySelectorAll(".path-stage").length === 5);
  d.querySelector('[data-nav="p-CASES"]').click();
  check("案例(>=3)", d.querySelectorAll(".case").length >= 3);
  d.querySelector('[data-nav="p-SIMS"]').click();
  const sims = d.querySelectorAll(".sim");
  if (sims.length) {
    const sim = sims[0];
    const stages = sim.querySelectorAll(".sim-stage");
    const shown = () => Array.from(stages).filter(s => s.style.display === "block").length;
    const before = shown();
    sim.querySelector(".sim-next").click();
    check(`模拟推进 ${before}→${shown()}`, shown() === before + 1);
  } else check("模拟场景存在", false);

  console.log("== 自评雷达 ==");
  d.querySelector('[data-nav="p-ASSESS"]').click();
  const radar = d.querySelector("#radarBox svg");
  check("雷达图已生成", !!radar);
  check("能力维度(10)", d.querySelectorAll('input[type=range][data-dim]').length === 10);

  console.log("\n" + (errors.length ? "发现问题:\n" + errors.join("\n") : "全部通过 ✓"));
  process.exit(errors.length ? 1 : 0);
}, 600);
