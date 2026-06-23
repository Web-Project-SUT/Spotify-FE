// utils/localStorage.ts
import { User, Song, Album, Playlist } from './types';

// Basic Get/Set
export const getItem = (key: string) => {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
};

export const setItem = (key: string, value: any) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
};

// CRUD Helpers
export const addRecord = (collection: string, record: any) => {
  const data = getItem(collection) || [];
  data.push(record);
  setItem(collection, data);
};

export const updateRecord = (collection: string, id: string, updatedFields: any) => {
  const data = getItem(collection) || [];
  const index = data.findIndex((item: any) => item.id === id);
  if (index !== -1) {
    data[index] = { ...data[index], ...updatedFields };
    setItem(collection, data);
  }
};

export const deleteRecord = (collection: string, id: string) => {
  const data = getItem(collection) || [];
  const filtered = data.filter((item: any) => item.id !== id);
  setItem(collection, filtered);
};

// Seed Data (Initial Mock Data)
export const seedDatabase = () => {
  const users: User[] = [
    { id: 'u1', email: 'admin@test.com', role: 'admin', status: 'active' },
    { id: 'u2', email: 'artist@test.com', role: 'artist', stageName: 'The Weeknd', status: 'active' },
    { id: 'u3', email: 'gold@test.com', role: 'gold' },
  ];
  
  const songs: Song[] = [
    { id: 's1', title: 'Blinding Lights', artistId: 'u2', plays: 5000 },
    { id: 's2', title: 'Save Your Tears', artistId: 'u2', plays: 3000 },
  ];

  const albums: Album[] = [
    { id: 'al1', title: 'After Hours', artistId: 'u2', releaseYear: 2020 }
  ];

  const playlists: Playlist[] = [
    { id: 'p1', title: 'Top Hits', userId: 'u1', songIds: ['s1', 's2'], isPublic: true }
  ];

  setItem('users', users);
  setItem('songs', songs);
  setItem('albums', albums);
  setItem('playlists', playlists);
};