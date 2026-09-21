import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { checkDailyRetro, kstDate } from '../scripts/retro-reminder.mjs';

let postsDir;
const writePost = (folder, frontMatter) => {
  mkdirSync(join(postsDir, folder), { recursive: true });
  writeFileSync(join(postsDir, folder, 'index.md'), `---\n${frontMatter}\n---\n\n본문\n`);
};

afterEach(() => rmSync(postsDir, { recursive: true, force: true }));

describe('daily retrospective reminder', () => {
  it('uses the KST date', () => {
    postsDir = mkdtempSync(join(tmpdir(), 'retro-'));
    expect(kstDate(new Date('2026-09-21T13:00:00Z'))).toBe('2026-09-21');
    expect(kstDate(new Date('2026-09-21T15:30:00Z'))).toBe('2026-09-22');
  });

  it('reports a missing, draft or published retrospective', () => {
    postsDir = mkdtempSync(join(tmpdir(), 'retro-'));
    writePost('2026-09-20-일간회고', 'title: "2026/09/20 일간회고"\ndraft: true');
    writePost('2026-09-21-일간회고', 'title: 2026/09/21 일간회고\ndraft: false');

    expect(checkDailyRetro(postsDir, '2026-09-19')).toEqual({ date: '2026-09-19', status: 'missing' });
    expect(checkDailyRetro(postsDir, '2026-09-20')).toMatchObject({ status: 'draft', entry: '2026-09-20-일간회고/index' });
    expect(checkDailyRetro(postsDir, '2026-09-21')).toMatchObject({ status: 'published', path: 'content/posts/2026-09-21-일간회고/index.md' });
  });

  it('finds a retrospective by title even when its folder name differs', () => {
    postsDir = mkdtempSync(join(tmpdir(), 'retro-'));
    writePost('2026-09-22-오늘-회고', 'title: \'2026/09/21 일간회고\'');
    writePost('2026-09-21-다른-글', 'title: "2026/09/21 개발 메모"\ndraft: false');

    expect(checkDailyRetro(postsDir, '2026-09-21')).toMatchObject({ status: 'published', entry: '2026-09-22-오늘-회고/index' });
  });
});
