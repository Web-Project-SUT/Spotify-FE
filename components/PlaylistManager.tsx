// components/PlaylistManager.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getItem, addRecord, deleteRecord } from '../utils/localStorage';
import { Playlist, User } from '../utils/types';
import { getCurrentUser, getPlaylistLimit, getTier } from '../utils/auth';
import { useLanguage } from '../context/LanguageContext';

export default function PlaylistManager() {
  const { t } = useLanguage();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);

    const allPlaylists: Playlist[] = getItem('playlists') || [];
    setPlaylists(currentUser ? allPlaylists.filter((p) => p.userId === currentUser.id) : []);
    setLoaded(true);
  }, []);

  const limit = getPlaylistLimit(user);
  const tier = getTier(user);

  const handleCreate = () => {
    if (!user) return;

    // Tier limit per spec: basic = 6, silver = 100, gold = unlimited
    if (playlists.length >= limit) {
      alert(tier === 'basic' ? t('playlist.basicLimitReached') : t('playlist.silverLimitReached'));
      return;
    }

    const newPlaylist: Playlist = {
      id: Date.now().toString(),
      userId: user.id,
      title: newTitle || 'New Playlist',
      songIds: [],
    };

    addRecord('playlists', newPlaylist);
    setPlaylists([...playlists, newPlaylist]);
    setNewTitle('');
  };

  const handleDelete = (id: string) => {
    deleteRecord('playlists', id);
    setPlaylists(playlists.filter((p) => p.id !== id));
  };

  if (!loaded) return null;

  if (!user) {
    return <div className="p-6 bg-gray-900 text-gray-400 rounded-xl">{t('playlist.loginToManage')}</div>;
  }

  return (
    <div className="p-6 bg-gray-900 text-white rounded-xl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">{t('playlist.yourPlaylists')}</h2>
        <span className="text-xs text-gray-400">
          {playlists.length} / {limit === Infinity ? '∞' : limit}
        </span>
      </div>
      <div className="flex gap-2 mb-4">
        <input
          className="bg-gray-800 p-2 rounded flex-1"
          placeholder={t('playlist.namePlaceholder')}
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <button onClick={handleCreate} className="bg-green-500 px-4 py-2 rounded font-bold">
          {t('playlist.create')}
        </button>
      </div>

      {playlists.length === 0 ? (
        <div className="text-center py-10 text-gray-500 italic">{t('playlist.noPlaylistsYet')}</div>
      ) : (
        <ul className="space-y-2">
          {playlists.map((p) => (
            <li key={p.id} className="flex justify-between items-center bg-gray-800 p-3 rounded">
              <Link href={`/playlist/${p.id}`} className="hover:underline flex-1 mr-2">
                {p.title}
              </Link>
              <button onClick={() => handleDelete(p.id)} className="text-red-400 text-sm">
                {t('playlist.delete')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
