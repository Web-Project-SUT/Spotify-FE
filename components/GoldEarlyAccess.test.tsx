// components/GoldEarlyAccess.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import GoldEarlyAccess from './GoldEarlyAccess';
import * as localStorageUtils from '../utils/localStorage';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('../utils/localStorage', () => ({
  getItem: vi.fn(),
}));

describe('GoldEarlyAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows the upgrade prompt for a basic-tier listener', async () => {
    (localStorageUtils.getItem as any).mockImplementation((key: string) =>
      key === 'currentUser' ? { id: 'u1', role: 'listener', tier: 'basic' } : []
    );

    render(<GoldEarlyAccess />);

    await waitFor(() => {
      expect(screen.getByText(/Unlock early access/i)).toBeDefined();
    });
    expect(screen.getByRole('button', { name: /Upgrade to gold/i })).toBeDefined();
  });

  it('shows the upgrade prompt for a silver-tier listener', async () => {
    (localStorageUtils.getItem as any).mockImplementation((key: string) =>
      key === 'currentUser' ? { id: 'u2', role: 'listener', tier: 'silver' } : []
    );

    render(<GoldEarlyAccess />);

    await waitFor(() => {
      expect(screen.getByText(/Unlock early access/i)).toBeDefined();
    });
  });

  it('shows exclusive tracks for a gold-tier listener', async () => {
    (localStorageUtils.getItem as any).mockImplementation((key: string) => {
      if (key === 'currentUser') return { id: 'u3', role: 'listener', tier: 'gold' };
      if (key === 'songs') return [{ id: 's1', title: 'New Drop', artistId: 'a1', cover: '🎵', plays: 0, year: 2025 }];
      return [];
    });

    render(<GoldEarlyAccess />);

    await waitFor(() => {
      expect(screen.queryByText(/Unlock early access/i)).toBeNull();
    });
    expect(screen.getByText(/Gold early access/i)).toBeDefined();
    expect(screen.getByText('New Drop')).toBeDefined();
  });

  it('shows an empty state for a gold-tier listener when there are no songs', async () => {
    (localStorageUtils.getItem as any).mockImplementation((key: string) =>
      key === 'currentUser' ? { id: 'u3', role: 'listener', tier: 'gold' } : []
    );

    render(<GoldEarlyAccess />);

    await waitFor(() => {
      expect(screen.getByText(/No early access tracks available/i)).toBeDefined();
    });
  });

  it('does not treat an artist role as gold', async () => {
    (localStorageUtils.getItem as any).mockImplementation((key: string) =>
      key === 'currentUser' ? { id: 'a1', role: 'artist' } : []
    );

    render(<GoldEarlyAccess />);

    await waitFor(() => {
      expect(screen.getByText(/Unlock early access/i)).toBeDefined();
    });
  });
});
