// components/Player.test.tsx
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import Player from './Player';
import * as localStorageUtils from '../utils/localStorage';

vi.mock('../utils/localStorage', () => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
}));

afterEach(cleanup);

describe('Player', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows stream and listener count for a gold-tier listener', () => {
    (localStorageUtils.getItem as any).mockImplementation((key: string) => {
      if (key === 'currentTrack') {
        return { title: 'Song', streamCount: 500, listenerCount: 200, audioUrlHigh: 'h.mp3', audioUrlLow: 'l.mp3' };
      }
      if (key === 'currentUser') return { role: 'listener', tier: 'gold' };
      return null;
    });
    render(<Player />);
    expect(screen.getByText(/Streams: 500/i)).toBeDefined();
    expect(screen.getByText(/Listeners: 200/i)).toBeDefined();
  });

  it('hides stream and listener count for a basic-tier listener', () => {
    (localStorageUtils.getItem as any).mockImplementation((key: string) => {
      if (key === 'currentTrack') {
        return { title: 'Song', streamCount: 500, listenerCount: 200, audioUrlHigh: 'h.mp3', audioUrlLow: 'l.mp3' };
      }
      if (key === 'currentUser') return { role: 'listener', tier: 'basic' };
      return null;
    });
    render(<Player />);
    expect(screen.queryByText(/Streams:/i)).toBeNull();
  });

  it('hides stream and listener count for an artist role', () => {
    (localStorageUtils.getItem as any).mockImplementation((key: string) => {
      if (key === 'currentTrack') {
        return { title: 'Song', streamCount: 500, listenerCount: 200, audioUrlHigh: 'h.mp3', audioUrlLow: 'l.mp3' };
      }
      if (key === 'currentUser') return { role: 'artist' };
      return null;
    });
    render(<Player />);
    expect(screen.queryByText(/Streams:/i)).toBeNull();
  });

  it('toggles lyrics display', () => {
    (localStorageUtils.getItem as any).mockImplementation((key: string) => {
      if (key === 'currentTrack') {
        return { title: 'Song', lyrics: 'Test Lyrics Content', audioUrlHigh: 'h.mp3', audioUrlLow: 'l.mp3' };
      }
      return null;
    });
    render(<Player />);

    fireEvent.click(screen.getByText('Lyrics'));

    expect(screen.getByText('Test Lyrics Content')).toBeDefined();
  });

  it('disables the lyrics button when the track has no lyrics', () => {
    (localStorageUtils.getItem as any).mockImplementation((key: string) => {
      if (key === 'currentTrack') return { title: 'Song', audioUrlHigh: 'h.mp3', audioUrlLow: 'l.mp3' };
      return null;
    });
    render(<Player />);

    expect(screen.getByText('Lyrics').closest('button')).toHaveProperty('disabled', true);
  });

  it('shows queue contents and an empty state when the queue is empty', () => {
    (localStorageUtils.getItem as any).mockImplementation((key: string) => {
      if (key === 'currentTrack') return { title: 'Song', audioUrlHigh: 'h.mp3', audioUrlLow: 'l.mp3' };
      if (key === 'queue') return [];
      return null;
    });
    render(<Player />);

    fireEvent.click(screen.getByText('Queue'));

    expect(screen.getByText(/Queue is empty/i)).toBeDefined();
  });

  it('plays the next song when clicked in the queue', () => {
    (localStorageUtils.getItem as any).mockImplementation((key: string) => {
      if (key === 'currentTrack') return { title: 'Song', audioUrlHigh: 'h.mp3', audioUrlLow: 'l.mp3' };
      if (key === 'queue') return [{ id: 'q1', title: 'Next Song', cover: '🎵', plays: 0, artistId: 'a1' }];
      return null;
    });
    render(<Player />);

    fireEvent.click(screen.getByText(/Queue \(1\)/));
    fireEvent.click(screen.getByText('Next Song'));

    expect(screen.getByText('Next Song')).toBeDefined();
    expect(localStorageUtils.setItem).toHaveBeenCalledWith(
      'currentTrack',
      expect.objectContaining({ id: 'q1', title: 'Next Song' })
    );
  });

  it('renders correctly with full features and a quality selector', () => {
    (localStorageUtils.getItem as any).mockImplementation((key: string) => {
      if (key === 'currentTrack') {
        return {
          title: 'Test Song',
          cover: 'https://test.com/img.jpg',
          audioUrlHigh: 'high.mp3',
          audioUrlLow: 'low.mp3',
          lyrics: 'Sample lyrics',
        };
      }
      return null;
    });
    render(<Player />);

    expect(screen.getByText('Test Song')).toBeDefined();
    expect(screen.getByText('HIGH')).toBeDefined();
  });
});
