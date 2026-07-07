'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getItem, setItem, recordDailyStream, recordListen } from '../utils/localStorage';
import { Song } from '../utils/types';
import { isGoldUser, getCurrentUser } from '../utils/auth';

type RepeatMode = 'off' | 'all' | 'one';

// Below md (768px) the fixed bar becomes a tap-to-expand mini player per the
// spec's mobile player requirement. Defaults to false so SSR/hydration and
// the default test viewport (happy-dom's 1024px) render the desktop bar.
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isMobile;
}

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
  const [expanded, setExpanded] = useState(false);
  const [volume, setVolume] = useState(1);

  const audioRef = useRef<HTMLAudioElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const isMobile = useIsMobile();

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

  // Count one daily stream for the current listener each time a new track
  // becomes current. Keyed on the song id so re-renders (or resuming the
  // same track) don't double-count. This is the single write point that
  // feeds the "Streams today" stat on the profile page and, via
  // recordListen, the home page's "Recommended for you" personalization.
  // Dispatching 'storage' afterward (the project's existing same-tab sync
  // trick, since the native event never fires in the tab that wrote the
  // change) lets RecommendationEngine recompute without needing a refresh.
  useEffect(() => {
    if (!song?.id) return;
    const userId = getCurrentUser()?.id;
    recordDailyStream(userId);
    recordListen(userId, song.id);
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('storage'));
  }, [song?.id]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // Collapse the full-screen mobile player if the viewport grows back to desktop width.
  useEffect(() => {
    if (!isMobile) setExpanded(false);
  }, [isMobile]);

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
    <>
      <audio
        ref={audioRef}
        src={quality === 'high' ? song.audioUrlHigh : song.audioUrlLow}
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {!isMobile && (
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
      )}

      {isMobile && !expanded && (
        <div
          onClick={() => setExpanded(true)}
          role="button"
          tabIndex={0}
          aria-label="Expand player"
          className="fixed bottom-0 inset-x-0 z-50 text-white transition-colors duration-500"
          style={{ backgroundColor: accentColor }}
        >
          <div className="h-1 bg-white/20" aria-hidden="true">
            <div
              className="h-1 bg-white"
              style={{ width: duration ? `${Math.min(100, (currentTime / duration) * 100)}%` : '0%' }}
            />
          </div>
          <div className="flex items-center gap-3 p-3">
            <img src={song.cover} className="w-10 h-10 rounded flex-shrink-0" alt="cover" />
            <p className="flex-1 min-w-0 truncate font-bold text-sm">{song.title}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="bg-white text-black rounded-full w-9 h-9 flex items-center justify-center text-lg flex-shrink-0"
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              aria-label="Next"
              disabled={queue.length === 0}
              className="text-lg flex-shrink-0"
            >
              ⏭
            </button>
          </div>
        </div>
      )}

      {isMobile && expanded && (
        <div
          className="fixed inset-0 z-[60] text-white flex flex-col overflow-y-auto transition-colors duration-500"
          style={{ backgroundColor: accentColor }}
        >
          <div className="flex justify-end p-4">
            <button onClick={() => setExpanded(false)} aria-label="Collapse player" className="text-2xl">
              ⌄
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center px-6 pb-8 gap-6 max-w-md mx-auto w-full">
            <img
              ref={imgRef}
              src={song.cover}
              crossOrigin="anonymous"
              onLoad={extractColor}
              className="w-56 h-56 max-w-full rounded-lg shadow-lg"
              alt="cover"
            />
            <div className="text-center">
              <p className="font-bold text-xl">{song.title}</p>
              {isGold && (
                <p className="text-xs text-yellow-200 mt-1">
                  Streams: {(song.streamCount || 0).toLocaleString()} | Listeners: {(song.listenerCount || 0).toLocaleString()}
                </p>
              )}
            </div>

            <div className="w-full flex items-center gap-2">
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

            <div className="flex items-center gap-6">
              <button
                onClick={() => setShuffle((s) => !s)}
                aria-label="Shuffle"
                aria-pressed={shuffle}
                className={`text-lg ${shuffle ? 'text-black bg-white/90 rounded-full w-9 h-9' : 'text-white/80'}`}
              >
                🔀
              </button>
              <button onClick={prev} aria-label="Previous" className="text-2xl">⏮</button>
              <button
                onClick={togglePlay}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="bg-white text-black rounded-full w-14 h-14 flex items-center justify-center text-2xl"
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
              <button onClick={next} aria-label="Next" disabled={queue.length === 0} className="text-2xl">⏭</button>
              <button
                onClick={cycleRepeat}
                aria-label={`Repeat ${repeat}`}
                className={`text-lg ${repeat !== 'off' ? 'text-black bg-white/90 rounded-full w-9 h-9' : 'text-white/80'}`}
              >
                {repeat === 'one' ? '🔂' : '🔁'}
              </button>
            </div>

            <div className="w-full flex items-center gap-2">
              <span aria-hidden="true">🔊</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer"
                aria-label="Volume"
              />
            </div>

            <div className="flex gap-6">
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

            {showQueue && (
              <div className="w-full bg-black/40 p-4 border border-gray-700 rounded-lg max-h-64 overflow-y-auto">
                <p className="text-sm font-bold mb-2">Up next</p>
                {queue.length === 0 ? (
                  <p className="text-xs text-gray-300 italic">Queue is empty.</p>
                ) : (
                  <ul className="space-y-2">
                    {queue.map((q) => (
                      <li
                        key={q.id}
                        onClick={() => playFromQueue(q)}
                        className="text-xs flex items-center gap-2 hover:bg-black/30 p-1 rounded cursor-pointer"
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
              <div className="w-full bg-black/40 p-4 border border-gray-700 rounded-lg max-h-64 overflow-y-auto">
                <p className="text-sm font-bold mb-2">Lyrics</p>
                <p className="text-xs text-gray-100 whitespace-pre-line">
                  {song.lyrics || 'No lyrics available for this track.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
