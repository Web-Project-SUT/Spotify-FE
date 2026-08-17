// app/artist-panel/page.tsx
'use client';
import React from 'react';
import AppShell from '../../components/AppShell';
import ArtistApprovalGate from '../../components/ArtistApprovalGate';
import ArtistStatsDashboard from '../../components/ArtistStatsDashboard';

export default function ArtistPanelPage() {
  return (
    <AppShell allow={['artist']}>
      <div className="p-4 md:p-8">
        <ArtistApprovalGate>
          <ArtistStatsDashboard />
        </ArtistApprovalGate>
      </div>
    </AppShell>
  );
}
