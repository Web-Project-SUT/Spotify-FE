// utils/localStorage.ts

/**
 * Safely retrieves and parses an item from localStorage.
 * Prevents "window is not defined" error during Next.js server-side rendering.
 */
export const getItem = (key: string): any => {
  if (typeof window === 'undefined') return null;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error("Error reading from localStorage:", error);
    return null;
  }
};

/**
 * Safely serializes and saves an item into localStorage.
 * Prevents "window is not defined" error during Next.js server-side rendering.
 */
export const setItem = (key: string, value: any): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error("Error saving to localStorage:", error);
  }
};

/**
 * Initializes empty arrays for core collections if they do not exist in storage.
 * Based on core models requested in the project specification.
 */
export const initializeMockDatabase = (): void => {
  if (typeof window === 'undefined') return;
  if (!getItem('users')) setItem('users', []); // Stores listener and artist accounts
  if (!getItem('songs')) setItem('songs', []); // Stores tracks data
  if (!getItem('playlists')) setItem('playlists', []); // Stores user playlists
  if (!getItem('artists')) setItem('artists', []); // Stores approved artist data
};