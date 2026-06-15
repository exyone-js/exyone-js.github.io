/**
 * Main JavaScript (Presentation Layer)
 *
 * Handles:
 *   - Mobile nav toggle
 *   - Back-to-top button
 *   - Reading progress bar
 *   - Table of contents generation + scroll spy
 *   - Smooth anchor scrolling
 *   - Theme toggle (dark/light) with localStorage persistence
 *   - Digital clock + mini calendar
 *   - Client-side fuzzy search (Fuse.js, loaded via base.njk)
 */

/* ================================================================ */
/*  Scroll Lock — prevents layout shift when hiding scrollbar        */
/* ================================================================ */
function lockScroll() {
  var scrollbarW = window.innerWidth - document.documentElement.clientWidth;
  document.body.style.overflow = "hidden";
  if (scrollbarW > 0) document.body.style.paddingRight = scrollbarW + "px";
}

function unlockScroll() {
  document.body.style.overflow = "";
  document.body.style.paddingRight = "";
}

(function () {
  "use strict";

  /* ================================================================ */
  /*  Mobile Navigation Toggle                                         */
  /* ================================================================ */
  const navToggle = document.getElementById("navToggle");
  const leftNav = document.getElementById("leftNav");
  const navOverlay = document.getElementById("navOverlay");

  if (navToggle && leftNav) {
    var isMobile = window.matchMedia("(max-width: 767px)");

    function openDrawer() {
      if (!isMobile.matches) return;
      leftNav.classList.add("active");
      if (navOverlay) navOverlay.classList.add("active");
      lockScroll();
    }

    function closeDrawer() {
      leftNav.classList.remove("active");
      if (navOverlay) navOverlay.classList.remove("active");
      unlockScroll();
    }

    navToggle.addEventListener("click", function () {
      if (leftNav.classList.contains("active")) closeDrawer();
      else openDrawer();
    });

    if (navOverlay) {
      navOverlay.addEventListener("click", closeDrawer);
    }

    // Auto-close when clicking a nav link inside the drawer
    leftNav.addEventListener("click", function (e) {
      if (e.target.closest(".left-nav__item")) closeDrawer();
    });

    // Auto-close nav on Escape key
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && leftNav.classList.contains("active")) closeDrawer();
    });

    // Close drawer if viewport resizes past mobile breakpoint
    isMobile.addEventListener("change", function (e) {
      if (!e.matches) closeDrawer();
    });
  }

  /* ================================================================ */
  /*  Back to Top Button                                               */
  /* ================================================================ */
  const backToTop = document.getElementById("backToTop");

  if (backToTop) {
    let ticking = false;

    window.addEventListener("scroll", function () {
      if (!ticking) {
        window.requestAnimationFrame(function () {
          backToTop.classList.toggle("visible", window.scrollY > 300);
          ticking = false;
        });
        ticking = true;
      }
    });

    backToTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ================================================================ */
  /*  Reading Progress Bar                                             */
  /* ================================================================ */
  const progressBar = document.getElementById("readingProgress");

  if (progressBar) {
    let ticking = false;

    window.addEventListener("scroll", function () {
      if (!ticking) {
        window.requestAnimationFrame(function () {
          const scrollTop = window.scrollY;
          const docHeight = document.documentElement.scrollHeight - window.innerHeight;
          const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
          progressBar.style.width = progress + "%";
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  /* ================================================================ */
  /*  Heading Anchors + Table of Contents                              */
  /*  - Assigns slug IDs to all content headings (h1-h6)               */
  /*  - Injects a clickable <a> anchor that copies the heading URL     */
  /*  - Builds the sidebar TOC from h2/h3                              */
  /* ================================================================ */
  const tocCard = document.getElementById("tocCard");
  const tocContainer = document.getElementById("toc");
  const mainContent = document.getElementById("main-content");

  /** Build a URL-safe slug from heading text (handles CJK + latin). */
  function slugify(text) {
    return String(text || "")
      .trim()
      .toLowerCase()
      .replace(/[\s]+/g, "-")
      .replace(/[^\p{L}\p{N}-]/gu, "")
      .replace(/^-+|-+$/g, "")
      || "section";
  }

  /** Copy text to clipboard with a legacy fallback for older browsers. */
  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); resolve(); }
      catch (e) { reject(e); }
      finally { document.body.removeChild(ta); }
    });
  }

  if (mainContent) {
    const contentArea = mainContent.querySelector(".post-detail__content");
    if (contentArea) {
      const allHeadings = contentArea.querySelectorAll("h1, h2, h3, h4, h5, h6");
      const usedIds = {};

      // 1. Assign slug IDs + inject clickable anchors on EVERY heading
      allHeadings.forEach(function (heading) {
        if (!heading.id) {
          var base = slugify(heading.textContent);
          var id = base;
          var n = 2;
          while (usedIds[id]) { id = base + "-" + n; n++; }
          usedIds[id] = true;
          heading.id = id;
        } else {
          usedIds[heading.id] = true;
        }

        // Skip if an anchor is already present (idempotent)
        if (heading.querySelector(".heading-anchor")) return;

        // Create wrapper to hold both anchor and tooltip
        var wrapper = document.createElement("span");
        wrapper.className = "heading-anchor-wrapper";

        var anchor = document.createElement("a");
        anchor.className = "heading-anchor";
        anchor.href = "#" + heading.id;
        anchor.setAttribute("aria-label", "复制此标题链接");
        anchor.title = "复制标题链接";

        var tip = document.createElement("span");
        tip.className = "heading-anchor__copied";
        tip.textContent = "已复制";

        anchor.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          var url = location.origin + location.pathname + "#" + heading.id;
          copyToClipboard(url).then(
            function () {
              tip.classList.add("is-visible");
              setTimeout(function () { tip.classList.remove("is-visible"); }, 1400);
              history.replaceState(null, "", "#" + heading.id);
            },
            function () { /* silently ignore copy failures */ }
          );
        });

        wrapper.appendChild(anchor);
        wrapper.appendChild(tip);
        heading.appendChild(wrapper);
      });

      // 2. Build the sidebar TOC from h2/h3 only
      const tocHeadings = contentArea.querySelectorAll("h2, h3");

      if (tocContainer && tocHeadings.length > 1) {
        if (tocCard) tocCard.style.display = "block";

        const tocList = document.createElement("ul");
        tocList.className = "toc__list";

        tocHeadings.forEach(function (heading) {
          var li = document.createElement("li");
          li.className = heading.tagName === "H2" ? "toc__item" : "toc__item toc__item--sub";

          // Extract text content, excluding the anchor wrapper element
          var text = "";
          heading.childNodes.forEach(function (node) {
            if (node.nodeType === Node.TEXT_NODE) {
              text += node.textContent;
            } else if (node.nodeType === Node.ELEMENT_NODE && !node.classList.contains("heading-anchor-wrapper")) {
              // Include text from other elements (like <code>, <strong>, etc.) but not the anchor wrapper
              text += node.textContent;
            }
          });
          text = text.trim();

          var a = document.createElement("a");
          a.href = "#" + heading.id;
          a.textContent = text;

          li.appendChild(a);
          tocList.appendChild(li);

          a.addEventListener("click", function (e) {
            e.preventDefault();
            var target = document.getElementById(heading.id);
            if (target) {
              target.scrollIntoView({ behavior: "smooth", block: "start" });
              history.pushState(null, "", "#" + heading.id);
            }
          });
        });

        tocContainer.appendChild(tocList);

        // Scroll spy: highlight current TOC item
        var tocLinks = tocContainer.querySelectorAll("a");
        window.addEventListener("scroll", function () {
          var current = "";
          tocHeadings.forEach(function (heading) {
            var rect = heading.getBoundingClientRect();
            if (rect.top <= 100) {
              current = heading.id;
            }
          });
          tocLinks.forEach(function (link) {
            link.classList.toggle("toc-active", link.getAttribute("href") === "#" + current);
          });
        });
      }
    }
  }

  /* ================================================================ */
  /*  Smooth Anchor Scrolling (for in-page links)                     */
  /* ================================================================ */
  document.addEventListener("click", function (e) {
    const target = e.target.closest("a[href^='#']");
    if (target) {
      const id = target.getAttribute("href").slice(1);
      const el = document.getElementById(id);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        // Update URL without scrolling
        history.pushState(null, "", "#" + id);
      }
    }
  });

  /* ================================================================ */
  /*  Client-Side Search                                               */
  /* ================================================================ */
})();

