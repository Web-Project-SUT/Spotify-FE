// utils/resources/notifications.ts
//
// The authenticated user's notifications. API mode reads GET
// /auth/me/notifications/ and marks all read via POST .../read/; mock mode
// reads the shared local collection filtered to the current user. Per-item
// read/delete stay client-side (the backend exposes only mark-all).
import { apiEnabled, apiFetch } from '../api';
import { getItem } from '../localStorage';
import { getCurrentUser } from '../auth';
import { Notification } from '../types';

interface BackendNotification {
  id: string;
  title: string;
  message: string;
  type: Notification['type'];
  isRead: boolean;
  createdAt: string;
}

export async function loadNotifications(): Promise<Notification[]> {
  const user = getCurrentUser();
  if (!user) return [];
  if (apiEnabled) {
    const rows = await apiFetch<BackendNotification[]>('/auth/me/notifications/');
    if (rows) return rows.map((n) => ({ ...n, userId: user.id }));
  }
  const all: Notification[] = getItem('notifications') || [];
  return all.filter((n) => n.userId === user.id);
}

export async function markAllNotificationsRead(): Promise<void> {
  if (apiEnabled) {
    await apiFetch('/auth/me/notifications/read/', { method: 'POST' });
  }
}
