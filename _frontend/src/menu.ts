/*!
 * SiteEnhance · context menu
 *
 * Replaces the browser menu with a contextual list. Commands are declared once
 * in GROUPS (an entry may carry `children`, which renders as a submenu) and
 * implemented once in ACTIONS, so adding a command never touches anything else.
 *
 * Shift + right click always falls through to the native browser menu.
 */
import { Enhance, asElement } from './core';
import type { ContextMenuModule, MenuContext, MenuGroupSetting } from './types';

const CONFIG = Enhance.CONFIG.menu;
const Toast = Enhance.Toast;
const clamp = Enhance.clamp;
const $ = Enhance.$;
const $$ = Enhance.$$;

const ContextMenu: ContextMenuModule | null = (function (): ContextMenuModule | null {
  if (!CONFIG.enabled) return null;

  const host = $('#custom-context-menu');
  if (!host) return null;
  /* Aliased so the nested handlers below keep a non-nullable reference. */
  const menu = host;

  /* Turn submenus off by setting `submenu: false` in the menu config; read
     on every render so the flag can be flipped at runtime. */
  function submenusEnabled(): boolean {
    return CONFIG.submenu !== false;
  }

  const DIVIDER: MenuItem = { divider: true };
  const VIEWPORT_GAP = 8;
  const EXIT_DURATION = 140;
  const HOVER_GRACE = 180;
  const LONG_PRESS = 500;
  const MOVE_TOLERANCE = 10;
  const SUPPRESS_CLICK_WINDOW = 400;

  /* File extensions for downloaded code snippets. */
  const CODE_EXTENSIONS: Record<string, string> = {
    js: 'js', jsx: 'js', mjs: 'js', cjs: 'js', ts: 'ts', tsx: 'ts', json: 'json',
    html: 'html', xml: 'xml', css: 'css', scss: 'scss', less: 'less',
    py: 'py', rb: 'rb', php: 'php', java: 'java', kt: 'kt', swift: 'swift',
    c: 'c', h: 'c', cpp: 'cpp', cs: 'cs', go: 'go', rs: 'rs', r: 'r',
    sh: 'sh', bash: 'sh', shell: 'sh', zsh: 'sh', ps1: 'ps1', powershell: 'ps1',
    sql: 'sql', md: 'md', markdown: 'md', yml: 'yml', yaml: 'yml', toml: 'toml',
    ini: 'ini', conf: 'conf', dockerfile: 'dockerfile', vue: 'vue'
  };

  /* ------------------------------------------------------------ Actions -- */

  type Action = (ctx: MenuContext) => void | Promise<void>;

  /* Clipboard helper; core already falls back to execCommand when the async
     clipboard API is unavailable, so failures surface as a plain toast. */
  function copy(text: string, message: string): Promise<void> {
    return Enhance.copyText(text)
      .then(function () { Toast.success(message); })
      .catch(function () { Toast.error('复制失败'); });
  }

  function openExternal(url: string): void {
    window.open(url, '_blank', 'noopener');
  }

  /* Resolve the highest quality source of an image. */
  function bestImageSource(image: HTMLImageElement): string {
    if (image.currentSrc) return image.currentSrc;
    if (image.srcset) {
      let best = '';
      let bestWidth = -1;
      image.srcset.split(',').forEach(function (candidate) {
        const parts = String(candidate).trim().split(/\s+/);
        const url = parts.shift();
        if (!url) return;
        let width = parseInt(parts[0], 10);
        if (isNaN(width)) width = 0;
        if (width >= bestWidth) { bestWidth = width; best = url; }
      });
      if (best) return best;
    }
    return image.src;
  }

  /* Infer a file extension from the URL first, then from the MIME type. */
  function extensionFromUrl(url: string): string {
    const data = /^data:image\/([a-z0-9.+-]+)/i.exec(url);
    if (data) return data[1].replace(/[^a-z0-9]/gi, '').toLowerCase();
    const path = url.split('?')[0].split('#')[0];
    const matched = /\.([a-z0-9]{1,5})$/i.exec(path);
    return matched ? matched[1].toLowerCase() : '';
  }

  function imageExtension(url: string, mime: string): string {
    const fromUrl = extensionFromUrl(url);
    if (fromUrl) return fromUrl;
    if (mime && mime.indexOf('/') > 0) {
      const subtype = mime.split(';')[0].split('/')[1];
      const cleaned = subtype ? subtype.replace(/[^a-z0-9]/gi, '').toLowerCase() : '';
      if (cleaned) return cleaned;
    }
    return 'png';
  }

  /* MIME of an inline image, used when saving it. */
  function dataImageType(src: string): string {
    const matched = /^data:([^;,]+)/i.exec(src);
    return matched ? matched[1] : '';
  }

  function fileStem(text: string, fallback: string): string {
    const stem = String(text || '').trim()
      .replace(/[\\/:*?"<>|\n\r\t]+/g, '-')
      .replace(/\s+/g, '-')
      .slice(0, 60);
    return stem || fallback;
  }

  function dataUrlToBlob(url: string): Blob | null {
    const parts = /^data:([^;,]+)?(;base64)?,(.*)$/i.exec(url);
    if (!parts) return null;
    const type = parts[1] || 'application/octet-stream';
    const data = parts[3];
    if (parts[2]) {
      const raw = window.atob(data);
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
      return new Blob([bytes], { type: type });
    }
    return new Blob([decodeURIComponent(data)], { type: type });
  }

  const ACTIONS: Record<string, Action> = {
    /* Selection ---------------------------------------------------------- */
    'copy-selection': function (ctx) { return copy(ctx.selection, '已复制选中文本'); },
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
      const utterance = new window.SpeechSynthesisUtterance(ctx.selection);
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
      const text = (ctx.link.text || '').trim();
      const plain = text && text !== ctx.link.href ? text + ' ' + ctx.link.href : ctx.link.href;
      return copy(plain, '已复制为纯文本链接');
    },

    /* Image -------------------------------------------------------------- */
    'open-image': function (ctx) { if (ctx.image) openExternal(ctx.image.src); },
    'copy-image-url': function (ctx) {
      if (ctx.image) return copy(ctx.image.src, '图片地址已复制');
    },
    'copy-image-blob': function (ctx) {
      if (!ctx.image) return;
      const url = ctx.image.src;
      const file = /^data:/i.test(url) ? dataUrlToBlob(url) : null;

      Promise.resolve(file || fetch(url, { mode: 'cors' }).then(function (response) {
        return response.blob();
      }))
        .then(function (blob) {
          if (!blob) throw new Error('unsupported source');
          if (!navigator.clipboard || !window.ClipboardItem) throw new Error('clipboard unsupported');
          const payload: Record<string, Blob> = {};
          payload[blob.type || 'image/png'] = blob;
          return navigator.clipboard.write([new window.ClipboardItem(payload)]);
        })
        .then(function () { Toast.success('图片已复制到剪贴板'); })
        .catch(function (error: unknown) {
          /* Chrome reports a TypeError when the fetch is blocked by CORS. */
          Toast.error(error instanceof TypeError
            ? '图片跨域，无法复制到剪贴板'
            : '复制图片失败');
        });
    },
    'save-image': function (ctx) {
      if (!ctx.image) return;
      const link = document.createElement('a');
      link.href = ctx.image.src;
      link.download = fileStem(ctx.image.alt, 'image') +
        '.' + imageExtension(ctx.image.src, ctx.image.type);
      link.target = '_blank';
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
      Toast.show('开始下载…', 'info', 1200);
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
      const link = document.createElement('a');
      const url = window.URL && window.URL.createObjectURL
        ? window.URL.createObjectURL(new Blob([ctx.code], { type: 'text/plain;charset=utf-8' }))
        : 'data:text/plain;charset=utf-8,' + encodeURIComponent(ctx.code);
      link.href = url;
      link.download = 'snippet.' + (CODE_EXTENSIONS[(ctx.codeLang || '').toLowerCase()] || 'txt');
      document.body.appendChild(link);
      link.click();
      link.remove();
      if (window.URL && window.URL.revokeObjectURL && url.indexOf('blob:') === 0) {
        window.setTimeout(function () { window.URL.revokeObjectURL(url); }, 1000);
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
        navigator.share({ title: document.title, url: location.href }).catch(function () { /* dismissed */ });
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
      const button = document.getElementById('mode-toggle');
      if (!button) { Toast.warn('未找到主题切换按钮'); return; }
      button.click();
    },
    'toggle-fullscreen': function () {
      const root = document.documentElement;
      const request = root.requestFullscreen || root.webkitRequestFullscreen;
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      const active = document.fullscreenElement || document.webkitFullscreenElement;

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
    'reload': function () { location.reload(); }
  };

  /* ---------------------------------------------------------------- Items */

  interface MenuItem {
    icon?: string;
    label?: string | ((ctx: MenuContext) => string);
    action?: string;
    state?: () => string;
    children?: MenuItem[];
    divider?: boolean;
  }

  interface MenuGroup {
    name: string;
    when: (ctx: MenuContext) => boolean;
    items: MenuItem[];
  }

  /* Reads the live value straight from the owning module every time the menu
     opens, so the label always reflects reality. */
  function stateLabel<T>(
    pick: () => T | null | undefined,
    getter: (module: T) => string
  ): () => string {
    return function (): string {
      const module = pick();
      return module ? getter(module) : '关';
    };
  }

  const COPY_AS: MenuItem = { icon: 'fa-copy', label: '复制为…', children: [] };
  const SITE_SETTINGS: MenuItem = { icon: 'fa-sliders', label: '站点设置…', children: [] };

  const GROUPS: MenuGroup[] = [
    {
      name: 'selection',
      when: function (ctx) { return !!ctx.selection; },
      items: [
        { icon: 'fa-copy', label: '复制选中文本', action: 'copy-selection' },
        {
          icon: COPY_AS.icon,
          label: COPY_AS.label,
          children: [
            { icon: 'fa-quote-right', label: '复制为引用', action: 'copy-quote' },
            { icon: 'fa-reply', label: '复制为 Markdown 引用（带来源）', action: 'copy-md-quote' },
            { icon: 'fa-font', label: '复制为纯文本（去格式）', action: 'copy-plain' }
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
            { icon: 'fa-file-code', label: '复制为 Markdown 链接', action: 'copy-md-link' },
            { icon: 'fa-code', label: '复制为 HTML 链接', action: 'copy-html-link' },
            { icon: 'fa-font', label: '复制为纯文本链接', action: 'copy-plain-link' }
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
            { icon: 'fa-clipboard', label: '复制图片到剪贴板', action: 'copy-image-blob' },
            { icon: 'fa-download', label: '保存图片到本地', action: 'save-image' }
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
            { icon: 'fa-file-code', label: '复制为 Markdown 代码块', action: 'copy-md-code' },
            { icon: 'fa-list-ol', label: '复制代码（去行号）', action: 'copy-code-noline' },
            { icon: 'fa-download', label: '下载代码', action: 'download-code' }
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
              state: stateLabel(() => Enhance.Reading, (mod) => (mod.isEnabled() ? '开' : '关'))
            },
            {
              icon: 'fa-wand-magic-sparkles',
              label: '点击特效',
              action: 'click-fx-cycle',
              state: stateLabel(() => Enhance.ClickEffect, (mod) => mod.label())
            },
            {
              icon: 'fa-music',
              label: '背景音乐',
              action: 'music-toggle',
              state: stateLabel(() => Enhance.Music, (mod) => (mod.isVisible() ? '开' : '关'))
            },
            {
              icon: 'fa-quote-left',
              label: '隽语卡片',
              action: 'quotes-toggle',
              state: stateLabel(() => Enhance.Quotes, (mod) => (mod.isVisible() ? '开' : '关'))
            }
          ]
        },
        {
          icon: 'fa-screwdriver-wrench',
          label: '页面工具…',
          children: [
            { icon: 'fa-link', label: '复制页面链接', action: 'copy-page-url' },
            { icon: 'fa-print', label: '打印 / 另存为 PDF', action: 'print' },
            { icon: 'fa-rotate', label: '刷新页面', action: 'reload' }
          ]
        },
        DIVIDER,
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
  function isHidden(groupName: string, action: string | undefined): boolean {
    const value: MenuGroupSetting = (CONFIG.groups || {})[groupName];
    if (value === false) return true;
    if (value && typeof value === 'object' && value.enabled === false) return true;
    const items = value && typeof value === 'object' ? value.items : undefined;
    return !!(items && action && items[action] === false);
  }

  function visibleChildren(groupName: string, item: MenuItem): MenuItem[] {
    if (!item.children) return [];
    return item.children.filter(function (child) {
      return !isHidden(groupName, child.action);
    });
  }

  function collectItems(ctx: MenuContext): MenuItem[] {
    const items: MenuItem[] = [];

    GROUPS.forEach(function (group) {
      if (isHidden(group.name, undefined)) return;
      if (!group.when(ctx)) return;

      group.items.forEach(function (item) {
        if (item.divider) { items.push(item); return; }

        if (item.children) {
          /* Hide the parent when every one of its commands is switched off. */
          const children = visibleChildren(group.name, item);
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
  let childStore: Record<string, MenuItem[]> = {};
  let childSeq = 0;

  function buildNode(item: MenuItem, ctx: MenuContext): HTMLElement {
    const label = typeof item.label === 'function' ? item.label(ctx) : item.label;
    const state = item.state ? item.state() : '';
    const node = document.createElement('div');

    node.className = 'ctx-item';
    node.setAttribute('role', 'menuitem');
    node.tabIndex = -1;

    if (item.children) {
      const id = 'submenu-' + (++childSeq);
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

  function buildList(items: MenuItem[], ctx: MenuContext, withHint: boolean): DocumentFragment {
    const fragment = document.createDocumentFragment();

    items.forEach(function (item) {
      if (item.divider) {
        const separator = document.createElement('div');
        separator.className = 'ctx-divider';
        separator.setAttribute('role', 'separator');
        fragment.appendChild(separator);
        return;
      }
      fragment.appendChild(buildNode(item, ctx));
    });

    if (withHint) {
      const hint = document.createElement('div');
      hint.className = 'ctx-hint';
      hint.innerHTML = '按住 <kbd>Shift</kbd> + 右键恢复浏览器菜单';
      fragment.appendChild(hint);
    }

    return fragment;
  }

  function render(items: MenuItem[], ctx: MenuContext): void {
    childStore = {};
    menu.innerHTML = '';
    menu.appendChild(buildList(items, ctx, true));
  }

  /* ------------------------------------------------------------- State -- */

  let currentContext: MenuContext | null = null;
  let lastFocused: HTMLElement | null = null;
  let exitTimer: number | undefined;
  let submenu: HTMLElement | null = null;
  let submenuOwner: HTMLElement | null = null;
  let submenuTimer: number | undefined;
  let hoverTimer: number | undefined;

  function open(x: number, y: number, ctx: MenuContext): void {
    clearTimeout(exitTimer);
    closeSubmenu(true);
    currentContext = ctx;
    lastFocused = document.activeElement as HTMLElement | null;
    render(collectItems(ctx), ctx);

    menu.hidden = false;
    menu.classList.add('visible');

    /* Measure after insertion, then keep the menu inside the viewport. */
    const rect = menu.getBoundingClientRect();
    const left = clamp(x, VIEWPORT_GAP, Math.max(VIEWPORT_GAP, window.innerWidth - rect.width - VIEWPORT_GAP));
    const top = clamp(y, VIEWPORT_GAP, Math.max(VIEWPORT_GAP, window.innerHeight - rect.height - VIEWPORT_GAP));
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';

    /* No autofocus: highlighting an entry the pointer never touched reads as
       a stray selection. Keyboard users enter with ArrowDown / ArrowUp. */
  }

  function restoreFocus(): void {
    if (!lastFocused || lastFocused === document.body) { lastFocused = null; return; }
    if (lastFocused.focus && document.documentElement.contains(lastFocused)) lastFocused.focus();
    lastFocused = null;
  }

  /* The captured context is kept until the next open(), so an item click can
     still read it after the menu has started closing. */
  function close(): void {
    closeSubmenu(true);
    if (menu.hidden) return;
    menu.classList.remove('visible');
    clearTimeout(exitTimer);
    exitTimer = window.setTimeout(function () { menu.hidden = true; }, EXIT_DURATION);
    restoreFocus();
  }

  function isOpen(): boolean {
    return !menu.hidden;
  }

  function run(action: string | undefined, ctx: MenuContext): void {
    const handler = action ? ACTIONS[action] : undefined;
    if (!handler) return;
    Enhance.guard('menu:' + action, function () {
      handler(ctx || collectPageContext(document.body));
    })();
  }

  /* ----------------------------------------------------------- Submenu -- */

  function ensureSubmenu(): HTMLElement {
    if (submenu) return submenu;
    const created = document.createElement('div');
    /* Appended to <body> so it can never be clipped by the menu's own
       scroll container. */
    created.className = 'ctx-submenu';
    created.setAttribute('role', 'menu');
    created.hidden = true;

    created.addEventListener('click', onSubmenuClick);
    created.addEventListener('keydown', function (event: KeyboardEvent) {
      navigate(event, created, true);
    });
    created.addEventListener('pointerenter', function (event: PointerEvent) {
      if (event.pointerType !== 'touch') cancelHoverClose();
    });
    created.addEventListener('pointerleave', function (event: PointerEvent) {
      if (event.pointerType !== 'touch') scheduleHoverClose();
    });

    document.body.appendChild(created);
    submenu = created;
    return created;
  }

  function positionSubmenu(owner: HTMLElement): void {
    if (!submenu) return;
    const anchor = owner.getBoundingClientRect();
    const rect = submenu.getBoundingClientRect();
    const limitRight = Math.max(VIEWPORT_GAP, window.innerWidth - rect.width - VIEWPORT_GAP);
    const limitBottom = Math.max(VIEWPORT_GAP, window.innerHeight - rect.height - VIEWPORT_GAP);

    /* Prefer the right side of the parent, flip left when it would overflow. */
    let left = anchor.right + 4;
    if (left > limitRight) left = anchor.left - rect.width - 4;
    left = clamp(left, VIEWPORT_GAP, limitRight);

    const top = clamp(anchor.top - 4, VIEWPORT_GAP, limitBottom);

    submenu.style.left = left + 'px';
    submenu.style.top = top + 'px';
  }

  function openSubmenu(owner: HTMLElement): void {
    const key = owner && owner.dataset.submenu;
    const children = key ? childStore[key] : undefined;
    if (!children || !children.length) return;

    if (submenuOwner && submenuOwner !== owner) closeSubmenu(true);

    const panel = ensureSubmenu();
    cancelHoverClose();

    panel.innerHTML = '';
    panel.appendChild(buildList(children, currentContext as MenuContext, false));
    panel.hidden = false;
    positionSubmenu(owner);
    requestAnimationFrame(function () { panel.classList.add('visible'); });

    owner.classList.add('is-expanded');
    owner.setAttribute('aria-expanded', 'true');
    submenuOwner = owner;
  }

  function closeSubmenu(immediate: boolean): void {
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
      submenuTimer = window.setTimeout(function () {
        if (!submenu) return;
        submenu.hidden = true;
        submenu.innerHTML = '';
      }, EXIT_DURATION);
    }
  }

  function toggleSubmenu(owner: HTMLElement): void {
    if (submenuOwner === owner) closeSubmenu(false);
    else openSubmenu(owner);
  }

  function scheduleHoverClose(): void {
    cancelHoverClose();
    hoverTimer = window.setTimeout(function () { closeSubmenu(false); }, HOVER_GRACE);
  }

  function cancelHoverClose(): void {
    clearTimeout(hoverTimer);
    hoverTimer = undefined;
  }

  function onSubmenuClick(event: MouseEvent): void {
    const target = asElement(event.target);
    const item = target ? target.closest<HTMLElement>('.ctx-item') : null;
    if (!item || item.dataset.submenu) return;
    event.stopPropagation();
    /* Snapshot the context before closing so handlers still see the target. */
    const action = item.dataset.action;
    const ctx = currentContext;
    close();
    run(action, ctx as MenuContext);
  }

  /* ------------------------------------------------------------ Context */

  function detectLanguage(element: Element | null): string {
    if (!element) return '';
    const host = element as HTMLElement;
    if (host.dataset && host.dataset.lang) return host.dataset.lang;
    const matched = /(?:^|[\s])(?:language|lang|highlight)-([a-z0-9+#.-]+)/i.exec(
      String(element.className || '')
    );
    return matched ? matched[1] : '';
  }

  function collectPageContext(target: EventTarget | null): MenuContext {
    const ctx: MenuContext = { link: null, image: null, selection: '', code: '', codeLang: '' };
    const element = asElement(target) || document.body;

    const anchor = element.closest<HTMLAnchorElement>('a[href]');
    if (anchor) ctx.link = { href: anchor.href, text: (anchor.textContent || '').trim() };

    const image = element.tagName === 'IMG'
      ? (element as HTMLImageElement)
      : element.closest<HTMLImageElement>('img');
    if (image) {
      ctx.image = {
        src: bestImageSource(image),
        alt: image.alt || '',
        type: dataImageType(image.currentSrc || image.src)
      };
    }

    const block = element.closest<HTMLElement>('pre, code');
    if (block) {
      const code = block.tagName === 'CODE' ? block : block.querySelector<HTMLElement>('code');
      if (code) {
        ctx.code = code.innerText || code.textContent || '';
        ctx.codeLang = detectLanguage(code) || detectLanguage(block);
      }
    }

    const selection = window.getSelection ? String(window.getSelection()) : '';
    ctx.selection = selection.trim();
    return ctx;
  }

  /* ----------------------------------------------------------- Keyboard -*/

  function itemsOf(container: HTMLElement): HTMLElement[] {
    return $$('.ctx-item', container);
  }

  function focusRelative(items: HTMLElement[], current: number, offset: number): void {
    if (!items.length) return;
    /* Nothing is focused right after opening: Down enters at the top,
       Up at the bottom. */
    const next = current < 0
      ? (offset > 0 ? 0 : items.length - 1)
      : (current + offset + items.length) % items.length;
    items[next].focus();
  }

  function navigate(event: KeyboardEvent, container: HTMLElement, isSubmenu: boolean): void {
    const items = itemsOf(container);
    if (!items.length) return;

    const index = items.indexOf(document.activeElement as HTMLElement);

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
          const first = itemsOf(ensureSubmenu())[0];
          if (first) first.focus();
          return;
        }
        items[index].click();
        return;
      case 'ArrowRight':
        if (index < 0 || !items[index].dataset.submenu) return;
        event.preventDefault();
        openSubmenu(items[index]);
        {
          const head = itemsOf(ensureSubmenu())[0];
          if (head) head.focus();
        }
        return;
      case 'ArrowLeft':
        if (!isSubmenu) return;
        event.preventDefault();
        {
          const owner = submenuOwner;
          closeSubmenu(true);
          if (owner) owner.focus();
        }
        return;
      case 'Escape':
        event.preventDefault();
        /* Keep the parent menu open; stop propagation so the global Escape
           handler does not close everything at once. */
        event.stopPropagation();
        if (isSubmenu) {
          const parent = submenuOwner;
          closeSubmenu(true);
          if (parent) parent.focus();
        } else {
          close();
        }
        return;
      default:
        return;
    }
  }

  /* ------------------------------------------------------------- Events -*/

  const SKIP = 'input, textarea, select, ' +
    '#custom-context-menu, #shortcuts-modal, #tool-cards, .ctx-submenu';

  let suppressClick = false;
  let suppressTimer: number | undefined;

  function beginClickSuppression(): void {
    suppressClick = true;
    clearTimeout(suppressTimer);
    suppressTimer = window.setTimeout(function () { suppressClick = false; }, SUPPRESS_CLICK_WINDOW);
  }

  document.addEventListener('contextmenu', function (event: MouseEvent) {
    /* Shift keeps the native menu reachable, including inside overlays. */
    if (event.shiftKey) { close(); return; }
    const target = asElement(event.target);
    if (target && target.closest(SKIP)) { close(); return; }
    event.preventDefault();
    open(event.clientX, event.clientY, collectPageContext(event.target));
  });

  menu.addEventListener('click', function (event: MouseEvent) {
    const target = asElement(event.target);
    const item = target ? target.closest<HTMLElement>('.ctx-item') : null;
    if (!item) return;
    event.stopPropagation();

    if (item.dataset.submenu) { toggleSubmenu(item); return; }

    /* Removed from the menus but still invocable through run(). */
    const action = item.dataset.action;
    const ctx = currentContext;
    close();
    run(action, ctx as MenuContext);
  });

  menu.addEventListener('keydown', function (event: KeyboardEvent) {
    navigate(event, menu, false);
  });

  /* Hover switches between submenus, leaving them while pointer ownership is
     still moving gets a short grace period. */
  menu.addEventListener('pointerover', function (event: PointerEvent) {
    if (event.pointerType === 'touch') return;
    cancelHoverClose();
    const target = asElement(event.target);
    const item = target ? target.closest<HTMLElement>('.ctx-item') : null;
    if (!item) { if (submenuOwner) scheduleHoverClose(); return; }
    if (item.dataset.submenu) {
      if (submenuOwner !== item) openSubmenu(item);
    } else if (submenuOwner) {
      scheduleHoverClose();
    }
  });

  menu.addEventListener('pointerleave', function (event: PointerEvent) {
    if (event.pointerType === 'touch') return;
    if (submenuOwner) scheduleHoverClose();
  });

  /* Scrolling the menu itself only dismisses the submenu. */
  menu.addEventListener('scroll', function () { closeSubmenu(true); }, { passive: true });

  /* ---------------------------------------------------- Outside events -- */

  /* Capture phase so the click that follows a long press can be swallowed
     before anything else reacts to it. */
  document.addEventListener('click', function (event: MouseEvent) {
    if (suppressClick) {
      suppressClick = false;
      clearTimeout(suppressTimer);
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const target = asElement(event.target);
    if (!target || !target.closest('#custom-context-menu, .ctx-submenu')) close();
  }, true);

  document.addEventListener('scroll', function (event: Event) {
    const node = event.target as Node | null;
    if (!node || node.nodeType !== 1) return;
    if (node === menu || menu.contains(node)) { closeSubmenu(true); return; }
    if (submenu && (node === submenu || submenu.contains(node))) return;
    close();
  }, { passive: true, capture: true });

  window.addEventListener('resize', function () { close(); });

  /* ------------------------------------------------- Touch long press ---- */

  let pressTimer: number | undefined;
  let pressOrigin: { x: number; y: number; target: EventTarget | null } | null = null;

  function clearPress(): void {
    clearTimeout(pressTimer);
    pressTimer = undefined;
    pressOrigin = null;
  }

  document.addEventListener('touchstart', function (event: TouchEvent) {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    /* Stay out of areas where long press already has a native meaning. */
    const target = asElement(event.target);
    if (target && target.closest(SKIP)) return;
    const origin = { x: touch.clientX, y: touch.clientY, target: event.target };
    pressOrigin = origin;
    pressTimer = window.setTimeout(function () {
      open(origin.x, origin.y, collectPageContext(origin.target));
      beginClickSuppression();
      if (navigator.vibrate) navigator.vibrate(15);
      pressOrigin = null;
    }, LONG_PRESS);
  }, { passive: true });

  document.addEventListener('touchmove', function (event: TouchEvent) {
    if (!pressTimer || !pressOrigin) return;
    const touch = event.touches[0];
    const dx = touch.clientX - pressOrigin.x;
    const dy = touch.clientY - pressOrigin.y;
    if (Math.sqrt(dx * dx + dy * dy) > MOVE_TOLERANCE) clearPress();
  }, { passive: true });

  document.addEventListener('touchend', clearPress, { passive: true });
  document.addEventListener('touchcancel', clearPress, { passive: true });

  return { open: open, close: close, isOpen: isOpen, run: run };
})();

Enhance.register('ContextMenu', ContextMenu);
