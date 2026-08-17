// components/NotificationPanel.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getItem, setItem } from '../utils/localStorage';
import { Notification, User } from '../utils/types';
import {
  loadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  hideNotification,
} from '../utils/resources/notifications';
import { useLanguage } from '../context/LanguageContext';

// Per spec, the empty-list message and overall framing differ slightly
// by role, since each role receives different notification types.
function emptyStateKey(role?: User['role']): string {
  switch (role) {
    case 'artist':
      return 'notifications.emptyArtist';
    case 'support':
    case 'admin':
      return 'notifications.emptySupport';
    default:
      return 'notifications.emptyListener';
  }
}

export default function NotificationPanel() {
  const { t } = useLanguage();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [role, setRole] = useState<User['role'] | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const user: User | null = getItem('currentUser');
      setRole(user?.role);
      // API when enabled, local shared collection otherwise.
      const mine = await loadNotifications();
      if (!active) return;
      setNotifications(mine);
      setLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    void markNotificationRead(id);
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    void hideNotification(id);
  };

  const openNotification = (n: Notification) => {
    if (!n.link) return;
    if (!n.isRead) markAsRead(n.id);
    router.push(n.link);
  };

  const markAllRead = () => {
    const updated = notifications.map((n) => ({ ...n, isRead: true }));
    setNotifications(updated);
    persistAll(updated);
    // Best-effort server sync (no-op in mock mode).
    void markAllNotificationsRead();
  };

  // Notifications are stored as one shared collection across all users,
  // so writing back must merge this user's changes into the full list
  // rather than overwriting everyone else's notifications.
  const persistAll = (updatedForUser: Notification[]) => {
    const all: Notification[] = getItem('notifications') || [];
    const otherUsersNotifications = all.filter(
      (n) => !notifications.some((mine) => mine.id === n.id)
    );
    setItem('notifications', [...otherUsersNotifications, ...updatedForUser]);
  };

  if (!loaded) return null;

  if (notifications.length === 0) {
    return <div className="p-4 text-gray-400 w-80">{t(emptyStateKey(role))}</div>;
  }

  return (
    <div className="w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-bold">{t('notifications.title')}</h3>
        <button onClick={markAllRead} className="text-xs text-blue-400 hover:underline">
          {t('notifications.markAllRead')}
        </button>
      </div>
      <div className="space-y-2">
        {notifications.map((n) => (
          <div
            key={n.id}
            onClick={() => openNotification(n)}
            className={`p-3 rounded border ${n.isRead ? 'bg-gray-800' : 'bg-gray-700 border-blue-500'} ${n.link ? 'cursor-pointer' : ''}`}
          >
            <p className="text-white font-bold text-sm">{n.title}</p>
            <p className="text-gray-300 text-xs mt-1">{n.message}</p>
            <div className="flex gap-2 mt-2">
              {!n.isRead && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    markAsRead(n.id);
                  }}
                  className="text-[10px] text-green-400"
                >
                  {t('notifications.read')}
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNotification(n.id);
                }}
                className="text-[10px] text-red-400"
              >
                {t('notifications.delete')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
