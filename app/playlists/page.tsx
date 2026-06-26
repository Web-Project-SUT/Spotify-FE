// app/playlists/page.tsx
'use client';

import React, { useEffect } from 'react';
import { initializeMockDatabase } from '../../utils/localStorage';
import PlaylistManager from '../../components/PlaylistManager';

export default function PlaylistsPage() {
  useEffect(() => {
    initializeMockDatabase();
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <PlaylistManager />
    </div>
  );
}
