// app/notifications/page.tsx
'use client';
import React from 'react';
import AppShell from '../../components/AppShell';
import NotificationPanel from '../../components/NotificationPanel';
import { useLanguage } from '../../context/LanguageContext';

export default function NotificationsPage() {
  const { t } = useLanguage();
  return (
    <AppShell>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">{t('notifications.title')}</h1>
        <NotificationPanel />
      </div>
    </AppShell>
  );
}
