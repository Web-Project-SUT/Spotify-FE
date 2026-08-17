// components/ArtistStatsDashboard.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { getCurrentUser } from '../utils/auth';
import { loadMyTrackStats, TrackStat } from '../utils/resources/reports';
import { deleteTrack, loadSongs, loadMyAlbums } from '../utils/resources/catalog';
import { Album, Song } from '../utils/types';
import { useLanguage } from '../context/LanguageContext';
import TrackEditForm from './TrackEditForm';

export default function ArtistStatsDashboard() {
  const { t } = useLanguage();
  const [songs, setSongs] = useState<TrackStat[]>([]);
  // The stats rows carry the numbers but not the editable metadata, so the
  // catalog entries are loaded alongside them to prefill the edit form.
  const [tracks, setTracks] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const artist = getCurrentUser();
      const [stats, allSongs, myAlbums] = await Promise.all([
        artist ? loadMyTrackStats() : Promise.resolve([]),
        artist ? loadSongs() : Promise.resolve([]),
        artist ? loadMyAlbums(artist.id) : Promise.resolve([]),
      ]);
      if (!active) return;
      setSongs(stats);
      setTracks(allSongs.filter((s) => s.artistId === artist?.id));
      setAlbums(myAlbums);
      setLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleDelete = async (id: string) => {
    await deleteTrack(id);
    setSongs(songs.filter((s) => s.id !== id));
    setTracks(tracks.filter((s) => s.id !== id));
  };

  const handleSaved = (updated: Song) => {
    setTracks(tracks.map((s) => (s.id === updated.id ? updated : s)));
    setSongs(songs.map((s) => (s.id === updated.id ? { ...s, title: updated.title } : s)));
    setEditingId(null);
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
              {songs.map((song) => {
                const track = tracks.find((s) => s.id === song.id);
                return (
                  <React.Fragment key={song.id}>
                    <tr className="border-b border-gray-800">
                      <td className="p-2 whitespace-nowrap">{song.title}</td>
                      <td className="p-2 whitespace-nowrap">{(song.listenerCount || 0).toLocaleString()}</td>
                      <td className="p-2 whitespace-nowrap">{(song.streamCount || 0).toLocaleString()}</td>
                      <td className="p-2 whitespace-nowrap">${(song.earnings || 0).toLocaleString()}</td>
                      <td className="p-2 whitespace-nowrap space-x-3">
                        {track && (
                          <button
                            onClick={() => setEditingId(editingId === song.id ? null : song.id)}
                            className="text-blue-400"
                          >
                            {t('artistPanel.edit')}
                          </button>
                        )}
                        <button onClick={() => void handleDelete(song.id)} className="text-red-400">
                          {t('artistPanel.delete')}
                        </button>
                      </td>
                    </tr>
                    {editingId === song.id && track && (
                      <tr>
                        <td colSpan={5} className="p-2">
                          <TrackEditForm
                            track={track}
                            albums={albums}
                            onSaved={handleSaved}
                            onCancel={() => setEditingId(null)}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
