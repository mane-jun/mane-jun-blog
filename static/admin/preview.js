// Makes the Decap CMS preview pane look like a blog post (title, meta, series, body) instead of a plain field list.
// Loaded after decap-cms.js, which provides the CMS, h and createClass globals.
(function () {
  // The preview is an iframe, so the stylesheet needs an absolute URL.
  CMS.registerPreviewStyle(new URL('preview.css', location.href).href);

  const pad = (value) => String(value).padStart(2, '0');
  const formatDate = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value.slice(0, 10);
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };
  const list = (entry, field) => (entry.getIn(['data', field]) || []).toJS?.() ?? [];

  const PostPreview = createClass({
    render() {
      const { entry, widgetFor } = this.props;
      const data = (field) => entry.getIn(['data', field]);
      const categories = list(entry, 'categories');
      const tags = list(entry, 'tags');

      return h('article', { className: 'post' },
        data('draft') ? h('p', { className: 'draft' }, '초안 · 저장해도 사이트에 보이지 않습니다') : null,
        h('h1', { className: 'title' }, data('title') || '제목 없음'),
        h('p', { className: 'meta' },
          formatDate(data('date')),
          categories.length ? ` · 📁 ${categories.join(', ')}` : '',
          tags.length ? ` · ${tags.map((tag) => `#${tag}`).join(' ')}` : ''),
        data('series') ? h('p', { className: 'series' }, `📚 시리즈: ${data('series')}`) : null,
        data('summary') ? h('p', { className: 'summary' }, data('summary')) : null,
        h('div', { className: 'content' }, widgetFor('body')));
    },
  });

  ['posts', 'dev', 'daily', 'weekly', 'monthly'].forEach((name) => CMS.registerPreviewTemplate(name, PostPreview));
  // File collections register previews by file name.
  ['about'].forEach((name) => CMS.registerPreviewTemplate(name, PostPreview));
})();
