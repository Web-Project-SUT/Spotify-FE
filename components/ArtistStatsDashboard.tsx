// components/ArtistStatsDashboard.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { getItem, deleteRecord } from '../utils/localStorage';
import { Song } from '../utils/types';

export default function ArtistStatsDashboard() {
  const [songs, setSongs] = useState<Song[]>([]);

  useEffect(() => {
    const allSongs = getItem('songs') || [];
    setSongs(allSongs.filter((s: Song) => s.artistId === 'current-user-id'));
  }, []);

  const handleDelete = (id: string) => {
    deleteRecord('songs', id);
    setSongs(songs.filter(s => s.id !== id));
  };

  return (
    <div className="bg-gray-900 p-6 text-white">
      <h2 className="text-2xl font-bold mb-4">Artist Dashboard</h2>
      <table className="w-full text-left">
        <thead><tr className="border-b border-gray-700"><th>Title</th><th>Streams</th><th>Earnings</th><th>Actions</th></tr></thead>
        <tbody>
          {songs.map(song => (
            <tr key={song.id} className="border-b border-gray-800">
              <td>{song.title}</td>
              <td>{song.streamCount}</td>
              <td>${song.earnings}</td>
              <td>
                <button onClick={() => handleDelete(song.id)} className="text-red-400">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}