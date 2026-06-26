// app/artist-panel/page.tsx
'use client';

import React, { useEffect } from 'react';
import { initializeMockDatabase } from '../../utils/localStorage';
import ArtistStatsDashboard from '../../components/ArtistStatsDashboard';

export default function ArtistPanelPage() {
  useEffect(() => {
    initializeMockDatabase();
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 p-8">
      <ArtistStatsDashboard />
    </div>
  );
}
