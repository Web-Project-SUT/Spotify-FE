// components/RecommendationEngine.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getItem, setItem } from '../utils/localStorage';
import { Song, User } from '../utils/types';
import { getRecommendations, Recommendation } from '../utils/recommendation';
import { useLanguage } from '../context/LanguageContext';
import { Card } from './ui';
import AddToPlaylistMenu from './AddToPlaylistMenu';

export default function RecommendationEngine() {
  const router = useRouter();
  const { t } = useLanguage();
  type State = { recommended: Recommendation[]; artists: Record<string, string>; loaded: boolean };
  const [state, setState] = useState<State>({ recommended: [], artists: {}, loaded: false });
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);

  useEffect(() => {
    const allSongs: Song[] = getItem('songs') || [];
    const users: User[] = getItem('users') || [];
    const history: string[] = getItem('listeningHistory') || [];
    const artists: Record<string, string> = {};
    users.forEach((u) => {
      if (u.role === 'artist') artists[u.id] = u.stageName || 'Unknown artist';
    });

    setState({ recommended: getRecommendations(allSongs, history), artists, loaded: true });

    const currentTrack = getItem('currentTrack');
    if (currentTrack) setCurrentPlayingId(currentTrack.id);
  }, []);

  if (!state.loaded || state.recommended.length === 0) return null;

  const goToArtist = (e: React.MouseEvent, artistId: string) => {
    e.stopPropagation();
    router.push(`/artist/${artistId}`);
  };

  const handlePlay = (e: React.MouseEvent, rec: Recommendation) => {
    e.stopPropagation();
    setItem('currentTrack', rec.song);
    const remainingQueue = state.recommended
      .filter((r) => r.song.id !== rec.song.id)
      .map((r) => r.song);
    setItem('queue', remainingQueue);
    setCurrentPlayingId(rec.song.id);
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('storage'));
  };

  return (
    <div className="my-8 w-full">
      <h2 className="text-2xl font-bold mb-4">{t('home.recommendedForYou')}</h2>
      <div className="flex overflow-x-auto space-x-4 pb-4">
        {state.recommended.map((rec) => (
          <Card key={rec.song.id} className="min-w-[160px] group relative">
            <div className="aspect-square bg-surface-3 rounded mb-3 flex items-center justify-center text-4xl relative overflow-hidden">
              {rec.song.cover || '🎵'}
              <button
                onClick={(e) => handlePlay(e, rec)}
                aria-label={`Play ${rec.song.title}`}
                className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center shadow-xl ${
                    currentPlayingId === rec.song.id ? 'bg-accent text-black' : 'bg-white text-black'
                  }`}
                >
                  {currentPlayingId === rec.song.id ? '⏸' : '▶'}
                </div>
              </button>
            </div>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-bold truncate">{rec.song.title}</p>
                <button
                  onClick={(e) => goToArtist(e, rec.song.artistId)}
                  className="text-muted text-sm hover:underline truncate block"
                >
                  {state.artists[rec.song.artistId] || 'Unknown artist'}
                </button>
              </div>
              <AddToPlaylistMenu songId={rec.song.id} />
            </div>
            <p className="text-muted text-xs mt-2 italic truncate">{t(rec.reasonKey, rec.reasonParams)}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
