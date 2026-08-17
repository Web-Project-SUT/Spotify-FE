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
import { getItem, addRecord, updateRecord, deleteRecord } from '../localStorage';
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
  collaborators?: string[];
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
    albumId: t.album ?? undefined,
    collaborators: t.collaborators ?? [],
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
  followerCount: number;
  isFollowing: boolean;
}

interface BackendArtistDetail {
  id: string;
  stageName: string;
  portfolioUrl: string;
  bio: string;
  verified: boolean;
  totalPlays: number;
  totalListeners: number;
  followerCount: number;
  isFollowing: boolean;
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
        followerCount: a.followerCount || 0,
        isFollowing: !!a.isFollowing,
      };
    }
  }
  const users: User[] = getItem('users') || [];
  const u = users.find((x) => x.id === id);
  if (!u) return null;
  const songs: Song[] = getItem('songs') || [];
  const mine = songs.filter((s) => s.artistId === id);
  const me: User | null = getItem('currentUser');
  return {
    id,
    stageName: u.stageName || u.displayName || 'Unknown artist',
    bio: u.bio || '',
    verified: u.status === 'active',
    totalPlays: mine.reduce((n, s) => n + (s.plays || 0), 0),
    totalListeners: mine.reduce((n, s) => n + (s.listenerCount || 0), 0),
    followerCount: u.followers || 0,
    isFollowing: !!me?.following?.includes(id),
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
  albumId?: string | null;
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
      album: input.albumId || null,
    },
  });
  return created?.id ?? null;
}

// Patch an existing track's metadata (PATCH /tracks/{id}/, owner only). The
// artist edit form sends only the fields it changed; `album: null` detaches a
// track from its album. Returns the updated track, or null when the backend
// refused — the caller shows that rather than pretending the edit landed.
export interface TrackPatchInput {
  title?: string;
  genre?: string;
  year?: number | null;
  lyrics?: string;
  releaseType?: 'single' | 'album_track';
  collaborators?: string[];
  albumId?: string | null;
}

export async function updateTrack(id: string, input: TrackPatchInput): Promise<Song | null> {
  if (!apiEnabled) {
    updateRecord('songs', id, {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.genre !== undefined && { genre: input.genre }),
      ...(input.year !== undefined && { year: input.year ?? undefined }),
      ...(input.lyrics !== undefined && { lyrics: input.lyrics }),
      ...(input.releaseType !== undefined && { releaseType: input.releaseType }),
      ...(input.collaborators !== undefined && { collaborators: input.collaborators }),
      ...(input.albumId !== undefined && { albumId: input.albumId ?? undefined }),
    });
    return null;
  }
  const body: Record<string, unknown> = {};
  if (input.title !== undefined) body.title = input.title;
  if (input.genre !== undefined) body.genre = input.genre;
  if (input.year !== undefined) body.releaseYear = input.year;
  if (input.lyrics !== undefined) body.lyrics = input.lyrics;
  if (input.releaseType !== undefined) body.releaseType = input.releaseType;
  if (input.collaborators !== undefined) body.collaborators = input.collaborators;
  if (input.albumId !== undefined) body.album = input.albumId;
  const updated = await apiFetch<BackendTrack>(`/tracks/${id}/`, { method: 'PATCH', body });
  return updated ? mapTrack(updated) : null;
}

// ---- Albums the signed-in artist owns -----------------------------------

// The artist panel's album list. API mode asks the backend for just this
// artist's albums (`?artist=`) rather than paging the whole catalog and
// filtering in JS; mock mode filters the seeded local store the same way.
export async function loadMyAlbums(artistId: string): Promise<Album[]> {
  if (!apiEnabled) {
    const albums: Album[] = getItem('albums') || [];
    return albums.filter((a) => a.artistId === artistId);
  }
  const albums = await fetchAll<BackendAlbum>(`/albums/?artist=${encodeURIComponent(artistId)}`);
  return albums.map(mapAlbum);
}

export interface AlbumInput {
  title: string;
  releaseYear?: number;
}

// Create an album (POST /albums/, approved-artists only). Returns the created
// album so the caller can PUT a cover to it; null when the backend refused.
// Mock mode writes an equivalent row into localStorage and returns it.
export async function createAlbum(input: AlbumInput, artistId: string): Promise<Album | null> {
  if (!apiEnabled) {
    const album: Album = {
      id: Date.now().toString(),
      title: input.title,
      artistId,
      cover: '💿',
      releaseYear: input.releaseYear,
    };
    addRecord('albums', album);
    return album;
  }
  const created = await apiFetch<BackendAlbum>('/albums/', {
    method: 'POST',
    body: { title: input.title, releaseYear: input.releaseYear ?? null },
  });
  return created ? mapAlbum(created) : null;
}

export async function updateAlbum(id: string, input: AlbumInput): Promise<Album | null> {
  if (!apiEnabled) {
    updateRecord('albums', id, { title: input.title, releaseYear: input.releaseYear });
    return null;
  }
  const updated = await apiFetch<BackendAlbum>(`/albums/${id}/`, {
    method: 'PATCH',
    body: { title: input.title, releaseYear: input.releaseYear ?? null },
  });
  return updated ? mapAlbum(updated) : null;
}

export async function deleteAlbum(id: string): Promise<void> {
  if (apiEnabled) {
    await apiFetch(`/albums/${id}/`, { method: 'DELETE' });
    return;
  }
  deleteRecord('albums', id);
}
