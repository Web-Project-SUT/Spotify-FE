// context/AuthContext.test.tsx
import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import * as ls from '../utils/localStorage';

vi.mock('../utils/localStorage', () => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  addRecord: vi.fn(),
  initializeMockDatabase: vi.fn(),
}));

function Consumer() {
  const { user, login, logout, registerListener } = useAuth();
  return (
    <div>
      <span data-testid="user">{user ? user.email : 'none'}</span>
      <button onClick={() => login('gold@demo.com', 'x')}>login</button>
      <button onClick={() => login('nobody@demo.com', 'x')}>login-bad</button>
      <button onClick={logout}>logout</button>
      <button
        onClick={() =>
          registerListener({ displayName: 'New', email: 'new@demo.com', password: 'p' })
        }
      >
        register
      </button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('logs in a known user', async () => {
    (ls.getItem as any).mockImplementation((key: string) => {
      if (key === 'users') return [{ id: 'u3', email: 'gold@demo.com', role: 'listener', tier: 'gold' }];
      return null;
    });

    render(<AuthProvider><Consumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('none'));

    fireEvent.click(screen.getByText('login'));

    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('gold@demo.com'));
    expect(ls.setItem).toHaveBeenCalledWith('currentUser', expect.objectContaining({ email: 'gold@demo.com' }));
  });

  it('does not log in an unknown user', async () => {
    (ls.getItem as any).mockImplementation((key: string) => {
      if (key === 'users') return [{ id: 'u3', email: 'gold@demo.com', role: 'listener', tier: 'gold' }];
      return null;
    });

    render(<AuthProvider><Consumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('none'));

    fireEvent.click(screen.getByText('login-bad'));

    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('none'));
  });

  it('registers a new listener with basic tier and logs them in', async () => {
    (ls.getItem as any).mockReturnValue(null);

    render(<AuthProvider><Consumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('none'));

    fireEvent.click(screen.getByText('register'));

    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('new@demo.com'));
    expect(ls.addRecord).toHaveBeenCalledWith(
      'users',
      expect.objectContaining({ role: 'listener', tier: 'basic' })
    );
  });
});
