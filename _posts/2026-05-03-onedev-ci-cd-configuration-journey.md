---
title: OneDev CI/CD 配置踩坑记：从报错到成功部署，深入浅出 Actions 环境
date: 2026-05-03T00:00:00.000Z
categories:
  - 技术笔记
tags:
  - OneDev
  - 教程
  - 软件开发
excerpt: 记录将博客 CI/CD 从 GitHub Actions 迁移到自建 OneDev 的过程。从 YAML 语法到各种步骤配置，再到多平台自动部署和仓库备份，踩了不少坑。希望这些经验能帮到同样在折腾的朋友。
image: https://onedev.io/_next/image?url=%2Fimg%2Ffeatures%2Fcode-annotation.png&w=1080&q=75
---

我之前的博客 CI/CD 用的是 GitHub Actions，只负责构建和部署 GitHub Pages，事情不多。最近打算把全部流程迁移到自建的 OneDev 上，主要是看中它的调度灵活性——希望实现一次推送，就能自动构建并部署到多个平台。

具体目标是：每次提交代码后，自动构建并同步发布到 Cloudflare Pages、Netlify、Codeberg Pages 和 Git.gay Pages；同时把源码备份到 Codeberg 和 Git.gay 两个仓库。

想法很简单，实际操作却踩了不少坑。这篇文章按时间顺序记录我遇到的每个问题：报错信息是什么、原因在哪里、最后怎么解决的。如果你也在折腾 OneDev，希望这份记录能帮你少走一些弯路。

## 背景：为什么从 GitHub Actions 迁走

先说清楚迁移的动机，免得后面看起来像是为了折腾而折腾。

GitHub Actions 本身没什么不好，但我的博客部署目标越来越多：四个 Pages 平台，加上两个代码托管仓库的备份。把这些任务全塞进 GitHub Actions 有两个问题：

1. **流程都绑在 GitHub 上**。所有密钥、所有部署逻辑都在它一家手里，GitHub 出问题或者账号受限，整条链路就断了。
2. **调度方式不够灵活**。我想要的是更细的任务编排：哪些任务可以并行、哪些产物可以复用、备份和部署如何拆分，自建平台在这方面的自由度更大。

OneDev 是一个自建的 Git 托管加 CI/CD 平台，底层跑在 JVM 上。它的构建配置用一个 `.onedev-buildspec.yml` 文件描述，思路和 GitHub Actions 的 workflow 文件类似，但设计哲学差别很大——这也是后面大部分坑的来源。

## 1. CommandStep 的 commands 位置

第一个坑来得很快。刚开始写 `CommandStep` 时，我是这样写的，结果 OneDev 直接报错："Unable to find property 'commands' on class..."。

```yaml
- type: CommandStep
  name: build
  commands: |
    npm run build
```

这个报错乍一看有点反直觉：`commands` 明明写了，为什么说找不到？查了官方文档才知道，`commands` 不能放在步骤的顶层，必须放在 `interpreter` 下面。改成这样才通过：

```yaml
- type: CommandStep
  name: build
  interpreter:
    type: DefaultInterpreter
    commands: |
      npm run build
```

原因要从 OneDev 的配置原理说起。它的 YAML 不是简单的键值配置，而是直接映射成 Java 对象。`CommandStep` 这个对象里没有 `commands` 字段，它有的是一个 `interpreter` 字段；真正的命令字符串属于解释器对象。YAML 里的每一层缩进，都在对应一个对象的嵌套关系。

理解了这一点，后面的配置就顺了：看到一个属性不知道往哪放，本质上是在问"这个属性属于哪个 Java 对象"。对比 GitHub Actions 里直接写 `run:` 的方式，OneDev 的写法确实繁琐不少，但它换来的是更强的结构化约束。

## 2. Trigger 的语法问题

命令步骤通过之后，轮到触发器报错，而且一错就是两个。

