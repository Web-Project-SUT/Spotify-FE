// components/SupportDashboard.test.tsx
import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SupportDashboard from './SupportDashboard';
import * as ls from '../utils/localStorage';

vi.mock('../utils/localStorage', () => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  updateRecord: vi.fn(),
  addRecord: vi.fn(),
}));

const users = [
  { id: 'a3', role: 'artist', stageName: 'New Wave', email: 'new@demo.com', status: 'pending', portfolio: 'http://x.com' },
  { id: 'a1', role: 'artist', stageName: 'Nova', email: 'nova@demo.com', status: 'active' },
];

describe('SupportDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (ls.getItem as any).mockImplementation((key: string) => {
      if (key === 'users') return users;
      if (key === 'tickets') return null;
      return [];
    });
  });
  afterEach(() => cleanup());

  it('lists only pending artist applications', async () => {
    render(<SupportDashboard />);
    await waitFor(() => expect(screen.getByText('New Wave')).toBeDefined());
    expect(screen.queryByText('Nova')).toBeNull();
  });

  it('approves an artist and sends a notification', async () => {
    render(<SupportDashboard />);
    await waitFor(() => expect(screen.getByText('New Wave')).toBeDefined());

    fireEvent.click(screen.getByText('Approve'));

    expect(ls.updateRecord).toHaveBeenCalledWith('users', 'a3', { status: 'active' });
    expect(ls.addRecord).toHaveBeenCalledWith('notifications', expect.objectContaining({ userId: 'a3', type: 'approval' }));
    await waitFor(() => expect(screen.queryByText('New Wave')).toBeNull());
  });

  it('switches to the tickets tab and opens a ticket thread', async () => {
    render(<SupportDashboard />);
    await waitFor(() => expect(screen.getByText('New Wave')).toBeDefined());

    fireEvent.click(screen.getByText('Support tickets'));
    await waitFor(() => expect(screen.getByText(/Cannot play downloaded songs/i)).toBeDefined());

    fireEvent.click(screen.getByText(/Cannot play downloaded songs/i));
    expect(screen.getByPlaceholderText(/Type a reply/i)).toBeDefined();
  });
});
