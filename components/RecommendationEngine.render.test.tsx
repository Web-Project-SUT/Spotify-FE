// components/RecommendationEngine.render.test.tsx
import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import RecommendationEngine from './RecommendationEngine';
import { LanguageProvider } from '../context/LanguageContext';
import * as localStorageUtils from '../utils/localStorage';

vi.mock('../utils/localStorage', () => ({ getItem: vi.fn(), setItem: vi.fn() }));
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
      if (key === 'listeningHistory') return ['1'];
      if (key === 'users') return [];
      if (key === 'currentTrack') return null;
      return [];
    });

    renderComponent();

    await waitFor(() => expect(screen.getByText('Rock B')).toBeDefined());
    expect(screen.getByText(/Because you listened to Rock/i)).toBeDefined();
  });

  it('renders nothing when there are no songs at all', () => {
    (localStorageUtils.getItem as any).mockReturnValue([]);

    renderComponent();

    expect(screen.queryByText('Recommended for you')).toBeNull();
  });

  it('clicking a card play button sets it as the current track', async () => {
    const song = { id: '1', title: 'Rock A', genre: 'Rock', artistId: 'a1', cover: '', plays: 5 };
    (localStorageUtils.getItem as any).mockImplementation((key: string) => {
      if (key === 'songs') return [song];
      if (key === 'listeningHistory') return [];
      if (key === 'users') return [];
      if (key === 'currentTrack') return null;
      return [];
    });

    renderComponent();

    await waitFor(() => expect(screen.getByText('Rock A')).toBeDefined());

    const playButton = screen.getByRole('button', { name: /Play Rock A/i });
    fireEvent.click(playButton);

    expect(localStorageUtils.setItem).toHaveBeenCalledWith('currentTrack', song);
  });
});
