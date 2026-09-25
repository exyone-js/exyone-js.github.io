---
title: 博客再次搬家：回归 Jekyll，并为 Chirpy 接入 Waline
date: 2026-09-12T00:00:00.000Z
categories:
- 项目分享
tags:
- 博客
- Jekyll
- Waline
excerpt: 记录从 Halo、Eleventy 回到 Jekyll Chirpy，回顾 Twikoo、Giscus、Remark42 等评论系统的选型与折腾，并说明把评论系统迁到 Waline 时遇到的主要问题。
image: https://jekyllrb.com/img/logo-2x.png
pin: true
---

如你所见，这个站点又被我搬回 Jekyll Chirpy 了。

倒不是说 Halo 不好，也不是之前用 Eleventy 自己搭的博客不行，而是越折腾越觉得：Jekyll 这种成熟、稳定、省心的静态生成器，更适合现在的我。自己开发的 Zest SSG 虽然是一点点做出来的，但当初设计得过于复杂，而我现在最需要的是简洁轻量。

## 为什么又搬回来

起因很简单。我重新把 Netlify 和 Cloudflare Pages 都关联回了 GitHub，所有平台又共用一个代码仓库管理。比起自建 Git 实例，GitHub 至少在我不能经常回家的时候也能稳定访问，不用操心服务器还活着没有。

另外一个小插曲：我发现学校微机室居然能直接访问 GitHub，而且不卡。这意味着在微机课上写博客成为可能。于是这个周末我集中时间，把迁移做完了。

这次建站我给自己定了条规矩：尽量少用 AI。也正因如此，我选了 Jekyll + Chirpy，它们都是人工维护的项目。论架构规范和功能全面程度，它们确实比不上我之前用 AI 堆出来的 11ty 博客，但奇怪的是，这种手工味更重的博客反而更吸引我。而且不少朋友跟我吐槽过，说之前那个站风格太复古，欣赏不来。Chirpy 简约大气，虽然我个人对这种单色调审美不太感冒，总觉得看不出重点、费眼睛，但大多数人喜欢这种极简风。

顺带一提，Jekyll 的主题是打包成 gem 使用的，样式不用我自己操心，还能跟着自动升级。对于上了高中、不能经常回家的我来说，这一点相当重要。6 月底我写过，7 月 5 日要去上高中衔接班，博客大概率会停更一阵子，友链申请也会暂时搁置。现在高中生活已经开始，确实没有太多时间折腾服务器和构建环境，稳定省心比什么都重要。

## 评论系统的来龙去脉

博客搬完家，评论系统也顺手从 Twikoo 换成了 Waline。不过在这之前，评论系统已经换过好几轮，值得先把旧账翻一翻。

最早我用的是 Twikoo 和 Giscus：Twikoo 负责文章评论，Giscus 负责投票和分类。它们各司其职，但需要同时维护两个后端。Giscus 本身很好——免费、无广告，评论数据存在 GitHub Discussions 里，跟项目代码在同一个屋檐下。但它有一个门槛：读者必须有 GitHub 账号才能发言。一位来自中国的读者也许能稳定访问博客，却怎么也打不开 GitHub 的认证页面；另一位读者可能只是想说一句“好文章”，却要为此注册一个并不需要的账号。这种摩擦会直接损失评论。

Twikoo 提供了另一种路。它支持匿名评论，不需要第三方账号，读者打开页面就能打字。代价是需要自己维护一个后端，可以是腾讯云 CloudBase、Vercel，或者自建服务器。对我来说，这个代价值得：同时提供 Giscus 和 Twikoo，就等于照顾了两类读者——愿意用 GitHub 身份发声的，和只想留下只言片语的。

