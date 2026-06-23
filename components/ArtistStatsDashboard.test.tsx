import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ArtistStatsDashboard from './ArtistStatsDashboard';
import * as localStorageUtils from '../utils/localStorage';

vi.mock('../utils/localStorage', () => ({
  getItem: vi.fn(),
  deleteRecord: vi.fn(),
}));

describe('ArtistStatsDashboard', () => {
  it('renders song data and handles delete action', () => {
    (localStorageUtils.getItem as any).mockReturnValue([
      { id: '1', title: 'Song One', streamCount: 150, earnings: 50, artistId: 'current-user-id' }
    ]);

    render(<ArtistStatsDashboard />);

    expect(screen.getByText('Song One')).toBeDefined();
    expect(screen.getByText('150')).toBeDefined();

    fireEvent.click(screen.getByText('Delete'));
    expect(localStorageUtils.deleteRecord).toHaveBeenCalledWith('songs', '1');
  });
});