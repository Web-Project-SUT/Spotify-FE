// components/RevenueChart.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RevenueChart from './RevenueChart';
import * as localStorageUtils from '../utils/localStorage';

vi.mock('../utils/localStorage', () => ({ getItem: vi.fn() }));

describe('RevenueChart', () => {
  it('renders chart data correctly', () => {
    (localStorageUtils.getItem as any).mockReturnValue([{ month: 'Jan', amount: 1000 }]);
    render(<RevenueChart />);
    expect(screen.getByText('Revenue Overview')).toBeDefined();
    expect(screen.getByText('Jan')).toBeDefined();
  });
});