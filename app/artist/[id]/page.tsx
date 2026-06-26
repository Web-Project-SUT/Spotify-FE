// app/artist/[id]/page.tsx
'use client';

import React, { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { initializeMockDatabase } from '../../../utils/localStorage';
import ArtistProfile from '../../../components/ArtistProfile';

export default function ArtistProfilePage() {
  const params = useParams<{ id: string }>();

  useEffect(() => {
    initializeMockDatabase();
  }, []);

  return <ArtistProfile artistId={params.id} />;
}
