// utils/resources/playlists.ts
//
// Playlist integration seam. The backend owns playlists per authenticated
// user (GET /playlists/ is already owner-scoped), exposes CRUD on the
// collection, and manages membership via /playlists/{id}/tracks/. The
// request/response bodies travel camelCased (drf-camel-case), and — worth
// noting because it's easy to guess wrong — the add-track body is
// { track: <uuid> }, matching AddTrackSerializer, not { trackId }.
//
// Every function mirrors the change into the mock localStorage store when
// the backend is disabled, so the offline demo and the existing tests keep
// working with no code path changes.
import { apiFetch, apiRequest, apiEnabled } from '../api';
import { getItem, addRecord, deleteRecord, updateRecord } from '../localStorage';
import { Playlist } from '../types';
import { fetchAll } from './http';

interface BackendPlaylistListItem {
  id: string;
  owner: string;
  title: string;
  isPublic: boolean;
  cover: string | null;
  createdAt: string;
  trackCount: number;
  trackIds: string[];
  lastPlayedAt: string | null;
}

interface BackendPlaylistTrack {
  id: string; // track id
  title: string;
  artist: string;
  durationMs: number;
  position: number;
}

interface BackendPlaylistDetail extends Omit<BackendPlaylistListItem, 'trackCount'> {
  tracks: BackendPlaylistTrack[];
}

function mapListItem(p: BackendPlaylistListItem): Playlist {
  return {
    id: p.id,
    userId: p.owner,
    title: p.title,
    isPublic: p.isPublic,
    songIds: p.trackIds ?? [],
    // Derived server-side from the playlist's PlayEvents; null until the
    // playlist has actually been played.
    lastPlayedAt: p.lastPlayedAt ?? undefined,
    trackCount: p.trackCount,
  };
}

function mapDetail(p: BackendPlaylistDetail): Playlist {
  return {
    id: p.id,
    userId: p.owner,
    title: p.title,
    isPublic: p.isPublic,
    songIds: [...p.tracks].sort((a, b) => a.position - b.position).map((t) => t.id),
  };
}

export async function loadPlaylists(userId: string | undefined): Promise<Playlist[]> {
  if (!apiEnabled) {
    const all: Playlist[] = getItem('playlists') || [];
    return userId ? all.filter((p) => p.userId === userId) : [];
  }
  const items = await fetchAll<BackendPlaylistListItem>('/playlists/');
  return items.map(mapListItem);
}

// The user's playlists ordered most-recently-played first (backend puts the
// never-played ones last). It returns *all* of them, not just the played
// ones, so callers can still tell "no playlists yet" from "nothing played
// recently" — the two empty states the home row distinguishes.
export async function loadRecentPlaylists(userId: string | undefined): Promise<Playlist[]> {
  if (!apiEnabled) return loadPlaylists(userId);
  const items = await fetchAll<BackendPlaylistListItem>('/playlists/recent/');
  return items.map(mapListItem);
}

export async function loadPlaylistDetail(id: string): Promise<Playlist | null> {
  if (!apiEnabled) {
    const all: Playlist[] = getItem('playlists') || [];
    return all.find((p) => p.id === id) || null;
  }
  const detail = await apiFetch<BackendPlaylistDetail>(`/playlists/${id}/`);
  return detail ? mapDetail(detail) : null;
}

// Returns null when the backend refuses the create. It deliberately does NOT
// fall back to the mock store: loadPlaylists reads only the API in API mode,
// so a locally-written playlist shows up once, vanishes on the next read, and
// leaves a stale row in localStorage forever. Callers surface the failure.
export async function createPlaylist(
  userId: string,
  title: string,
  isPublic = false
): Promise<Playlist | null> {
  if (apiEnabled) {
    const created = await apiFetch<BackendPlaylistListItem>('/playlists/', {
      method: 'POST',
      body: { title, isPublic },
    });
    return created ? mapListItem(created) : null;
  }
  const playlist: Playlist = { id: Date.now().toString(), userId, title, songIds: [], isPublic };
  addRecord('playlists', playlist);
  return playlist;
}

export async function deletePlaylist(id: string): Promise<void> {
  if (apiEnabled) {
    await apiFetch(`/playlists/${id}/`, { method: 'DELETE' });
    return;
  }
  deleteRecord('playlists', id);
}

export async function addTrackToPlaylist(playlistId: string, trackId: string): Promise<boolean> {
  if (apiEnabled) {
    const { error } = await apiRequest(`/playlists/${playlistId}/tracks/`, {
      method: 'POST',
      body: { track: trackId },
    });
    return !error;
  }
  const all: Playlist[] = getItem('playlists') || [];
  const current = all.find((p) => p.id === playlistId);
  if (current && !current.songIds.includes(trackId)) {
    updateRecord('playlists', playlistId, { songIds: [...current.songIds, trackId] });
  }
  return true;
}

export async function removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<boolean> {
  if (apiEnabled) {
    const { error } = await apiRequest(`/playlists/${playlistId}/tracks/${trackId}/`, {
      method: 'DELETE',
    });
    return !error;
  }
  const all: Playlist[] = getItem('playlists') || [];
  const current = all.find((p) => p.id === playlistId);
  if (current) {
    updateRecord('playlists', playlistId, {
      songIds: current.songIds.filter((id) => id !== trackId),
    });
  }
  return true;
}
