// utils/i18n.test.ts
import { describe, it, expect } from 'vitest';
import { translate, translations, isRtl } from './i18n';

describe('i18n', () => {
  describe('translate', () => {
    it('returns the right string per language', () => {
      expect(translate('en', 'nav.home')).toBe('Home');
      expect(translate('fa', 'nav.home')).toBe('خانه');
      expect(translate('es', 'nav.home')).toBe('Inicio');
    });

    it('falls back to en for a key missing in the target language', () => {
      const key = '__only_in_en__';
      translations.en[key] = 'English only';

      expect(translate('fa', key)).toBe('English only');

      delete translations.en[key];
    });

    it('returns the raw key when even en lacks it', () => {
      expect(translate('en', '__totally_missing__')).toBe('__totally_missing__');
      expect(translate('fa', '__totally_missing__')).toBe('__totally_missing__');
    });
  });

  describe('isRtl', () => {
    it('is true for fa', () => {
      expect(isRtl('fa')).toBe(true);
    });

    it('is false for en and es', () => {
      expect(isRtl('en')).toBe(false);
      expect(isRtl('es')).toBe(false);
    });
  });
});
