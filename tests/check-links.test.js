import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { extractUrls, findBrokenLinks, targetFile } from '../scripts/check-links.mjs';

const site = 'https://mane-jun.github.io/mane-jun-blog/';
let publicDir;
const write = (path, html) => {
  mkdirSync(join(publicDir, path, '..'), { recursive: true });
  writeFileSync(join(publicDir, path), html);
};

afterEach(() => publicDir && rmSync(publicDir, { recursive: true, force: true }));

describe('link checker', () => {
  it('collects links and images, including lazy-loaded ones, but not URLs shown in code', () => {
    const html = '<a href=/mane-jun-blog/posts/a/>a</a><img class=lazyload data-src="b.webp" data-srcset="s.webp, m.webp 1.5x, l.webp 2x">'
      + '<pre><code>&lt;a href="/not-a-link"&gt;</code></pre>';
    expect(extractUrls(html)).toEqual(['/mane-jun-blog/posts/a/', 'b.webp', 's.webp', 'm.webp', 'l.webp']);
  });

  it('checks only URLs inside the site', () => {
    const page = `${site}about/`;
    expect(targetFile('https://example.com/x', page, site, 'public')).toBeNull();
    expect(targetFile('#top', page, site, 'public')).toBeNull();
    expect(targetFile('mailto:a@b.c', page, site, 'public')).toBeNull();
    expect(targetFile('/other-site/', page, site, 'public')).toBeNull();
    expect(targetFile('../retro/', page, site, 'public')).toBe(join('public', 'retro', 'index.html'));
    expect(targetFile('/mane-jun-blog/posts/%EC%9D%BC/?x=1#y', page, site, 'public')).toBe(join('public', 'posts', '일', 'index.html'));
  });

  it('reports links whose target is missing from the built site', () => {
    publicDir = mkdtempSync(join(tmpdir(), 'links-'));
    write('index.html', '<a href="about/">about</a><a href="posts/gone/">gone</a>');
    write('about/index.html', '<img src="../images/a.png"><img src="missing.png"><a href="/mane-jun-blog/about">no slash</a>');
    write('images/a.png', 'png');

    expect(findBrokenLinks(publicDir, site)).toEqual([
      { page: 'about/index.html', url: 'missing.png' },
      { page: 'index.html', url: 'posts/gone/' },
    ]);
  });
});
