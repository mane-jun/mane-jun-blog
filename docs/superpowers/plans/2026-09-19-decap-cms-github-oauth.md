# Decap CMS + GitHub OAuth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a browser-based Decap CMS editor at `/mane-jun-blog/admin/` that writes Hugo leaf bundles to GitHub through a secured Cloudflare Worker OAuth proxy.

**Architecture:** Hugo serves a static, version-pinned Decap CMS application and collection schema. A separate Cloudflare Worker performs GitHub OAuth, signs short-lived state, exchanges authorization codes, and returns the token to the exact admin origin. Decap commits directly to `main`, so the existing GitHub Actions workflow remains the deployment path.

**Tech Stack:** Hugo 0.164.0, Decap CMS 3.15.1, JavaScript ES modules, Cloudflare Workers/Wrangler 4, Vitest 4, YAML 2, GitHub OAuth

**Spec:** `docs/superpowers/specs/2026-09-19-decap-cms-github-oauth-design.md`

## Global Constraints

- Preserve the existing Hugo theme, content URLs, YAML front matter, leaf bundle structure, and GitHub Pages workflow.
- Save CMS content directly to the `main` branch; do not add an editorial branch or pull-request workflow.
- New posts default to `draft: true` and use `content/posts/YYYY-MM-DD-<unicode-slug>/index.md`.
- Store uploaded post media beside that post's `index.md` and write relative media references.
- Request only the GitHub OAuth `public_repo` scope.
- Never commit the GitHub client secret, OAuth access tokens, the state-signing secret, `.dev.vars`, or production secret files.
- Pin Decap CMS to `3.15.1`; do not use an unbounded CDN version.
- The production admin origin is exactly `https://mane-jun.github.io` and the admin URL is `https://mane-jun.github.io/mane-jun-blog/admin/`.
- The production OAuth URL is execution-derived from the user's Cloudflare Workers subdomain. Replace the local development URL with Wrangler's exact deployed HTTPS URL before the final commit; do not commit a sentinel value.

---

## File Map

- `static/admin/index.html` — minimal static shell that loads the pinned Decap CMS application.
- `static/admin/config.yml` — GitHub backend, post collection schema, slug rules, media placement, and Korean labels.
- `package.json` / `package-lock.json` — repository-local validation and Worker deployment tooling.
- `tests/cms-config.test.js` — parses and asserts the served Decap configuration.
- `tests/security.test.js` — verifies ignored secret files and scans tracked source for leaked credentials.
- `oauth-worker/src/state.js` — signs and verifies short-lived OAuth state tokens.
- `oauth-worker/src/callback-page.js` — emits the Decap popup handshake without wildcard message targets.
- `oauth-worker/src/index.js` — Worker route handling and GitHub token exchange.
- `oauth-worker/test/state.test.js` — state integrity, expiration, and tamper tests.
- `oauth-worker/test/callback-page.test.js` — safe callback page tests.
- `oauth-worker/test/worker.test.js` — `/auth`, `/callback`, validation, and upstream error tests.
- `oauth-worker/wrangler.jsonc` — Worker name, entry point, compatibility date, non-secret bindings, and required secret declarations.
- `.gitignore` — local package output and Worker secret exclusions.
- `README.md` — operator workflow and GitHub/Cloudflare setup runbook.

---

### Task 1: Add the Decap administrator and schema contract

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `tests/cms-config.test.js`
- Create: `static/admin/index.html`
- Create: `static/admin/config.yml`

**Interfaces:**
- Consumes: Existing `content/posts/*/index.md` YAML fields and Hugo leaf bundle layout.
- Produces: A served Decap app and parsed config with backend `github`, collection `posts`, and a temporary local OAuth base URL of `http://127.0.0.1:8787`.

- [ ] **Step 1: Initialize the validation toolchain**

Create `package.json` with:

