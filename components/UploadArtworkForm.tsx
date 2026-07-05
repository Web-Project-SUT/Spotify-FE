// components/UploadArtworkForm.tsx
'use client';
import React, { useState } from 'react';
import { addRecord } from '../utils/localStorage';
import { getCurrentUser } from '../utils/auth';
import { useLanguage } from '../context/LanguageContext';

const ACCEPTED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/flac', 'audio/x-flac'];

export default function UploadArtworkForm() {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    title: '',
    genre: '',
    year: '',
    lyrics: '',
    collaborators: '',
    releaseType: 'single' as 'single' | 'album',
  });
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setCoverFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setCoverPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setCoverPreview(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const artist = getCurrentUser();
    if (!artist || artist.role !== 'artist') {
      setError(t('upload.errorOnlyArtists'));
      return;
    }
    if (!formData.title.trim()) {
      setError(t('upload.errorTitleRequired'));
      return;
    }
    if (!audioFile) {
      setError(t('upload.errorAudioRequired'));
      return;
    }

    const newSong = {
      id: Date.now().toString(),
      title: formData.title.trim(),
      artistId: artist.id,
      cover: coverPreview || '🎵',
      plays: 0,
      streamCount: 0,
      listenerCount: 0,
      earnings: 0,
      genre: formData.genre.trim() || undefined,
      year: formData.year ? parseInt(formData.year, 10) : undefined,
      lyrics: formData.lyrics.trim() || undefined,
      collaborators: formData.collaborators
        ? formData.collaborators.split(',').map((c) => c.trim()).filter(Boolean)
        : [],
      releaseType: formData.releaseType,
      // In phase 2 this filename becomes a real uploaded asset path served
      // by the backend; for the phase 1 mock we just record the filename.
      audioFileName: audioFile.name,
    };

    addRecord('songs', newSong);
    setError(null);
    setFormData({ title: '', genre: '', year: '', lyrics: '', collaborators: '', releaseType: 'single' });
    setAudioFile(null);
    setCoverFile(null);
    setCoverPreview(null);
    alert(t('upload.successAlert'));
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-900 p-6 rounded-lg text-white max-w-md space-y-3">
      <h2 className="text-xl font-bold mb-2">{t('upload.title')}</h2>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={formData.releaseType === 'single'}
            onChange={() => setFormData({ ...formData, releaseType: 'single' })}
          />
          {t('upload.single')}
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={formData.releaseType === 'album'}
            onChange={() => setFormData({ ...formData, releaseType: 'album' })}
          />
          {t('upload.album')}
        </label>
      </div>

      <input
        className="block w-full p-2 bg-gray-800 rounded"
        placeholder={t('upload.titlePlaceholder')}
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
      />
      <input
        className="block w-full p-2 bg-gray-800 rounded"
        placeholder={t('upload.genrePlaceholder')}
        value={formData.genre}
        onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
      />
      <input
        type="number"
        className="block w-full p-2 bg-gray-800 rounded"
        placeholder={t('upload.yearPlaceholder')}
        value={formData.year}
        onChange={(e) => setFormData({ ...formData, year: e.target.value })}
      />
      <input
        className="block w-full p-2 bg-gray-800 rounded"
        placeholder={t('upload.collaboratorsPlaceholder')}
        value={formData.collaborators}
        onChange={(e) => setFormData({ ...formData, collaborators: e.target.value })}
      />
      <textarea
        className="block w-full p-2 bg-gray-800 rounded"
        placeholder={t('upload.lyricsPlaceholder')}
        value={formData.lyrics}
        onChange={(e) => setFormData({ ...formData, lyrics: e.target.value })}
      />

      <div>
        <label htmlFor="audio-upload" className="block text-sm text-gray-400 mb-1">{t('upload.audioFileLabel')}</label>
        <input id="audio-upload" type="file" accept=".mp3,.wav,.flac,audio/*" onChange={handleAudioChange} className="text-sm" />
        {audioFile && <p className="text-xs text-green-400 mt-1">{audioFile.name}</p>}
      </div>

      <div>
        <label htmlFor="cover-upload" className="block text-sm text-gray-400 mb-1">{t('upload.coverImageLabel')}</label>
        <input id="cover-upload" type="file" accept="image/*" onChange={handleCoverChange} className="text-sm" />
        {coverPreview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverPreview} alt="Cover preview" className="w-20 h-20 mt-2 rounded object-cover" />
        )}
      </div>

      <button type="submit" className="bg-green-600 px-4 py-2 mt-2 rounded font-bold">
        {t('upload.submit')}
      </button>
    </form>
  );
}
