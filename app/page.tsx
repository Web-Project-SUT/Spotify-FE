// app/page.tsx
'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

const roleHome: Record<string, string> = {
  listener: '/home',
  artist: '/artist-panel',
  support: '/support',
  admin: '/dashboard',
};

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? roleHome[user.role] || '/home' : '/login');
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center text-muted">
      Loading…
    </div>
  );
}
