/* ============================================================
   跨境电商全体系自学指南 — 交互逻辑
   依赖：assets/js/data.js（COURSE / GLOSSARY）
   说明：进度与笔记使用 localStorage，仅存于当前浏览器，不具备云同步能力。
   ============================================================ */
(function () {
  "use strict";
  var BASE = document.body.getAttribute("data-base") || "";
  var PKEY = "xbce_progress_v1";

  /* ---------- 工具 ---------- */
  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function loadProgress() {
    try { return JSON.parse(localStorage.getItem(PKEY)) || { done: {}, ex: {}, last: "" }; }
    catch (e) { return { done: {}, ex: {}, last: "" }; }
  }
  function saveProgress(p) {
    try { localStorage.setItem(PKEY, JSON.stringify(p)); } catch (e) { /* 隐私模式等场景下降级 */ }
  }
  var PROG = loadProgress();

  /* ---------- 侧栏 ---------- */
  function renderSidebar() {
    var nav = $("#sidebarNav");
    if (!nav) return;
    var curMod = (location.hash || "").replace("#", "") || (document.body.getAttribute("data-mod") || "");
    var html = "";
    COURSE.stages.forEach(function (st) {
      var doneCount = st.modules.filter(function (m) { return PROG.done[m.id]; }).length;
      var open = st.modules.some(function (m) { return m.id === curMod; }) || st.modules.some(function (m) { return m.file === (location.pathname.split("/").pop() === "index.html" ? "" : location.pathname.split("/").pop()) && false; });
      if (location.pathname.indexOf(st.file) !== -1) open = true;
      html += '<div class="stage-group' + (open ? " open" : "") + '" data-stage="' + st.id + '">';
      html += '<button class="stage-btn" type="button"><span class="stage-badge">' + st.id + '</span><span class="t">' + esc(st.name) + '</span><span class="n">' + doneCount + "/" + st.modules.length + '</span><svg class="arrow" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
      html += '<div class="stage-mods">';
      st.modules.forEach(function (m) {
        var active = m.id === curMod ? " active" : "";
        var done = PROG.done[m.id] ? " done" : "";
        var pri = m.priority.toLowerCase();
        html += '<a class="mod-link' + active + '" href="' + BASE + m.file + "#" + m.anchor + '">' +
          '<span class="dot' + done + '" data-dot="' + m.id + '" title="标记掌握状态"></span>' +
          '<span class="num">' + m.num + '</span><span>' + esc(m.title) + '</span>' +
          '<span class="pri ' + pri + '">' + m.priority + "</span></a>";
      });
      html += "</div></div>";
    });
    html += '<div class="side-foot">' +
      '<a href="' + BASE + 'index.html">返回课程首页</a>' +
      '<a href="' + BASE + 'sources.html">参考资料索引</a>' +
      '<button class="reset-link" id="resetProg" type="button">清除学习进度</button></div>';
    nav.innerHTML = html;

    $$(".stage-btn", nav).forEach(function (btn) {
      btn.addEventListener("click", function () { btn.parentElement.classList.toggle("open"); });
    });
    $$("[data-dot]", nav).forEach(function (dot) {
      dot.addEventListener("click", function (e) {
        e.preventDefault(); e.stopPropagation();
        var id = dot.getAttribute("data-dot");
        if (PROG.done[id]) delete PROG.done[id]; else PROG.done[id] = true;
        saveProgress(PROG); dot.classList.toggle("done");
        updatePill(); if (typeof renderDash === "function") renderDash();
      });
    });
    var rst = $("#resetProg", nav);
    if (rst) rst.addEventListener("click", function () {
      if (confirm("确定清除全部学习进度？此操作不可恢复。")) {
        PROG = { done: {}, ex: {}, last: "" }; saveProgress(PROG);
        $$("[data-dot]").forEach(function (d) { d.classList.remove("done"); });
        $$(".mod-done-btn").forEach(function (b) { b.textContent = "标记本模块为已掌握"; b.classList.remove("done"); });
        updatePill(); if (typeof renderDash === "function") renderDash();
      }
    });
  }

  /* ---------- 顶部进度 ---------- */
  function updatePill() {
    var total = 0, done = 0;
    COURSE.stages.forEach(function (st) { st.modules.forEach(function (m) { total++; if (PROG.done[m.id]) done++; }); });
    $$(".prog-pill").forEach(function (p) {
      var bar = $(".bar i", p); var txt = $(".txt", p);
      if (bar) bar.style.width = (total ? Math.round(done / total * 100) : 0) + "%";
      if (txt) txt.textContent = done + " / " + total + " 模块";
    });
  }

  /* ---------- 页内目录 ---------- */
  function slug(s) {
    return "sec-" + String(s).replace(/[^\w\u4e00-\u9fa5]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase().slice(0, 40);
  }
  function buildToc() {
    var toc = $("#pageToc");
    if (!toc) return;
    var main = $("#main");
    var mods = $$(".module", main);
    if (!mods.length) { toc.style.display = "none"; return; }
    var hash = (location.hash || "").replace("#", "");
    var target = null;
    mods.forEach(function (m) { if (m.id === hash) target = m; });
    if (!target) target = mods[0];
    var heads = $$("h2, h3", target);
    if (!heads.length) { toc.style.display = "none"; return; }
    var html = '<div class="toc-title">本模块目录</div><ul class="toc-list">';
    heads.forEach(function (h) {
      if (!h.id) h.id = slug(h.textContent);
      var cls = h.tagName === "H3" ? "l3" : "";
      html += '<li class="' + cls + '"><a href="#' + h.id + '">' + esc(h.textContent.replace(/^\d+\s*/, "")) + "</a></li>";
    });
    html += "</ul>";
    toc.innerHTML = html;
    var links = $$("a", toc);
    if ("IntersectionObserver" in window) {
      if (toc._obs) { heads.forEach(function (h) { toc._obs.unobserve(h); }); }
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            links.forEach(function (a) { a.classList.toggle("active", a.getAttribute("href") === "#" + en.target.id); });
          }
        });
      }, { rootMargin: "-70px 0px -70% 0px" });
      heads.forEach(function (h) { obs.observe(h); });
      toc._obs = obs;
    }
  }
  window.addEventListener("hashchange", function () { setTimeout(buildToc, 60); });

  /* ---------- 搜索 ---------- */
  var TOOLS = [
    { title: "Google Trends", url: "https://trends.google.com/", type: "tool", desc: "搜索热度趋势，用于判断需求季节性与区域差异" },
    { title: "Google Keyword Planner", url: "https://ads.google.com/home/tools/keyword-planner/", type: "tool", desc: "关键词搜索量与竞价参考（需 Google Ads 账户）" },
    { title: "Google Search Console", url: "https://search.google.com/search-console", type: "tool", desc: "官方索引与搜索表现数据，SEO 诊断第一入口" },
    { title: "Google Analytics 4", url: "https://analytics.google.com/", type: "tool", desc: "网站与用户行为分析，事件模型" },
    { title: "Shopify Help Center", url: "https://help.shopify.com/", type: "tool", desc: "Shopify 官方操作文档，功能与价格核验第一来源" },
    { title: "Google Merchant Center", url: "https://merchants.google.com/", type: "tool", desc: "商品数据源管理，购物广告与免费商品详情入口" },
    { title: "Meta Ad Library", url: "https://www.facebook.com/ads/library/", type: "tool", desc: "公开广告素材库，竞品创意研究" },
    { title: "Google Ads Transparency", url: "https://adstransparency.google.com/", type: "tool", desc: "广告主透明报告" },
    { title: "Amazon Best Sellers", url: "https://www.amazon.com/Best-Sellers/zgbs", type: "tool", desc: "平台实时榜单，需求与竞争初筛" },
    { title: "Similarweb", url: "https://www.similarweb.com/", type: "tool", desc: "网站流量估算（估算数据，非精确值）" },
    { title: "ITC Trade Map", url: "https://www.trademap.org/", type: "tool", desc: "国际贸易进出口数据（国际商会/ITC）" },
    { title: "World Bank Data", url: "https://data.worldbank.org/", type: "tool", desc: "各国宏观与人口数据" },
    { title: "Eurostat", url: "https://ec.europa.eu/eurostat", type: "tool", desc: "欧盟官方统计" },
    { title: "U.S. Census Bureau", url: "https://www.census.gov/", type: "tool", desc: "美国官方统计，含电商占零售比例" },
    { title: "ONS", url: "https://www.ons.gov.uk/", type: "tool", desc: "英国国家统计局，含线上销售占比" },
    { title: "EU Taxation & Customs", url: "https://taxation-customs.ec.europa.eu/", type: "tool", desc: "欧盟关税与 VAT 官方门户（OSS/IOSS）" },
    { title: "FTC Business Guidance", url: "https://www.ftc.gov/business-guidance", type: "tool", desc: "美国联邦贸易委员会商业合规指南" },
    { title: "EUR-Lex", url: "https://eur-lex.europa.eu/", type: "tool", desc: "欧盟法律法规官方文本库" }
  ];
  function buildIndex() {
    var idx = [];
    COURSE.stages.forEach(function (st) {
      st.modules.forEach(function (m) {
        idx.push({ title: "模块 " + m.num + " " + m.title, url: BASE + m.file + "#" + m.anchor, type: "module", desc: m.goal, mod: st.name });
        m.topics.forEach(function (t) {
          idx.push({ title: m.num + " · " + t, url: BASE + m.file + "#" + m.anchor, type: "topic", desc: "模块 " + m.num + " " + m.title, mod: st.name });
        });
      });
    });
    GLOSSARY.forEach(function (g) {
      idx.push({ title: g.t, url: BASE + "sources.html#glossary", type: "term", desc: g.f + "：" + g.d.slice(0, 70) + "…", mod: "术语表" });
    });
    TOOLS.forEach(function (t) { idx.push(t); });
    return idx;
  }
  var SIDX = buildIndex();
  function highlight(text, q) {
    var i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0 || !q) return esc(text);
    return esc(text.slice(0, i)) + "<mark>" + esc(text.slice(i, i + q.length)) + "</mark>" + esc(text.slice(i + q.length));
  }
  function setupSearch() {
    var modal = $("#searchModal"), input = $("#searchInput"), box = $("#searchResults");
    if (!modal || !input || !box) return;
    var sel = -1, results = [];
    function open() { modal.classList.add("open"); input.value = ""; box.innerHTML = ""; sel = -1; setTimeout(function () { input.focus(); }, 30); }
    function close() { modal.classList.remove("open"); }
    function render(q) {
      results = [];
      if (q && q.trim().length > 0) {
        var k = q.trim().toLowerCase();
        results = SIDX.filter(function (it) {
          return (it.title + " " + (it.desc || "") + " " + (it.mod || "")).toLowerCase().indexOf(k) !== -1;
        }).slice(0, 14);
      }
      if (!results.length) {
        box.innerHTML = '<div class="search-empty">' + (q ? "未找到相关内容，试试更短的关键词" : "输入模块名、章节、术语或工具名称开始搜索") + "</div>";
        return;
      }
      box.innerHTML = results.map(function (r, i) {
        var typeName = { module: "模块", topic: "章节", term: "术语", tool: "工具/官方资源" }[r.type] || r.type;
        return '<a class="sr-item" data-i="' + i + '" href="' + r.url + '"' + (r.type === "tool" ? ' target="_blank" rel="noopener"' : "") + ">" +
          '<div class="st">' + highlight(r.title, q) + '</div>' +
          (r.desc ? '<div class="sd">' + highlight(r.desc, q) + "</div>" : "") +
          '<div class="sm">' + typeName + (r.mod ? " · " + esc(r.mod) : "") + "</div></a>";
      }).join("");
      $$(".sr-item", box).forEach(function (a) {
        a.addEventListener("click", function () { close(); });
      });
    }
    $$(".search-trigger").forEach(function (t) { t.addEventListener("click", open); });
    input.addEventListener("input", function () { render(input.value); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        var items = $$(".sr-item", box);
        if (!items.length) return;
        sel = e.key === "ArrowDown" ? Math.min(sel + 1, items.length - 1) : Math.max(sel - 1, 0);
        items.forEach(function (a, i) { a.classList.toggle("sel", i === sel); });
        items[sel].scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter") {
        var act = $(".sr-item.sel", box) || $(".sr-item", box);
        if (act) { location.href = act.getAttribute("href"); close(); }
      } else if (e.key === "Escape") { close(); }
    });
    modal.addEventListener("click", function (e) { if (e.target === modal) close(); });
    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); open(); }
      if (e.key === "Escape") close();
    });
  }

  /* ---------- 术语弹卡 ---------- */
  function setupGlossary() {
    var pop = $("#glossaryPop");
    if (!pop) return;
    document.addEventListener("click", function (e) {
      var t = e.target.closest ? e.target.closest(".term") : null;
      if (t) {
        var name = t.getAttribute("data-term");
        var g = GLOSSARY.filter(function (x) { return x.t === name; })[0];
        if (g) {
          pop.innerHTML = '<div class="gt">' + esc(g.t) + '</div><div class="gf">' + esc(g.f) + '</div><div class="gd">' + esc(g.d) + "</div>";
          pop.style.display = "block";
          var r = t.getBoundingClientRect();
          var top = r.bottom + window.scrollY + 8;
          var left = Math.min(r.left + window.scrollX, window.innerWidth - 360);
          if (r.bottom > window.innerHeight - 220) top = r.top + window.scrollY - pop.offsetHeight - 8;
          pop.style.top = top + "px"; pop.style.left = Math.max(10, left) + "px";
          e.preventDefault();
        }
      } else if (!e.target.closest || !e.target.closest("#glossaryPop")) {
        pop.style.display = "none";
      }
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") pop.style.display = "none"; });
  }

  /* ---------- 模块掌握按钮（支持每页多个模块） ---------- */
  function setupModuleActions() {
    $$(".mod-done-btn").forEach(function (btn) {
      var mod = btn.getAttribute("data-mod");
      if (!mod) return;
      var refresh = function () {
        var d = PROG.done[mod];
        btn.textContent = d ? "✓ 已标记掌握（点击取消）" : "标记本模块为已掌握";
        btn.classList.toggle("done", !!d);
      };
      refresh();
      btn.addEventListener("click", function () {
        if (PROG.done[mod]) delete PROG.done[mod]; else { PROG.done[mod] = true; PROG.last = mod; }
        saveProgress(PROG); refresh(); updatePill(); renderSidebar();
        var dot = $('[data-dot="' + mod + '"]'); if (dot) dot.classList.toggle("done", !!PROG.done[mod]);
      });
    });
    $$(".mod-ex-btn").forEach(function (btn) {
      var mod = btn.getAttribute("data-mod");
      if (!mod) return;
      var refreshEx = function () {
        var d = PROG.ex[mod];
        btn.textContent = d ? "✓ 练习已完成（点击取消）" : "标记本模块练习已完成";
        btn.classList.toggle("done", !!d);
      };
      refreshEx();
      btn.addEventListener("click", function () {
        if (PROG.ex[mod]) delete PROG.ex[mod]; else PROG.ex[mod] = true;
        saveProgress(PROG); refreshEx();
      });
    });
  }

  /* ---------- 模板复制 ---------- */
  function setupCopy() {
    $$(".tpl").forEach(function (tpl) {
      var btn = document.createElement("button");
      btn.className = "copy-btn"; btn.type = "button"; btn.textContent = "复制模板";
      btn.addEventListener("click", function () {
        var body = $(".tpl-body", tpl) || tpl;
        var text = body.innerText.replace("复制模板", "").trim();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () {
            btn.textContent = "已复制 ✓"; btn.classList.add("copied");
            setTimeout(function () { btn.textContent = "复制模板"; btn.classList.remove("copied"); }, 1800);
          });
        } else {
          var ta = document.createElement("textarea");
          ta.value = text; document.body.appendChild(ta); ta.select();
          try { document.execCommand("copy"); btn.textContent = "已复制 ✓"; } catch (e) { btn.textContent = "复制失败"; }
          document.body.removeChild(ta);
          setTimeout(function () { btn.textContent = "复制模板"; btn.classList.remove("copied"); }, 1800);
        }
      });
      tpl.appendChild(btn);
    });
  }

  /* ---------- 计算器 ---------- */
  function fmt(n, d) {
    if (!isFinite(n)) return "—";
    return "¥" + Number(n).toFixed(d === undefined ? 2 : d).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  function pct(n) { return isFinite(n) ? (n * 100).toFixed(1) + "%" : "—"; }
  function bindCalc(id, fn) {
    var el = document.getElementById(id);
    if (!el) return;
    var inputs = $$("input", el);
    function run() {
      $$("input[type=range]", el).forEach(function (r) {
        var cv = r.parentElement.querySelector(".cv");
        if (cv) cv.textContent = r.value;
      });
      fn(el);
    }
    inputs.forEach(function (i) { i.addEventListener("input", run); i.addEventListener("change", run); });
    run();
  }
  function out(id, val, label, cls) {
    var b = document.getElementById(id);
    if (!b) return;
    b.innerHTML = "<b class='" + (cls || "") + "'>" + val + "</b><span>" + label + "</span>";
  }
  function setupCalcs() {
    /* 单位经济计算器（模块 20） */
    bindCalc("calc-unit", function (el) {
      var v = function (id) { return parseFloat(($("#" + id, el) || {}).value) || 0; };
      var price = v("u-price"), cost = v("u-cost"), ship = v("u-ship"), pay = v("u-pay") / 100,
          extra = v("u-extra"), orders = v("u-orders"), ads = v("u-ads");
      var payFee = price * pay;
      var contribution = price - cost - ship - payFee - extra;
      var cm = price ? contribution / price : 0;
      var beRoas = cm > 0 ? 1 / cm : Infinity;
      var revenue = price * orders;
      var roas = ads > 0 ? revenue / ads : Infinity;
      var cac = orders > 0 ? ads / orders : Infinity;
      var payback = contribution > 0 && isFinite(cac) ? cac / contribution : Infinity;
      var adProfit = revenue - cost * orders - ship * orders - payFee * orders - extra * orders - ads;
      out("o-contrib", fmt(contribution), "单件贡献利润", contribution >= 0 ? "good" : "bad");
      out("o-cm", pct(cm), "贡献利润率", cm >= 0.2 ? "good" : (cm > 0 ? "" : "bad"));
      out("o-beroas", isFinite(beRoas) ? beRoas.toFixed(2) : "—", "盈亏平衡 ROAS（1÷贡献利润率）");
      out("o-roas", isFinite(roas) ? roas.toFixed(2) : "—", "实际 ROAS（营收÷广告费）", isFinite(roas) && roas > beRoas ? "good" : "bad");
      out("o-cac", isFinite(cac) ? fmt(cac) : "—", "CAC（广告费÷订单数）");
      out("o-payback", isFinite(payback) ? payback.toFixed(1) + " 单" : "—", "CAC 回收期（按贡献利润）");
      out("o-adprofit", fmt(adProfit), "月度广告后利润（贡献口径）", adProfit >= 0 ? "good" : "bad");
    });
    /* LTV 计算器（模块 20） */
    bindCalc("calc-ltv", function (el) {
      var v = function (id) { return parseFloat(($("#" + id, el) || {}).value) || 0; };
      var aov = v("l-aov"), freq = v("l-freq"), gm = v("l-gm") / 100, years = v("l-years"), cac = v("l-cac");
      var ltv = aov * freq * gm * years;
      var ratio = cac > 0 ? ltv / cac : Infinity;
      var paybackM = (aov * freq * gm) > 0 && cac > 0 ? cac / (aov * freq * gm / 12) : Infinity;
      out("o-ltv", fmt(ltv, 0), "客户终身价值（简化口径）");
      out("o-ratio", isFinite(ratio) ? ratio.toFixed(2) + " ×" : "—", "LTV / CAC（≥3 为常见经验线）", isFinite(ratio) && ratio >= 3 ? "good" : "");
      out("o-ltvpayback", isFinite(paybackM) ? paybackM.toFixed(1) + " 个月" : "—", "CAC 回收期（按月均毛利）", isFinite(paybackM) && paybackM <= 12 ? "good" : "");
    });
    /* 选品评分计算器（模块 04） */
    bindCalc("calc-select", function (el) {
      var total = 0, max = 0, detail = [];
      $$("[data-w]", el).forEach(function (sl) {
        var w = parseFloat(sl.getAttribute("data-w"));
        var val = parseFloat(sl.value);
        total += w * val; max += w * 5;
        detail.push("<b>" + sl.getAttribute("data-name") + "</b> " + val + "/5（权重 " + Math.round(w * 100) + "%）→ " + (w * val).toFixed(2));
      });
      var score = max ? total / max * 5 : 0;
      var grade = score >= 4.3 ? ["A · 优先立项", "good"] : score >= 3.6 ? ["B · 小批量验证", ""] : score >= 3 ? ["C · 补充研究后再定", ""] : ["D · 谨慎或放弃", "bad"];
      out("o-select-score", score.toFixed(2) + " / 5", "加权总分", grade[1]);
      var g = $("#o-select-grade"); if (g) g.innerHTML = "<b class='" + grade[1] + "'>" + grade[0] + "</b><span>评级（权重可调）</span>";
      var d = $("#o-select-detail"); if (d) d.innerHTML = "<span>" + detail.join("<br>") + "</span>";
    });
    /* 市场评分计算器（模块 02） */
    bindCalc("calc-market", function (el) {
      var total = 0, max = 0, detail = [];
      $$("[data-w]", el).forEach(function (sl) {
        var w = parseFloat(sl.getAttribute("data-w"));
        var val = parseFloat(sl.value);
        total += w * val; max += w * 5;
        detail.push("<b>" + sl.getAttribute("data-name") + "</b> " + val + "/5（权重 " + Math.round(w * 100) + "%）→ " + (w * val).toFixed(2));
      });
      var score = max ? total / max * 5 : 0;
      var grade = score >= 4.2 ? ["优先进入", "good"] : score >= 3.5 ? ["试点进入", ""] : score >= 2.8 ? ["观望/小成本测试", ""] : ["暂不进入", "bad"];
      out("o-market-score", score.toFixed(2) + " / 5", "加权总分", grade[1]);
      var g = $("#o-market-grade"); if (g) g.innerHTML = "<b class='" + grade[1] + "'>" + grade[0] + "</b><span>结论（权重可调）</span>";
      var d = $("#o-market-detail"); if (d) d.innerHTML = "<span>" + detail.join("<br>") + "</span>";
    });
    /* 定价计算器（模块 21） */
    bindCalc("calc-price", function (el) {
      var v = function (id) { return parseFloat(($("#" + id, el) || {}).value) || 0; };
      var price = v("p-price"), cost = v("p-cost"), varp = v("p-var"), target = v("p-target") / 100;
      var contribution = price - cost - varp;
      var cm = price ? contribution / price : 0;
      var need = target < 1 ? (cost + varp) / (1 - target) : NaN;
      out("o-price-cm", pct(cm), "当前贡献利润率", cm >= target ? "good" : "bad");
      out("o-price-need", isFinite(need) ? fmt(need) : "—", "达到目标贡献利润率所需最低价");
      out("o-price-room", isFinite(need) && price >= need ? fmt(price - need) : "—", "降价空间（至目标利润率）");
    });
  }

  /* ---------- 首页仪表盘 ---------- */
  window.renderDash = function () {
    var ring = $("#dashRing"), pctEl = $("#dashPct");
    if (!ring && !$("#dashStages")) return;
    var total = 0, done = 0, exDone = 0;
    COURSE.stages.forEach(function (st) {
      st.modules.forEach(function (m) { total++; if (PROG.done[m.id]) done++; });
    });
    COURSE.stages.forEach(function (st) {
      st.modules.forEach(function (m) { if (PROG.ex[m.id]) exDone++; });
    });
    var p = total ? Math.round(done / total * 100) : 0;
    if (pctEl) pctEl.textContent = p + "%";
    if (ring) {
      var c = 2 * Math.PI * 52;
      ring.style.strokeDasharray = c;
      ring.style.strokeDashoffset = c * (1 - p / 100);
    }
    var doneEl = $("#dashDone"); if (doneEl) doneEl.textContent = done + " / " + total;
    var exEl = $("#dashEx"); if (exEl) exEl.textContent = exDone + " / " + total;
    var stBox = $("#dashStages");
    if (stBox) {
      stBox.innerHTML = COURSE.stages.map(function (st) {
        var t = st.modules.length, d = st.modules.filter(function (m) { return PROG.done[m.id]; }).length;
        var w = t ? Math.round(d / t * 100) : 0;
        return '<div class="sp-row"><a class="nm" href="' + BASE + st.file + '">' + st.id + " · " + esc(st.name) + '</a><div class="bar"><i style="width:' + w + '%"></i></div><span class="vl">' + d + "/" + t + "</span></div>";
      }).join("");
    }
    var rec = $("#dashRecent");
    if (rec) {
      if (PROG.last) {
        var m = null;
        COURSE.stages.forEach(function (st) { st.modules.forEach(function (x) { if (x.id === PROG.last) m = x; }); });
        if (m) rec.innerHTML = '继续学习：<a href="' + BASE + m.file + "#" + m.anchor + '">模块 ' + m.num + " " + esc(m.title) + "</a>";
      } else {
        rec.innerHTML = "还没有学习记录，从 <a href=\"" + BASE + 'modules/stage-a.html#m01">模块 01</a> 开始。';
      }
    }
  };

  /* ---------- 移动端 ---------- */
  function setupMobile() {
    var btn = $("#menuBtn"), sb = $("#sidebar"), mask = $("#mask");
    if (!btn || !sb) return;
    btn.addEventListener("click", function () {
      sb.classList.toggle("open"); if (mask) mask.classList.toggle("show");
    });
    if (mask) mask.addEventListener("click", function () { sb.classList.remove("open"); mask.classList.remove("show"); });
    $$(".mod-link", sb).forEach(function (a) {
      a.addEventListener("click", function () { sb.classList.remove("open"); if (mask) mask.classList.remove("show"); });
    });
  }

  /* ---------- 返回顶部 ---------- */
  function setupToTop() {
    var b = $("#toTop");
    if (!b) return;
    window.addEventListener("scroll", function () {
      b.classList.toggle("show", window.scrollY > 600);
    }, { passive: true });
    b.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
  }

  /* ---------- 启动 ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    renderSidebar(); updatePill(); buildToc(); setupSearch(); setupGlossary();
    setupModuleActions(); setupCopy(); setupCalcs(); setupMobile(); setupToTop();
    if (typeof renderDash === "function" && document.body.getAttribute("data-page") === "home") renderDash();
    var main = $("#main");
    if (main) {
      $$("a[href^='#']", main).forEach(function (a) {
        a.addEventListener("click", function () {
          if (a.getAttribute("href").indexOf("m") === 1) { PROG.last = a.getAttribute("href").slice(1); saveProgress(PROG); }
        });
      });
    }
  });
})();
