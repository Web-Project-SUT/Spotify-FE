// utils/resources/catalog.ts
//
// The catalog integration seam. Components used to read the mock catalog
// straight out of localStorage (getItem('songs'), getItem('albums'), and a
// role==='artist' scan of getItem('users')). They now call these loaders
// instead. When the backend is enabled the data comes from DRF, mapped into
// the exact mock shapes the rest of the app already understands; when it is
// not, the loaders return the same localStorage values as before, so every
// mock-mode test keeps passing untouched.
import { apiEnabled, apiFetch } from '../api';
import { getItem, deleteRecord } from '../localStorage';
import { Song, Album, User } from '../types';
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
  releaseType: 'single' | 'album_track';
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

// Full artist profile. API mode reads /artists/{id}/ (stage name, bio,
// verified flag, aggregate plays/listeners); mock mode reconstructs an
// equivalent object from the seeded users + songs.
export interface ArtistDetail {
  id: string;
  stageName: string;
  bio: string;
  verified: boolean;
  totalPlays: number;
  totalListeners: number;
}

interface BackendArtistDetail {
  id: string;
  stageName: string;
  portfolioUrl: string;
  bio: string;
  verified: boolean;
  totalPlays: number;
  totalListeners: number;
}

export async function loadArtist(id: string): Promise<ArtistDetail | null> {
  if (apiEnabled) {
    const a = await apiFetch<BackendArtistDetail>(`/artists/${id}/`);
    if (a) {
      return {
        id: a.id,
        stageName: a.stageName,
        bio: a.bio || '',
        verified: a.verified,
        totalPlays: a.totalPlays || 0,
        totalListeners: a.totalListeners || 0,
      };
    }
  }
  const users: User[] = getItem('users') || [];
  const u = users.find((x) => x.id === id);
  if (!u) return null;
  const songs: Song[] = getItem('songs') || [];
  const mine = songs.filter((s) => s.artistId === id);
  return {
    id,
    stageName: u.stageName || u.displayName || 'Unknown artist',
    bio: u.bio || '',
    verified: u.status === 'active',
    totalPlays: mine.reduce((n, s) => n + (s.plays || 0), 0),
    totalListeners: mine.reduce((n, s) => n + (s.listenerCount || 0), 0),
  };
}

// Delete one of the artist's own tracks (DELETE /tracks/{id}/), mirrored
// into the mock store when the backend is off.
export async function deleteTrack(id: string): Promise<void> {
  if (apiEnabled) {
    await apiFetch(`/tracks/${id}/`, { method: 'DELETE' });
    return;
  }
  deleteRecord('songs', id);
}

export interface NewTrackInput {
  title: string;
  genre?: string;
  year?: number;
  lyrics?: string;
  releaseType: 'single' | 'album_track';
  collaborators: string[];
}

// Create a track's metadata row (POST /tracks/, approved-artists only) and
// return the new id so the caller can upload audio/cover to it. Returns null
// when the backend is off — the mock form persists locally instead.
export async function createTrack(input: NewTrackInput): Promise<string | null> {
  if (!apiEnabled) return null;
  const created = await apiFetch<{ id: string }>('/tracks/', {
    method: 'POST',
    body: {
      title: input.title,
      genre: input.genre || '',
      releaseYear: input.year ?? null,
      releaseType: input.releaseType,
      lyrics: input.lyrics || '',
      collaborators: input.collaborators,
    },
  });
  return created?.id ?? null;
}
