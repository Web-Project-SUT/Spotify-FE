// components/AlbumsBrowse.tsx
'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getItem, setItem } from '../utils/localStorage';
import { Song, Album, User } from '../utils/types';
import { Card, EmptyState } from './ui';
import AddToPlaylistMenu from './AddToPlaylistMenu';
import { useLanguage } from '../context/LanguageContext';

type SortKey = 'listeners' | 'date';

export default function AlbumsBrowse() {
  const router = useRouter();
  const { t } = useLanguage();
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Record<string, string>>({});
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('listeners');

  useEffect(() => {
    setSongs(getItem('songs') || []);
    setAlbums(getItem('albums') || []);
    const users: User[] = getItem('users') || [];
    const map: Record<string, string> = {};
    users.forEach((u) => {
      if (u.role === 'artist' && u.stageName) map[u.id] = u.stageName;
    });
    setArtists(map);
  }, []);

  const filteredAlbums = useMemo(() => {
    const q = query.toLowerCase();
    let result = albums.filter(
      (a) => a.title.toLowerCase().includes(q) || (artists[a.artistId] || '').toLowerCase().includes(q)
    );
    if (sort === 'date') {
      result = [...result].sort((a, b) => (b.releaseYear || 0) - (a.releaseYear || 0));
    }
    return result;
  }, [albums, query, sort, artists]);

  const filteredSongs = useMemo(() => {
    const q = query.toLowerCase();
    let result = songs.filter(
      (s) => s.title.toLowerCase().includes(q) || (artists[s.artistId] || '').toLowerCase().includes(q)
    );
    if (sort === 'listeners') {
      result = [...result].sort((a, b) => (b.listenerCount || 0) - (a.listenerCount || 0));
    } else {
      result = [...result].sort((a, b) => (b.year || 0) - (a.year || 0));
    }
    return result;
  }, [songs, query, sort, artists]);

  const playSong = (song: Song) => {
    setItem('currentTrack', song);
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('storage'));
    router.push('/player');
  };

  const goToArtist = (e: React.MouseEvent, artistId: string) => {
    e.stopPropagation();
    router.push(`/artist/${artistId}`);
  };

  const goToAlbum = (e: React.MouseEvent, albumId: string) => {
    e.stopPropagation();
    router.push(`/album/${albumId}`);
  };

  const noResults = filteredAlbums.length === 0 && filteredSongs.length === 0;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">{t('browse.title')}</h1>

      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('browse.searchPlaceholder')}
          className="flex-1 bg-surface-2 border border-border rounded-full px-4 py-2 text-white placeholder-muted focus:outline-none focus:border-white"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="bg-surface-2 border border-border rounded-full px-4 py-2 text-white"
        >
          <option value="listeners">{t('browse.sortByListeners')}</option>
          <option value="date">{t('browse.sortByDate')}</option>
        </select>
      </div>

      {noResults ? (
        <EmptyState icon="🔍" title={t('browse.noResultsTitle')} description={t('browse.noResultsDesc')} />
      ) : (
        <>
          {filteredAlbums.length > 0 && (
            <section className="mb-10">
              <h2 className="text-xl font-bold mb-4">{t('browse.albums')}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredAlbums.map((album) => (
                  <Card key={album.id} hoverable onClick={(e) => goToAlbum(e, album.id)}>
                    <div className="aspect-square bg-surface-3 rounded mb-3 flex items-center justify-center text-5xl">
                      {album.cover || '💿'}
                    </div>
                    <p className="font-bold truncate">{album.title}</p>
                    <button onClick={(e) => goToArtist(e, album.artistId)} className="text-muted text-sm hover:underline truncate block">
                      {artists[album.artistId] || t('browse.unknownArtist')}
                    </button>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {filteredSongs.length > 0 && (
            <section>
              <h2 className="text-xl font-bold mb-4">{t('browse.singles')}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredSongs.map((song) => (
                  <Card key={song.id} hoverable onClick={() => playSong(song)} className="relative">
                    <div className="absolute top-2 right-2">
                      <AddToPlaylistMenu songId={song.id} />
                    </div>
                    <div className="aspect-square bg-surface-3 rounded mb-3 flex items-center justify-center text-5xl">
                      {song.cover && song.cover.length <= 2 ? song.cover : '🎵'}
                    </div>
                    <p className="font-bold truncate">{song.title}</p>
                    <button onClick={(e) => goToArtist(e, song.artistId)} className="text-muted text-sm hover:underline truncate block">
                      {artists[song.artistId] || t('browse.unknownArtist')}
                    </button>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
