const fs = require("fs");
const { JSDOM } = require("jsdom");

const html = fs.readFileSync("F:/个人想法实践记录-项目制-agent产出/项目7-信息检索与事实核查/index.html", "utf-8");
const errors = [];
const vc = new (require("jsdom").VirtualConsole)();
vc.on("jsdomError", (e) => errors.push("jsdomError: " + e.message));
vc.on("error", (m) => errors.push("console.error: " + m));

const dom = new JSDOM(html, {
  runScripts: "dangerously",
  pretendToBeVisual: true,
  virtualConsole: vc,
  url: "https://localhost/index.html"
});
const { window } = dom;
const { document } = window;

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log("PASS  " + name); }
  else { fail++; console.log("FAIL  " + name + (extra ? "  -> " + extra : "")); }
}
function fire(el, type) {
  el.dispatchEvent(new window.Event(type, { bubbles: true }));
}
function click(el) { el.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true })); }

setTimeout(() => {
  try {
    // 1. 基础渲染
    check("页面标题", document.title.indexOf("信息检索与事实核查") !== -1);
    check("12 个模块", document.querySelectorAll(".module").length === 12, "实际 " + document.querySelectorAll(".module").length);
    check("侧边导航链接数", document.querySelectorAll("#sbNav .nav-link").length >= 25, "实际 " + document.querySelectorAll("#sbNav .nav-link").length);
    check("知识地图 SVG 存在", !!document.querySelector("#kmap svg") && !!document.querySelector("#home svg"));

    // 2. 测验渲染
    const quizzes = document.querySelectorAll(".quiz");
    check("测验题目渲染 39 题", quizzes.length === 39, "实际 " + quizzes.length);
    // 答第一题
    const opts = quizzes[0].querySelectorAll(".opt");
    click(opts[1]); // 正确答案 index 1
    const q1new = document.querySelectorAll(".quiz")[0];
    check("答题后显示解析", q1new.querySelector(".q-exp").classList.contains("show"));
    check("得分更新", document.getElementById("quizScore").textContent.indexOf("1 / 39") !== -1, document.getElementById("quizScore").textContent);
    click(document.getElementById("quizReset"));
    check("测验重置", document.getElementById("quizScore").textContent.indexOf("0 / 39") !== -1);

    // 3. 模块完成与进度
    const doneCb = document.querySelector('input[data-done="m1"]');
    doneCb.checked = true;
    fire(doneCb, "change");
    check("进度更新为 1/12", document.getElementById("progressText").textContent.indexOf("1 / 12") !== -1, document.getElementById("progressText").textContent);
    check("进度条宽度", document.getElementById("progressFill").style.width !== "0%");

    // 4. 全站搜索
    const si = document.getElementById("globalSearch");
    si.value = "幻觉";
    fire(si, "input");
    const filtered = document.querySelectorAll(".page.filtered-out").length;
    check("搜索过滤生效", filtered > 0 && document.getElementById("searchInfo").textContent.indexOf("匹配") !== -1, "filtered=" + filtered);
    si.value = "";
    fire(si, "input");
    check("清空搜索恢复", document.querySelectorAll(".page.filtered-out").length === 0);

    // 5. 工具 1：搜索策略生成器
    click(document.getElementById("sgDemo"));
    check("示例问题填入", document.getElementById("sgInput").value.length > 5);
    click(document.getElementById("sgGen"));
    const sgOut = document.getElementById("sgOut");
    check("策略生成输出", sgOut.classList.contains("show") && sgOut.textContent.indexOf("问题拆解") !== -1 && sgOut.textContent.indexOf("filetype:pdf") !== -1);

    // 6. 工具 2：来源评估清单
    check("评估清单初始化", document.querySelectorAll("#seChecklist .chk-item").length === 15, "实际 " + document.querySelectorAll("#seChecklist .chk-item").length);
    click(document.getElementById("seEval"));
    check("评估反馈输出", document.getElementById("seOut").classList.contains("show") && document.getElementById("seOut").textContent.indexOf("真实性总分") !== -1);

    // 7. 工具 3：交叉验证工作台
    click(document.getElementById("cvExample"));
    const rows = document.querySelectorAll("#cvSources .cv-src");
    check("示例载入 5 个来源", rows.length === 5, "实际 " + rows.length);
    click(document.getElementById("cvAnalyze"));
    const cvOut = document.getElementById("cvOut");
    check("证据链分析输出", cvOut.classList.contains("show") && cvOut.textContent.indexOf("证据链概览") !== -1);
    check("回音室警告触发", cvOut.textContent.indexOf("回音室") !== -1);
    check("冲突提示触发", cvOut.textContent.indexOf("冲突") !== -1);

    // 8. 工具 4：AI 输出核查
    click(document.getElementById("aiExample"));
    const claims = document.querySelectorAll("#aiClaims .claim-row");
    check("AI 示例拆解为多条主张", claims.length >= 4, "实际 " + claims.length);
    check("主张状态选择器", claims[0].querySelectorAll(".cl-status option").length === 6);
    click(document.getElementById("aiExport"));
    check("导出不报错", true);

    // 9. 工具 5：报告模板
    check("报告模板预填", document.getElementById("repText").value.indexOf("事实核查报告") !== -1);
    click(document.getElementById("repFill"));
    check("工作台数据填充", document.getElementById("repText").value.indexOf("全网销量第一") !== -1);

    // 10. 工具 6：决策树
    const dt = document.getElementById("dtTree");
    check("决策树起始问题", dt.textContent.indexOf("这个信息的错误会导致什么后果") !== -1);
    const firstOpt = dt.querySelector(".dopt");
    click(firstOpt);
    check("决策树推进", dt.textContent.indexOf("原始来源") !== -1 || dt.textContent.indexOf("专业领域") !== -1 || dt.textContent.indexOf("快速核查") !== -1, dt.textContent.slice(0, 60));

    // 11. 复制按钮（jsdom 无剪贴板，走降级路径不崩溃）
    const copyBtn = document.querySelector("[data-copy]");
    if (copyBtn) click(copyBtn);
    check("复制按钮降级不崩溃", true);

    // 12. 折叠/展开
    const colBtn = document.querySelector("[data-collapse]");
    click(colBtn);
    check("模块折叠", colBtn.closest(".module").classList.contains("collapsed"));

    // 13. localStorage 持久化
    const saved = window.localStorage.getItem("fc-progress");
    check("进度已持久化", !!saved && saved.indexOf("m1") !== -1, saved);

    // 14. 清单进度
    const chkItem = document.querySelector(".chk input[type=checkbox]");
    chkItem.checked = true;
    fire(chkItem, "change");
    check("清单计数更新", chkItem.closest(".chk").querySelector(".chk-prog").textContent !== "0/7");

  } catch (e) {
    fail++;
    console.log("FAIL  测试执行异常: " + e.message + "\n" + e.stack);
  }

  console.log("\n===== 结果: " + pass + " 通过, " + fail + " 失败 =====");
  if (errors.length) { console.log("脚本错误/警告:"); errors.slice(0, 10).forEach((e) => console.log("  " + e)); }
  else console.log("无脚本错误。");
  process.exit(fail > 0 || errors.length > 0 ? 1 : 0);
}, 300);