```json
{
  "name": "mane-jun-blog-tooling",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:cms": "vitest run tests/cms-config.test.js",
    "test:oauth": "vitest run oauth-worker/test",
    "deploy:oauth": "wrangler deploy --config oauth-worker/wrangler.jsonc"
  },
  "devDependencies": {
    "vitest": "~4.1.0",
    "wrangler": "^4.59.1",
    "yaml": "^2.8.1"
  }
}
```

Run: `npm install`

Expected: `package-lock.json` is created and `npm audit` reports no unresolved high/critical issue. Review any advisory before continuing rather than running `npm audit fix --force`.

- [ ] **Step 2: Write the failing CMS contract test**

Create `tests/cms-config.test.js`:

```js
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

describe('Decap CMS configuration', () => {
  it('pins the CMS script and exposes the Hugo post collection', async () => {
    const html = await read('static/admin/index.html');
    const config = parse(await read('static/admin/config.yml'));
    const posts = config.collections.find(({ name }) => name === 'posts');

    expect(html).toContain('decap-cms@3.15.1/dist/decap-cms.js');
    expect(config.backend).toMatchObject({
      name: 'github',
      repo: 'mane-jun/mane-jun-blog',
      branch: 'main',
      auth_endpoint: 'auth',
      auth_scope: 'public_repo',
    });
    expect(config.slug).toEqual({
      encoding: 'unicode',
      clean_accents: false,
      sanitize_replacement: '-',
    });
    expect(posts).toMatchObject({
      folder: 'content/posts',
      create: true,
      path: '{{slug}}/index',
      slug: '{{year}}-{{month}}-{{day}}-{{slug}}',
      media_folder: '',
      public_folder: '',
      summary: '{{title}} — {{date}} — {{categories}} — draft={{draft}}',
    });
    expect(posts.fields.map(({ name }) => name)).toEqual([
      'title', 'date', 'draft', 'categories', 'tags', 'summary', 'body',
    ]);
    expect(posts.fields.find(({ name }) => name === 'draft').default).toBe(true);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm run test:cms`

Expected: FAIL with `ENOENT` for `static/admin/index.html` or `static/admin/config.yml`.

- [ ] **Step 4: Add the pinned admin shell**

Create `static/admin/index.html`:

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>mane-jun's log 관리자</title>
  </head>
  <body>
    <script src="https://unpkg.com/decap-cms@3.15.1/dist/decap-cms.js"></script>
  </body>
</html>
```

- [ ] **Step 5: Add the post collection configuration**

Create `static/admin/config.yml`:

```yaml
backend:
  name: github
  repo: mane-jun/mane-jun-blog
  branch: main
  base_url: http://127.0.0.1:8787
  auth_endpoint: auth
  auth_scope: public_repo

site_url: https://mane-jun.github.io/mane-jun-blog/
display_url: https://mane-jun.github.io/mane-jun-blog/
locale: ko

slug:
  encoding: unicode
  clean_accents: false
  sanitize_replacement: "-"

media_folder: static/images/uploads
public_folder: /mane-jun-blog/images/uploads

collections:
  - name: posts
    label: 글
    label_singular: 글
    folder: content/posts
    create: true
    path: "{{slug}}/index"
    slug: "{{year}}-{{month}}-{{day}}-{{slug}}"
    media_folder: ""
    public_folder: ""
    summary: "{{title}} — {{date}} — {{categories}} — draft={{draft}}"
    sortable_fields: [date, title, draft]
    view_filters:
      - { label: 초안, field: draft, pattern: true }
      - { label: 공개, field: draft, pattern: false }
    fields:
      - { label: 제목, name: title, widget: string }
      - label: 작성일
        name: date
        widget: datetime
        default: "{{now}}"
        format: "YYYY-MM-DDTHH:mm:ssZ"
      - { label: 초안, name: draft, widget: boolean, default: true }
      - label: 카테고리
        name: categories
        widget: select
        multiple: true
        options: [개발, 회고, 생각, 기타]
        default: [기타]
      - { label: 태그, name: tags, widget: list, required: false }
      - { label: 요약, name: summary, widget: text, required: false }
      - { label: 본문, name: body, widget: markdown }
