---
title: 静态博客也能有互动？来看看这些好用的评论系统吧！
date: 2026-06-26T00:00:00.000Z
categories:
  - 项目分享
tags:
  - 部署
  - 博客
  - 开源
excerpt: 静态博客本身没有后端，但评论互动又不能少。本站已全面迁移至 Remark42——一个功能完善的自托管评论系统。这篇文章聊聊我为什么切换、Remark42 的使用体验，以及还有哪些备选方案值得关注。
---

## 本站用的评论系统

之前使用的是 Twikoo 和 Giscus 这两个评论系统——Twikoo 负责文章评论，Giscus 负责投票和分类。它们各司其职，但需要同时维护两个后端。

**现在迁移到了 Remark42**。

- **匿名 + 社交登录两不误**：读者不注册也能留评论，甚至连邮箱都不用填，只填昵称就可以，想绑 GitHub、Google 账号的 OAuth2 认证也可以。
- **功能没短板**：投票、排序、Markdown、传图、邮件通知、RSS——全内置，功能齐全无短板。
- **管理面板好用**：审核、删评、屏蔽、导出，全在 Web 界面操作，不用碰数据库（这点和 Twikoo 的设计是一致的）。
- **数据在自己手里**：单二进制，BoltDB 存在本地，备份非常简单，同时也有自动备份的功能。

---

## 「Remark42」功能全面的一体化方案

这是一款使用 Go 开发的软件，BoltDB 内嵌存储，不需要额外跑数据库。**一个二进制搞定全部**。

部署很简单，在 Release 页面下载与系统对应的二进制文件然后运行。我的配置方案是使用 systemd 添加一个服务，通过 Cloudflare Tunnel 暴露到公网：

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

设计上有许多亮点，比如：

**匿名与认证双模式**——读者不登录也能留评，也可以绑 GitHub、Google、Facebook。管理员还能开邮箱验证。

**管理后台**——页面加 `?remark42_admin=1` 调出登录口，进去后审核、删评、屏蔽、导出 JSON，都在 Web 里完成。

**邮件通知与 RSS**——新评论发邮件通知管理员；读者也能订阅某篇帖子的 RSS，有新回复时推送。

**评论排序与投票**——读者可以按时间或热度排序，也能点赞/点踩。

**主题与国际化**——亮色/深色都支持，`REMARK42.changeTheme()` 动态切换。界面有 20 多种语言，包括简体中文。

数据存储默认使用 BoltDB，一个文件存在 `/opt/remark42/var/` 下。备份 = 复制这个文件。迁移也很简单。

**优点**：功能全（匿名+社交登录、投票、排序、Markdown、传图、邮件、RSS、后台）、单二进制、数据可控、社区活跃。

**缺点**：部署需要一台 VPS （内网穿透方案也行，但仍然需要一个常年运行的服务器）、没云托管、界面偏功能型。

---

## 「Twikoo」低门槛的匿名评论

国人开发的开源评论系统，文档全中文，配置友好。

很多人以为 Twikoo 必须搭 MongoDB，其实裸机或 Docker 部署时默认用的是 **LokiJS**——数据存 JSON 文件，启动时全部加载到内存，读写都在内存完成，定期写回磁盘。

评论量不大的话优势很明显：零外部依赖、延迟极低、全量备份只需要复制几个 JSON 文件。

短板是 LokiJS 不适合大数据集或多实例并发写——但个人博客几百条评论、单节点低频读写，LokiJS 比 MongoDB 轻得多。

MongoDB 适合评论量大、访问频繁或多节点共享的场景。对多数个人博客，MongoDB 的优势发挥不出来，反而多了个要维护的数据库。

**优点**：匿名门槛低、界面简洁、Akismet和腾讯云反垃圾插件、邮件通知、表情和 Markdown、管理员后台。

**缺点**：没投票/问答/分类，功能单薄；得自己维护后端（虽然部署简单）。

---

## 「Giscus」GitHub 驱动的深度互动

数据存在 GitHub Discussions 里，前端嵌入一个组件。**前提是读者得有 GitHub 账号**。

受众都是开发者的话体验很不错——GitHub Discussions 的全套功能都有：点赞/点踩、标记答案、分类留言。

**优点**：免费、无广告、数据在 GitHub 上几乎不会丢、功能多（表情反应、投票、问答、分类）、自动暗色模式、加载快。

**缺点**：强制 GitHub 登录、非技术读者直接劝退；得用公开仓库存数据；国内 GitHub 访问时好时坏。

---

## 其他值得了解的

**Waline** —— Twikoo 的替代品，同样支持匿名，后端选择更多（LeanCloud、腾讯云、Deta、自建）。多了 PV 统计、多语言、更多通知渠道（邮件、Telegram、微信）。想要比 Twikoo 更强的管理能力，Waline 是更好的选择。

**Disqus** —— 接入最简单，几行代码就行。但免费版广告越来越恶心，国内基本不可用。

**Gitalk / Utterances** —— 和 Giscus 思路一样，区别是用 Issues 存评论（Utterances 也是 Issues，Giscus 用 Discussions）。Giscus 功能更现代，新项目建议选用 Giscus。

**Cusdis** —— 轻量、注重隐私，后端可自托管，前端精简，支持匿名评论。缺点是社区还在早期，更新慢。
