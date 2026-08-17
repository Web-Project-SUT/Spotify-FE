// components/AlbumManager.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Album } from '../utils/types';
import { getCurrentUser } from '../utils/auth';
import { loadMyAlbums, createAlbum, updateAlbum, deleteAlbum } from '../utils/resources/catalog';
import { uploadAlbumCover } from '../utils/resources/uploads';
import { apiEnabled } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { CoverArt } from './ui';

// The artist's album shelf: create, rename, re-cover and delete. `doc.tex`
// asks artists to publish "in the form of single tracks and albums" — the
// backend has had POST /albums/ and PUT /albums/{id}/cover/ all along, this
// is the half that calls them.
export default function AlbumManager() {
  const { t } = useLanguage();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [title, setTitle] = useState('');
  const [year, setYear] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editYear, setEditYear] = useState('');

  useEffect(() => {
    let active = true;
    void (async () => {
      const me = getCurrentUser();
      const mine = me ? await loadMyAlbums(me.id) : [];
      if (!active) return;
      setAlbums(mine);
      setLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setCoverFile(file);
    if (!file) {
      setCoverPreview(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCoverPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCreate = async () => {
    const artist = getCurrentUser();
    if (!artist || artist.role !== 'artist') {
      setError(t('albums.errorOnlyArtists'));
      return;
    }
    if (!title.trim()) {
      setError(t('albums.errorTitleRequired'));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const album = await createAlbum(
        { title: title.trim(), releaseYear: year ? parseInt(year, 10) : undefined },
        artist.id
      );
      // In API mode a null album means the server refused; say so rather than
      // showing an album that only this browser believes exists.
      if (!album) {
        setError(t('albums.errorCreateFailed'));
        return;
      }
      let created = album;
      if (coverFile && apiEnabled) {
        const ok = await uploadAlbumCover(album.id, coverFile);
        if (!ok) setError(t('albums.errorCoverFailed'));
        // Show the local preview either way: on success it is what the server
        // now holds, and on failure it is not persisted anywhere.
        else created = { ...album, cover: coverPreview || album.cover };
      } else if (coverFile && coverPreview) {
        created = { ...album, cover: coverPreview };
      }
      setAlbums([created, ...albums]);
      setTitle('');
      setYear('');
      setCoverFile(null);
      setCoverPreview(null);
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (album: Album) => {
    setEditingId(album.id);
    setEditTitle(album.title);
    setEditYear(album.releaseYear ? String(album.releaseYear) : '');
  };

  const handleSaveEdit = async (album: Album) => {
    if (!editTitle.trim()) return;
    const patch = {
      title: editTitle.trim(),
      releaseYear: editYear ? parseInt(editYear, 10) : undefined,
    };
    const updated = await updateAlbum(album.id, patch);
    setAlbums(albums.map((a) => (a.id === album.id ? { ...a, ...(updated || patch) } : a)));
    setEditingId(null);
  };

  const handleReplaceCover = async (album: Album, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ok = await uploadAlbumCover(album.id, file);
    if (!ok) {
      setError(t('albums.errorCoverFailed'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setAlbums((prev) =>
        prev.map((a) => (a.id === album.id ? { ...a, cover: reader.result as string } : a))
      );
    reader.readAsDataURL(file);
  };

  const handleDelete = async (id: string) => {
    await deleteAlbum(id);
    setAlbums(albums.filter((a) => a.id !== id));
  };

  if (!loaded) return null;

  return (
    <div className="bg-gray-900 p-6 rounded-lg text-white">
      <h2 className="text-2xl font-bold mb-4">{t('albums.title')}</h2>

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      <div className="bg-gray-800 p-4 rounded mb-6 space-y-3 max-w-md">
        <h3 className="font-bold text-sm">{t('albums.newAlbum')}</h3>
        <input
          className="block w-full p-2 bg-gray-900 rounded"
          placeholder={t('albums.titlePlaceholder')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="number"
          className="block w-full p-2 bg-gray-900 rounded"
          placeholder={t('albums.yearPlaceholder')}
          value={year}
          onChange={(e) => setYear(e.target.value)}
        />
        <div>
          <label htmlFor="album-cover-upload" className="block text-sm text-gray-400 mb-1">
            {t('albums.coverLabel')}
          </label>
          <input
            id="album-cover-upload"
            type="file"
            accept="image/*"
            onChange={handleCoverChange}
            className="text-sm"
          />
          {coverPreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverPreview} alt="Album cover preview" className="w-20 h-20 mt-2 rounded object-cover" />
          )}
        </div>
        <button
          onClick={() => void handleCreate()}
          disabled={submitting}
          className="bg-green-600 px-4 py-2 rounded font-bold disabled:opacity-50"
        >
          {t('albums.create')}
        </button>
      </div>

      {albums.length === 0 ? (
        <p className="text-gray-500 italic">{t('albums.noAlbumsYet')}</p>
      ) : (
        <ul className="space-y-2">
          {albums.map((album) => (
            <li key={album.id} className="flex items-center gap-3 bg-gray-800 p-3 rounded">
              <CoverArt cover={album.cover} fallback="💿" alt={album.title} className="w-12 h-12 rounded text-2xl" />
              {editingId === album.id ? (
                <>
                  <input
                    aria-label={t('albums.titlePlaceholder')}
                    className="flex-1 p-1 bg-gray-900 rounded"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />
                  <input
                    type="number"
                    aria-label={t('albums.yearPlaceholder')}
                    className="w-20 p-1 bg-gray-900 rounded"
                    value={editYear}
                    onChange={(e) => setEditYear(e.target.value)}
                  />
                  <button onClick={() => void handleSaveEdit(album)} className="text-green-400 text-sm">
                    {t('albums.save')}
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-gray-400 text-sm">
                    {t('albums.cancel')}
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 font-medium">{album.title}</span>
                  <span className="text-gray-400 text-sm">{album.releaseYear || '—'}</span>
                  <label className="text-blue-400 text-sm cursor-pointer">
                    {t('albums.replaceCover')}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => void handleReplaceCover(album, e)}
                    />
                  </label>
                  <button onClick={() => startEdit(album)} className="text-blue-400 text-sm">
                    {t('albums.edit')}
                  </button>
                  <button onClick={() => void handleDelete(album.id)} className="text-red-400 text-sm">
                    {t('albums.delete')}
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