但 Chirpy 主题的模板打包在 Ruby gem 里，不能直接在项目目录中修改。官方只内置了 Giscus、Disqus 和 Utterances 三种评论系统。想加 Twikoo，绕过 gem 的束缚，就得动主题源文件。最直接的办法是 fork 主题，改完用自己的 fork，但每次 Chirpy 发布更新，都得把变动合并回来，而评论功能本身并不会因为主题升级而有什么变化。我希望方案能跟上游主题保持同步，不需要维护独立 fork。

于是今年 4 月，我开始尝试一种不触碰主题核心文件、就能把 Twikoo 注入每篇文章的方法。这个过程经历了三次尝试。

第一次是写 Jekyll 插件。我创建了一个后渲染钩子（post-render hook），在 Jekyll 构建完每个文档之后运行。它检查输出是不是 HTML，验证当前文档是不是一篇文章，确认无误后，把 Twikoo 所需的容器和脚本注入到结束标签之前。这个方案在本地跑得很好，在 Cloudflare Pages 上也正常。但推上 GitHub Pages 后，评论模块消失了。问题出在 GitHub Pages 的构建环境对自定义 Jekyll 插件的处理方式上——它在构建过程中根本不会执行第三方插件。我一度以为是自己钩子类型选错了，于是换钩子类型、加错误日志、清缓存、反复调整配置。折腾了几周才确认，这不是代码的问题，是平台本身不支持。~~完整的插件源码现在还在仓库里，路径是 `_plugins/twikoo-inject.rb`，供使用兼容平台的读者参考。~~_（注：现已删除）_

第二次尝试换了个思路，绕开插件系统。我用 Liquid 模板把 Twikoo 直接嵌入到 `_includes/footer.html` 里。`footer.html` 是站点模板的一部分，Jekyll 在正常构建周期中会处理它，不管插件有没有被加载。想法本身成立，但实际效果依然不稳定。GitHub Actions 的构建环境在处理模板 include 的细节上与其他平台存在差异，导致 footer include 在某些构建中触发了，在某些构建中没有。这时我意识到，真正的问题不是用什么方式注入 Twikoo，而是不同构建环境对同一份源码的解释并不一致。

第三次尝试彻底改变了思路。既然构建环境不可控，那就不让它们构建。我在本地先跑 `bundle exec jekyll build`，把生成的 `_site` 文件夹推送到部署仓库。托管平台只负责提供静态文件，不执行任何构建命令。这样不管把 `_site` 部署到 GitHub Pages、Cloudflare Pages 还是 Netlify，输出都是本地看到的那一份。它不是用哪个平台的标准去构建，而是我自己决定了标准的版本。

具体的注入方式仍然是利用 `_includes/footer.html` 模板。区别在于，之前是让平台去渲染这个模板，现在是在本地渲染好再推送。为了防止重复注入，我在 Twikoo 容器上加了独特的数据属性作为标记，这样即使文章本身包含关于 Twikoo 的代码示例，注入逻辑也不会误判。这是一个自己写插件时很容易踩的坑——你的文章内容恰好提到了注入目标，结果把自己排除在外了。

UI 上我做了一个切换按钮。因为 Giscus 由 Chirpy 主题自身渲染，没办法隐藏，所以 Twikoo 默认不显示。读者点击“展开 Twikoo 评论”之后才会出现输入框，按钮文字同步切换成“收起”。这样做也实现了懒加载：Twikoo 的 JavaScript 库只在第一次点击按钮时才加载并初始化。如果读者没有评论的意图，浏览器就不会多下载一个库。

样式方面我用了 Chirpy 定义的 CSS 变量：`--border-color`、`--text-muted`、`--link-color`。切换按钮和分隔线在浅色和深色模式下自动适配，不需要为每种模式写两套样式。宽度对齐到 `max-width: 800px`，与文章正文保持一致。边距设成 `0.5rem auto 2rem auto`——顶部给一点呼吸空间，底部留出更充分的分隔，因为下面是 footer 的开始位置。

