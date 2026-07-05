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
}));

vi.mock('../utils/auth', () => ({
  getCurrentUser: vi.fn(),
}));

function renderComponent() {
  return render(
    <LanguageProvider>
      <GroupSession />
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
    const removeSpy = vi.spyOn(Storage.prototype, 'removeItem');
    (localStorageUtils.getItem as any).mockImplementation((key: string) =>
      key === 'groupSession'
        ? { id: 'abc', hostId: 'u1', members: ['u1'], isPlaying: false, progress: 0 }
        : null
    );

    renderComponent();

    fireEvent.click(screen.getByText('Leave group'));

    await waitFor(() => expect(screen.getByText('Create group')).toBeDefined());
    expect(removeSpy).toHaveBeenCalledWith('groupSession');
    removeSpy.mockRestore();
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
