// components/TopSongsRow.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { getItem } from '../utils/localStorage';

export default function TopSongsRow() {
  const [songs, setSongs] = useState<any[]>([]);

  useEffect(() => {
    // Fetch songs from the mock database
    const dbSongs = getItem('songs') || [];
    
    if (dbSongs.length > 0) {
      setSongs(dbSongs.slice(0, 5)); // Display the top 5 songs
    } else {
      // If the database is empty, show some dummy fallback data
      setSongs([
        { id: '1', title: 'Bohemian Rhapsody', artist: 'Queen', cover: '🎸' },
        { id: '2', title: 'Shape of You', artist: 'Ed Sheeran', cover: '🎧' },
        { id: '3', title: 'Blinding Lights', artist: 'The Weeknd', cover: '🎵' },
        { id: '4', title: 'Dance Monkey', artist: 'Tones and I', cover: '🎹' },
      ]);
    }
  }, []);

  return (
    <div className="my-8 w-full">
      <h2 className="text-2xl font-bold mb-4 text-white">Top Songs</h2>
      <div className="flex overflow-x-auto space-x-4 pb-4">
        {songs.map((song) => (
          <div 
            key={song.id} 
            className="min-w-[160px] bg-gray-800 p-4 rounded-lg flex flex-col items-center hover:bg-gray-700 transition cursor-pointer"
          >
            <div className="w-24 h-24 bg-gray-600 rounded-md flex items-center justify-center text-4xl mb-4 shadow-lg">
              {song.cover || '🎵'}
            </div>
            <h3 className="text-white font-semibold truncate w-full text-center">{song.title}</h3>
            <p className="text-gray-400 text-sm truncate w-full text-center">{song.artist}</p>
          </div>
        ))}
      </div>
    </div>
  );
}