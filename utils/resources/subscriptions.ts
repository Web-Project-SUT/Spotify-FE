// utils/resources/subscriptions.ts
//
// Subscription/payment seam. In API mode the plans come from the backend and
// starting a payment returns a Zarinpal StartPay URL to redirect the browser
// to. In mock mode there is no gateway, so startPayment returns null and the
// caller applies the tier change locally instead.
import { apiEnabled, apiFetch } from '../api';
import { getItem, setItem, updateRecord } from '../localStorage';
import { Tier, User } from '../types';

export interface Plan {
  id: string;
  tier: Tier;
  monthlyPrice: number;
}

interface BackendPlan {
  id: string;
  tier: Tier;
  monthlyPrice: string; // DecimalField -> string
}

export async function loadPlans(): Promise<Plan[]> {
  if (apiEnabled) {
    const plans = await apiFetch<BackendPlan[]>('/subscriptions/plans/', { auth: false });
    if (plans) {
      return plans
        .filter((p) => p.tier !== 'basic')
        .map((p) => ({ id: String(p.id), tier: p.tier, monthlyPrice: Number(p.monthlyPrice) }));
    }
  }
  // Mock: synthesise plans from the locally-stored prices.
  const prices = getItem('subscriptionPrices') || { silver: 4.99, gold: 9.99 };
  return [
    { id: 'mock-silver', tier: 'silver', monthlyPrice: prices.silver },
    { id: 'mock-gold', tier: 'gold', monthlyPrice: prices.gold },
  ];
}

export type PeriodMonths = 1 | 3 | 6 | 12;

// Returns a Zarinpal StartPay URL to redirect to, or null when running in
// mock mode (no real gateway) — the caller then applies a mock upgrade.
export async function startPayment(
  planId: string,
  periodMonths: PeriodMonths = 1
): Promise<string | null> {
  if (!apiEnabled) return null;
  const res = await apiFetch<{ paymentUrl: string }>('/subscriptions/pay/start/', {
    method: 'POST',
    body: { planId, periodMonths },
  });
  return res?.paymentUrl ?? null;
}

// Mock-mode only: apply the purchased tier locally so the demo reflects the
// upgrade without a real payment. In API mode the tier is derived from the
// active subscription and picked up via refreshMe() instead.
export function applyMockUpgrade(tier: Tier): void {
  const current: User | null = getItem('currentUser');
  if (!current) return;
  updateRecord('users', current.id, { tier });
  setItem('currentUser', { ...current, tier });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new StorageEvent('storage', { key: 'currentUser' }));
  }
}

// Admin-only dynamic pricing (Task 29). API mode PATCHes the plan; mock mode
// writes the local subscriptionPrices used by loadPlans() and the UI.
export async function updatePlanPrice(
  plan: { id: string; tier: Tier },
  monthlyPrice: number
): Promise<boolean> {
  if (apiEnabled) {
    const res = await apiFetch(`/subscriptions/plans/${plan.id}/`, {
      method: 'PATCH',
      body: { monthlyPrice },
    });
    return res !== null;
  }
  const prices = getItem('subscriptionPrices') || { silver: 4.99, gold: 9.99 };
  if (plan.tier === 'silver' || plan.tier === 'gold') {
    setItem('subscriptionPrices', { ...prices, [plan.tier]: monthlyPrice });
  }
  return true;
}
