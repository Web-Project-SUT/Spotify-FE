// app/settings/page.test.tsx
import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SettingsPage from './page';
import { LanguageProvider } from '../../context/LanguageContext';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));
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
    expect(store.userPrefs).toEqual(
      expect.objectContaining({ __anon__: expect.objectContaining({ language: 'es' }) })
    );
    expect(screen.getByText('Preferencias')).toBeDefined();
    expect(screen.getByText('Eliminar cuenta')).toBeDefined();
  });
});

describe('SettingsPage account deletion', () => {
  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
    vi.clearAllMocks();
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('waits for the server delete before leaving for /login', async () => {
    deleteAccountMock.mockResolvedValue(true);
    renderPage();
    await waitFor(() => expect(screen.getByText('Delete account')).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/login'));
    expect(deleteAccountMock).toHaveBeenCalled();
  });

  it('keeps the user on the page and explains when the delete fails', async () => {
    deleteAccountMock.mockResolvedValue(false);
    renderPage();
    await waitFor(() => expect(screen.getByText('Delete account')).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeDefined());
    expect(screen.getByText(/could not delete your account/i)).toBeDefined();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('does not call the API when the confirm is dismissed', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false));
    renderPage();
    await waitFor(() => expect(screen.getByText('Delete account')).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));

    expect(deleteAccountMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
