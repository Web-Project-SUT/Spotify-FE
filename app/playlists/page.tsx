// app/playlists/page.tsx
'use client';
import React from 'react';
import AppShell from '../../components/AppShell';
import PlaylistManager from '../../components/PlaylistManager';

export default function PlaylistsPage() {
  return (
    <AppShell allow={['listener']}>
      <div className="p-8">
        <PlaylistManager />
      </div>
    </AppShell>
  );
}
