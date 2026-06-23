// components/GoldEarlyAccess.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import GoldEarlyAccess from './GoldEarlyAccess';
import * as localStorageUtils from '../utils/localStorage';

vi.mock('../utils/localStorage', () => ({
  getItem: vi.fn(),
}));

describe('GoldEarlyAccess Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 🧹 این بخش اضافه شد تا صفحه بعد از هر تست تمیز شود
  afterEach(() => {
    cleanup();
  });

  it('should render the upgrade prompt if user is NOT a gold member', async () => {
    (localStorageUtils.getItem as any).mockReturnValue({ role: 'listener' });

    render(<GoldEarlyAccess />);

    await waitFor(() => {
      expect(screen.getByText(/Unlock Early Access!/i)).toBeDefined();
    });
    expect(screen.getByRole('button', { name: /Upgrade to Gold/i })).toBeDefined();
  });

  it('should render the exclusive tracks if user IS a gold member', async () => {
    (localStorageUtils.getItem as any).mockReturnValue({ role: 'gold' });

    render(<GoldEarlyAccess />);

    await waitFor(() => {
      expect(screen.queryByText(/Unlock Early Access!/i)).toBeNull();
    });
    
    expect(screen.getByText(/Gold Early Access/i)).toBeDefined();
    expect(screen.getByText('Secret Track 1')).toBeDefined();
  });
});