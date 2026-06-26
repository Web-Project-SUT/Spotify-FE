// utils/recommendation.ts
import { Song } from './types';

export interface Recommendation {
  song: Song;
  reason: string;
}

export function getRecommendations(allSongs: Song[], playedIds: string[]): Recommendation[] {
  if (playedIds.length === 0) {
    // No listening history yet: fall back to the most-played songs
    // overall rather than a random pick, so the result is still
    // explainable and non-random.
    return [...allSongs]
      .sort((a, b) => (b.plays || 0) - (a.plays || 0))
      .slice(0, 5)
      .map((song) => ({ song, reason: 'Trending with other listeners' }));
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
    return [...allSongs]
      .filter((s) => !playedIds.includes(s.id))
      .sort((a, b) => (b.plays || 0) - (a.plays || 0))
      .slice(0, 5)
      .map((song) => ({ song, reason: 'Trending with other listeners' }));
  }

  return allSongs
    .filter((s) => s.genre === topGenre && !playedIds.includes(s.id))
    .slice(0, 5)
    .map((song) => ({ song, reason: `Because you listened to ${topGenre}` }));
}
