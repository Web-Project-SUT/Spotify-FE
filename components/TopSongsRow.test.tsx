// components/TopSongsRow.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import TopSongsRow from './TopSongsRow';
import * as localStorageUtils from '../utils/localStorage';

// Mock the local storage utility to isolate the component
vi.mock('../utils/localStorage', () => ({
  getItem: vi.fn(),
}));

describe('TopSongsRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render top songs from local storage if available', () => {
    const mockSongs = [
      { id: '101', title: 'Mock Song 1', artist: 'Mock Artist 1', cover: '🎤' },
      { id: '102', title: 'Mock Song 2', artist: 'Mock Artist 2', cover: '🎸' },
    ];
    // Simulate that the database has songs
    (localStorageUtils.getItem as any).mockReturnValue(mockSongs);

    render(<TopSongsRow />);

    // Assert that the mocked database songs are rendered
    expect(screen.getByText('Top Songs')).toBeDefined();
    expect(screen.getByText('Mock Song 1')).toBeDefined();
    expect(screen.getByText('Mock Artist 2')).toBeDefined();
  });

  it('should render fallback mock data if local storage is empty', () => {
    // Simulate an empty database
    (localStorageUtils.getItem as any).mockReturnValue([]);

    render(<TopSongsRow />);

    // Assert that the default fallback data is shown
    expect(screen.getByText('Bohemian Rhapsody')).toBeDefined();
    expect(screen.getByText('Queen')).toBeDefined();
  });
});