// app/notifications/page.tsx
'use client';
import React from 'react';
import AppShell from '../../components/AppShell';
import NotificationPanel from '../../components/NotificationPanel';

export default function NotificationsPage() {
  return (
    <AppShell>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">Notifications</h1>
        <NotificationPanel />
      </div>
    </AppShell>
  );
}
