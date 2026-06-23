'use client';
import React, { useState, useEffect, useRef } from 'react';
import { getItem } from '../utils/localStorage';
import { Song, User } from '../utils/types';

export default function Player() {
  const [song, setSong] = useState<Song | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [quality, setQuality] = useState<'high' | 'low'>('high');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [accentColor, setAccentColor] = useState('#1db954');
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setSong(getItem('currentTrack'));
    setUser(getItem('currentUser'));
  }, []);

  const extractColor = () => {
    if (!imgRef.current) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = imgRef.current.width;
    canvas.height = imgRef.current.height;
    ctx.drawImage(imgRef.current, 0, 0);
    const data = ctx.getImageData(0, 0, 1, 1).data;
    setAccentColor(`rgb(${data[0]}, ${data[1]}, ${data[2]})`);
  };

  if (!song) return null;

  return (
    <div className="fixed bottom-0 w-full p-4 border-t border-gray-800 text-white z-50 transition-colors duration-500" style={{ backgroundColor: accentColor }}>
      <div className="flex items-center justify-between max-w-6xl mx-auto gap-4">
        <div className="flex items-center gap-4">
          <img ref={imgRef} src={song.cover} onLoad={extractColor} className="w-12 h-12" alt="cover" />
          <div>
            <p className="font-bold">{song.title}</p>
            {user?.role === 'gold' && (
              <p className="text-xs text-yellow-200">Streams: {song.streamCount} | Listeners: {song.listenerCount}</p>
            )}
          </div>
        </div>

        <div className="flex-1 flex items-center gap-2 px-4">
          <span className="text-xs">{Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}</span>
          <input 
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={(e) => audioRef.current && (audioRef.current.currentTime = Number(e.target.value))}
            className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-xs">{Math.floor((duration || 0) / 60)}:{Math.floor((duration || 0) % 60).toString().padStart(2, '0')}</span>
        </div>

        <div className="flex gap-4">
          <button onClick={() => setQuality(quality === 'high' ? 'low' : 'high')} className="text-xs border px-2 py-1 rounded">{quality.toUpperCase()}</button>
          <button onClick={() => setShowQueue(!showQueue)} className="text-sm">Queue</button>
          <button onClick={() => setShowLyrics(!showLyrics)} className="text-sm">Lyrics</button>
        </div>
      </div>

      <audio 
        ref={audioRef}
        src={quality === 'high' ? song.audioUrlHigh : song.audioUrlLow} 
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
      />

      {showQueue && <div className="absolute right-4 bottom-20 w-64 bg-black p-4 border border-gray-700">Queue Panel...</div>}
      {showLyrics && <div className="absolute right-20 bottom-20 w-64 bg-black p-4 border border-gray-700">{song.lyrics}</div>}
    </div>
  );
}