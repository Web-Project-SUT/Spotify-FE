// components/RecentPlaylistsRow.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getItem } from '../utils/localStorage';
import { Playlist } from '../utils/types';
import { getCurrentUser } from '../utils/auth';
import { useLanguage } from '../context/LanguageContext';
import { Card, EmptyState, Button } from './ui';

const MAX_PLAYLISTS = 8;

function sortByRecency(playlists: Playlist[]): Playlist[] {
  return playlists
    .filter((p) => p.lastPlayedAt)
    .sort((a, b) => new Date(b.lastPlayedAt!).getTime() - new Date(a.lastPlayedAt!).getTime());
}

export default function RecentPlaylistsRow() {
  const router = useRouter();
  const { t } = useLanguage();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [hasAnyPlaylists, setHasAnyPlaylists] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const currentUser = getCurrentUser();
    const allPlaylists: Playlist[] = getItem('playlists') || [];
    const ownPlaylists = currentUser ? allPlaylists.filter((p) => p.userId === currentUser.id) : [];
    setHasAnyPlaylists(ownPlaylists.length > 0);
    setPlaylists(sortByRecency(ownPlaylists).slice(0, MAX_PLAYLISTS));
    setLoaded(true);
  }, []);

  if (!loaded) return null;

  return (
    <div className="my-8 w-full">
      <h2 className="text-2xl font-bold mb-4">{t('home.recentlyPlayed')}</h2>
      {playlists.length === 0 ? (
        hasAnyPlaylists ? (
          <EmptyState
            icon="🎵"
            title={t('home.nothingPlayedRecentlyTitle')}
            description={t('home.nothingPlayedRecentlyDesc')}
            action={<Button onClick={() => router.push('/playlists')}>{t('home.goToPlaylists')}</Button>}
          />
        ) : (
          <EmptyState
            icon="🎵"
            title={t('home.noPlaylistsYetTitle')}
            description={t('home.noPlaylistsYetDesc')}
            action={<Button onClick={() => router.push('/playlists')}>{t('home.createFirstPlaylist')}</Button>}
          />
        )
      ) : (
        <div className="flex overflow-x-auto space-x-4 pb-4">
          {playlists.map((playlist) => (
            <Card
              key={playlist.id}
              hoverable
              className="min-w-[160px]"
              onClick={() => router.push(`/playlist/${playlist.id}`)}
            >
              <div className="aspect-square bg-surface-3 rounded mb-3 flex items-center justify-center text-5xl">
                🎵
              </div>
              <p className="font-bold truncate">{playlist.title}</p>
              <p className="text-muted text-sm truncate">{playlist.songIds.length} songs</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
