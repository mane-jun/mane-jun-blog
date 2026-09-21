// Scheduled publishing: Hugo leaves out posts dated in the future, so a post written ahead only appears after a
// rebuild at or after its date. The hourly run of .github/workflows/deploy.yml calls this script and deploys only
// when a published (non-draft) post whose date has passed is still missing from the live sitemap.
import { appendFileSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontMatterValue = (source, key) => {
  const frontMatter = /^﻿?---\r?\n([\s\S]*?)\r?\n---/u.exec(source)?.[1] ?? '';
  return new RegExp(`^${key}:\\s*["']?([^"'\\r\\n]*?)["']?\\s*$`, 'mu').exec(frontMatter)?.[1];
};

// Hugo lowercases post paths; the sitemap percent-encodes them.
const normalizePath = (path) => decodeURI(path).toLowerCase();

export function readPosts(postsDir) {
  return readdirSync(postsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(postsDir, entry.name, 'index.md')))
    .map(({ name }) => {
      const source = readFileSync(join(postsDir, name, 'index.md'), 'utf8');
      return { folder: name, date: frontMatterValue(source, 'date'), draft: frontMatterValue(source, 'draft') === 'true' };
    });
}

export const sitemapPaths = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/gu)].map((match) => normalizePath(new URL(match[1]).pathname));

// Non-draft posts dated within the last `lookbackDays` (and not in the future) that the live site does not have yet.
export function duePostsMissing(posts, livePaths, basePath, now = new Date(), lookbackDays = 7) {
  const live = new Set(livePaths);
  const since = now.getTime() - lookbackDays * 24 * 60 * 60 * 1000;
  return posts.filter(({ date, draft, folder }) => {
    const time = Date.parse(date ?? '');
    return !draft && time <= now.getTime() && time >= since && !live.has(normalizePath(`${basePath}posts/${folder}/`));
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = new URL('../', import.meta.url);
  const baseURL = /^baseURL\s*=\s*"([^"]+)"/mu.exec(readFileSync(new URL('hugo.toml', root), 'utf8'))[1];
  const output = (deploy) => process.env.GITHUB_OUTPUT && appendFileSync(process.env.GITHUB_OUTPUT, `deploy=${deploy}\n`);

  let livePaths;
  try {
    const response = await fetch(new URL('sitemap.xml', baseURL), { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    livePaths = sitemapPaths(await response.text());
  } catch (error) {
    // Deploying when unsure is harmless; skipping could leave a scheduled post unpublished.
    console.log(`Could not read the live sitemap (${error.message}); deploying.`);
    output(true);
    process.exit(0);
  }

  const missing = duePostsMissing(readPosts(fileURLToPath(new URL('content/posts/', root))), livePaths, new URL(baseURL).pathname);
  for (const post of missing) console.log(`Due but not live: ${post.folder} (${post.date})`);
  if (!missing.length) console.log('Nothing to publish.');
  output(missing.length > 0);
}
