// components/ui/Badge.tsx
'use client';
import React from 'react';

type Tone = 'neutral' | 'gold' | 'silver' | 'success' | 'danger' | 'info';

const tones: Record<Tone, string> = {
  neutral: 'bg-surface-3 text-muted',
  gold: 'bg-yellow-500/20 text-yellow-400',
  silver: 'bg-gray-400/20 text-gray-300',
  success: 'bg-accent/20 text-accent',
  danger: 'bg-danger/20 text-red-400',
  info: 'bg-blue-500/20 text-blue-400',
};

export default function Badge({ tone = 'neutral', children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${tones[tone]}`}>
      {children}
    </span>
  );
}
