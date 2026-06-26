// app/artist-panel/upload/page.tsx
'use client';
import React from 'react';
import AppShell from '../../../components/AppShell';
import UploadArtworkForm from '../../../components/UploadArtworkForm';

export default function UploadArtworkPage() {
  return (
    <AppShell allow={['artist']}>
      <div className="p-8">
        <UploadArtworkForm />
      </div>
    </AppShell>
  );
}
