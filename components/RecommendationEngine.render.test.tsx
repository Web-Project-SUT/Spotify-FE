// components/RecommendationEngine.render.test.tsx
import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import RecommendationEngine from './RecommendationEngine';
import { LanguageProvider } from '../context/LanguageContext';
import * as localStorageUtils from '../utils/localStorage';

vi.mock('../utils/localStorage', () => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  getListeningHistory: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

function renderComponent() {
  return render(
    <LanguageProvider>
      <RecommendationEngine />
    </LanguageProvider>
  );
}

describe('RecommendationEngine (render)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders recommended songs with a reason for each', async () => {
    (localStorageUtils.getItem as any).mockImplementation((key: string) => {
      if (key === 'songs') {
        return [
          { id: '1', title: 'Rock A', genre: 'Rock', artistId: 'a1', cover: '', plays: 5 },
          { id: '2', title: 'Rock B', genre: 'Rock', artistId: 'a1', cover: '', plays: 5 },
        ];
      }
      if (key === 'users') return [];
      if (key === 'currentUser') return { id: 'u1' };
      if (key === 'currentTrack') return null;
      return [];
    });
    (localStorageUtils.getListeningHistory as any).mockReturnValue(['1']);

    renderComponent();

    await waitFor(() => expect(screen.getByText('Rock B')).toBeDefined());
    expect(screen.getByText(/Because you listened to Rock/i)).toBeDefined();
    expect(localStorageUtils.getListeningHistory).toHaveBeenCalledWith('u1');
  });

  it('renders nothing when there are no songs at all', () => {
    (localStorageUtils.getItem as any).mockReturnValue([]);
    (localStorageUtils.getListeningHistory as any).mockReturnValue([]);

    renderComponent();

    expect(screen.queryByText('Recommended for you')).toBeNull();
  });

  it('clicking a card play button sets it as the current track', async () => {
    const song = { id: '1', title: 'Rock A', genre: 'Rock', artistId: 'a1', cover: '', plays: 5 };
    (localStorageUtils.getItem as any).mockImplementation((key: string) => {
      if (key === 'songs') return [song];
      if (key === 'users') return [];
      if (key === 'currentUser') return { id: 'u1' };
      if (key === 'currentTrack') return null;
      return [];
    });
    (localStorageUtils.getListeningHistory as any).mockReturnValue([]);

    renderComponent();

    await waitFor(() => expect(screen.getByText('Rock A')).toBeDefined());

    const playButton = screen.getByRole('button', { name: /Play Rock A/i });
    fireEvent.click(playButton);

    expect(localStorageUtils.setItem).toHaveBeenCalledWith('currentTrack', song);
  });

  it('recomputes when a storage event fires, e.g. after switching accounts', async () => {
    const songsByUser: Record<string, any[]> = {
      u1: [{ id: 's1', title: 'From User One', genre: 'Rock', artistId: 'a1', cover: '', plays: 5 }],
      u2: [{ id: 's2', title: 'From User Two', genre: 'Pop', artistId: 'a1', cover: '', plays: 5 }],
    };
    let currentUserId = 'u1';
    (localStorageUtils.getItem as any).mockImplementation((key: string) => {
      if (key === 'songs') return songsByUser[currentUserId];
      if (key === 'users') return [];
      if (key === 'currentUser') return { id: currentUserId };
      if (key === 'currentTrack') return null;
      return [];
    });
    (localStorageUtils.getListeningHistory as any).mockReturnValue([]);

    renderComponent();

    await waitFor(() => expect(screen.getByText('From User One')).toBeDefined());

    currentUserId = 'u2';
    fireEvent(window, new Event('storage'));

    await waitFor(() => expect(screen.getByText('From User Two')).toBeDefined());
    expect(screen.queryByText('From User One')).toBeNull();
  });
});
