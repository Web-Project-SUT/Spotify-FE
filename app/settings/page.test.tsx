// app/settings/page.test.tsx
import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SettingsPage from './page';
import { LanguageProvider } from '../../context/LanguageContext';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('../../components/AppShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const deleteAccountMock = vi.fn();
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', role: 'listener', tier: 'basic' },
    deleteAccount: deleteAccountMock,
  }),
}));

const store: Record<string, unknown> = {};
vi.mock('../../utils/localStorage', () => ({
  getItem: vi.fn((key: string) => (key in store ? store[key] : null)),
  setItem: vi.fn((key: string, value: unknown) => {
    store[key] = value;
  }),
}));

function renderPage() {
  return render(
    <LanguageProvider>
      <SettingsPage />
    </LanguageProvider>
  );
}

describe('SettingsPage language switching', () => {
  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
    vi.clearAllMocks();
  });

  afterEach(() => cleanup());

  it('renders English labels by default', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Settings')).toBeDefined());
    expect(screen.getByText('Preferences')).toBeDefined();
    expect(screen.getByText('Delete account')).toBeDefined();
  });

  it('changing the language select writes userPrefs.language and re-renders in the new language', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Settings')).toBeDefined());

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'es' } });

    await waitFor(() => expect(screen.getByText('Ajustes')).toBeDefined());
    expect(store.userPrefs).toEqual(expect.objectContaining({ language: 'es' }));
    expect(screen.getByText('Preferencias')).toBeDefined();
    expect(screen.getByText('Eliminar cuenta')).toBeDefined();
  });
});
