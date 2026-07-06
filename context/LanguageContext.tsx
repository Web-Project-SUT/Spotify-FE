// context/LanguageContext.tsx
'use client';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getItem, setItem } from '../utils/localStorage';
import { Language, isRtl, translate } from '../utils/i18n';

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  dir: 'ltr' | 'rtl';
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

// Support accounts have no access to the language switcher (no Settings
// page) and the panel is meant to stay English-only regardless of whatever
// language a listener/artist previously set on this shared device.
const readLanguage = (): Language => {
  if (getItem('currentUser')?.role === 'support') return 'en';
  return getItem('userPrefs')?.language ?? 'en';
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Starts at 'en' so the server-rendered markup and the first client render
  // match; the real value (if different) is picked up in the mount effect,
  // same SSR-safe pattern as AuthContext.
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    setLanguageState(readLanguage());
  }, []);

  useEffect(() => {
    // Cross-tab sync: reuses the project's existing 'storage'-event pattern
    // (see Player/GroupSession) rather than inventing a new mechanism.
    const onStorage = () => setLanguageState(readLanguage());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const dir = isRtl(language) ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
  }, [language, dir]);

  const setLanguage = useCallback((lang: Language) => {
    const prefs = getItem('userPrefs') || {};
    setItem('userPrefs', { ...prefs, language: lang });
    setLanguageState(lang);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => translate(language, key, params),
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
