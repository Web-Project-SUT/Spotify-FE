// app/group/page.tsx
'use client';
import React from 'react';
import AppShell from '../../components/AppShell';
import GroupSession from '../../components/GroupSession';

export default function GroupPage() {
  return (
    <AppShell allow={['listener']}>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">Group session</h1>
        <GroupSession />
      </div>
    </AppShell>
  );
}
