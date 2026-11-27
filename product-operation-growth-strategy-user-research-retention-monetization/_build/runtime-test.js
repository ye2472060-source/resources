// 运行时测试：用 jsdom 加载课程网站，验证初始化、路由、搜索、进度、计算器等交互
const fs = require("fs");
const { JSDOM } = require("jsdom");

const HTML_PATH = require("path").resolve(__dirname, "../product-operations-growth-academy.html");
const html = fs.readFileSync(HTML_PATH, "utf-8");

const errors = [];
const results = [];
function check(name, cond, detail) {
  results.push({ name, ok: !!cond, detail: detail || "" });
  if (!cond) errors.push(name + (detail ? " -> " + detail : ""));
}

const virtualConsole = new (require("jsdom").VirtualConsole)();
virtualConsole.on("jsdomError", (e) => errors.push("JSDOM ERROR: " + e.message));
virtualConsole.on("error", (m) => errors.push("CONSOLE ERROR: " + m));

const dom = new JSDOM(html, {
  runScripts: "dangerously",
  url: "https://localhost/academy.html#/home",
  pretendToBeVisual: true,
  virtualConsole,
  // jsdom 未实现滚动 API，桩化以免产生 "Not implemented" 噪声（真实浏览器无此问题）
  beforeParse(w) {
    w.scrollTo = () => {};
    w.scrollBy = () => {};
    w.HTMLElement.prototype.scrollIntoView = () => {};
  },
});
const { window } = dom;
const { document } = window;

function fire(el, type) {
  const ev = new window.Event(type, { bubbles: true, cancelable: true });
  el.dispatchEvent(ev);
}

