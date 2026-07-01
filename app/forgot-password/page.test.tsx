// app/forgot-password/page.test.tsx
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ForgotPasswordPage from './page';

const replaceMock = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: replaceMock, push: vi.fn() }) }));

const authState: { user: unknown; loading: boolean } = { user: null, loading: false };
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => authState,
}));

const successMessage = "If an account exists for user@demo.com, we've sent recovery instructions.";

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.user = null;
    authState.loading = false;
  });

  afterEach(() => cleanup());

  it('shows a validation error for an empty email', () => {
    render(<ForgotPasswordPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Send recovery link' }));

    expect(screen.getByText('Email is required.')).toBeDefined();
  });

  it('shows a validation error for an invalid email', () => {
    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send recovery link' }));

    expect(screen.getByText('Enter a valid email address.')).toBeDefined();
  });

  it('shows a loading spinner and disables the button while sending', () => {
    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@demo.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send recovery link' }));

    // The mock send is async (setTimeout), so the spinner is visible synchronously after submit.
    expect(screen.getByRole('status')).toBeDefined();
    expect(screen.getByRole('button')).toHaveProperty('disabled', true);
  });

  it('shows a success message for a valid email after the mock send', async () => {
    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@demo.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send recovery link' }));

    expect(
      await screen.findByText((_, node) => node?.textContent === successMessage)
    ).toBeDefined();
  });

  it('redirects an already-authenticated user to their role home', () => {
    authState.user = { id: 'u1', email: 'listener@demo.com', role: 'listener' };
    render(<ForgotPasswordPage />);

    expect(replaceMock).toHaveBeenCalledWith('/home');
  });
});
