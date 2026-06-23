// components/AccountingTable.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AccountingTable from './AccountingTable';
import * as localStorageUtils from '../utils/localStorage';

vi.mock('../utils/localStorage', () => ({ getItem: vi.fn() }));

describe('AccountingTable', () => {
  it('renders payout data correctly', () => {
    (localStorageUtils.getItem as any).mockReturnValue([
      { id: '1', artistName: 'Test Artist', listeners: 100, streams: 500, amount: 50, status: 'paid' }
    ]);

    render(<AccountingTable />);
    expect(screen.getByText('Test Artist')).toBeDefined();
    expect(screen.getByText('paid')).toBeDefined();
    expect(screen.getByText('$50')).toBeDefined();
  });
});