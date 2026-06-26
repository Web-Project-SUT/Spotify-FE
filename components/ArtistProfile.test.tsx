// components/ArtistProfile.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import ArtistProfile from './ArtistProfile';
import * as localStorageUtils from '../utils/localStorage';

vi.mock('../utils/localStorage', () => ({
  getItem: vi.fn(),
  updateRecord: vi.fn(),
}));

describe('ArtistProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const mockUsers = [
    { id: 'a1', role: 'artist', stageName: 'The Legend', bio: 'A true legend.', followers: 1000, status: 'active' },
    { id: 'u1', role: 'listener', tier: 'basic', following: [] },
    { id: 'u3', role: 'listener', tier: 'gold', following: [] },
  ];

  const mockSongs = [
    { id: 's1', artistId: 'a1', title: 'Hit Single', plays: 500, streamCount: 12000, listenerCount: 4000 },
  ];

  const mockAlbums = [
    { id: 'al1', artistId: 'a1', title: 'Greatest Hits', releaseYear: 2025 },
  ];

  it('renders standard artist details and hides gold insights for a basic listener', async () => {
    (localStorageUtils.getItem as any).mockImplementation((key: string) => {
      if (key === 'users') return mockUsers;
      if (key === 'songs') return mockSongs;
      if (key === 'albums') return mockAlbums;
      if (key === 'currentUser') return mockUsers[1];
      return null;
    });

    render(<ArtistProfile artistId="a1" />);

    await waitFor(() => expect(screen.getByText('The Legend')).toBeDefined());

    expect(screen.getByText(/Verified artist/i)).toBeDefined();
    expect(screen.getByText('A true legend.')).toBeDefined();
    expect(screen.getByText('Hit Single')).toBeDefined();
    expect(screen.getByText('Greatest Hits')).toBeDefined();
    expect(screen.queryByText(/Gold insights/i)).toBeNull();
  });

  it('shows gold insights derived from real song data for a gold-tier listener', async () => {
    (localStorageUtils.getItem as any).mockImplementation((key: string) => {
      if (key === 'users') return mockUsers;
      if (key === 'songs') return mockSongs;
      if (key === 'albums') return [];
      if (key === 'currentUser') return mockUsers[2];
      return null;
    });

    render(<ArtistProfile artistId="a1" />);

    await waitFor(() => expect(screen.getByText('The Legend')).toBeDefined());

    expect(screen.getByText(/Gold insights/i)).toBeDefined();
    expect(screen.getByText('12,000')).toBeDefined();
    expect(screen.getByText('4,000')).toBeDefined();
    expect(screen.getAllByText('Hit Single').length).toBeGreaterThan(0);
  });

  it('does not grant gold insights to an artist or non-gold role', async () => {
    (localStorageUtils.getItem as any).mockImplementation((key: string) => {
      if (key === 'users') return mockUsers;
      if (key === 'songs') return mockSongs;
      if (key === 'albums') return [];
      if (key === 'currentUser') return { id: 'a2', role: 'artist' };
      return null;
    });

    render(<ArtistProfile artistId="a1" />);

    await waitFor(() => expect(screen.getByText('The Legend')).toBeDefined());
    expect(screen.queryByText(/Gold insights/i)).toBeNull();
  });

  it('toggles follow state and persists to both the artist and the follower', async () => {
    (localStorageUtils.getItem as any).mockImplementation((key: string) => {
      if (key === 'users') return mockUsers;
      if (key === 'currentUser') return mockUsers[1];
      return [];
    });

    render(<ArtistProfile artistId="a1" />);

    await waitFor(() => expect(screen.getByRole('button', { name: /Follow/i })).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: /Follow/i }));

    expect(screen.getByRole('button', { name: /Following/i })).toBeDefined();
    expect(localStorageUtils.updateRecord).toHaveBeenCalledWith('users', 'a1', { followers: 1001 });
    expect(localStorageUtils.updateRecord).toHaveBeenCalledWith('users', 'u1', { following: ['a1'] });

    fireEvent.click(screen.getByRole('button', { name: /Following/i }));

    expect(screen.getByRole('button', { name: /Follow/i })).toBeDefined();
    expect(localStorageUtils.updateRecord).toHaveBeenCalledWith('users', 'a1', { followers: 1000 });
    expect(localStorageUtils.updateRecord).toHaveBeenCalledWith('users', 'u1', { following: [] });
  });

  it('shows the artist as already followed if currentUser.following includes them', async () => {
    const followingUser = { id: 'u1', role: 'listener', tier: 'basic', following: ['a1'] };
    (localStorageUtils.getItem as any).mockImplementation((key: string) => {
      if (key === 'users') return mockUsers;
      if (key === 'currentUser') return followingUser;
      return [];
    });

    render(<ArtistProfile artistId="a1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Following/i })).toBeDefined();
    });
  });
});
