// app/artist-panel/albums/page.tsx
'use client';
import React from 'react';
import AppShell from '../../../components/AppShell';
import ArtistApprovalGate from '../../../components/ArtistApprovalGate';
import AlbumManager from '../../../components/AlbumManager';

export default function ArtistAlbumsPage() {
  return (
    <AppShell allow={['artist']}>
      <div className="p-4 md:p-8">
        <ArtistApprovalGate>
          <AlbumManager />
        </ArtistApprovalGate>
      </div>
    </AppShell>
  );
}
