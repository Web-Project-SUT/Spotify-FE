'use client';
import React, { useState, useEffect, useRef } from 'react';
import { getItem, setItem } from '../utils/localStorage';
import { Song, User } from '../utils/types';
import { isGoldUser } from '../utils/auth';

export default function Player() {
  const [song, setSong] = useState<Song | null>(null);
  const [isGold, setIsGold] = useState(false);
  const [quality, setQuality] = useState<'high' | 'low'>('high');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [queue, setQueue] = useState<Song[]>([]);
  const [accentColor, setAccentColor] = useState('#1db954');

  const audioRef = useRef<HTMLAudioElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setSong(getItem('currentTrack'));
    setIsGold(isGoldUser(getItem('currentUser')));
    setQueue(getItem('queue') || []);
  }, []);

  const extractColor = () => {
    if (!imgRef.current) return;
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = imgRef.current.naturalWidth || imgRef.current.width;
      canvas.height = imgRef.current.naturalHeight || imgRef.current.height;
      ctx.drawImage(imgRef.current, 0, 0);
      const data = ctx.getImageData(0, 0, 1, 1).data;
      setAccentColor(`rgb(${data[0]}, ${data[1]}, ${data[2]})`);
    } catch {
      // Cross-origin cover images without proper CORS headers throw a
      // SecurityError on getImageData ("tainted canvas"). Fall back to
      // the default accent color instead of crashing the player.
      setAccentColor('#1db954');
    }
  };

  const playFromQueue = (queuedSong: Song) => {
    setSong(queuedSong);
    setItem('currentTrack', queuedSong);
    setQueue((prev) => {
      const updated = prev.filter((s) => s.id !== queuedSong.id);
      setItem('queue', updated);
      return updated;
    });
  };

  if (!song) return null;

  return (
    <div
      className="fixed bottom-0 w-full p-4 border-t border-gray-800 text-white z-50 transition-colors duration-500"
      style={{ backgroundColor: accentColor }}
    >
      <div className="flex items-center justify-between max-w-6xl mx-auto gap-4">
        <div className="flex items-center gap-4">
          <img
            ref={imgRef}
            src={song.cover}
            crossOrigin="anonymous"
            onLoad={extractColor}
            className="w-12 h-12"
            alt="cover"
          />
          <div>
            <p className="font-bold">{song.title}</p>
            {isGold && (
              <p className="text-xs text-yellow-200">
                Streams: {(song.streamCount || 0).toLocaleString()} | Listeners: {(song.listenerCount || 0).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        <div className="flex-1 flex items-center gap-2 px-4">
          <span className="text-xs">
            {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}
          </span>
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={(e) => audioRef.current && (audioRef.current.currentTime = Number(e.target.value))}
            className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer"
            aria-label="Seek"
          />
          <span className="text-xs">
            {Math.floor((duration || 0) / 60)}:{Math.floor((duration || 0) % 60).toString().padStart(2, '0')}
          </span>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setQuality(quality === 'high' ? 'low' : 'high')}
            className="text-xs border px-2 py-1 rounded"
            aria-label="Toggle audio quality"
          >
            {quality.toUpperCase()}
          </button>
          <button onClick={() => setShowQueue(!showQueue)} className="text-sm">
            Queue {queue.length > 0 && `(${queue.length})`}
          </button>
          <button onClick={() => setShowLyrics(!showLyrics)} className="text-sm" disabled={!song.lyrics}>
            Lyrics
          </button>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={quality === 'high' ? song.audioUrlHigh : song.audioUrlLow}
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
      />

      {showQueue && (
        <div className="absolute right-4 bottom-20 w-64 bg-black p-4 border border-gray-700 rounded-lg max-h-64 overflow-y-auto">
          <p className="text-sm font-bold mb-2">Up next</p>
          {queue.length === 0 ? (
            <p className="text-xs text-gray-500 italic">Queue is empty.</p>
          ) : (
            <ul className="space-y-2">
              {queue.map((q) => (
                <li
                  key={q.id}
                  onClick={() => playFromQueue(q)}
                  className="text-xs flex items-center gap-2 hover:bg-gray-800 p-1 rounded cursor-pointer"
                >
                  <span>{q.cover || '🎵'}</span>
                  <span className="truncate">{q.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {showLyrics && (
        <div className="absolute right-20 bottom-20 w-64 bg-black p-4 border border-gray-700 rounded-lg max-h-64 overflow-y-auto">
          <p className="text-sm font-bold mb-2">Lyrics</p>
          <p className="text-xs text-gray-300 whitespace-pre-line">
            {song.lyrics || 'No lyrics available for this track.'}
          </p>
        </div>
      )}
    </div>
  );
}
