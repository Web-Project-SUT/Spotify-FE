// components/PriceControl.test.tsx
import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PriceControl from './PriceControl';
import * as ls from '../utils/localStorage';

vi.mock('../utils/localStorage', () => ({ getItem: vi.fn(), setItem: vi.fn() }));

describe('PriceControl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (ls.getItem as any).mockReturnValue({ silver: 4.99, gold: 9.99 });
  });
  afterEach(() => cleanup());

  it('loads existing prices', async () => {
    render(<PriceControl />);
    await waitFor(() => {
      expect((screen.getAllByDisplayValue('4.99')[0] as HTMLInputElement)).toBeDefined();
    });
  });

  it('persists updated prices without any code change', async () => {
    render(<PriceControl />);
    await waitFor(() => expect(screen.getByText('Update prices')).toBeDefined());

    const goldInput = screen.getByDisplayValue('9.99');
    fireEvent.change(goldInput, { target: { value: '12.99' } });
    fireEvent.click(screen.getByText('Update prices'));

    expect(ls.setItem).toHaveBeenCalledWith('subscriptionPrices', { silver: 4.99, gold: 12.99 });
  });
});
