---
title: OneDev CI/CD 配置指南：从报错到成功部署，深入浅出 Actions 环境
date: 2026-05-03T00:00:00.000Z
categories:
  - 技术笔记
tags:
  - OneDev
  - 教程
  - 软件开发
image: https://onedev.io/_next/image?url=%2Fimg%2Ffeatures%2Fcode-annotation.png&w=1080&q=75
---

原先博客的 CI/CD 基于 GitHub Actions，职责很单一：构建静态站点，然后发布到 GitHub Pages。只有这一个发布目标时，这套方案足够稳定，配置也简单。问题出现在目标扩展之后：除了 GitHub Pages，还需要同步发布到 Cloudflare Pages、Netlify、Codeberg Pages 等平台，并把源码备份到 Codeberg 等仓库。任务一多，继续把所有逻辑塞在 GitHub Actions 里，耦合和调度上的限制就暴露出来。

促使我迁移到 OneDev 的原因主要有两个。一是避免流程绑定在单一平台上：密钥、部署逻辑、触发条件都集中在 GitHub 一家，一旦平台侧出问题或账号受限，整条发布链路就会中断。二是需要更细的任务编排：构建产物只生成一次，部署任务可以并行或串行，备份与发布解耦，这些在自建 CI 里更容易控制。

具体目标是：每次提交代码后，自动构建并同步发布到 Cloudflare Pages、Netlify、Codeberg Pages 等平台；同时把源码备份到 Codeberg 等代码托管仓库。各平台的 Pages 托管和仓库备份方法大同小异，文中以 Codeberg 为示例，其它类似平台可自行举一反三。

目标本身并不复杂，但 OneDev 的配置模型与 GitHub Actions 差异较大，实际配置中还是遇到了不少问题。这篇文章不按时间顺序逐条罗列，而是按“现象—原因—解决”拆开说明，并补充两者在配置模型、执行环境和 Checkout 行为上的关键差异。如果你也在折腾 OneDev，希望这份记录能帮你少走一些弯路。

## 先理解差异：OneDev 不是 GitHub Actions 的翻版

在进入具体配置之前，有必要先理解两者在架构上的本质区别。后面的很多问题，其实都源于这些差异。

**配置模型不同。** GitHub Actions 的 workflow 是相对扁平的 YAML 结构，`on`、`jobs`、`steps` 各层职责清晰，`run:` 直接写命令。OneDev 的 YAML 则直接映射成 Java 对象树——每一层缩进对应一个对象的嵌套关系。`CommandStep` 这个 Java 类里没有 `commands` 字段，它有的是 `interpreter` 字段，真正的命令字符串属于解释器对象。这就是为什么 `commands` 不能放在步骤顶层，必须嵌在 `interpreter` 下面。

**执行环境分离。** GitHub Actions 的 runner 由 GitHub 托管或自建，开箱即用。OneDev 的构建任务和执行器是分开的：构建规范只描述“要做什么”，真正干活需要一个已注册的 Job Executor。服务器安装好之后，默认并没有可用的执行器，需要手动配置。

**Checkout 行为不同。** GitHub Actions 的绝大多数 workflow 会显式加一个 checkout action 来拉代码。OneDev 完全由你编排步骤，不会替你假设“第一步肯定是拉代码”。灵活是灵活，但新手很容易漏掉这一步。

理解这三点差异，后面的配置就顺了。

## 配置中的问题与解决

### 1. CommandStep 的 commands 属于 interpreter

最先暴露的是 `CommandStep` 的字段层级问题。刚开始写 `CommandStep` 时，我是这样写的，结果 OneDev 直接报错：`Unable to find property 'commands' on class...`。

```yaml
- type: CommandStep
  name: build
  commands: |
    npm run build
```

这个报错乍一看有点反直觉：`commands` 明明写了，为什么说找不到？查了 OneDev 的源码结构才明白，`BuildSpec` 是 CI 配置的根容器，它下面的 `Job` 包含 `Step` 列表，而 `CommandStep` 执行命令时依赖 `Interpreter` 对象来翻译脚本。所以 `commands` 属于 `interpreter` 对象，不在 `CommandStep` 顶层。

改成这样才通过：

```yaml
- type: CommandStep
  name: build
  interpreter:
    type: DefaultInterpreter
    commands: |
      npm run build
```

