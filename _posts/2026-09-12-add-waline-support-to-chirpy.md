---
title: 博客再次搬家：回归 Jekyll，并为 Chirpy 接入 Waline
date: 2026-09-12T00:00:00.000Z
categories:
- 项目分享
tags:
- 博客
- Jekyll
- Waline
excerpt: 记录从 Halo、Eleventy 回到 Jekyll Chirpy，并把评论系统从 Twikoo 迁到 Waline 的过程，以及期间遇到的主要问题。
---

如你所见，这个站点又被我搬回 Jekyll Chirpy 了。

倒不是说 Halo 不好，也不是我之前用 Eleventy 自己搭的博客不行，而是越折腾越觉得：Jekyll 这种成熟、稳定、省心的静态生成器，反而更适合现在的我。自己开发的 Zest SSG 虽然是自己日积月累做出来的，但我当初把它还是设计得过于复杂了，而我现在最需要的就是简洁轻量。

## 为什么又搬回来

起因很简单。我重新把 Netlify 和 Cloudflare Pages 都关联回了 GitHub，这样所有平台又共用一个代码仓库管理。比起自建 Git 实例，GitHub 至少在我不能经常回家的时候也能稳定访问，不用操心服务器还活着没有。

另外一个小插曲：我发现学校微机室居然能直接访问 GitHub，而且不卡。这意味着在微机课上写博客成为可能。于是这个周末我集中时间，把迁移做完了。

这次建站我给自己定了条规矩：尽量少用 AI。也正因如此，我选了 Jekyll + Chirpy，它们都是人工维护的项目。论架构规范和功能全面程度，它们确实比不上我之前用 AI 堆出来的 11ty 博客，但奇怪的是，这种手工味更重的博客反而更吸引我。而且不少朋友跟我吐槽过，说之前那个站风格太复古，欣赏不来。Chirpy 简约大气，虽然我个人对这种单色调审美不太感冒，总觉得看不出重点、费眼睛，但大多数人喜欢这种极简风。

顺带一提，Jekyll 的主题是打包成 gem 使用的，样式不用我自己操心，还能跟着自动升级。对于上了高中、不能经常回家的我来说，这一点相当重要。

## 评论系统：Twikoo → Waline

博客搬完家，评论系统也顺手从 Twikoo 换成了 Waline。这部分过程比较曲折，值得单独写一写。

我用的是 Waline 的 GitHub 仓库存储 CSV 方案，不用数据库，方便我把 Twikoo 的旧评论数据迁过来。服务端部署在 Netlify Functions 上。问题从部署那一刻就开始了。

### 坑一：官方 Starter 没法用

官方文档里 Netlify 部署的介绍已经很古老了，给的 Starter 模板也直接跑不起来。没办法，我只能自己折腾一个：

> Starter 仓库：<https://github.com/exyone-js/waline-netlify>

和官方模板相比，我这个版本直接用了官方为 Vercel 适配的 `@waline/vercel` 包。它是全量的，没有被裁剪过。但这就引出了第一个两难。

### 坑二：函数包体积爆炸

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

**最终策略**：保留 esbuild 打包，享受 tree-shaking；再用 npm `overrides` 把那 6 个用不到的重依赖替换成本地空桩（stub），同时在函数里显式关闭 tex 渲染：

```js
// 从代码层关闭 mathjax/katex，桩包永不加载
markdown: { plugin: { tex: false } }
```

这样处理后，函数包从 **250 MB+ 降到了 94 MB**，干净安装验证通过。

### 坑三：jsdom 的 ESM 连环雷

体积问题解决后，运行时又出错了。这次问题出在 jsdom 的依赖链上，而且是第二次遇到。

上次我把 jsdom 锁到 27，只解决了 `@exodus/bytes` 那条编码嗅探链，没想到还藏着第二条 ESM 隐患链，位于 CSS 解析：

```text
jsdom@27 → cssstyle@5 → @asamuzakjp/css-color@4 (dist/cjs/index.cjs)
                              └─ require("@csstools/css-calc@3")  ← ESM-only，崩溃
```

我本地没有复现，是因为只渲染了简单 markdown、没触发 CSS 路径，加上本地 Node 24.12 和线上 24.19 行为有差异。这是我上次验证不充分。

根治办法是把 jsdom 降到 **26.1.0**，整条 CSS 链换成自带真正 CJS 入口的版本：

| 包 | jsdom 27（崩溃） | jsdom 26（安全） |
| --- | --- | --- |
| cssstyle | 5.x | 4.6.0 |
| @asamuzakjp/css-color | 4.x（CJS 产物里 require ESM） | 3.2.0（`require` 条件 → .cjs） |
| @csstools/css-calc | 3.x（仅 ESM，无 require 入口） | 2.1.4（`require` 条件 → .cjs） |

决定性差异在于：安全版本的 `package.json` 的 `exports` 都带 `"require": ".../*.cjs"` 条件，CJS 的 `require()` 能解析到真正的 CJS 文件；崩溃版本则只有 `.mjs`。

这次我没有只靠“能 require 成功”就算了，而是做了两层确定性验证：

1. 逐个断言关键包经 `require.resolve` 命中的实际文件全是 `.cjs`；
2. 扫描 jsdom 完整的 require 依赖图，加载后检查 `require.cache` 里的全部模块，结果 `NO ESM-ONLY PACKAGE LOADED VIA CJS`，从机制上排除了同类问题复发。

