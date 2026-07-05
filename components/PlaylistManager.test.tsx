// components/PlaylistManager.test.tsx
import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PlaylistManager from './PlaylistManager';
import { LanguageProvider } from '../context/LanguageContext';
import * as localStorageUtils from '../utils/localStorage';

vi.mock('../utils/localStorage', () => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  addRecord: vi.fn(),
  deleteRecord: vi.fn(),
}));

function renderComponent() {
  return render(
    <LanguageProvider>
      <PlaylistManager />
    </LanguageProvider>
  );
}

const alertMock = vi.fn();

describe('PlaylistManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = alertMock;
  });

  afterEach(() => {
    cleanup();
  });

  it('shows empty state and creates a playlist for a basic-tier user', async () => {
    (localStorageUtils.getItem as any).mockImplementation((key: string) => {
      if (key === 'currentUser') return { id: 'u1', role: 'listener', tier: 'basic' };
      if (key === 'playlists') return [];
      return null;
    });

    renderComponent();

    await waitFor(() => expect(screen.getByText(/No playlists yet/i)).toBeDefined());

    fireEvent.change(screen.getByPlaceholderText(/New playlist name/i), { target: { value: 'My Jams' } });
    fireEvent.click(screen.getByText('Create'));

    expect(localStorageUtils.addRecord).toHaveBeenCalledWith(
      'playlists',
      expect.objectContaining({ userId: 'u1', title: 'My Jams' })
    );
  });

  it('blocks creation past the basic-tier limit of 6', async () => {
    const sixPlaylists = Array.from({ length: 6 }, (_, i) => ({
      id: `p${i}`, userId: 'u1', title: `Playlist ${i}`, songIds: [],
    }));
    (localStorageUtils.getItem as any).mockImplementation((key: string) => {
      if (key === 'currentUser') return { id: 'u1', role: 'listener', tier: 'basic' };
      if (key === 'playlists') return sixPlaylists;
      return null;
    });

    renderComponent();
    await waitFor(() => expect(screen.getByText('6 / 6')).toBeDefined());

    fireEvent.click(screen.getByText('Create'));

    expect(alertMock).toHaveBeenCalled();
    expect(localStorageUtils.addRecord).not.toHaveBeenCalled();
  });

  it('allows up to 100 playlists for silver tier', async () => {
    const ninetyNine = Array.from({ length: 99 }, (_, i) => ({
      id: `p${i}`, userId: 'u2', title: `Playlist ${i}`, songIds: [],
    }));
    (localStorageUtils.getItem as any).mockImplementation((key: string) => {
      if (key === 'currentUser') return { id: 'u2', role: 'listener', tier: 'silver' };
      if (key === 'playlists') return ninetyNine;
      return null;
    });

    renderComponent();
    await waitFor(() => expect(screen.getByText('99 / 100')).toBeDefined());

    fireEvent.click(screen.getByText('Create'));

    expect(localStorageUtils.addRecord).toHaveBeenCalled();
    expect(alertMock).not.toHaveBeenCalled();
  });

  it('never blocks creation for gold tier (unlimited)', async () => {
    const many = Array.from({ length: 250 }, (_, i) => ({
      id: `p${i}`, userId: 'u3', title: `Playlist ${i}`, songIds: [],
    }));
    (localStorageUtils.getItem as any).mockImplementation((key: string) => {
      if (key === 'currentUser') return { id: 'u3', role: 'listener', tier: 'gold' };
      if (key === 'playlists') return many;
      return null;
    });

    renderComponent();
    await waitFor(() => expect(screen.getByText('250 / ∞')).toBeDefined());

    fireEvent.click(screen.getByText('Create'));

    expect(localStorageUtils.addRecord).toHaveBeenCalled();
    expect(alertMock).not.toHaveBeenCalled();
  });

  it('does not crash and prompts login when there is no current user', async () => {
    (localStorageUtils.getItem as any).mockImplementation(() => null);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Log in to manage playlists/i)).toBeDefined();
    });
  });
});
