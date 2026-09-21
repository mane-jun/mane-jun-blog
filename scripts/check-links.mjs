// Checks every internal link and image in a built site (default: ./public) and exits with 1 if any target is missing.
// Run after `hugo` in .github/workflows/deploy.yml so a broken link stops the deploy, or locally: npm run check:links
// Only links inside the site are checked; external sites are skipped because their availability varies.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ATTRIBUTES = /\s(?:href|src|data-src|data-thumbnail)=(?:"([^"]*)"|'([^']*)'|([^\s>"']+))/gu;
const SRCSET = /\s(?:srcset|data-srcset)=(?:"([^"]*)"|'([^']*)')/gu;

const htmlFiles = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const path = join(dir, entry.name);
  if (entry.isDirectory()) return htmlFiles(path);
  return entry.name.endsWith('.html') ? [path] : [];
});

// Every URL in href/src/srcset-like attributes, without code blocks where URLs are just text.
export function extractUrls(html) {
  const body = html.replace(/<(pre|code|script|style)\b[\s\S]*?<\/\1>/giu, '');
  const urls = [...body.matchAll(ATTRIBUTES)].map((match) => match[1] ?? match[2] ?? match[3]);
  for (const match of body.matchAll(SRCSET)) {
    urls.push(...(match[1] ?? match[2]).split(',').map((candidate) => candidate.trim().split(/\s+/u)[0]).filter(Boolean));
  }
  return urls;
}

// The file a URL points to inside the built site, or null for URLs that are not checked (external, anchors, mailto, …).
export function targetFile(url, pageUrl, siteUrl, publicDir) {
  const trimmed = url.trim().replaceAll('&amp;', '&');
  if (!trimmed || /^(#|mailto:|tel:|javascript:|data:)/iu.test(trimmed)) return null;
  const resolved = new URL(trimmed, pageUrl);
  const site = new URL(siteUrl);
  if (resolved.origin !== site.origin || !resolved.pathname.startsWith(site.pathname)) return null;

  let path;
  try {
    path = decodeURIComponent(resolved.pathname.slice(site.pathname.length));
  } catch {
    path = resolved.pathname.slice(site.pathname.length);
  }
  const file = join(publicDir, ...path.split('/').filter(Boolean));
  return path === '' || path.endsWith('/') ? join(file, 'index.html') : file;
}

const exists = (file) => existsSync(file) && (statSync(file).isFile() || existsSync(join(file, 'index.html')));

export function findBrokenLinks(publicDir, siteUrl) {
  const broken = [];
  for (const file of htmlFiles(publicDir)) {
    const pagePath = relative(publicDir, file).split(sep).join('/');
    const pageUrl = new URL(pagePath.replace(/index\.html$/u, ''), siteUrl).href;
    for (const url of new Set(extractUrls(readFileSync(file, 'utf8')))) {
      const target = targetFile(url, pageUrl, siteUrl, publicDir);
      if (target && !exists(target)) broken.push({ page: pagePath, url });
    }
  }
  return broken.sort((a, b) => a.page.localeCompare(b.page) || a.url.localeCompare(b.url));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = new URL('../', import.meta.url);
  const publicDir = fileURLToPath(new URL(process.argv[2] ?? 'public/', root));
  const siteUrl = /^baseURL\s*=\s*"([^"]+)"/mu.exec(readFileSync(new URL('hugo.toml', root), 'utf8'))[1];
  if (!existsSync(publicDir)) {
    console.error(`${publicDir} not found. Build the site first (hugo).`);
    process.exit(1);
  }

  const broken = findBrokenLinks(publicDir, siteUrl);
  for (const { page, url } of broken) {
    // GitHub Actions shows ::error lines as annotations on the run.
    console.log(`${process.env.GITHUB_ACTIONS ? '::error::' : ''}깨진 링크: ${page} → ${url}`);
  }
  console.log(broken.length ? `\n깨진 링크 ${broken.length}개` : '깨진 링크 없음');
  process.exit(broken.length ? 1 : 0);
}