setTimeout(() => {
  try {
    // 1. 初始化渲染
    check("模块总览已渲染(11 张卡)", document.querySelectorAll("#moduleOverview .card").length === 11,
      "实际 " + document.querySelectorAll("#moduleOverview .card").length);
    check("术语表已渲染", document.querySelectorAll("#glossaryList .g-item").length > 50,
      "实际 " + document.querySelectorAll("#glossaryList .g-item").length);
    check("资料库已渲染(核心来源)", document.querySelectorAll("#srcCore .src-item").length >= 20,
      "实际 " + document.querySelectorAll("#srcCore .src-item").length);
    check("资料库已渲染(工具来源)", document.querySelectorAll("#srcTools .src-item").length >= 3);

    // 2. 路由
    window.location.hash = "#/m3";
    window.dispatchEvent(new window.Event("hashchange"));
    check("路由到模块 3", document.getElementById("page-m3").classList.contains("active"));
    check("导航高亮 m3", document.querySelector('#mainNav .nav-link[data-page="m3"]').classList.contains("active"));
    check("TOC 已生成", document.querySelectorAll("#toc a").length > 5,
      "实际 " + document.querySelectorAll("#toc a").length);
    window.location.hash = "#/m3/u3-4";
    window.dispatchEvent(new window.Event("hashchange"));
    check("路由到单元锚点 u3-4", document.getElementById("u3-4") !== null);

    // 3. 搜索
    const searchInput = document.getElementById("searchModalInput");
    searchInput.value = "留存";
    fire(searchInput, "input");
    const srItems = document.querySelectorAll("#searchResults .sr-item");
    check("搜索『留存』有结果", srItems.length > 3, "实际 " + srItems.length);
    check("搜索结果含高亮", document.querySelectorAll("#searchResults mark").length > 0);
    searchInput.value = "zzz不存在的关键词";
    fire(searchInput, "input");
    check("无结果时有提示", document.getElementById("searchResults").textContent.indexOf("没有找到") >= 0);

    // 4. 学习进度
    const box = document.querySelector('input[data-pid="u0-1"]');
    box.checked = true;
    fire(box, "change");
    const stored = JSON.parse(window.localStorage.getItem("pog-progress-v1") || "{}");
    check("进度写入 localStorage", stored["u0-1"] === true);
    check("进度 UI 更新", document.getElementById("progressText").textContent !== "0%",
      document.getElementById("progressText").textContent);
    check("单元标记完成样式", document.getElementById("u0-1").classList.contains("done"));

    // 5. 测验与折叠
    const quizBtn = document.querySelector(".quiz .ans-toggle");
    fire(quizBtn, "click");
    check("自测题答案展开", quizBtn.closest(".quiz").classList.contains("open"));
    const colHead = document.querySelector(".collapse > .c-head");
    const wasOpen = colHead.parentElement.classList.contains("open");
    fire(colHead, "click");
    check("折叠卡片切换", colHead.parentElement.classList.contains("open") !== wasOpen);

    // 6. 计算器
    window.location.hash = "#/toolbox";
    window.dispatchEvent(new window.Event("hashchange"));
    function setVal(id, v) { const el = document.getElementById(id); el.value = v; fire(el, "input"); }
    // AARRR
    setVal("aarrr-acq", "10000"); setVal("aarrr-act", "3000"); setVal("aarrr-ret", "900"); setVal("aarrr-rev", "200"); setVal("aarrr-ref", "100");
    const aarrrOut = document.getElementById("aarrr-out").textContent;
    check("AARRR 计算器输出", aarrrOut.indexOf("最弱环节") >= 0 && aarrrOut.indexOf("30.0%") >= 0, aarrrOut.slice(0, 80));
    // 样本量
    setVal("ab-p1", "3"); setVal("ab-mde", "10"); setVal("ab-daily", "5000");
    const absOut = document.getElementById("absize-out").textContent;
    check("样本量计算器输出", absOut.indexOf("每组所需样本量") >= 0 && absOut.indexOf("53") >= 0, absOut.slice(0, 100));
    // RICE
    const riceCells = document.querySelectorAll("#rice-table .rice-score");
    check("RICE 表格计算", riceCells[0].textContent.replace(/[^\d]/g, "").length > 0 && riceCells[0].textContent !== "—",
      riceCells[0].textContent);
    check("RICE 排序输出", document.getElementById("rice-out").textContent.indexOf("1.") >= 0);
    // 留存曲线
    setVal("rc-d1", "45"); setVal("rc-d7", "28"); setVal("rc-d14", "22"); setVal("rc-d30", "18"); setVal("rc-d90", "15");
    const rcOut = document.getElementById("retcurve-out").textContent;
    check("留存曲线生成器", rcOut.indexOf("走平") >= 0 && rcOut.indexOf("svg") < 0,
      rcOut.slice(0, 100));
    check("留存曲线 SVG 绘制", document.querySelectorAll("#retcurve-out svg polyline").length === 1);
    // 单位经济
    setVal("u-arpu", "50"); setVal("u-margin", "70"); setVal("u-churn", "4"); setVal("u-cac", "400");
    const unitOut = document.getElementById("unit-out").textContent;
    check("单位经济计算器", unitOut.indexOf("875") >= 0 && unitOut.indexOf("2.19") >= 0, unitOut.slice(0, 120));
    // Van Westendorp
    setVal("vwp-tc", "10"); setVal("vwp-ch", "25"); setVal("vwp-ex", "50"); setVal("vwp-te", "80");
    const vwpOut = document.getElementById("vwp-out").textContent;
    check("VWP 计算器输出", vwpOut.indexOf("PMC") >= 0 && vwpOut.indexOf("可接受价格区间") >= 0, vwpOut.slice(0, 100));
    check("VWP 图表绘制", document.querySelectorAll("#vwp-chart path").length === 4);

    // 7. 术语表筛选与搜索
    window.location.hash = "#/glossary";
    window.dispatchEvent(new window.Event("hashchange"));
    const gs = document.getElementById("glossarySearch");
    gs.value = "LTV"; fire(gs, "input");
    check("术语表搜索", document.querySelectorAll("#glossaryList .g-item").length >= 1 &&
      document.getElementById("glossaryList").textContent.indexOf("LTV") >= 0);
    // 先清空搜索词，避免 q="LTV" 与 cat="experiment" 同时生效导致 0 条（产品逻辑正确）
    gs.value = ""; fire(gs, "input");
    const filterBtn = document.querySelector('#glossaryFilter .filter-btn[data-cat="experiment"]');
    fire(filterBtn, "click");
    check("术语表分类筛选", document.querySelectorAll("#glossaryList .g-item").length > 5 &&
      document.getElementById("glossaryCount").textContent.indexOf("共") === 0);

    // 8. 主题切换
    const themeBefore = document.documentElement.getAttribute("data-theme");
    fire(document.getElementById("themeBtn"), "click");
    check("主题切换", document.documentElement.getAttribute("data-theme") !== themeBefore);
    fire(document.getElementById("themeBtn"), "click");

    // 9. 移动端抽屉（模拟小屏点击菜单）
    fire(document.getElementById("menuBtn"), "click");
    check("侧边栏抽屉切换", document.getElementById("sidebar").classList.contains("open") ||
      document.getElementById("sidebar").classList.contains("collapsed"));

    // 10. 回到顶部
    fire(document.getElementById("toTop"), "click");

    // 11. 复制按钮存在性
    check("复制按钮数量", document.querySelectorAll(".copy-btn").length >= 15,
      "实际 " + document.querySelectorAll(".copy-btn").length);

    // 12. 所有页面均可激活
    const pages = ["home","map","m0","m1","m2","m3","m4","m5","m6","m7","m8","m9","m10","toolbox","cases","glossary","sources","assess"];
    let pageOk = 0;
    pages.forEach((p) => {
      window.location.hash = "#/" + p;
      window.dispatchEvent(new window.Event("hashchange"));
      if (document.getElementById("page-" + p).classList.contains("active")) pageOk++;
    });
    check("全部 18 个页面可切换", pageOk === 18, "成功 " + pageOk);
  } catch (e) {
    errors.push("TEST EXCEPTION: " + e.message + "\n" + e.stack);
  }

  // 汇总
  const pass = results.filter((r) => r.ok).length;
  console.log("=== 运行时测试结果 ===");
  results.forEach((r) => console.log((r.ok ? "  PASS " : "  FAIL ") + r.name + (r.detail && !r.ok ? "  [" + r.detail + "]" : "")));
  console.log("\n通过 " + pass + " / " + results.length);
  if (errors.length) {
    console.log("\n=== 错误明细 ===");
    errors.forEach((e) => console.log("  - " + e));
    process.exit(1);
  } else {
    console.log("\nALL RUNTIME TESTS PASSED");
    process.exit(0);
  }
}, 800);
