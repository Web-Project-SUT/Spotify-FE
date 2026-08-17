// components/UserProfile.api.test.tsx
// The default suite never sets NEXT_PUBLIC_API_URL, so it only ever proves
// the mock path. These cases stub the resource layer instead, pinning the
// backend-mode contract: the profile comes from GET /users/{id}/, the save
// goes through PATCH /auth/me/, and the avatar input actually uploads.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import UserProfile from './UserProfile';

// vi.mock factories are hoisted above the module body, so the doubles have
// to be created in a hoisted block to be visible inside them.
const { loadUserProfile, updateMe, loadListeningStats, uploadAvatar, refreshMe } = vi.hoisted(() => ({
  loadUserProfile: vi.fn(),
  updateMe: vi.fn(),
  loadListeningStats: vi.fn(),
  uploadAvatar: vi.fn(),
  refreshMe: vi.fn(),
}));

vi.mock('../utils/api', () => ({ apiEnabled: true }));
vi.mock('../utils/resources/accounts', () => ({ loadUserProfile, updateMe }));
vi.mock('../utils/resources/reports', () => ({ loadListeningStats }));
vi.mock('../utils/resources/uploads', () => ({ uploadAvatar }));
vi.mock('../utils/localStorage', () => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  initializeMockDatabase: vi.fn(),
  updateRecord: vi.fn(),
}));
vi.mock('../utils/auth', () => ({
  getCurrentUser: () => ({ id: 'u1', email: 'gold@demo.com', role: 'listener', tier: 'gold' }),
}));
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ refresh: vi.fn(), refreshMe }),
}));

const self = {
  id: 'u1',
  username: 'gold_user',
  displayName: 'Gold User',
  role: 'listener' as const,
  tier: 'gold' as const,
  bio: '',
  avatar: 'http://backend.test/media/avatars/a.png',
  followerCount: 12,
  followingCount: 3,
  isFollowing: false,
};

describe('UserProfile — backend mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadUserProfile.mockResolvedValue(self);
    loadListeningStats.mockResolvedValue({
      streamsToday: 9,
      streamsThisMonth: 100,
      dailyLimit: null,
      remainingToday: null,
    });
    updateMe.mockResolvedValue(null);
    uploadAvatar.mockResolvedValue(true);
  });

  afterEach(() => cleanup());

  it('renders the profile and the server-aggregated numbers', async () => {
    render(<UserProfile userId="u1" />);

    await waitFor(() => expect(screen.getByText('Gold User')).toBeDefined());
    expect(loadUserProfile).toHaveBeenCalledWith('u1');
    expect(screen.getByText('12')).toBeDefined(); // followers
    expect(screen.getByText('3')).toBeDefined(); // following
    expect(screen.getByText('9')).toBeDefined(); // streams today, from the API
  });

  it('does not show another user\'s daily streams', async () => {
    loadUserProfile.mockResolvedValue({ ...self, id: 'u2', displayName: 'Someone Else' });

    render(<UserProfile userId="u2" />);

    await waitFor(() => expect(screen.getByText('Someone Else')).toBeDefined());
    expect(loadListeningStats).not.toHaveBeenCalled();
    expect(screen.getByText('—')).toBeDefined();
  });

  it('saves the profile through updateMe and refreshes the session', async () => {
    render(<UserProfile userId="u1" />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Edit profile/i })).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: /Edit profile/i }));
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Renamed' } });
    fireEvent.click(screen.getByRole('button', { name: /^Save$/i }));

    await waitFor(() =>
      expect(updateMe).toHaveBeenCalledWith({ displayName: 'Renamed', email: 'gold@demo.com' })
    );
    expect(refreshMe).toHaveBeenCalled();
  });

  it('surfaces the field error the backend returned and stays in edit mode', async () => {
    updateMe.mockResolvedValue({
      status: 400,
      detail: 'Invalid input.',
      fields: { email: ['A user with that email already exists.'] },
    });

    render(<UserProfile userId="u1" />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Edit profile/i })).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: /Edit profile/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Save$/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeDefined());
    expect(screen.getByText(/already exists/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /^Save$/i })).toBeDefined();
  });

  it('uploads the chosen avatar and re-reads the profile', async () => {
    render(<UserProfile userId="u1" />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Edit profile/i })).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: /Edit profile/i }));

    const file = new File(['x'], 'avatar.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Profile photo'), { target: { files: [file] } });

    await waitFor(() => expect(uploadAvatar).toHaveBeenCalledWith(file));
    await waitFor(() => expect(loadUserProfile).toHaveBeenCalledTimes(2));
  });

  it('explains a rejected avatar upload instead of failing silently', async () => {
    uploadAvatar.mockResolvedValue(false);

    render(<UserProfile userId="u1" />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Edit profile/i })).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: /Edit profile/i }));

    const file = new File(['x'], 'avatar.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Profile photo'), { target: { files: [file] } });

    await waitFor(() => expect(screen.getByRole('alert')).toBeDefined());
    expect(screen.getByText(/Could not upload that photo/i)).toBeDefined();
  });
});
