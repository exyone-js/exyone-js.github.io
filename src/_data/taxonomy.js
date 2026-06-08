/**
 * Taxonomy Mapping (Data Layer)
 *
 * Maps Chinese category/tag names to URL-safe ASCII slugs.
 * This prevents URL-encoded characters (e.g., %E6%8A%80%E6%9C%AF) in paths.
 * Add new entries as categories or tags are introduced.
 */
module.exports = function () {
  return {
    /* -------------------------------------------------------------- */
    /*  Category Slug Map                                              */
    /* -------------------------------------------------------------- */
    categories: {
      "技术笔记": "tech-notes",
      "笔耕问道": "writing",
      "闲情杂记": "life-snippets",
      "项目分享": "projects",
    },

    /* -------------------------------------------------------------- */
    /*  Tag Slug Map                                                   */
    /* -------------------------------------------------------------- */
    tags: {
      "Eleventy": "eleventy",
      "静态站点": "static-site",
      "教程": "tutorial",
      "读书": "reading",
      "编程": "programming",
      "代码质量": "code-quality",
      "CSS": "css",
      "响应式": "responsive",
      "Docker": "docker",
      "部署": "deployment",
      "主题": "theme",
      "前端": "frontend",
      "生活": "life",
      "徒步": "hiking",
      "自然": "nature",
      "收藏": "fountain-pen-collection",
      "插件": "plugin",
      "效率": "productivity",
      "输入法": "input-method",
      "论坛": "forum",
      "设计": "design",
    },
  };
};
