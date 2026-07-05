// app/login/page.test.tsx
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import LoginPage from './page';
import { LanguageProvider } from '../../context/LanguageContext';

const replaceMock = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: replaceMock, push: vi.fn() }) }));

const loginMock = vi.fn();
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ login: loginMock, user: null, loading: false }),
}));

function renderPage() {
  return render(
    <LanguageProvider>
      <LoginPage />
    </LanguageProvider>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => cleanup());

  it('shows required-field errors on empty submit and does not call login', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(screen.getByText('Email is required.')).toBeDefined();
    expect(screen.getByText('Password is required.')).toBeDefined();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('shows an email format error for an invalid email', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'not-an-email' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(screen.getByText('Enter a valid email address.')).toBeDefined();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('shows an auth error when login returns null', () => {
    loginMock.mockReturnValue(null);
    renderPage();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'nobody@demo.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(screen.getByText('No account found with those credentials.')).toBeDefined();
  });

  it('redirects to the listener home on successful login', () => {
    loginMock.mockReturnValue({ id: 'u1', email: 'listener@demo.com', role: 'listener' });
    renderPage();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'listener@demo.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(replaceMock).toHaveBeenCalledWith('/home');
  });

  it('redirects to the admin dashboard on successful login', () => {
    loginMock.mockReturnValue({ id: 'u2', email: 'admin@demo.com', role: 'admin' });
    renderPage();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@demo.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(replaceMock).toHaveBeenCalledWith('/dashboard');
  });
});
