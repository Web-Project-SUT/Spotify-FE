// components/PriceControl.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { getItem } from '../utils/localStorage';
import { SubscriptionPrices } from '../utils/types';
import { Plan, loadPlans, updatePlanPrice } from '../utils/resources/subscriptions';
import { Button } from './ui';

export default function PriceControl() {
  const [prices, setPrices] = useState<SubscriptionPrices>({ silver: 0, gold: 0 });
  const [plans, setPlans] = useState<Plan[]>([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      // Prefer live plan prices; fall back to the locally-stored ones.
      const loaded = await loadPlans();
      if (!active) return;
      setPlans(loaded);
      const stored = getItem('subscriptionPrices');
      const next: SubscriptionPrices = { silver: 0, gold: 0, ...(stored || {}) };
      loaded.forEach((p) => {
        if (p.tier === 'silver' || p.tier === 'gold') next[p.tier] = p.monthlyPrice;
      });
      setPrices(next);
    })();
    return () => {
      active = false;
    };
  }, []);

  const update = async () => {
    setSaving(true);
    // Prices are data, never hardcoded. In API mode each plan is PATCHed
    // (admin only); in mock mode the local subscriptionPrices are updated.
    const byTier = (tier: 'silver' | 'gold') =>
      plans.find((p) => p.tier === tier) || { id: `mock-${tier}`, tier };
    await Promise.all([
      updatePlanPrice(byTier('silver'), prices.silver),
      updatePlanPrice(byTier('gold'), prices.gold),
    ]);
    setSaving(false);
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
        <Button onClick={() => void update()} disabled={saving}>Update prices</Button>
        {saved && <span className="text-accent text-sm">Saved!</span>}
      </div>
    </div>
  );
}
