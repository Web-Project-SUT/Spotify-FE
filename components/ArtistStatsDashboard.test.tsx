// components/ArtistStatsDashboard.test.tsx
import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ArtistStatsDashboard from './ArtistStatsDashboard';
import { LanguageProvider } from '../context/LanguageContext';
import * as localStorageUtils from '../utils/localStorage';
import * as authUtils from '../utils/auth';

vi.mock('../utils/localStorage', () => ({
  getItem: vi.fn(),
  deleteRecord: vi.fn(),
  setItem: vi.fn(),
}));

vi.mock('../utils/auth', () => ({
  getCurrentUser: vi.fn(),
}));

function renderDashboard() {
  return render(
    <LanguageProvider>
      <ArtistStatsDashboard />
    </LanguageProvider>
  );
}

describe('ArtistStatsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('only shows songs belonging to the real logged-in artist', async () => {
    (authUtils.getCurrentUser as any).mockReturnValue({ id: 'a1', role: 'artist' });
    (localStorageUtils.getItem as any).mockReturnValue([
      { id: '1', title: 'Song One', streamCount: 150, listenerCount: 80, earnings: 50, artistId: 'a1' },
      { id: '2', title: 'Someone Else Song', streamCount: 999, listenerCount: 500, earnings: 999, artistId: 'a2' },
    ]);

    renderDashboard();

    await waitFor(() => expect(screen.getByText('Song One')).toBeDefined());
    expect(screen.getByText('150')).toBeDefined();
    expect(screen.queryByText('Someone Else Song')).toBeNull();
  });

  it('deletes a song', async () => {
    (authUtils.getCurrentUser as any).mockReturnValue({ id: 'a1', role: 'artist' });
    (localStorageUtils.getItem as any).mockReturnValue([
      { id: '1', title: 'Song One', streamCount: 150, listenerCount: 80, earnings: 50, artistId: 'a1' },
    ]);

    renderDashboard();
    await waitFor(() => expect(screen.getByText('Song One')).toBeDefined());

    fireEvent.click(screen.getByText('Delete'));

    expect(localStorageUtils.deleteRecord).toHaveBeenCalledWith('songs', '1');
    await waitFor(() => expect(screen.queryByText('Song One')).toBeNull());
  });

  it('shows an empty state when the artist has no songs', async () => {
    (authUtils.getCurrentUser as any).mockReturnValue({ id: 'a1', role: 'artist' });
    (localStorageUtils.getItem as any).mockReturnValue([]);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/haven't released any tracks yet/i)).toBeDefined();
    });
  });
});
