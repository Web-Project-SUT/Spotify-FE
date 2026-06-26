// app/albums/page.tsx
'use client';
import React from 'react';
import AppShell from '../../components/AppShell';
import AlbumsBrowse from '../../components/AlbumsBrowse';

export default function AlbumsPage() {
  return (
    <AppShell allow={['listener']}>
      <AlbumsBrowse />
    </AppShell>
  );
}
