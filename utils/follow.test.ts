// utils/follow.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const viewer = { id: 'u1', email: 'a@b.com', role: 'listener' as const, following: ['a1'] };

describe('toggleFollow — mock mode', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_API_URL;
  });
  afterEach(() => {
    vi.doUnmock('./localStorage');
  });

  it('writes both sides of the edge without a network call', async () => {
    const updateRecord = vi.fn();
    const fetchMock = vi.fn();
    vi.doMock('./localStorage', () => ({ getItem: () => null, updateRecord }));
    vi.stubGlobal('fetch', fetchMock);

    const { toggleFollow } = await import('./follow');
    const result = await toggleFollow(viewer as never, 'u2', 10, false);

    expect(result).toEqual({ isFollowing: true, followers: 11, following: ['a1', 'u2'] });
    expect(updateRecord).toHaveBeenCalledWith('users', 'u2', { followers: 11 });
    expect(updateRecord).toHaveBeenCalledWith('users', 'u1', { following: ['a1', 'u2'] });
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe('toggleFollow — API mode', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_API_URL = 'http://backend.test/api';
  });
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_API_URL;
    vi.unstubAllGlobals();
  });

  it('POSTs the follow edge and does not touch localStorage', async () => {
    const updateRecord = vi.fn();
    vi.doMock('./localStorage', () => ({ getItem: () => null, updateRecord }));
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    const { toggleFollow } = await import('./follow');
    const result = await toggleFollow(viewer as never, 'u2', 10, false);

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('http://backend.test/api/users/u2/follow/');
    expect(opts.method).toBe('POST');
    expect(result.isFollowing).toBe(true);
    expect(result.followers).toBe(11);
    expect(updateRecord).not.toHaveBeenCalled();
    vi.doUnmock('./localStorage');
  });

  it('DELETEs the edge when already following', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    vi.stubGlobal('fetch', fetchMock);

    const { toggleFollow } = await import('./follow');
    const result = await toggleFollow(viewer as never, 'a1', 10, true);

    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE');
    expect(result).toEqual({ isFollowing: false, followers: 9, following: [] });
  });

  it('keeps the previous state when the write is rejected', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({ detail: 'You cannot follow yourself.' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { toggleFollow } = await import('./follow');
    const result = await toggleFollow(viewer as never, 'u2', 10, false);

    expect(result).toEqual({ isFollowing: false, followers: 10, following: ['a1'] });
  });
});
