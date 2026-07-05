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

const tickets = [
  {
    id: 'T-1001',
    userId: 'u1',
    userName: 'listener@demo.com',
    subject: 'Cannot play downloaded songs',
    date: '2026-01-01',
    status: 'open',
    messages: [
      { from: 'user', text: 'My downloads stopped working after the last update.', at: '2026-01-01T00:00:00.000Z' },
    ],
  },
];

function renderDashboard() {
  return render(<SupportDashboard />);
}

describe('SupportDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (ls.getItem as any).mockImplementation((key: string) => {
      if (key === 'users') return users;
      if (key === 'tickets') return tickets;
      return [];
    });
  });
  afterEach(() => cleanup());

  it('lists only pending artist applications', async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByText('New Wave')).toBeDefined());
    expect(screen.queryByText('Nova')).toBeNull();
  });

  it('approves an artist and sends a notification', async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByText('New Wave')).toBeDefined());

    fireEvent.click(screen.getByText('Approve'));

    expect(ls.updateRecord).toHaveBeenCalledWith('users', 'a3', { status: 'active' });
    expect(ls.addRecord).toHaveBeenCalledWith('notifications', expect.objectContaining({ userId: 'a3', type: 'approval' }));
    await waitFor(() => expect(screen.queryByText('New Wave')).toBeNull());
  });

  it('rejects an artist with a reason via the in-app modal', async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByText('New Wave')).toBeDefined());

    fireEvent.click(screen.getByText('Reject'));
    const textarea = await screen.findByPlaceholderText(/Explain why this application is being rejected/i);
    fireEvent.change(textarea, { target: { value: 'Samples did not meet quality bar' } });
    fireEvent.click(screen.getByText('Confirm rejection'));

    expect(ls.updateRecord).toHaveBeenCalledWith('users', 'a3', { status: 'rejected' });
    expect(ls.addRecord).toHaveBeenCalledWith(
      'notifications',
      expect.objectContaining({
        userId: 'a3',
        type: 'approval',
        message: expect.stringContaining('Samples did not meet quality bar'),
      })
    );
    await waitFor(() => expect(screen.queryByText('New Wave')).toBeNull());
  });

  it('switches to the tickets tab and opens a ticket thread', async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByText('New Wave')).toBeDefined());

    fireEvent.click(screen.getByText('Support tickets'));
    await waitFor(() => expect(screen.getByText(/Cannot play downloaded songs/i)).toBeDefined());

    fireEvent.click(screen.getByText(/Cannot play downloaded songs/i));
    expect(screen.getByPlaceholderText(/Type a reply/i)).toBeDefined();
  });

  it('replying to a ticket updates it and notifies the creator', async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByText('New Wave')).toBeDefined());

    fireEvent.click(screen.getByText('Support tickets'));
    await waitFor(() => expect(screen.getByText(/Cannot play downloaded songs/i)).toBeDefined());
    fireEvent.click(screen.getByText(/Cannot play downloaded songs/i));

    const input = screen.getByPlaceholderText(/Type a reply/i);
    fireEvent.change(input, { target: { value: 'Try clearing your cache.' } });
    fireEvent.click(screen.getByText('Send'));

    expect(ls.updateRecord).toHaveBeenCalledWith(
      'tickets',
      'T-1001',
      expect.objectContaining({ status: 'answered', messages: expect.any(Array) })
    );
    expect(ls.addRecord).toHaveBeenCalledWith(
      'notifications',
      expect.objectContaining({ userId: 'u1', type: 'support' })
    );
  });

  it('closing a ticket sets its status to closed', async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByText('New Wave')).toBeDefined());

    fireEvent.click(screen.getByText('Support tickets'));
    await waitFor(() => expect(screen.getByText(/Cannot play downloaded songs/i)).toBeDefined());
    fireEvent.click(screen.getByText(/Cannot play downloaded songs/i));

    fireEvent.click(screen.getByText('Close ticket'));

    expect(ls.updateRecord).toHaveBeenCalledWith('tickets', 'T-1001', { status: 'closed' });
  });
});
