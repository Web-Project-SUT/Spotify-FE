// components/AppShell.tsx
'use client';
import React from 'react';
import Sidebar from './Sidebar';
import ProtectedRoute from './ProtectedRoute';
import { Role } from '../utils/types';

interface AppShellProps {
  children: React.ReactNode;
  allow?: Role[];
}

// Wraps in-app pages with the sidebar and auth protection. Leaves room
// at the bottom for the persistent player bar.
export default function AppShell({ children, allow }: AppShellProps) {
  return (
    <ProtectedRoute allow={allow}>
      <div className="flex bg-background min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-x-hidden pb-28">{children}</main>
      </div>
    </ProtectedRoute>
  );
}
