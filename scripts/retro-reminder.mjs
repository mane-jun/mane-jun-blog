// Checks whether a daily/weekly/monthly retrospective exists and is published.
// Used by .github/workflows/retro-reminder.yml:
//   node scripts/retro-reminder.mjs --due          → kinds to remind about now (daily every day, weekly·monthly on Sunday KST)
//   node scripts/retro-reminder.mjs <daily|weekly|monthly>
// Prints the result and, on GitHub Actions, writes it to $GITHUB_OUTPUT. RETRO_DATE (YYYY-MM-DD) simulates 22:00 KST of that day.
import { appendFileSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { retroTitle } from '../static/admin/retro-title.js';

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
export const KINDS = ['daily', 'weekly', 'monthly'];

// Accepts YYYY-MM-DD or YYYYMMDD (typed in the manual "Run workflow" form); returns YYYY-MM-DD or null.
export const normalizeDate = (value) => {
  const match = /^(\d{4})-?(\d{2})-?(\d{2})$/u.exec(String(value).trim());
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
};

// YYYY-MM-DD in KST.
export const kstDate = (now = new Date()) => new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);

// Weekly and monthly retrospectives are due on Sunday night (KST); daily ones every night.
export const dueKinds = (now = new Date()) => (new Date(now.getTime() + KST_OFFSET_MS).getUTCDay() === 0 ? KINDS : ['daily']);

const frontMatterValue = (source, key) => {
  const frontMatter = /^﻿?---\r?\n([\s\S]*?)\r?\n---/u.exec(source)?.[1] ?? '';
  return new RegExp(`^${key}:\\s*["']?([^"'\\r\\n]*?)["']?\\s*$`, 'mu').exec(frontMatter)?.[1];
};

// Finds the retrospective by the title the CMS pre-fills (static/admin/retro-title.js), e.g. "2026/09/14~09/20 주간회고",
// or by the folder name Decap derives from it ("/" and spaces become "-": "2026-09-14~09-20-주간회고").
export function checkRetro(postsDir, kind, now = new Date()) {
  const title = retroTitle(kind, now);
  const folder = title.replace(/[/ ]/gu, '-');
  const dirs = existsSync(postsDir) ? readdirSync(postsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory()) : [];

  let draft = null;
  for (const { name } of dirs) {
    const file = join(postsDir, name, 'index.md');
    if (!existsSync(file)) continue;
    const source = readFileSync(file, 'utf8');
    if (name !== folder && frontMatterValue(source, 'title') !== title) continue;
    const post = { kind, title, path: `content/posts/${name}/index.md`, entry: `${name}/index` };
    if (frontMatterValue(source, 'draft') !== 'true') return { ...post, status: 'published' };
    draft = { ...post, status: 'draft' };
  }
  return draft ?? { kind, title, status: 'missing' };
}

const nowFromEnv = () => {
  if (!process.env.RETRO_DATE) return new Date();
  const date = normalizeDate(process.env.RETRO_DATE);
  if (!date) {
    console.error(`Invalid date: ${process.env.RETRO_DATE} (use YYYY-MM-DD)`);
    process.exit(1);
  }
  return new Date(`${date}T13:00:00Z`); // 22:00 KST
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const now = nowFromEnv();
  const arg = process.argv[2];
  const output = (lines) => process.env.GITHUB_OUTPUT && appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join('\n')}\n`);

  if (arg === '--due') {
    const kinds = dueKinds(now);
    console.log(kinds.join(' '));
    output([`kinds=${kinds.join(' ')}`]);
  } else if (KINDS.includes(arg)) {
    const result = checkRetro(fileURLToPath(new URL('../content/posts/', import.meta.url)), arg, now);
    console.log(JSON.stringify(result));
    output([`status=${result.status}`, `title=${result.title}`, `entry=${result.entry ?? ''}`]);
  } else {
    console.error(`Usage: node scripts/retro-reminder.mjs <--due|${KINDS.join('|')}>`);
    process.exit(1);
  }
}