(function () {
    var searchBtn = document.getElementById("searchBtn");
    var searchModal = document.getElementById("searchModal");
    var searchOverlay = document.getElementById("searchOverlay");
    var searchClose = document.getElementById("searchClose");
    var searchInput = document.getElementById("searchInput");
    var searchResults = document.getElementById("searchResults");

    if (!searchBtn || !searchModal) return;

    var fuse = null;          // Fuse.js instance, lazy-built
    var state = "idle";       // idle | loading | ready | error
    var debounceTimer = null;

    /* ---------- escape HTML to prevent injection from index ---------- */
    function esc(str) {
      return String(str == null ? "" : str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    /* ---------- build a snippet around the first match in content ---------- */
    function snippet(text, query) {
      if (!text) return "";
      var lower = text.toLowerCase();
      var at = lower.indexOf(query.toLowerCase());
      if (at === -1) {
        // fallback: no direct match (Fuse fuzzy matched) — take the excerpt head
        return text.length > 110 ? text.slice(0, 110) + "…" : text;
      }
      var start = Math.max(0, at - 50);
      var end = Math.min(text.length, at + query.length + 60);
      return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
    }

    function renderEmpty(msg) {
      if (searchResults) searchResults.innerHTML = '<div class="search-modal__empty">' + esc(msg) + "</div>";
    }

    function openModal() {
      searchModal.classList.add("active");
      lockScroll();
      setTimeout(function () { if (searchInput) searchInput.focus(); }, 150);
      if (state === "idle") loadIndex();
    }

    function closeModal() {
      searchModal.classList.remove("active");
      unlockScroll();
      if (searchInput) searchInput.value = "";
      renderEmpty("输入关键词开始搜索");
    }

    function loadIndex() {
      state = "loading";
      renderEmpty("正在加载搜索索引…");
      fetch("/search.json")
        .then(function (r) {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.json();
        })
        .then(function (data) {
          if (typeof Fuse === "undefined") {
            throw new Error("Fuse.js 未加载");
          }
          fuse = new Fuse(data, {
            keys: [
              { name: "title", weight: 0.5 },
              { name: "excerpt", weight: 0.25 },
              { name: "content", weight: 0.15 },
              { name: "tags", weight: 0.05 },
              { name: "categories", weight: 0.05 }
            ],
            includeScore: true,
            includeMatches: true,
            threshold: 0.35,          // 0 = exact, 1 = match anything
            ignoreLocation: true,     // matches anywhere in long CJK text
            minMatchCharLength: 1,    // allow single CJK char queries
            distance: 1000
          });
          state = "ready";
          // re-run whatever the user has typed (in case they typed during load)
          if (searchInput && searchInput.value.trim()) doSearch(searchInput.value);
          else renderEmpty("输入关键词开始搜索");
        })
        .catch(function (err) {
          state = "error";
          renderEmpty("搜索索引加载失败：" + (err.message || err));
        });
    }

    function doSearch(query) {
      if (!searchResults) return;
      query = query.trim();
      if (!query) {
        renderEmpty("输入关键词开始搜索");
        return;
      }
      if (state !== "ready") {
        renderEmpty(state === "loading" ? "正在加载搜索索引…" : "搜索索引加载失败");
        return;
      }

      var results = fuse.search(query).slice(0, 20);
      if (!results.length) {
        renderEmpty("未找到匹配结果");
        return;
      }

      var html = "";
      results.forEach(function (res) {
        var item = res.item;
        var matchKey = "excerpt";
        // find the highest-priority matched field for snippet context
        if (res.matches && res.matches.length) {
          for (var i = 0; i < res.matches.length; i++) {
            if (res.matches[i].key === "title")   { matchKey = "title"; break; }
            if (res.matches[i].key === "content") { matchKey = "content"; }
          }
        }
        var body = matchKey === "content" ? item.content : (item.excerpt || item.content || "");
        var snip = snippet(body, query);
        var tagsHtml = "";
        if (item.tags && item.tags.length) {
          tagsHtml = item.tags.slice(0, 3).map(function (t) {
            return '<span class="search-result-item__tag">' + esc(t) + "</span>";
          }).join("");
        }
        html += '<a href="' + esc(item.url) + '" class="search-result-item">' +
          '<div class="search-result-item__title">' + esc(item.title) + "</div>" +
          (snip ? '<div class="search-result-item__excerpt">' + esc(snip) + "</div>" : "") +
          (tagsHtml ? '<div class="search-result-item__tags">' + tagsHtml + "</div>" : "") +
          "</a>";
      });
      searchResults.innerHTML = html;
    }

    /* ---------- events ---------- */
    searchBtn.addEventListener("click", openModal);
    if (searchOverlay) searchOverlay.addEventListener("click", closeModal);
    if (searchClose) searchClose.addEventListener("click", closeModal);

    // close any result link without leaving the modal open
    if (searchResults) {
      searchResults.addEventListener("click", function (e) {
        if (e.target.closest("a")) {
          searchModal.classList.remove("active");
          unlockScroll();
        }
      });
    }

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && searchModal.classList.contains("active")) closeModal();
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        if (searchModal.classList.contains("active")) closeModal();
        else openModal();
      }
    });

    if (searchInput) {
      searchInput.addEventListener("input", function () {
        clearTimeout(debounceTimer);
        var val = this.value;
        debounceTimer = setTimeout(function () { doSearch(val); }, 150);
      });
    }
  })();

  /* ================================================================ */
  /*  Theme Toggle (Dark/Light)                                        */
  /* ================================================================ */
  (function () {
    const toggle = document.getElementById("themeToggle");
    const STORAGE_KEY = "exyone-theme";

    // Get stored preference, or system preference, or 'light'
    function getPreferredTheme() {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return stored;
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }

    function setTheme(theme) {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem(STORAGE_KEY, theme);
      if (toggle) {
        toggle.classList.toggle("is-dark", theme === "dark");
        toggle.classList.toggle("is-light", theme === "light");
      }
    }

    // Apply saved theme immediately (before paint)
    setTheme(getPreferredTheme());

    // Toggle click handler
    if (toggle) {
      toggle.addEventListener("click", function () {
        const current = document.documentElement.getAttribute("data-theme");
        setTheme(current === "dark" ? "light" : "dark");
      });
    }

    // Listen for system preference changes (when no stored preference)
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function (e) {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setTheme(e.matches ? "dark" : "light");
      }
    });
  })();

  /* ================================================================ */
  /*  Digital Clock (updates every second)                             */
  /* ================================================================ */
  (function () {
    var clockTime = document.getElementById("clockTime");
    var clockDate = document.getElementById("clockDate");
    if (!clockTime && !clockDate) return;

    function pad(n) { return n < 10 ? "0" + n : n; }

    function updateClock() {
      var now = new Date();
      if (clockTime) {
        clockTime.textContent = pad(now.getHours()) + ":" + pad(now.getMinutes()) + ":" + pad(now.getSeconds());
      }
      if (clockDate) {
        var weekdays = ["日", "一", "二", "三", "四", "五", "六"];
        clockDate.textContent =
          now.getFullYear() + "." +
          pad(now.getMonth() + 1) + "." +
          pad(now.getDate()) + " 星期" + weekdays[now.getDay()];
      }
    }

    updateClock();
    setInterval(updateClock, 1000);
  })();

  /* ================================================================ */
  /*  Mini Calendar (right sidebar)                                   */
  /* ================================================================ */
  (function () {
    var grid = document.getElementById("calendarGrid");
    var monthLabel = document.getElementById("calendarMonth");
    var prevBtn = document.getElementById("calendarPrev");
    var nextBtn = document.getElementById("calendarNext");

    if (!grid) return;

    var today = new Date();
    var currentYear = today.getFullYear();
    var currentMonth = today.getMonth();

    var monthNames = ["January","February","March","April","May","June",
                      "July","August","September","October","November","December"];

    function renderCalendar(year, month) {
      // Update header
      if (monthLabel) monthLabel.textContent = monthNames[month] + " " + year;

      // Remove old day cells (keep day-name headers)
      var cells = grid.querySelectorAll(".calendar-widget__day");
      for (var i = 0; i < cells.length; i++) { cells[i].remove(); }

      var firstDay = new Date(year, month, 1).getDay();
      var daysInMonth = new Date(year, month + 1, 0).getDate();
      var prevMonthDays = new Date(year, month, 0).getDate();

      // Previous month fill
      for (var i = firstDay - 1; i >= 0; i--) {
        var span = document.createElement("span");
        span.className = "calendar-widget__day calendar-widget__day--other";
        span.textContent = prevMonthDays - i;
        grid.appendChild(span);
      }

      // Current month
      for (var d = 1; d <= daysInMonth; d++) {
        var span = document.createElement("span");
        span.className = "calendar-widget__day";
        span.textContent = d;

        if (year === today.getFullYear() && month === today.getMonth() && d === today.getDate()) {
          span.classList.add("calendar-widget__day--today");
        }

        grid.appendChild(span);
      }
    }

    renderCalendar(currentYear, currentMonth);

    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        currentMonth--;
        if (currentMonth < 0) { currentMonth = 11; currentYear--; }
        renderCalendar(currentYear, currentMonth);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        currentMonth++;
        if (currentMonth > 11) { currentMonth = 0; currentYear++; }
        renderCalendar(currentYear, currentMonth);
      });
    }
  })();

  /* ================================================================ */