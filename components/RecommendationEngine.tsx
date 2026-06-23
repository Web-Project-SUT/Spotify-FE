// components/RecommendationEngine.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { getItem } from '../utils/localStorage';
import { Song } from '../utils/types';
import { getRecommendations } from '../utils/recommendation';

export default function RecommendationEngine() {
  const [recommended, setRecommended] = useState<Song[]>([]);

  useEffect(() => {
    const allSongs: Song[] = getItem('songs') || [];
    const history: string[] = getItem('listeningHistory') || [];
    
    const recs = getRecommendations(allSongs, history);
    setRecommended(recs);
  }, []);

  if (recommended.length === 0) return null;

  return (
    <div className="p-6 bg-gray-900 rounded-lg text-white">
      <h2 className="text-xl font-bold mb-4">Recommended For You</h2>
      <div className="flex gap-4">
        {recommended.map(song => (
          <div key={song.id} className="p-4 bg-gray-800 rounded">
            <p className="font-bold">{song.title}</p>
            <p className="text-xs text-gray-400">{song.genre}</p>
          </div>
        ))}
      </div>
    </div>
  );
}