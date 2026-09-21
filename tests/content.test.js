import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const root = new URL('../', import.meta.url);
const postsDir = new URL('content/posts/', root);
const postDirs = readdirSync(postsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

describe('post content', () => {
  // Decap CMS deletes only index.md, leaving the post's images behind and still published by Hugo.
  it('has no post folder without index.md', () => {
    const orphaned = postDirs.filter((dir) => !existsSync(new URL(`${dir}/index.md`, postsDir)));
    expect(orphaned).toEqual([]);
  });

  // Decap CMS parses "...Z" dates as Date objects but "+09:00" dates as strings, and cannot sort a mix of both.
  it('writes every post date in KST offset form', () => {
    const invalid = postDirs
      .filter((dir) => existsSync(new URL(`${dir}/index.md`, postsDir)))
      .map((dir) => {
        const source = readFileSync(new URL(`${dir}/index.md`, postsDir), 'utf8');
        const date = source.match(/^date:\s*["']?([^"'\r\n]*)/mu)?.[1];
        return { dir, date };
      })
      .filter(({ date }) => !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/u.test(date ?? ''));
    expect(invalid).toEqual([]);
  });

  it('makes Front Matter CMS write dates in KST offset form', () => {
    const settings = JSON.parse(readFileSync(new URL('frontmatter.json', root), 'utf8'));
    expect(settings['frontMatter.taxonomy.dateFormat']).toBe("yyyy-MM-dd'T'HH:mm:ssXXX");
    expect(settings['frontMatter.global.timezone']).toBe('Asia/Seoul');
  });
});
