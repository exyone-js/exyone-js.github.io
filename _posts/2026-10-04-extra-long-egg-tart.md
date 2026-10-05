---
title: 分享一下最近很火爆的超长蛋挞，本站图床也正式上线啦
date: 2026-10-04
categories: [闲情杂记]
tags: [生活, 美食]
---

最近把图床重新折腾了一遍，最终方案是：清羽飞扬美化版的[兰空图床](https://github.com/willow-god/LSKY-Pro-LiuShen) + **Cloudflare Tunnel 隧道** + 家用服务器。

选择 Cloudflare Tunnel，主要是因为它不需要公网 IP，也不用在路由器上做端口映射。`cloudflared` 从家里主动连到 Cloudflare，外部访问通过域名走 Cloudflare 的 HTTPS。对家用宽带来说，这套方案省去了 DDNS 的麻烦，也比直接把端口暴露到公网安心一些。

一开始最担心的就是内网穿透速度会很慢。毕竟家宽上行有限，Cloudflare 免费线路也不是专门为图床加速的。实际用下来，速度不能算惊艳，但还凑活：日常打开后台、上传图片、在文章里加载几张图，基本都在可接受范围内。它肯定比不上大厂对象存储 + CDN 那种丝滑感，但胜在可控。家用服务器也避免了各类对象存储服务的不稳定性，计费规则、限流、审核、服务调整，甚至哪天跑路，都是变量。现在图片数据都放在自己的服务器上，备份和迁移也由自己掌握，用着省心些。

其实感觉还是 **EasyImage 2.0** 更加简单实用、朴实无华。它部署轻、功能直接，适合快速搭一个能用的图床。但总感觉没有数据库的话，以后存的图片多了，列表加载、检索和管理会变得越来越卡顿。兰空图床有数据库，图片元数据、相册、用户、API、存储策略等管理也更完整，长期用起来更稳妥，所以最后还是选择了兰空图床。

放几张效果图：

<table style="width:100%; max-width:900px; margin:0 auto; border-collapse:separate; border-spacing:14px;">
  <tr>
    <td style="width:50%; padding:0; vertical-align:top;">
      <img src="https://img.exyon.ee/i/202610/1791119186-PY6O1EFzWY.webp" alt="照片 1" loading="lazy" decoding="async" style="width:100%; height:auto; display:block; border-radius:14px; box-shadow:0 8px 22px rgba(0,0,0,0.08);">
    </td>
    <td style="width:50%; padding:0; vertical-align:top;">
      <img src="https://img.exyon.ee/i/202610/1791119186-JM6XtJJLnS.webp" alt="照片 2" loading="lazy" decoding="async" style="width:100%; height:auto; display:block; border-radius:14px; box-shadow:0 8px 22px rgba(0,0,0,0.08);">
    </td>
  </tr>
  <tr>
    <td style="width:50%; padding:0; vertical-align:top;">
      <img src="https://img.exyon.ee/i/202610/1791119186-V71pPxMeZa.webp" alt="照片 3" loading="lazy" decoding="async" style="width:100%; height:auto; display:block; border-radius:14px; box-shadow:0 8px 22px rgba(0,0,0,0.08);">
    </td>
    <td style="width:50%; padding:0; vertical-align:top;">
      <img src="https://img.exyon.ee/i/202610/1791119186-iYNaRicphN.webp" alt="照片 4" loading="lazy" decoding="async" style="width:100%; height:auto; display:block; border-radius:14px; box-shadow:0 8px 22px rgba(0,0,0,0.08);">
    </td>
  </tr>
</table>

其实这个超长蛋挞吃着跟普通蛋挞没有任何区别，主要还是图个新鲜吧。