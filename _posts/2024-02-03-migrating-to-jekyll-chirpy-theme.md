---
title: Jekyll 博客主题二三事：深入浅出 Chirpy
date: 2024-02-03T00:00:00.000Z
categories:
  - 技术笔记
tags:
  - 博客
  - 教程
excerpt: 回归静态博客的过程里，我把 Jekyll 主题从学术风的 Academic Pages 换到了 Chirpy，顺便解决了多语言 URL、自定义字体、隐藏文章这几个小问题。本文记录了实际踩过的坑。
---

我最早用的 Jekyll 主题是 [Academic Pages](https://wangjunjie-ai.github.io/posts/2025/06/academic-pages-guide/)。搭建的时候参考过这篇文章，不过这位作者似乎有两个 GitHub 账号——今年年初我向他求证过，他的项目大多放在 [wanng-ide](https://github.com/wanng-ide)，`wangjunjie-ai` 这个号是专门用来搭 Pages 的。

选它的原因很简单：预设配置非常齐全，开箱即用。这本来就是一个学术个人主页模板，定位就是“少折腾，直接写东西”。但我不是搞学术的，为了把它改造成一个普通博客，花了不少功夫，最后还是放弃了——这主题的限制实在太多。

后来有段时间我离开了 GitHub，也不用 GitHub Pages，转向了动态博客（用 Halo 搭的）。最近突然想重新捡起静态博客，做一个面向国际读者的站，于是又把 Jekyll 翻了出来。

主题方面，半年前找模板时就注意到了 Chirpy——简洁干净的三栏布局，正好是我想要的风格。今年就直接用了。去年的迟疑是因为当时想要的是开箱即用的模板。

---

用 Chirpy 遇到的第一个坑是 URL 生成。

这是一个国际博客，文章有多个语言版本，需要在 URL 里用语言标签区分。有些双语文章用的还不是标准的语言标签，比如这篇文章的 `lang` 字段就是 `en-zh`。

我先是去改 `_config.yml`，结果生成失败。又去装 Gem 包里 Jekyll 的多语言 URL 插件，但版本都太老。最后只能自己写一个插件：

```ruby
# _plugins/auto-permalink.rb

Jekyll::Hooks.register :site, :pre_render do |site|
  site.posts.docs.each do |post|
    begin
      lang = post.data['lang'] || 'en'
      lang = lang.to_s.strip
      lang = 'en' if lang.empty?

      slug = post.data['slug']
      if slug.nil? || slug.to_s.strip.empty?
        basename = post.basename_without_ext.to_s
        slug = basename.sub(/^\d{4}-\d{2}-\d{2}-/, '')
      end

      slug = slug.to_s.strip
      slug = slug.gsub(/[^a-zA-Z0-9\-_]/, '-')
      slug = slug.gsub(/-+/, '-')
      slug = slug.gsub(/^-|-$/, '')
      slug = 'untitled' if slug.empty?

      permalink = "/posts/#{lang}/#{slug}/"
      post.data['permalink'] = permalink

    rescue => e
      Jekyll.logger.warn "Auto-permalink:", "Error processing post: #{e.message}"
      post.data['permalink'] = "/posts/untitled/"
    end
  end
end
```

URL 的问题解决了，第二个问题是字体。

网上查到的大多数覆盖方案都不适用于 Gem 包里的主题。折腾了一圈，最后的解决办法是在 `_includes/head.html` 里加上：

```html
<!-- Custom Font -->
<link href="https://hanzi.itedev.com/fonts/Source+Han+Sans+VF/result.css" rel="stylesheet">
<style>
  .content {
    font-family: 'Source Han Sans VF', 'Microsoft YaHei', 'PingFang SC', 'MiSans', sans-serif !important;
  }
</style>
```

[hanzi 千字网 CDN](https://hanzi.itedev.com) 是我自己搭的字体 CDN，欢迎去网站首页或我的 Codeberg 仓库看看。

---

第三个问题是隐藏文章。

一开始 MiniMax 告诉我直接在 `tags` 里加 `hidden` 就行，结果发现没用。我想过写个插件，但无论怎么改 Ruby 代码，最后效果都是从直链彻底打不开——文章被直接删掉了，而不是隐藏。

后来我翻文档才发现，Chirpy 其实内置了在首页隐藏文章的功能：不是改 `tags`，而是在 front matter 里加 `hidden: true`。绕了一大圈，其实根本不用动配置，主题本身就支持。