一开始配置 `BranchUpdateTrigger` 时，我多加了一个 `paths` 属性，报错说 "Cannot create property=paths..."。原来这个触发器本身不支持 `paths` 字段，删掉就好了。GitHub Actions 的触发器支持按路径过滤，我是习惯性地把那个经验带了过来，但 OneDev 这里没有对应能力。

另外，我还把 `TagCreateTrigger` 错误地写成了：

```yaml
- type: TagCreateTrigger {}
```

报错 "Can't construct a java object for ..."。这是从一些 YAML 示例里学来的花括号写法，表示一个空对象。但 OneDev 的解析器在这里不认这种内联写法。正确的写法应该去掉花括号：

```yaml
- type: TagCreateTrigger
```

这两个错误的共同点是：**语法在通用 YAML 层面是合法的，但不符合 OneDev 的对象映射规则**。普通 YAML 解析器不会报错，是 OneDev 在实例化 Java 对象这一步把它拦下来的。

## 3. userMatch 不能为空

配置格式没问题了，保存构建规范时校验又报错："验证构建规范时发生错误……不得为空"。

这个提示信息量不大，只知道某个字段不能为空。查了一下，原来 `BranchUpdateTrigger` 必须加上 `userMatch: anyone` 字段。这个字段用来限制谁可以触发构建，不能为空。填 `anyone` 表示任何人都行；也可以按用户名或组成员做更严格的限制。

加上之后校验就通过了。从设计意图上看，OneDev 不希望你无意中配出一个"任何人推送都能触发部署"的规则，所以强制显式声明确认，只是报错文案没有直接点出字段名，排查时要多花点时间。

## 4. Job Executor 未配置

校验通过了，真正运行的时候又失败了，报错："No job executor defined... No applicable executor discovered"。

这次的问题不在配置文件，而在平台环境。OneDev 的架构里，**构建任务和执行器是分开的**：构建规范只描述"要做什么"，真正干活需要有一个已注册的 Job Executor 来领取任务。服务器安装好之后，默认并没有可用的执行器。

执行器有两种常见形态：一种是 Docker Executor，每个任务在容器里跑，环境隔离、开箱即用；另一种是 Server Shell Executor，直接在宿主机上执行命令。

我选择了"裸机构建"（不使用 Docker），在后台添加了一个 **Server Shell Executor**，配置好之后任务才顺利执行。选裸机的原因是构建 Jekyll 站点需要 Node.js 和 Ruby 环境，宿主机上本来就有，直接跑比每次拉镜像更快；代价是环境要自己维护，这一点后面马上就会遇到。

## 5. Node.js 不在 PATH 中

刚开始运行的时候，第一步就挂了，报错说 `node` 和 `npm` 都不在 PATH 里。

原因和执行器的运行方式有关。Server Shell Executor 执行命令时用的是非交互式 shell，它加载的环境变量和我平时登录服务器的交互式 shell 不完全一样。我之前是用 aaPanel 装的 Node.js，安装路径只写在了面板自己的环境配置里，没有被系统级的 PATH 加载，Executor 自然找不到。

