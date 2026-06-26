// components/NotificationPanel.test.tsx
import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import NotificationPanel from './NotificationPanel';
import * as localStorageUtils from '../utils/localStorage';

vi.mock('../utils/localStorage', () => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
}));

describe('NotificationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('only shows notifications belonging to the current user', async () => {
    (localStorageUtils.getItem as any).mockImplementation((key: string) => {
      if (key === 'currentUser') return { id: 'u1', role: 'listener' };
      if (key === 'notifications') {
        return [
          { id: '1', userId: 'u1', title: 'Mine', message: 'For me', type: 'release', isRead: false, createdAt: '' },
          { id: '2', userId: 'u2', title: 'Not mine', message: 'For someone else', type: 'release', isRead: false, createdAt: '' },
        ];
      }
      return [];
    });

    render(<NotificationPanel />);

    await waitFor(() => {
      expect(screen.getByText('Mine')).toBeDefined();
    });
    expect(screen.queryByText('Not mine')).toBeNull();
  });

  it('marks a notification as read and persists only that user\'s changes', async () => {
    (localStorageUtils.getItem as any).mockImplementation((key: string) => {
      if (key === 'currentUser') return { id: 'u1', role: 'listener' };
      if (key === 'notifications') {
        return [
          { id: '1', userId: 'u1', title: 'Test Notif', message: 'msg', type: 'release', isRead: false, createdAt: '' },
          { id: '2', userId: 'u2', title: 'Other user', message: 'msg', type: 'release', isRead: false, createdAt: '' },
        ];
      }
      return [];
    });

    render(<NotificationPanel />);

    await waitFor(() => expect(screen.getByText('Test Notif')).toBeDefined());

    fireEvent.click(screen.getByText('Read'));

    expect(localStorageUtils.setItem).toHaveBeenCalledWith(
      'notifications',
      expect.arrayContaining([
        expect.objectContaining({ id: '2', userId: 'u2' }),
        expect.objectContaining({ id: '1', userId: 'u1', isRead: true }),
      ])
    );
  });

  it('deletes a notification', async () => {
    (localStorageUtils.getItem as any).mockImplementation((key: string) => {
      if (key === 'currentUser') return { id: 'u1', role: 'listener' };
      if (key === 'notifications') {
        return [{ id: '1', userId: 'u1', title: 'Test Notif', message: 'msg', type: 'release', isRead: false, createdAt: '' }];
      }
      return [];
    });

    render(<NotificationPanel />);
    await waitFor(() => expect(screen.getByText('Test Notif')).toBeDefined());

    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => {
      expect(screen.queryByText('Test Notif')).toBeNull();
    });
  });

  it('shows a role-specific empty state for a listener with no notifications', async () => {
    (localStorageUtils.getItem as any).mockImplementation((key: string) => {
      if (key === 'currentUser') return { id: 'u1', role: 'listener' };
      return [];
    });

    render(<NotificationPanel />);

    await waitFor(() => {
      expect(screen.getByText(/subscription updates and new releases/i)).toBeDefined();
    });
  });

  it('shows a role-specific empty state for an artist with no notifications', async () => {
    (localStorageUtils.getItem as any).mockImplementation((key: string) => {
      if (key === 'currentUser') return { id: 'a1', role: 'artist' };
      return [];
    });

    render(<NotificationPanel />);

    await waitFor(() => {
      expect(screen.getByText(/approval results and monthly payouts/i)).toBeDefined();
    });
  });

  it('does not crash and shows nothing-to-read when there is no logged-in user', async () => {
    (localStorageUtils.getItem as any).mockImplementation(() => null);

    render(<NotificationPanel />);

    await waitFor(() => {
      expect(screen.getByText(/No notifications yet/i)).toBeDefined();
    });
  });
});