YAML 里的每一层缩进，都在对应一个对象的嵌套关系。看到一个属性不知道往哪放，本质上是在问“这个属性属于哪个 Java 对象”。对比 GitHub Actions 里直接写 `run:` 的方式，OneDev 的写法确实繁琐不少，但换来的是更强的结构化约束。OneDev 官方文档中 `CommandStep` 的完整写法也可以作为参考。

### 2. 触发器配置的三个要点

命令步骤通过之后，轮到触发器报错。这部分涉及几个值得注意的配置细节。

**BranchUpdateTrigger 不支持 paths。** 我习惯性地把 GitHub Actions 中按路径过滤的经验带了过来，给 `BranchUpdateTrigger` 加了一个 `paths` 属性，结果报错 `Cannot create property=paths...`。原来这个触发器本身不支持 `paths` 字段，删掉就好。值得一提的是，其他类型的触发器确实支持路径过滤，但 `BranchUpdateTrigger` 就是没有这个能力。

**内联空对象写法不被支持。** 我把 `TagCreateTrigger` 写成了 `- type: TagCreateTrigger {}`，报错 `Can't construct a java object for ...`。这是从一些 YAML 示例里学来的花括号写法，表示一个空对象，但 OneDev 的解析器不认这种内联写法。正确的写法应该去掉花括号：

```yaml
- type: TagCreateTrigger
```

**userMatch 必须显式声明。** 配置格式没问题了，保存构建规范时校验又报错：“验证构建规范时发生错误……不得为空”。查了一下，`BranchUpdateTrigger` 必须加上 `userMatch: anyone` 字段。这个字段用来限制谁可以触发构建，不能为空。填 `anyone` 表示任何人都行，也可以按用户名或组成员做更严格的限制。OneDev 官方文档中的 pipeline 示例同样使用了 `userMatch: anyone` 的写法。

这几个错误的共同点是：语法在通用 YAML 层面是合法的，但不符合 OneDev 的对象映射规则。普通 YAML 解析器不会报错，是 OneDev 在实例化 Java 对象这一步把它拦下来的。从设计意图上看，OneDev 不希望你无意中配出一个“任何人推送都能触发部署”的规则，所以强制显式声明确认，只是报错文案没有直接点出字段名，排查时要多花点时间。

### 3. Job Executor 的选型与配置

校验通过了，真正运行的时候又失败了，报错：`No job executor defined... No applicable executor discovered`。

这次的问题不在配置文件，而在平台环境。OneDev 支持的 Job Executor 类型比较丰富，包括 Kubernetes Executor、Server Docker Executor、Remote Docker Executor 和 Server Shell Executor 等。常见的选择有两种：

- **Docker Executor**：每个任务在容器里跑，环境隔离、开箱即用，是官方推荐的默认方式。适合团队协作和需要环境一致性的场景。
- **Server Shell Executor**：直接在宿主机上执行命令，无需容器开销。官方文档指出，这种方式执行速度更快，但 Job 拥有与 OneDev 进程相同的系统权限，因此需要谨慎选择可执行的任务。

我选择了“裸机构建”，在后台添加了一个 **Server Shell Executor**。选裸机的原因是构建 Jekyll 站点需要 Node.js 和 Ruby 环境，宿主机上本来就有，直接跑比每次拉镜像更快；代价是环境要自己维护，这一点后面马上就会遇到。如果你不想维护宿主机环境，Docker 模式更省心——镜像里环境一致，换机器也好迁移。

### 4. PATH 问题的通用排查思路

刚开始运行的时候，第一步就挂了，报错说 `node` 和 `npm` 都不在 PATH 里。

原因和执行器的运行方式有关。Server Shell Executor 执行命令时用的是非交互式 shell，它加载的环境变量和我平时登录服务器的交互式 shell 不完全一样。我之前是用 aaPanel 装的 Node.js，安装路径只写在了面板自己的环境配置里，没有被系统级的 PATH 加载，Executor 自然找不到。

