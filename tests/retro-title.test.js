import { describe, expect, it, vi } from 'vitest';
import { installRetroTitle, retroTitle, titledNewEntryHash } from '../static/admin/retro-title.js';

describe('retrospective title', () => {
  it('uses the KST date for daily retrospectives', () => {
    expect(retroTitle('daily', new Date('2026-09-21T03:00:00Z'))).toBe('2026/09/21 일간회고');
    // 2026-09-21 23:30 UTC is already 2026-09-22 in KST.
    expect(retroTitle('daily', new Date('2026-09-21T15:30:00Z'))).toBe('2026/09/22 일간회고');
  });

  it('uses the previous KST month for monthly retrospectives', () => {
    expect(retroTitle('monthly', new Date('2026-09-06T12:00:00Z'))).toBe('2026/08 월간회고');
    expect(retroTitle('monthly', new Date('2027-01-05T12:00:00Z'))).toBe('2026/12 월간회고');
    // 2026-09-30 16:00 UTC is 2026-10-01 in KST, so the previous month is September.
    expect(retroTitle('monthly', new Date('2026-09-30T16:00:00Z'))).toBe('2026/09 월간회고');
  });

  it('adds a title only to a bare new retrospective route', () => {
    const now = new Date('2026-09-21T03:00:00Z');
    expect(titledNewEntryHash('#/collections/daily/new', now))
      .toBe(`#/collections/daily/new?title=${encodeURIComponent('2026/09/21 일간회고')}`);
    expect(titledNewEntryHash('#/collections/monthly/new', now))
      .toBe(`#/collections/monthly/new?title=${encodeURIComponent('2026/08 월간회고')}`);
    expect(titledNewEntryHash('#/collections/daily/new?title=x', now)).toBeNull();
    expect(titledNewEntryHash('#/collections/posts/new', now)).toBeNull();
    expect(titledNewEntryHash('#/collections/daily/entries/2026-09-21-일간회고/index', now)).toBeNull();
  });
});

describe('installRetroTitle', () => {
  const fakeWindow = (hash) => {
    const listeners = {};
    return {
      listeners,
      location: { hash, replace: vi.fn(), reload: vi.fn() },
      addEventListener: (type, listener) => { listeners[type] = listener; },
    };
  };

  it('reloads a bare new retrospective route with a title', () => {
    const win = fakeWindow('#/collections/daily/new');
    installRetroTitle(win);
    expect(win.location.replace).toHaveBeenCalledWith(expect.stringMatching(/^#\/collections\/daily\/new\?title=/u));
    expect(win.location.reload).toHaveBeenCalledOnce();
  });

  it('reacts to later navigation and leaves other routes alone', () => {
    const win = fakeWindow('#/collections/posts');
    installRetroTitle(win);
    expect(win.location.replace).not.toHaveBeenCalled();

    win.location.hash = '#/collections/monthly/new';
    win.listeners.hashchange();
    expect(win.location.replace).toHaveBeenCalledWith(expect.stringMatching(/^#\/collections\/monthly\/new\?title=/u));
    expect(win.location.reload).toHaveBeenCalledOnce();
  });
});
