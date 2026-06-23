// components/Player.tsx
'use client';
import React, { useState, useEffect } from 'react';
import { getItem } from '../utils/localStorage';
import { Song, User } from '../utils/types';

export default function Player() {
  const [currentTrack, setCurrentTrack] = useState<Song | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showQueue, setShowQueue] = useState(false);

  useEffect(() => {
    setCurrentTrack(getItem('currentTrack'));
    setUser(getItem('currentUser'));
  }, []);

  if (!currentTrack) return null;

  return (
    <div className="fixed bottom-0 w-full bg-black border-t border-gray-800 p-4 text-white z-50">
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-700 flex items-center justify-center">{currentTrack.cover}</div>
          <div>
            <p className="font-bold">{currentTrack.title}</p>
            {/* Task 29: Conditional Stats for Gold Users */}
            {user?.role === 'gold' && (
              <p className="text-xs text-yellow-500">
                Streams: {currentTrack.streamCount || 0} | Listeners: {currentTrack.listenerCount || 0}
              </p>
            )}
          </div>
        </div>
        
        {/* Task 27: Queue Toggle */}
        <div className="flex gap-4">
          <button onClick={() => setShowQueue(!showQueue)} className="text-sm hover:text-green-400">Queue</button>
          {/* Task 28: Lyrics Toggle */}
          <button onClick={() => setShowLyrics(!showLyrics)} className="text-sm hover:text-green-400">Lyrics</button>
        </div>
      </div>

      {/* Task 27: Slide-in Queue Panel */}
      {showQueue && (
        <div className="absolute right-4 bottom-20 w-64 bg-gray-900 border border-gray-700 p-4 shadow-2xl rounded-lg">
          <h4 className="font-bold mb-2">Up Next</h4>
          <p className="text-sm text-gray-400">No other songs in queue.</p>
        </div>
      )}
      
      {/* Task 28: Lyrics Display */}
      {showLyrics && (
        <div className="absolute right-20 bottom-20 w-64 bg-gray-900 border border-gray-700 p-4 shadow-2xl rounded-lg max-h-60 overflow-y-auto">
          <h4 className="font-bold mb-2">Lyrics</h4>
          <p className="text-sm text-gray-300">{currentTrack.lyrics || "No lyrics available."}</p>
        </div>
      )}
    </div>
  );
}