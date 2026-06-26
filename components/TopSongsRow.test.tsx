// components/TopSongsRow.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import TopSongsRow from './TopSongsRow';
import * as localStorageUtils from '../utils/localStorage';

// Mock the database
vi.mock('../utils/localStorage', () => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
}));

describe('TopSongsRow Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should render top songs and trigger play button correctly', async () => {
    const mockSongs = [
      { id: 's1', title: 'Epic Track', artistId: 'u2', plays: 5000, cover: '🎵' },
    ];
    
    // Simulate reading from the database
    (localStorageUtils.getItem as any).mockImplementation((key: string) => {
      if (key === 'songs') return mockSongs;
      if (key === 'currentTrack') return null;
      return null;
    });

    render(<TopSongsRow />);

    // Wait for the component to render the song
    await waitFor(() => {
      expect(screen.getByText('Epic Track')).toBeDefined();
    });

    // Find the play button for this specific song
    const playButton = screen.getByRole('button', { name: /Play Epic Track/i });
    
    // Click the play button
    fireEvent.click(playButton);

    // Verify if the song was successfully saved in the database for the player to read
    expect(localStorageUtils.setItem).toHaveBeenCalledWith('currentTrack', mockSongs[0]);
  });

  it('shows an empty state instead of fake songs when the catalog is empty', async () => {
    (localStorageUtils.getItem as any).mockImplementation((key: string) => {
      if (key === 'songs') return [];
      if (key === 'currentTrack') return null;
      return null;
    });

    render(<TopSongsRow />);

    await waitFor(() => {
      expect(screen.getByText(/No songs available yet/i)).toBeDefined();
    });
    expect(screen.queryByText('Bohemian Rhapsody')).toBeNull();
  });
});