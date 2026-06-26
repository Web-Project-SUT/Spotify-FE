// app/notifications/page.tsx
'use client';

import React, { useEffect } from 'react';
import { initializeMockDatabase } from '../../utils/localStorage';
import NotificationPanel from '../../components/NotificationPanel';

export default function NotificationsPage() {
  useEffect(() => {
    initializeMockDatabase();
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 flex justify-center">
      <NotificationPanel />
    </div>
  );
}
