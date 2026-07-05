// app/help/page.tsx
'use client';
import React from 'react';
import AppShell from '../../components/AppShell';
import HelpCenter from '../../components/HelpCenter';

export default function HelpPage() {
  return (
    <AppShell allow={['listener', 'artist']}>
      <HelpCenter />
    </AppShell>
  );
}