配置很简单。如果只想用 Twikoo，不要在 theme 的评论 provider 字段里填任何值，否则 Chirpy 会因为不认识的 provider 报错。如果想同时使用 Giscus 和 Twikoo，就把 provider 保留为 `giscus`，主题会正常渲染 Giscus，Twikoo 则通过注入的方式独立显示。另外需要在 `_config.yml` 里加上一行：

```yaml
plugins_dir: _plugins
```

这行配置告诉 Jekyll 从 `_plugins` 目录加载自定义插件。如果缺少这行，Jekyll 可能找不到放在那里的脚本，具体表现因调用方式而异。

部署方面，我现在的流程是：源码和 `_site` 在同一个仓库里。本地构建完成后，通过 GitHub Actions 把 `_site` 目录推送到 GitHub Pages。对于 Cloudflare Pages 和 Netlify，同样推送 `_site` 目录，但在它们的控制台中关闭构建功能，只保留部署和托管静态文件的能力。Netlify 的免费版每月有 300 分钟的构建时间限制，跳过构建步骤还能省下这些额度给其他项目用。

各平台的设置要点是：GitHub 仓库设置中启用 Pages，选择 GitHub Actions 作为构建源；Cloudflare 创建 Pages 项目时关闭构建选项，部署目录设为 `_site`；Netlify 创建站点时同样关闭构建命令，发布目录设为 `_site`。然后写一个简短的部署脚本来自动化整个过程，每次需要发布时在本地先 `bundle exec jekyll build`，然后提交 `_site` 的变更并推送。可以参考这个骨架：

```bash
#!/bin/bash
set -e
bundle exec jekyll build
cd _site
git add .
git commit -m "Deploy $(date)"
git push deploy main
```

本地构建工作流程有几个实在的好处。一致性最重要——本地是什么样，线上就是什么样，因为用的是同一台机器、同一套 Ruby 版本和 gem 版本构建出来的。调试也更简单：如果线上页面出了问题，把本地 `_site` 里对应的 HTML 打开，和线上比较，差异一目了然。部署速度更快，推送 git 提交只需要几秒钟，不需要等平台慢慢跑构建。最后，控制权在自己手里——平台可能会在某个星期二悄悄升级 Ruby 版本，但本地构建环境只会在主动升级时变化。

现在每篇文章底部都有两个评论系统。Giscus 默认可见，与主题风格融为一体。Twikoo 默认隐藏，通过切换按钮访问。它们各自独立工作，读者按自己的情况选。如果只是在浏览内容，两个都可以忽略，页面不会因为没评论就加载多余的脚本。完整的源代码在 GitHub 仓库里，需要关注三个文件：`_includes/footer.html`（模板注入的逻辑）、`_plugins/twikoo-inject.rb`（插件注入版本，供兼容平台使用）、以及 `_config.yml` 中与 Twikoo 相关的配置项。

这个方案在迭代过程中的关键节点：4 月 25 日完成初始版本，包含切换 UI 和懒加载；同一天将钩子从 `site:post_render` 改为 `documents:post_render`，提升兼容性；5 月 2 日修复自我排除的 bug——使用独特 data 属性做标记后，文章内容不再影响注入结果；5 月 7 日尝试 `footer.html` 模板注入作为纯插件方案的替代；5 月 8 日最终转向本地构建工作流程。到这一步，我在不同平台上看到的终于不再是三种不同的结果。

### 中间还试过 Remark42

6 月时，我一度把评论系统迁到 Remark42，还写过一篇静态博客评论系统选型对比。Remark42 用 Go 开发，BoltDB 内嵌存储，不需要额外跑数据库，一个二进制搞定全部。部署很简单，在 Release 页面下载对应系统的二进制文件然后运行。我的配置方案是用 systemd 添加一个服务，通过 Cloudflare Tunnel 暴露到公网：

```ini
[Unit]
Description=Remark42
After=network.target

[Service]
Type=simple
ExecStart=/opt/remark42/remark42 server \
  --secret=xxxxx \
  --url=https://comments.exyone.js.cool \
  --site=exyone \
  --auth-anon=true
User=remark42
Restart=on-failure
```

