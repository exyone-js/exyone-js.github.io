---
title: 分享一下最近很火爆的超长蛋挞，本站图床也正式上线啦
date: 2026-10-04
categories: [闲情杂记]
tags: [生活, 美食]
---

我一直都希望能给博客添加一个图床，但可惜先前一直没有找到合适的方案，最后决定先用家用服务器跑起来再说：清羽飞扬美化版的[兰空图床](https://github.com/willow-god/LSKY-Pro-LiuShen) + **Cloudflare Tunnel 隧道** + 家用服务器。先放几张效果图，由于使用的是 Cloudflare 的内网穿透方案，部分地区的加载速度可能会非常慢：

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

（超长蛋挞，吃着跟普通蛋挞没有任何区别，主要还是图个新鲜。）

## 为什么选 Cloudflare Tunnel

选择 Cloudflare Tunnel，主要是出于现实条件：家里没有公网 IP，也不想去操心 VPS 的定期续费（麻烦不说，还要花钱，而家用服务器的话只有电费的开销）。`cloudflared` 从家里主动连到 Cloudflare，外部访问通过域名走 Cloudflare 的 HTTPS。对家用宽带来说，这套方案省去了 DDNS 的整层麻烦，也比直接把端口暴露到公网安心得多。有得必有失，速度是内网穿透方案无法逾越的天堑。

还有一个已知的限制：Cloudflare Free Tunnel 对单次请求有最高 100MB 的上限，大文件容易超时，日常图片控制在 20MB 以内比较稳妥。当然，图像上传到图床时一般都会压缩画质并转化成 `.webp` 格式，问题不大，我个人不建议在 Web 中使用 .PNG 或 .JPG 格式的图像，.WEBP 格式现在已经被所有主流浏览器支持了，没有必要为了兼容性而舍弃更小的图像体积和更快的加载速度。

## 为什么我选择了兰空图床，而不是 EasyImage 2.0

最初考虑的图床软件是 **EasyImage 2.0**。它部署轻、无数据库，解压配好 PHP 环境就能跑，Docker 镜像也小。如果只想快速搭一个“能传图、能出链接”的图床，它可能是最省事的选择。它还有一个被很多人提到的优点：图片访问路径不依赖数据库，迁移时把文件直接搬走就行，天然适合怕麻烦的人。

但我的顾虑也在这里。无数据库意味着图片元数据没有结构化的存放之处，图片一多，列表加载、检索、批量管理都会逐渐吃力。兰空图床有数据库，相册、用户、API、存储策略、角色组权限这些都能正经管理起来，后期调整的余地大得多。

## 踩坑：兰空图床与 PHP 8.3 的已知兼容性问题

这是个典型的“版本陷阱”。虽然兰空官方文档写着 PHP >= 8.0.2，后来更新到 >= 8.2，看着 8.3 完全兼容，但实际一跑 php artisan 就直接崩了：

```bash
Carbon\Carbon::setLastErrors(): Argument #1 ($lastErrors) must be of type array, false given
```

这是 Carbon 在 PHP 8.2+ 环境下的老毛病。PHP 8.3 调整了部分内部函数的返回值逻辑，导致旧版 Carbon 解析时间时拿到的是 false 而非预期的数组，类型检查直接报错。这时候 Laravel 甚至还没完成引导，程序就挂了。

更头疼的是依赖冲突。兰空基于 Laravel 9，锁定了 `laravel/octane v1.x`。而 `octane v1.x` 依赖的 `laminas-diactoros 2.x` 在 Composer 定义里明确写了不支持 PHP 8.3。这就成了个死结：

想修 Carbon 的 bug？得升级依赖。
想升级 `octane`？v2.x 支持 PHP 8.3，但它强制要求 Laravel 10.10.1+，跟项目里的 Laravel 9 直接冲突。
用 `--ignore-platform-req=php`？没用。因为阻碍安装的不仅仅是 PHP 版本检查，更是 `octane` 对 `laravel/framework ^9.0` 的版本约束，Composer 根本解析不通。

最后只能来点“暴力”解法：

删掉 `composer.lock`。
确保 `composer.json` 里 `laravel/octane` 的约束是 `^1.0`。
运行 `composer update -W --ignore-platform-req=php`。

这条命令会强行忽略平台版本检查，并重新解析整个依赖树。最终，`laravel/octane` 会定格在 ‌v1.5.6‌，`laminas-diactoros` 升到 ‌2.26.0‌，Carbon 也会拉到兼容的 ‌2.73.0‌。等 `php artisan package:discover` 跑完，图床就能正常启动了。
