// utils/localStorage.test.ts
import { describe, it, beforeEach, beforeAll, expect } from 'vitest';
import { getItem, setItem, initializeMockDatabase } from './localStorage';

describe('Local Storage Data Layer', () => {
  const mockStorage: Record<string, string> = {};

  // Simulate a browser environment inside Node.js execution context
  beforeAll(() => {
    global.window = {} as any;
    global.localStorage = {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, value: string) => { mockStorage[key] = value; },
      clear: () => {
        for (const key in mockStorage) {
          delete mockStorage[key];
        }
      }
    } as any;
  });

  // Clear the mocked storage before each test case execution
  beforeEach(() => {
    localStorage.clear();
  });

  it('should save and retrieve data correctly', () => {
    const mockUser = { id: '1', name: 'Sepehr', role: 'listener' };
    setItem('currentUser', mockUser);
    
    const retrieved = getItem('currentUser');
    expect(retrieved).toEqual(mockUser);
  });

  it('should return null for non-existent key', () => {
    const result = getItem('ghostKey');
    expect(result).toBeNull();
  });

  it('should seed core collections with demo data on initialization', () => {
    initializeMockDatabase();

    const users = getItem('users');
    const songs = getItem('songs');
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThan(0);
    expect(Array.isArray(songs)).toBe(true);
    expect(songs.length).toBeGreaterThan(0);

    // Playlists start empty (users create their own); artists collection
    // is initialized for later use.
    expect(getItem('playlists')).toEqual([]);
    expect(getItem('artists')).toEqual([]);
  });

  it('should not overwrite existing collections on re-initialization', () => {
    setItem('users', [{ id: 'custom', email: 'x@y.z', role: 'listener' }]);
    initializeMockDatabase();

    const users = getItem('users');
    expect(users).toEqual([{ id: 'custom', email: 'x@y.z', role: 'listener' }]);
  });
});