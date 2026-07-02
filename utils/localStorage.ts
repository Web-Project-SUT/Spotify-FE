// utils/localStorage.ts

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

export const setItem = (key: string, value: any): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error("Error saving to localStorage:", error);
  }
};

// --- CRUD Operations ---

export const addRecord = (collection: string, record: any): void => {
  const data = getItem(collection) || [];
  data.push(record);
  setItem(collection, data);
};

export const updateRecord = (collection: string, id: string, updatedFields: any): void => {
  const data = getItem(collection) || [];
  const index = data.findIndex((item: any) => item.id === id);
  if (index !== -1) {
    data[index] = { ...data[index], ...updatedFields };
    setItem(collection, data);
  }
};

export const deleteRecord = (collection: string, id: string): void => {
  const data = getItem(collection) || [];
  const filteredData = data.filter((item: any) => item.id !== id);
  setItem(collection, filteredData);
};

// --- Daily stream stats ---
// `listeningStats` is keyed by userId, then by local calendar day (YYYY-MM-DD),
// so the profile page can show "tracks streamed today" without scanning history.

const todayKey = (): string => new Date().toISOString().slice(0, 10);

export const recordDailyStream = (userId: string | undefined | null): void => {
  if (!userId) return;
  const stats = getItem('listeningStats') || {};
  const day = todayKey();
  const perUser = stats[userId] || {};
  perUser[day] = (perUser[day] || 0) + 1;
  stats[userId] = perUser;
  setItem('listeningStats', stats);
};

export const getDailyStreams = (userId: string): number => {
  const stats = getItem('listeningStats') || {};
  return stats[userId]?.[todayKey()] || 0;
};

// --- Initialization ---

export const initializeMockDatabase = (): void => {
  if (typeof window === 'undefined') return;

  if (!getItem('users')) {
    setItem('users', [
      { id: 'u1', email: 'listener@demo.com', role: 'listener', tier: 'basic', following: ['a1'] },
      { id: 'u2', email: 'silver@demo.com', role: 'listener', tier: 'silver', following: [] },
      { id: 'u3', email: 'gold@demo.com', role: 'listener', tier: 'gold', following: ['a1', 'a2'] },
      { id: 'a1', email: 'nova@demo.com', role: 'artist', stageName: 'Nova Ray', bio: 'Synth-pop artist from Tehran.', followers: 18420, cover: '🎤', status: 'active' },
      { id: 'a2', email: 'echo@demo.com', role: 'artist', stageName: 'Echo Drift', bio: 'Ambient producer.', followers: 9120, cover: '🎧', status: 'active' },
      { id: 'a3', email: 'pending-artist@demo.com', role: 'artist', stageName: 'New Wave', bio: 'Aspiring artist.', followers: 0, cover: '🎵', status: 'pending', portfolio: 'https://soundcloud.com/example' },
      { id: 's1', email: 'support@demo.com', role: 'support' },
      { id: 'admin1', email: 'admin@demo.com', role: 'admin' },
    ]);
  }

  if (!getItem('songs')) {
    setItem('songs', [
      { id: 'song1', title: 'Neon Skyline', artistId: 'a1', cover: '🎵', plays: 154000, genre: 'Synth-pop', year: 2024, streamCount: 154000, listenerCount: 42000, earnings: 1240, lyrics: 'City lights, neon skyline...', audioUrlHigh: '/audio/neon-skyline-hi.mp3', audioUrlLow: '/audio/neon-skyline-lo.mp3' },
      { id: 'song2', title: 'Glass Horizon', artistId: 'a1', cover: '🎵', plays: 98000, genre: 'Synth-pop', year: 2023, streamCount: 98000, listenerCount: 31000, earnings: 860, audioUrlHigh: '/audio/glass-horizon-hi.mp3', audioUrlLow: '/audio/glass-horizon-lo.mp3' },
      { id: 'song3', title: 'Slow Drift', artistId: 'a2', cover: '🎵', plays: 64000, genre: 'Ambient', year: 2024, streamCount: 64000, listenerCount: 18000, earnings: 410, audioUrlHigh: '/audio/slow-drift-hi.mp3', audioUrlLow: '/audio/slow-drift-lo.mp3' },
      { id: 'song4', title: 'Static Fields', artistId: 'a2', cover: '🎵', plays: 41000, genre: 'Ambient', year: 2022, streamCount: 41000, listenerCount: 12000, earnings: 220, audioUrlHigh: '/audio/static-fields-hi.mp3', audioUrlLow: '/audio/static-fields-lo.mp3' },
    ]);
  }

  if (!getItem('albums')) {
    setItem('albums', [
      { id: 'album1', title: 'Skyline Echoes', artistId: 'a1', cover: '💿', releaseYear: 2024 },
      { id: 'album2', title: 'Drift', artistId: 'a2', cover: '💿', releaseYear: 2023 },
    ]);
  }

  if (!getItem('playlists')) {
    setItem('playlists', [
      { id: 'pl1', userId: 'u1', title: 'Chill Mix', songIds: ['song1', 'song3'], lastPlayedAt: new Date().toISOString() },
      { id: 'pl2', userId: 'u1', title: 'Late Night Drift', songIds: ['song2', 'song4'] },
    ]);
  }
  if (!getItem('artists')) setItem('artists', []);

  if (!getItem('notifications')) {
    setItem('notifications', [
      { id: 'n1', userId: 'u1', title: 'Subscription ending soon', message: 'Your basic plan renews automatically. No action needed.', type: 'subscription', isRead: false, createdAt: new Date().toISOString() },
      { id: 'n2', userId: 'u1', title: 'New release from Nova Ray', message: '"Neon Skyline" just dropped.', type: 'release', isRead: false, createdAt: new Date().toISOString() },
      { id: 'n3', userId: 'a3', title: 'Artist application received', message: 'Your application is pending review.', type: 'approval', isRead: true, createdAt: new Date().toISOString() },
      { id: 'n4', userId: 's1', title: 'New artist approval request', message: 'New Wave submitted an artist application.', type: 'approval', isRead: false, createdAt: new Date().toISOString() },
    ]);
  }

  if (!getItem('payouts')) {
    setItem('payouts', [
      { id: 'p1', artistId: 'a1', artistName: 'Nova Ray', listeners: 42000, streams: 154000, amount: 1240, status: 'pending' },
      { id: 'p2', artistId: 'a2', artistName: 'Echo Drift', listeners: 18000, streams: 64000, amount: 410, status: 'paid' },
    ]);
  }

  if (!getItem('revenueData')) {
    setItem('revenueData', [
      { month: 'Jan', amount: 4000 },
      { month: 'Feb', amount: 3000 },
      { month: 'Mar', amount: 5000 },
      { month: 'Apr', amount: 6200 },
    ]);
  }

  if (!getItem('subscriptionPrices')) {
    setItem('subscriptionPrices', { silver: 4.99, gold: 9.99 });
  }

  if (!getItem('listeningHistory')) {
    setItem('listeningHistory', ['song1', 'song2']);
  }

  if (!getItem('listeningStats')) {
    setItem('listeningStats', {
      u1: { [new Date().toISOString().slice(0, 10)]: 12 },
      u3: { [new Date().toISOString().slice(0, 10)]: 47 },
    });
  }
};