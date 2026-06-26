// components/ui/EmptyState.tsx
'use client';
import React from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon = '🎵', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-5xl mb-4">{icon}</span>
      <p className="text-lg font-bold text-white mb-1">{title}</p>
      {description && <p className="text-muted text-sm mb-4 max-w-sm">{description}</p>}
      {action}
    </div>
  );
}
