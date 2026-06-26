// components/RevenueChart.test.tsx
import React from 'react';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import RevenueChart from './RevenueChart';
import * as localStorageUtils from '../utils/localStorage';

vi.mock('../utils/localStorage', () => ({ getItem: vi.fn() }));

describe('RevenueChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the monthly revenue bar chart', async () => {
    (localStorageUtils.getItem as any).mockImplementation((key: string) => {
      if (key === 'revenueData') return [{ month: 'Jan', amount: 1000 }];
      if (key === 'users') return [];
      return [];
    });

    render(<RevenueChart />);

    await waitFor(() => expect(screen.getByText('Revenue overview')).toBeDefined());
    expect(screen.getByText('Jan')).toBeDefined();
  });

  it('shows revenue stat cards for current month and total', async () => {
    (localStorageUtils.getItem as any).mockImplementation((key: string) => {
      if (key === 'revenueData') return [{ month: 'Jan', amount: 1000 }, { month: 'Feb', amount: 2000 }];
      if (key === 'users') return [];
      return [];
    });

    render(<RevenueChart />);

    await waitFor(() => expect(screen.getByText('$2,000')).toBeDefined());
    expect(screen.getByText('$3,000')).toBeDefined();
  });

  it('computes subscription tier distribution from real listener data', async () => {
    (localStorageUtils.getItem as any).mockImplementation((key: string) => {
      if (key === 'revenueData') return [];
      if (key === 'users') {
        return [
          { id: 'u1', role: 'listener', tier: 'basic' },
          { id: 'u2', role: 'listener', tier: 'basic' },
          { id: 'u3', role: 'listener', tier: 'silver' },
          { id: 'u4', role: 'listener', tier: 'gold' },
          { id: 'a1', role: 'artist' },
        ];
      }
      return [];
    });

    render(<RevenueChart />);

    await waitFor(() => expect(screen.getByText(/Subscription tier distribution/i)).toBeDefined());
    expect(screen.getByText(/2 \(50%\)/)).toBeDefined();
    expect(screen.getAllByText(/1 \(25%\)/).length).toBe(2);
  });

  it('shows empty states when there is no data', async () => {
    (localStorageUtils.getItem as any).mockReturnValue([]);

    render(<RevenueChart />);

    await waitFor(() => {
      expect(screen.getByText(/No revenue data yet/i)).toBeDefined();
      expect(screen.getByText(/No listener data yet/i)).toBeDefined();
    });
  });
});
