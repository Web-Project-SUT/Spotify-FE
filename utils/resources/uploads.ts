// utils/resources/uploads.ts
//
// Media uploads are the one place the JSON apiFetch wrapper can't serve:
// the backend's media endpoints take multipart/form-data via PUT (fields
// avatar / cover / audioHigh / audioLow, camelCased to match the
// CamelCaseMultiPartParser) and DELETE to clear. This module builds the
// FormData, attaches the JWT, and retries once through the shared refresh
// path on a 401 — the same contract as apiFetch, just for files.
//
// With the backend disabled every function is a no-op returning null, so
// the mock app (which never really uploaded anything) is unaffected.
import { apiEnabled, getAccessToken, refreshAccessToken, API_BASE_URL } from '../api';

async function putMultipart(path: string, fields: Record<string, File>): Promise<boolean> {
  if (!apiEnabled) return false;

  const send = (token: string | null): Promise<Response> => {
    const form = new FormData();
    Object.entries(fields).forEach(([name, file]) => form.append(name, file));
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    // Deliberately no Content-Type: the browser sets the multipart boundary.
    return fetch(`${API_BASE_URL}${path}`, { method: 'PUT', headers, body: form });
  };

  try {
    let res = await send(getAccessToken());
    if (res.status === 401) {
      const token = await refreshAccessToken();
      if (!token) return false;
      res = await send(token);
    }
    return res.ok;
  } catch {
    return false;
  }
}

async function deleteMedia(path: string): Promise<boolean> {
  if (!apiEnabled) return false;
  const send = (token: string | null): Promise<Response> =>
    fetch(`${API_BASE_URL}${path}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  try {
    let res = await send(getAccessToken());
    if (res.status === 401) {
      const token = await refreshAccessToken();
      if (!token) return false;
      res = await send(token);
    }
    return res.ok;
  } catch {
    return false;
  }
}

export const uploadAvatar = (file: File) => putMultipart('/auth/me/avatar/', { avatar: file });
export const deleteAvatar = () => deleteMedia('/auth/me/avatar/');

export const uploadAlbumCover = (albumId: string, file: File) =>
  putMultipart(`/albums/${albumId}/cover/`, { cover: file });

export const uploadTrackCover = (trackId: string, file: File) =>
  putMultipart(`/tracks/${trackId}/cover/`, { cover: file });

// The audio endpoint accepts a high-quality file and an optional low-quality
// transcode; send whichever the caller provides.
export function uploadTrackAudio(
  trackId: string,
  files: { high?: File; low?: File }
): Promise<boolean> {
  const fields: Record<string, File> = {};
  if (files.high) fields.audioHigh = files.high;
  if (files.low) fields.audioLow = files.low;
  return putMultipart(`/tracks/${trackId}/audio/`, fields);
}
