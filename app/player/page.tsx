// app/player/page.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getItem } from '../../utils/localStorage';
import { Song } from '../../utils/types';
import { Button, EmptyState } from '../../components/ui';

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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 pb-32">
      <div className="w-64 h-64 bg-surface-3 rounded-lg flex items-center justify-center text-8xl mb-6">
        {song.cover && song.cover.length <= 2 ? song.cover : '🎵'}
      </div>
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