```

- [ ] **Step 6: Run the CMS contract test**

Run: `npm run test:cms`

Expected: PASS.

- [ ] **Step 7: Commit the administrator shell**

```bash
git add package.json package-lock.json tests/cms-config.test.js static/admin/index.html static/admin/config.yml
git commit -m "feat: add Decap CMS administrator"
```

---

### Task 2: Implement signed, expiring OAuth state

**Files:**
- Create: `oauth-worker/test/state.test.js`
- Create: `oauth-worker/src/state.js`

**Interfaces:**
- Produces: `createState({ origin, now, nonce }, secret): Promise<string>` and `verifyState(token, secret, now): Promise<{ origin: string, issuedAt: number, nonce: string }>`.
- Security contract: HMAC-SHA-256 and a 5-minute maximum age.

- [ ] **Step 1: Write state integrity tests**

Create `oauth-worker/test/state.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { createState, verifyState } from '../src/state.js';

const secret = 'test-signing-secret-that-is-long-enough';
const issuedAt = 1_800_000_000_000;

describe('OAuth state', () => {
  it('round-trips signed state', async () => {
    const token = await createState(
      { origin: 'https://mane-jun.github.io', now: issuedAt, nonce: 'abc123' }, secret,
    );
    await expect(verifyState(token, secret, issuedAt + 1_000)).resolves.toEqual({
      origin: 'https://mane-jun.github.io', issuedAt, nonce: 'abc123',
    });
  });

  it('rejects tampering and expiry', async () => {
    const token = await createState(
      { origin: 'https://mane-jun.github.io', now: issuedAt, nonce: 'abc123' }, secret,
    );
    const tampered = `${token.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}`;
    await expect(verifyState(tampered, secret, issuedAt + 1_000)).rejects.toThrow('Invalid OAuth state');
    await expect(verifyState(token, secret, issuedAt + 300_001)).rejects.toThrow('Expired OAuth state');
  });
});
```

- [ ] **Step 2: Run the state tests to verify they fail**

Run: `npm run test:oauth -- oauth-worker/test/state.test.js`

Expected: FAIL because `oauth-worker/src/state.js` does not exist.

- [ ] **Step 3: Implement HMAC state helpers**

Create `oauth-worker/src/state.js`:

```js
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const MAX_AGE_MS = 5 * 60 * 1000;

const toBase64Url = (bytes) => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
};

const fromBase64Url = (value) => {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
};

const importKey = (secret) => crypto.subtle.importKey(
  'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'],
);

