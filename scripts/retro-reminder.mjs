// Checks whether the daily retrospective for a KST date exists and is published.
// Used by .github/workflows/retro-reminder.yml: prints the result and, on GitHub Actions, writes it to $GITHUB_OUTPUT.
import { appendFileSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

// YYYY-MM-DD in KST.
export const kstDate = (now = new Date()) => new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);

const frontMatterValue = (source, key) => {
  const frontMatter = /^﻿?---\r?\n([\s\S]*?)\r?\n---/u.exec(source)?.[1] ?? '';
  return new RegExp(`^${key}:\\s*["']?([^"'\\r\\n]*?)["']?\\s*$`, 'mu').exec(frontMatter)?.[1];
};

// A daily retrospective is found by its title ("2026/09/21 일간회고") or folder name ("2026-09-21-일간회고").
export function checkDailyRetro(postsDir, date) {
  const title = `${date.replaceAll('-', '/')} 일간회고`;
  const folder = `${date}-일간회고`;
  const dirs = existsSync(postsDir) ? readdirSync(postsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory()) : [];

  let draft = null;
  for (const { name } of dirs) {
    const file = join(postsDir, name, 'index.md');
    if (!existsSync(file)) continue;
    const source = readFileSync(file, 'utf8');
    if (name !== folder && frontMatterValue(source, 'title') !== title) continue;
    const post = { date, path: `content/posts/${name}/index.md`, entry: `${name}/index` };
    if (frontMatterValue(source, 'draft') !== 'true') return { ...post, status: 'published' };
    draft = { ...post, status: 'draft' };
  }
  return draft ?? { date, status: 'missing' };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const date = process.env.RETRO_DATE || kstDate();
  const result = checkDailyRetro(fileURLToPath(new URL('../content/posts/', import.meta.url)), date);
  console.log(JSON.stringify(result));
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `status=${result.status}\ndate=${result.date}\nentry=${result.entry ?? ''}\n`);
  }
}
