// components/UserManagement.test.tsx
import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import UserManagement from './UserManagement';
import * as accounts from '../utils/resources/accounts';

vi.mock('../utils/resources/accounts', () => ({
  loadUsers: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
}));

const roster: accounts.ManagedUser[] = [
  {
    id: 'u1',
    email: 'listener@demo.com',
    username: 'listener',
    displayName: 'Listener One',
    role: 'listener',
    status: 'active',
    tier: 'gold',
  },
  {
    id: 'ad1',
    email: 'admin@demo.com',
    username: 'admin',
    displayName: 'Admin',
    role: 'admin',
    status: 'active',
    tier: 'basic',
  },
];

describe('UserManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (accounts.loadUsers as any).mockResolvedValue(roster);
  });

  afterEach(() => cleanup());

  it('lists every account with its email and role', async () => {
    render(<UserManagement currentUserId="ad1" />);
    await waitFor(() => screen.getByText('listener@demo.com'));
    expect(screen.getByText('admin@demo.com')).toBeDefined();
    expect(screen.getByText('Listener One')).toBeDefined();
  });

  it('filters the roster by search text', async () => {
    render(<UserManagement currentUserId="ad1" />);
    await waitFor(() => screen.getByText('listener@demo.com'));

    fireEvent.change(screen.getByLabelText('Search users'), { target: { value: 'admin' } });

    expect(screen.queryByText('listener@demo.com')).toBeNull();
    expect(screen.getByText('admin@demo.com')).toBeDefined();
  });

  it('filters the roster by role', async () => {
    render(<UserManagement currentUserId="ad1" />);
    await waitFor(() => screen.getByText('listener@demo.com'));

    fireEvent.change(screen.getByLabelText('Filter by role'), { target: { value: 'admin' } });

    expect(screen.queryByText('listener@demo.com')).toBeNull();
    expect(screen.getByText('admin@demo.com')).toBeDefined();
  });

  it('offers no role editor for the signed-in admin', async () => {
    render(<UserManagement currentUserId="ad1" />);
    await waitFor(() => screen.getByText('admin@demo.com'));

    expect(screen.queryByLabelText('Role for admin@demo.com')).toBeNull();
    expect(screen.getByLabelText('Role for listener@demo.com')).toBeDefined();
    expect(screen.getByText('admin (you)')).toBeDefined();
  });

  it('promotes a user to artist through the role editor', async () => {
    (accounts.updateUser as any).mockResolvedValue({
      user: { ...roster[0], role: 'artist' },
      error: null,
    });
    render(<UserManagement currentUserId="ad1" />);
    await waitFor(() => screen.getByText('listener@demo.com'));

    fireEvent.change(screen.getByLabelText('Role for listener@demo.com'), {
      target: { value: 'artist' },
    });

    await waitFor(() =>
      expect(accounts.updateUser).toHaveBeenCalledWith('u1', { role: 'artist' })
    );
    await waitFor(() => screen.getByText('Updated listener@demo.com.'));
  });

  it('reverts the row and reports the reason when a role change is refused', async () => {
    (accounts.updateUser as any).mockResolvedValue({
      user: null,
      error: { status: 400, detail: 'You cannot change your own role.' },
    });
    render(<UserManagement currentUserId="ad1" />);
    await waitFor(() => screen.getByText('listener@demo.com'));

    const select = screen.getByLabelText('Role for listener@demo.com') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'admin' } });

    await waitFor(() => screen.getByRole('alert'));
    expect(screen.getByRole('alert').textContent).toBe('You cannot change your own role.');
    expect(select.value).toBe('listener');
  });

  it('suspends an account through the status editor', async () => {
    (accounts.updateUser as any).mockResolvedValue({
      user: { ...roster[0], status: 'suspended' },
      error: null,
    });
    render(<UserManagement currentUserId="ad1" />);
    await waitFor(() => screen.getByText('listener@demo.com'));

    fireEvent.change(screen.getByLabelText('Status for listener@demo.com'), {
      target: { value: 'suspended' },
    });

    await waitFor(() =>
      expect(accounts.updateUser).toHaveBeenCalledWith('u1', { status: 'suspended' })
    );
  });

  it('creates a user and refreshes the roster', async () => {
    (accounts.createUser as any).mockResolvedValue({
      user: {
        id: 'n1',
        email: 'made@demo.com',
        username: 'made',
        displayName: 'Made',
        role: 'support',
        status: 'active',
        tier: 'basic',
      },
      error: null,
    });
    render(<UserManagement currentUserId="ad1" />);
    await waitFor(() => screen.getByText('listener@demo.com'));

    fireEvent.click(screen.getByRole('button', { name: 'Add user' }));
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'made@demo.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'support' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() =>
      expect(accounts.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'made@demo.com', role: 'support' })
      )
    );
    await waitFor(() => screen.getByText('Created made@demo.com.'));
    expect(accounts.loadUsers).toHaveBeenCalledTimes(2);
  });

  it('shows the backend field error instead of claiming success', async () => {
    (accounts.createUser as any).mockResolvedValue({
      user: null,
      error: {
        status: 400,
        detail: 'Invalid input.',
        fields: { email: ['A user with this email already exists.'] },
      },
    });
    render(<UserManagement currentUserId="ad1" />);
    await waitFor(() => screen.getByText('listener@demo.com'));

    fireEvent.click(screen.getByRole('button', { name: 'Add user' }));
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'taken@demo.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => screen.getByText('A user with this email already exists.'));
    expect(screen.queryByText(/^Created /)).toBeNull();
    // The form stays open so the admin can correct the address.
    expect(screen.getByLabelText('Email')).toBeDefined();
  });

  it('requires an email and a password before calling the backend', async () => {
    render(<UserManagement currentUserId="ad1" />);
    await waitFor(() => screen.getByText('listener@demo.com'));

    fireEvent.click(screen.getByRole('button', { name: 'Add user' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByText('Email is required.')).toBeDefined();
    expect(screen.getByText('Password is required.')).toBeDefined();
    expect(accounts.createUser).not.toHaveBeenCalled();
  });
});
