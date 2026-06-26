// components/PriceControl.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { getItem, setItem } from '../utils/localStorage';
import { SubscriptionPrices } from '../utils/types';
import { Button } from './ui';

export default function PriceControl() {
  const [prices, setPrices] = useState<SubscriptionPrices>({ silver: 0, gold: 0 });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = getItem('subscriptionPrices');
    if (stored) setPrices(stored);
  }, []);

  const update = () => {
    // Prices are stored as data, never hardcoded — admins change them
    // here and the whole app reads the new values, no code change needed.
    setItem('subscriptionPrices', prices);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="bg-surface-2 p-6 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Subscription prices</h2>
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-sm font-bold mb-1">Silver price ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={prices.silver}
            onChange={(e) => setPrices({ ...prices, silver: parseFloat(e.target.value) || 0 })}
            className="bg-surface-3 border border-border rounded px-3 py-2 w-32"
          />
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">Gold price ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={prices.gold}
            onChange={(e) => setPrices({ ...prices, gold: parseFloat(e.target.value) || 0 })}
            className="bg-surface-3 border border-border rounded px-3 py-2 w-32"
          />
        </div>
        <Button onClick={update}>Update prices</Button>
        {saved && <span className="text-accent text-sm">Saved!</span>}
      </div>
    </div>
  );
}
