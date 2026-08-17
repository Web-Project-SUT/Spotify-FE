// utils/resources/notifications.ts
//
// The authenticated user's notifications. API mode reads GET
// /auth/me/notifications/, marks all read via POST .../read/, and marks/
// hides one via POST/DELETE .../{id}/(read/); mock mode mirrors every write
// into the shared local collection, filtered to the current user on read.
import { apiEnabled, apiFetch } from '../api';
import { getItem, setItem } from '../localStorage';
import { getCurrentUser } from '../auth';
import { Notification } from '../types';

interface BackendNotification {
  id: string;
  title: string;
  message: string;
  type: Notification['type'];
  isRead: boolean;
  link: string;
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

// Notifications are stored as one shared collection across all users (mock
// mode), so a write must merge into the full list rather than overwrite it.
function writeMockNotification(id: string, patch: Partial<Notification> | null): void {
  const all: Notification[] = getItem('notifications') || [];
  const updated = patch === null
    ? all.filter((n) => n.id !== id)
    : all.map((n) => (n.id === id ? { ...n, ...patch } : n));
  setItem('notifications', updated);
}

export async function markNotificationRead(id: string): Promise<void> {
  if (apiEnabled) {
    await apiFetch(`/auth/me/notifications/${id}/read/`, { method: 'POST' });
    return;
  }
  writeMockNotification(id, { isRead: true });
}

export async function hideNotification(id: string): Promise<void> {
  if (apiEnabled) {
    await apiFetch(`/auth/me/notifications/${id}/`, { method: 'DELETE' });
    return;
  }
  writeMockNotification(id, null);
}
