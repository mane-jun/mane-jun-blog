// Prefills the title of a new daily/monthly retrospective in Decap CMS.
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const pad = (value) => String(value).padStart(2, '0');

export function retroTitle(collection, now = new Date()) {
  const kst = new Date(now.getTime() + KST_OFFSET_MS);
  const year = kst.getUTCFullYear();
  const month = kst.getUTCMonth() + 1;

  if (collection === 'daily') return `${year}/${pad(month)}/${pad(kst.getUTCDate())} 일간회고`;
  if (collection === 'monthly') {
    // A monthly retrospective looks back on the previous month.
    return month === 1 ? `${year - 1}/12 월간회고` : `${year}/${pad(month - 1)} 월간회고`;
  }
  return null;
}

export function titledNewEntryHash(hash, now = new Date()) {
  const match = /^#\/collections\/(daily|monthly)\/new$/u.exec(hash);
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
