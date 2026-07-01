// components/ProtectedRoute.tsx
'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { Role } from '../utils/types';
import { Spinner } from './ui';

interface ProtectedRouteProps {
  children: React.ReactNode;
  // If provided, only these roles may view the page; others are redirected.
  allow?: Role[];
}

export default function ProtectedRoute({ children, allow }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (allow && !allow.includes(user.role)) {
      router.replace('/home');
    }
  }, [user, loading, allow, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner size={32} />
      </div>
    );
  }
  if (!user) return null;
  if (allow && !allow.includes(user.role)) return null;

  return <>{children}</>;
}
