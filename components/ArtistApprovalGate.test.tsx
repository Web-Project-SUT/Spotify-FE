// components/ArtistApprovalGate.test.tsx
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import ArtistApprovalGate from './ArtistApprovalGate';
import { User } from '../utils/types';

const authState = vi.hoisted(() => ({ user: null as User | null }));
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: authState.user, loading: false }),
}));

function renderFor(user: User | null) {
  authState.user = user;
  return render(
    <ArtistApprovalGate>
      <p>Upload your work</p>
    </ArtistApprovalGate>
  );
}

describe('ArtistApprovalGate', () => {
  afterEach(() => cleanup());

  it('shows the workspace to an approved artist', () => {
    renderFor({ id: 'a1', email: 'a@demo.com', role: 'artist', status: 'active' });
    expect(screen.getByText('Upload your work')).toBeDefined();
  });

  it('hides the workspace from a pending artist and explains why', () => {
    renderFor({ id: 'a2', email: 'p@demo.com', role: 'artist', status: 'pending' });
    expect(screen.queryByText('Upload your work')).toBeNull();
    expect(screen.getByText('Your artist account is awaiting approval')).toBeDefined();
  });

  it('tells a rejected artist their application was refused', () => {
    renderFor({ id: 'a3', email: 'r@demo.com', role: 'artist', status: 'rejected' });
    expect(screen.queryByText('Upload your work')).toBeNull();
    expect(screen.getByText('Your artist application was not approved')).toBeDefined();
  });

  it('leaves non-artists alone', () => {
    renderFor({ id: 'u1', email: 'l@demo.com', role: 'listener', status: 'pending' });
    expect(screen.getByText('Upload your work')).toBeDefined();
  });
});