export async function createState({ origin, now, nonce }, secret) {
  const payload = encoder.encode(JSON.stringify({ origin, issuedAt: now, nonce }));
  const signature = await crypto.subtle.sign('HMAC', await importKey(secret), payload);
  return `${toBase64Url(payload)}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifyState(token, secret, now) {
  try {
    const [payloadPart, signaturePart, extra] = token.split('.');
    if (!payloadPart || !signaturePart || extra) throw new Error();
    const payload = fromBase64Url(payloadPart);
    const valid = await crypto.subtle.verify('HMAC', await importKey(secret), fromBase64Url(signaturePart), payload);
    if (!valid) throw new Error();
    const parsed = JSON.parse(decoder.decode(payload));
    if (typeof parsed.origin !== 'string' || typeof parsed.issuedAt !== 'number' || typeof parsed.nonce !== 'string') throw new Error();
    if (now - parsed.issuedAt > MAX_AGE_MS || parsed.issuedAt > now + 30_000) throw new Error('Expired OAuth state');
    return parsed;
  } catch (error) {
    if (error instanceof Error && error.message === 'Expired OAuth state') throw error;
    throw new Error('Invalid OAuth state');
  }
}
```

- [ ] **Step 4: Run the state tests**

Run: `npm run test:oauth -- oauth-worker/test/state.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the state boundary**

```bash
git add oauth-worker/src/state.js oauth-worker/test/state.test.js
git commit -m "feat: sign Decap OAuth state"
```

---

### Task 3: Implement the restricted Decap popup callback

**Files:**
- Create: `oauth-worker/test/callback-page.test.js`
- Create: `oauth-worker/src/callback-page.js`

**Interfaces:**
- Consumes: Decap's popup messages `authorizing:github` and `authorization:github:<status>:<json>`.
- Produces: `createCallbackPage({ status, payload, origin }): Response` with `no-store`, CSP, and an exact `postMessage` target origin.

- [ ] **Step 1: Write callback safety tests**

Create `oauth-worker/test/callback-page.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { createCallbackPage } from '../src/callback-page.js';

describe('Decap callback page', () => {
  it('targets only the configured admin origin', async () => {
    const response = createCallbackPage({
      status: 'success', payload: { token: 'token-value' }, origin: 'https://mane-jun.github.io',
    });
    const html = await response.text();
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('content-security-policy')).toContain("default-src 'none'");
    expect(html).toContain('authorization:github:success:');
    expect(html).toContain('https://mane-jun.github.io');
    expect(html).not.toContain("postMessage(message, '*')");
  });

  it('escapes markup-significant payload characters', async () => {
    const response = createCallbackPage({
      status: 'error', payload: { error: '</script><script>alert(1)</script>' }, origin: 'https://mane-jun.github.io',
    });
    expect(await response.text()).not.toContain('</script><script>alert(1)</script>');
  });
});
```

- [ ] **Step 2: Run the callback tests to verify they fail**

Run: `npm run test:oauth -- oauth-worker/test/callback-page.test.js`

Expected: FAIL because `oauth-worker/src/callback-page.js` does not exist.

- [ ] **Step 3: Implement the callback page**

Create `oauth-worker/src/callback-page.js`. Serialize the Decap message with `JSON.stringify`, then replace `<`, `>`, `&`, U+2028, and U+2029 with Unicode escape sequences before embedding it. The generated script must implement:

```js
const receiveMessage = (event) => {
  if (event.origin !== targetOrigin) return;
  window.opener.postMessage(message, targetOrigin);
  window.removeEventListener('message', receiveMessage);
  window.close();
};
window.addEventListener('message', receiveMessage);
window.opener.postMessage('authorizing:github', targetOrigin);
```

Return HTML with:

```js
{
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'",
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
}
```

- [ ] **Step 4: Run the callback tests**

Run: `npm run test:oauth -- oauth-worker/test/callback-page.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the callback renderer**

```bash
git add oauth-worker/src/callback-page.js oauth-worker/test/callback-page.test.js
git commit -m "feat: restrict Decap OAuth callback origin"
```

---

### Task 4: Implement and configure the OAuth Worker

**Files:**
- Create: `oauth-worker/test/worker.test.js`
- Create: `oauth-worker/src/index.js`
- Create: `oauth-worker/wrangler.jsonc`

**Interfaces:**
- Consumes bindings: `GITHUB_OAUTH_ID`, `GITHUB_OAUTH_SECRET`, `OAUTH_STATE_SECRET`, `ALLOWED_ORIGIN`, `ALLOWED_SITE_ID`, and `OAUTH_SCOPE`.
- Produces routes: `GET /` health response, `GET /auth` authorization redirect, and `GET /callback` Decap popup result.

- [ ] **Step 1: Write route tests with a stubbed GitHub exchange**

Create `oauth-worker/test/worker.test.js`:

