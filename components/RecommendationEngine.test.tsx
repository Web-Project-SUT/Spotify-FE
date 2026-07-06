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
});
