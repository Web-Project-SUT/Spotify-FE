// components/AccountingTable.test.tsx
import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AccountingTable from './AccountingTable';
import * as localStorageUtils from '../utils/localStorage';

vi.mock('../utils/localStorage', () => ({
  getItem: vi.fn(),
  updateRecord: vi.fn(),
}));

describe('AccountingTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders payout data correctly', async () => {
    (localStorageUtils.getItem as any).mockReturnValue([
      { id: '1', artistName: 'Test Artist', listeners: 100, streams: 500, amount: 50, status: 'paid' },
    ]);

    render(<AccountingTable />);

    await waitFor(() => expect(screen.getByText('Test Artist')).toBeDefined());
    expect(screen.getByText('paid')).toBeDefined();
    expect(screen.getByText('$50')).toBeDefined();
  });

  it('does not show a settle action for support', async () => {
    (localStorageUtils.getItem as any).mockReturnValue([
      { id: '1', artistName: 'Test Artist', listeners: 100, streams: 500, amount: 50, status: 'pending' },
    ]);

    render(<AccountingTable currentRole="support" />);

    await waitFor(() => expect(screen.getByText('Test Artist')).toBeDefined());
    expect(screen.queryByText('Confirm settlement')).toBeNull();
  });

  it('lets admin confirm settlement on a pending payout', async () => {
    (localStorageUtils.getItem as any).mockReturnValue([
      { id: '1', artistName: 'Test Artist', listeners: 100, streams: 500, amount: 50, status: 'pending' },
    ]);

    render(<AccountingTable currentRole="admin" />);

    await waitFor(() => expect(screen.getByText('Confirm settlement')).toBeDefined());

    fireEvent.click(screen.getByText('Confirm settlement'));

    expect(localStorageUtils.updateRecord).toHaveBeenCalledWith('payouts', '1', { status: 'paid' });
    await waitFor(() => expect(screen.queryByText('Confirm settlement')).toBeNull());
  });

  it('shows already-settled payouts without an action for admin', async () => {
    (localStorageUtils.getItem as any).mockReturnValue([
      { id: '1', artistName: 'Test Artist', listeners: 100, streams: 500, amount: 50, status: 'paid' },
    ]);

    render(<AccountingTable currentRole="admin" />);

    await waitFor(() => expect(screen.getByText('Settled')).toBeDefined());
  });

  it('shows an empty state when there are no payout records', async () => {
    (localStorageUtils.getItem as any).mockReturnValue([]);

    render(<AccountingTable currentRole="admin" />);

    await waitFor(() => {
      expect(screen.getByText(/No payout records/i)).toBeDefined();
    });
  });
});
