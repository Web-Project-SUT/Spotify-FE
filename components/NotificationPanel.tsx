// components/NotificationPanel.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { getItem, setItem } from '../utils/localStorage';
import { Notification, User } from '../utils/types';
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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [role, setRole] = useState<User['role'] | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const user: User | null = getItem('currentUser');
    const allNotifications: Notification[] = getItem('notifications') || [];

    setRole(user?.role);
    // No logged-in user means no notifications to show, rather than crashing
    // on user.id or silently matching unrelated records.
    setNotifications(user ? allNotifications.filter((n) => n.userId === user.id) : []);
    setLoaded(true);
  }, []);

  const markAsRead = (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    setNotifications(updated);
    persistAll(updated);
  };

  const deleteNotification = (id: string) => {
    const updated = notifications.filter((n) => n.id !== id);
    setNotifications(updated);
    persistAll(updated);
  };

  const markAllRead = () => {
    const updated = notifications.map((n) => ({ ...n, isRead: true }));
    setNotifications(updated);
    persistAll(updated);
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
            className={`p-3 rounded border ${n.isRead ? 'bg-gray-800' : 'bg-gray-700 border-blue-500'}`}
          >
            <p className="text-white font-bold text-sm">{n.title}</p>
            <p className="text-gray-300 text-xs mt-1">{n.message}</p>
            <div className="flex gap-2 mt-2">
              {!n.isRead && (
                <button onClick={() => markAsRead(n.id)} className="text-[10px] text-green-400">
                  {t('notifications.read')}
                </button>
              )}
              <button onClick={() => deleteNotification(n.id)} className="text-[10px] text-red-400">
                {t('notifications.delete')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