然后 Cloudflare Tunnel 把 `comments.exyone.js.cool` 指向本机 Remark42 端口。前端注入一个 `<div id="remark42">` 和加载脚本。

Remark42 的设计有不少亮点：

- **匿名与认证双模式**：读者不登录也能留评，也可以绑 GitHub、Google、Facebook。管理员还能开邮箱验证。
- **管理后台**：页面加 `?remark42_admin=1` 调出登录口，进去后审核、删评、屏蔽、导出 JSON，都在 Web 里完成。
- **邮件通知与 RSS**：新评论发邮件通知管理员；读者也能订阅某篇帖子的 RSS，有新回复时推送。
- **评论排序与投票**：读者可以按时间或热度排序，也能点赞/点踩。
- **主题与国际化**：亮色/深色都支持，`REMARK42.changeTheme()` 动态切换。界面有 20 多种语言，包括简体中文。

数据存储默认使用 BoltDB，一个文件存在 `/opt/remark42/var/` 下。备份就是复制这个文件。迁移也很简单。

优点：功能全（匿名+社交登录、投票、排序、Markdown、传图、邮件、RSS、后台）、单二进制、数据可控、社区活跃。缺点：部署需要一台 VPS（内网穿透方案也行，但仍然需要一个常年运行的服务器）、没云托管、界面偏功能型。

Remark42 有许多优点，轻量、隐私友好，确实有不少可取之处，但终究还是“水土不服”——在国内用太难受，后台管理也相当折腾。思来想去，还是 Twikoo 更贴合当时的场景：本土化适配做得扎实，部署简单，评论管理也直观。对来访的朋友来说，填个昵称、邮箱就能留步，其他博主还能顺手填上自己的站点地址，点一下昵称就能跳转回访，这种“串门”的仪式感，对于博客来说几乎是必须的。所以 6 月 30 日，我又把评论系统从 Remark42 切回了 Twikoo。

顺便把当时对其他方案的判断也放在这里，方便以后回看：

- **Twikoo**：国人开发的开源评论系统，文档全中文，配置友好。很多人以为 Twikoo 必须搭 MongoDB，其实裸机或 Docker 部署时默认用的是 LokiJS——数据存 JSON 文件，启动时全部加载到内存，读写都在内存完成，定期写回磁盘。评论量不大时优势明显：零外部依赖、延迟极低、全量备份只需要复制几个 JSON 文件。短板是 LokiJS 不适合大数据集或多实例并发写；但个人博客几百条评论、单节点低频读写，LokiJS 比 MongoDB 轻得多。MongoDB 适合评论量大、访问频繁或多节点共享的场景。对多数个人博客，MongoDB 的优势发挥不出来，反而多了个要维护的数据库。优点：匿名门槛低、界面简洁、Akismet 和腾讯云反垃圾插件、邮件通知、表情和 Markdown、管理员后台。缺点：没投票/问答/分类，功能单薄；得自己维护后端。
- **Giscus**：数据存在 GitHub Discussions 里，前端嵌入一个组件，前提是读者得有 GitHub 账号。受众都是开发者的话体验很不错——GitHub Discussions 的全套功能都有：点赞/点踩、标记答案、分类留言。优点：免费、无广告、数据在 GitHub 上几乎不会丢、功能多（表情反应、投票、问答、分类）、自动暗色模式、加载快。缺点：强制 GitHub 登录、非技术读者直接劝退；得用公开仓库存数据；国内 GitHub 访问时好时坏。
- **Waline**：Twikoo 的替代品，同样支持匿名，后端选择更多（LeanCloud、腾讯云、Deta、自建）。多了 PV 统计、多语言、更多通知渠道（邮件、Telegram、微信）。想要比 Twikoo 更强的管理能力，Waline 是更好的选择。
- **Disqus**：接入最简单，几行代码就行。但免费版广告越来越恶心，国内基本不可用。
- **Gitalk / Utterances**：和 Giscus 思路一样，区别是用 Issues 存评论（Utterances 也是 Issues，Giscus 用 Discussions）。Giscus 功能更现代，新项目建议选用 Giscus。
- **Cusdis**：轻量、注重隐私，后端可自托管，前端精简，支持匿名评论。缺点是社区还在早期，更新慢。

