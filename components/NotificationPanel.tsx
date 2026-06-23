// components/NotificationPanel.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { getItem, setItem } from '../utils/localStorage';
import { Notification, User } from '../utils/types';

export default function NotificationPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const user: User = getItem('currentUser');
    const allNotifications: Notification[] = getItem('notifications') || [];
    // Filter notifications for the current user
    setNotifications(allNotifications.filter(n => n.userId === user?.id));
  }, []);

  const markAsRead = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
    setNotifications(updated);
    setItem('notifications', updated);
  };

  const deleteNotification = (id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    setNotifications(updated);
    setItem('notifications', updated);
  };

  const markAllRead = () => {
    const updated = notifications.map(n => ({ ...n, isRead: true }));
    setNotifications(updated);
    setItem('notifications', updated);
  };

  if (notifications.length === 0) return <div className="p-4 text-gray-400">No new notifications.</div>;

  return (
    <div className="w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-bold">Notifications</h3>
        <button onClick={markAllRead} className="text-xs text-blue-400 hover:underline">Mark all read</button>
      </div>
      <div className="space-y-2">
        {notifications.map(n => (
          <div key={n.id} className={`p-3 rounded border ${n.isRead ? 'bg-gray-800' : 'bg-gray-700 border-blue-500'}`}>
            <p className="text-white font-bold text-sm">{n.title}</p>
            <p className="text-gray-300 text-xs mt-1">{n.message}</p>
            <div className="flex gap-2 mt-2">
              {!n.isRead && <button onClick={() => markAsRead(n.id)} className="text-[10px] text-green-400">Read</button>}
              <button onClick={() => deleteNotification(n.id)} className="text-[10px] text-red-400">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}