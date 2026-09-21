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