```js
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

afterEach(() => vi.restoreAllMocks());

describe('OAuth Worker', () => {
  it('rejects unsupported sites and providers', async () => {
    const wrongSite = await worker.fetch(new Request('https://oauth.example/auth?provider=github&site_id=evil.example'), env);
    const wrongProvider = await worker.fetch(new Request('https://oauth.example/auth?provider=gitlab&site_id=mane-jun.github.io'), env);
    expect(wrongSite.status).toBe(403);
    expect(wrongProvider.status).toBe(400);
  });

  it('redirects valid auth requests with the fixed scope and signed state', async () => {
    const response = await worker.fetch(new Request('https://oauth.example/auth?provider=github&site_id=mane-jun.github.io'), env);
    const location = new URL(response.headers.get('location'));
    expect(response.status).toBe(302);
    expect(location.origin).toBe('https://github.com');
    expect(location.searchParams.get('client_id')).toBe('client-id');
    expect(location.searchParams.get('scope')).toBe('public_repo');
    expect(location.searchParams.get('state')).toContain('.');
  });

  it('exchanges a valid callback and never exposes the client secret', async () => {
    const auth = await worker.fetch(new Request('https://oauth.example/auth?provider=github&site_id=mane-jun.github.io'), env);
    const state = new URL(auth.headers.get('location')).searchParams.get('state');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ access_token: 'github-token' }), {
      status: 200, headers: { 'content-type': 'application/json' },
    })));
    const response = await worker.fetch(new Request(`https://oauth.example/callback?provider=github&code=abc&state=${encodeURIComponent(state)}`), env);
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toContain('github-token');
    expect(html).not.toContain('client-secret');
  });

  it('rejects missing or invalid callback state', async () => {
    const missing = await worker.fetch(new Request('https://oauth.example/callback?provider=github&code=abc'), env);
    const invalid = await worker.fetch(new Request('https://oauth.example/callback?provider=github&code=abc&state=invalid'), env);
    expect(missing.status).toBe(400);
    expect(invalid.status).toBe(400);
  });
});
```

Add an upstream-error case where GitHub returns `{ "error": "bad_verification_code" }`; assert a Decap `error` callback page with no client secret or stack trace.

- [ ] **Step 2: Run route tests to verify they fail**

Run: `npm run test:oauth -- oauth-worker/test/worker.test.js`

Expected: FAIL because `oauth-worker/src/index.js` does not exist.

- [ ] **Step 3: Implement the Worker routes**

Create `oauth-worker/src/index.js` with:

```js
import { createCallbackPage } from './callback-page.js';
import { createState, verifyState } from './state.js';

