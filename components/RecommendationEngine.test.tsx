// components/RecommendationEngine.test.tsx
import { describe, it, expect } from 'vitest';
import { getRecommendations } from '../utils/recommendation';
import { Song } from '../utils/types';

describe('Recommendation Engine', () => {
  it('recommends songs based on genre', () => {
    const songs: Song[] = [
      { id: '1', title: 'Rock Song', genre: 'Rock', artistId: '1', cover: '', plays: 10 },
      { id: '2', title: 'Other Rock', genre: 'Rock', artistId: '1', cover: '', plays: 10 },
      { id: '3', title: 'Pop Song', genre: 'Pop', artistId: '1', cover: '', plays: 10 }
    ] as Song[];

    const history = ['1']; // User listened to Rock Song
    const recs = getRecommendations(songs, history);
    
    expect(recs[0].title).toBe('Other Rock');
    expect(recs.length).toBe(1);
  });
});