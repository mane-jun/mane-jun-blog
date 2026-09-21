import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

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
      'title', 'date', 'draft', 'categories', 'tags', 'summary', 'body',
    ]);
    expect(posts.fields.find(({ name }) => name === 'draft').default).toBe(true);
  });
});
