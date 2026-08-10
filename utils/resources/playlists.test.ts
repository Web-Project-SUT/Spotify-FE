// utils/resources/playlists.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('playlists resource — mock fallback (API disabled)', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_API_URL;
  });
  afterEach(() => vi.doUnmock('../localStorage'));

  it('loadPlaylists returns only the current user\'s playlists', async () => {
    vi.doMock('../localStorage', () => ({
      getItem: (key: string) =>
        key === 'playlists'
          ? [
              { id: 'p1', userId: 'u1', title: 'Mine', songIds: [] },
              { id: 'p2', userId: 'u2', title: 'Theirs', songIds: [] },
            ]
          : [],
      addRecord: vi.fn(),
      deleteRecord: vi.fn(),
      updateRecord: vi.fn(),
    }));
    const { loadPlaylists } = await import('./playlists');
    const mine = await loadPlaylists('u1');
    expect(mine.map((p) => p.id)).toEqual(['p1']);
  });

  it('createPlaylist writes to the mock store and returns the new playlist', async () => {
    const addRecord = vi.fn();
    vi.doMock('../localStorage', () => ({
      getItem: () => [],
      addRecord,
      deleteRecord: vi.fn(),
      updateRecord: vi.fn(),
    }));
    const { createPlaylist } = await import('./playlists');
    const p = await createPlaylist('u1', 'Focus');
    expect(p).toMatchObject({ userId: 'u1', title: 'Focus', songIds: [] });
    expect(addRecord).toHaveBeenCalledWith('playlists', expect.objectContaining({ title: 'Focus' }));
  });

  it('addTrackToPlaylist appends the track id in mock mode', async () => {
    const updateRecord = vi.fn();
    vi.doMock('../localStorage', () => ({
      getItem: (key: string) =>
        key === 'playlists' ? [{ id: 'p1', userId: 'u1', title: 'Mine', songIds: ['s0'] }] : [],
      addRecord: vi.fn(),
      deleteRecord: vi.fn(),
      updateRecord,
    }));
    const { addTrackToPlaylist } = await import('./playlists');
    await addTrackToPlaylist('p1', 's1');
    expect(updateRecord).toHaveBeenCalledWith('playlists', 'p1', { songIds: ['s0', 's1'] });
  });
});

describe('playlists resource — API mode', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_API_URL = 'http://backend.test/api';
  });
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_API_URL;
    vi.restoreAllMocks();
  });

  it('createPlaylist POSTs { title, isPublic } and maps the response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        id: 'srv1',
        owner: 'u1',
        title: 'Focus',
        isPublic: false,
        cover: null,
        createdAt: 'now',
        trackCount: 0,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { createPlaylist } = await import('./playlists');
    const p = await createPlaylist('u1', 'Focus');

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('http://backend.test/api/playlists/');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ title: 'Focus', isPublic: false });
    expect(p).toMatchObject({ id: 'srv1', userId: 'u1', title: 'Focus' });
  });

  it('addTrackToPlaylist sends { track } to the tracks endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);
    const { addTrackToPlaylist } = await import('./playlists');
    await addTrackToPlaylist('p1', 't9');

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('http://backend.test/api/playlists/p1/tracks/');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ track: 't9' });
  });

  it('loadPlaylistDetail maps tracks into ordered songIds', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'p1',
        owner: 'u1',
        title: 'Mix',
        isPublic: true,
        cover: null,
        createdAt: 'now',
        tracks: [
          { id: 't2', title: 'B', artist: 'a1', durationMs: 1, position: 1 },
          { id: 't1', title: 'A', artist: 'a1', durationMs: 1, position: 0 },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { loadPlaylistDetail } = await import('./playlists');
    const detail = await loadPlaylistDetail('p1');
    expect(detail?.songIds).toEqual(['t1', 't2']);
  });
});
