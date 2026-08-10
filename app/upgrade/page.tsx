// app/upgrade/page.tsx
'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '../../components/AppShell';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Button, Badge, Card } from '../../components/ui';
import { Plan, loadPlans, startPayment, applyMockUpgrade } from '../../utils/resources/subscriptions';

type PaymentResult = 'success' | 'failed' | 'cancelled' | null;

function UpgradeContent() {
  const { user, refreshMe } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const params = useSearchParams();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [busyTier, setBusyTier] = useState<string | null>(null);

  const result = (params.get('payment') as PaymentResult) || null;
  const currentTier = user?.tier || 'basic';

  useEffect(() => {
    let active = true;
    void (async () => {
      const p = await loadPlans();
      if (active) setPlans(p);
    })();
    return () => {
      active = false;
    };
  }, []);

  // After returning from the gateway with ?payment=success, re-fetch the
  // user so the newly active subscription (and thus the tier) is reflected.
  useEffect(() => {
    if (result === 'success') void refreshMe();
  }, [result, refreshMe]);

  const handleSubscribe = async (plan: Plan) => {
    setBusyTier(plan.tier);
    try {
      const url = await startPayment(plan.id);
      if (url) {
        // Real gateway: hand the browser to Zarinpal's StartPay page.
        window.location.href = url;
        return;
      }
      // Mock mode: no gateway, apply the upgrade locally and show success.
      applyMockUpgrade(plan.tier);
      router.replace('/upgrade?payment=success');
    } finally {
      setBusyTier(null);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{t('upgrade.title')}</h1>
        <p className="text-muted mt-1">
          {t('upgrade.currentPlan')}:{' '}
          <span className="capitalize font-semibold">{currentTier}</span>
        </p>
      </div>

      {result === 'success' && (
        <div className="rounded-lg border border-green-600 bg-green-600/10 text-green-400 px-4 py-3">
          {t('upgrade.success')}
        </div>
      )}
      {result === 'failed' && (
        <div className="rounded-lg border border-red-600 bg-red-600/10 text-red-400 px-4 py-3">
          {t('upgrade.failed')}
        </div>
      )}
      {result === 'cancelled' && (
        <div className="rounded-lg border border-yellow-600 bg-yellow-600/10 text-yellow-400 px-4 py-3">
          {t('upgrade.cancelled')}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {plans.map((plan) => {
          const isCurrent = plan.tier === currentTier;
          return (
            <Card key={plan.id} className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold capitalize">{plan.tier}</h2>
                <Badge tone={plan.tier === 'gold' ? 'gold' : 'silver'}>{plan.tier}</Badge>
              </div>
              <p className="text-3xl font-bold">
                ${plan.monthlyPrice.toFixed(2)}
                <span className="text-muted text-base font-normal">/mo</span>
              </p>
              <Button
                className="w-full"
                disabled={isCurrent || busyTier !== null}
                onClick={() => void handleSubscribe(plan)}
              >
                {isCurrent
                  ? t('upgrade.currentPlanButton')
                  : busyTier === plan.tier
                    ? t('upgrade.processing')
                    : t('upgrade.subscribe')}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default function UpgradePage() {
  return (
    <AppShell allow={['listener', 'artist']}>
      <Suspense fallback={null}>
        <UpgradeContent />
      </Suspense>
    </AppShell>
  );
}