### 这次：Twikoo → Waline

博客搬完家，评论系统也顺手从 Twikoo 换成了 Waline。这部分过程比较曲折，值得单独写一写。

我用的是 Waline 的 GitHub 仓库存储 CSV 方案，不用数据库，方便把 Twikoo 的旧评论数据迁过来。服务端部署在 Netlify Functions 上。问题从部署那一刻就开始了。

#### 坑一：官方 Starter 没法用

官方文档里 Netlify 部署的介绍已经很古老了，给的 Starter 模板也直接跑不起来。没办法，我只能自己折腾一个：

> Starter 仓库：<https://github.com/exyone-js/waline-netlify>

和官方模板相比，我这个版本直接用了官方为 Vercel 适配的 `@waline/vercel` 包。它是全量的，没有被裁剪过。但这就引出了第一个两难。

#### 坑二：函数包体积爆炸

一开始为了保险，我在 Netlify 配置里把 `@waline/vercel` 设成了外部依赖：

```toml
external_node_modules = ["@waline/vercel"]
```

这是确保函数正常运行的关键之一：`@waline/vercel` 基于 thinkjs，内部有大量动态 `require`，比如各种数据库驱动 `think-model-*`、nunjucks 模板、ip2region 数据文件等。esbuild 静态打包时可能错误解析或漏掉资源。外置之后由 Node 运行时直接从 `node_modules` 加载，Netlify 会自动把依赖一并部署。

但问题也很明显：外置之后，Netlify 会把它的全部依赖都塞进函数包，包括 jsdom、各种数据库驱动、leancloud-storage、mathjax 字体等，加起来超过 250 MB，直接超限。官方 Starter 之所以能用 esbuild 打包成功，是因为 tree-shaking 会大幅裁剪体积。我这个“保险措施”反而帮了倒忙。

我通过 npm 的远程数据分析了体积构成，大头全是我根本用不到的东西：

| 依赖 | 体积 | 我需要吗 |
| --- | --- | --- |
| `@mathjax/*`（源码 + 两套字体）+ speech-rule-engine | ~88 MB | 不需要，公式渲染可关闭 |
| `leancloud-storage` + `leancloud-realtime`（含 protobufjs、moment） | ~56 MB | 不需要，我用 GitHub 存储 |
| `better-sqlite3`（含多平台原生二进制） | 9.7 MB | 不需要，不要数据库 |
| jsdom / dompurify / prismjs / ip2region 等 | 其余 | 需要，核心功能依赖 |

这些大包大多只在启用对应功能时才加载。全量外置等于把所有平台二进制和完整字体原样拷了过去。

最终策略：保留 esbuild 打包，享受 tree-shaking；再用 npm `overrides` 把那 6 个用不到的重依赖替换成本地空桩（stub），同时在函数里显式关闭 tex 渲染：

```js
// 从代码层关闭 mathjax/katex，桩包永不加载
markdown: { plugin: { tex: false } }
```

这样处理后，函数包从 250 MB+ 降到了 94 MB，干净安装验证通过。

#### 坑三：jsdom 的 ESM 连环雷

体积问题解决后，运行时又出错了。这次问题出在 jsdom 的依赖链上，而且是第二次遇到。

上次我把 jsdom 锁到 27，只解决了 `@exodus/bytes` 那条编码嗅探链，没想到还藏着第二条 ESM 隐患链，位于 CSS 解析：

```text
jsdom@27 → cssstyle@5 → @asamuzakjp/css-color@4 (dist/cjs/index.cjs)
                              └─ require("@csstools/css-calc@3")  ← ESM-only，崩溃
```

