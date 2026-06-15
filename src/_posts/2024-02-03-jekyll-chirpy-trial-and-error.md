---
title: Jekyll 与 Chirpy 主题：一位新手博客的试错史
date: 2024-02-03T00:00:00.000Z
categories:
  - 技术笔记
tags:
  - 博客
  - 教程
excerpt: 事实上，我最初使用的 Jekyll 主题是 Academic Pages。（搭建过程中参考了这篇文章，不过这位大佬似乎有两个 GitHub 账号，今年年初我曾问过他，他的项目大多在 wanng-ide 中，而 wangjunjie-ai 则是用来搭建 Pages 的。）
---

事实上，我最初使用的 Jekyll 主题是 [Academic Pages](https://wangjunjie-ai.github.io/posts/2025/06/academic-pages-guide/)。（搭建过程中参考了这篇文章，不过这位大佬似乎有两个 GitHub 账号，今年年初我曾问过他，他的项目大多在 [wanng-ide](https://github.com/wanng-ide) 中，而 wangjunjie-ai 则是用来搭建 Pages 的。）

为何选择这个主题？因为它预设的配置相当全面，我只管写文章便是。毕竟这是一个"学术"个人主页，设计初衷便是减少折腾、直奔主题。

然而，我不过是个普通博主。为了将这个学术博客改造成普通博客，我费了不少功夫，最终还是放弃了——这个主题的限制实在太多。

后来很长一段时间，我离开了 GitHub，自然也不再使用 GitHub Pages，转而投向动态博客的怀抱（用 Halo 搭建）。

这几天突然萌生了回归静态博客、做一个国际博客的念头，于是重拾 Jekyll。主题呢？半年前寻觅 GitHub Pages 模板时，我就注意到了 Chirpy——简洁干净的三栏式设计，深得我心。于是今年便直接采用了。去年没用，是因为当时想找的是开箱即用的模板。

---

用 Chirpy 碰到的第一颗钉子，是 URL 生成。这是一个国际博客，文章有多个语言版本，需要在 URL 中通过语言标签来区分。有些双语文章使用的还不是标准的语言标签，比如这篇文章的 `lang` 标签就是 `en-zh`。

怎么办？我尝试更改 Jekyll 的 `_config.yml` 文件，却导致生成失败。我尝试安装 Gem 包里的 Jekyll 多语言 URL 支持插件，但版本都太老了。于是只好自己写了个插件出来：

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

我在网上查到的许多覆盖方案都不适用于 Gem 包里的主题。最后的解决方案是在 `_includes/head.html` 里添加以下代码：

```html
<!-- Custom Font -->
<link href="https://hanzi.itedev.com/fonts/Source+Han+Sans+VF/result.css" rel="stylesheet">
<style>
  .content {
    font-family: 'Source Han Sans VF', 'Microsoft YaHei', 'PingFang SC', 'MiSans', sans-serif !important;
  }
</style>
```

[hanzi 千字网 CDN](https://hanzi.itedev.com) 是我自己构建的字体 CDN，大家可以去网站首页或从我的 Codeberg 仓库了解这个项目。

---

第三个问题是隐藏文章。最初 MiniMax 告诉我直接在 `tags` 里添加 `hidden` 就行，然后我发现没用。我的想法是开发一个插件，但无论怎么修改 Ruby 代码，最后的结果永远是无法从直链访问文章——文章被直接删除了，而非隐藏。

后来我发现，实际上 Chirpy 内置了在首页隐藏文章的功能。不是在 `tags` 里添加，而是在 front matter 中添加 `hidden: true` 就行。害得我绕了个大弯——根本不用改配置，Chirpy 本来就有这个功能。
