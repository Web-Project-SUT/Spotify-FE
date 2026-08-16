// app/player/page.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getItem } from '../../utils/localStorage';
import { Song } from '../../utils/types';
import { Button, CoverArt, EmptyState } from '../../components/ui';

export default function PlayerPage() {
  const router = useRouter();
  const [song, setSong] = useState<Song | null>(null);

  useEffect(() => {
    setSong(getItem('currentTrack'));
  }, []);

  if (!song) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <EmptyState title="Nothing playing" description="Pick a song to start listening." action={<Button onClick={() => router.push('/albums')}>Browse music</Button>} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 md:p-8 pb-32">
      <CoverArt
        cover={song.cover}
        alt={song.title}
        className="w-48 h-48 sm:w-64 sm:h-64 bg-surface-3 rounded-lg text-6xl sm:text-8xl mb-6"
      />
      <h1 className="text-2xl font-bold">{song.title}</h1>
      {song.lyrics && (
        <div className="mt-8 max-w-md text-center text-muted whitespace-pre-line">{song.lyrics}</div>
      )}
      <Button variant="ghost" className="mt-8" onClick={() => router.back()}>
        ← Back
      </Button>
    </div>
  );
}
