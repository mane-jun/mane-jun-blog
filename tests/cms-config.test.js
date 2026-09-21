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
      summary: '{{title}} — {{date}} — {{categories}} — draft={{draft}}',
    });
    expect(posts.fields.map(({ name }) => name)).toEqual([
      'title', 'date', 'draft', 'categories', 'tags', 'summary', 'body',
    ]);
    expect(posts.fields.find(({ name }) => name === 'draft').default).toBe(true);
  });
});
