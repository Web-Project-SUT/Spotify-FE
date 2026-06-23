// components/UploadArtworkForm.tsx
'use client';
import React, { useState } from 'react';
import { addRecord } from '../utils/localStorage';

export default function UploadArtworkForm() {
  const [formData, setFormData] = useState({ title: '', genre: '', year: '', lyrics: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newSong = {
      ...formData,
      id: Date.now().toString(),
      artistId: 'current-user-id',
      cover: '🎵',
      plays: 0,
      streamCount: 0,
      listenerCount: 0,
      earnings: 0,
      year: parseInt(formData.year)
    };
    addRecord('songs', newSong);
    alert('Upload successful!');
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-900 p-6 rounded-lg text-white">
      <h2 className="text-xl font-bold mb-4">Upload New Artwork</h2>
      <input className="block w-full mb-2 p-2 bg-gray-800" placeholder="Title" onChange={e => setFormData({...formData, title: e.target.value})} />
      <input className="block w-full mb-2 p-2 bg-gray-800" placeholder="Genre" onChange={e => setFormData({...formData, genre: e.target.value})} />
      <input type="number" className="block w-full mb-2 p-2 bg-gray-800" placeholder="Year" onChange={e => setFormData({...formData, year: e.target.value})} />
      <textarea className="block w-full mb-2 p-2 bg-gray-800" placeholder="Lyrics" onChange={e => setFormData({...formData, lyrics: e.target.value})} />
      <button className="bg-green-600 px-4 py-2 mt-2 rounded">Submit Artwork</button>
    </form>
  );
}