// GET /stats?range=7d|30d — visit statistics for the admin stats page (static/admin/stats.html).
// Only GitHub users with push access to the blog repository may read them; the Cloudflare API token never leaves the Worker.
const graphqlUrl = 'https://api.cloudflare.com/client/v4/graphql';
const ranges = { '7d': 7, '30d': 30 };
const requiredBindings = ['ALLOWED_ORIGIN', 'CF_API_TOKEN', 'CF_ACCOUNT_ID', 'CF_SITE_TAG', 'GITHUB_REPO'];
const cacheSeconds = 300;
const DAY_MS = 24 * 60 * 60 * 1000;

// Cloudflare samples more coarsely the longer the queried date range (7 days ≈ 1.3x, 30 days ≈ 12x), so longer
// ranges are queried as windows of at most 7 days in one request and merged. bot: 0 excludes bot traffic, matching
// the Cloudflare dashboard's default "Exclude bots" view.
const WINDOW_DAYS = 7;
const TOP_LIMIT = 10;
const groups = (i) => {
  const filter = `filter: { siteTag: $site, date_geq: $start${i}, date_leq: $end${i}, bot: 0 }`;
  return `
      daily${i}: rumPageloadEventsAdaptiveGroups(${filter}, limit: ${WINDOW_DAYS}, orderBy: [date_ASC]) { count sum { visits } dimensions { date } }
      pages${i}: rumPageloadEventsAdaptiveGroups(${filter}, limit: 20, orderBy: [count_DESC]) { count dimensions { requestPath } }
      referers${i}: rumPageloadEventsAdaptiveGroups(${filter}, limit: 20, orderBy: [count_DESC]) { count dimensions { refererHost } }
      countries${i}: rumPageloadEventsAdaptiveGroups(${filter}, limit: 20, orderBy: [count_DESC]) { count dimensions { countryName } }`;
};
export const buildQuery = (windowCount) => {
  const indexes = Array.from({ length: windowCount }, (_, i) => i);
  const variables = indexes.map((i) => `$start${i}: Date, $end${i}: Date`).join(', ');
  return `query ($account: string, $site: string, ${variables}) {
  viewer {
    accounts(filter: { accountTag: $account }) {${indexes.map(groups).join('')}
    }
  }
}`;
};

const isoDate = (time) => new Date(time).toISOString().slice(0, 10);

const json = (body, status, headers) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
});

const corsHeaders = (origin) => ({ 'Access-Control-Allow-Origin': origin, Vary: 'Origin' });

async function hasPushAccess(token, repo) {
  try {
    const response = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'mane-jun-blog-oauth',
      },
    });
    if (!response.ok) return false;
    const body = await response.json();
    return body?.permissions?.push === true;
  } catch {
    return false;
  }
}

// Adds up the rows of every window by one dimension value, largest first.
const mergeTop = (account, windowCount, key, dimension) => {
  const totals = new Map();
  for (let i = 0; i < windowCount; i += 1) {
    for (const row of account[`${key}${i}`] ?? []) {
      const value = row.dimensions[dimension];
      totals.set(value, (totals.get(value) ?? 0) + row.count);
    }
  }
  return [...totals].map(([value, count]) => ({ count, dimensions: { [dimension]: value } })).sort((a, b) => b.count - a.count);
};

export const mergeWindows = (account, windowCount) => ({
  daily: Array.from({ length: windowCount }, (_, i) => account[`daily${i}`] ?? []).flat(),
  pages: mergeTop(account, windowCount, 'pages', 'requestPath'),
  referers: mergeTop(account, windowCount, 'referers', 'refererHost'),
  countries: mergeTop(account, windowCount, 'countries', 'countryName'),
});

