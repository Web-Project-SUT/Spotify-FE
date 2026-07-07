// components/RecommendationEngine.test.tsx
import { describe, it, expect } from 'vitest';
import { getRecommendations } from '../utils/recommendation';
import { Song } from '../utils/types';

describe('getRecommendations', () => {
  it('recommends songs based on genre and explains why', () => {
    const songs: Song[] = [
      { id: '1', title: 'Rock Song', genre: 'Rock', artistId: '1', cover: '', plays: 10 },
      { id: '2', title: 'Other Rock', genre: 'Rock', artistId: '1', cover: '', plays: 10 },
      { id: '3', title: 'Pop Song', genre: 'Pop', artistId: '1', cover: '', plays: 10 },
    ] as Song[];

    const history = ['1'];
    const recs = getRecommendations(songs, history);

    expect(recs.length).toBe(1);
    expect(recs[0].song.title).toBe('Other Rock');
    expect(recs[0].reasonKey).toBe('home.reasonGenre');
    expect(recs[0].reasonParams?.genre).toBe('Rock');
  });

  it('falls back to top-played songs when there is no listening history', () => {
    const songs: Song[] = [
      { id: '1', title: 'Low plays', artistId: '1', cover: '', plays: 10 },
      { id: '2', title: 'High plays', artistId: '1', cover: '', plays: 1000 },
    ] as Song[];

    const recs = getRecommendations(songs, []);

    expect(recs[0].song.title).toBe('High plays');
    expect(recs[0].reasonKey).toBe('home.reasonTrending');
  });

  it('does not mutate the original songs array', () => {
    const songs: Song[] = [
      { id: '1', title: 'A', artistId: '1', cover: '', plays: 5 },
      { id: '2', title: 'B', artistId: '1', cover: '', plays: 50 },
    ] as Song[];
    const original = [...songs];

    getRecommendations(songs, []);

    expect(songs.map((s) => s.id)).toEqual(original.map((s) => s.id));
  });

  it('falls back to top-played songs when listened songs have no genre tagged', () => {
    const songs: Song[] = [
      { id: '1', title: 'No genre', artistId: '1', cover: '', plays: 1 },
      { id: '2', title: 'High plays', artistId: '1', cover: '', plays: 999 },
    ] as Song[];

    const recs = getRecommendations(songs, ['1']);

    expect(recs[0].song.title).toBe('High plays');
    expect(recs[0].reasonKey).toBe('home.reasonTrending');
  });

  it('falls back to trending songs when every song in the top genre has already been played', () => {
    const songs: Song[] = [
      { id: '1', title: 'Rock A', genre: 'Rock', artistId: '1', cover: '', plays: 10 },
      { id: '2', title: 'Pop A', genre: 'Pop', artistId: '1', cover: '', plays: 50 },
    ] as Song[];

    // '1' is the only Rock song and it's already played, so there are no
    // unplayed Rock candidates left even though Rock is the top genre.
    const recs = getRecommendations(songs, ['1']);

    expect(recs.length).toBe(1);
    expect(recs[0].song.title).toBe('Pop A');
    expect(recs[0].reasonKey).toBe('home.reasonTrending');
  });

  it('falls back to overall trending (including already-played songs) once the whole catalog has been played', () => {
    const songs: Song[] = [
      { id: '1', title: 'Rock A', genre: 'Rock', artistId: '1', cover: '', plays: 10 },
      { id: '2', title: 'Rock B', genre: 'Rock', artistId: '1', cover: '', plays: 50 },
    ] as Song[];

    // Both songs share the top genre and both are already played, so there
    // is nothing left to exclude — the row should still show something
    // rather than going empty.
    const recs = getRecommendations(songs, ['1', '2']);

    expect(recs.length).toBe(2);
    expect(recs[0].song.title).toBe('Rock B');
    expect(recs[0].reasonKey).toBe('home.reasonTrending');
  });

  it('gives different accounts a different trending list when neither has any listening history', () => {
    const songs: Song[] = Array.from({ length: 10 }, (_, i) => ({
      id: `${i + 1}`,
      title: `Song ${i + 1}`,
      artistId: '1',
      cover: '',
      plays: (10 - i) * 100,
    })) as Song[];

    const signatures = ['brand-new-1', 'brand-new-2', 'brand-new-3', 'brand-new-4'].map((userId) =>
      JSON.stringify(getRecommendations(songs, [], userId).map((r) => r.song.id))
    );

    expect(new Set(signatures).size).toBeGreaterThan(1);
  });

  it('is deterministic for the same user id across repeat calls', () => {
    const songs: Song[] = Array.from({ length: 10 }, (_, i) => ({
      id: `${i + 1}`,
      title: `Song ${i + 1}`,
      artistId: '1',
      cover: '',
      plays: (10 - i) * 100,
    })) as Song[];

    const first = getRecommendations(songs, [], 'u1').map((r) => r.song.id);
    const second = getRecommendations(songs, [], 'u1').map((r) => r.song.id);

    expect(second).toEqual(first);
  });
});
