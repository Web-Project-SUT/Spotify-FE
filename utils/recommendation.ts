// utils/recommendation.ts
import { Song } from './types';

export interface Recommendation {
  song: Song;
  reasonKey: string;
  reasonParams?: Record<string, string>;
}

// Deterministic per-user seed (not Math.random()) so the same account always
// gets the same result on repeat visits, but different accounts get a
// different count/order/subset from an otherwise-identical candidate pool.
// This only kicks in when a userId is supplied — callers that omit it (and
// every pre-existing test) keep the plain top-N-by-plays behavior.
function hashSeed(userId: string): number {
  let h = 0;
  for (let i = 0; i < userId.length; i++) {
    h = (Math.imul(h, 31) + userId.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const rng = mulberry32(seed);
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Without a userId: identity slice(0, defaultCount), matching the original
// behavior exactly. With a userId: a seeded shuffle plus a per-user track
// count (3-6, capped to pool size), so two accounts with the same candidate
// pool (e.g. both brand new, zero listening history) still see a different
// number of tracks, different tracks, and a different order.
function personalizeSlice<T>(pool: T[], userId: string | undefined, defaultCount = 5): T[] {
  if (!userId) return pool.slice(0, defaultCount);
  if (pool.length === 0) return pool;
  const seed = hashSeed(userId);
  const count = Math.max(1, Math.min(pool.length, 3 + (seed % 4)));
  return seededShuffle(pool, seed).slice(0, count);
}

function overallTrending(allSongs: Song[], userId?: string): Recommendation[] {
  const sorted = [...allSongs].sort((a, b) => (b.plays || 0) - (a.plays || 0));
  return personalizeSlice(sorted, userId).map((song) => ({ song, reasonKey: 'home.reasonTrending' }));
}

// Trending among songs not yet played; if that's empty (the whole catalog
// has been played), falls back to trending overall so the row never goes
// empty just because the listener has worked through the entire catalog.
function unplayedTrending(allSongs: Song[], playedIds: string[], userId?: string): Recommendation[] {
  const unplayed = allSongs.filter((s) => !playedIds.includes(s.id));
  return unplayed.length > 0 ? overallTrending(unplayed, userId) : overallTrending(allSongs, userId);
}

export function getRecommendations(
  allSongs: Song[],
  playedIds: string[],
  userId?: string
): Recommendation[] {
  if (playedIds.length === 0) {
    // No listening history yet: fall back to the most-played songs
    // overall rather than a random pick, so the result is still
    // explainable and non-random — but seeded per-user so every brand
    // new account doesn't see the identical list (see personalizeSlice).
    return overallTrending(allSongs, userId);
  }

  const playedSongs = allSongs.filter((s) => playedIds.includes(s.id));
  const genreCounts: Record<string, number> = {};

  playedSongs.forEach((s) => {
    if (s.genre) genreCounts[s.genre] = (genreCounts[s.genre] || 0) + 1;
  });

  const topGenre = Object.keys(genreCounts).sort((a, b) => genreCounts[b] - genreCounts[a])[0];

  if (!topGenre) {
    // Listened songs had no genre tagged: fall back to overall top
    // songs instead of returning nothing.
    return unplayedTrending(allSongs, playedIds, userId);
  }

  const genrePool = allSongs.filter((s) => s.genre === topGenre && !playedIds.includes(s.id));
  const genreMatches = personalizeSlice(genrePool, userId).map((song) => ({
    song,
    reasonKey: 'home.reasonGenre',
    reasonParams: { genre: topGenre },
  }));

  if (genreMatches.length > 0) return genreMatches;

  // Every song in the listener's top genre has already been played: fall
  // back to trending (unplayed first, then overall) instead of returning
  // nothing, so the row never disappears while there's any catalog at all.
  return unplayedTrending(allSongs, playedIds, userId);
}
