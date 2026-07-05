// components/Sidebar.tsx
'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { Role } from '../utils/types';
import { Avatar, Badge } from './ui';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  roles?: Role[]; // if set, only shown to these roles
}

const NAV: NavItem[] = [
  { href: '/home', label: 'Home', icon: '🏠', roles: ['listener'] },
  { href: '/albums', label: 'Browse', icon: '🔍', roles: ['listener'] },
  { href: '/playlists', label: 'Playlists', icon: '📚', roles: ['listener'] },
  { href: '/notifications', label: 'Notifications', icon: '🔔' },
  { href: '/settings', label: 'Settings', icon: '⚙️', roles: ['listener', 'artist'] },
  { href: '/artist-panel', label: 'My works', icon: '🎨', roles: ['artist'] },
  { href: '/artist-panel/upload', label: 'Upload', icon: '⬆️', roles: ['artist'] },
  { href: '/support', label: 'Tickets & approvals', icon: '🎫', roles: ['support', 'admin'] },
  { href: '/dashboard', label: 'Financials', icon: '💰', roles: ['admin'] },
  { href: '/group', label: 'Group session', icon: '👥', roles: ['listener'] },
];

const tierBadge: Record<string, React.ReactNode> = {
  gold: <Badge tone="gold">Gold</Badge>,
  silver: <Badge tone="silver">Silver</Badge>,
  basic: <Badge tone="neutral">Free</Badge>,
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (!user) return null;

  const items = NAV.filter((item) => !item.roles || item.roles.includes(user.role));

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <aside className="w-60 bg-surface flex-shrink-0 flex flex-col h-screen sticky top-0 p-4 pb-28 overflow-y-auto">
      <div className="flex items-center gap-2 px-2 mb-6">
        <span className="text-accent text-2xl">●</span>
        <span className="font-bold text-lg">Streamr</span>
      </div>

      <nav className="flex-1 space-y-1">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${active ? 'bg-surface-3 text-white font-bold' : 'text-muted hover:text-white'}`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border pt-4 mt-4">
        <Link href={user.role === 'listener' ? '/profile' : '#'} className="flex items-center gap-2 mb-3">
          <Avatar src={user.cover} name={user.displayName || user.stageName || user.email} size={36} />
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">{user.displayName || user.stageName || user.email}</p>
            <div className="mt-0.5">
              {user.role === 'listener' ? tierBadge[user.tier || 'basic'] : <Badge tone="info">{user.role}</Badge>}
            </div>
          </div>
        </Link>
        <button onClick={handleLogout} className="text-muted text-sm hover:text-white w-full text-left px-1">
          Log out
        </button>
      </div>
    </aside>
  );
}
