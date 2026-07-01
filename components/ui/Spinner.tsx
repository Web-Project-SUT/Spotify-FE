// components/ui/Spinner.tsx
'use client';
import React from 'react';

interface SpinnerProps {
  size?: number;
  className?: string;
  label?: string;
}

export default function Spinner({ size = 24, className = '', label = 'Loading…' }: SpinnerProps) {
  return (
    <div role="status" className={`inline-flex items-center justify-center ${className}`}>
      <span
        className="inline-block rounded-full border-2 border-surface-3 border-t-accent animate-spin"
        style={{ width: size, height: size }}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}
