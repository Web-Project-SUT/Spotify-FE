// app/album/[id]/page.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppShell from '../../../components/AppShell';
import { getItem, setItem } from '../../../utils/localStorage';
import { Album, Song, User } from '../../../utils/types';
import { Button, EmptyState } from '../../../components/ui';
import AddToPlaylistMenu from '../../../components/AddToPlaylistMenu';

function AlbumContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [album, setAlbum] = useState<Album | null>(null);
  const [tracks, setTracks] = useState<Song[]>([]);
  const [artistName, setArtistName] = useState('');

  useEffect(() => {
    const albums: Album[] = getItem('albums') || [];
    const found = albums.find((a) => a.id === params.id) || null;
    setAlbum(found);

    if (found) {
      const songs: Song[] = getItem('songs') || [];
      setTracks(songs.filter((s) => s.artistId === found.artistId));
      const users: User[] = getItem('users') || [];
      setArtistName(users.find((u) => u.id === found.artistId)?.stageName || 'Unknown artist');
    }
  }, [params.id]);

  const play = (song: Song) => {
    setItem('currentTrack', song);
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('storage'));
    router.push('/player');
  };

  if (!album) {
    return <EmptyState icon="💿" title="Album not found" />;
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 mb-8">
        <div className="w-32 h-32 sm:w-44 sm:h-44 bg-surface-3 rounded-lg flex items-center justify-center text-5xl sm:text-7xl flex-shrink-0">
          {album.cover || '💿'}
        </div>
        <div>
          <p className="text-muted text-sm uppercase">Album</p>
          <h1 className="text-2xl sm:text-4xl font-bold">{album.title}</h1>
          <button onClick={() => router.push(`/artist/${album.artistId}`)} className="text-muted hover:underline mt-2">
            {artistName} · {album.releaseYear}
          </button>
        </div>
      </div>

      {tracks.length > 0 && (
        <Button className="mb-6" onClick={() => play(tracks[0])}>Play all</Button>
      )}

      {tracks.length === 0 ? (
        <EmptyState title="No tracks in this album yet" />
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
              <AddToPlaylistMenu songId={song.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AlbumPage() {
  return (
    <AppShell allow={['listener']}>
      <AlbumContent />
    </AppShell>
  );
}
