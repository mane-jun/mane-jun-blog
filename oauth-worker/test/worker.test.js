import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from '../src/index.js';

const env = {
  GITHUB_OAUTH_ID: 'client-id',
  GITHUB_OAUTH_SECRET: 'client-secret',
  OAUTH_STATE_SECRET: 'state-secret-that-is-long-enough',
  ALLOWED_ORIGIN: 'https://mane-jun.github.io',
  ALLOWED_SITE_ID: 'mane-jun.github.io',
  OAUTH_SCOPE: 'public_repo',
};

const issueState = async () => {
  const auth = await worker.fetch(new Request('https://oauth.example/auth?provider=github&site_id=mane-jun.github.io'), env);
  return new URL(auth.headers.get('location')).searchParams.get('state');
};

const stubGitHub = (body, status = 200) => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json' },
  }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('OAuth Worker', () => {
  it('reports health on the root path', async () => {
    const response = await worker.fetch(new Request('https://oauth.example/'), env);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('Decap OAuth proxy is running.');
  });

  it('rejects unsupported sites and providers', async () => {
    const wrongSite = await worker.fetch(new Request('https://oauth.example/auth?provider=github&site_id=evil.example'), env);
    const wrongProvider = await worker.fetch(new Request('https://oauth.example/auth?provider=gitlab&site_id=mane-jun.github.io'), env);
    expect(wrongSite.status).toBe(403);
    expect(wrongProvider.status).toBe(400);
  });

  it('rejects non-GET methods, unknown paths, and missing bindings', async () => {
    const post = await worker.fetch(new Request('https://oauth.example/auth', { method: 'POST' }), env);
    const unknown = await worker.fetch(new Request('https://oauth.example/token'), env);
    const misconfigured = await worker.fetch(new Request('https://oauth.example/auth?provider=github&site_id=mane-jun.github.io'), { ...env, OAUTH_STATE_SECRET: '' });
    expect(post.status).toBe(405);
    expect(unknown.status).toBe(404);
    expect(misconfigured.status).toBe(500);
  });

  it('redirects valid auth requests with the fixed scope and signed state', async () => {
    const response = await worker.fetch(new Request('https://oauth.example/auth?provider=github&site_id=mane-jun.github.io&scope=repo'), env);
    const location = new URL(response.headers.get('location'));
    expect(response.status).toBe(302);
    expect(location.origin).toBe('https://github.com');
    expect(location.searchParams.get('client_id')).toBe('client-id');
    expect(location.searchParams.get('redirect_uri')).toBe('https://oauth.example/callback?provider=github');
    expect(location.searchParams.get('scope')).toBe('public_repo');
    expect(location.searchParams.get('state')).toContain('.');
  });

  it('exchanges a valid callback and never exposes the client secret', async () => {
    const state = await issueState();
    const fetchMock = stubGitHub({ access_token: 'github-token' });
    const response = await worker.fetch(new Request(`https://oauth.example/callback?provider=github&code=abc&state=${encodeURIComponent(state)}`), env);
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toContain('authorization:github:success:');
    expect(html).toContain('github-token');
    expect(html).not.toContain('client-secret');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://github.com/login/oauth/access_token');
    expect(new URLSearchParams(init.body.toString()).get('code')).toBe('abc');
  });

  it('maps GitHub errors to a generic Decap error page', async () => {
    const state = await issueState();
    stubGitHub({ error: 'bad_verification_code', error_description: 'The code passed is incorrect or expired.' });
    const response = await worker.fetch(new Request(`https://oauth.example/callback?provider=github&code=abc&state=${encodeURIComponent(state)}`), env);
    const html = await response.text();
    expect(html).toContain('authorization:github:error:');
    expect(html).not.toContain('bad_verification_code');
    expect(html).not.toContain('client-secret');
    expect(html).not.toMatch(/at .+\(.+:\d+:\d+\)/u);
  });

  it('rejects missing or invalid callback state', async () => {
    const missing = await worker.fetch(new Request('https://oauth.example/callback?provider=github&code=abc'), env);
    const invalid = await worker.fetch(new Request('https://oauth.example/callback?provider=github&code=abc&state=invalid'), env);
    expect(missing.status).toBe(400);
    expect(invalid.status).toBe(400);
  });

  it('rejects state issued for a different origin', async () => {
    const state = await issueState();
    const response = await worker.fetch(
      new Request(`https://oauth.example/callback?provider=github&code=abc&state=${encodeURIComponent(state)}`),
      { ...env, ALLOWED_ORIGIN: 'https://other.example' },
    );
    expect(response.status).toBe(403);
  });
});
