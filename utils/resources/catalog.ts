// utils/resources/catalog.ts
//
// The catalog integration seam. Components used to read the mock catalog
// straight out of localStorage (getItem('songs'), getItem('albums'), and a
// role==='artist' scan of getItem('users')). They now call these loaders
// instead. When the backend is enabled the data comes from DRF, mapped into
// the exact mock shapes the rest of the app already understands; when it is
// not, the loaders return the same localStorage values as before, so every
// mock-mode test keeps passing untouched.
import { apiEnabled } from '../api';
import { getItem } from '../localStorage';
import { Song, Album } from '../types';
import { fetchAll, mediaUrl } from './http';

// ---- Backend response shapes (camelCased by drf-camel-case) -------------

interface BackendTrack {
  id: string;
  artist: string;
  album: string | null;
  title: string;
  genre: string | null;
  releaseYear: number | null;
  releasedAt: string | null;
  releaseType: 'single' | 'album';
  durationMs: number;
  playCount: number;
  uniqueListenerCount: number;
  earlyAccessUntil: string | null;
  cover: string | null;
  audioHigh: string | null;
  audioLow: string | null;
  lyrics?: string | null;
}

interface BackendAlbum {
  id: string;
  artist: string;
  title: string;
  releaseYear: number | null;
  releasedAt: string | null;
  cover: string | null;
}

interface BackendArtist {
  id: string;
  stageName?: string | null;
  displayName?: string | null;
}

// ---- Mappers: backend -> mock types -------------------------------------

const yearFrom = (year: number | null, iso: string | null): number | undefined =>
  year ?? (iso ? new Date(iso).getFullYear() : undefined);

export function mapTrack(t: BackendTrack): Song {
  return {
    id: t.id,
    title: t.title,
    artistId: t.artist,
    cover: mediaUrl(t.cover) ?? '🎵',
    plays: t.playCount ?? 0,
    streamCount: t.playCount ?? 0,
    listenerCount: t.uniqueListenerCount ?? 0,
    genre: t.genre ?? undefined,
    year: yearFrom(t.releaseYear, t.releasedAt),
    releaseType: t.releaseType,
    lyrics: t.lyrics ?? undefined,
    audioUrlHigh: mediaUrl(t.audioHigh),
    audioUrlLow: mediaUrl(t.audioLow),
  };
}

export function mapAlbum(a: BackendAlbum): Album {
  return {
    id: a.id,
    title: a.title,
    artistId: a.artist,
    cover: mediaUrl(a.cover),
    releaseYear: yearFrom(a.releaseYear, a.releasedAt),
  };
}

// ---- Loaders (API when enabled, mock localStorage otherwise) ------------

export async function loadSongs(): Promise<Song[]> {
  if (!apiEnabled) return getItem('songs') || [];
  const tracks = await fetchAll<BackendTrack>('/tracks/');
  return tracks.map(mapTrack);
}

export async function loadAlbums(): Promise<Album[]> {
  if (!apiEnabled) return getItem('albums') || [];
  const albums = await fetchAll<BackendAlbum>('/albums/');
  return albums.map(mapAlbum);
}

// Returns an artistId -> display label map. Mock mode derives it from the
// seeded users the way the components always have; API mode reads /artists/.
export async function loadArtistNames(): Promise<Record<string, string>> {
  if (!apiEnabled) {
    const users: Array<{ id: string; role: string; stageName?: string }> = getItem('users') || [];
    const map: Record<string, string> = {};
    users.forEach((u) => {
      if (u.role === 'artist' && u.stageName) map[u.id] = u.stageName;
    });
    return map;
  }
  const artists = await fetchAll<BackendArtist>('/artists/');
  const map: Record<string, string> = {};
  artists.forEach((a) => {
    const name = a.stageName || a.displayName;
    if (name) map[a.id] = name;
  });
  return map;
}
