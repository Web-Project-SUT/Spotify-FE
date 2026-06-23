// components/ArtistProfile.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import ArtistProfile from './ArtistProfile';
import * as localStorageUtils from '../utils/localStorage';

// Mock the localStorage dependencies
vi.mock('../utils/localStorage', () => ({
  getItem: vi.fn(),
  updateRecord: vi.fn(),
}));

describe('ArtistProfile Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const mockUsers = [
    { id: 'a1', role: 'artist', stageName: 'The Legend', bio: 'A true legend.', followers: 1000 },
    { id: 'u1', role: 'listener' },
    { id: 'g1', role: 'gold' }
  ];

  const mockSongs = [
    { id: 's1', artistId: 'a1', title: 'Hit Single', plays: 500 }
  ];

  const mockAlbums = [
    { id: 'al1', artistId: 'a1', title: 'Greatest Hits', releaseYear: 2025 }
  ];

  it('should render standard artist details and hide gold stats for standard users', async () => {
    (localStorageUtils.getItem as any).mockImplementation((key: string) => {
      if (key === 'users') return mockUsers;
      if (key === 'songs') return mockSongs;
      if (key === 'albums') return mockAlbums;
      if (key === 'currentUser') return mockUsers[1]; // Listener
      return null;
    });

    render(<ArtistProfile artistId="a1" />);

    await waitFor(() => {
      expect(screen.getByText('The Legend')).toBeDefined();
    });

    expect(screen.getByText(/Verified Artist/i)).toBeDefined();
    expect(screen.getByText('A true legend.')).toBeDefined();
    expect(screen.getByText('Hit Single')).toBeDefined();
    expect(screen.getByText('Greatest Hits')).toBeDefined();
    
    // Ensure Gold Insights are hidden
    expect(screen.queryByText(/Gold Insights/i)).toBeNull();
  });

  it('should render gold-only stats section if the current user is a gold member', async () => {
    (localStorageUtils.getItem as any).mockImplementation((key: string) => {
      if (key === 'users') return mockUsers;
      if (key === 'songs') return [];
      if (key === 'albums') return [];
      if (key === 'currentUser') return mockUsers[2]; // Gold
      return null;
    });

    render(<ArtistProfile artistId="a1" />);

    await waitFor(() => {
      expect(screen.getByText('The Legend')).toBeDefined();
    });

    expect(screen.getByText(/Gold Insights/i)).toBeDefined();
    expect(screen.getByText('Profile Views')).toBeDefined();
  });

  it('should correctly toggle follow state and trigger database update', async () => {
    (localStorageUtils.getItem as any).mockImplementation((key: string) => {
      if (key === 'users') return mockUsers;
      return [];
    });

    render(<ArtistProfile artistId="a1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Follow/i })).toBeDefined();
    });

    const followButton = screen.getByRole('button', { name: /Follow/i });
    
    // Trigger follow
    fireEvent.click(followButton);
    expect(screen.getByRole('button', { name: /Following/i })).toBeDefined();
    expect(localStorageUtils.updateRecord).toHaveBeenCalledWith('users', 'a1', { followers: 1001 });

    // Trigger unfollow
    fireEvent.click(followButton);
    expect(screen.getByRole('button', { name: /Follow/i })).toBeDefined();
    expect(localStorageUtils.updateRecord).toHaveBeenCalledWith('users', 'a1', { followers: 1000 });
  });
});