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
