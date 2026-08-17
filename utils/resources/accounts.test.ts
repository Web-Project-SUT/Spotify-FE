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

  it('loadPendingArtists filters the seeded users to pending artists', async () => {
    vi.doMock('../localStorage', () => ({
      getItem: (key: string) =>
        key === 'users'
          ? [
              { id: 'a1', role: 'artist', status: 'pending', stageName: 'New Wave' },
              { id: 'a2', role: 'artist', status: 'active', stageName: 'Nova' },
              { id: 'u1', role: 'listener', status: 'active' },
            ]
          : [],
    }));
    const { loadPendingArtists } = await import('./accounts');
    const pending = await loadPendingArtists();
    expect(pending.map((a) => a.id)).toEqual(['a1']);
    vi.doUnmock('../localStorage');
  });

  it('approveArtist activates the user and notifies them', async () => {
    const updateRecord = vi.fn();
    const addRecord = vi.fn();
    vi.doMock('../localStorage', () => ({ getItem: () => [], updateRecord, addRecord }));
    const { approveArtist } = await import('./accounts');
    const artist = { id: 'a1', role: 'artist', email: 'a1@demo.com' } as any;
    expect(await approveArtist(artist)).toBe(true);
    expect(updateRecord).toHaveBeenCalledWith('users', 'a1', { status: 'active' });
    expect(addRecord).toHaveBeenCalledWith('notifications', expect.objectContaining({ userId: 'a1', type: 'approval' }));
    vi.doUnmock('../localStorage');
  });

  it('rejectArtist marks the user rejected and includes the reason', async () => {
    const updateRecord = vi.fn();
    const addRecord = vi.fn();
    vi.doMock('../localStorage', () => ({ getItem: () => [], updateRecord, addRecord }));
    const { rejectArtist } = await import('./accounts');
    const artist = { id: 'a1', role: 'artist', email: 'a1@demo.com' } as any;
    expect(await rejectArtist(artist, 'Low quality samples')).toBe(true);
    expect(updateRecord).toHaveBeenCalledWith('users', 'a1', { status: 'rejected' });
    expect(addRecord).toHaveBeenCalledWith(
      'notifications',
      expect.objectContaining({ userId: 'a1', type: 'approval', message: expect.stringContaining('Low quality samples') })
    );
    vi.doUnmock('../localStorage');
  });

  it('loadArtistSampleWorks returns nothing without a backend', async () => {
    const { loadArtistSampleWorks } = await import('./accounts');
    expect(await loadArtistSampleWorks('a1')).toEqual([]);
  });

  it('loadUsers reads the seeded users collection', async () => {
    vi.doMock('../localStorage', () => ({
      getItem: (key: string) =>
        key === 'users'
          ? [
              { id: 'u1', email: 'l@demo.com', role: 'listener', tier: 'gold', displayName: 'L' },
              { id: 'a1', email: 'a@demo.com', role: 'artist', stageName: 'Nova' },
            ]
          : [],
      addRecord: vi.fn(),
      updateRecord: vi.fn(),
    }));
    const { loadUsers } = await import('./accounts');
    const users = await loadUsers();
    expect(users.map((u) => u.email)).toEqual(['l@demo.com', 'a@demo.com']);
    expect(users[1].displayName).toBe('Nova');
    vi.doUnmock('../localStorage');
  });

  it('createUser adds a local record and reports no error', async () => {
    const addRecord = vi.fn();
    vi.doMock('../localStorage', () => ({ getItem: () => [], addRecord, updateRecord: vi.fn() }));
    const { createUser } = await import('./accounts');
    const { user, error } = await createUser({
      email: 'made@demo.com',
      password: 'password123',
      role: 'support',
    });
    expect(error).toBeNull();
    expect(user?.email).toBe('made@demo.com');
    expect(addRecord).toHaveBeenCalledWith('users', expect.objectContaining({ role: 'support' }));
    vi.doUnmock('../localStorage');
  });

  it('updateUser writes the role change to the local record', async () => {
    const updateRecord = vi.fn();
    vi.doMock('../localStorage', () => ({
      getItem: (key: string) =>
        key === 'users' ? [{ id: 'u1', email: 'l@demo.com', role: 'artist' }] : [],
      addRecord: vi.fn(),
      updateRecord,
    }));
    const { updateUser } = await import('./accounts');
    const { user } = await updateUser('u1', { role: 'artist' });
    expect(updateRecord).toHaveBeenCalledWith('users', 'u1', { role: 'artist' });
    expect(user?.role).toBe('artist');
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

  it('loadUsers walks the paginated roster', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: 'u1',
              email: 'l@demo.com',
              username: 'l',
              displayName: 'L',
              role: 'listener',
              status: 'active',
              tier: 'gold',
              createdAt: '2026-01-01T00:00:00Z',
            },
          ],
        }),
      })
    );
    const { loadUsers } = await import('./accounts');
    const users = await loadUsers();
    expect(users).toEqual([
      {
        id: 'u1',
        email: 'l@demo.com',
        username: 'l',
        displayName: 'L',
        role: 'listener',
        status: 'active',
        tier: 'gold',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ]);
  });

  it('createUser POSTs /users/ and surfaces the field errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({
        detail: 'Invalid input.',
        code: 'invalid',
        fields: { email: ['Already taken.'] },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { createUser } = await import('./accounts');
    const { user, error } = await createUser({
      email: 'taken@demo.com',
      password: 'password123',
      role: 'listener',
    });
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('http://backend.test/api/users/');
    expect(opts.method).toBe('POST');
    expect(user).toBeNull();
    expect(error?.fields?.email?.[0]).toBe('Already taken.');
  });

  it('updateUser PATCHes the role and returns the updated row', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'u1',
        email: 'l@demo.com',
        username: 'l',
        displayName: 'L',
        role: 'artist',
        status: 'active',
        tier: 'basic',
        createdAt: '2026-01-01T00:00:00Z',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { updateUser } = await import('./accounts');
    const { user, error } = await updateUser('u1', { role: 'artist' });
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('http://backend.test/api/users/u1/');
    expect(opts.method).toBe('PATCH');
    expect(JSON.parse(opts.body)).toEqual({ role: 'artist' });
    expect(error).toBeNull();
    expect(user?.role).toBe('artist');
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

  it('loadPendingArtists reads /artists/pending/ and maps into the User shape', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          count: 1,
          next: null,
          previous: null,
          results: [
            { id: 'a1', stageName: 'New Wave', email: 'a1@demo.com', portfolioUrl: 'http://x.com', createdAt: '2026-01-01' },
          ],
        }),
      })
    );
    const { loadPendingArtists } = await import('./accounts');
    const pending = await loadPendingArtists();
    expect(pending).toEqual([
      { id: 'a1', email: 'a1@demo.com', role: 'artist', status: 'pending', stageName: 'New Wave', portfolio: 'http://x.com' },
    ]);
  });

  it('approveArtist POSTs to /artists/{id}/approve/', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);
    const { approveArtist } = await import('./accounts');
    const artist = { id: 'a1' } as any;
    expect(await approveArtist(artist)).toBe(true);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('http://backend.test/api/artists/a1/approve/');
    expect(opts.method).toBe('POST');
  });

  it('rejectArtist POSTs { reason } to /artists/{id}/reject/', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);
    const { rejectArtist } = await import('./accounts');
    const artist = { id: 'a1' } as any;
    expect(await rejectArtist(artist, 'Low quality samples')).toBe(true);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('http://backend.test/api/artists/a1/reject/');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ reason: 'Low quality samples' });
  });

  it('loadArtistSampleWorks maps file paths into absolute URLs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          count: 1,
          next: null,
          previous: null,
          results: [{ id: 'sw1', title: 'Demo track', file: '/media/samples/demo.mp3' }],
        }),
      })
    );
    const { loadArtistSampleWorks } = await import('./accounts');
    const works = await loadArtistSampleWorks('a1');
    expect(works).toEqual([
      { id: 'sw1', title: 'Demo track', fileUrl: 'http://backend.test/media/samples/demo.mp3' },
    ]);
  });
});