我本地没有复现，是因为只渲染了简单 markdown、没触发 CSS 路径，加上本地 Node 24.12 和线上 24.19 行为有差异。这是我上次验证不充分。

根治办法是把 jsdom 降到 26.1.0，整条 CSS 链换成自带真正 CJS 入口的版本：

| 包 | jsdom 27（崩溃） | jsdom 26（安全） |
| --- | --- | --- |
| cssstyle | 5.x | 4.6.0 |
| @asamuzakjp/css-color | 4.x（CJS 产物里 require ESM） | 3.2.0（`require` 条件 → .cjs） |
| @csstools/css-calc | 3.x（仅 ESM，无 require 入口） | 2.1.4（`require` 条件 → .cjs） |

决定性差异在于：安全版本的 `package.json` 的 `exports` 都带 `"require": ".../*.cjs"` 条件，CJS 的 `require()` 能解析到真正的 CJS 文件；崩溃版本则只有 `.mjs`。

这次我没有只靠“能 require 成功”就算了，而是做了两层确定性验证：

1. 逐个断言关键包经 `require.resolve` 命中的实际文件全是 `.cjs`；
2. 扫描 jsdom 完整的 require 依赖图，加载后检查 `require.cache` 里的全部模块，结果 `NO ESM-ONLY PACKAGE LOADED VIA CJS`，从机制上排除了同类问题复发。

包体最终压到 88.5 MB。

#### 坑四：目录命名与历史遗留

中间还有个小插曲。存放运行时修正和空桩的目录，我前后改了好几版名字（我有点强迫症）：`compat` → `shims` → `deps-overrides` → 最后听从建议定成单个单词 `overrides/`：

```text
overrides/
  waline-github-storage.js   # 运行时修正存储适配器
  empty-stub/                # npm overrides 使用的空实现桩包
```

改名时还顺带挖出一个隐患：`package-lock.json` 里累积了 `compat/`、`stubs/`、`deps-overrides/` 各个阶段的陈旧条目，甚至有指向已不存在路径的软链接。这会让 Netlify 的 `npm ci` 直接报错。最后我删掉 lock 和 node_modules，重新生成了一份干净的锁文件。

#### 坑五：GitHub Token 的 404 与 403

代码部署后，发评论写入失败，先出现：

```text
GitHub write failed (404): Not Found
```

我确认仓库路径填写正确。查了一段时间才明白 GitHub 的规则：细粒度 Token（fine-grained PAT）在未授权访问某仓库时，返回的是 404 而不是 403，目的是隐藏仓库是否存在。所以 404 的真实含义是：Token 根本看不到这个仓库。

在 Token 设置页里要这样配：

- **Repository access** 选 `Only select repositories`，即最小权限，勾选你在 `GITHUB_REPO` 里配置的那个数据仓库；
- **Permissions → Repository permissions**：
  - `Contents: Read and write`，写 CSV 必需；
  - `Metadata: Read`，自动带上，不用管。

这里有两个容易出错的地方：

1. 勾选的仓库必须和 `GITHUB_REPO` 里的 `owner/repo` 完全一致。授权 A 仓库、配置填 B 仓库，照样 404；
2. 改完 Token 的仓库范围立即生效，不用重新生成 Token，也不用改 Netlify 环境变量。

改好仓库范围后，404 果然变成了 403：

```text
Resource not accessible by personal access token
```

这反而是好消息：说明 Token 已经能看到仓库了，只是 `Contents` 还是只读。改成 `Read and write`，写入立刻恢复正常。

#### 坑六：CSV 主键始终为空

本来到这里应该结束了，结果又出现了更奇怪的问题：管理员账号登录不上，评论加载也异常。Netlify 日志里反复出现：

```text
Error: payload is required
    at Object.module.exports [as sign] (.../jsonwebtoken/sign.js:141:20)
    at module.exports.postAction (.../@waline/vercel/src/controller/token.js:65:18)
```