包体最终压到 **88.5 MB**。

### 坑四：目录命名与历史遗留

中间还有个小插曲。存放运行时修正和空桩的目录，我前后改了好几版名字（强迫症犯了 QAQ）：`compat` → `shims` → `deps-overrides` → 最后听从建议定成单个单词 **`overrides/`**：

```text
overrides/
  waline-github-storage.js   # 运行时修正存储适配器
  empty-stub/                # npm overrides 使用的空实现桩包
```

改名时还顺带挖出一个隐患：`package-lock.json` 里累积了 `compat/`、`stubs/`、`deps-overrides/` 各个阶段的陈旧条目，甚至有指向已不存在路径的软链接。这会让 Netlify 的 `npm ci` 直接报错。最后我删掉 lock 和 node_modules，重新生成了一份干净的锁文件。

### 坑五：GitHub Token 的 404 与 403

代码部署后，发评论写入失败，先出现：

```text
GitHub write failed (404): Not Found
```

我确认仓库路径填写正确。查了一段时间才明白 GitHub 的规则：**细粒度 Token（fine-grained PAT）在未授权访问某仓库时，返回的是 404 而不是 403**，目的是隐藏仓库是否存在。所以 404 的真实含义是：Token 根本看不到这个仓库。

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

### 坑六：CSV 主键始终为空

本来到这里应该结束了，结果又出现了更奇怪的问题：管理员账号登录不上，评论加载也异常。Netlify 日志里反复出现：

```text
Error: payload is required
    at Object.module.exports [as sign] (.../jsonwebtoken/sign.js:141:20)
    at module.exports.postAction (.../@waline/vercel/src/controller/token.js:65:18)
```

但 CSV 文件明明已经写进了 GitHub 仓库。我打开一看，发现了关键：**`objectId` 这一列全是空的**。

```csv
objectId,user_id,comment,insertedAt,...,nick,...
,,111,Sat Sep 12 2026 ...,...,exyone,...
```

顺着日志一路查下去，我确认这是 `@waline/vercel` 的 GitHub CSV 存储适配器的一个上游 bug，本质是**主键字段名不匹配**：

- 内存里数据对象的主键叫 `id`，`add()` 写入的是 `{...data, id}`；
- 但 CSV 表头列名叫 `objectId`。fast-csv 是按列名取值的，对象上根本没有 `objectId` 这个键，于是主键列永远写空；
- 读回来时 `select()` 解构的又是 `{ id }`，自然得到 `undefined`。

这一个 bug 正好连锁解释了我看到的所有现象：

1. 评论的 `objectId` 全空，前端无法挂载、无法管理、加载异常；
2. 登录时密码校验其实通过了，但 `token.js:65` 执行 `jwt.sign(undefined)`，抛出 `payload is required`，于是怎么都登不进管理员账号。

> 顺带说一句，日志里那条 `[Deprecated] /.netlify/functions/comment` 只是版本弃用警告，不影响功能，可以忽略。

**修复方式**是在 `overrides/waline-github-storage.js` 的原型层包裹两个方法，做双向映射：

- `collection()`：读回时把 `objectId → id`；对历史空主键的行自动补一个 id；
- `save()`：写盘前把 `id → objectId`，保证主键正确落列。

我用 mock 的 GitHub 存储跑了完整的读写往返验证，覆盖了全部场景：

1. 历史空主键用户现在能拿到 id，`jwt.sign(payload)` 正常，登录修复；
2. 重写后的 CSV 主键正确落在 `objectId` 列；
3. 新评论写入后返回非空 objectId；
4. 主键补齐后再次读取保持稳定、不会漂移。

部署完成后，只需要触发一次写入，比如在后台对现有评论做个操作，或首次登录管理员账号，历史数据的主键就会自动补齐，之后一切正常。

## 小结

以上就是这次折腾的全过程：从部署体积、ESM 依赖链，到 Token 权限，再到上游 CSV 存储的主键 bug，过程确实曲折。

最后需要提醒一句：**GitHub CSV 存储方案只是我为了方便迁移 Twikoo 评论数据才用的，生产环境还是应该使用正经数据库。** 也正因为我不用数据库，这个 Starter 把 mathjax、leancloud、sql 等大量依赖都精简掉了，有同样需求的可以参考。

- Starter：<https://github.com/exyone-js/waline-netlify>
- 评论数据存储空间：<https://github.com/exyone-js/waline-comments>（私有仓库，外部不可见）

过程中参考了不少资料，一并列出：

- <https://zoooooone.github.io/posts/waline/>
- <https://aturret.space/zh-CN/posts/Add-Waline-Comment/>
- <https://zerokami.cn/11a00257.html>


折腾完评论系统，博客样式我是真不打算再动了，就用原生的，摆烂了 🛌 下篇文章见，byebye～

> 对了，由于 Chirpy 的 `feed.xml` 文件生成的是文章的摘要内容，不能生成全文，因此使用 RSS 阅读器订阅本站的小伙伴可能无法正常浏览文章了
>
>至于 `llm.txt`、`atom.xml` 之类的文件，懒得折腾了，就这样吧。（顺便一提，本文的绝大多数遇到的 BUG 都是**豆包 Seed-2.1-Pro**模型修复的，意想不到吧？）
{: .prompt-tip }