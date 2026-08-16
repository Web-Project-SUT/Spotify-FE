// components/ui/CoverArt.tsx
'use client';
import React from 'react';

interface CoverArtProps {
  /** An emoji (mock data), a data URL, or a real media path from the API. */
  cover?: string;
  /** Emoji shown when there is no cover at all. */
  fallback?: string;
  alt?: string;
  /**
   * Sizing, rounding and background for the box; call sites differ
   * (aspect-square, w-24 h-24, …) and each owns its own bg-* so Tailwind
   * background utilities never collide here.
   */
  className?: string;
}

// Covers arrive in two shapes: an emoji from the mock catalog, or a real URL
// from the API. Call sites used to render both as a bare text node — guarded
// on `cover.length <= 2` — so every real cover fell through to the emoji, and
// the unguarded variants printed the raw URL as text. This is the one place
// that decides which of the two a value is. Same heuristic as Avatar.
export default function CoverArt({
  cover,
  fallback = '🎵',
  alt = '',
  className = '',
}: CoverArtProps) {
  const isImage =
    cover && (cover.startsWith('http') || cover.startsWith('data:') || cover.startsWith('/'));

  return (
    <div
      className={`flex items-center justify-center overflow-hidden flex-shrink-0 ${className}`}
    >
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <span>{cover || fallback}</span>
      )}
    </div>
  );
}
