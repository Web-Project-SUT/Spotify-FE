// utils/resources/streams.ts
//
// Playback reporting. POST /streams/ is what creates a PlayEvent, and a
// PlayEvent is what every number in the app is derived from: a track's
// play/listener counts, the artist dashboard, monthly payouts, the gold
// stats panel and the "recently played" row all read back out of it.
// Nothing called this endpoint before, which is why all of those rendered
// structurally-correct zeros.
//
// Unlike the other resource modules there is no mock mirror here: the
// localStorage counterpart (recordDailyStream / recordListen) already runs
// in the Player and stays the mock-mode path untouched.
import { ApiError, apiEnabled, apiRequest } from '../api';

// Returns the ApiError rather than swallowing it — the caller needs to tell
// a rejected stream apart from a recorded one, because the backend enforces
// the tier's daily cap here (403 daily_stream_quota_exceeded) and the player
// has to stop and say so rather than keep playing a stream nobody counted.
export async function recordStream(
  trackId: string,
  playlistId?: string | null
): Promise<ApiError | null> {
  if (!apiEnabled) return null;
  const { error } = await apiRequest('/streams/', {
    method: 'POST',
    body: { track: trackId, playlist: playlistId || null },
  });
  return error;
}

export const DAILY_STREAM_QUOTA_CODE = 'daily_stream_quota_exceeded';
