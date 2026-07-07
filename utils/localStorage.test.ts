// utils/localStorage.test.ts
import { describe, it, beforeEach, beforeAll, expect } from 'vitest';
import {
  getItem,
  setItem,
  initializeMockDatabase,
  recordDailyStream,
  getDailyStreams,
  recordListen,
  getListeningHistory,
} from './localStorage';
import { Playlist } from './types';

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

    // A couple of demo playlists are seeded for the demo listener (u1) so the
    // home page's recent-playlists row is demoable out of the box; artists
    // collection starts empty and is initialized for later use.
    const playlists: Playlist[] = getItem('playlists');
    expect(Array.isArray(playlists)).toBe(true);
    expect(playlists.length).toBeGreaterThan(0);
    expect(playlists.every((p) => p.userId === 'u1')).toBe(true);
    expect(getItem('artists')).toEqual([]);
  });

  it('should not overwrite existing collections on re-initialization', () => {
    setItem('users', [{ id: 'custom', email: 'x@y.z', role: 'listener' }]);
    initializeMockDatabase();

    const users = getItem('users');
    expect(users).toEqual([{ id: 'custom', email: 'x@y.z', role: 'listener' }]);
  });

  it('seeds a distinct listening history per demo listener account', () => {
    initializeMockDatabase();

    const history = getItem('listeningHistory');
    expect(Array.isArray(history)).toBe(false);
    expect(getListeningHistory('u1')).toEqual(['song1']);
    expect(getListeningHistory('u2')).toEqual(['song3']);
    expect(getListeningHistory('u3')).toEqual(['song2', 'song3', 'song4']);
  });

  it('migrates a legacy flat-array listeningHistory (from an older build) to the per-user shape', () => {
    setItem('listeningHistory', ['song1', 'song2']);
    initializeMockDatabase();

    const history = getItem('listeningHistory');
    expect(Array.isArray(history)).toBe(false);
    expect(getListeningHistory('u1')).toEqual(['song1']);
  });

  it('does not overwrite an already-migrated listeningHistory on re-initialization', () => {
    setItem('listeningHistory', { u1: ['custom-song'] });
    initializeMockDatabase();

    expect(getListeningHistory('u1')).toEqual(['custom-song']);
  });

  it('fills in only the missing demo users when an earlier build only seeded u1', () => {
    // Reproduces a browser that already picked up an earlier per-user fix
    // which seeded only u1 — u2/u3 must not be left reading `[]` forever.
    setItem('listeningHistory', { u1: ['song1', 'song2'] });
    initializeMockDatabase();

    expect(getListeningHistory('u1')).toEqual(['song1', 'song2']); // untouched
    expect(getListeningHistory('u2')).toEqual(['song3']);
    expect(getListeningHistory('u3')).toEqual(['song2', 'song3', 'song4']);
  });

  it('never overwrites a history a user has actually built up by listening', () => {
    setItem('listeningHistory', { u1: ['song4', 'song3'], u2: ['song1'] });
    initializeMockDatabase();

    expect(getListeningHistory('u1')).toEqual(['song4', 'song3']);
    expect(getListeningHistory('u2')).toEqual(['song1']);
  });

  describe('daily stream stats', () => {
    it('returns 0 for a user with no recorded streams', () => {
      expect(getDailyStreams('nobody')).toBe(0);
    });

    it('increments today’s bucket on each recordDailyStream call', () => {
      recordDailyStream('u1');
      recordDailyStream('u1');
      recordDailyStream('u1');
      expect(getDailyStreams('u1')).toBe(3);
    });

    it('tracks users independently', () => {
      recordDailyStream('u1');
      recordDailyStream('u2');
      recordDailyStream('u2');
      expect(getDailyStreams('u1')).toBe(1);
      expect(getDailyStreams('u2')).toBe(2);
    });

    it('is a no-op for a missing user id', () => {
      recordDailyStream(undefined);
      recordDailyStream(null);
      expect(getItem('listeningStats')).toBeNull();
    });
  });

  describe('recordListen / getListeningHistory', () => {
    it('appends a song id to the user\'s listening history', () => {
      recordListen('u1', 'song1');
      recordListen('u1', 'song2');
      expect(getListeningHistory('u1')).toEqual(['song1', 'song2']);
    });

    it('does not append a consecutive duplicate', () => {
      recordListen('u1', 'song1');
      recordListen('u1', 'song1');
      expect(getListeningHistory('u1')).toEqual(['song1']);
    });

    it('keeps each user\'s history independent', () => {
      recordListen('u1', 'song1');
      recordListen('u2', 'song3');
      expect(getListeningHistory('u1')).toEqual(['song1']);
      expect(getListeningHistory('u2')).toEqual(['song3']);
    });

    it('is a no-op for a missing user id', () => {
      recordListen(undefined, 'song1');
      recordListen(null, 'song1');
      expect(getItem('listeningHistory')).toBeNull();
    });

    it('returns an empty array for a user with no history', () => {
      expect(getListeningHistory('nobody')).toEqual([]);
    });
  });
});