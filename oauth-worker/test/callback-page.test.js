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
