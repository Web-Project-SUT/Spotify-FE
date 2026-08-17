// utils/resources/accounts.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('accounts resource — mock mode', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it('requestPasswordReset resolves without a network call', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { requestPasswordReset } = await import('./accounts');
    await expect(requestPasswordReset('a@b.com')).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('confirmPasswordReset returns ok in mock mode', async () => {
    const { confirmPasswordReset } = await import('./accounts');
    expect(await confirmPasswordReset('u', 't', 'password123')).toEqual({ ok: true });
  });

  it('loadUserProfile reads the seeded users collection', async () => {
    vi.doMock('../localStorage', () => ({
      getItem: (key: string) =>
        key === 'users'
          ? [{ id: 'u2', username: 'other', displayName: 'Other', role: 'listener', tier: 'silver', followers: 10, following: [] }]
          : { id: 'u1', following: ['u2'] },
      updateRecord: vi.fn(),
      deleteRecord: vi.fn(),
    }));
    const { loadUserProfile } = await import('./accounts');
    expect(await loadUserProfile('u2')).toMatchObject({
      id: 'u2',
      displayName: 'Other',
      tier: 'silver',
      followerCount: 10,
      followingCount: 0,
      isFollowing: true,
    });
    expect(await loadUserProfile('nope')).toBeNull();
    vi.doUnmock('../localStorage');
  });

  it('updateMe writes to the local record and reports no error', async () => {
    const updateRecord = vi.fn();
    vi.doMock('../localStorage', () => ({
      getItem: (key: string) => (key === 'currentUser' ? { id: 'u1' } : []),
      updateRecord,
      deleteRecord: vi.fn(),
    }));
    const { updateMe } = await import('./accounts');
    expect(await updateMe({ displayName: 'Renamed' })).toBeNull();
    expect(updateRecord).toHaveBeenCalledWith('users', 'u1', { displayName: 'Renamed' });
    vi.doUnmock('../localStorage');
  });

  it('deleteMe removes the local record', async () => {
    const deleteRecord = vi.fn();
    vi.doMock('../localStorage', () => ({
      getItem: (key: string) => (key === 'currentUser' ? { id: 'u1' } : []),
      updateRecord: vi.fn(),
      deleteRecord,
    }));
    const { deleteMe } = await import('./accounts');
    expect(await deleteMe()).toBe(true);
    expect(deleteRecord).toHaveBeenCalledWith('users', 'u1');
    vi.doUnmock('../localStorage');
  });
});

describe('accounts resource — API mode', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_API_URL = 'http://backend.test/api';
  });
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_API_URL;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('requestPasswordReset POSTs the email', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);
    const { requestPasswordReset } = await import('./accounts');
    await requestPasswordReset('a@b.com');
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('http://backend.test/api/auth/password-reset/');
    expect(JSON.parse(opts.body)).toEqual({ email: 'a@b.com' });
  });

  it('loadUserProfile maps the camelCase payload and absolutizes the avatar', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'u2',
          username: 'other',
          displayName: 'Other',
          role: 'listener',
          tier: 'gold',
          bio: 'hi',
          avatar: '/media/avatars/a.png',
          followerCount: 3,
          followingCount: 4,
          isFollowing: true,
        }),
      })
    );
    const { loadUserProfile } = await import('./accounts');
    const profile = await loadUserProfile('u2');
    expect(profile).toMatchObject({
      id: 'u2',
      tier: 'gold',
      followerCount: 3,
      followingCount: 4,
      isFollowing: true,
      avatar: 'http://backend.test/media/avatars/a.png',
    });
  });

  it('updateMe PATCHes /auth/me/ and surfaces the field errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({ detail: 'Invalid input.', code: 'invalid', fields: { email: ['Already taken.'] } }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { updateMe } = await import('./accounts');
    const error = await updateMe({ email: 'taken@demo.com' });
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('http://backend.test/api/auth/me/');
    expect(opts.method).toBe('PATCH');
    expect(JSON.parse(opts.body)).toEqual({ email: 'taken@demo.com' });
    expect(error?.fields?.email?.[0]).toBe('Already taken.');
  });

  it('deleteMe DELETEs /auth/me/ and reports the outcome', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    vi.stubGlobal('fetch', fetchMock);
    const { deleteMe } = await import('./accounts');
    expect(await deleteMe()).toBe(true);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('http://backend.test/api/auth/me/');
    expect(opts.method).toBe('DELETE');
  });

  it('confirmPasswordReset succeeds on 2xx and fails otherwise', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 }));
    let mod = await import('./accounts');
    expect(await mod.confirmPasswordReset('u', 't', 'password123')).toEqual({ ok: true });

    vi.resetModules();
    process.env.NEXT_PUBLIC_API_URL = 'http://backend.test/api';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400 }));
    mod = await import('./accounts');
    const bad = await mod.confirmPasswordReset('u', 'bad', 'password123');
    expect(bad.ok).toBe(false);
    expect(bad.error).toBeTruthy();
  });
});
