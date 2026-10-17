---
title: 诗集
permalink: /poems/
icon: fas fa-scroll
order: 4
---

{% assign poems = site.poems | sort: 'date' | reverse %}
{% assign latest = poems | first %}

<style>
  /* LaTeX Paper：纸白 / 墨黑 / 弱化灰 / hyperref 蓝，直角无阴影 */
  #poem-paper {
    --paper-serif: "Noto Serif SC", "Source Han Serif SC", "Songti SC", "SimSun", Georgia, "Times New Roman", serif;
  }

  /* 主题在 tabs 页顶部另打一个裸标题，本页用居中文档头替代它 */
  #main-wrapper h1.dynamic-title { display: none; }

  #poem-paper {
    max-width: 44rem;
    margin: 0 auto;
    padding: 2rem 1.25rem 1.5rem;
    background: #FFFFFF;
    color: #111111;
    font-family: var(--paper-serif);
    font-size: 15px;
    line-height: 1.75;
  }

  /* 主题用 `h1,h2,h3,h4,h5{font-family:Lato,...sans-serif}` 强制标题无衬线，
     这里以更高优先级覆盖回衬线（tracking-tight 模拟 Computer Modern） */
  #poem-paper h1,
  #poem-paper h2,
  #poem-paper h3 {
    font-family: var(--paper-serif);
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #111111;
  }

  #poem-paper a {
    color: #0B5394;
    text-decoration: none;
    border-bottom: none;
  }
  #poem-paper a:hover,
  #poem-paper a:focus {
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  #poem-paper a:focus-visible,
  #poem-paper button:focus-visible {
    outline: 1px solid #111111;
    outline-offset: 2px;
  }

  .paper-title { font-size: 1.875rem; }
  .paper-muted { color: #6B6B66; }

  /* 按钮：直角、无阴影、无渐变 */
  #poem-paper .paper-btn {
    font-family: var(--paper-serif);
    font-size: .82rem;
    line-height: 1;
    padding: .45rem .75rem;
    border: 1px solid #111111;
    border-radius: 0;
    background: #FFFFFF;
    color: #111111;
    cursor: pointer;
    transition: background-color .2s, color .2s;
  }
  #poem-paper .paper-btn:hover:not(:disabled),
  #poem-paper .paper-btn:active:not(:disabled) { background: #F5F5F0; }
  #poem-paper .paper-btn.is-active { background: #111111; color: #FFFFFF; }
  #poem-paper .paper-btn.is-active:hover { background: #FFFFFF; color: #111111; }
  #poem-paper .paper-btn:disabled { color: #6B6B66; border-color: #D4D4D0; cursor: default; }

  /* 分页：无脚本时全部条目可见 */
  #poem-catalogue.is-paged .poem-item { display: none; }
  #poem-catalogue.is-paged .poem-item.is-visible { display: block; }

  @media (min-width: 768px) {
    .paper-title { font-size: 2.25rem; }
    #poem-paper { padding: 2.5rem 2rem 2rem; }
  }

  @media (max-width: 640px) {
    #poem-paper { padding: 1.5rem .5rem 1.25rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    #poem-paper .paper-btn { transition: none; }
  }

  @media print {
    #poem-paper { padding: 0; max-width: none; }
    #poem-catalogue.is-paged .poem-item { display: block !important; }
    #poem-pager { display: none !important; }
  }
</style>

<div id="poem-paper">

  <header style="text-align:center;margin-bottom:2rem;padding-bottom:1.25rem;border-bottom:1px solid #D4D4D0">
    <h1 class="paper-title" style="margin:0 0 .5rem">诗集</h1>
    <p style="margin:0;font-size:.875rem;font-style:italic;color:#6B6B66">
      共 {{ poems.size }} 首{% if latest %} · 最近一篇 {{ latest.date | date: '%Y 年 %m 月 %d 日' }}{% endif %}
    </p>
  </header>

  <h2 style="margin:0 0 1.25rem;font-size:1.05rem">存稿目录</h2>

  <div id="poem-catalogue" data-per-page="5">
    <ol style="list-style:none;margin:0;padding:0">
      {% for poem in poems %}
      <li class="poem-item" style="padding-left:2rem;text-indent:-2rem;margin-bottom:1rem">
        <span style="color:#0B5394">[{{ forloop.index }}]</span>
        <a href="{{ poem.url | relative_url }}">{{ poem.title }}</a>
        <span class="paper-muted" style="font-size:.82rem">· {{ poem.date | date: '%Y 年 %m 月 %d 日' }}</span>
        <span class="paper-muted" style="font-size:.82rem">· {{ poem.content | strip_html | strip_newlines | replace: '  ', '' | normalize_whitespace | truncate: 40 }}</span>
      </li>
      {% endfor %}
    </ol>
  </div>

  <nav id="poem-pager" aria-label="存稿目录分页" style="display:none;margin-top:1.5rem;border-top:1px solid #D4D4D0;padding-top:1rem">
    <div id="poem-pager-bar" style="display:flex;flex-wrap:wrap;align-items:center;gap:.5rem"></div>
    <p id="poem-pager-status" class="paper-muted" aria-live="polite" style="margin:.7rem 0 0;font-size:.82rem;font-style:italic"></p>
  </nav>