后来用 apt 重新装了一遍，问题就解决了：

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs
```

装完验证版本，`node -v` 和 `npm -v` 都能正常输出，构建步骤终于跑通了。

这里有个通用教训：**在自建 CI 上排查“命令找不到”，先确认执行命令的那个 shell 到底用了什么 PATH**，不要拿自己登录终端里的环境想当然。同类问题后面还会再遇到一次。

### 5. 部署阶段：项目名匹配与 npx 调用

构建跑通，开始逐个对接部署目标。部署到 Cloudflare Pages 时，曾因本地配置的项目名与云端实际项目名不一致，报 `Project not found`。这类问题没有技术深度，改过来即可。跨平台部署时，建议提前把所有平台的项目名、站点名列一张对照表，照着填，能省掉一轮排查。

部署到 Netlify 时，虽然已经全局安装了 `netlify-cli`，但任务里还是报找不到命令。原因和第 4 节类似：全局 npm 包的 bin 目录不一定在 Executor 的 PATH 里。我没有继续折腾 PATH，而是改用 `npx` 调用：`npx netlify-cli ...`。`npx` 会自动查找并执行对应的包，本地有就用本地的，没有就临时下载，省去了预装和配 PATH 的麻烦。

这个思路适用于所有基于 npm 的 CLI 工具。在 CI 环境中，与其花时间配 PATH，不如统一用 `npx` 调用，简单可靠。

### 6. 备份任务必须加 CheckoutStep

部署任务陆续通了，备份任务又挂了。备份到 Codeberg 的时候失败，报错 `fatal: not a git repository`。原因是配置里少了 `CheckoutStep`，导致工作目录里根本没有代码——任务启动时是一个干净空目录，直接执行 `git push` 当然会报这个错。

补上这一步就好了：

```yaml
- !CheckoutStep
  name: Checkout
  condition: SUCCESSFUL
```

这个坑反映出 OneDev 和 GitHub Actions 的一个重要差异：GitHub Actions 的 workflow 通常会自动 checkout 代码，而 OneDev 的步骤完全由你自己编排，不会替你假设“第一步肯定是拉代码”。灵活是灵活，但新手很容易漏掉这一步。OneDev 官方文档中的构建示例也展示了 `CheckoutStep` 的标准写法，可以作为参考模板。

## 最终配置与任务编排

经过这一连串的排查，总算完成了 `.onedev-buildspec.yml` 的配置。文件里包含七个任务：构建、四个平台的部署、两个仓库的备份。

任务编排上有一个刻意设计：**构建产物只生成一次**。每个部署任务启动时都会先检查构建产物是否存在，没有就重新构建，有就直接复用。这样既避免重复劳动，也能保证各平台拿到的是同一份产物，不会出现“Cloudflare 上是旧版、Netlify 上是新版”这种不一致。

OneDev 支持 Job 之间的依赖关系，可以让下游任务复用上游任务的产物。如果不想手动检查产物是否存在，也可以直接配置 `jobDependencies`，让部署任务声明对构建任务的依赖，由 OneDev 自动管理产物传递。

敏感信息都放在 OneDev Secrets 里管理，配置文件里只引用变量名，不写明文。带 Token 的仓库 URL 格式如下：

```
https://username:token@codeberg.org/username/repo.git
```

OneDev 会在执行时把 Secrets 注入进去。Token 只授予对应仓库的必要权限（推送或备份），即使泄露影响也可控。

现在 GitHub Actions 的任务减轻了不少，只负责定时同步和部署 GitHub Pages。OneDev 成了主仓库，GitHub 变成了镜像。

## 值得记住的几件事

整体来看，这次迁移最大的感受是：OneDev 的 YAML 配置确实比 GitHub Actions 复杂得多，因为它底层是基于 Java 对象映射的，语法限制比较严格，很多在别的 CI 里能写的东西在这里会被直接拒绝。

但它也有一个明显的好处：**报错信息会直接显示类名和属性名**，比如 `Unable to find property 'commands' on class...`，基本能直接定位到是哪个对象的哪个字段出了问题。顺着报错里的类名去查 OneDev 的源码或文档，找原因很快。

关于执行环境的选择：

- **裸机构建**速度快、资源占用少，没有容器开销，但 Node.js、Ruby、各种 CLI 都要自己装、自己管 PATH，适合环境相对固定、想压榨构建速度的场景。
- **Docker 模式**更省心，镜像里环境一致，换机器也好迁移，如果不想维护宿主机环境，用它更合适。

值得一提的是，OneDev 的构建规范支持导入复用——可以把公共的 Job、Step 模板和属性定义在一个共享项目中，其他项目通过 `imports` 引用。如果你管理多个项目的 CI/CD，这个功能能省不少重复工作。

现在大功告成：执行一次 `git push`，OneDev 就会自动构建并部署到四个平台，同时备份到两个仓库。冗余度足够了，就算某个平台出问题，也不影响博客的可用性。自建 CI/CD 前期的学习成本确实不低，但流程跑通之后，每一次推送都是全自动的，这笔投入还是值得的。