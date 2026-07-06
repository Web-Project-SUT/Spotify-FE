// components/ProtectedRoute.test.tsx
import React from 'react';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ProtectedRoute from './ProtectedRoute';

const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}));

let authState: { user: any; loading: boolean };
vi.mock('../context/AuthContext', () => ({
  useAuth: () => authState,
}));

function renderProtected(allow?: any[]) {
  return render(
    <ProtectedRoute allow={allow}>
      <div>protected content</div>
    </ProtectedRoute>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows a loading spinner and no children while auth is loading', () => {
    authState = { user: null, loading: true };
    renderProtected(['listener']);

    expect(screen.getByRole('status')).toBeDefined();
    expect(screen.queryByText('protected content')).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });

  it('redirects to /login when unauthenticated', async () => {
    authState = { user: null, loading: false };
    renderProtected(['listener']);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
    expect(screen.queryByText('protected content')).toBeNull();
  });

  it('redirects to /home when the role is not allowed', async () => {
    authState = { user: { id: 'a1', role: 'artist' }, loading: false };
    renderProtected(['listener']);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/home'));
    expect(screen.queryByText('protected content')).toBeNull();
  });

  it('renders children for an allowed role', async () => {
    authState = { user: { id: 'u1', role: 'listener' }, loading: false };
    renderProtected(['listener']);

    await waitFor(() => expect(screen.getByText('protected content')).toBeDefined());
    expect(replace).not.toHaveBeenCalled();
  });

  it('renders children for any authenticated role when no allow prop is given', async () => {
    authState = { user: { id: 's1', role: 'support' }, loading: false };
    renderProtected(undefined);

    await waitFor(() => expect(screen.getByText('protected content')).toBeDefined());
    expect(replace).not.toHaveBeenCalled();
  });
});
