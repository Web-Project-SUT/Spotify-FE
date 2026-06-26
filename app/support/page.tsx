// app/support/page.tsx
'use client';
import React from 'react';
import AppShell from '../../components/AppShell';
import SupportDashboard from '../../components/SupportDashboard';

export default function SupportPage() {
  return (
    <AppShell allow={['support', 'admin']}>
      <SupportDashboard />
    </AppShell>
  );
}
