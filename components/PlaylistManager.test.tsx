// components/PlaylistManager.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PlaylistManager from './PlaylistManager';
import * as localStorageUtils from '../utils/localStorage';

vi.mock('../utils/localStorage', () => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  addRecord: vi.fn(),
  deleteRecord: vi.fn(),
}));

describe('PlaylistManager', () => {
  it('shows empty state and creates playlist', () => {
    (localStorageUtils.getItem as any).mockImplementation((key: string) => {
      if (key === 'currentUser') return { id: 'u1', role: 'listener' };
      if (key === 'playlists') return [];
      return null;
    });

    render(<PlaylistManager />);
    expect(screen.getByText(/No playlists yet/i)).toBeDefined();
    
    fireEvent.change(screen.getByPlaceholderText(/New playlist name/i), { target: { value: 'My Jams' } });
    fireEvent.click(screen.getByText('Create'));
    expect(localStorageUtils.addRecord).toHaveBeenCalled();
  });
});