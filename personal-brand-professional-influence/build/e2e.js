/* 真实浏览器测试：Playwright 全功能验证 */
const { chromium } = require("playwright");
const path = require("path");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", e => errors.push("pageerror: " + e.message));
  page.on("console", m => { if (m.type() === "error") errors.push("console: " + m.text()); });

  const file = "file:///" + path.join(__dirname, "..", "index.html").replace(/\\/g, "/").replace(/^([A-Za-z]):/, "$1:");
  const results = [];
  const check = (name, ok, detail) => { results.push((ok ? "PASS" : "FAIL") + " | " + name + (detail ? " | " + detail : "")); };

  await page.goto(file, { waitUntil: "load" });
  await page.waitForTimeout(400);

  // 1. 首页
  const h1 = await page.textContent("h1");
  check("首页标题", h1 && h1.includes("个人品牌与专业影响力"), h1);
  const modCards = await page.locator(".mod-card").count();
  check("首页模块卡片=10", modCards === 10, "实际 " + modCards);
  const svgCount = await page.locator(".diagram svg").count();
  check("首页含知识地图SVG", svgCount >= 1, "svg数 " + svgCount);

  // 2. 侧边导航
  const navItems = await page.locator("#nav .nav-item").count();
  check("侧边导航渲染", navItems > 20, "nav项 " + navItems);

  // 3. 进入模块 0 第一节
  await page.click('#nav a[href="#/m/m0/m0-1"]');
  await page.waitForTimeout(300);
  const secTitle = await page.textContent(".sec > h2");
  check("章节页渲染", secTitle && secTitle.includes("概念"), secTitle);
  const asideCards = await page.locator("#aside .card").count();
  check("右侧辅助区渲染", asideCards >= 3, "卡片 " + asideCards);

  // 4. 标记已学完 → 进度更新
  await page.click("[data-done]");
  await page.waitForTimeout(200);
  const footText = await page.textContent("#footProgText");
  check("进度标记生效", footText && /1\/\d+ 节/.test(footText), footText);
  const ls = await page.evaluate(() => localStorage.getItem("pbi_progress_v1"));
  check("localStorage 已写入", ls && ls.includes("m0-1"));

  // 5. 折叠区块（m0-6 含延伸阅读 fold）
  await page.click('#nav a[href="#/m/m0/m0-6"]');
  await page.waitForTimeout(300);
  const fold = page.locator("details.fold:visible").first();
  if (await fold.count()) {
    await fold.locator("summary").click();
    await page.waitForTimeout(100);
    check("折叠区块可展开", await fold.evaluate(e => e.open));
  } else check("折叠区块存在", false, "本页无可见 fold");

  // 6. 测验页
  await page.click('#nav a[href="#/m/m0/quiz"]');
  await page.waitForTimeout(300);
  const qCount = await page.locator(".quiz-q").count();
  check("测验题渲染", qCount === 5, "题目数 " + qCount);
  await page.locator('.quiz-q[data-q="0"] .quiz-opt').nth(1).click();
  await page.locator('.quiz-q[data-q="1"] .quiz-opt').nth(1).click();
  await page.click("#quizSubmit");
  await page.waitForTimeout(200);
  const result = await page.textContent("#quizResult");
  check("测验提交反馈", result && result.includes("/"), result.replace(/\s+/g, " ").trim());
  const expShown = await page.locator(".quiz-explain.show").count();
  check("测验解析显示", expShown === 5, "解析数 " + expShown);

  // 7. 搜索
  await page.fill("#sbSearchInput", "信号");
  await page.waitForTimeout(300);
  const srItems = await page.locator(".sr-item").count();
  check("搜索有结果", srItems > 0, "结果数 " + srItems);
  await page.fill("#sbSearchInput", "TikTok");
  await page.waitForTimeout(300);
  const sr2 = await page.locator(".sr-item").count();
  check("搜索 TikTok", sr2 > 0, "结果数 " + sr2);
  await page.click("#article"); await page.waitForTimeout(150);

  // 8. 资料库筛选
  await page.click('#nav a[href="#/library"]');
  await page.waitForTimeout(300);
  const rows = await page.locator("#srcBody tr").count();
  check("资料库 51 条来源", rows === 51, "行数 " + rows);
  await page.click('.fchip[data-type="学术研究"]');
  await page.waitForTimeout(200);
  const visible = await page.locator("#srcBody tr:visible").count();
  check("资料库筛选生效", visible === 17, "学术研究 " + visible + " 行可见");
  await page.click('.fchip[data-type="全部"]');

  // 9. 来源引用跳转
  await page.click('#nav a[href="#/m/m0/m0-1"]');
  await page.waitForTimeout(200);
  await page.click("sup.ref");
  await page.waitForTimeout(300);
  const hl = await page.locator("#srcBody tr.hl").count();
  check("来源引用跳转+高亮", hl === 1, "高亮行 " + hl);

  // 10. 学习路径页
  await page.click('#nav a[href="#/path"]');
  await page.waitForTimeout(200);
  const stageSecs = await page.locator("#article .sec > h2").count();
  check("学习路径 4 阶段", stageSecs === 4, "阶段区块数 " + stageSecs);

  // 11. 实战项目页
  await page.click('#nav a[href="#/project"]');
  await page.waitForTimeout(200);
  const sprints = await page.locator(".sec > h2").count();
  check("实战项目 5 冲刺", sprints === 5, "冲刺数 " + sprints);

  // 11.5 首页模块筛选
  await page.click('#nav a[href="#/"]');
  await page.waitForTimeout(300);
  const cardsAll = await page.locator("#modCards .mod-card:visible").count();
  await page.click('.fchip[data-stage="2"]');
  await page.waitForTimeout(200);
  const cardsS2 = await page.locator("#modCards .mod-card:visible").count();
  check("首页模块筛选", cardsAll === 10 && cardsS2 === 2, "全部 " + cardsAll + " / 阶段二 " + cardsS2);
  await page.click('.fchip[data-stage="0"]');

  // 12. 上一节/下一节导航
  await page.click('#nav a[href="#/m/m3/m3-4"]');
  await page.waitForTimeout(200);
  await page.click(".pn-nav a.next");
  await page.waitForTimeout(300);
  const afterNext = await page.textContent(".sec > h2");
  check("下一节导航", afterNext && afterNext.includes("工作流"), afterNext);

  // 13. 移动端响应式
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await page.click("#hamburger");
  await page.waitForTimeout(300);
  const sidebarOpen = await page.locator("#sidebar.open").count();
  check("移动端抽屉导航", sidebarOpen === 1);
  const noOverflowX = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  check("移动端无横向溢出", noOverflowX);

  // 14. 桌面端截图
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.click("#overlay"); // 关闭抽屉
  await page.goto(file, { waitUntil: "load" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(__dirname, "test-home.png"), fullPage: false });
  await page.click('#nav a[href="#/m/m0/m0-1"]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, "test-section.png"), fullPage: false });
  await page.click('#nav a[href="#/m/m0/quiz"]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, "test-quiz.png"), fullPage: false });

  check("无 JS 控制台错误", errors.length === 0, errors.slice(0, 3).join(" ; ") || "无");

  console.log(results.join("\n"));
  const failed = results.filter(r => r.startsWith("FAIL")).length;
  console.log("\n==== " + (results.length - failed) + "/" + results.length + " 通过 ====");
  await browser.close();
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error("TEST CRASH:", e); process.exit(1); });
