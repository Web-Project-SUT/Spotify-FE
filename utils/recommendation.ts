// utils/recommendation.ts
import { Song } from './types';

export function getRecommendations(allSongs: Song[], playedIds: string[]): Song[] {
  if (playedIds.length === 0) {
    // Fallback: return top songs by plays
    return allSongs.sort((a, b) => b.plays - a.plays).slice(0, 5);
  }

  const playedSongs = allSongs.filter(s => playedIds.includes(s.id));
  const genreCounts: Record<string, number> = {};

  playedSongs.forEach(s => {
    if (s.genre) genreCounts[s.genre] = (genreCounts[s.genre] || 0) + 1;
  });

  const topGenre = Object.keys(genreCounts).sort((a, b) => genreCounts[b] - genreCounts[a])[0];

  return allSongs
    .filter(s => s.genre === topGenre && !playedIds.includes(s.id))
    .slice(0, 5);
}