const githubAuthorizeUrl = 'https://github.com/login/oauth/authorize';
const githubTokenUrl = 'https://github.com/login/oauth/access_token';
const callbackUrl = (requestUrl) => `${requestUrl.origin}/callback?provider=github`;
const randomNonce = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};
```

The default `fetch` handler must enforce `GET`, validate required bindings, and route only `/`, `/auth`, and `/callback`. `/auth` must require `provider=github` and exact `site_id === env.ALLOWED_SITE_ID`, create signed state using `Date.now()` and `randomNonce()`, and return a `302` to GitHub with `client_id`, `redirect_uri`, `scope`, and `state` encoded through `URLSearchParams`.

`/callback` must require `provider=github`, `code`, and `state`; verify state and exact origin; then exchange the code using:

```js
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
```

Return a success callback only for a successful response with a non-empty `access_token`. Map every GitHub error to `createCallbackPage({ status: 'error', payload: { error: 'GitHub 인증에 실패했습니다.' }, origin: state.origin })` without returning upstream bodies, secrets, or stack traces.

- [ ] **Step 4: Add Wrangler production configuration**

Create `oauth-worker/wrangler.jsonc`:

```jsonc
{
  "$schema": "../node_modules/wrangler/config-schema.json",
  "name": "mane-jun-blog-oauth",
  "main": "src/index.js",
  "compatibility_date": "2026-09-19",
  "vars": {
    "ALLOWED_ORIGIN": "https://mane-jun.github.io",
    "ALLOWED_SITE_ID": "mane-jun.github.io",
    "OAUTH_SCOPE": "public_repo"
  },
  "secrets": {
    "required": ["GITHUB_OAUTH_ID", "GITHUB_OAUTH_SECRET", "OAUTH_STATE_SECRET"]
  }
}
```

- [ ] **Step 5: Run all Worker tests**

Run: `npm run test:oauth`

Expected: PASS for state, callback, routing, validation, exchange, and upstream failure.

- [ ] **Step 6: Commit the deployable Worker**

```bash
git add oauth-worker/src/index.js oauth-worker/test/worker.test.js oauth-worker/wrangler.jsonc
git commit -m "feat: add GitHub OAuth Worker"
```

---

### Task 5: Add secret safeguards and the operator runbook

**Files:**
- Modify: `.gitignore`
- Create: `tests/security.test.js`
- Modify: `README.md`

**Interfaces:**
- Consumes: Worker binding names and deployment commands from Tasks 1–4.
- Produces: An executable setup runbook and automated checks preventing credential leaks.

- [ ] **Step 1: Write the failing secret-safety test**

Create `tests/security.test.js`:

```js
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('secret hygiene', () => {
  it('ignores Worker secret files', async () => {
    const gitignore = await readFile(new URL('../.gitignore', import.meta.url), 'utf8');
    expect(gitignore).toContain('/node_modules/');
    expect(gitignore).toContain('/oauth-worker/.dev.vars*');
  });

  it('does not track OAuth secret files or GitHub token literals', () => {
    const files = execFileSync(
      'git',
      ['ls-files', '--cached', '--others', '--exclude-standard'],
      { encoding: 'utf8' },
    ).trim().split(/\r?\n/u).filter(Boolean);
    expect(files.some((file) => file.includes('.dev.vars'))).toBe(false);
    const source = files
      .filter((file) => !file.startsWith('themes/LoveIt'))
      .filter((file) => /(?:\.gitignore|\.(?:html|js|json|jsonc|md|ps1|toml|ya?ml))$/u.test(file))
      .map((file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'))
      .join('\n');
    expect(source).not.toMatch(/gh[opusr]_[A-Za-z0-9_]{20,}/u);
  });
});
```

- [ ] **Step 2: Run the security test to verify it fails**

Run: `npx vitest run tests/security.test.js`

Expected: FAIL because `.gitignore` lacks the Worker-specific entries.

- [ ] **Step 3: Add ignore rules**

Append:

```gitignore
/node_modules/
/oauth-worker/.dev.vars*
/oauth-worker/.env*
```

- [ ] **Step 4: Document authoring and one-time setup**

Add `웹 관리자에서 글 쓰기` to `README.md`, covering the admin URL, draft-first flow, direct `main` commits, automatic deployment, and the account-wide `public_repo` limitation. Include these exact OAuth App settings:

- Application name: `mane-jun blog CMS`
- Homepage URL: the exact Wrangler Worker HTTPS URL
- Authorization callback URL: the same URL plus `/callback`

Include these setup commands:

```powershell
npm install
npx wrangler login
npx wrangler whoami
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
npm run deploy:oauth -- --secrets-file oauth-worker/.dev.vars.production
```

Document this ignored local file format:

```dotenv
GITHUB_OAUTH_ID=the-value-issued-by-github
GITHUB_OAUTH_SECRET=the-value-issued-by-github
OAUTH_STATE_SECRET=the-random-value-generated-locally
```

State that real values must never be pasted into README, `wrangler.jsonc`, chat, issues, or Git commits.

- [ ] **Step 5: Run documentation and secret tests**

Run: `npx vitest run tests/security.test.js tests/cms-config.test.js`

Expected: PASS.

- [ ] **Step 6: Commit safeguards and docs**

```bash
git add .gitignore tests/security.test.js README.md
git commit -m "docs: add Decap CMS operations guide"
```

---

### Task 6: Deploy, bind the production URL, and verify end to end

**Files:**
- Modify: `static/admin/config.yml`
- Delete after use: `oauth-worker/.dev.vars.production` remains untracked and is securely removed after deployment.

**Interfaces:**
- Consumes: GitHub OAuth App credentials, Cloudflare Workers account/subdomain, deployable Worker, and local CMS config.
- Produces: The exact production `backend.base_url` and a verified login/write/deploy flow.

- [ ] **Step 1: Determine the exact Worker URL**

Run: `npx wrangler login --config oauth-worker/wrangler.jsonc`

Run: `npx wrangler whoami --config oauth-worker/wrangler.jsonc`

Use the reported Workers subdomain with the fixed Worker name `mane-jun-blog-oauth`. Confirm the name is available in the Cloudflare dashboard.

- [ ] **Step 2: Create the GitHub OAuth App**

Create `mane-jun blog CMS` in GitHub Developer Settings with the exact Worker URL as Homepage URL and the same URL plus `/callback` as Authorization callback URL. Copy the Client ID and generated Client Secret directly into the local ignored secret file.

- [ ] **Step 3: Create and verify the ignored deployment secret file**

Generate the signing secret:

Run: `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"`

Create `oauth-worker/.dev.vars.production` with the three exact values from Task 5.

Run: `git check-ignore -v oauth-worker/.dev.vars.production`

Expected: the `/oauth-worker/.dev.vars*` rule matches.

- [ ] **Step 4: Deploy the Worker with secrets**

Run: `npm run deploy:oauth -- --secrets-file oauth-worker/.dev.vars.production`

Expected: successful deployment at the exact URL derived in Step 1.

- [ ] **Step 5: Smoke-test the Worker**

Request the Worker root and expect HTTP 200 with `Decap OAuth proxy is running.` Request `/auth?provider=github&site_id=mane-jun.github.io` without following redirects and expect HTTP 302 to GitHub with `scope=public_repo` and signed `state`.

- [ ] **Step 6: Bind Decap to production**

Use `apply_patch` to replace only `base_url: http://127.0.0.1:8787` with the exact deployed HTTPS URL, without a trailing slash. Extend `tests/cms-config.test.js` with:

```js
expect(config.backend.base_url).toMatch(/^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev$/u);
```

For an intentional custom domain, assert equality with that exact HTTPS origin instead.

- [ ] **Step 7: Run the full automated verification**

Run: `npm test`

Expected: all tests pass.

Run: `git diff --check`

Expected: no whitespace errors.

Run Hugo 0.164.0:

```powershell
hugo --gc --minify --baseURL "https://mane-jun.github.io/mane-jun-blog/"
```

Expected: exit code 0 and both `public/admin/index.html` and `public/admin/config.yml` exist. If Hugo is unavailable locally, run this exact verification through the existing GitHub Actions workflow before claiming completion.

- [ ] **Step 8: Commit the production binding**

```bash
git add static/admin/config.yml tests/cms-config.test.js
git commit -m "chore: connect CMS to OAuth Worker"
```

- [ ] **Step 9: Verify the live editorial flow**

After GitHub Pages deploys:

1. Open `https://mane-jun.github.io/mane-jun-blog/admin/` and sign in through GitHub.
2. Create draft `CMS 연결 테스트`, attach one small image, and save.
3. Confirm the expected leaf bundle, adjacent image, and relative image path in GitHub.
4. Confirm the draft is absent from the public site.
5. Turn off `초안`, save, and confirm the post appears after Actions finishes.
6. Edit the summary, save, and confirm the deployed update.
7. Delete the test post and image through CMS and confirm the deletion deploys.

- [ ] **Step 10: Remove the local production secret file securely**

Resolve the absolute path of `oauth-worker/.dev.vars.production`, verify it is inside this repository's `oauth-worker` directory, and delete only that file. Then run `git status --short` and confirm no secret file appears.

---

## Final Verification Checklist

- [ ] `npm test` passes.
- [ ] `git diff --check` passes.
- [ ] Hugo 0.164.0 production build passes.
- [ ] `public/admin/index.html` and `public/admin/config.yml` are generated.
- [ ] Worker health and authorization redirect checks pass.
- [ ] GitHub login succeeds from the production admin URL.
- [ ] Draft, image upload, publish, edit, and delete flows succeed.
- [ ] GitHub Actions deploys the CMS commits successfully.
- [ ] No secret or OAuth token is tracked or left in the workspace.
