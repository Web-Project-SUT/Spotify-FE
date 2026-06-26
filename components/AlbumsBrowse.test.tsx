// components/AlbumsBrowse.test.tsx
import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AlbumsBrowse from './AlbumsBrowse';
import * as ls from '../utils/localStorage';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));
vi.mock('../utils/localStorage', () => ({ getItem: vi.fn(), setItem: vi.fn() }));

const songs = [
  { id: 's1', title: 'Neon Skyline', artistId: 'a1', cover: '🎵', plays: 100, listenerCount: 5000, year: 2024 },
  { id: 's2', title: 'Slow Drift', artistId: 'a2', cover: '🎵', plays: 50, listenerCount: 1000, year: 2020 },
];
const albums = [{ id: 'al1', title: 'Skyline Echoes', artistId: 'a1', cover: '💿', releaseYear: 2024 }];
const users = [
  { id: 'a1', role: 'artist', stageName: 'Nova Ray' },
  { id: 'a2', role: 'artist', stageName: 'Echo Drift' },
];

describe('AlbumsBrowse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (ls.getItem as any).mockImplementation((key: string) => {
      if (key === 'songs') return songs;
      if (key === 'albums') return albums;
      if (key === 'users') return users;
      return [];
    });
  });

  afterEach(() => cleanup());

  it('renders albums and songs with artist names', async () => {
    render(<AlbumsBrowse />);
    await waitFor(() => expect(screen.getByText('Skyline Echoes')).toBeDefined());
    expect(screen.getByText('Neon Skyline')).toBeDefined();
    expect(screen.getAllByText('Nova Ray').length).toBeGreaterThan(0);
  });

  it('filters by search query against song and artist names', async () => {
    render(<AlbumsBrowse />);
    await waitFor(() => expect(screen.getByText('Neon Skyline')).toBeDefined());

    fireEvent.change(screen.getByPlaceholderText(/Search/i), { target: { value: 'Slow' } });

    expect(screen.getByText('Slow Drift')).toBeDefined();
    expect(screen.queryByText('Neon Skyline')).toBeNull();
  });

  it('shows an empty state when nothing matches', async () => {
    render(<AlbumsBrowse />);
    await waitFor(() => expect(screen.getByText('Neon Skyline')).toBeDefined());

    fireEvent.change(screen.getByPlaceholderText(/Search/i), { target: { value: 'zzzzz' } });

    expect(screen.getByText('No results')).toBeDefined();
  });

  it('plays a song and navigates to the player', async () => {
    render(<AlbumsBrowse />);
    await waitFor(() => expect(screen.getByText('Neon Skyline')).toBeDefined());

    fireEvent.click(screen.getByText('Neon Skyline'));

    expect(ls.setItem).toHaveBeenCalledWith('currentTrack', expect.objectContaining({ id: 's1' }));
    expect(pushMock).toHaveBeenCalledWith('/player');
  });
});
