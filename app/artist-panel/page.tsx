// app/artist-panel/page.tsx
'use client';
import React from 'react';
import AppShell from '../../components/AppShell';
import ArtistStatsDashboard from '../../components/ArtistStatsDashboard';

export default function ArtistPanelPage() {
  return (
    <AppShell allow={['artist']}>
      <div className="p-8">
        <ArtistStatsDashboard />
      </div>
    </AppShell>
  );
}
