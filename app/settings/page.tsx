// app/settings/page.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '../../components/AppShell';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { getItem, setItem } from '../../utils/localStorage';
import { LANGUAGES } from '../../utils/i18n';
import { SubscriptionPrices } from '../../utils/types';
import { Button, Badge } from '../../components/ui';

function SettingsContent() {
  const { user, deleteAccount } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const router = useRouter();
  const [notifLimit, setNotifLimit] = useState(true);
  const [volume, setVolume] = useState(70);
  const [prices, setPrices] = useState<SubscriptionPrices | null>(null);

  useEffect(() => {
    const prefs = getItem('userPrefs');
    if (prefs) {
      setNotifLimit(prefs.notifLimit ?? true);
      setVolume(prefs.volume ?? 70);
    }
    setPrices(getItem('subscriptionPrices'));
  }, []);

  const savePrefs = (next: Record<string, unknown>) => {
    const prefs = getItem('userPrefs') || {};
    setItem('userPrefs', { ...prefs, notifLimit, volume, ...next });
  };

  const handleDeleteAccount = () => {
    if (confirm(t('settings.deleteConfirm'))) {
      deleteAccount();
      router.push('/login');
    }
  };

  const tier = user?.tier || 'basic';

  return (
    <div className="p-4 md:p-8 max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold">{t('settings.title')}</h1>

      <section className="bg-surface-2 p-6 rounded-lg space-y-4">
        <h2 className="font-bold">{t('settings.preferences')}</h2>
        <label className="flex items-center justify-between">
          <span>{t('settings.limitNotifications')}</span>
          <input
            type="checkbox"
            checked={notifLimit}
            onChange={(e) => {
              setNotifLimit(e.target.checked);
              savePrefs({ notifLimit: e.target.checked });
            }}
          />
        </label>
        <div>
          <label className="block mb-1">
            {t('settings.systemVolume')}: {volume}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => {
              const v = Number(e.target.value);
              setVolume(v);
              savePrefs({ volume: v });
            }}
            className="w-full"
          />
        </div>
        <div>
          <label className="block mb-1">{t('settings.language')}</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as typeof language)}
            className="bg-surface-3 border border-border rounded px-3 py-2"
          >
            {LANGUAGES.map(({ code, label }) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="bg-surface-2 p-6 rounded-lg space-y-3">
        <h2 className="font-bold">{t('settings.subscription')}</h2>
        <p className="flex items-center gap-2">
          {t('settings.currentPlan')}{' '}
          {tier === 'gold' ? (
            <Badge tone="gold">{t('settings.tier.gold')}</Badge>
          ) : tier === 'silver' ? (
            <Badge tone="silver">{t('settings.tier.silver')}</Badge>
          ) : (
            <Badge>{t('settings.tier.free')}</Badge>
          )}
        </p>
        {prices && (
          <p className="text-muted text-sm">
            {t('settings.tier.silver')} ${prices.silver.toFixed(2)}/mo · {t('settings.tier.gold')} $
            {prices.gold.toFixed(2)}/mo
          </p>
        )}
        <Button onClick={() => router.push('/upgrade')}>{t('settings.upgradeButton')}</Button>
        <p className="text-muted text-xs">{t('settings.paymentPhase2')}</p>
      </section>

      <section className="bg-surface-2 p-6 rounded-lg">
        <h2 className="font-bold mb-3">{t('settings.dangerZone')}</h2>
        <Button variant="danger" onClick={handleDeleteAccount}>
          {t('settings.deleteAccount')}
        </Button>
      </section>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AppShell allow={['listener', 'artist']}>
      <SettingsContent />
    </AppShell>
  );
}