后来用 apt 重新装了一遍，问题就解决了：

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs
```

装完验证版本，`node -v` 和 `npm -v` 都能正常输出，构建步骤终于跑通了。

这里有个通用教训：**在自建 CI 上排查"命令找不到"，先确认执行命令的那个 shell 到底用了什么 PATH**，不要拿自己登录终端里的环境想当然。

## 6. Cloudflare 项目名不匹配

构建跑通，开始逐个对接部署目标，第一轮部署就出了问题。

部署到 Cloudflare Pages 时，报了 "Project not found" 的错误。我本地配置里写的项目名是 `exyone-blog`，但登录 Cloudflare 后台核对，云端实际创建的项目名是 `exyone`。CLI 是按项目名精确查找的，名字对不上就认为项目不存在。改过来之后就通了。

这类错误没有任何技术深度，纯粹是名称一致性问题，但跨平台部署时很容易犯：每个平台的项目名、站点名都是建项目时随手起的，时间一长自己也记不清。建议在开始写部署脚本之前，先把四个平台的实际项目名列一张对照表，照着填，能省掉一轮排查。

## 7. 备份时缺少 CheckoutStep

部署任务陆续通了，备份任务又挂了。

备份到 Codeberg 的时候失败，报错 "fatal: not a git repository"。原因是配置里少了 `CheckoutStep`，导致工作目录里根本没有代码——任务启动时是一个干净空目录，直接执行 `git push` 当然会报这个错。补上这一步，让任务先把 OneDev 上的仓库检出到工作目录，之后才能正常操作。

这个坑反映出 OneDev 和 GitHub Actions 的一个重要差异：**GitHub Actions 的 workflow 默认就会 checkout 代码（准确说是绝大多数 workflow 都会显式加 checkout action，不加同样没有代码），而 OneDev 的步骤完全由你自己编排，不会替你假设"第一步肯定是拉代码"**。灵活是灵活，但新手很容易漏掉这一步。

## 8. Netlify 命令找不到

最后一个坑在 Netlify。

部署到 Netlify 时，虽然已经全局安装了 `netlify-cli`，但任务里还是报找不到命令。原因和第 5 个坑类似：全局 npm 包的 bin 目录不一定在 Executor 的 PATH 里。全局安装装在了某个用户的环境下，Executor 用另一个身份或另一套 PATH 执行，于是找不到。

我没有继续折腾 PATH，而是改用 `npx` 调用：`npx netlify-cli ...`。`npx` 会自动查找并执行对应的包，本地有就用本地的，没有就临时下载，省去了预装和配 PATH 的麻烦，问题就解决了。

## 最终配置

经过这一连串的坑，总算完成了 `.onedev-buildspec.yml` 的配置。文件里包含七个任务：构建、四个平台的部署、两个仓库的备份。

任务编排上有一个刻意设计：**构建产物只生成一次**。每个部署任务启动时都会先检查构建产物是否存在，没有就重新构建，有就直接复用。这样既避免重复劳动，也能保证各平台拿到的是同一份产物，不会出现"Cloudflare 上是旧版、Netlify 上是新版"这种不一致。

敏感信息都放在 OneDev Secrets 里管理，配置文件里只引用变量名，不写明文。带 Token 的仓库 URL 格式如下：

```
https://username:token@codeberg.org/username/repo.git
```

OneDev 会在执行时把 Secrets 注入进去。Token 只授予对应仓库的必要权限（推送或备份），即使泄露影响也可控。

现在 GitHub Actions 的任务减轻了不少，只负责定时同步和部署 GitHub Pages。OneDev 成了主仓库，GitHub 变成了镜像。

## 几点总结

整体来看，这次迁移最大的感受是：OneDev 的 YAML 配置确实比 GitHub Actions 复杂得多，因为它底层是基于 Java 对象映射的，语法限制比较严格，很多在别的 CI 里能写的东西在这里会被直接拒绝。

但它也有一个明显的好处：**报错信息会直接显示类名和属性名**，比如 "Unable to find property 'commands' on class..."，基本能直接定位到是哪个对象的哪个字段出了问题。顺着报错里的类名去查文档，找原因很快。

关于执行环境的选择：

- **裸机构建**速度快、资源占用少，没有容器开销，但 Node.js、Ruby、各种 CLI 都要自己装、自己管 PATH，适合环境相对固定、想压榨构建速度的场景。
- **Docker 模式**更省心，镜像里环境一致，换机器也好迁移，如果不想维护宿主机环境，用它更合适。

现在大功告成：执行一次 `git push`，OneDev 就会自动构建并部署到四个平台，同时备份到两个仓库。冗余度足够了，就算某个平台出问题，也不影响博客的可用性。自建 CI/CD 前期的学习成本确实不低，但流程跑通之后，每一次推送都是全自动的，这笔投入还是值得的。
