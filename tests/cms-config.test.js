import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

// Body of a template file without its front matter, with line endings normalized.
const templateBody = async (path) => (await read(path))
  .replace(/^﻿/u, '')
  .replace(/\r\n/gu, '\n')
  .replace(/^---\n[\s\S]*?\n---\n/u, '')
  .trim();

describe('Decap CMS configuration', () => {
  it('pins the CMS script and exposes the Hugo post collection', async () => {
    const html = await read('static/admin/index.html');
    const config = parse(await read('static/admin/config.yml'));
    const posts = config.collections.find(({ name }) => name === 'posts');

    expect(html).toContain('decap-cms@3.15.1/dist/decap-cms.js');
    expect(config.backend).toMatchObject({
      name: 'github',
      repo: 'mane-jun/mane-jun-blog',
      branch: 'main',
      auth_endpoint: 'auth',
      auth_scope: 'public_repo',
    });
    expect(config.backend.base_url).toMatch(/^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev$/u);
    expect(config.slug).toEqual({
      encoding: 'unicode',
      clean_accents: false,
      sanitize_replacement: '-',
    });
    expect(posts).toMatchObject({
      folder: 'content/posts',
      create: true,
      path: '{{slug}}/index',
      slug: '{{year}}-{{month}}-{{day}}-{{slug}}',
      media_folder: '',
      public_folder: '',
    });
    // Decap has no list join filter, so tags are read by index and prefixed only when present.
    expect(posts.summary).toBe(
      "{{draft | ternary('[초안]', '[게시됨]')}} {{title}} · {{date | date('YYYY-MM-DD')}}"
      + "{{fields.tags.0 | ternary(' · #', '')}}{{fields.tags.0}}"
      + "{{fields.tags.1 | ternary(' #', '')}}{{fields.tags.1}}"
      + "{{fields.tags.2 | ternary(' #', '')}}{{fields.tags.2}}"
      + "{{fields.tags.3 | ternary(' …', '')}}",
    );
    expect(posts.sortable_fields).toContainEqual({ field: 'date', default_sort: 'desc' });
    expect(posts.fields.map(({ name }) => name)).toEqual([
      'title', 'date', 'draft', 'categories', 'tags', 'series', 'summary', 'body',
    ]);
    expect(posts.fields.find(({ name }) => name === 'draft').default).toBe(true);
  });

  it.each([
    ['daily', '일간회고', '일간회고_양식.md'],
    ['weekly', '주간회고', '주간회고_양식.md'],
    ['monthly', '월간회고', '월간회고_양식.md'],
  ])('offers a %s retrospective collection prefilled from its template', async (name, tag, templatePath) => {
    const config = parse(await read('static/admin/config.yml'));
    const posts = config.collections.find((collection) => collection.name === 'posts');
    const retro = config.collections.find((collection) => collection.name === name);
    const field = (fieldName) => retro.fields.find((candidate) => candidate.name === fieldName);
    const schema = ({ default: _default, ...rest }) => rest;

    expect(retro).toMatchObject({
      label: tag,
      folder: posts.folder,
      create: true,
      path: posts.path,
      slug: '{{slug}}',
      media_folder: posts.media_folder,
      public_folder: posts.public_folder,
      summary: posts.summary,
      sortable_fields: posts.sortable_fields,
      view_filters: posts.view_filters,
      filter: { field: 'tags', value: tag },
    });
    // Same fields as the post collection except series; only the defaults differ.
    expect(retro.fields.map(schema)).toEqual(posts.fields.filter(({ name: fieldName }) => fieldName !== 'series').map(schema));
    expect(field('draft').default).toBe(true);
    expect(field('categories').default).toEqual(['회고']);
    expect(field('tags').default).toEqual([tag, '일상']);
    expect(field('body').default.trim()).toBe(await templateBody(templatePath));
  });

  it('offers a development post collection prefilled from its template', async () => {
    const config = parse(await read('static/admin/config.yml'));
    const posts = config.collections.find((collection) => collection.name === 'posts');
    const dev = config.collections.find((collection) => collection.name === 'dev');
    const field = (fieldName) => dev.fields.find((candidate) => candidate.name === fieldName);
    const schema = ({ default: _default, ...rest }) => rest;

    expect(dev).toMatchObject({
      label: '개발글',
      folder: posts.folder,
      create: true,
      path: posts.path,
      slug: posts.slug,
      media_folder: posts.media_folder,
      public_folder: posts.public_folder,
      summary: posts.summary,
      sortable_fields: posts.sortable_fields,
      view_filters: posts.view_filters,
      filter: { field: 'categories', value: '개발' },
    });
    expect(dev.fields.map(schema)).toEqual(posts.fields.map(schema));
    expect(field('draft').default).toBe(true);
    expect(field('categories').default).toEqual(['개발']);
    expect(field('body').default.trim()).toBe(await templateBody('개발글_양식.md'));
  });

  it('registers a blog-like preview for every collection after loading the CMS', async () => {
    const html = await read('static/admin/index.html');
    const preview = await read('static/admin/preview.js');
    const config = parse(await read('static/admin/config.yml'));

    expect(html.indexOf('<script src="preview.js"></script>')).toBeGreaterThan(html.indexOf('decap-cms.js'));
    expect(preview).toContain("CMS.registerPreviewStyle(new URL('preview.css', location.href).href);");
    const registered = JSON.parse(preview.match(/(\[[^\]]*\])\.forEach\(\(name\) => CMS\.registerPreviewTemplate/u)[1].replaceAll("'", '"'));
    expect(registered).toEqual(config.collections.map(({ name }) => name));
  });

  it('loads the retrospective title helper on the administrator page', async () => {
    const html = await read('static/admin/index.html');

    expect(html).toMatch(/<script type="module">\s*import \{ installRetroTitle \} from '\.\/retro-title\.js';\s*installRetroTitle\(\);\s*<\/script>/u);
  });

  it('links the administrator to the stats page, which calls the same Worker as the CMS', async () => {
    const html = await read('static/admin/index.html');
    const stats = await read('static/admin/stats.html');
    const config = parse(await read('static/admin/config.yml'));
    const link = html.match(/<a [^>]*id="analytics-link"[^>]*>/u)?.[0];

    expect(link).toBeDefined();
    expect(link).toContain('href="stats.html"');
    expect(stats).toContain(`const STATS_ENDPOINT = '${config.backend.base_url}/stats';`);
    expect(stats).toContain('<meta name="robots" content="noindex, nofollow" />');
    expect(stats).toContain("localStorage.getItem('decap-cms-user')");
  });
});
