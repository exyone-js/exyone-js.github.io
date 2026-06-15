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
      "编程": "programming",
      "开源": "open-source",
      "教程": "tutorial",
      "博客": "blog",
      "效率": "productivity",
      "邮件": "email",
      "隐私": "privacy",
      "评测": "review",
      "部署": "deployment",
      "设计": "design",
      "字体": "typography",
      "CSS": "css",
      "前端": "frontend",
      "输入法": "input-method",
      "钢笔": "fountain-pen",
      "历史": "history",
      "游戏": "gaming",
      "Eleventy": "11ty",
      "Docker": "docker",
    },
  };
};
