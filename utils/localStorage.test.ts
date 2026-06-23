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

  it('should initialize empty arrays for core collections', () => {
    initializeMockDatabase();
    
    expect(getItem('users')).toEqual([]);
    expect(getItem('songs')).toEqual([]);
    expect(getItem('playlists')).toEqual([]);
    expect(getItem('artists')).toEqual([]);
  });
});