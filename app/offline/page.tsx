// app/offline/page.tsx
'use client';
import React from 'react';
import { Button, EmptyState } from '../../components/ui';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <EmptyState
        icon="📡"
        title="You're offline"
        description="Check your connection and try again. Your downloaded content stays available."
        action={<Button onClick={() => location.reload()}>Retry</Button>}
      />
    </div>
  );
}
