import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from '../src/index.js';
import { summarize } from '../src/stats.js';

const origin = 'https://mane-jun.github.io';
const env = {
  GITHUB_OAUTH_ID: 'client-id',
  GITHUB_OAUTH_SECRET: 'client-secret',
  OAUTH_STATE_SECRET: 'state-secret-that-is-long-enough',
  ALLOWED_ORIGIN: origin,
  ALLOWED_SITE_ID: 'mane-jun.github.io',
  OAUTH_SCOPE: 'public_repo',
  GITHUB_REPO: 'mane-jun/mane-jun-blog',
  CF_API_TOKEN: 'cf-api-token',
  CF_ACCOUNT_ID: 'account-id',
  CF_SITE_TAG: 'site-tag',
};

const statsRequest = ({ range = '7d', token = 'github-token', requestOrigin = origin, method = 'GET' } = {}) => {
  const headers = new Headers();
  if (requestOrigin) headers.set('Origin', requestOrigin);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return new Request(`https://oauth.example/stats?range=${range}`, { method, headers });
};

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json' },
});

const graphqlAccount = {
  daily: [
    { count: 5, sum: { visits: 3 }, dimensions: { date: '2026-09-16' } },
    { count: 8, sum: { visits: 4 }, dimensions: { date: '2026-09-21' } },
  ],
  pages: [{ count: 9, dimensions: { requestPath: '/mane-jun-blog/' } }],
  referers: [{ count: 4, dimensions: { refererHost: '' } }, { count: 2, dimensions: { refererHost: 'google.com' } }],
  countries: [{ count: 13, dimensions: { countryName: 'KR' } }],
};

// First call: GitHub repository permission check. Second call: Cloudflare GraphQL.
const stubUpstreams = ({ push = true, graphql = { data: { viewer: { accounts: [graphqlAccount] } } }, graphqlStatus = 200 } = {}) => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(jsonResponse({ permissions: { push } }))
    .mockResolvedValueOnce(jsonResponse(graphql, graphqlStatus));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

const now = Date.parse('2026-09-21T12:00:00Z');
const callStats = (request, overrides = {}) => worker.fetch(request, { ...env, ...overrides });

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('OAuth Worker /stats', () => {
  it('rejects requests from other origins without CORS headers', async () => {
    const other = await callStats(statsRequest({ requestOrigin: 'https://evil.example' }));
    const none = await callStats(statsRequest({ requestOrigin: null }));
    expect(other.status).toBe(403);
    expect(none.status).toBe(403);
    expect(other.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('answers the CORS preflight for the blog origin', async () => {
    const response = await callStats(statsRequest({ method: 'OPTIONS', token: null }));
    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe(origin);
    expect(response.headers.get('access-control-allow-headers')).toBe('Authorization');
    expect(response.headers.get('access-control-allow-methods')).toBe('GET');
  });

  it('reports missing configuration without breaking the OAuth routes', async () => {
    const stats = await callStats(statsRequest(), { CF_SITE_TAG: '' });
    const health = await worker.fetch(new Request('https://oauth.example/'), { ...env, CF_API_TOKEN: undefined });
    expect(stats.status).toBe(503);
    expect(health.status).toBe(200);
  });

  it('requires a GitHub token and a known range', async () => {
    const noToken = await callStats(statsRequest({ token: null }));
    const badRange = await callStats(statsRequest({ range: 'toString' }));
    expect(noToken.status).toBe(401);
    expect(badRange.status).toBe(400);
    expect(noToken.headers.get('access-control-allow-origin')).toBe(origin);
  });

  it('refuses accounts without push access to the repository', async () => {
    const fetchMock = stubUpstreams({ push: false });
    const response = await callStats(statsRequest());
    expect(response.status).toBe(403);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.github.com/repos/mane-jun/mane-jun-blog');
    expect(init.headers.Authorization).toBe('Bearer github-token');
  });

  it('returns a generic error when Cloudflare GraphQL fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    stubUpstreams({ graphql: { data: null, errors: [{ message: 'unknown field secretInternalName' }] } });
    const response = await callStats(statsRequest());
    const body = await response.text();
    expect(response.status).toBe(502);
    expect(body).not.toContain('secretInternalName');
    expect(body).not.toContain('cf-api-token');
  });

  it('returns summarized stats for an authorized user', async () => {
    vi.useFakeTimers({ now, toFake: ['Date'] });
    const fetchMock = stubUpstreams();
    const response = await callStats(statsRequest({ range: '7d' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBe(origin);
    expect(body).toMatchObject({ range: '7d', start: '2026-09-15', end: '2026-09-21', totals: { views: 13, visits: 7 } });
    expect(body.daily).toHaveLength(7);
    expect(body.daily[1]).toEqual({ date: '2026-09-16', views: 5, visits: 3 });
    expect(body.daily[0]).toEqual({ date: '2026-09-15', views: 0, visits: 0 });
    expect(body.referers).toEqual([{ host: 'google.com', views: 2 }]);
    expect(JSON.stringify(body)).not.toContain('cf-api-token');

    const [url, init] = fetchMock.mock.calls[1];
    const request = JSON.parse(init.body);
    expect(url).toBe('https://api.cloudflare.com/client/v4/graphql');
    expect(init.headers.Authorization).toBe('Bearer cf-api-token');
    expect(request.variables).toEqual({ account: 'account-id', site: 'site-tag', start: '2026-09-15', end: '2026-09-21' });
    expect(init.body).not.toContain('github-token');
  });
});

describe('summarize', () => {
  it('fills every day of the range and drops empty dimension values', () => {
    const result = summarize({ daily: [], pages: [{ count: 1, dimensions: { requestPath: '' } }] }, '2026-09-01', 30);
    expect(result.daily).toHaveLength(30);
    expect(result.daily.at(-1).date).toBe('2026-09-30');
    expect(result.totals).toEqual({ views: 0, visits: 0 });
    expect(result.pages).toEqual([]);
  });
});
