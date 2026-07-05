// context/LanguageContext.test.tsx
import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LanguageProvider, useLanguage } from './LanguageContext';
import * as ls from '../utils/localStorage';

vi.mock('../utils/localStorage', () => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
}));

function Probe() {
  const { language, setLanguage, t, dir } = useLanguage();
  return (
    <div>
      <span data-testid="language">{language}</span>
      <span data-testid="dir">{dir}</span>
      <span data-testid="greeting">{t('home.welcomeBack')}</span>
      <button onClick={() => setLanguage('fa')}>to-fa</button>
      <button onClick={() => setLanguage('es')}>to-es</button>
    </div>
  );
}

describe('LanguageContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (ls.getItem as any).mockReturnValue(null);
  });

  afterEach(() => {
    cleanup();
  });

  it('defaults to en', async () => {
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    );

    await waitFor(() => expect(screen.getByTestId('language').textContent).toBe('en'));
    expect(screen.getByTestId('dir').textContent).toBe('ltr');
    expect(screen.getByTestId('greeting').textContent).toBe('Welcome back');
  });

  it('setLanguage("fa") updates t() output, persists userPrefs, and flips to rtl', async () => {
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    );
    await waitFor(() => expect(screen.getByTestId('language').textContent).toBe('en'));

    fireEvent.click(screen.getByText('to-fa'));

    await waitFor(() => expect(screen.getByTestId('language').textContent).toBe('fa'));
    expect(screen.getByTestId('greeting').textContent).toBe('خوش آمدید');
    expect(screen.getByTestId('dir').textContent).toBe('rtl');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('fa');
    expect(ls.setItem).toHaveBeenCalledWith('userPrefs', expect.objectContaining({ language: 'fa' }));
  });

  it('reverts to ltr on es', async () => {
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    );
    await waitFor(() => expect(screen.getByTestId('language').textContent).toBe('en'));

    fireEvent.click(screen.getByText('to-es'));

    await waitFor(() => expect(screen.getByTestId('language').textContent).toBe('es'));
    expect(screen.getByTestId('dir').textContent).toBe('ltr');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('merges into the existing userPrefs object instead of clobbering it', async () => {
    (ls.getItem as any).mockReturnValue({ volume: 42, notifLimit: false });

    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    );
    await waitFor(() => expect(screen.getByTestId('language').textContent).toBe('en'));

    fireEvent.click(screen.getByText('to-fa'));

    await waitFor(() =>
      expect(ls.setItem).toHaveBeenCalledWith(
        'userPrefs',
        expect.objectContaining({ volume: 42, notifLimit: false, language: 'fa' })
      )
    );
  });
});
