// components/ArtistStatsDashboard.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { getItem, deleteRecord } from '../utils/localStorage';
import { Song } from '../utils/types';
import { getCurrentUser } from '../utils/auth';
import { useLanguage } from '../context/LanguageContext';

export default function ArtistStatsDashboard() {
  const { t } = useLanguage();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const artist = getCurrentUser();
    const allSongs: Song[] = getItem('songs') || [];
    setSongs(artist ? allSongs.filter((s) => s.artistId === artist.id) : []);
    setLoaded(true);
  }, []);

  const handleDelete = (id: string) => {
    deleteRecord('songs', id);
    setSongs(songs.filter((s) => s.id !== id));
  };

  if (!loaded) return null;

  return (
    <div className="bg-gray-900 p-6 text-white rounded-lg">
      <h2 className="text-2xl font-bold mb-4">{t('artistPanel.title')}</h2>
      {songs.length === 0 ? (
        <p className="text-gray-500 italic">{t('artistPanel.noTracksYet')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="p-2">{t('artistPanel.trackTitle')}</th>
                <th className="p-2">{t('artistPanel.listeners')}</th>
                <th className="p-2">{t('artistPanel.streams')}</th>
                <th className="p-2">{t('artistPanel.earnings')}</th>
                <th className="p-2">{t('artistPanel.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {songs.map((song) => (
                <tr key={song.id} className="border-b border-gray-800">
                  <td className="p-2 whitespace-nowrap">{song.title}</td>
                  <td className="p-2 whitespace-nowrap">{(song.listenerCount || 0).toLocaleString()}</td>
                  <td className="p-2 whitespace-nowrap">{(song.streamCount || 0).toLocaleString()}</td>
                  <td className="p-2 whitespace-nowrap">${(song.earnings || 0).toLocaleString()}</td>
                  <td className="p-2 whitespace-nowrap">
                    <button onClick={() => handleDelete(song.id)} className="text-red-400">
                      {t('artistPanel.delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
