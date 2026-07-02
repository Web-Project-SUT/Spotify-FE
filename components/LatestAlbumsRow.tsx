// components/LatestAlbumsRow.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getItem } from '../utils/localStorage';
import { Album, User } from '../utils/types';
import { Card, EmptyState } from './ui';

const MAX_ALBUMS = 8;

export default function LatestAlbumsRow() {
  const router = useRouter();
  type State = { albums: Album[]; artists: Record<string, string>; loaded: boolean };
  const [state, setState] = useState<State>({ albums: [], artists: {}, loaded: false });

  useEffect(() => {
    const allAlbums: Album[] = getItem('albums') || [];
    const users: User[] = getItem('users') || [];
    const map: Record<string, string> = {};
    users.forEach((u) => {
      if (u.role === 'artist') map[u.id] = u.stageName || 'Unknown artist';
    });
    const sorted = [...allAlbums]
      .sort((a, b) => (b.releaseYear || 0) - (a.releaseYear || 0))
      .slice(0, MAX_ALBUMS);
    setState({ albums: sorted, artists: map, loaded: true });
  }, []);

  if (!state.loaded) return null;

  const goToArtist = (e: React.MouseEvent, artistId: string) => {
    e.stopPropagation();
    router.push(`/artist/${artistId}`);
  };

  return (
    <div className="my-8 w-full">
      <h2 className="text-2xl font-bold mb-4">Latest albums</h2>
      {state.albums.length === 0 ? (
        <EmptyState icon="💿" title="No albums yet" />
      ) : (
        <div className="flex overflow-x-auto space-x-4 pb-4">
          {state.albums.map((album) => (
            <Card
              key={album.id}
              hoverable
              className="min-w-[160px]"
              onClick={() => router.push(`/album/${album.id}`)}
            >
              <div className="aspect-square bg-surface-3 rounded mb-3 flex items-center justify-center text-5xl">
                {album.cover || '💿'}
              </div>
              <p className="font-bold truncate">{album.title}</p>
              <button
                onClick={(e) => goToArtist(e, album.artistId)}
                className="text-muted text-sm hover:underline truncate block"
              >
                {state.artists[album.artistId] || 'Unknown artist'}
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
