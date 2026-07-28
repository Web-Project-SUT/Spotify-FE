// utils/preferences.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const store: Record<string, unknown> = {};

vi.mock('./localStorage', () => ({
  getItem: vi.fn((key: string) => (key in store ? store[key] : null)),
  setItem: vi.fn((key: string, value: unknown) => {
    store[key] = value;
  }),
}));

import { readPreferences, writePreferences, hydratePreferences, DEFAULT_PREFERENCES } from './preferences';

function setCurrentUser(id: string | null) {
  if (id === null) delete store.currentUser;
  else store.currentUser = { id };
}

describe('utils/preferences', () => {
  beforeEach(() => {
    Object.keys(store).forEach((key) => delete store[key]);
    vi.clearAllMocks();
  });

  it('returns defaults when nothing is stored', () => {
    expect(readPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it('isolates preferences per user', () => {
    setCurrentUser('u1');
    writePreferences({ volume: 10 });

    setCurrentUser('u2');
    expect(readPreferences().volume).toBe(DEFAULT_PREFERENCES.volume);

    setCurrentUser('u1');
    expect(readPreferences().volume).toBe(10);
  });

  it('uses an __anon__ bucket when logged out', () => {
    setCurrentUser(null);
    writePreferences({ language: 'fa' });
    const buckets = store.userPrefs as Record<string, { language?: string }>;
    expect(buckets.__anon__).toEqual(expect.objectContaining({ language: 'fa' }));
  });

  it('treats a legacy flat userPrefs object as the current bucket', () => {
    setCurrentUser(null);
    store.userPrefs = { language: 'fa', volume: 33 };
    expect(readPreferences()).toEqual(expect.objectContaining({ language: 'fa', volume: 33 }));
  });

  it('merges a patch instead of clobbering other fields', () => {
    setCurrentUser('u1');
    writePreferences({ language: 'fa' });
    writePreferences({ volume: 55 });
    expect(readPreferences()).toEqual(expect.objectContaining({ language: 'fa', volume: 55 }));
  });

  it('clamps volume to the 0-100 range', () => {
    setCurrentUser('u1');
    writePreferences({ volume: 150 });
    expect(readPreferences().volume).toBe(100);

    writePreferences({ volume: -20 });
    expect(readPreferences().volume).toBe(0);
  });

  it('hydrate overwrites the bucket wholesale rather than merging', () => {
    setCurrentUser('u1');
    writePreferences({ volume: 10, shuffle: true });
    hydratePreferences({ volume: 99, language: 'es' });
    expect(readPreferences()).toEqual(
      expect.objectContaining({ volume: 99, language: 'es', shuffle: false })
    );
  });

  it('never calls fetch when the API env var is unset, even after the debounce fires', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    vi.useFakeTimers();

    setCurrentUser('u1');
    writePreferences({ volume: 42 });
    vi.runAllTimers();

    expect(fetchSpy).not.toHaveBeenCalled();

    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
});
