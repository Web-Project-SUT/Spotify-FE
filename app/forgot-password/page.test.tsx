// app/forgot-password/page.test.tsx
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import ForgotPasswordPage from './page';

describe('ForgotPasswordPage', () => {
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

  it('shows a success message for a valid email', () => {
    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@demo.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send recovery link' }));

    expect(
      screen.getByText((_, node) => node?.textContent === "If an account exists for user@demo.com, we've sent recovery instructions.")
    ).toBeDefined();
  });
});
