// components/RecommendationEngine.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { getItem } from '../utils/localStorage';
import { Song } from '../utils/types';
import { getRecommendations, Recommendation } from '../utils/recommendation';

export default function RecommendationEngine() {
  const [recommended, setRecommended] = useState<Recommendation[]>([]);

  useEffect(() => {
    const allSongs: Song[] = getItem('songs') || [];
    const history: string[] = getItem('listeningHistory') || [];

    setRecommended(getRecommendations(allSongs, history));
  }, []);

  if (recommended.length === 0) return null;

  return (
    <div className="p-6 bg-gray-900 rounded-lg text-white">
      <h2 className="text-xl font-bold mb-4">Recommended for you</h2>
      <div className="flex gap-4 overflow-x-auto">
        {recommended.map(({ song, reason }) => (
          <div key={song.id} className="p-4 bg-gray-800 rounded min-w-[160px]">
            <p className="font-bold truncate">{song.title}</p>
            <p className="text-xs text-gray-400">{song.genre}</p>
            <p className="text-xs text-gray-500 mt-2 italic">{reason}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
