// app/playlist/[id]/page.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import PlaylistPage from './page';
import * as ls from '../../../utils/localStorage';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useParams: () => ({ id: 'pl1' }),
}));
vi.mock('../../../components/AppShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('../../../utils/localStorage', () => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  updateRecord: vi.fn(),
}));

const playlists = [{ id: 'pl1', userId: 'u1', title: 'Chill Mix', songIds: ['song1', 'song2'] }];
const songs = [
  { id: 'song1', title: 'Neon Skyline', artistId: 'a1', cover: '🎵', plays: 100 },
  { id: 'song2', title: 'Glass Horizon', artistId: 'a1', cover: '🎵', plays: 50 },
];

describe('Playlist detail page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (ls.getItem as any).mockImplementation((key: string) => {
      if (key === 'playlists') return playlists;
      if (key === 'songs') return songs;
      return null;
    });
  });

  afterEach(() => cleanup());

  it("resolves and lists the playlist's tracks from songIds", async () => {
    render(<PlaylistPage />);

    await waitFor(() => expect(screen.getByText('Chill Mix')).toBeDefined());
    expect(screen.getByText('Neon Skyline')).toBeDefined();
    expect(screen.getByText('Glass Horizon')).toBeDefined();
  });

  it('shows a not-found empty state for an unknown id', async () => {
    (ls.getItem as any).mockImplementation((key: string) => {
      if (key === 'playlists') return [];
      if (key === 'songs') return songs;
      return null;
    });

    render(<PlaylistPage />);

    await waitFor(() => expect(screen.getByText('Playlist not found')).toBeDefined());
  });

  it('playing a track sets currentTrack, stamps lastPlayedAt, and navigates to the player', async () => {
    render(<PlaylistPage />);

    await waitFor(() => expect(screen.getByText('Neon Skyline')).toBeDefined());
    fireEvent.click(screen.getByText('Neon Skyline'));

    expect(ls.setItem).toHaveBeenCalledWith('currentTrack', expect.objectContaining({ id: 'song1' }));
    expect(ls.updateRecord).toHaveBeenCalledWith('playlists', 'pl1', { lastPlayedAt: expect.any(String) });
    expect(pushMock).toHaveBeenCalledWith('/player');
  });
});
