// utils/localStorage.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { setItem, getItem, addRecord, updateRecord, deleteRecord, seedDatabase } from './localStorage';

describe('Mock Data Layer (CRUD & Seed)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should seed the database correctly', () => {
    seedDatabase();
    const users = getItem('users');
    expect(users).toHaveLength(3); // admin, artist, gold
    expect(users[0].role).toBe('admin');
  });

  it('should perform CRUD operations correctly', () => {
    setItem('songs', []);
    
    // Create
    addRecord('songs', { id: 'test-1', title: 'My Song' });
    expect(getItem('songs')).toHaveLength(1);
    
    // Read
    const fetchedSongs = getItem('songs');
    expect(fetchedSongs[0].title).toBe('My Song');

    // Update
    updateRecord('songs', 'test-1', { title: 'Updated Song' });
    expect(getItem('songs')[0].title).toBe('Updated Song');
    
    // Delete
    deleteRecord('songs', 'test-1');
    expect(getItem('songs')).toHaveLength(0);
  });
});