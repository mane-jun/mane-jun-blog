// Prefills the title of a new daily/weekly/monthly retrospective in Decap CMS (and, for weekly/monthly, the numbers
// in the body — see retro-stats.js).
import { prefilledBody } from './retro-stats.js';

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const pad = (value) => String(value).padStart(2, '0');

// A Mon–Sun week: on Sunday the week ending today, otherwise the last complete week.
const weeklyTitle = (kst) => {
  const end = new Date(kst.getTime() - kst.getUTCDay() * DAY_MS);
  const start = new Date(end.getTime() - 6 * DAY_MS);
  const endYear = end.getUTCFullYear() === start.getUTCFullYear() ? '' : `${end.getUTCFullYear()}/`;
  return `${start.getUTCFullYear()}/${pad(start.getUTCMonth() + 1)}/${pad(start.getUTCDate())}`
    + `~${endYear}${pad(end.getUTCMonth() + 1)}/${pad(end.getUTCDate())} 주간회고`;
};

export function retroTitle(collection, now = new Date()) {
  const kst = new Date(now.getTime() + KST_OFFSET_MS);
  const year = kst.getUTCFullYear();
  const month = kst.getUTCMonth() + 1;

  if (collection === 'daily') return `${year}/${pad(month)}/${pad(kst.getUTCDate())} 일간회고`;
  if (collection === 'weekly') return weeklyTitle(kst);
  if (collection === 'monthly') {
    // A monthly retrospective looks back on the previous month.
    return month === 1 ? `${year - 1}/12 월간회고` : `${year}/${pad(month - 1)} 월간회고`;
  }
  return null;
}

const NEW_ENTRY = /^#\/collections\/(daily|weekly|monthly)\/new$/u;
const PREFILL_TIMEOUT_MS = 3000;

export function titledNewEntryHash(hash, now = new Date(), body = null) {
  const match = NEW_ENTRY.exec(hash);
  if (!match) return null;
  const title = `?title=${encodeURIComponent(retroTitle(match[1], now))}`;
  return `#/collections/${match[1]}/new${title}${body ? `&body=${encodeURIComponent(body)}` : ''}`;
}

// Decap reads ?title= and ?body= only when the editor mounts on a fresh page load, so reload after adding them.
// If the numbers cannot be prepared in time, the entry still opens with the title and the plain template.
export function installRetroTitle(win = window, loadBody = prefilledBody) {
  const apply = async () => {
    const hash = win.location.hash;
    const match = NEW_ENTRY.exec(hash);
    if (!match) return;
    const now = new Date();
    let body = null;
    if (match[1] !== 'daily') {
      const timeout = new Promise((resolve) => { setTimeout(() => resolve(null), PREFILL_TIMEOUT_MS); });
      body = await Promise.race([loadBody(match[1], now).catch(() => null), timeout]);
      if (win.location.hash !== hash) return; // navigated elsewhere meanwhile
    }
    win.location.replace(titledNewEntryHash(hash, now, body));
    win.location.reload();
  };
  win.addEventListener('hashchange', apply);
  return apply();
}
