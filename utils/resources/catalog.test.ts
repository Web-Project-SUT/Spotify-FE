// utils/resources/catalog.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mapTrack, mapAlbum } from './catalog';

// These pure mappers are the contract between the DRF response shapes and
// the frontend's mock types; lock them down independently of any network.
describe('catalog mappers', () => {
  it('maps a backend track onto the mock Song shape', () => {
    const song = mapTrack({
      id: 't1',
      artist: 'a1',
      album: 'al1',
      title: 'Neon Skyline',
      genre: 'pop',
      releaseYear: 2024,
      releasedAt: '2024-06-01T00:00:00Z',
      releaseType: 'single',
      durationMs: 180000,
      playCount: 42,
      uniqueListenerCount: 30,
      earlyAccessUntil: null,
      cover: null,
      audioHigh: null,
      audioLow: null,
    });
    expect(song).toMatchObject({
      id: 't1',
      title: 'Neon Skyline',
      artistId: 'a1',
      plays: 42,
      streamCount: 42,
      listenerCount: 30,
      genre: 'pop',
      year: 2024,
      releaseType: 'single',
    });
    // No cover from the backend -> emoji placeholder the UI already renders.
    expect(song.cover).toBe('🎵');
    expect(song.audioUrlHigh).toBeUndefined();
  });

  it('falls back to releasedAt year when releaseYear is null', () => {
    const song = mapTrack({
      id: 't2',
      artist: 'a2',
      album: null,
      title: 'Slow Drift',
      genre: null,
      releaseYear: null,
      releasedAt: '2020-01-15T00:00:00Z',
      releaseType: 'single',
      durationMs: 200000,
      playCount: 0,
      uniqueListenerCount: 0,
      earlyAccessUntil: null,
      cover: null,
      audioHigh: null,
      audioLow: null,
    });
    expect(song.year).toBe(2020);
  });

  it('maps a backend album onto the mock Album shape', () => {
    const album = mapAlbum({
      id: 'al1',
      artist: 'a1',
      title: 'Skyline Echoes',
      releaseYear: 2024,
      releasedAt: null,
      cover: null,
    });
    expect(album).toEqual({
      id: 'al1',
      title: 'Skyline Echoes',
      artistId: 'a1',
      cover: undefined,
      releaseYear: 2024,
    });
  });
});

describe('catalog loaders — mock fallback (API disabled)', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it('loadSongs returns the localStorage mock when the backend is off', async () => {
    vi.doMock('../localStorage', () => ({
      getItem: (key: string) => (key === 'songs' ? [{ id: 's1', title: 'X' }] : []),
    }));
    const { loadSongs } = await import('./catalog');
    const songs = await loadSongs();
    expect(songs).toEqual([{ id: 's1', title: 'X' }]);
  });

  it('loadArtistNames derives the map from seeded users in mock mode', async () => {
    vi.doMock('../localStorage', () => ({
      getItem: (key: string) =>
        key === 'users'
          ? [
              { id: 'a1', role: 'artist', stageName: 'Nova Ray' },
              { id: 'u1', role: 'listener' },
            ]
          : [],
    }));
    const { loadArtistNames } = await import('./catalog');
    expect(await loadArtistNames()).toEqual({ a1: 'Nova Ray' });
  });

  afterEach(() => {
    vi.doUnmock('../localStorage');
  });
});

describe('catalog loaders — API mode (mapping + pagination)', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_API_URL = 'http://backend.test/api';
  });
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_API_URL;
    vi.restoreAllMocks();
  });

  it('loadAlbums walks every page and maps the results', async () => {
    const page1 = {
      count: 3,
      next: 'http://backend.test/api/albums/?page=2',
      previous: null,
      results: [{ id: 'al1', artist: 'a1', title: 'One', releaseYear: 2024, releasedAt: null, cover: null }],
    };
    const page2 = {
      count: 3,
      next: null,
      previous: 'http://backend.test/api/albums/',
      results: [{ id: 'al2', artist: 'a2', title: 'Two', releaseYear: 2023, releasedAt: null, cover: null }],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => page1 })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => page2 });
    vi.stubGlobal('fetch', fetchMock);

    const { loadAlbums } = await import('./catalog');
    const albums = await loadAlbums();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(albums.map((a) => a.id)).toEqual(['al1', 'al2']);
    expect(albums[0]).toMatchObject({ title: 'One', artistId: 'a1', releaseYear: 2024 });
  });
});
