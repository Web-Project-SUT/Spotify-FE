// app/profile/[id]/page.tsx
'use client';

import React, { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { initializeMockDatabase } from '../../../utils/localStorage';
import AppShell from '../../../components/AppShell';
import UserProfile from '../../../components/UserProfile';

export default function UserProfilePage() {
  const params = useParams<{ id: string }>();

  useEffect(() => {
    initializeMockDatabase();
  }, []);

  return (
    <AppShell>
      <UserProfile userId={params.id} />
    </AppShell>
  );
}
