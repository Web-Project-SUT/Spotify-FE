// components/AlbumManager.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AlbumManager from './AlbumManager';
import { LanguageProvider } from '../context/LanguageContext';
import * as localStorageUtils from '../utils/localStorage';
import * as authUtils from '../utils/auth';

vi.mock('../utils/localStorage', () => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  addRecord: vi.fn(),
  updateRecord: vi.fn(),
  deleteRecord: vi.fn(),
}));

vi.mock('../utils/auth', () => ({
  getCurrentUser: vi.fn(),
}));

function renderManager() {
  return render(
    <LanguageProvider>
      <AlbumManager />
    </LanguageProvider>
  );
}

describe('AlbumManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (authUtils.getCurrentUser as any).mockReturnValue({ id: 'a1', role: 'artist' });
    (localStorageUtils.getItem as any).mockReturnValue([
      { id: 'album1', title: 'Skyline Echoes', artistId: 'a1', cover: '💿', releaseYear: 2024 },
      { id: 'album2', title: 'Someone Elses Album', artistId: 'a2', cover: '💿', releaseYear: 2023 },
    ]);
  });

  afterEach(() => cleanup());

  it("only lists the signed-in artist's own albums", async () => {
    renderManager();
    await waitFor(() => expect(screen.getByText('Skyline Echoes')).toBeDefined());
    expect(screen.queryByText('Someone Elses Album')).toBeNull();
  });

  it('creates an album and shows it in the list', async () => {
    renderManager();
    await waitFor(() => expect(screen.getByText('Skyline Echoes')).toBeDefined());

    fireEvent.change(screen.getByPlaceholderText('Album title'), { target: { value: 'Second Light' } });
    fireEvent.change(screen.getByPlaceholderText('Release year'), { target: { value: '2026' } });
    fireEvent.click(screen.getByText('Create album'));

    await waitFor(() => {
      expect(localStorageUtils.addRecord).toHaveBeenCalledWith(
        'albums',
        expect.objectContaining({ title: 'Second Light', artistId: 'a1', releaseYear: 2026 })
      );
    });
    expect(screen.getByText('Second Light')).toBeDefined();
  });

  it('refuses to create an album without a title', async () => {
    renderManager();
    await waitFor(() => expect(screen.getByText('Skyline Echoes')).toBeDefined());

    fireEvent.click(screen.getByText('Create album'));

    expect(screen.getByText(/album title is required/i)).toBeDefined();
    expect(localStorageUtils.addRecord).not.toHaveBeenCalled();
  });

  it('renames an album', async () => {
    renderManager();
    await waitFor(() => expect(screen.getByText('Skyline Echoes')).toBeDefined());

    fireEvent.click(screen.getByText('Edit'));
    fireEvent.change(screen.getByLabelText('Album title'), { target: { value: 'Skyline Echoes II' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(localStorageUtils.updateRecord).toHaveBeenCalledWith(
        'albums',
        'album1',
        expect.objectContaining({ title: 'Skyline Echoes II' })
      );
    });
    expect(screen.getByText('Skyline Echoes II')).toBeDefined();
  });

  it('deletes an album', async () => {
    renderManager();
    await waitFor(() => expect(screen.getByText('Skyline Echoes')).toBeDefined());

    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => {
      expect(localStorageUtils.deleteRecord).toHaveBeenCalledWith('albums', 'album1');
    });
    expect(screen.queryByText('Skyline Echoes')).toBeNull();
  });

  it('blocks album creation for a non-artist user', async () => {
    (authUtils.getCurrentUser as any).mockReturnValue({ id: 'u1', role: 'listener' });
    (localStorageUtils.getItem as any).mockReturnValue([]);
    renderManager();
    await waitFor(() => expect(screen.getByText(/haven't created any albums yet/i)).toBeDefined());

    fireEvent.change(screen.getByPlaceholderText('Album title'), { target: { value: 'Nope' } });
    fireEvent.click(screen.getByText('Create album'));

    expect(screen.getByText(/Only approved artists can create albums/i)).toBeDefined();
    expect(localStorageUtils.addRecord).not.toHaveBeenCalled();
  });
});
