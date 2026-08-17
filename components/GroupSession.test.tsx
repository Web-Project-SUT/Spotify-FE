// components/GroupSession.test.tsx
import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import GroupSession from './GroupSession';
import { LanguageProvider } from '../context/LanguageContext';
import * as localStorageUtils from '../utils/localStorage';
import * as authUtils from '../utils/auth';

vi.mock('../utils/localStorage', () => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}));

vi.mock('../utils/auth', () => ({
  getCurrentUser: vi.fn(),
}));

function renderComponent(inviteId?: string) {
  return render(
    <LanguageProvider>
      <GroupSession inviteId={inviteId} />
    </LanguageProvider>
  );
}

describe('GroupSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (authUtils.getCurrentUser as any).mockReturnValue({ id: 'u1', role: 'listener' });
  });

  afterEach(() => {
    cleanup();
  });

  it('creates a group with the real user as host and sole member', async () => {
    (localStorageUtils.getItem as any).mockReturnValue(null);

    renderComponent();

    fireEvent.click(screen.getByText('Create group'));

    await waitFor(() => expect(screen.getByText(/Session ID:/i)).toBeDefined());
    expect(localStorageUtils.setItem).toHaveBeenCalledWith(
      'groupSession',
      expect.objectContaining({ hostId: 'u1', members: ['u1'] })
    );
    expect(screen.getByText(/You are the host/i)).toBeDefined();
  });

  it('lets a non-member join an existing session', async () => {
    (authUtils.getCurrentUser as any).mockReturnValue({ id: 'u2', role: 'listener' });
    (localStorageUtils.getItem as any).mockImplementation((key: string) =>
      key === 'groupSession'
        ? { id: 'abc', hostId: 'u1', members: ['u1'], isPlaying: false, progress: 0 }
        : null
    );

    renderComponent();

    fireEvent.click(screen.getByText('Join group'));

    expect(localStorageUtils.setItem).toHaveBeenCalledWith(
      'groupSession',
      expect.objectContaining({ members: ['u1', 'u2'] })
    );
  });

  it('toggles playback for all members', async () => {
    (localStorageUtils.getItem as any).mockImplementation((key: string) =>
      key === 'groupSession'
        ? { id: 'abc', hostId: 'u1', members: ['u1'], isPlaying: false, progress: 0 }
        : null
    );

    renderComponent();

    fireEvent.click(screen.getByText('Play for all'));

    expect(localStorageUtils.setItem).toHaveBeenCalledWith(
      'groupSession',
      expect.objectContaining({ isPlaying: true })
    );
  });

  it('destroys the group when the last member leaves', async () => {
    (localStorageUtils.getItem as any).mockImplementation((key: string) =>
      key === 'groupSession'
        ? { id: 'abc', hostId: 'u1', members: ['u1'], isPlaying: false, progress: 0 }
        : null
    );

    renderComponent();

    fireEvent.click(screen.getByText('Leave group'));

    await waitFor(() => expect(screen.getByText('Create group')).toBeDefined());
    expect(localStorageUtils.removeItem).toHaveBeenCalledWith('groupSession');
  });

  it('joins the session named by ?invite= instead of local storage state', async () => {
    (localStorageUtils.getItem as any).mockReturnValue(null);

    renderComponent('room-from-invite');

    await waitFor(() => expect(screen.getByText(/Session ID:/i)).toBeDefined());
    expect(localStorageUtils.setItem).toHaveBeenCalledWith(
      'groupSession',
      expect.objectContaining({ id: 'room-from-invite', members: ['u1'] })
    );
    // Not the host — we weren't given host info by the invite link.
    expect(screen.queryByText(/You are the host/i)).toBeNull();
  });

  it('does not overwrite an already-joined matching session', async () => {
    (localStorageUtils.getItem as any).mockImplementation((key: string) =>
      key === 'groupSession'
        ? { id: 'room-from-invite', hostId: 'u1', members: ['u1'], isPlaying: false, progress: 0 }
        : null
    );

    renderComponent('room-from-invite');

    await waitFor(() => expect(screen.getByText(/Session ID:/i)).toBeDefined());
    // The existing (host) session is preserved, not clobbered by the join effect.
    expect(screen.getByText(/You are the host/i)).toBeDefined();
  });

  it('sharing the current track persists it onto the session', async () => {
    (localStorageUtils.getItem as any).mockImplementation((key: string) => {
      if (key === 'groupSession') {
        return { id: 'abc', hostId: 'u1', members: ['u1'], isPlaying: false, progress: 0 };
      }
      if (key === 'currentTrack') return { id: 'song-9' };
      return null;
    });

    renderComponent();

    fireEvent.click(screen.getByText('Share current track'));

    expect(localStorageUtils.setItem).toHaveBeenCalledWith(
      'groupSession',
      expect.objectContaining({ currentSongId: 'song-9', isPlaying: true })
    );
  });

  it('hands off host role to another member when the host leaves', async () => {
    (localStorageUtils.getItem as any).mockImplementation((key: string) =>
      key === 'groupSession'
        ? { id: 'abc', hostId: 'u1', members: ['u1', 'u2'], isPlaying: false, progress: 0 }
        : null
    );

    renderComponent();

    fireEvent.click(screen.getByText('Leave group'));

    expect(localStorageUtils.setItem).toHaveBeenCalledWith(
      'groupSession',
      expect.objectContaining({ members: ['u2'], hostId: 'u2' })
    );
  });
});
