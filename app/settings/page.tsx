// app/settings/page.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '../../components/AppShell';
import { useAuth } from '../../context/AuthContext';
import { getItem, setItem } from '../../utils/localStorage';
import { SubscriptionPrices } from '../../utils/types';
import { Button, Badge } from '../../components/ui';

function SettingsContent() {
  const { user, deleteAccount } = useAuth();
  const router = useRouter();
  const [notifLimit, setNotifLimit] = useState(true);
  const [volume, setVolume] = useState(70);
  const [language, setLanguage] = useState('en');
  const [prices, setPrices] = useState<SubscriptionPrices | null>(null);

  useEffect(() => {
    const prefs = getItem('userPrefs');
    if (prefs) {
      setNotifLimit(prefs.notifLimit ?? true);
      setVolume(prefs.volume ?? 70);
      setLanguage(prefs.language ?? 'en');
    }
    setPrices(getItem('subscriptionPrices'));
  }, []);

  const savePrefs = (next: Record<string, unknown>) => {
    const merged = { notifLimit, volume, language, ...next };
    setItem('userPrefs', merged);
  };

  const handleDeleteAccount = () => {
    if (confirm('Delete your account? This cannot be undone.')) {
      deleteAccount();
      router.push('/login');
    }
  };

  const tier = user?.tier || 'basic';

  return (
    <div className="p-8 max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      <section className="bg-surface-2 p-6 rounded-lg space-y-4">
        <h2 className="font-bold">Preferences</h2>
        <label className="flex items-center justify-between">
          <span>Limit notifications</span>
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
          <label className="block mb-1">System volume: {volume}%</label>
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
          <label className="block mb-1">Language</label>
          <select
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value);
              savePrefs({ language: e.target.value });
            }}
            className="bg-surface-3 border border-border rounded px-3 py-2"
          >
            <option value="en">English</option>
            <option value="fa">فارسی</option>
            <option value="es">Español</option>
          </select>
        </div>
      </section>

      <section className="bg-surface-2 p-6 rounded-lg space-y-3">
        <h2 className="font-bold">Subscription</h2>
        <p className="flex items-center gap-2">
          Current plan:{' '}
          {tier === 'gold' ? <Badge tone="gold">Gold</Badge> : tier === 'silver' ? <Badge tone="silver">Silver</Badge> : <Badge>Free</Badge>}
        </p>
        {prices && (
          <p className="text-muted text-sm">
            Silver ${prices.silver.toFixed(2)}/mo · Gold ${prices.gold.toFixed(2)}/mo
          </p>
        )}
        <Button onClick={() => router.push('/upgrade')}>Upgrade or change plan</Button>
        <p className="text-muted text-xs">Payment is handled in Phase 2.</p>
      </section>

      <section className="bg-surface-2 p-6 rounded-lg">
        <h2 className="font-bold mb-3">Danger zone</h2>
        <Button variant="danger" onClick={handleDeleteAccount}>
          Delete account
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
