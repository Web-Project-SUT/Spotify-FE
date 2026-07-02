// components/AddToPlaylistMenu.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import AddToPlaylistMenu from './AddToPlaylistMenu';
import * as ls from '../utils/localStorage';
import * as auth from '../utils/auth';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));
vi.mock('../utils/localStorage', () => ({ getItem: vi.fn(), updateRecord: vi.fn() }));
vi.mock('../utils/auth', () => ({ getCurrentUser: vi.fn() }));

describe('AddToPlaylistMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth.getCurrentUser as any).mockReturnValue({ id: 'u1', role: 'listener' });
  });

  afterEach(() => cleanup());

  it('lists only the current user\'s playlists, checking ones that already contain the song', async () => {
    (ls.getItem as any).mockImplementation((key: string) => {
      if (key === 'playlists') {
        return [
          { id: 'pl1', userId: 'u1', title: 'My Mix', songIds: ['s1'] },
          { id: 'pl2', userId: 'u1', title: 'Chill', songIds: [] },
          { id: 'pl3', userId: 'u2', title: 'Other User Mix', songIds: [] },
        ];
      }
      return null;
    });

    render(<AddToPlaylistMenu songId="s1" />);
    fireEvent.click(screen.getByLabelText('Add to playlist'));

    await waitFor(() => expect(screen.getByText('My Mix')).toBeDefined());
    expect(screen.getByText('Chill')).toBeDefined();
    expect(screen.queryByText('Other User Mix')).toBeNull();
    expect(screen.getByText('My Mix').closest('button')?.textContent).toContain('✓');
    expect(screen.getByText('Chill').closest('button')?.textContent).not.toContain('✓');
  });

  it('adds the song to a playlist that does not yet contain it', async () => {
    (ls.getItem as any).mockImplementation((key: string) => {
      if (key === 'playlists') return [{ id: 'pl1', userId: 'u1', title: 'Chill', songIds: [] }];
      return null;
    });

    render(<AddToPlaylistMenu songId="s1" />);
    fireEvent.click(screen.getByLabelText('Add to playlist'));

    await waitFor(() => expect(screen.getByText('Chill')).toBeDefined());
    fireEvent.click(screen.getByText('Chill'));

    expect(ls.updateRecord).toHaveBeenCalledWith('playlists', 'pl1', { songIds: ['s1'] });
  });

  it('removes the song from a playlist that already contains it', async () => {
    (ls.getItem as any).mockImplementation((key: string) => {
      if (key === 'playlists') return [{ id: 'pl1', userId: 'u1', title: 'My Mix', songIds: ['s1', 's2'] }];
      return null;
    });

    render(<AddToPlaylistMenu songId="s1" />);
    fireEvent.click(screen.getByLabelText('Add to playlist'));

    await waitFor(() => expect(screen.getByText('My Mix')).toBeDefined());
    fireEvent.click(screen.getByText('My Mix'));

    expect(ls.updateRecord).toHaveBeenCalledWith('playlists', 'pl1', { songIds: ['s2'] });
  });

  it('offers to create a playlist when the user has none', async () => {
    (ls.getItem as any).mockImplementation((key: string) => {
      if (key === 'playlists') return [];
      return null;
    });

    render(<AddToPlaylistMenu songId="s1" />);
    fireEvent.click(screen.getByLabelText('Add to playlist'));

    await waitFor(() => expect(screen.getByText('No playlists yet — create one')).toBeDefined());
    fireEvent.click(screen.getByText('No playlists yet — create one'));

    expect(pushMock).toHaveBeenCalledWith('/playlists');
  });
});
