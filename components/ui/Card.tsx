// components/ui/Card.tsx
'use client';
import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export default function Card({ hoverable = false, className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`bg-surface-2 rounded-lg p-4 ${hoverable ? 'hover:bg-surface-3 transition-colors cursor-pointer' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