但 CSV 文件明明已经写进了 GitHub 仓库。我打开一看，发现了关键：`objectId` 这一列全是空的。

```csv
objectId,user_id,comment,insertedAt,...,nick,...
,,111,Sat Sep 12 2026 ...,...,exyone,...
```

顺着日志一路查下去，我确认这是 `@waline/vercel` 的 GitHub CSV 存储适配器的一个上游 bug，本质是主键字段名不匹配：

- 内存里数据对象的主键叫 `id`，`add()` 写入的是 `{...data, id}`；
- 但 CSV 表头列名叫 `objectId`。fast-csv 是按列名取值的，对象上根本没有 `objectId` 这个键，于是主键列永远写空；
- 读回来时 `select()` 解构的又是 `{ id }`，自然得到 `undefined`。

这一个 bug 正好连锁解释了我看到的所有现象：

1. 评论的 `objectId` 全空，前端无法挂载、无法管理、加载异常；
2. 登录时密码校验其实通过了，但 `token.js:65` 执行 `jwt.sign(undefined)`，抛出 `payload is required`，于是怎么都登不进管理员账号。

> 顺带说一句，日志里那条 `[Deprecated] /.netlify/functions/comment` 只是版本弃用警告，不影响功能，可以忽略。

修复方式是在 `overrides/waline-github-storage.js` 的原型层包裹两个方法，做双向映射：

- `collection()`：读回时把 `objectId → id`；对历史空主键的行自动补一个 id；
- `save()`：写盘前把 `id → objectId`，保证主键正确落列。

我用 mock 的 GitHub 存储跑了完整的读写往返验证，覆盖了全部场景：

1. 历史空主键用户现在能拿到 id，`jwt.sign(payload)` 正常，登录修复；
2. 重写后的 CSV 主键正确落在 `objectId` 列；
3. 新评论写入后返回非空 objectId；
4. 主键补齐后再次读取保持稳定、不会漂移。

部署完成后，只需要触发一次写入，比如在后台对现有评论做个操作，或首次登录管理员账号，历史数据的主键就会自动补齐，之后一切正常。

## 小结

以上就是这次折腾的全过程：从部署体积、ESM 依赖链，到 Token 权限，再到上游 CSV 存储的主键 bug，过程确实曲折。中间还穿插了之前几次评论系统切换和 Chirpy 注入方案的尝试。

最后需要提醒一句：GitHub CSV 存储方案只是我为了方便迁移 Twikoo 评论数据才用的，生产环境还是应该使用正经数据库。也正因为我不用数据库，这个 Starter 把 mathjax、leancloud、sql 等大量依赖都精简掉了，有同样需求的可以参考。

- Starter：<https://github.com/exyone-js/waline-netlify>
- 评论数据存储空间：<https://github.com/exyone-js/waline-comments>（私有仓库，外部不可见）

过程中参考了不少资料，一并列出：

- <https://zoooooone.github.io/posts/waline/>
- <https://aturret.space/zh-CN/posts/Add-Waline-Comment/>
- <https://zerokami.cn/11a00257.html>

折腾完评论系统，博客样式我是真不打算再动了，就用原生的。下篇文章见。

> 备注：之前那篇《静态博客的评论系统选型：Remark42、Twikoo、Giscus 等方案对比》，以及几次评论系统切换的记录，也已经合并到本文中，不再单独维护。
{: .prompt-info }

> 对了，由于 Chirpy 的 `feed.xml` 文件生成的是文章的摘要内容，不能生成全文，因此使用 RSS 阅读器订阅本站的小伙伴可能无法正常浏览文章了。
>
> 至于 `llm.txt`、`atom.xml` 之类的文件，懒得折腾了，就这样吧。（顺便一提，本文的绝大多数遇到的 BUG 都是**豆包 Seed-2.1-Pro**模型修复的，意想不到吧？）
{: .prompt-tip }