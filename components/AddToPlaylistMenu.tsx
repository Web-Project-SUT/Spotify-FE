// components/AddToPlaylistMenu.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getItem, updateRecord } from '../utils/localStorage';
import { Playlist } from '../utils/types';
import { getCurrentUser } from '../utils/auth';

interface AddToPlaylistMenuProps {
  songId: string;
}

export default function AddToPlaylistMenu({ songId }: AddToPlaylistMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const currentUser = getCurrentUser();
    const allPlaylists: Playlist[] = getItem('playlists') || [];
    setPlaylists(currentUser ? allPlaylists.filter((p) => p.userId === currentUser.id) : []);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const toggle = (playlist: Playlist, e: React.MouseEvent) => {
    e.stopPropagation();
    const inPlaylist = playlist.songIds.includes(songId);
    const songIds = inPlaylist
      ? playlist.songIds.filter((id) => id !== songId)
      : [...playlist.songIds, songId];
    updateRecord('playlists', playlist.id, { songIds });
    setPlaylists((prev) => prev.map((p) => (p.id === playlist.id ? { ...p, songIds } : p)));
  };

  return (
    <div ref={containerRef} className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Add to playlist"
        className="w-7 h-7 flex items-center justify-center rounded-full bg-surface-3 hover:bg-accent hover:text-black transition-colors text-white text-lg leading-none"
      >
        +
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-2 w-56 bg-surface-2 border border-border rounded-lg shadow-lg p-2">
          <p className="text-xs text-muted px-2 py-1">Add to playlist</p>
          {playlists.length === 0 ? (
            <button
              onClick={() => router.push('/playlists')}
              className="w-full text-left text-sm px-2 py-2 rounded hover:bg-surface-3"
            >
              No playlists yet — create one
            </button>
          ) : (
            <ul className="max-h-60 overflow-y-auto">
              {playlists.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={(e) => toggle(p, e)}
                    className="w-full flex items-center justify-between gap-2 text-left text-sm px-2 py-2 rounded hover:bg-surface-3"
                  >
                    <span className="truncate">{p.title}</span>
                    {p.songIds.includes(songId) && <span className="text-accent">✓</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
