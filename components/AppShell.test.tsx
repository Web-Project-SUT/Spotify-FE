// components/AppShell.test.tsx
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AppShell from './AppShell';

const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => '/home',
}));

let authState: { user: any; loading: boolean; logout: () => void };
vi.mock('../context/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('../context/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

afterEach(cleanup);

describe('AppShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState = {
      user: { id: 'u1', role: 'listener', tier: 'basic', displayName: 'Ava' },
      loading: false,
      logout: vi.fn(),
    };
  });

  it('renders the mobile hamburger toggle collapsed by default', () => {
    render(
      <AppShell allow={['listener']}>
        <div>page content</div>
      </AppShell>
    );

    const toggle = screen.getByLabelText('Open navigation menu');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('opens the drawer when the hamburger is clicked', () => {
    render(
      <AppShell allow={['listener']}>
        <div>page content</div>
      </AppShell>
    );

    const toggle = screen.getByLabelText('Open navigation menu');
    fireEvent.click(toggle);

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('closes the drawer when a nav item is clicked', () => {
    render(
      <AppShell allow={['listener']}>
        <div>page content</div>
      </AppShell>
    );

    fireEvent.click(screen.getByLabelText('Open navigation menu'));
    expect(screen.getByLabelText('Open navigation menu').getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(screen.getByText('nav.home'));

    expect(screen.getByLabelText('Open navigation menu').getAttribute('aria-expanded')).toBe('false');
  });

  it('renders the page content', () => {
    render(
      <AppShell allow={['listener']}>
        <div>page content</div>
      </AppShell>
    );

    expect(screen.getByText('page content')).toBeDefined();
  });
});
