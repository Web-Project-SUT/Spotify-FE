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
  const [navOpen, setNavOpen] = React.useState(false);

  return (
    <ProtectedRoute allow={allow}>
      <div className="flex bg-background min-h-screen">
        <header className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center gap-3 bg-surface px-4 py-3 border-b border-border">
          <button
            onClick={() => setNavOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={navOpen}
            className="text-xl leading-none text-white"
          >
            ☰
          </button>
          <span className="font-bold">Streamr</span>
        </header>
        <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
        <main className="flex-1 overflow-x-hidden pb-32 md:pb-28 pt-14 md:pt-0">{children}</main>
      </div>
    </ProtectedRoute>
  );
}
