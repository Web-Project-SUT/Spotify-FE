// components/TopSongsRow.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { getItem, setItem } from '../utils/localStorage';
import { Song } from '../utils/types';

export default function TopSongsRow() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch songs from the database
    const dbSongs: Song[] = getItem('songs') || [];

    // Sort by most plays and select the top 5. No fake fallback data —
    // an empty catalog should render an empty state, not made-up songs.
    const sortedSongs = [...dbSongs].sort((a, b) => (b.plays || 0) - (a.plays || 0));
    setSongs(sortedSongs.slice(0, 5));

    // Check if a song is currently playing
    const currentTrack = getItem('currentTrack');
    if (currentTrack) {
      setCurrentPlayingId(currentTrack.id);
    }
  }, []);

  const handlePlay = (song: Song) => {
    // Save song as the current track for the music player
    setItem('currentTrack', song);
    setCurrentPlayingId(song.id);
    
    // Dispatch a storage event to notify the player component across the browser
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
    }
  };

  return (
    <div className="my-8 w-full">
      <h2 className="text-2xl font-bold mb-4 text-white">Top Songs</h2>
      {songs.length === 0 ? (
        <p className="text-gray-500 italic">No songs available yet.</p>
      ) : (
        <div className="flex overflow-x-auto space-x-4 pb-4">
        {songs.map((song) => (
          <div 
            key={song.id} 
            className="min-w-[160px] bg-gray-800 p-4 rounded-lg flex flex-col items-center hover:bg-gray-700 transition relative group"
          >
            <div className="w-24 h-24 bg-gray-600 rounded-md flex items-center justify-center text-4xl mb-4 shadow-lg relative overflow-hidden">
              {song.cover || '🎵'}
              
              {/* Play button shown only on hover */}
              <button 
                onClick={() => handlePlay(song)}
                aria-label={`Play ${song.title}`}
                className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-xl ${currentPlayingId === song.id ? 'bg-green-500 text-black' : 'bg-white text-black'}`}>
                  {currentPlayingId === song.id ? '⏸' : '▶'}
                </div>
              </button>
            </div>
            <h3 className="text-white font-semibold truncate w-full text-center">{song.title}</h3>
            <p className="text-gray-400 text-xs mt-1 truncate w-full text-center">
              {song.plays ? `${song.plays.toLocaleString()} plays` : 'Trending'}
            </p>
          </div>
        ))}
        </div>
      )}
    </div>
  );
}