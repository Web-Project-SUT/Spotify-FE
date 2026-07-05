// components/HelpCenter.test.tsx
import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import HelpCenter from './HelpCenter';
import { LanguageProvider } from '../context/LanguageContext';
import * as ls from '../utils/localStorage';

vi.mock('../utils/localStorage', () => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  updateRecord: vi.fn(),
  addRecord: vi.fn(),
}));

const currentUser = { id: 'u1', role: 'listener', email: 'listener@demo.com', displayName: 'Alex' };

const users = [
  currentUser,
  { id: 's1', role: 'support', email: 'support@demo.com' },
  { id: 'admin1', role: 'admin', email: 'admin@demo.com' },
];

const tickets = [
  {
    id: 'T-1001',
    userId: 'u1',
    userName: 'Alex',
    subject: 'Cannot play downloaded songs',
    date: '2026-01-01',
    status: 'open',
    messages: [{ from: 'user', text: 'Downloads are broken.', at: '2026-01-01T00:00:00.000Z' }],
  },
  {
    id: 'T-1002',
    userId: 'u2',
    userName: 'Someone Else',
    subject: 'Different user ticket',
    date: '2026-01-02',
    status: 'open',
    messages: [{ from: 'user', text: 'Not mine.', at: '2026-01-02T00:00:00.000Z' }],
  },
];

function renderHelpCenter() {
  return render(
    <LanguageProvider>
      <HelpCenter />
    </LanguageProvider>
  );
}

describe('HelpCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (ls.getItem as any).mockImplementation((key: string) => {
      if (key === 'currentUser') return currentUser;
      if (key === 'users') return users;
      if (key === 'tickets') return tickets;
      return [];
    });
  });
  afterEach(() => cleanup());

  it('shows only the current user\'s tickets', () => {
    renderHelpCenter();
    expect(screen.getByText('Cannot play downloaded songs')).toBeDefined();
    expect(screen.queryByText('Different user ticket')).toBeNull();
  });

  it('submits a new ticket', async () => {
    renderHelpCenter();

    fireEvent.change(screen.getByPlaceholderText(/What do you need help with/i), {
      target: { value: 'Payment issue' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Describe your issue/i), {
      target: { value: 'My card was charged twice.' },
    });
    fireEvent.click(screen.getByText('Submit ticket'));

    expect(ls.addRecord).toHaveBeenCalledWith(
      'tickets',
      expect.objectContaining({ userId: 'u1', subject: 'Payment issue', status: 'open' })
    );
  });

  it('fans out a notification to every support/admin user when a ticket is created', async () => {
    renderHelpCenter();

    fireEvent.change(screen.getByPlaceholderText(/What do you need help with/i), {
      target: { value: 'Payment issue' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Describe your issue/i), {
      target: { value: 'My card was charged twice.' },
    });
    fireEvent.click(screen.getByText('Submit ticket'));

    expect(ls.addRecord).toHaveBeenCalledWith(
      'notifications',
      expect.objectContaining({ userId: 's1', type: 'support' })
    );
    expect(ls.addRecord).toHaveBeenCalledWith(
      'notifications',
      expect.objectContaining({ userId: 'admin1', type: 'support' })
    );
  });
});
