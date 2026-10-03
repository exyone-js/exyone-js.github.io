/*!
 * SiteEnhance · context menu
 *
 * Replaces the browser menu with a contextual list. Commands are declared once
 * in GROUPS (an entry may carry `children`, which renders as a submenu) and
 * implemented once in ACTIONS, so adding a command never touches anything else.
 *
 * Shift + right click always falls through to the native browser menu.
 */
(function (window, document) {
  'use strict';

  var Enhance = window.Enhance;
  if (!Enhance) return;

  var CONFIG = Enhance.CONFIG.menu;
  var Toast = Enhance.Toast;
  var clamp = Enhance.clamp;
  var $ = Enhance.$;
  var $$ = Enhance.$$;

  var ContextMenu = (function () {
    if (!CONFIG.enabled) return null;

    var menu = $('#custom-context-menu');
    if (!menu) return null;

    /* Turn submenus off by setting `submenu: false` in the menu config; read
       on every render so the flag can be flipped at runtime. */
    function submenusEnabled() {
      return CONFIG.submenu !== false;
    }

    var SEARCH_ENGINES = {
      google: { search: 'https://www.google.com/search?q=', visual: 'https://lens.google.com/uploadbyurl?url=' },
      bing: { search: 'https://www.bing.com/search?q=', visual: 'https://www.bing.com/visualsearch?imgurl=' },
      baidu: { search: 'https://www.baidu.com/s?wd=', visual: 'https://graph.baidu.com/details?isfromtusoupc=1&tn=pc&carousel=0&image=' }
    };

    var DIVIDER = { divider: true };
    var VIEWPORT_GAP = 8;
    var EXIT_DURATION = 140;
    var HOVER_GRACE = 180;
    var LONG_PRESS = 500;
    var MOVE_TOLERANCE = 10;
    var SUPPRESS_CLICK_WINDOW = 400;

    /* File extensions for downloaded code snippets. */
    var CODE_EXTENSIONS = {
      js: 'js', jsx: 'js', mjs: 'js', cjs: 'js', ts: 'ts', tsx: 'ts', json: 'json',
      html: 'html', xml: 'xml', css: 'css', scss: 'scss', less: 'less',
      py: 'py', rb: 'rb', php: 'php', java: 'java', kt: 'kt', swift: 'swift',
      c: 'c', h: 'c', cpp: 'cpp', cs: 'cs', go: 'go', rs: 'rs', r: 'r',
      sh: 'sh', bash: 'sh', shell: 'sh', zsh: 'sh', ps1: 'ps1', powershell: 'ps1',
      sql: 'sql', md: 'md', markdown: 'md', yml: 'yml', yaml: 'yml', toml: 'toml',
      ini: 'ini', conf: 'conf', dockerfile: 'dockerfile', vue: 'vue'
    };

    /* ------------------------------------------------------------ Actions -- */

    function engine() {
      return SEARCH_ENGINES[CONFIG.searchEngine] || SEARCH_ENGINES.bing;
    }

    /* Clipboard helper; core already falls back to execCommand when the async
       clipboard API is unavailable, so failures surface as a plain toast. */
    function copy(text, message) {
      return Enhance.copyText(text)
        .then(function () { Toast.success(message); })
        .catch(function () { Toast.error('复制失败'); });
    }

    function openExternal(url) {
      window.open(url, '_blank', 'noopener');
    }

    /* Resolve the highest quality source of an image. */
    function bestImageSource(image) {
      if (image.currentSrc) return image.currentSrc;
      if (image.srcset) {
        var best = '';
        var bestWidth = -1;
        image.srcset.split(',').forEach(function (candidate) {
          var parts = String(candidate).trim().split(/\s+/);
          var url = parts.shift();
          if (!url) return;
          var width = parseInt(parts[0], 10);
          if (isNaN(width)) width = 0;
          if (width >= bestWidth) { bestWidth = width; best = url; }
        });
        if (best) return best;
      }
      return image.src;
    }

    /* Infer a file extension from the URL first, then from the MIME type. */
    function extensionFromUrl(url) {
      var data = /^data:image\/([a-z0-9.+-]+)/i.exec(url);
      if (data) return data[1].replace(/[^a-z0-9]/gi, '').toLowerCase();
      var path = url.split('?')[0].split('#')[0];
      var matched = /\.([a-z0-9]{1,5})$/i.exec(path);
      return matched ? matched[1].toLowerCase() : '';
    }

    function imageExtension(url, mime) {
      var fromUrl = extensionFromUrl(url);
      if (fromUrl) return fromUrl;
      if (mime && mime.indexOf('/') > 0) {
        var subtype = mime.split(';')[0].split('/')[1];
        var cleaned = subtype ? subtype.replace(/[^a-z0-9]/gi, '').toLowerCase() : '';
        if (cleaned) return cleaned;
      }
      return 'png';
    }

    /* MIME of an inline image, used when saving it. */
    function dataImageType(src) {
      var matched = /^data:([^;,]+)/i.exec(src);
      return matched ? matched[1] : '';
    }

    function fileStem(text, fallback) {
      var stem = String(text || '').trim()
        .replace(/[\\/:*?"<>|\n\r\t]+/g, '-')
        .replace(/\s+/g, '-')
        .slice(0, 60);
      return stem || fallback;
    }

    function dataUrlToBlob(url) {
      var parts = /^data:([^;,]+)?(;base64)?,(.*)$/i.exec(url);
      if (!parts) return null;
      var type = parts[1] || 'application/octet-stream';
      var data = parts[3];
      if (parts[2]) {
        var raw = window.atob(data);
        var bytes = new Uint8Array(raw.length);
        for (var i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
        return new Blob([bytes], { type: type });
      }
      return new Blob([decodeURIComponent(data)], { type: type });
    }

    var ACTIONS = {
      /* Selection ---------------------------------------------------------- */
      'copy-selection': function (ctx) { return copy(ctx.selection, '已复制选中文本'); },
      'search-selection': function (ctx) {
        openExternal(engine().search + encodeURIComponent(ctx.selection));
      },
      'copy-quote': function (ctx) { return copy('> ' + ctx.selection, '已复制为引用'); },
      'copy-md-quote': function (ctx) {
        return copy(
          '> ' + ctx.selection + '\n> \n> —— 来自 [' + document.title + '](' + location.href + ')',
          '已复制为 Markdown 引用'
        );
      },
      'copy-plain': function (ctx) {
        return copy(ctx.selection.replace(/\s+/g, ' ').trim(), '已复制为纯文本');
      },
      'speak-selection': function (ctx) {
        if (!('speechSynthesis' in window)) { Toast.warn('当前浏览器不支持朗读'); return; }
        window.speechSynthesis.cancel();
        var utterance = new window.SpeechSynthesisUtterance(ctx.selection);
        utterance.lang = /[\u4e00-\u9fa5]/.test(ctx.selection) ? 'zh-CN' : 'en-US';
        window.speechSynthesis.speak(utterance);
      },
      'translate-selection': function (ctx) {
        openExternal('https://translate.google.com/?sl=auto&tl=zh-CN&text=' +
          encodeURIComponent(ctx.selection) + '&op=translate');
      },

      /* Link --------------------------------------------------------------- */
      'open-link': function (ctx) { if (ctx.link) openExternal(ctx.link.href); },
      'copy-link-url': function (ctx) {
        if (ctx.link) return copy(ctx.link.href, '链接已复制');
      },
      'copy-md-link': function (ctx) {
        if (!ctx.link) return;
        return copy('[' + (ctx.link.text || ctx.link.href) + '](' + ctx.link.href + ')',
          '已复制 Markdown 链接');
      },
      'copy-html-link': function (ctx) {
        if (!ctx.link) return;
        return copy('<a href="' + ctx.link.href + '">' +
          Enhance.escapeHtml(ctx.link.text || ctx.link.href) + '</a>', '已复制 HTML 链接');
      },
      'copy-plain-link': function (ctx) {
        if (!ctx.link) return;
        var text = (ctx.link.text || '').trim();
        var plain = text && text !== ctx.link.href ? text + ' ' + ctx.link.href : ctx.link.href;
        return copy(plain, '已复制为纯文本链接');
      },

      /* Image -------------------------------------------------------------- */
      'open-image': function (ctx) { if (ctx.image) openExternal(ctx.image.src); },
      'copy-image-url': function (ctx) {
        if (ctx.image) return copy(ctx.image.src, '图片地址已复制');
      },
      'copy-image-blob': function (ctx) {
        if (!ctx.image) return;
        var url = ctx.image.src;
        var file = /^data:/i.test(url) ? dataUrlToBlob(url) : null;

        Promise.resolve(file || fetch(url, { mode: 'cors' }).then(function (response) {
          return response.blob();
        }))
          .then(function (blob) {
            if (!blob) throw new Error('unsupported source');
            if (!navigator.clipboard || !window.ClipboardItem) throw new Error('clipboard unsupported');
            var payload = {};
            payload[blob.type || 'image/png'] = blob;
            return navigator.clipboard.write([new window.ClipboardItem(payload)]);
          })
          .then(function () { Toast.success('图片已复制到剪贴板'); })
          .catch(function (error) {
            /* Chrome reports a TypeError when the fetch is blocked by CORS. */
            Toast.error(error && error instanceof TypeError
              ? '图片跨域，无法复制到剪贴板'
              : '复制图片失败');
          });
      },
      'save-image': function (ctx) {
        if (!ctx.image) return;
        var link = document.createElement('a');
        link.href = ctx.image.src;
        link.download = fileStem(ctx.image.alt || ctx.image.fileName, 'image') +
          '.' + imageExtension(ctx.image.src, ctx.image.type);
        link.target = '_blank';
        link.rel = 'noopener';
        document.body.appendChild(link);
        link.click();
        link.remove();
        Toast.show('开始下载…', 'info', 1200);
      },
      'image-search': function (ctx) {
        if (ctx.image) openExternal(engine().visual + encodeURIComponent(ctx.image.src));
      },

      /* Code --------------------------------------------------------------- */
      'copy-code': function (ctx) { if (ctx.code) return copy(ctx.code, '代码已复制'); },
      'copy-md-code': function (ctx) {
        if (!ctx.code) return;
        return copy('```' + (ctx.codeLang || '') + '\n' + ctx.code.replace(/\n$/, '') + '\n```',
          '已复制为 Markdown 代码块');
      },
      'copy-code-noline': function (ctx) {
        if (!ctx.code) return;
        return copy(ctx.code.split('\n').map(function (line) {
          return line.replace(/^\s*\d+\s?/, '');
        }).join('\n'), '已复制（去行号）');
      },
      'download-code': function (ctx) {
        if (!ctx.code) return;
        var link = document.createElement('a');
        var url = window.URL && window.URL.createObjectURL
          ? window.URL.createObjectURL(new Blob([ctx.code], { type: 'text/plain;charset=utf-8' }))
          : 'data:text/plain;charset=utf-8,' + encodeURIComponent(ctx.code);
        link.href = url;
        link.download = 'snippet.' + (CODE_EXTENSIONS[(ctx.codeLang || '').toLowerCase()] || 'txt');
        document.body.appendChild(link);
        link.click();
        link.remove();
        if (window.URL && window.URL.revokeObjectURL && url.indexOf('blob:') === 0) {
          setTimeout(function () { window.URL.revokeObjectURL(url); }, 1000);
        }
        Toast.show('开始下载…', 'info', 1200);
      },

      /* Site toggles ------------------------------------------------------- */
      'zh-convert': function () { if (Enhance.ZhConvert) Enhance.ZhConvert.toggle(); },
      'reading-toggle': function () { if (Enhance.Reading) Enhance.Reading.toggle(); },
      'click-fx-cycle': function () { if (Enhance.ClickEffect) Enhance.ClickEffect.cycle(); },
      'music-toggle': function () { if (Enhance.Music) Enhance.Music.toggle(); },
      'quotes-toggle': function () { if (Enhance.Quotes) Enhance.Quotes.toggle(); },

      /* Page --------------------------------------------------------------- */
      'share-page': function () {
        if (navigator.share) {
          navigator.share({ title: document.title, url: location.href }).catch(function () {});
        } else {
          copy(location.href, '链接已复制，可粘贴分享');
        }
      },
      'copy-title-link': function () {
        return copy('[' + document.title + '](' + location.href + ')', '标题 + 链接已复制');
      },
      'scroll-top': function () {
        try {
          window.scrollTo({ top: 0, behavior: Enhance.prefersReducedMotion() ? 'auto' : 'smooth' });
        } catch (error) {
          window.scrollTo(0, 0);
        }
      },
      'copy-page-url': function () { return copy(location.href, '页面链接已复制'); },
      'toggle-theme': function () {
        var button = document.getElementById('mode-toggle');
        if (!button) { Toast.warn('未找到主题切换按钮'); return; }
        button.click();
      },
      'focus-search': function () {
        var input = document.getElementById('search-input');
        if (input) { input.focus(); return; }
        var trigger = document.getElementById('search-trigger');
        if (trigger) { trigger.click(); return; }
        Toast.warn('未找到搜索入口');
      },
      'toggle-fullscreen': function () {
        var root = document.documentElement;
        var request = root.requestFullscreen || root.webkitRequestFullscreen;
        var exit = document.exitFullscreen || document.webkitExitFullscreen;
        var active = document.fullscreenElement || document.webkitFullscreenElement;

        if (active) { if (exit) exit.call(document); return; }
        if (request) {
          try { request.call(root); } catch (error) { Toast.warn('当前浏览器不支持全屏'); }
          return;
        }
        Toast.warn('当前浏览器不支持全屏');
      },

      /* Kept for programmatic use, not listed in any menu. */
      'print': function () { window.print(); },
      'copy-title': function () { return copy(document.title, '标题已复制'); },
      'reload': function () { location.reload(); },
      'view-source': function () {
        var win = window.open('', '_blank');
        if (!win) { Toast.error('弹窗被浏览器拦截'); return; }

        win.document.open();
        win.document.write(
          '<!DOCTYPE html><meta charset="utf-8">' +
          '<title>源码 · ' + document.title + '</title>' +
          '<pre id="src">正在加载源码…</pre>'
        );
        win.document.close();

        window.fetch(location.href, { cache: 'force-cache' })
          .then(function (res) { return res.text(); })
          .then(function (html) {
            win.document.getElementById('src').textContent = html;
          })
          .catch(function () {
            win.document.getElementById('src').textContent = '源码加载失败。';
          });
      }
    };

    /* ---------------------------------------------------------------- Items */

    function searchLabel(ctx) {
      var snippet = ctx.selection.slice(0, 12);
      return '搜索「' + snippet + (ctx.selection.length > 12 ? '…' : '') + '」';
    }

    /* Reads the live value straight from the owning module every time the menu
       opens, so the label always reflects reality. */
    function stateLabel(module, getter) {
      return function () {
        return Enhance[module] ? getter(Enhance[module]) : '关';
      };
    }

    var COPY_AS = { icon: 'fa-copy', label: '复制为…', children: [] };
    var SITE_SETTINGS = { icon: 'fa-sliders', label: '站点设置…', children: [] };

    var GROUPS = [
      {
        name: 'selection',
        when: function (ctx) { return !!ctx.selection; },
        items: [
          { icon: 'fa-copy', label: '复制选中文本', action: 'copy-selection' },
          { icon: 'fa-magnifying-glass', label: searchLabel, action: 'search-selection' },
          {
            icon: COPY_AS.icon,
            label: COPY_AS.label,
            children: [
              { label: '复制为引用', action: 'copy-quote' },
              { label: '复制为 Markdown 引用（带来源）', action: 'copy-md-quote' },
              { label: '复制为纯文本（去格式）', action: 'copy-plain' }
            ]
          },
          { icon: 'fa-volume-high', label: '朗读选中文本', action: 'speak-selection' },
          { icon: 'fa-language', label: '翻译选中文本', action: 'translate-selection' }
        ]
      },
      {
        name: 'link',
        when: function (ctx) { return !!ctx.link; },
        items: [
          { icon: 'fa-arrow-up-right-from-square', label: '在新标签页打开', action: 'open-link' },
          { icon: 'fa-link', label: '复制链接地址', action: 'copy-link-url' },
          {
            icon: COPY_AS.icon,
            label: COPY_AS.label,
            children: [
              { label: '复制为 Markdown 链接', action: 'copy-md-link' },
              { label: '复制为 HTML 链接', action: 'copy-html-link' },
              { label: '复制为纯文本链接', action: 'copy-plain-link' }
            ]
          }
        ]
      },
      {
        name: 'image',
        when: function (ctx) { return !!ctx.image; },
        items: [
          { icon: 'fa-arrow-up-right-from-square', label: '在新标签页打开图片', action: 'open-image' },
          { icon: 'fa-link', label: '复制图片地址', action: 'copy-image-url' },
          {
            icon: 'fa-image',
            label: '图片操作…',
            children: [
              { label: '复制图片到剪贴板', action: 'copy-image-blob' },
              { label: '保存图片到本地', action: 'save-image' },
              { label: '以图搜图', action: 'image-search' }
            ]
          }
        ]
      },
      {
        name: 'code',
        when: function (ctx) { return !!ctx.code; },
        items: [
          { icon: 'fa-copy', label: '复制代码', action: 'copy-code' },
          {
            icon: 'fa-code',
            label: '代码操作…',
            children: [
              { label: '复制为 Markdown 代码块', action: 'copy-md-code' },
              { label: '复制代码（去行号）', action: 'copy-code-noline' },
              { label: '下载代码', action: 'download-code' }
            ]
          }
        ]
      },
      {
        name: 'page',
        when: function () { return true; },
        items: [
          { icon: 'fa-language', label: '简繁切换（Alt+Z）', action: 'zh-convert' },
          {
            icon: SITE_SETTINGS.icon,
            label: SITE_SETTINGS.label,
            children: [
              {
                icon: 'fa-ruler-horizontal',
                label: '阅读进度条',
                action: 'reading-toggle',
                state: stateLabel('Reading', function (mod) { return mod.isEnabled() ? '开' : '关'; })
              },
              {
                icon: 'fa-wand-magic-sparkles',
                label: '点击特效',
                action: 'click-fx-cycle',
                state: stateLabel('ClickEffect', function (mod) { return mod.label(); })
              },
              {
                icon: 'fa-music',
                label: '背景音乐',
                action: 'music-toggle',
                state: stateLabel('Music', function (mod) { return mod.isVisible() ? '开' : '关'; })
              },
              {
                icon: 'fa-quote-left',
                label: '隽语卡片',
                action: 'quotes-toggle',
                state: stateLabel('Quotes', function (mod) { return mod.isVisible() ? '开' : '关'; })
              }
            ]
          },
          {
            icon: 'fa-screwdriver-wrench',
            label: '页面工具…',
            children: [
              { icon: 'fa-link', label: '复制页面链接', action: 'copy-page-url' },
              { icon: 'fa-print', label: '打印 / 另存为 PDF', action: 'print' },
              { icon: 'fa-code', label: '查看页面源码', action: 'view-source' },
              { icon: 'fa-rotate', label: '刷新页面', action: 'reload' }
            ]
          },
          DIVIDER,
          { icon: 'fa-magnifying-glass', label: '搜索本站', action: 'focus-search' },
          { icon: 'fa-circle-half-stroke', label: '切换明暗主题', action: 'toggle-theme' },
          { icon: 'fa-expand', label: '全屏显示', action: 'toggle-fullscreen' },
          { icon: 'fa-share-nodes', label: '分享当前页', action: 'share-page' },
          { icon: 'fa-link', label: '复制标题 + 链接（Markdown）', action: 'copy-title-link' },
          { icon: 'fa-arrow-up', label: '回到顶部', action: 'scroll-top' }
        ]
      }
    ];

    /* -------------------------------------------------------- Config ---- */

    /* `groups` entries accept the legacy boolean form or an object:
       link: { enabled: true, items: { 'copy-html-link': false } } */
    function isHidden(groupName, action) {
      var value = (CONFIG.groups || {})[groupName];
      if (value === false) return true;
      if (value && value.enabled === false) return true;
      var items = value && value.items;
      return !!(items && action && items[action] === false);
    }

    function visibleChildren(groupName, item) {
      if (!item.children) return [];
      return item.children.filter(function (child) {
        return !isHidden(groupName, child.action);
      });
    }

    function collectItems(ctx) {
      var items = [];

      GROUPS.forEach(function (group) {
        if (isHidden(group.name, null)) return;
        if (!group.when(ctx)) return;

        group.items.forEach(function (item) {
          if (item.divider) { items.push(item); return; }

          if (item.children) {
            /* Hide the parent when every one of its commands is switched off. */
            var children = visibleChildren(group.name, item);
            if (!children.length) return;

            if (submenusEnabled()) {
              items.push({ icon: item.icon, label: item.label, children: children });
            } else {
              /* Submenus switched off: inline the commands into this level. */
              children.forEach(function (child) {
                items.push({
                  icon: child.icon || item.icon,
                  label: child.label,
                  action: child.action,
                  state: child.state
                });
              });
            }
            return;
          }

          if (isHidden(group.name, item.action)) return;
          items.push(item);
        });

        items.push(DIVIDER);
      });

      /* Trim trailing dividers so groups never leave empty gaps. */
      while (items.length && items[items.length - 1].divider) items.pop();
      return items;
    }

    /* --------------------------------------------------------- Rendering -- */

    /* Children of the current render, keyed by id; cleared on every render. */
    var childStore = {};
    var childSeq = 0;

    function buildNode(item, ctx) {
      var label = typeof item.label === 'function' ? item.label(ctx) : item.label;
      var state = item.state ? item.state() : '';
      var node = document.createElement('div');

      node.className = 'ctx-item';
      node.setAttribute('role', 'menuitem');
      node.tabIndex = -1;

      if (item.children) {
        var id = 'submenu-' + (++childSeq);
        childStore[id] = item.children;
        node.classList.add('has-submenu');
        node.dataset.submenu = id;
        node.setAttribute('aria-haspopup', 'true');
        node.setAttribute('aria-expanded', 'false');
      } else {
        node.dataset.action = item.action;
      }

      node.innerHTML =
        '<i class="fa-fw fas ' + (item.icon || 'fa-circle') + ' ctx-icon" aria-hidden="true"></i>' +
        '<span class="ctx-label">' + Enhance.escapeHtml(label) + '</span>' +
        (item.children
          ? '<i class="fa-fw fas fa-chevron-right ctx-arrow" aria-hidden="true"></i>'
          : (state ? '<em class="ctx-state">' + Enhance.escapeHtml(state) + '</em>' : ''));

      return node;
    }

    function buildList(items, ctx, withHint) {
      var fragment = document.createDocumentFragment();

      items.forEach(function (item) {
        if (item.divider) {
          var separator = document.createElement('div');
          separator.className = 'ctx-divider';
          separator.setAttribute('role', 'separator');
          fragment.appendChild(separator);
          return;
        }
        fragment.appendChild(buildNode(item, ctx));
      });

      if (withHint) {
        var hint = document.createElement('div');
        hint.className = 'ctx-hint';
        hint.innerHTML = '按住 <kbd>Shift</kbd> + 右键恢复浏览器菜单';
        fragment.appendChild(hint);
      }

      return fragment;
    }

    function render(items, ctx) {
      childStore = {};
      menu.innerHTML = '';
      menu.appendChild(buildList(items, ctx, true));
    }

    /* ------------------------------------------------------------- State -- */

    var currentContext = null;
    var lastFocused = null;
    var exitTimer = null;
    var submenu = null;
    var submenuOwner = null;
    var submenuTimer = null;
    var hoverTimer = null;

    function open(x, y, ctx) {
      clearTimeout(exitTimer);
      closeSubmenu(true);
      currentContext = ctx;
      lastFocused = document.activeElement;
      render(collectItems(ctx), ctx);

      menu.hidden = false;
      menu.classList.add('visible');

      /* Measure after insertion, then keep the menu inside the viewport. */
      var rect = menu.getBoundingClientRect();
      var left = clamp(x, VIEWPORT_GAP, Math.max(VIEWPORT_GAP, window.innerWidth - rect.width - VIEWPORT_GAP));
      var top = clamp(y, VIEWPORT_GAP, Math.max(VIEWPORT_GAP, window.innerHeight - rect.height - VIEWPORT_GAP));
      menu.style.left = left + 'px';
      menu.style.top = top + 'px';

      /* No autofocus: highlighting an entry the pointer never touched reads as
         a stray selection. Keyboard users enter with ArrowDown / ArrowUp. */
    }

    function restoreFocus() {
      if (!lastFocused || lastFocused === document.body) { lastFocused = null; return; }
      if (lastFocused.focus && document.documentElement.contains(lastFocused)) lastFocused.focus();
      lastFocused = null;
    }

    /* The captured context is kept until the next open(), so an item click can
       still read it after the menu has started closing. */
    function close() {
      closeSubmenu(true);
      if (menu.hidden) return;
      menu.classList.remove('visible');
      clearTimeout(exitTimer);
      exitTimer = setTimeout(function () { menu.hidden = true; }, EXIT_DURATION);
      restoreFocus();
    }

    function isOpen() {
      return !menu.hidden;
    }

    function run(action, ctx) {
      var handler = ACTIONS[action];
      if (!handler) return;
      Enhance.guard('menu:' + action, function () {
        handler(ctx || collectPageContext(document.body));
      })();
    }

    /* ----------------------------------------------------------- Submenu -- */

    function ensureSubmenu() {
      if (submenu) return submenu;
      submenu = document.createElement('div');
      /* Appended to <body> so it can never be clipped by the menu's own
         scroll container. */
      submenu.className = 'ctx-submenu';
      submenu.setAttribute('role', 'menu');
      submenu.hidden = true;

      submenu.addEventListener('click', onSubmenuClick);
      submenu.addEventListener('keydown', function (event) { navigate(event, submenu, true); });
      submenu.addEventListener('pointerenter', function (event) {
        if (event.pointerType !== 'touch') cancelHoverClose();
      });
      submenu.addEventListener('pointerleave', function (event) {
        if (event.pointerType !== 'touch') scheduleHoverClose();
      });

      document.body.appendChild(submenu);
      return submenu;
    }

    function positionSubmenu(owner) {
      var anchor = owner.getBoundingClientRect();
      var rect = submenu.getBoundingClientRect();
      var limitRight = Math.max(VIEWPORT_GAP, window.innerWidth - rect.width - VIEWPORT_GAP);
      var limitBottom = Math.max(VIEWPORT_GAP, window.innerHeight - rect.height - VIEWPORT_GAP);

      /* Prefer the right side of the parent, flip left when it would overflow. */
      var left = anchor.right + 4;
      if (left > limitRight) left = anchor.left - rect.width - 4;
      left = clamp(left, VIEWPORT_GAP, limitRight);

      var top = clamp(anchor.top - 4, VIEWPORT_GAP, limitBottom);

      submenu.style.left = left + 'px';
      submenu.style.top = top + 'px';
    }

    function openSubmenu(owner) {
      var children = owner && childStore[owner.dataset.submenu];
      if (!children || !children.length) return;

      if (submenuOwner && submenuOwner !== owner) closeSubmenu(true);

      ensureSubmenu();
      cancelHoverClose();

      submenu.innerHTML = '';
      submenu.appendChild(buildList(children, currentContext, false));
      submenu.hidden = false;
      positionSubmenu(owner);
      requestAnimationFrame(function () { submenu.classList.add('visible'); });

      owner.classList.add('is-expanded');
      owner.setAttribute('aria-expanded', 'true');
      submenuOwner = owner;
    }

    function closeSubmenu(immediate) {
      cancelHoverClose();
      if (submenuOwner) {
        submenuOwner.classList.remove('is-expanded');
        submenuOwner.setAttribute('aria-expanded', 'false');
      }
      submenuOwner = null;
      if (!submenu || submenu.hidden) return;
      submenu.classList.remove('visible');
      clearTimeout(submenuTimer);
      if (immediate) {
        submenu.hidden = true;
        submenu.innerHTML = '';
      } else {
        /* Its own timer: fading the submenu must never cancel the pending
           hide of the parent menu. */
        submenuTimer = setTimeout(function () {
          submenu.hidden = true;
          submenu.innerHTML = '';
        }, EXIT_DURATION);
      }
    }

    function toggleSubmenu(owner) {
      if (submenuOwner === owner) closeSubmenu(false);
      else openSubmenu(owner);
    }

    function scheduleHoverClose() {
      cancelHoverClose();
      hoverTimer = setTimeout(function () { closeSubmenu(false); }, HOVER_GRACE);
    }

    function cancelHoverClose() {
      clearTimeout(hoverTimer);
      hoverTimer = null;
    }

    function onSubmenuClick(event) {
      var item = event.target.closest('.ctx-item');
      if (!item || item.dataset.submenu) return;
      event.stopPropagation();
      /* Snapshot the context before closing so handlers still see the target. */
      var action = item.dataset.action;
      var ctx = currentContext;
      close();
      run(action, ctx);
    }

    /* ------------------------------------------------------------ Context */

    function detectLanguage(element) {
      if (!element) return '';
      if (element.dataset && element.dataset.lang) return element.dataset.lang;
      var matched = /(?:^|[\s])(?:language|lang|highlight)-([a-z0-9+#.-]+)/i.exec(
        String(element.className || '')
      );
      return matched ? matched[1] : '';
    }

    function collectPageContext(target) {
      var ctx = { link: null, image: null, selection: '', code: '', codeLang: '' };
      var element = target && target.closest ? target : document.body;

      var anchor = element.closest('a[href]');
      if (anchor) ctx.link = { href: anchor.href, text: (anchor.textContent || '').trim() };

      var image = element.tagName === 'IMG' ? element : element.closest('img');
      if (image) {
        ctx.image = {
          src: bestImageSource(image),
          alt: image.alt || '',
          type: dataImageType(image.currentSrc || image.src)
        };
      }

      var block = element.closest('pre, code');
      if (block) {
        var code = block.tagName === 'CODE' ? block : block.querySelector('code');
        if (code) {
          ctx.code = code.innerText || code.textContent || '';
          ctx.codeLang = detectLanguage(code) || detectLanguage(block);
        }
      }

      var selection = window.getSelection ? String(window.getSelection()) : '';
      ctx.selection = selection.trim();
      return ctx;
    }

    /* ----------------------------------------------------------- Keyboard -*/

    function itemsOf(container) {
      return $$('.ctx-item', container);
    }

    function focusRelative(items, current, offset) {
      if (!items.length) return;
      /* Nothing is focused right after opening: Down enters at the top,
         Up at the bottom. */
      var next = current < 0
        ? (offset > 0 ? 0 : items.length - 1)
        : (current + offset + items.length) % items.length;
      items[next].focus();
    }

    function navigate(event, container, isSubmenu) {
      var items = itemsOf(container);
      if (!items.length) return;

      var index = items.indexOf(document.activeElement);

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          focusRelative(items, index, 1);
          return;
        case 'ArrowUp':
          event.preventDefault();
          focusRelative(items, index, -1);
          return;
        case 'Home':
          event.preventDefault();
          items[0].focus();
          return;
        case 'End':
          event.preventDefault();
          items[items.length - 1].focus();
          return;
        case 'Enter':
          if (index < 0) return;
          event.preventDefault();
          if (items[index].dataset.submenu) {
            openSubmenu(items[index]);
            var first = itemsOf(ensureSubmenu())[0];
            if (first) first.focus();
            return;
          }
          items[index].click();
          return;
        case 'ArrowRight':
          if (index < 0 || !items[index].dataset.submenu) return;
          event.preventDefault();
          openSubmenu(items[index]);
          var head = itemsOf(ensureSubmenu())[0];
          if (head) head.focus();
          return;
        case 'ArrowLeft':
          if (!isSubmenu) return;
          event.preventDefault();
          var owner = submenuOwner;
          closeSubmenu(true);
          if (owner) owner.focus();
          return;
        case 'Escape':
          event.preventDefault();
          /* Keep the parent menu open; stop propagation so the global Escape
             handler does not close everything at once. */
          event.stopPropagation();
          if (isSubmenu) {
            var parent = submenuOwner;
            closeSubmenu(true);
            if (parent) parent.focus();
          } else {
            close();
          }
          return;
      }
    }

    /* ------------------------------------------------------------- Events -*/

    var SKIP = 'input, textarea, select, ' +
      '#custom-context-menu, #shortcuts-modal, #tool-cards, .ctx-submenu';

    var suppressClick = false;
    var suppressTimer = null;

    function beginClickSuppression() {
      suppressClick = true;
      clearTimeout(suppressTimer);
      suppressTimer = setTimeout(function () { suppressClick = false; }, SUPPRESS_CLICK_WINDOW);
    }

    document.addEventListener('contextmenu', function (event) {
      /* Shift keeps the native menu reachable, including inside overlays. */
      if (event.shiftKey) { close(); return; }
      if (event.target.closest && event.target.closest(SKIP)) { close(); return; }
      event.preventDefault();
      open(event.clientX, event.clientY, collectPageContext(event.target));
    });

    menu.addEventListener('click', function (event) {
      var item = event.target.closest('.ctx-item');
      if (!item) return;
      event.stopPropagation();

      if (item.dataset.submenu) { toggleSubmenu(item); return; }

      /* Removed from the menus but still invocable through run(). */
      var action = item.dataset.action;
      var ctx = currentContext;
      close();
      run(action, ctx);
    });

    menu.addEventListener('keydown', function (event) {
      navigate(event, menu, false);
    });

    /* Hover switches between submenus, leaving them while pointer ownership is
       still moving gets a short grace period. */
    menu.addEventListener('pointerover', function (event) {
      if (event.pointerType === 'touch') return;
      cancelHoverClose();
      var item = event.target.closest ? event.target.closest('.ctx-item') : null;
      if (!item) { if (submenuOwner) scheduleHoverClose(); return; }
      if (item.dataset.submenu) {
        if (submenuOwner !== item) openSubmenu(item);
      } else if (submenuOwner) {
        scheduleHoverClose();
      }
    });

    menu.addEventListener('pointerleave', function (event) {
      if (event.pointerType === 'touch') return;
      if (submenuOwner) scheduleHoverClose();
    });

    /* Scrolling the menu itself only dismisses the submenu. */
    menu.addEventListener('scroll', function () { closeSubmenu(true); }, { passive: true });

    /* ---------------------------------------------------- Outside events -- */

    /* Capture phase so the click that follows a long press can be swallowed
       before anything else reacts to it. */
    document.addEventListener('click', function (event) {
      if (suppressClick) {
        suppressClick = false;
        clearTimeout(suppressTimer);
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (!event.target.closest || !event.target.closest('#custom-context-menu, .ctx-submenu')) close();
    }, true);

    document.addEventListener('scroll', function (event) {
      var node = event.target;
      if (!node || node.nodeType !== 1) return;
      if (node === menu || menu.contains(node)) { closeSubmenu(true); return; }
      if (submenu && (node === submenu || submenu.contains(node))) return;
      close();
    }, { passive: true, capture: true });

    window.addEventListener('resize', function () { close(); });

    /* ------------------------------------------------- Touch long press ---- */

    var pressTimer = null;
    var pressOrigin = null;

    function clearPress() {
      clearTimeout(pressTimer);
      pressTimer = null;
      pressOrigin = null;
    }

    document.addEventListener('touchstart', function (event) {
      if (event.touches.length !== 1) return;
      var touch = event.touches[0];
      /* Stay out of areas where long press already has a native meaning. */
      if (event.target.closest && event.target.closest(SKIP)) return;
      pressOrigin = { x: touch.clientX, y: touch.clientY, target: event.target };
      pressTimer = setTimeout(function () {
        open(pressOrigin.x, pressOrigin.y, collectPageContext(pressOrigin.target));
        beginClickSuppression();
        if (navigator.vibrate) navigator.vibrate(15);
        pressOrigin = null;
      }, LONG_PRESS);
    }, { passive: true });

    document.addEventListener('touchmove', function (event) {
      if (!pressTimer || !pressOrigin) return;
      var touch = event.touches[0];
      var dx = touch.clientX - pressOrigin.x;
      var dy = touch.clientY - pressOrigin.y;
      if (Math.sqrt(dx * dx + dy * dy) > MOVE_TOLERANCE) clearPress();
    }, { passive: true });

    document.addEventListener('touchend', clearPress, { passive: true });
    document.addEventListener('touchcancel', clearPress, { passive: true });

    return { open: open, close: close, isOpen: isOpen, run: run };
  })();

  Enhance.register('ContextMenu', ContextMenu);
})(window, document);
