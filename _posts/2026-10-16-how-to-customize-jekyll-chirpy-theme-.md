---
title: 也许是全网最好的 Jekyll Chirpy 主题定制教程：我的个人博客定制方案
date: 2026-10-16
categories: [技术笔记]
tags: [Jekyll, Chirpy, SSG, 前端]
---

如果需要文中的源代码，可以直接访问 [GitHub 仓库](https://github.com/exyonefs/exyonefs.github.io) 获取。

先插一句题外话。细心的朋友可能发现，我把 GitHub 用户名从 `exyone-js` 改成了 `exyonefs`。原因说来简单：以 JavaScript 命名的项目实在烂大街，`F#` 反而更有新鲜感；况且在 GitHub Pages 的域名里，`exyonefs.github.io` 比 `exyone-js.github.io` 更紧凑，也更好看。权衡之下就换了。

回归正题。本文的全部操作以 **Chirpy 7.6** 为准，本仓库的 `Gemfile` 里锁的正是 `~> 7.6`。旧版本的主题文件、暗色信号与预留钩子都有差别，文中许多步骤无法照搬，敬请知悉。

## 定制的前提：覆盖机制与两个钩子

Chirpy 以 Ruby gem 的形式安装，主题文件并不在仓库里，但这不妨碍定制。Jekyll 读取文件时站点优先：只要在博客目录下创建与主题内相对路径同名的文件，站点版本就会覆盖 gem 中的版本。把 `_includes/footer.html` 往仓库里一放，主题自带的页脚即被替换，全程不必碰 gem，日后升级主题也不会产生冲突。

覆盖之外，Chirpy 另留了两个官方入口。一个是 `_includes/metadata-hook.html`，主题在文档头部引入它，可以往里塞任意样式、脚本或 DOM；另一个是 `assets/css/jekyll-theme-chirpy.scss`，它在主题主样式表之后编译，专门承载自定义规则。后文的所有改动，大体都走这两条路。

换句话说，这两条路决定了改动的边界：同名文件负责替换现成组件，两个钩子负责追加新东西。理清这一点，剩下的工作就是把需求逐条落到对应文件里。

## 两处小改动：贴纸与页脚

### 右下角贴纸

注：贴纸思路来源于 [manalogues.com/posts/2024/09/13](https://manalogues.com/posts/2024/09/13)，实现方式略有出入。

`_includes/sticker.html` 是一张固定在视口右下角的图片，用来给全站添一点辨识度。结构本身只有一层容器加一张图：

{% raw %}
```html
<div class="page-sticker" aria-hidden="true">
  <img src="{{ '/assets/img/sticker.png' | relative_url }}"
       alt="" loading="lazy">
</div>
```
{% endraw %}

样式与断点摆在同一个文件里，紧挨着标记，阅读时不必来回跳：

```css
.page-sticker {
  position: fixed;
  bottom: 5rem;
  right: 0;
  z-index: 50;
  opacity: 0.5;
  pointer-events: none;
  line-height: 0;
  width: 15vw;
}

.page-sticker img {
  display: block;
  width: 100%;
  height: auto;
  user-select: none;
  -webkit-user-drag: none;
}

@media (max-width: 768px) {
  .page-sticker {
    display: none;
  }
}
```

几处细节值得说明。`position: fixed` 让贴纸不随滚动移动；`pointer-events: none` 保证它永远不挡点击；`aria-hidden="true"` 配上空的 `alt`，让辅助技术忽略这张纯装饰图片；`loading="lazy"` 把加载推迟到浏览器认为需要时。图片自身再关掉选中与拖拽，避免误操作拖出半张图。窄屏上贴纸意义不大，768px 以下直接隐藏。

### 页脚

`_includes/footer.html` 覆盖了主题页脚。相比默认版本，我加了三样东西：动态年份、站点统计、心跳图标。

{% raw %}
```html
<p class="mb-0 copyright">
  © <span id="year"></span>
  · <em class="fst-normal">{{ site.social.name }}</em>
  <i class="fas fa-heartbeat heartbeat-icon"></i>
  {{ site.posts | size }} posts · {{ site.tags | size }} tags
</p>
```
{% endraw %}

年份由一小段脚本填充，免得每年元旦手动改：

```js
(function() {
  var year = new Date().getFullYear();
  document.getElementById('year').textContent = year;
})();
```

代价是禁用 JavaScript 时年份为空。权衡之下我接受了，因为文章数与标签数走的是 Liquid 构建期数据（`site.posts | size`、`site.tags | size`），与脚本无关，禁用脚本照样能显示。心跳图标是两段 `@keyframes`：默认 1.5 秒一轮，悬停时切到更快的 1 秒，颜色从 `#ff6b6b` 加深到 `#ff4757`。

```css
.heartbeat-icon {
  color: #ff6b6b;
  animation: heartbeat 1.5s ease-in-out infinite;
  display: inline-block;
  margin: 0 0.3em;
}

@keyframes heartbeat {
  0%, 100% { transform: scale(1); }
  14%      { transform: scale(1.15); }
  28%      { transform: scale(1); }
  42%      { transform: scale(1.15); }
  70%      { transform: scale(1); }
}
```

这里有一处小疏漏可以提一句：暗色分支写的选择器是 `[data-mode="dark"]`，而 Chirpy 7.x 实际挂在 `<html>` 上的是 `data-bs-theme`，两者对不上；好在两处颜色本来相同，视觉上看不出差别。技术栈链接（Jekyll、Chirpy、GitHub Pages、Cloudflare CDN）保持原样，另外顺手把侧栏标题调到了 `1.5rem`。

## 评论区：Waline 打底，Giscus 折叠

评论是改动较大的一块。`_includes/comments/waline.html` 实现了「Waline 为主、Giscus 备用」的双系统。先说为什么留两个：Waline 不需要 GitHub 账号，访问也顺畅，适合作为默认评论区；Giscus 基于 GitHub Discussions，适合愿意用 GitHub 账号登录的读者。与其二选一，不如让 Giscus 折叠在 Waline 下方，按需展开。

整个评论区不是写死的 HTML，而是脚本动态构建的：先创建 `#comments-wrapper`，插到 `<footer>` 之前，再把 Waline 容器挂上去。

```js
footer.insertAdjacentElement('beforebegin', wrapper);
wrapper.appendChild(walineBox);
```

这样做与主题结构解耦。主题改版时只要 `<footer>` 还在，插入逻辑就不会失效。整个包含文件还被 `{% raw %}{%- if waline.server_url -%}{% endraw %}` 包着，没配评论服务地址时，页面里连这段样式和脚本都不会出现。

样式走异步加载，避免阻塞渲染：

{% raw %}
```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@waline/client@{{ waline_ver }}/dist/waline.css"
  media="print"
  onload="this.media='all'"
  onerror="this.onerror=null;this.href='https://unpkg.com/@waline/client@{{ waline_ver }}/dist/waline.css'"
>
```
{% endraw %}

其中 `waline_ver` 在文件顶部取 `2.15.8`。`media="print"` 让浏览器以低优先级拉取样式，`onload` 再把 `media` 改回 `all`；`onerror` 负责在 jsdelivr 失败时换到 unpkg。脚本同样双 CDN，动态 `import()` 依次尝试，全部失败就静默退出，既不报错也不留一个空白框：

```js
const CDNS = [
  `https://cdn.jsdelivr.net/npm/@waline/client@${VER}/dist`,
  `https://unpkg.com/@waline/client@${VER}/dist`
];

async function loadModule() {
  for (const base of CDNS) {
    try {
      return await import(`${base}/waline.mjs`);
    } catch (e) { /* try next */ }
  }
  return null;
}
```

加载时机是懒加载。`IntersectionObserver` 以 `rootMargin: '400px 0px'` 监听评论区容器，读者滚到还剩四百像素时才真正加载 Waline；如果读者直接点了 Giscus 开关，则立即加载。首屏不关心评论的人，不会为它多花一分流量。

暗色模式同步有两处。Waline 的 `dark` 选项直接写成选择器 `html[data-bs-theme="dark"]`，跟随 Chirpy 7.x 的暗色信号；Giscus 是 iframe，靠 `MutationObserver` 盯住 `<html>` 上的 `data-bs-theme` 属性，变化时用 `postMessage` 通知 `https://giscus.app` 换主题。两者都不需要轮询。

Giscus 折叠面板还有一点体验细节：展开状态存进 `localStorage`（键名 `comments-giscus-open`），上次展开过，下次进来便默认展开；`_config.yml` 里没填齐 `giscus.repo` 与 `giscus.repo_id` 时，整个开关不渲染。评论配置集中在 `_config.yml` 的 `comments` 段，`provider` 填 `waline`，`waline.server_url` 指向自建的评论服务，Giscus 各项照常填写。

最后是无脚本兜底：`<noscript>` 给出 "Comments require JavaScript." 的提示，并附一份 unpkg 的样式表链接，至少不让页面出错。

## 样式与交互：jekyll-theme-chirpy.scss

这一节内容最多。文件顶部有一段空 front matter（两行 `---`），Jekyll 据此才愿意处理它；随后以导入主题主样式开头，注意生产环境导入的是压缩产物 `main.bundle`：

{% raw %}
```scss
@use 'main
{%- if jekyll.environment == 'production' -%}
  .bundle
{%- endif -%}
';
```
{% endraw %}

以下按层次展开。

### 外观微调

中文正文换用一套更贴合汉字的无衬线字体栈；代码块头部画上 macOS 红绿灯：

```scss
.content {
  font-family: "Noto Sans SC", "Sarasa Gothic SC",
    "PingFang SC", "Microsoft YaHei", sans-serif;
}
```

```scss
@media (min-width: 576px) {
  div[class^='language-'] .code-header::before {
    background-color: #ff5f57;
    box-shadow:
      1.25rem 0 0 #febc2e,
      2.5rem 0 0 #28c840;
  }
}
```

一个 `::before` 加两组 `box-shadow`，凑出红黄绿三颗点，只在 576px 以上启用，小屏不占地方。元信息里图标之间的分隔符（`.icon-border`）则直接隐藏，只留必要的间距。

### 设计令牌与毛玻璃

全站自定义组件共享一套 `--enh-*` 变量，且全部做了回退链：先取 Chirpy 的变量，再退到 Bootstrap 的变量，最后才是硬编码色值。这样主题换色时组件跟着变，不会各走各的。

```scss
:root {
  --enh-bg:        var(--card-bg,           var(--bs-body-bg,         #ffffff));
  --enh-text:      var(--text-color,        var(--bs-body-color,      #212529));
  --enh-muted:     var(--text-muted-color,  var(--bs-secondary-color, #6c757d));
  --enh-border:    var(--btn-border-color,  var(--bs-border-color,    #dee2e6));
  --enh-primary:   var(--bs-primary,        #0d6efd);
  --enh-hover:     var(--bs-primary-bg-subtle, rgba(13, 110, 253, .1));
  --enh-danger:    #d14343;

  --enh-radius:    .65rem;
  --enh-radius-sm: .4rem;
  --enh-shadow:    0 6px 24px rgba(0, 0, 0, .12);
  --enh-shadow-lg: 0 12px 40px rgba(0, 0, 0, .16);

  // Single source of truth for stacking order.
  --z-progress: 1030;
  --z-click-fx: 1040;
  --z-cards:    1055;
  --z-ctx:      1055;
  --z-modal:    1060;
  --z-toast:    1070;
}
```

层级同样收进变量，`z-index` 不再满天飞。毛玻璃面板由一个混入统一产出，`backdrop-filter` 之外还有 `@supports` 兜底，不支持的浏览器退回纯色而非变成透明：

```scss
@mixin enh-surface($translucency: 88%) {
  background: var(--enh-bg);
  border: 1px solid var(--enh-border);
  border-radius: var(--enh-radius);
  box-shadow: var(--enh-shadow-lg);

  @supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    background: color-mix(in srgb, var(--enh-bg) $translucency, transparent);
    -webkit-backdrop-filter: blur(16px) saturate(1.6);
    backdrop-filter: blur(16px) saturate(1.6);
  }
}
```

### 悬浮卡片：音乐与引语

右上角有两张可拖拽卡片，交互逻辑同源。音乐卡用 Howler.js 作为音频引擎，歌单来自 Audius（`playlistId` 为 `DOPRl`），支持上一首、播放暂停、下一首；播放进度用宽度渐变填充，整条可点击或拖动跳转，缓冲时提示行末尾挂一个旋转的小圆圈。播放模式（顺序、随机、单曲循环、列表循环）由 `site_enhance.player.order` 决定，默认 `random`。引语卡（标记里叫 `#quotify-card`）从 `https://htk.exyon.ee/api/quotes` 拉取引语，点一下换一句，加载中是半透明态，失败则转为红色提示。

两张卡的头部都是拖拽把手，双击可归位，位置记进 `localStorage`。`#tool-cards` 容器铺满视口但 `pointer-events: none`，只有卡片本身接收事件，拖动时不会误触正文。隐藏用的是 `visibility` 而非 `display`，保留合成层，避免出现时闪一下；卡片自身再把 `[hidden]` 改回 `display: block`，让语义属性和动画并存。

### 右键菜单、快捷键与 Toast

右键菜单接管了浏览器默认菜单，按选中内容分组：选中文字一组，链接、图片、代码、页面各一组，支持子菜单。子菜单挂在 `<body>` 上，滚动容器再也不会裁剪它。菜单项按需生成，功能全开时能覆盖复制、朗读、翻译、下载代码、保存图片等操作。配套还有一个快捷键弹层：`Alt` + `Z` 简繁转换，`Alt` + `空格` 播放暂停，`Shift` + `右键` 临时恢复浏览器菜单，`Esc` 关闭当前弹层，`?` 查看帮助。触屏上长按也能唤起菜单，并有轻震动反馈与随后的误触抑制。

轻量反馈走 Toast：右上角最多同屏三条，两秒后淡出；成功、警告、错误分别对应绿、黄、红的边框色。这一层是所有模块共用的通知出口。

### 阅读进度与点击特效

页面顶部一条两像素的进度条，亮色模式是绿色渐变，暗色模式切成暖橙，由 `transform: scaleX()` 驱动，不触发重排。滚动位置先写入目标值，再由 `requestAnimationFrame` 逐帧逼近，所以进度条是「跟住」页面而不是每滚动一次就跳一下。

点击特效有 `word`、`ripple`、`confetti` 三种，默认 `word`：点哪儿，哪儿就浮出一个词再淡去；彩带模式则把若干小色片按各自角度、距离、延迟抛射出去。特效带节流（`throttle: 80`）和数量上限（`max: 6`，即同屏最多六个），防止疯狂点击时拖垮页面；控件与浮层内部的点击一律跳过，当前模式存进 `localStorage`，下次访问依然有效。

### 粒子背景

`#particles-bg` 是一层固定定位、`z-index: -1` 的画布，由 `_frontend/src/particles.ts` 驱动：粒子数量随视口面积在 18 到 44 之间浮动，近距离粒子间连线，鼠标附近另有引力与连线。亮色用中性灰加一点蓝，暗色反过来用冷蓝灰。调色板变量全部作用域在 `#particles-bg` 内，JS 从计算样式里读值，不会污染全局；窄屏与触屏下直接隐藏，打印时同样隐藏，标签页切到后台则停掉动画循环。

### 前端工程化方式

这些交互不是散落的 `<script>`，而是 TypeScript 源码放在 `_frontend/src/`，用 esbuild 打成单个 `assets/js/bundle.js`，以 `defer` 加载。公共能力集中在 `core.ts`：命名空间与模块注册表、事件总线、永不抛错的 DOM 与存储 helper、CDN 感知的资源加载，以及带超时的 `fetch` 封装。每个模块只负责自己的界面与状态，出错时被 `guard` 兜住，不会连累页面其余部分。

配置走 `_config.yml` 的 `site_enhance` 段，`_includes/metadata-hook.html` 把它序列化成 `window.SITE_ENHANCE`，YAML 里的 snake_case 在注入时转成 camelCase。改行为不用碰代码，改配置即可：

```yml
site_enhance:
  # Simplified <-> Traditional Chinese toggle, Alt+Z or context menu.
  zh_convert:
    enabled: true
    auto_detect: true      # infer the initial mode from navigator.language

  # Background music card; Howler.js is used purely as an audio engine.
  player:
    enabled: true
    volume: 0.7
    order: random          # list | random | single | circulation
    audius:
      playlistId: "DOPRl"

  # Click decoration: word | ripple | confetti | none.
  click_effect:
    mode: word
    throttle: 80
    max: 6
```

源码与产物分开：`_config.yml` 的 `exclude` 里排除 `_frontend` 与 `node_modules`，只有编译好的 `assets/js/bundle.js` 会进站点。构建脚本集中在 `package.json`，`npm run build` 出产物，`npm run watch` 边改边看，`npm run typecheck` 单独跑类型检查。同一条流水线还带出一个构建期脚本 `_frontend/pages/friends.ts`，用 `npm run pages` 抓取友链 RSS，生成 `friends/` 下的多页静态站点和共享样式；`npm run build:site` 把两者串在一起。

需要说明的是，选 TypeScript 只是偏好，不是门槛。同一套逻辑写成普通 JavaScript、直接放进 `assets/js/` 一样能跑：`assets/` 下的静态文件会被 Jekyll 原样拷进站点，只要在 `_includes/metadata-hook.html` 里补一行 `<script defer src="/assets/js/xxx.js"></script>`（站点配了 `baseurl` 就套上 `relative_url`）即可。这条路不需要 Node.js，也没有构建步骤，代价是失去类型检查、模块拆分与压缩，多个文件之间共享代码得靠全局命名空间或 IIFE 自己收拾。反过来，若采用本文的做法，`npm run build` 这类命令就离不开 Node.js 与 `node_modules`；只想改配置和样式的读者，则可以完全不碰这一层。

文中片段只截取要害，完整的实现细节——各模块的兜底分支、持久化键名、无障碍处理与构建配置——都在 [仓库](https://github.com/exyonefs/exyonefs.github.io) 里。对着源码读一遍，比逐段看节选清楚得多；真要照着改造自己的站点，直接参考仓库里的文件也最省事。

### 无障碍与边界

该让的地方也让：`:focus-visible` 统一焦点圈，`prefers-contrast: more` 下去掉阴影改用描边，`prefers-reduced-motion: reduce` 关掉一切动画，打印时隐藏全部浮层，高分屏则把进度条加粗到 2.5px。移动端另有取舍：贴纸、粒子背景在窄屏隐藏，悬浮卡片改为近全宽，播放控制按钮也顺势放大到更好点按的尺寸。

## 诗集：一个纸面目录页

`_poems` 是填词的存档处，独立集合。它没有另起炉灶，而是尽量借 Chirpy 的现成机制。

先在 `_config.yml` 注册集合，并用 `defaults` 把路由和布局定好：

```yml
collections:
  poems:
    output: true
    sort_by: date

defaults:
  - scope:
      path: ""
      type: poems
    values:
      layout: post # reuse the post layout as-is, poems need no dedicated one
      comments: false
      toc: false
      permalink: /poems/:title/
```

每首词一个文件，只有 `title` 和正文，复用 `post` 布局，关掉评论与目录，挂在 `/poems/:title/` 下。目录页则是 `_tabs/poems.md`，因此它同时出现在顶部标签栏里：

```yml
---
title: 诗集
permalink: /poems/
icon: fas fa-scroll
order: 4
---
```

样式走 "LaTeX Paper" 路线：纸白 `#FFFFFF`、墨黑 `#111111`、弱化灰 `#6B6B66`、链接用 hyperref 蓝 `#0B5394`，直角、无阴影，标题与正文都用衬线体。这里有个实际问题要处理：Chirpy 用 `h1,h2,h3,h4,h5{font-family:Lato,…}` 强制标题无衬线，所以目录页以更高优先级把标题字体改回衬线，并借 `letter-spacing: -0.02em` 模拟 Computer Modern 的紧排感。标签页顶部还会自动打一个裸标题，目录页顺手隐藏掉它，换成居中的文档头，注明篇数与最近更新日期。

列表每一项由编号、词牌名、日期和一段四十字的摘句组成，摘句由 Liquid 现场截取：

{% raw %}
```liquid
{{ poem.content | strip_html | strip_newlines | replace: '  ', '' | normalize_whitespace | truncate: 40 }}
```
{% endraw %}

分页是纯客户端实现，每页五条，无脚本兜底值得一提：条目默认全部可见，只有 JavaScript 运行后才给容器加 `is-paged` 类、逐条显隐。页码同时写进 URL 查询参数 `?p=`，用 `history.replaceState` 修改，监听 `popstate` 保证前进后退可用；翻页后若目录已被滚出视口，会平滑滚回，`prefers-reduced-motion` 时退回瞬时滚动；打印样式则强制展开全部条目。这一页固定亮色纸面，不跟随全站暗色切换，算是在质感与一致之间选了前者。

## 小结

回头看，这套定制没有动 Chirpy 一行源码，全部落在它预留的口子里：`_includes/metadata-hook.html` 管注入，`assets/css/jekyll-theme-chirpy.scss` 管样式，同名文件管覆盖。改动大致分四层：贴纸与页脚是即时生效的小件；评论区让默认体验与 GitHub 用户各取所需；样式与脚本在明暗、动效、无障碍之间找平衡；诗集则验证了另一件事——借 `collections` 和 `tabs`，新的内容类型可以不写布局就接入全站。同样的手法在 `_moments` 上又用了一次，只换了 `permalink` 与集合名。

真正值得记下来的经验只有一条：动手前先把主题的入口摸清。入口找准了，任何定制都只是往既有结构上贴一小块东西；入口找不准，改得越多，日后升级就越难受。
