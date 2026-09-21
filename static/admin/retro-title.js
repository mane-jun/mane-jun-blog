// Prefills the title of a new daily/weekly/monthly retrospective in Decap CMS.
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

export function titledNewEntryHash(hash, now = new Date()) {
  const match = /^#\/collections\/(daily|weekly|monthly)\/new$/u.exec(hash);
  return match ? `#/collections/${match[1]}/new?title=${encodeURIComponent(retroTitle(match[1], now))}` : null;
}

// Decap reads ?title= only when the editor mounts on a fresh page load, so reload after adding it.
export function installRetroTitle(win = window) {
  const apply = () => {
    const next = titledNewEntryHash(win.location.hash);
    if (!next) return;
    win.location.replace(next);
    win.location.reload();
  };
  win.addEventListener('hashchange', apply);
  apply();
}
