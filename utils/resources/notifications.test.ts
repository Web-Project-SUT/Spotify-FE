// utils/resources/notifications.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('notifications resource', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_API_URL;
    vi.unstubAllGlobals();
    vi.doUnmock('../localStorage');
    vi.doUnmock('../auth');
  });

  it('mock mode returns the current user\'s local notifications', async () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    vi.doMock('../auth', () => ({ getCurrentUser: () => ({ id: 'u1' }) }));
    vi.doMock('../localStorage', () => ({
      getItem: (k: string) =>
        k === 'notifications'
          ? [
              { id: 'n1', userId: 'u1', title: 'A', message: '', type: 'support', isRead: false, createdAt: '' },
              { id: 'n2', userId: 'u2', title: 'B', message: '', type: 'support', isRead: false, createdAt: '' },
            ]
          : [],
    }));
    const { loadNotifications } = await import('./notifications');
    const mine = await loadNotifications();
    expect(mine.map((n) => n.id)).toEqual(['n1']);
  });

  it('API mode maps rows and stamps the userId', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://backend.test/api';
    vi.doMock('../auth', () => ({ getCurrentUser: () => ({ id: 'u1' }) }));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [
          { id: 'n1', title: 'Hi', message: 'm', type: 'release', isRead: false, createdAt: 'now' },
        ],
      })
    );
    const { loadNotifications, markAllNotificationsRead } = await import('./notifications');
    const rows = await loadNotifications();
    expect(rows[0]).toMatchObject({ id: 'n1', userId: 'u1', type: 'release' });
    await expect(markAllNotificationsRead()).resolves.toBeUndefined();
  });
});
