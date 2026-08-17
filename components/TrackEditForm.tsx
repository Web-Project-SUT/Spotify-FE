// components/TrackEditForm.tsx
'use client';

import React, { useState } from 'react';
import { Album, Song } from '../utils/types';
import { updateTrack } from '../utils/resources/catalog';
import { uploadTrackAudio, uploadTrackCover } from '../utils/resources/uploads';
import { apiEnabled } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';

const ACCEPTED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/flac', 'audio/x-flac'];

interface TrackEditFormProps {
  track: Song;
  /** The artist's own albums, for the album selector. */
  albums: Album[];
  onSaved: (track: Song) => void;
  onCancel: () => void;
}

// `doc.tex` §2.9 gives artists the right to *edit* as well as delete their
// published works. The backend has always accepted PATCH /tracks/{id}/ plus
// the cover/audio replace endpoints; nothing called them until this form.
export default function TrackEditForm({ track, albums, onSaved, onCancel }: TrackEditFormProps) {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    title: track.title,
    genre: track.genre || '',
    year: track.year ? String(track.year) : '',
    lyrics: track.lyrics || '',
    collaborators: (track.collaborators || []).join(', '),
    releaseType: track.releaseType || 'single',
    albumId: track.albumId || '',
  });
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && !ACCEPTED_AUDIO_TYPES.includes(file.type)) {
      setError(t('upload.errorAudioType'));
      setAudioFile(null);
      return;
    }
    setError(null);
    setAudioFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError(t('upload.errorTitleRequired'));
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const collaborators = form.collaborators
        ? form.collaborators.split(',').map((c) => c.trim()).filter(Boolean)
        : [];
      const patch = {
        title: form.title.trim(),
        genre: form.genre.trim(),
        year: form.year ? parseInt(form.year, 10) : null,
        lyrics: form.lyrics.trim(),
        releaseType: form.releaseType,
        collaborators,
        // '' means "not in an album" — send null so the backend detaches it
        // rather than 400ing on an empty uuid.
        albumId: form.albumId || null,
      };
      const updated = await updateTrack(track.id, patch);
      if (apiEnabled && !updated) {
        setError(t('trackEdit.errorSaveFailed'));
        return;
      }
      if (coverFile && !(await uploadTrackCover(track.id, coverFile))) {
        setError(t('trackEdit.errorCoverFailed'));
        return;
      }
      if (audioFile && !(await uploadTrackAudio(track.id, { high: audioFile }))) {
        setError(t('upload.errorAudioUploadFailed'));
        return;
      }
      onSaved(
        updated || {
          ...track,
          title: patch.title,
          genre: patch.genre || undefined,
          year: patch.year ?? undefined,
          lyrics: patch.lyrics || undefined,
          releaseType: patch.releaseType,
          collaborators,
          albumId: patch.albumId || undefined,
        }
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="bg-gray-800 p-4 rounded space-y-3 max-w-md"
      aria-label={t('trackEdit.title')}
    >
      <h3 className="font-bold">{t('trackEdit.title')}</h3>
      {error && <p className="text-red-400 text-sm">{error}</p>}

      <input
        aria-label={t('upload.titlePlaceholder')}
        className="block w-full p-2 bg-gray-900 rounded"
        placeholder={t('upload.titlePlaceholder')}
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
      />
      <input
        aria-label={t('upload.genrePlaceholder')}
        className="block w-full p-2 bg-gray-900 rounded"
        placeholder={t('upload.genrePlaceholder')}
        value={form.genre}
        onChange={(e) => setForm({ ...form, genre: e.target.value })}
      />
      <input
        type="number"
        aria-label={t('upload.yearPlaceholder')}
        className="block w-full p-2 bg-gray-900 rounded"
        placeholder={t('upload.yearPlaceholder')}
        value={form.year}
        onChange={(e) => setForm({ ...form, year: e.target.value })}
      />
      <input
        aria-label={t('upload.collaboratorsPlaceholder')}
        className="block w-full p-2 bg-gray-900 rounded"
        placeholder={t('upload.collaboratorsPlaceholder')}
        value={form.collaborators}
        onChange={(e) => setForm({ ...form, collaborators: e.target.value })}
      />
      <textarea
        aria-label={t('upload.lyricsPlaceholder')}
        className="block w-full p-2 bg-gray-900 rounded"
        placeholder={t('upload.lyricsPlaceholder')}
        value={form.lyrics}
        onChange={(e) => setForm({ ...form, lyrics: e.target.value })}
      />

      <div>
        <label htmlFor={`album-select-${track.id}`} className="block text-sm text-gray-400 mb-1">
          {t('upload.albumLabel')}
        </label>
        <select
          id={`album-select-${track.id}`}
          className="block w-full p-2 bg-gray-900 rounded"
          value={form.albumId}
          onChange={(e) =>
            setForm({
              ...form,
              albumId: e.target.value,
              // Album membership and release type are one decision, not two.
              releaseType: e.target.value ? 'album_track' : 'single',
            })
          }
        >
          <option value="">{t('upload.albumNone')}</option>
          {albums.map((album) => (
            <option key={album.id} value={album.id}>
              {album.title}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={`edit-cover-${track.id}`} className="block text-sm text-gray-400 mb-1">
          {t('trackEdit.replaceCover')}
        </label>
        <input
          id={`edit-cover-${track.id}`}
          type="file"
          accept="image/*"
          className="text-sm"
          onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
        />
      </div>
      <div>
        <label htmlFor={`edit-audio-${track.id}`} className="block text-sm text-gray-400 mb-1">
          {t('trackEdit.replaceAudio')}
        </label>
        <input
          id={`edit-audio-${track.id}`}
          type="file"
          accept=".mp3,.wav,.flac,audio/*"
          className="text-sm"
          onChange={handleAudioChange}
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="bg-green-600 px-4 py-2 rounded font-bold disabled:opacity-50"
        >
          {t('trackEdit.save')}
        </button>
        <button type="button" onClick={onCancel} className="text-gray-400 px-4 py-2">
          {t('trackEdit.cancel')}
        </button>
      </div>
    </form>
  );
}
