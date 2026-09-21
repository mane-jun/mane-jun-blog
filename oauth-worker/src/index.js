import { createCallbackPage } from './callback-page.js';
import { handleStats } from './stats.js';
import { createState, verifyState } from './state.js';

const githubAuthorizeUrl = 'https://github.com/login/oauth/authorize';
const githubTokenUrl = 'https://github.com/login/oauth/access_token';
// No query string, so it exactly matches the Redirect URL registered on the GitHub OAuth App.
const callbackUrl = (requestUrl) => `${requestUrl.origin}/callback`;
const randomNonce = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const requiredBindings = [
  'GITHUB_OAUTH_ID', 'GITHUB_OAUTH_SECRET', 'OAUTH_STATE_SECRET', 'ALLOWED_ORIGIN', 'ALLOWED_SITE_ID', 'OAUTH_SCOPE',
];
const authFailedMessage = 'GitHub 인증에 실패했습니다.';

const text = (body, status, headers = {}) => new Response(body, {
  status,
  headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
});

function handleAuth(url, env) {
  if (url.searchParams.get('provider') !== 'github') return text('Unsupported provider.', 400);
  if (url.searchParams.get('site_id') !== env.ALLOWED_SITE_ID) return text('Site is not allowed.', 403);

  return createState({ origin: env.ALLOWED_ORIGIN, now: Date.now(), nonce: randomNonce() }, env.OAUTH_STATE_SECRET)
    .then((state) => {
      const params = new URLSearchParams({
        client_id: env.GITHUB_OAUTH_ID,
        redirect_uri: callbackUrl(url),
        scope: env.OAUTH_SCOPE,
        state,
      });
      return new Response(null, {
        status: 302,
        headers: { Location: `${githubAuthorizeUrl}?${params}`, 'Cache-Control': 'no-store' },
      });
    });
}

async function exchangeCode(code, url, env) {
  try {
    const response = await fetch(githubTokenUrl, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.GITHUB_OAUTH_ID,
        client_secret: env.GITHUB_OAUTH_SECRET,
        code,
        redirect_uri: callbackUrl(url),
      }),
    });
    if (!response.ok) return null;
    const result = await response.json();
    return typeof result.access_token === 'string' && result.access_token !== '' ? result.access_token : null;
  } catch {
    return null;
  }
}

async function handleCallback(url, env) {
  const code = url.searchParams.get('code');
  const stateToken = url.searchParams.get('state');
  const provider = url.searchParams.get('provider');
  if (provider !== null && provider !== 'github') return text('Unsupported provider.', 400);
  if (!code || !stateToken) return text('Missing OAuth code or state.', 400);

  let state;
  try {
    state = await verifyState(stateToken, env.OAUTH_STATE_SECRET, Date.now());
  } catch {
    return text('Invalid OAuth state.', 400);
  }
  if (state.origin !== env.ALLOWED_ORIGIN) return text('Origin is not allowed.', 403);

  const token = await exchangeCode(code, url, env);
  if (!token) return createCallbackPage({ status: 'error', payload: { error: authFailedMessage }, origin: state.origin });
  return createCallbackPage({ status: 'success', payload: { token, provider: 'github' }, origin: state.origin });
}

export default {
  async fetch(request, env) {
    // /stats has its own CORS preflight and bindings, so the OAuth flow keeps working even when stats are not configured.
    if (new URL(request.url).pathname === '/stats') return handleStats(request, env);
    if (request.method !== 'GET') return text('Method not allowed.', 405, { Allow: 'GET' });
    if (requiredBindings.some((name) => !env[name])) return text('OAuth proxy is not configured.', 500);

    const url = new URL(request.url);
    switch (url.pathname) {
      case '/':
        return text('Decap OAuth proxy is running.', 200);
      case '/auth':
        return handleAuth(url, env);
      case '/callback':
        return handleCallback(url, env);
      default:
        return text('Not found.', 404);
    }
  },
};
