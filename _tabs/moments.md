---
title: 瞬间
permalink: /moments/
icon: fas fa-feather-alt
order: 5
---

{% include lang.html %}

{% assign df_strftime_m = site.data.locales[lang].df.archives.strftime | default: '/ %m' %}
{% assign df_dayjs_m = site.data.locales[lang].df.archives.dayjs | default: '/ MM' %}

<p class="text-muted small">细碎的美好，值得被反复提及；流逝的光阴，值得被妥善安放。</p>

{% assign moments = site.moments | sort: 'date' | reverse %}

{% if moments.size == 0 %}
  <p class="text-muted small">No moments have been recorded yet.</p>
{% else %}

  <!--
    Same timeline as /poems and /archives — the theme styles everything under the
    `#archives` scope (see _sass/pages/_archives.scss), so no extra markup is
    needed here. The only addition is `.brief`: a muted one-line preview behind
    each title, shared with /poems/. It is simply the first 45 characters of the
    body, so keep the opening sentence free of Markdown to stay readable.
  -->
  <div id="archives" class="pl-xl-3">
    {% for moment in moments %}
      {% assign cur_year = moment.date | date: '%Y' %}

      {% if cur_year != last_year %}
        {% unless forloop.first %}</ul>{% endunless %}

        <time class="year lead d-block">{{ cur_year }}</time>
        {{ '<ul class="list-unstyled">' }}

        {% assign last_year = cur_year %}
      {% endif %}

      {% assign ts = moment.date | date: '%s' %}

      <li>
        <span class="date day" data-ts="{{ ts }}" data-df="DD">{{ moment.date | date: '%d' }}</span>
        <span class="date month small text-muted ms-1" data-ts="{{ ts }}" data-df="{{ df_dayjs_m }}">
          {{ moment.date | date: df_strftime_m }}
        </span>
        <a href="{{ moment.url | relative_url }}">{{ moment.title }}</a>
        <span class="brief">
          {{ moment.content | strip_html | strip_newlines | truncate: 45 }}{% if moment.mood %} · {{ moment.mood }}{% endif %}{% if moment.location %} · {{ moment.location }}{% endif %}
        </span>
      </li>

      {% if forloop.last %}</ul>{% endif %}
    {% endfor %}
  </div>

{% endif %}
