import { describe, expect, it } from 'vitest';
import { duePostsMissing, sitemapPaths } from '../scripts/scheduled-posts.mjs';

const base = '/mane-jun-blog/';
const now = new Date('2026-09-22T01:00:00Z'); // 10:00 KST

describe('scheduled publishing', () => {
  it('reads decoded, lowercased paths from the sitemap', () => {
    const xml = '<urlset><url><loc>https://mane-jun.github.io/mane-jun-blog/posts/2026-09-21-%EC%9D%BC%EA%B0%84%ED%9A%8C%EA%B3%A0/</loc></url>'
      + '<url><loc>https://mane-jun.github.io/mane-jun-blog/posts/mixed-case_name/</loc></url></urlset>';
    expect(sitemapPaths(xml)).toEqual(['/mane-jun-blog/posts/2026-09-21-일간회고/', '/mane-jun-blog/posts/mixed-case_name/']);
  });

  it('finds published posts whose date has passed but are not live yet', () => {
    const posts = [
      { folder: '2026-09-22-예약-글', date: '2026-09-22T09:00:00+09:00', draft: false }, // due an hour ago, not live
      { folder: '2026-09-22-초안', date: '2026-09-22T09:00:00+09:00', draft: true }, // draft stays hidden
      { folder: '2026-09-23-내일-글', date: '2026-09-23T09:00:00+09:00', draft: false }, // still in the future
      { folder: 'Mixed-Case_Name', date: '2026-09-21T09:00:00+09:00', draft: false }, // live (Hugo lowercases paths)
      { folder: 'old-post', date: '2026-07-01T09:00:00+09:00', draft: false }, // outside the lookback window
    ];
    const live = ['/mane-jun-blog/posts/mixed-case_name/'];

    expect(duePostsMissing(posts, live, base, now).map(({ folder }) => folder)).toEqual(['2026-09-22-예약-글']);
  });

  it('has nothing to do once every due post is live', () => {
    const posts = [{ folder: '2026-09-22-예약-글', date: '2026-09-22T09:00:00+09:00', draft: false }];
    expect(duePostsMissing(posts, ['/mane-jun-blog/posts/2026-09-22-예약-글/'], base, now)).toEqual([]);
  });
});
