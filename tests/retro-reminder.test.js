import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { checkRetro, dueKinds, kstDate, normalizeDate } from '../scripts/retro-reminder.mjs';

let postsDir;
const writePost = (folder, frontMatter) => {
  mkdirSync(join(postsDir, folder), { recursive: true });
  writeFileSync(join(postsDir, folder, 'index.md'), `---\n${frontMatter}\n---\n\n본문\n`);
};
// 22:00 KST of the given day, when the scheduled reminder runs.
const night = (date) => new Date(`${date}T13:00:00Z`);

beforeEach(() => {
  postsDir = mkdtempSync(join(tmpdir(), 'retro-'));
});
afterEach(() => rmSync(postsDir, { recursive: true, force: true }));

describe('retrospective reminder', () => {
  it('uses the KST date and accepts manual dates with or without hyphens', () => {
    expect(kstDate(new Date('2026-09-21T13:00:00Z'))).toBe('2026-09-21');
    expect(kstDate(new Date('2026-09-21T15:30:00Z'))).toBe('2026-09-22');
    expect(normalizeDate(' 20260920 ')).toBe('2026-09-20');
    expect(normalizeDate('2026/09/20')).toBeNull();
  });

  it('checks weekly and monthly retrospectives only on Sunday night', () => {
    expect(dueKinds(night('2026-09-19'))).toEqual(['daily']);
    expect(dueKinds(night('2026-09-20'))).toEqual(['daily', 'weekly', 'monthly']);
  });

  it('reports a missing, draft or published daily retrospective', () => {
    writePost('2026-09-20-일간회고', 'title: "2026/09/20 일간회고"\ndraft: true');
    writePost('2026-09-21-일간회고', 'title: 2026/09/21 일간회고\ndraft: false');

    expect(checkRetro(postsDir, 'daily', night('2026-09-19'))).toEqual({ kind: 'daily', title: '2026/09/19 일간회고', status: 'missing' });
    expect(checkRetro(postsDir, 'daily', night('2026-09-20'))).toMatchObject({ status: 'draft', entry: '2026-09-20-일간회고/index' });
    expect(checkRetro(postsDir, 'daily', night('2026-09-21'))).toMatchObject({ status: 'published', path: 'content/posts/2026-09-21-일간회고/index.md' });
  });

  it('finds a retrospective by title even when its folder name differs', () => {
    writePost('2026-09-22-오늘-회고', 'title: \'2026/09/21 일간회고\'');
    writePost('2026-09-21-다른-글', 'title: "2026/09/21 개발 메모"\ndraft: false');

    expect(checkRetro(postsDir, 'daily', night('2026-09-21'))).toMatchObject({ status: 'published', entry: '2026-09-22-오늘-회고/index' });
  });

  it('looks for this week and last month on Sunday, using the titles the CMS pre-fills', () => {
    writePost('2026-09-14~09-20-주간회고', 'title: "2026/09/14~09/20 주간회고"\ndraft: false');

    expect(checkRetro(postsDir, 'weekly', night('2026-09-20'))).toMatchObject({ title: '2026/09/14~09/20 주간회고', status: 'published' });
    expect(checkRetro(postsDir, 'monthly', night('2026-09-20'))).toEqual({ kind: 'monthly', title: '2026/08 월간회고', status: 'missing' });
    // Found by folder name alone, too.
    writePost('2026-08-월간회고', 'draft: true');
    expect(checkRetro(postsDir, 'monthly', night('2026-09-20'))).toMatchObject({ status: 'draft', entry: '2026-08-월간회고/index' });
  });
});
