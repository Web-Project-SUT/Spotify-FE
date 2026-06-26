'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getItem, setItem } from '../utils/localStorage';
import { Song } from '../utils/types';
import { isGoldUser } from '../utils/auth';

type RepeatMode = 'off' | 'all' | 'one';

export default function Player() {
  const [song, setSong] = useState<Song | null>(null);
  const [isGold, setIsGold] = useState(false);
  const [quality, setQuality] = useState<'high' | 'low'>('high');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>('off');
  const [shuffle, setShuffle] = useState(false);
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

    // Keep the bar in sync when another part of the app changes the track.
    const onStorage = () => {
      setSong(getItem('currentTrack'));
      setQueue(getItem('queue') || []);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      setIsPlaying((p) => !p);
      return;
    }
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const pickNext = useCallback(() => {
    if (queue.length === 0) return null;
    if (shuffle) {
      const idx = Math.floor(Math.random() * queue.length);
      return queue[idx];
    }
    return queue[0];
  }, [queue, shuffle]);

  const next = useCallback(() => {
    const upcoming = pickNext();
    if (!upcoming) return;
    setSong(upcoming);
    setItem('currentTrack', upcoming);
    setQueue((prev) => {
      const updated = prev.filter((s) => s.id !== upcoming.id);
      setItem('queue', updated);
      return updated;
    });
    setCurrentTime(0);
  }, [pickNext]);

  const prev = useCallback(() => {
    // No history stack in the mock; restart the current track instead.
    if (audioRef.current) audioRef.current.currentTime = 0;
    setCurrentTime(0);
  }, []);

  const cycleRepeat = useCallback(() => {
    setRepeat((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'));
  }, []);

  const handleEnded = useCallback(() => {
    if (repeat === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
      return;
    }
    if (queue.length > 0) {
      next();
      return;
    }
    if (repeat === 'all' && song) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
      return;
    }
    setIsPlaying(false);
  }, [repeat, queue.length, next, song]);

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

        <div className="flex-1 flex flex-col items-center gap-1 px-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShuffle((s) => !s)}
              aria-label="Shuffle"
              aria-pressed={shuffle}
              className={`text-sm ${shuffle ? 'text-black bg-white/90 rounded-full w-7 h-7' : 'text-white/80'}`}
              title="Shuffle"
            >
              🔀
            </button>
            <button onClick={prev} aria-label="Previous" className="text-lg">⏮</button>
            <button
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="bg-white text-black rounded-full w-9 h-9 flex items-center justify-center text-lg"
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button onClick={next} aria-label="Next" className="text-lg" disabled={queue.length === 0}>⏭</button>
            <button
              onClick={cycleRepeat}
              aria-label={`Repeat ${repeat}`}
              className={`text-sm ${repeat !== 'off' ? 'text-black bg-white/90 rounded-full w-7 h-7' : 'text-white/80'}`}
              title={`Repeat: ${repeat}`}
            >
              {repeat === 'one' ? '🔂' : '🔁'}
            </button>
          </div>
          <div className="flex items-center gap-2 w-full">
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
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
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
