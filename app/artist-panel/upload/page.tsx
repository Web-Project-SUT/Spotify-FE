// app/artist-panel/upload/page.tsx
'use client';

import React, { useEffect } from 'react';
import { initializeMockDatabase } from '../../../utils/localStorage';
import UploadArtworkForm from '../../../components/UploadArtworkForm';

export default function UploadArtworkPage() {
  useEffect(() => {
    initializeMockDatabase();
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 p-8 flex justify-center">
      <UploadArtworkForm />
    </div>
  );
}
