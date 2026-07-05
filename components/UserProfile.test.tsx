// components/UserProfile.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import UserProfile from './UserProfile';
import * as localStorageUtils from '../utils/localStorage';

vi.mock('../utils/localStorage', () => ({
  getItem: vi.fn(),
  updateRecord: vi.fn(),
  setItem: vi.fn(),
  getDailyStreams: vi.fn(),
  initializeMockDatabase: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ refresh: vi.fn() }),
}));

const basicSelf = {
  id: 'u1',
  email: 'listener@demo.com',
  role: 'listener',
  tier: 'basic',
  displayName: 'Demo Listener',
  username: 'demo_listener_1a2b',
  followers: 5,
  following: ['a1'],
};

const goldSelf = { ...basicSelf, id: 'u3', tier: 'gold', username: 'gold_user_9z' };

const otherUser = {
  id: 'u2',
  email: 'silver@demo.com',
  role: 'listener',
  tier: 'silver',
  displayName: 'Other Listener',
  username: 'other_9x8y',
  followers: 10,
  following: [],
};

describe('UserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (localStorageUtils.getDailyStreams as any).mockReturnValue(0);
  });

  afterEach(() => {
    cleanup();
  });

  const mockDb = (users: any[], currentUser: any) => {
    (localStorageUtils.getItem as any).mockImplementation((key: string) => {
      if (key === 'users') return users;
      if (key === 'currentUser') return currentUser;
      return null;
    });
  };

  it('renders display name, username, tier badge and follower/following counts', async () => {
    mockDb([basicSelf], basicSelf);

    render(<UserProfile userId="u1" />);

    await waitFor(() => expect(screen.getByText('Demo Listener')).toBeDefined());
    expect(screen.getByText('@demo_listener_1a2b')).toBeDefined();
    expect(screen.getByText('Free')).toBeDefined();
    expect(screen.getByText('5')).toBeDefined(); // followers
    expect(screen.getByText('1')).toBeDefined(); // following count
  });

  it('renders the real "streams today" count from getDailyStreams', async () => {
    mockDb([goldSelf], goldSelf);
    (localStorageUtils.getDailyStreams as any).mockReturnValue(47);

    render(<UserProfile userId="u3" />);

    await waitFor(() => expect(screen.getByText('Gold')).toBeDefined());
    expect(screen.getByText('47')).toBeDefined();
    expect(localStorageUtils.getDailyStreams).toHaveBeenCalledWith('u3');
  });

  it('self view shows Edit profile and gates avatar upload for basic tier', async () => {
    mockDb([basicSelf], basicSelf);

    render(<UserProfile userId="u1" />);

    await waitFor(() => expect(screen.getByRole('button', { name: /Edit profile/i })).toBeDefined());
    expect(screen.queryByRole('button', { name: /^Follow$/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Edit profile/i }));
    expect(screen.getByText(/Upgrade to silver or gold/i)).toBeDefined();
  });

  it('self view allows avatar upload for silver+ tier', async () => {
    mockDb([goldSelf], goldSelf);

    render(<UserProfile userId="u3" />);

    await waitFor(() => expect(screen.getByRole('button', { name: /Edit profile/i })).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: /Edit profile/i }));

    expect(screen.queryByText(/Upgrade to silver or gold/i)).toBeNull();
  });

  it('other-user view shows Follow and toggles + persists to both records', async () => {
    mockDb([basicSelf, otherUser], basicSelf);

    render(<UserProfile userId="u2" />);

    await waitFor(() => expect(screen.getByRole('button', { name: /^Follow$/i })).toBeDefined());
    expect(screen.queryByRole('button', { name: /Edit profile/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /^Follow$/i }));

    expect(screen.getByRole('button', { name: /Following/i })).toBeDefined();
    expect(localStorageUtils.updateRecord).toHaveBeenCalledWith('users', 'u2', { followers: 11 });
    expect(localStorageUtils.updateRecord).toHaveBeenCalledWith('users', 'u1', { following: ['a1', 'u2'] });

    fireEvent.click(screen.getByRole('button', { name: /Following/i }));
    expect(screen.getByRole('button', { name: /^Follow$/i })).toBeDefined();
    expect(localStorageUtils.updateRecord).toHaveBeenCalledWith('users', 'u2', { followers: 10 });
    expect(localStorageUtils.updateRecord).toHaveBeenCalledWith('users', 'u1', { following: ['a1'] });
  });

  it('shows a not-found state when no user matches the id', async () => {
    mockDb([basicSelf], basicSelf);

    render(<UserProfile userId="does-not-exist" />);

    await waitFor(() => expect(screen.getByText(/User not found/i)).toBeDefined());
    expect(screen.queryByRole('button', { name: /Edit profile/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Follow$/i })).toBeNull();
  });

  it('shows Following when the viewer already follows the target', async () => {
    const followingSelf = { ...basicSelf, following: ['u2'] };
    mockDb([followingSelf, otherUser], followingSelf);

    render(<UserProfile userId="u2" />);

    await waitFor(() => expect(screen.getByRole('button', { name: /Following/i })).toBeDefined());
  });

  it('password change persists to updateRecord', async () => {
    mockDb([basicSelf], basicSelf);

    render(<UserProfile userId="u1" />);

    await waitFor(() => expect(screen.getByRole('button', { name: /Edit profile/i })).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: /Edit profile/i }));

    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'newpass123' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'newpass123' } });
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    expect(localStorageUtils.updateRecord).toHaveBeenCalledWith('users', 'u1', {
      displayName: 'Demo Listener',
      email: 'listener@demo.com',
      password: 'newpass123',
    });
  });

  it('mismatched passwords block save', async () => {
    mockDb([basicSelf], basicSelf);

    render(<UserProfile userId="u1" />);

    await waitFor(() => expect(screen.getByRole('button', { name: /Edit profile/i })).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: /Edit profile/i }));

    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'newpass123' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'different' } });
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    expect(screen.getByText('Passwords do not match')).toBeDefined();
    expect(localStorageUtils.updateRecord).not.toHaveBeenCalled();
  });

  it('leaves password unchanged when the fields are left blank', async () => {
    mockDb([basicSelf], basicSelf);

    render(<UserProfile userId="u1" />);

    await waitFor(() => expect(screen.getByRole('button', { name: /Edit profile/i })).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: /Edit profile/i }));

    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Renamed Listener' } });
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    expect(localStorageUtils.updateRecord).toHaveBeenCalledWith('users', 'u1', {
      displayName: 'Renamed Listener',
      email: 'listener@demo.com',
    });
  });
});
