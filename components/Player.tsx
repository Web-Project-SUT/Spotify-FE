'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getItem, setItem, recordDailyStream, recordListen } from '../utils/localStorage';
import { readPreferences, writePreferences } from '../utils/preferences';
import { Song } from '../utils/types';
import { isGoldUser, getCurrentUser } from '../utils/auth';
import { recordStream, DAILY_STREAM_QUOTA_CODE } from '../utils/resources/streams';
import { CoverArt } from './ui';

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
  // Keyed by song id so switching tracks drops the previous track's banner
  // without a second effect clearing state (which the lint rules forbid).
  const [quotaError, setQuotaError] = useState<{ songId: string; detail: string } | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const reportedSongId = useRef<string | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    setSong(getItem('currentTrack'));
    setIsGold(isGoldUser(getItem('currentUser')));
    setQueue(getItem('queue') || []);

    // Sticky playback preferences (not live session state): restored once on
    // mount from whatever was last synced, same as quality/repeat/shuffle.
    const prefs = readPreferences();
    setQuality(prefs.playbackQuality);
    setRepeat(prefs.repeatMode);
    setShuffle(prefs.shuffle);
    setVolume(prefs.volume / 100);

    // Keep the bar in sync when another part of the app changes the track.
    const onStorage = () => {
      setSong(getItem('currentTrack'));
      setQueue(getItem('queue') || []);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Count one stream for the current listener each time a new track becomes
  // current. Keyed on the song id, and additionally guarded by a ref, so
  // re-renders, resuming the same track, or a StrictMode double-invoke can't
  // double-count. This is the single write point that feeds the "Streams
  // today" stat on the profile page and, via recordListen, the home page's
  // "Recommended for you" personalization.
  //
  // In API mode it also POSTs /streams/, which is what actually creates the
  // PlayEvent every server-side number is derived from — play counts, the
  // artist dashboard, monthly payouts, and the playlist's "last played".
  // The backend enforces the tier's daily cap on that call, so a 403 here
  // is the real limit being hit and playback has to stop.
  //
  // Dispatching 'storage' afterward (the project's existing same-tab sync
  // trick, since the native event never fires in the tab that wrote the
  // change) lets RecommendationEngine recompute without needing a refresh.
  useEffect(() => {
    if (!song?.id || reportedSongId.current === song.id) return;
    reportedSongId.current = song.id;

    const userId = getCurrentUser()?.id;
    recordDailyStream(userId);
    recordListen(userId, song.id);
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('storage'));

    void recordStream(song.id, getItem('currentPlaylistId')).then((error) => {
      if (error?.code !== DAILY_STREAM_QUOTA_CODE) return;
      audioRef.current?.pause();
      setIsPlaying(false);
      setQuotaError({ songId: song.id, detail: error.detail });
    });
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
    setRepeat((r) => {
      const next = r === 'off' ? 'all' : r === 'all' ? 'one' : 'off';
      writePreferences({ repeatMode: next });
      return next;
    });
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle((s) => {
      const next = !s;
      writePreferences({ shuffle: next });
      return next;
    });
  }, []);

  const toggleQuality = useCallback(() => {
    setQuality((q) => {
      const next: 'high' | 'low' = q === 'high' ? 'low' : 'high';
      writePreferences({ playbackQuality: next });
      return next;
    });
  }, []);

  const handleVolumeChange = useCallback((v: number) => {
    setVolume(v);
    writePreferences({ volume: Math.round(v * 100) });
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

  // Not `quotaError?.songId === song.id`: that is true when both sides are
  // undefined (no error, and a track with no id), and then dereferences null.
  const limitReached = quotaError && quotaError.songId === song.id ? quotaError.detail : null;

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
                  onClick={toggleShuffle}
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
                onClick={toggleQuality}
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

          {limitReached && (
            <p role="alert" className="max-w-6xl mx-auto mt-2 text-xs bg-black/60 rounded px-3 py-2">
              Daily stream limit reached — upgrade for unlimited listening. ({limitReached})
            </p>
          )}

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
                      <CoverArt cover={q.cover} alt={q.title} className="w-6 h-6 rounded" />
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
            {limitReached && (
              <p role="alert" className="w-full text-xs text-center bg-black/60 rounded px-3 py-2">
                Daily stream limit reached — upgrade for unlimited listening. ({limitReached})
              </p>
            )}

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
                onClick={toggleShuffle}
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
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer"
                aria-label="Volume"
              />
            </div>

            <div className="flex gap-6">
              <button
                onClick={toggleQuality}
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
                        <CoverArt cover={q.cover} alt={q.title} className="w-6 h-6 rounded" />
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
