// app/playlist/[id]/page.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppShell from '../../../components/AppShell';
import { getItem, setItem, updateRecord } from '../../../utils/localStorage';
import { Playlist, Song } from '../../../utils/types';
import { Button, EmptyState } from '../../../components/ui';

function PlaylistContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<Song[]>([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const playlists: Playlist[] = getItem('playlists') || [];
    const found = playlists.find((p) => p.id === params.id) || null;
    setPlaylist(found);
    setNotFound(!found);

    if (found) {
      const songs: Song[] = getItem('songs') || [];
      setTracks(found.songIds.map((id) => songs.find((s) => s.id === id)).filter((s): s is Song => !!s));
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

  if (notFound) {
    return <EmptyState icon="🎵" title="Playlist not found" />;
  }

  if (!playlist) return null;

  return (
    <div className="p-8">
      <div className="flex items-end gap-6 mb-8">
        <div className="w-44 h-44 bg-surface-3 rounded-lg flex items-center justify-center text-7xl">
          🎵
        </div>
        <div>
          <p className="text-muted text-sm uppercase">Playlist</p>
          <h1 className="text-4xl font-bold">{playlist.title}</h1>
          <p className="text-muted mt-2">{tracks.length} songs</p>
        </div>
      </div>

      {tracks.length > 0 && (
        <Button className="mb-6" onClick={() => play(tracks[0])}>Play all</Button>
      )}

      {tracks.length === 0 ? (
        <EmptyState
          title="No songs in this playlist yet"
          description="Add songs from the browse page."
          action={<Button onClick={() => router.push('/albums')}>Browse songs</Button>}
        />
      ) : (
        <div className="space-y-1">
          {tracks.map((song, i) => (
            <div
              key={song.id}
              onClick={() => play(song)}
              className="flex items-center gap-4 p-3 rounded hover:bg-surface-2 cursor-pointer"
            >
              <span className="text-muted w-6 text-right">{i + 1}</span>
              <span className="flex-1 font-medium">{song.title}</span>
              <span className="text-muted text-sm">{(song.plays || 0).toLocaleString()} plays</span>
            </div>
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
