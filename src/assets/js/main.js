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
 *   - Liquid morphing background blobs
 *   - Liquid ripple effect on interactive elements
 */

(function () {
  "use strict";

  /* ================================================================ */
  /*  Mobile Navigation Toggle                                         */
  /* ================================================================ */
  const navToggle = document.getElementById("navToggle");
  const leftNav = document.getElementById("leftNav");
  const navOverlay = document.getElementById("navOverlay");

  if (navToggle && leftNav) {
    navToggle.addEventListener("click", function () {
      leftNav.classList.toggle("active");
      if (navOverlay) navOverlay.classList.toggle("active");
    });

    if (navOverlay) {
      navOverlay.addEventListener("click", function () {
        leftNav.classList.remove("active");
        navOverlay.classList.remove("active");
      });
    }

    // Auto-close nav on Escape key
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && leftNav.classList.contains("active")) {
        leftNav.classList.remove("active");
        if (navOverlay) navOverlay.classList.remove("active");
      }
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
  /*  Table of Contents (sidebar TOC from article headings)            */
  /* ================================================================ */
  const tocCard = document.getElementById("tocCard");
  const tocContainer = document.getElementById("toc");
  const mainContent = document.getElementById("main-content");

  if (tocContainer && mainContent) {
    const contentArea = mainContent.querySelector(".post-detail__content");
    if (contentArea) {
      const headings = contentArea.querySelectorAll("h2, h3");

      if (headings.length > 1) {
        if (tocCard) tocCard.style.display = "block";

        const tocList = document.createElement("ul");
        tocList.className = "toc__list";

        headings.forEach(function (heading, index) {
          if (!heading.id) {
            heading.id = "heading-" + index;
          }

          const li = document.createElement("li");
          li.className = heading.tagName === "H2" ? "toc__item" : "toc__item toc__item--sub";

          const a = document.createElement("a");
          a.href = "#" + heading.id;
          a.textContent = heading.textContent;

          li.appendChild(a);
          tocList.appendChild(li);

          a.addEventListener("click", function (e) {
            e.preventDefault();
            const target = document.getElementById(heading.id);
            if (target) {
              target.scrollIntoView({ behavior: "smooth", block: "start" });
              history.pushState(null, "", "#" + heading.id);
            }
          });
        });

        tocContainer.appendChild(tocList);

        // Scroll spy: highlight current TOC item
        const tocLinks = tocContainer.querySelectorAll("a");
        window.addEventListener("scroll", function () {
          let current = "";
          headings.forEach(function (heading) {
            const rect = heading.getBoundingClientRect();
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
    const searchBtn = document.getElementById("searchBtn");
    const searchModal = document.getElementById("searchModal");
    const searchOverlay = document.getElementById("searchOverlay");
    const searchClose = document.getElementById("searchClose");
    const searchInput = document.getElementById("searchInput");
    const searchResults = document.getElementById("searchResults");

    if (!searchBtn || !searchModal) return;

    let searchIndex = null;
    let loaded = false;

    function openModal() {
      searchModal.classList.add("active");
      document.body.style.overflow = "hidden";
      setTimeout(function () {
        if (searchInput) searchInput.focus();
      }, 150);
      if (!loaded) loadIndex();
    }

    function closeModal() {
      searchModal.classList.remove("active");
      document.body.style.overflow = "";
      if (searchInput) searchInput.value = "";
      if (searchResults) {
        searchResults.innerHTML = '<div class="search-modal__empty">输入关键词开始搜索</div>';
      }
    }

    function loadIndex() {
      fetch("/search.json")
        .then(function (r) { return r.json(); })
        .then(function (data) {
          searchIndex = data;
          loaded = true;
        })
        .catch(function () {
          if (searchResults) {
            searchResults.innerHTML = '<div class="search-modal__empty">搜索索引加载失败</div>';
          }
        });
    }

    function doSearch(query) {
      if (!searchResults) return;
      query = query.trim().toLowerCase();
      if (!query || !searchIndex) {
        searchResults.innerHTML = '<div class="search-modal__empty">' +
          (!query ? "输入关键词开始搜索" : "正在加载搜索索引...") + "</div>";
        return;
      }

      var results = searchIndex.filter(function (item) {
        return (item.title && item.title.toLowerCase().indexOf(query) !== -1) ||
               (item.excerpt && item.excerpt.toLowerCase().indexOf(query) !== -1) ||
               (item.tags && item.tags.some(function (t) { return t.toLowerCase().indexOf(query) !== -1; })) ||
               (item.categories && item.categories.some(function (c) { return c.toLowerCase().indexOf(query) !== -1; }));
      });

      if (results.length === 0) {
        searchResults.innerHTML = '<div class="search-modal__empty">未找到匹配结果</div>';
        return;
      }

      var html = "";
      results.slice(0, 20).forEach(function (item) {
        var excerpt = item.excerpt || "";
        var snippet = excerpt.length > 120 ? excerpt.substring(0, 120) + "…" : excerpt;
        var tagsHtml = item.tags && item.tags.length
          ? item.tags.slice(0, 3).map(function (t) { return '<span class="search-modal__tag">' + t + "</span>"; }).join("")
          : "";
        html += '<a href="' + item.url + '" class="search-modal__result" onclick="document.getElementById(\'searchModal\').classList.remove(\'active\');document.body.style.overflow=\'\'">' +
          '<div class="search-modal__result-title">' + item.title + "</div>" +
          (snippet ? '<div class="search-modal__result-snippet">' + snippet + "</div>" : "") +
          (tagsHtml ? '<div class="search-modal__result-tags">' + tagsHtml + "</div>" : "") +
          "</a>";
      });
      searchResults.innerHTML = html;
    }

    // Event listeners
    searchBtn.addEventListener("click", openModal);

    if (searchOverlay) searchOverlay.addEventListener("click", closeModal);
    if (searchClose) searchClose.addEventListener("click", closeModal);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && searchModal.classList.contains("active")) {
        closeModal();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (searchModal.classList.contains("active")) {
          closeModal();
        } else {
          openModal();
        }
      }
    });

    if (searchInput) {
      searchInput.addEventListener("input", function () {
        doSearch(this.value);
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