---
title: 诗集
permalink: /poems/
icon: fas fa-scroll
order: 4
---

{% include lang.html %}

{% assign df_strftime_m = site.data.locales[lang].df.archives.strftime | default: '/ %m' %}
{% assign df_dayjs_m = site.data.locales[lang].df.archives.dayjs | default: '/ MM' %}

<!--
  Keep consistent with /archives/: The theme applies all timeline styles under the `#archives` scope
  (see _sass/pages/_archives.scss), here we directly reuse this hook to avoid copying the styles.
-->
<div id="archives" class="pl-xl-3">
  {% assign poems = site.poems | sort: 'date' | reverse %}
  {% for poem in poems %}
    {% assign cur_year = poem.date | date: '%Y' %}

    {% if cur_year != last_year %}
      {% unless forloop.first %}</ul>{% endunless %}

      <time class="year lead d-block">{{ cur_year }}</time>
      {{ '<ul class="list-unstyled">' }}

      {% assign last_year = cur_year %}
    {% endif %}

    <li>
      {% assign ts = poem.date | date: '%s' %}
      <span class="date day" data-ts="{{ ts }}" data-df="DD">{{ poem.date | date: '%d' }}</span>
      <span class="date month small text-muted ms-1" data-ts="{{ ts }}" data-df="{{ df_dayjs_m }}">
        {{ poem.date | date: df_strftime_m }}
      </span>
      <a href="{{ poem.url | relative_url }}">{{ poem.title }}</a>
      <span class="brief">{{ poem.content | strip_html | strip_newlines | truncate: 45 }}</span>
    </li>

    {% if forloop.last %}</ul>{% endif %}
  {% endfor %}
</div>
