import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { DECAP_VERSION, HEADER, PATCHES, patchDecap } from '../scripts/patch-decap.mjs';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const count = (text, part) => text.split(part).length - 1;

describe('patched Decap CMS bundle', () => {
  it('replaces each original snippet once', () => {
    const source = PATCHES.map(({ find }) => `before;${find};after`).join('\n');
    const patched = patchDecap(source);

    expect(patched.startsWith(HEADER)).toBe(true);
    for (const { find, replace } of PATCHES) {
      expect(count(patched, replace)).toBeGreaterThanOrEqual(1);
      expect(count(patched, find)).toBe(0);
    }
  });

  it('stops when an original snippet is missing or repeated, as after a Decap upgrade', () => {
    const all = PATCHES.map(({ find }) => find);

    expect(() => patchDecap(all.slice(1).join('\n'))).toThrow(PATCHES[0].name);
    expect(() => patchDecap([...all, all[0]].join('\n'))).toThrow('found it 2 times');
  });

  it('is what the admin page loads, built from the pinned release', async () => {
    const bundle = (await read('static/admin/decap-cms.js')).replace(/\r\n/gu, '\n');

    expect(bundle.startsWith(HEADER)).toBe(true);
    expect(bundle).toContain(`console.log("decap-cms ${DECAP_VERSION}")`);
    for (const { name, find, replace } of PATCHES) {
      expect(count(bundle, find), name).toBe(0);
      if (replace.trim()) expect(count(bundle, replace), name).toBe(1);
    }
  });
});
