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
  const bytes = Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
  // Reject non-canonical encodings whose unused trailing bits were altered.
  if (toBase64Url(bytes) !== value) throw new Error();
  return bytes;
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
    if (!payloadPart || !signaturePart || extra !== undefined) throw new Error();
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
