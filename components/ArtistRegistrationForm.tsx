// components/ArtistRegistrationForm.tsx
'use client'; // Required in Next.js App Router for components using React state

import React, { useState } from 'react';
import { getItem, setItem } from '../utils/localStorage';

export default function ArtistRegistrationForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    stageName: '',
    portfolio: '',
  });
  const [statusMessage, setStatusMessage] = useState('');

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Fetch existing users from the mock database
    const users = getItem('users') || [];

    // Create a new artist object with role and pending status
    const newArtist = {
      id: Date.now().toString(),
      role: 'artist',
      status: 'pending', // Account requires support team approval
      ...formData,
    };

    // Save the updated list back to localStorage
    setItem('users', [...users, newArtist]);

    // Show success message and reset the form
    setStatusMessage('Registration successful! Your account is pending approval.');
    setFormData({ email: '', password: '', stageName: '', portfolio: '' });
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md border border-gray-200">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Artist Registration</h2>
      
      {statusMessage && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded text-sm text-center">
          {statusMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
          <input
            id="email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="mt-1 w-full p-2 border border-gray-300 rounded focus:ring-blue-500 text-black"
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
          <input
            id="password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            className="mt-1 w-full p-2 border border-gray-300 rounded focus:ring-blue-500 text-black"
          />
        </div>

        <div>
          <label htmlFor="stageName" className="block text-sm font-medium text-gray-700">Stage Name</label>
          <input
            id="stageName"
            type="text"
            name="stageName"
            value={formData.stageName}
            onChange={handleChange}
            required
            className="mt-1 w-full p-2 border border-gray-300 rounded focus:ring-blue-500 text-black"
          />
        </div>

        <div>
          <label htmlFor="portfolio" className="block text-sm font-medium text-gray-700">Portfolio Link</label>
          <input
            id="portfolio"
            type="url"
            name="portfolio"
            value={formData.portfolio}
            onChange={handleChange}
            required
            placeholder="https://..."
            className="mt-1 w-full p-2 border border-gray-300 rounded focus:ring-blue-500 text-black"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 transition"
        >
          Register
        </button>
      </form>
    </div>
  );
}