// Cloudflare GraphQL rows → the small shape stats.html renders. Missing days are filled with zeros.
export function summarize(account, start, days) {
  const byDate = new Map((account.daily ?? []).map((row) => [row.dimensions.date, row]));
  const daily = Array.from({ length: days }, (_, index) => {
    const date = isoDate(Date.parse(start) + index * DAY_MS);
    const row = byDate.get(date);
    return { date, views: row?.count ?? 0, visits: row?.sum?.visits ?? 0 };
  });
  const top = (rows, dimension, name) => (rows ?? [])
    .map((row) => ({ [name]: row.dimensions[dimension] || '', views: row.count }))
    .filter((row) => row[name] !== '')
    .slice(0, TOP_LIMIT);
  return {
    daily,
    totals: {
      views: daily.reduce((sum, day) => sum + day.views, 0),
      visits: daily.reduce((sum, day) => sum + day.visits, 0),
    },
    pages: top(account.pages, 'requestPath', 'path'),
    referers: top(account.referers, 'refererHost', 'host'),
    countries: top(account.countries, 'countryName', 'country'),
  };
}

async function fetchStats(env, range, now) {
  const days = ranges[range];
  const end = isoDate(now);
  const start = isoDate(now - (days - 1) * DAY_MS);
  const windowCount = Math.ceil(days / WINDOW_DAYS);
  const windowVariables = {};
  for (let i = 0; i < windowCount; i += 1) {
    const windowStart = Date.parse(start) + i * WINDOW_DAYS * DAY_MS;
    windowVariables[`start${i}`] = isoDate(windowStart);
    windowVariables[`end${i}`] = isoDate(Math.min(windowStart + (WINDOW_DAYS - 1) * DAY_MS, Date.parse(end)));
  }
  let response;
  try {
    response = await fetch(graphqlUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.CF_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: buildQuery(windowCount),
        variables: { account: env.CF_ACCOUNT_ID, site: env.CF_SITE_TAG, ...windowVariables },
      }),
    });
  } catch (error) {
    console.error('Cloudflare GraphQL request failed', String(error));
    return null;
  }
  const body = await response.json().catch(() => null);
  const account = body?.data?.viewer?.accounts?.[0];
  if (!response.ok || body?.errors?.length || !account) {
    // Visible only in `wrangler tail`; never returned to the browser.
    console.error('Cloudflare GraphQL request failed', response.status, JSON.stringify(body?.errors ?? null));
    return null;
  }
  return { range, start, end, ...summarize(mergeWindows(account, windowCount), start, days) };
}

// Stats are the same for every authorized user, so they are cached per range only, after the permission check.
async function cachedStats(env, range, now) {
  const cache = typeof caches === 'undefined' ? null : caches.default;
  const key = new Request(`https://stats-cache.internal/v3-windows/${env.CF_SITE_TAG}/${range}`);
  const hit = await cache?.match(key);
  if (hit) return hit.json();
  const stats = await fetchStats(env, range, now);
  if (stats && cache) {
    await cache.put(key, new Response(JSON.stringify(stats), { headers: { 'Cache-Control': `max-age=${cacheSeconds}` } }));
  }
  return stats;
}

export async function handleStats(request, env, now = Date.now()) {
  const origin = request.headers.get('Origin');
  if (!env.ALLOWED_ORIGIN || origin !== env.ALLOWED_ORIGIN) return json({ error: 'Origin is not allowed.' }, 403);
  const cors = corsHeaders(origin);

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...cors,
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Authorization',
        'Access-Control-Max-Age': '600',
      },
    });
  }
  if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405, { ...cors, Allow: 'GET, OPTIONS' });
  if (requiredBindings.some((name) => !env[name])) return json({ error: '통계 기능이 아직 설정되지 않았습니다.' }, 503, cors);

  const token = /^Bearer (\S+)$/u.exec(request.headers.get('Authorization') ?? '')?.[1];
  if (!token) return json({ error: '로그인이 필요합니다.' }, 401, cors);

  const range = new URL(request.url).searchParams.get('range') ?? '7d';
  if (!Object.hasOwn(ranges, range)) return json({ error: '기간은 7d 또는 30d만 가능합니다.' }, 400, cors);

  if (!(await hasPushAccess(token, env.GITHUB_REPO))) return json({ error: '이 저장소에 쓰기 권한이 있는 계정만 볼 수 있습니다.' }, 403, cors);

  const stats = await cachedStats(env, range, now);
  if (!stats) return json({ error: '통계를 불러오지 못했습니다. 잠시 후 다시 시도하세요.' }, 502, cors);
  return json(stats, 200, cors);
}
