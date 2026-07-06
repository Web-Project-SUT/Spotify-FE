// app/playlist/[id]/page.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppShell from '../../../components/AppShell';
import { getItem, setItem, updateRecord } from '../../../utils/localStorage';
import { Playlist, Song, User } from '../../../utils/types';
import { Button, Card, EmptyState } from '../../../components/ui';
import AddToPlaylistMenu from '../../../components/AddToPlaylistMenu';
import { useLanguage } from '../../../context/LanguageContext';

function PlaylistContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useLanguage();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<Song[]>([]);
  const [artists, setArtists] = useState<Record<string, string>>({});
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const playlists: Playlist[] = getItem('playlists') || [];
    const found = playlists.find((p) => p.id === params.id) || null;
    setPlaylist(found);
    setNotFound(!found);

    if (found) {
      const songs: Song[] = getItem('songs') || [];
      setTracks(found.songIds.map((id) => songs.find((s) => s.id === id)).filter((s): s is Song => !!s));

      const users: User[] = getItem('users') || [];
      const map: Record<string, string> = {};
      users.forEach((u) => {
        if (u.role === 'artist' && u.stageName) map[u.id] = u.stageName;
      });
      setArtists(map);
    }
  }, [params.id]);

  const play = (song: Song) => {
    setItem('currentTrack', song);
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('storage'));
    if (playlist) {
      updateRecord('playlists', playlist.id, { lastPlayedAt: new Date().toISOString() });
    }
    router.push('/player');
  };

  const goToArtist = (e: React.MouseEvent, artistId: string) => {
    e.stopPropagation();
    router.push(`/artist/${artistId}`);
  };

  if (notFound) {
    return <EmptyState icon="🎵" title={t('playlist.notFound')} />;
  }

  if (!playlist) return null;

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 mb-8">
        <div className="w-32 h-32 sm:w-44 sm:h-44 bg-surface-3 rounded-lg flex items-center justify-center text-5xl sm:text-7xl flex-shrink-0">
          🎵
        </div>
        <div>
          <p className="text-muted text-sm uppercase">{t('playlist.eyebrow')}</p>
          <h1 className="text-2xl sm:text-4xl font-bold">{playlist.title}</h1>
          <p className="text-muted mt-2">
            {tracks.length} {t('playlist.songsLabel')}
          </p>
        </div>
      </div>

      {tracks.length > 0 && (
        <Button className="mb-6" onClick={() => play(tracks[0])}>{t('playlist.playAll')}</Button>
      )}

      {tracks.length === 0 ? (
        <EmptyState
          title={t('playlist.emptyTitle')}
          description={t('playlist.emptyDesc')}
          action={<Button onClick={() => router.push('/albums')}>{t('playlist.browseSongs')}</Button>}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {tracks.map((song) => (
            <Card key={song.id} hoverable onClick={() => play(song)} className="relative">
              <div className="absolute top-2 right-2">
                <AddToPlaylistMenu songId={song.id} />
              </div>
              <div className="aspect-square bg-surface-3 rounded mb-3 flex items-center justify-center text-5xl">
                {song.cover && song.cover.length <= 2 ? song.cover : '🎵'}
              </div>
              <p className="font-bold truncate">{song.title}</p>
              <button
                onClick={(e) => goToArtist(e, song.artistId)}
                className="text-muted text-sm hover:underline truncate block"
              >
                {artists[song.artistId] || t('browse.unknownArtist')}
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PlaylistPage() {
  return (
    <AppShell allow={['listener']}>
      <PlaylistContent />
    </AppShell>
  );
}
