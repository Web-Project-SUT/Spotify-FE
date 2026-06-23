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

// --- Initialization ---

export const initializeMockDatabase = (): void => {
  if (typeof window === 'undefined') return;
  if (!getItem('users')) setItem('users', []);
  if (!getItem('songs')) setItem('songs', []);
  if (!getItem('playlists')) setItem('playlists', []);
  if (!getItem('artists')) setItem('artists', []);
};