// components/PlaylistManager.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { getItem, setItem, addRecord, deleteRecord, updateRecord } from '../utils/localStorage';
import { Playlist, User } from '../utils/types';

export default function PlaylistManager() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const user: User = getItem('currentUser');

  useEffect(() => {
    const allPlaylists: Playlist[] = getItem('playlists') || [];
    setPlaylists(allPlaylists.filter(p => p.userId === user?.id));
  }, []);

  const handleCreate = () => {
    // Tier limit check: Gold users (no limit) vs Regular (limit 3)
    if (user.role !== 'gold' && playlists.length >= 3) {
      alert("Upgrade to Gold to create more playlists!");
      return;
    }

    const newPlaylist: Playlist = {
      id: Date.now().toString(),
      userId: user.id,
      title: newTitle || "New Playlist",
      songIds: []
    };

    addRecord('playlists', newPlaylist);
    setPlaylists([...playlists, newPlaylist]);
    setNewTitle('');
  };

  const handleDelete = (id: string) => {
    deleteRecord('playlists', id);
    setPlaylists(playlists.filter(p => p.id !== id));
  };

  return (
    <div className="p-6 bg-gray-900 text-white rounded-xl">
      <h2 className="text-xl font-bold mb-4">Your Playlists</h2>
      <div className="flex gap-2 mb-4">
        <input 
          className="bg-gray-800 p-2 rounded flex-1"
          placeholder="New playlist name..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <button onClick={handleCreate} className="bg-green-500 px-4 py-2 rounded font-bold">Create</button>
      </div>
      
      {playlists.length === 0 ? (
        <div className="text-center py-10 text-gray-500 italic">No playlists yet. Create one!</div>
      ) : (
        <ul className="space-y-2">
          {playlists.map(p => (
            <li key={p.id} className="flex justify-between items-center bg-gray-800 p-3 rounded">
              {p.title}
              <button onClick={() => handleDelete(p.id)} className="text-red-400 text-sm">Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}