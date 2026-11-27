/* Writing & Structured Expression — 全站交互脚本 */
(function () {
  'use strict';
  var BASE = window.WSE_BASE || '';
  var PROGRESS_KEY = 'wse.progress.v1';

  /* ---------- 阅读进度条 ---------- */
  var bar = document.getElementById('reading-progress');
  function updateProgress() {
    if (!bar) return;
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);
  updateProgress();

  /* ---------- 移动端目录抽屉 ---------- */
  var tocToggle = document.getElementById('toc-toggle');
  var toc = document.getElementById('toc');
  if (tocToggle && toc) {
    tocToggle.addEventListener('click', function () { toc.classList.toggle('open'); });
    toc.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') toc.classList.remove('open');
    });
  }

  /* ---------- 目录高亮（scrollspy） ---------- */
  var tocLinks = toc ? Array.prototype.slice.call(toc.querySelectorAll('a[href^="#"]')) : [];
  if (tocLinks.length) {
    var map = {};
    tocLinks.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var headings = Object.keys(map).map(function (id) { return document.getElementById(id); }).filter(Boolean);
    var spy = function () {
      var current = headings[0];
      for (var i = 0; i < headings.length; i++) {
        if (headings[i].getBoundingClientRect().top <= 120) current = headings[i];
      }
      tocLinks.forEach(function (a) { a.classList.remove('current'); });
      if (current && map[current.id]) map[current.id].classList.add('current');
    };
    window.addEventListener('scroll', spy, { passive: true });
    spy();
  }

  /* ---------- 学习进度（localStorage） ---------- */
  function readProgress() {
    try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}'); } catch (e) { return {}; }
  }
  function writeProgress(obj) {
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(obj)); } catch (e) {}
  }
  function refreshProgressUI() {
    var p = readProgress();
    document.querySelectorAll('.progress-toggle').forEach(function (btn) {
      var id = btn.getAttribute('data-module');
      if (p[id]) { btn.classList.add('done'); btn.textContent = '✓ 已完成（点击取消）'; }
      else { btn.classList.remove('done'); btn.textContent = '标记为已完成'; }
    });
    document.querySelectorAll('[data-module]').forEach(function (el) {
      if (el.classList.contains('module-card')) {
        var dot = el.querySelector('.status-dot');
        var done = !!p[el.getAttribute('data-module')];
        el.classList.toggle('done', done);
        if (dot) { dot.classList.toggle('done', done); dot.textContent = done ? '已完成' : '未完成'; }
      }
    });
    var doneCount = Object.keys(p).filter(function (k) { return p[k]; }).length;
    document.querySelectorAll('[data-progress-count]').forEach(function (el) { el.textContent = doneCount; });
    document.querySelectorAll('[data-progress-fill]').forEach(function (el) {
      el.style.width = Math.round((doneCount / 20) * 100) + '%';
    });
  }
  document.querySelectorAll('.progress-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var p = readProgress();
      var id = btn.getAttribute('data-module');
      p[id] = !p[id];
      writeProgress(p);
      refreshProgressUI();
    });
  });
  refreshProgressUI();

  /* ---------- 复制模板按钮 ---------- */
  document.querySelectorAll('.copyable').forEach(function (box) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy-btn';
    btn.textContent = '复制';
    btn.setAttribute('aria-label', '复制此模板内容');
    btn.addEventListener('click', function () {
      var body = box.querySelector('.copyable-body');
      var text = body ? body.innerText : '';
      function ok() {
        btn.textContent = '已复制 ✓';
        btn.classList.add('copied');
        setTimeout(function () { btn.textContent = '复制'; btn.classList.remove('copied'); }, 1800);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(ok, function () { fallback(); });
      } else { fallback(); }
      function fallback() {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); ok(); } catch (e) { btn.textContent = '复制失败'; }
        document.body.removeChild(ta);
      }
    });
    var head = box.querySelector('.copyable-head');
    if (head) head.appendChild(btn);
  });

  /* ---------- 术语表筛选 ---------- */
  var filterInput = document.querySelector('.glossary-filter input');
  if (filterInput) {
    filterInput.addEventListener('input', function () {
      var q = filterInput.value.trim().toLowerCase();
      document.querySelectorAll('.glossary-table tbody tr').forEach(function (tr) {
        tr.style.display = !q || tr.textContent.toLowerCase().indexOf(q) >= 0 ? '' : 'none';
      });
    });
  }

  /* ---------- 站内搜索 ---------- */
  var overlay = document.getElementById('search-overlay');
  var searchInput = document.getElementById('search-input');
  var resultsBox = document.getElementById('search-results');
  var trigger = document.getElementById('global-search');
  var form = document.getElementById('search-form');
  var indexData = null;

  function openSearch(prefill) {
    if (!overlay) return;
    overlay.hidden = false;
    if (prefill && searchInput) searchInput.value = prefill;
    if (searchInput) { searchInput.focus(); searchInput.select(); doSearch(); }
  }
  function closeSearch() { if (overlay) overlay.hidden = true; }
  document.getElementById('search-close').addEventListener('click', closeSearch);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeSearch(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeSearch();
  });
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      openSearch(trigger ? trigger.value : '');
    });
  }

  function loadIndex(cb) {
    if (window.WSE_INDEX) { cb(window.WSE_INDEX); return; }
    if (indexData) { cb(indexData); return; }
    var sc = document.createElement('script');
    sc.src = BASE + 'assets/search-index.js';
    sc.onload = function () { cb(window.WSE_INDEX || null); };
    sc.onerror = function () {
      fetch(BASE + 'assets/search-index.json').then(function (r) { return r.json(); })
        .then(function (d) { cb(d); })
        .catch(function () { cb(null); });
    };
    document.head.appendChild(sc);
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function highlight(text, q) {
    if (!q) return escapeHtml(text);
    var idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx < 0) return escapeHtml(text.slice(0, 160));
    var start = Math.max(0, idx - 60);
    var snip = (start > 0 ? '…' : '') + text.slice(start, start + 200) + '…';
    var lower = snip.toLowerCase(), pos = lower.indexOf(q.toLowerCase());
    var out = '', last = 0;
    while (pos >= 0) {
      out += escapeHtml(snip.slice(last, pos)) + '<mark>' + escapeHtml(snip.slice(pos, pos + q.length)) + '</mark>';
      last = pos + q.length;
      pos = lower.indexOf(q.toLowerCase(), last);
    }
    return out + escapeHtml(snip.slice(last));
  }

  function doSearch() {
    var q = (searchInput.value || '').trim();
    if (!q) {
      resultsBox.innerHTML = '<div class="hint">输入关键词开始搜索。可搜索模块标题、章节标题与正文内容，例如「MECE」「执行摘要」「Toulmin」「主动语态」。</div>';
      return;
    }
    if (!indexData) {
      resultsBox.innerHTML = '<div class="hint">正在加载搜索索引…</div>';
      loadIndex(function (data) {
        if (!data) {
          resultsBox.innerHTML = '<div class="hint">搜索索引加载失败。请确认 assets/search-index.js 存在。</div>';
          return;
        }
        indexData = data;
        doSearch();
      });
      return;
    }
    var ql = q.toLowerCase(), results = [];
    indexData.pages.forEach(function (page) {
      var titleHit = page.t.toLowerCase().indexOf(ql) >= 0;
      page.s.forEach(function (sec) {
        var score = 0;
        if (sec.h.toLowerCase().indexOf(ql) >= 0) score += 10;
        if (titleHit) score += 6;
        var xi = sec.x.toLowerCase().indexOf(ql);
        if (xi >= 0) score += 5 + (xi < 200 ? 2 : 0);
        if (score > 0) results.push({ page: page, sec: sec, score: score });
      });
      if (titleHit && results.filter(function (r) { return r.page === page; }).length === 0) {
        results.push({ page: page, sec: { a: '', h: page.t, x: '模块首页' }, score: 3 });
      }
    });
    results.sort(function (a, b) { return b.score - a.score; });
    results = results.slice(0, 25);
    if (!results.length) {
      resultsBox.innerHTML = '<div class="hint">没有找到「' + escapeHtml(q) + '」相关内容。可尝试更短的关键词。</div>';
      return;
    }
    var html = '<div class="hint">找到 ' + results.length + ' 条结果（点击跳转）</div>';
    results.forEach(function (r) {
      var url = BASE + r.page.p + (r.sec.a ? '#' + r.sec.a : '');
      html += '<a class="result" href="' + url + '">'
        + '<span class="r-title">' + escapeHtml(r.page.t) + '</span>'
        + '<span class="r-sec">' + escapeHtml(r.sec.h) + '</span>'
        + '<div class="r-snip">' + highlight(r.sec.x, q) + '</div></a>';
    });
    resultsBox.innerHTML = html;
  }
  if (searchInput) {
    searchInput.addEventListener('input', doSearch);
    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        var first = resultsBox.querySelector('.result');
        if (first) window.location.href = first.getAttribute('href');
      }
    });
  }
})();