</div>

<script>
(function () {
  var catalogue = document.getElementById('poem-catalogue');
  var pager = document.getElementById('poem-pager');
  var bar = document.getElementById('poem-pager-bar');
  var status = document.getElementById('poem-pager-status');
  if (!catalogue || !pager || !bar) return;

  var items = Array.prototype.slice.call(catalogue.querySelectorAll('.poem-item'));
  var total = items.length;
  var perPage = parseInt(catalogue.getAttribute('data-per-page'), 10) || 5;
  var pages = Math.ceil(total / perPage);
  if (total === 0 || pages < 2) return;

  var current = 1;
  var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;

  function readUrl() {
    var n = 1;
    try {
      n = parseInt(new URLSearchParams(window.location.search).get('p'), 10) || 1;
    } catch (e) { n = 1; }
    return (n >= 1 && n <= pages) ? n : 1;
  }

  function writeUrl(n) {
    try {
      var params = new URLSearchParams(window.location.search);
      if (n > 1) { params.set('p', String(n)); } else { params.delete('p'); }
      var qs = params.toString();
      window.history.replaceState(window.history.state, '', window.location.pathname + (qs ? '?' + qs : '') + window.location.hash);
    } catch (e) {}
  }

  function button(text, page, ariaLabel) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'paper-btn';
    b.textContent = text;
    if (page) { b.setAttribute('data-page', String(page)); }
    if (ariaLabel) { b.setAttribute('aria-label', ariaLabel); }
    b.addEventListener('click', function () { go(page, true); });
    return b;
  }

  var prevBtn = button('‹ 上一页', 0, '上一页');
  var nextBtn = button('下一页 ›', 0, '下一页');
  prevBtn.addEventListener('click', function () { go(current - 1, true); });
  nextBtn.addEventListener('click', function () { go(current + 1, true); });

  var numberBtns = [];
  bar.appendChild(prevBtn);
  for (var p = 1; p <= pages; p++) {
    var nb = button(String(p), p, '第 ' + p + ' 页');
    numberBtns.push(nb);
    bar.appendChild(nb);
  }
  bar.appendChild(nextBtn);

  function go(n, scroll) {
    n = Math.min(Math.max(n, 1), pages);
    current = n;

    catalogue.classList.add('is-paged');
    for (var i = 0; i < items.length; i++) {
      items[i].classList.toggle('is-visible', Math.floor(i / perPage) === n - 1);
    }

    for (var j = 0; j < numberBtns.length; j++) {
      var on = j + 1 === n;
      numberBtns[j].classList.toggle('is-active', on);
      if (on) { numberBtns[j].setAttribute('aria-current', 'page'); }
      else { numberBtns[j].removeAttribute('aria-current'); }
    }
    prevBtn.disabled = n === 1;
    nextBtn.disabled = n === pages;

    if (status) {
      status.textContent = '第 ' + ((n - 1) * perPage + 1) + '–' + Math.min(n * perPage, total) + ' 首，共 ' + total + ' 首（第 ' + n + ' / ' + pages + ' 页）';
    }

    writeUrl(n);

    if (scroll) {
      var top = catalogue.getBoundingClientRect().top;
      if (top < 0) {
        try { window.scrollBy({ top: top - 16, behavior: reduce ? 'auto' : 'smooth' }); }
        catch (e) { window.scrollBy(0, top - 16); }
      }
    }
  }

  window.addEventListener('popstate', function () { go(readUrl(), false); });

  pager.style.display = '';
  go(readUrl(), false);
})();
</script>
