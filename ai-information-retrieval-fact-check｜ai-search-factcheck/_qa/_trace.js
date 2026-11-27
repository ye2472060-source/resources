const fs = require("fs");
const { JSDOM, VirtualConsole } = require("jsdom");
const html = fs.readFileSync("F:/个人研究 - 副本/项目7-信息检索与事实核查/index.html", "utf-8");
const vc = new VirtualConsole();
vc.on("jsdomError", (e) => console.log("JSDOMERR:", e.message, e.detail ? "\n" + String(e.detail).slice(0,300) : ""));
const dom = new JSDOM(html, {
  runScripts: "dangerously", pretendToBeVisual: true, virtualConsole: vc,
  url: "https://localhost/index.html",
  beforeParse(window) {
    window.alert = function (msg) { console.log("ALERT CALLED:", String(msg).slice(0, 80)); };
    window.confirm = function () { return false; };
  }
});
const { document } = dom.window;
function click(el) { el.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, cancelable: true })); }
setTimeout(() => {
  console.log("--- 模拟正常操作序列 ---");
  click(document.getElementById("sgDemo")); click(document.getElementById("sgGen"));
  click(document.getElementById("seEval"));
  click(document.getElementById("cvExample")); click(document.getElementById("cvAnalyze"));
  click(document.getElementById("aiExample")); click(document.getElementById("aiExport"));
  click(document.getElementById("repFill"));
  click(document.querySelector("#dtTree .dopt"));
  click(document.querySelector("[data-copy]"));
  console.log("--- 操作序列完成 ---");
}, 300);
