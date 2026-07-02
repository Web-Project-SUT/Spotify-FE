// app/profile/page.tsx
'use client';
import React from 'react';
import AppShell from '../../components/AppShell';
import UserProfile from '../../components/UserProfile';
import { useAuth } from '../../context/AuthContext';

function ProfileContent() {
  const { user } = useAuth();
  if (!user) return null;
  return <UserProfile userId={user.id} />;
}

export default function ProfilePage() {
  return (
    <AppShell allow={['listener']}>
      <ProfileContent />
    </AppShell>
  );
}
