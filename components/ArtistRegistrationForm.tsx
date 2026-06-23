// components/ArtistRegistrationForm.tsx
'use client';

import React, { useState } from 'react';
import { getItem, addRecord } from '../utils/localStorage';
import { User } from '../utils/types';

export default function ArtistRegistrationForm() {
  const [activeTab, setActiveTab] = useState<'listener' | 'artist'>('listener');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    stageName: '',
    portfolio: '',
    sampleWork: null as File | null,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, sampleWork: e.target.files[0] });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newUser: User = {
      id: Date.now().toString(),
      email: formData.email,
      password: formData.password,
      role: activeTab,
      status: activeTab === 'artist' ? 'pending' : 'active',
      ...(activeTab === 'artist' && { 
        stageName: formData.stageName, 
        portfolio: formData.portfolio 
      }),
    };

    addRecord('users', newUser);
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="max-w-md mx-auto mt-10 p-8 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl text-center text-white">
        <div className="w-20 h-20 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-[0_0_15px_#eab308]">
          ⏳
        </div>
        <h2 className="text-2xl font-bold mb-4">Application Submitted!</h2>
        {activeTab === 'artist' ? (
          <p className="text-gray-400">
            Thanks for applying, <span className="font-bold text-white">{formData.stageName}</span>! 
            Your artist account is currently <span className="text-yellow-500 font-bold">Pending Review</span>. 
            Our team will check your sample works and get back to you soon.
          </p>
        ) : (
          <p className="text-gray-400">Welcome! Your listener account is ready to use.</p>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-gray-900 rounded-xl shadow-xl border border-gray-800 text-white">
      <h2 className="text-2xl font-bold mb-6 text-center">Join Spotify</h2>
      
      <div className="flex mb-6 bg-gray-800 p-1 rounded-lg">
        <button
          type="button"
          onClick={() => setActiveTab('listener')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition ${activeTab === 'listener' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          Listener
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('artist')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition ${activeTab === 'artist' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          Artist
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm text-gray-400 mb-1">Email</label>
          <input id="email" type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full p-2 bg-gray-800 border border-gray-700 rounded focus:ring-2 focus:ring-blue-500 outline-none text-white" />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm text-gray-400 mb-1">Password</label>
          <input id="password" type="password" name="password" value={formData.password} onChange={handleChange} required className="w-full p-2 bg-gray-800 border border-gray-700 rounded focus:ring-2 focus:ring-blue-500 outline-none text-white" />
        </div>

        {activeTab === 'artist' && (
          <div className="space-y-4 border-t border-gray-700 pt-4 mt-4">
            <div>
              <label htmlFor="stageName" className="block text-sm text-gray-400 mb-1">Stage Name</label>
              <input id="stageName" type="text" name="stageName" value={formData.stageName} onChange={handleChange} required className="w-full p-2 bg-gray-800 border border-gray-700 rounded focus:ring-2 focus:ring-blue-500 outline-none text-white" />
            </div>
            <div>
              <label htmlFor="portfolio" className="block text-sm text-gray-400 mb-1">Portfolio URL</label>
              <input id="portfolio" type="url" name="portfolio" value={formData.portfolio} onChange={handleChange} required placeholder="https://" className="w-full p-2 bg-gray-800 border border-gray-700 rounded focus:ring-2 focus:ring-blue-500 outline-none text-white" />
            </div>
            <div>
              <label htmlFor="sampleWork" className="block text-sm text-gray-400 mb-1">Upload Sample Work (.mp3, .wav)</label>
              <input id="sampleWork" type="file" accept="audio/*" onChange={handleFileChange} required className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer" />
            </div>
          </div>
        )}

        <button type="submit" className="w-full bg-green-500 text-black font-bold py-3 mt-6 rounded hover:bg-green-400 transition">
          {activeTab === 'artist' ? 'Submit Artist Application' : 'Sign Up'}
        </button>
      </form>
    </div>
  );
}