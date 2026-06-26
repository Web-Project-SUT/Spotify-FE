// components/ui/Avatar.tsx
'use client';
import React from 'react';

interface AvatarProps {
  src?: string;
  name?: string;
  size?: number;
}

export default function Avatar({ src, name = '', size = 40 }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // src may be an emoji (mock data), a data URL, or a real image path.
  const isImage = src && (src.startsWith('http') || src.startsWith('data:') || src.startsWith('/'));

  return (
    <div
      className="rounded-full bg-surface-3 flex items-center justify-center overflow-hidden flex-shrink-0"
      style={{ width: size, height: size }}
    >
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : src ? (
        <span style={{ fontSize: size * 0.5 }}>{src}</span>
      ) : (
        <span className="text-muted font-bold" style={{ fontSize: size * 0.4 }}>
          {initials || '?'}
        </span>
      )}
    </div>
  );
}
