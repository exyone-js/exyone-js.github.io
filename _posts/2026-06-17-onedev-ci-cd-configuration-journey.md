---
title: OneDev CI/CD 配置踩坑记：从报错到成功部署
date: 2026-06-17T00:00:00.000Z
categories:
  - 技术笔记
tags:
  - OneDev
  - 部署
  - 教程
  - 编程
excerpt: 这篇文章记录了为博客配置 OneDev CI/CD 的完整过程。从最初的 YAML 语法错误，到各种步骤配置问题，再到最终实现多平台自动部署和仓库备份，踩了不少坑。希望这些经验能帮到同样在折腾 OneDev 的朋友。
---

昔余之博客 CI/CD 寄于 GitHub Actions，事简功微，唯构建与部署 GitHub Pages 而已。今欲迁其全务于自建之 OneDev，冀调度之便，一推送而遍布诸平台。志既定：凡一提交，即自动构建，同发於 Cloudflare Pages、Netlify、Codeberg Pages、Git.gay Pages 四境；复以源码备份於 Codeberg、Git.gay 二仓。  

其事似易，行之则坎阱相属。此篇所录，皆亲历之失，以警来者。

## 第一失：CommandStep 之 commands 位阶

初撰 `CommandStep`，其式如下，OneDev 拒之，报曰：“Unable to find property 'commands' on class...”。

```yaml
- type: CommandStep
  name: build
  commands: |
    npm run build
```

检官档方知：`commands` 非居顶层，乃隶於 `interpreter` 之下。改作：

```yaml
- type: CommandStep
  name: build
  interpreter:
    type: DefaultInterpreter
    commands: |
      npm run build
```

较之 GitHub Actions 直书 `run:` 者，繁简迥异矣。

## 第二失：Trigger 之语法乖谬

触发器亦多舛。初设 `BranchUpdateTrigger`，妄加 `paths` 属性，报云：“Cannot create property=paths...”。  
盖此器本无 `paths` 字段，遂删之。

又误书 `TagCreateTrigger` 为：

```yaml
- type: TagCreateTrigger {}
```

报曰：“Can't construct a java object for ...”。  
正写当去其括弧：

```yaml
- type: TagCreateTrigger
```

## 第三失：userMatch 不可阙

配置既通，校验复错：“验证构建规范时发生错误……不得为空”。  
凡 `BranchUpdateTrigger` 必补 `userMatch: anyone`。此字段所以限何人可触发，缺则必报，填 `anyone` 则任人皆可。

## 第四失：Job Executor 未设

校验虽过，运行又败。报云：“No job executor defined... No applicable executor discovered”。  

盖 OneDev 需预置执行器方可运务。余择“裸机构建”（不假 Docker），遂於后台增 **Server Shell Executor**，配毕方得行。

## 第五失：Node.js 隐遁

始运之际，首步即坠。报云 `node`、`npm` 皆不在 PATH 中。  
缘旧以 aaPanel 装之，路径未载。遂重以 apt 安之：

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs
```

验之，版本皆出，乃复常。

## 第六失：Cloudflare 名实不符

部署至 Cloudflare Pages，报“Project not found”。  
余所用项目名曰 `exyone-blog`，而云端实名乃 `exyone`。更名乃通。

## 第七失：备份无 Git 之基

备份至 Codeberg 又败，报“fatal: not a git repository”。  
因缺 `CheckoutStep`，工目中空无一物。补之，始得代码。

## 第八失：Netlify 命令难寻

至 Netlify 部署，虽预装 `netlify-cli`，仍报找不到命令。  
盖全局包未必在 PATH 中。改以 `npx` 调用，`npx` 自取所需，免预装之烦，遂成。

## 终局之构

历诸险，终成 `.onedev-buildspec.yml`。含七务：构建、四端部署、二处备份。每务先验产物存否，无则构建，有则复用，以免重复，且保各端一致。

机密之事，皆纳於 OneDev Secrets 中。带 Token 之 URL 式如下：

```
https://username:token@codeberg.org/username/repo.git
```

GitHub Actions 之责遂减，唯定时同步、布 GitHub Pages 而已。由是 OneDev 为主仓，GitHub 为从。

综观此次迁务，OneDev 之 YAML 远繁於 GitHub Actions，盖其本於 Java 对象映射，规制甚严。然其报错所示类名、属性名，皆直指病灶，循此索解，立可得愈，此亦一大获也。

裸机构建，速快而耗省，然须自理环境；若厌其琐，用 Docker 模式可省心力。

今既告成：一 `git push`，OneDev 即构建并布於四平台，备份於二仓。冗余既足，纵一平台倾圮，亦可无忧矣。