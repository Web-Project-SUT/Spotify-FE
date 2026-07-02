// components/RecentPlaylistsRow.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import RecentPlaylistsRow from './RecentPlaylistsRow';
import * as ls from '../utils/localStorage';
import * as auth from '../utils/auth';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));
vi.mock('../utils/localStorage', () => ({ getItem: vi.fn(), setItem: vi.fn() }));
vi.mock('../utils/auth', () => ({ getCurrentUser: vi.fn() }));

describe('RecentPlaylistsRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => cleanup());

  it('renders only the current user\'s playlists', async () => {
    (auth.getCurrentUser as any).mockReturnValue({ id: 'u1', role: 'listener' });
    (ls.getItem as any).mockImplementation((key: string) => {
      if (key === 'playlists') {
        return [
          { id: 'pl1', userId: 'u1', title: 'My Mix', songIds: ['s1'] },
          { id: 'pl2', userId: 'u2', title: 'Other Mix', songIds: ['s2'] },
        ];
      }
      return null;
    });

    render(<RecentPlaylistsRow />);

    await waitFor(() => expect(screen.getByText('My Mix')).toBeDefined());
    expect(screen.queryByText('Other Mix')).toBeNull();
  });

  it('orders playlists with lastPlayedAt first, most recent first', async () => {
    (auth.getCurrentUser as any).mockReturnValue({ id: 'u1', role: 'listener' });
    (ls.getItem as any).mockImplementation((key: string) => {
      if (key === 'playlists') {
        return [
          { id: 'pl1', userId: 'u1', title: 'Never Played', songIds: [] },
          { id: 'pl2', userId: 'u1', title: 'Played Older', songIds: [], lastPlayedAt: '2026-01-01T00:00:00.000Z' },
          { id: 'pl3', userId: 'u1', title: 'Played Recent', songIds: [], lastPlayedAt: '2026-06-01T00:00:00.000Z' },
        ];
      }
      return null;
    });

    render(<RecentPlaylistsRow />);

    await waitFor(() => expect(screen.getByText('Played Recent')).toBeDefined());
    const titles = screen.getAllByText(/Never Played|Played Older|Played Recent/).map((el) => el.textContent);
    expect(titles).toEqual(['Played Recent', 'Played Older', 'Never Played']);
  });

  it('clicking a card navigates to the playlist detail page', async () => {
    (auth.getCurrentUser as any).mockReturnValue({ id: 'u1', role: 'listener' });
    (ls.getItem as any).mockImplementation((key: string) => {
      if (key === 'playlists') return [{ id: 'pl1', userId: 'u1', title: 'My Mix', songIds: [] }];
      return null;
    });

    render(<RecentPlaylistsRow />);

    await waitFor(() => expect(screen.getByText('My Mix')).toBeDefined());
    fireEvent.click(screen.getByText('My Mix'));

    expect(pushMock).toHaveBeenCalledWith('/playlist/pl1');
  });

  it('shows an empty state with a create CTA when the user has no playlists', async () => {
    (auth.getCurrentUser as any).mockReturnValue({ id: 'u1', role: 'listener' });
    (ls.getItem as any).mockImplementation((key: string) => {
      if (key === 'playlists') return [];
      return null;
    });

    render(<RecentPlaylistsRow />);

    await waitFor(() => expect(screen.getByText('No playlists yet')).toBeDefined());
    fireEvent.click(screen.getByText('Create your first playlist'));

    expect(pushMock).toHaveBeenCalledWith('/playlists');
  });
});
