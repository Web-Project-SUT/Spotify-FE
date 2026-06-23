// components/Player.test.tsx
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import Player from './Player';
import * as localStorageUtils from '../utils/localStorage';

vi.mock('../utils/localStorage', () => ({ getItem: vi.fn() }));

afterEach(cleanup);

describe('Advanced Player Features', () => {
  it('shows stream and listener count for gold users (Task 29)', () => {
    (localStorageUtils.getItem as any).mockImplementation((key: string) => {
      if (key === 'currentTrack') return { title: 'Song', streamCount: 500, listenerCount: 200 };
      if (key === 'currentUser') return { role: 'gold' };
      return null;
    });
    render(<Player />);
    expect(screen.getByText(/Streams: 500/i)).toBeDefined();
    expect(screen.getByText(/Listeners: 200/i)).toBeDefined();
  });

  it('toggles lyrics display (Task 28)', () => {
    (localStorageUtils.getItem as any).mockImplementation((key: string) => {
      if (key === 'currentTrack') return { title: 'Song', lyrics: 'Test Lyrics Content' };
      return null;
    });
    render(<Player />);
    
    // Find Lyrics button and click it
    const lyricsBtns = screen.getAllByText('Lyrics');
    fireEvent.click(lyricsBtns[0]);
    
    expect(screen.getByText('Test Lyrics Content')).toBeDefined();
  });
});