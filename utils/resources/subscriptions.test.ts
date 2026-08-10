// utils/resources/subscriptions.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('subscriptions resource — mock mode', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_API_URL;
  });
  afterEach(() => vi.doUnmock('../localStorage'));

  it('synthesises silver/gold plans from local prices', async () => {
    vi.doMock('../localStorage', () => ({
      getItem: (key: string) =>
        key === 'subscriptionPrices' ? { silver: 4.99, gold: 9.99 } : null,
      setItem: vi.fn(),
      updateRecord: vi.fn(),
    }));
    const { loadPlans } = await import('./subscriptions');
    const plans = await loadPlans();
    expect(plans.map((p) => p.tier)).toEqual(['silver', 'gold']);
    expect(plans[1].monthlyPrice).toBe(9.99);
  });

  it('startPayment returns null in mock mode (no gateway)', async () => {
    vi.doMock('../localStorage', () => ({ getItem: () => null, setItem: vi.fn(), updateRecord: vi.fn() }));
    const { startPayment } = await import('./subscriptions');
    expect(await startPayment('mock-gold')).toBeNull();
  });
});

describe('subscriptions resource — API mode', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_API_URL = 'http://backend.test/api';
  });
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_API_URL;
    vi.restoreAllMocks();
  });

  it('loadPlans maps decimal prices and drops basic', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [
          { id: 'b', tier: 'basic', monthlyPrice: '0.00' },
          { id: 's', tier: 'silver', monthlyPrice: '4.99' },
          { id: 'g', tier: 'gold', monthlyPrice: '9.99' },
        ],
      })
    );
    const { loadPlans } = await import('./subscriptions');
    const plans = await loadPlans();
    expect(plans.map((p) => p.tier)).toEqual(['silver', 'gold']);
    expect(plans[0]).toEqual({ id: 's', tier: 'silver', monthlyPrice: 4.99 });
  });

  it('startPayment POSTs { planId } and returns the gateway URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ paymentUrl: 'https://sandbox.zarinpal.com/pg/StartPay/A1' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { startPayment } = await import('./subscriptions');
    const url = await startPayment('g');
    expect(url).toBe('https://sandbox.zarinpal.com/pg/StartPay/A1');
    const [reqUrl, opts] = fetchMock.mock.calls[0];
    expect(reqUrl).toBe('http://backend.test/api/subscriptions/pay/start/');
    expect(JSON.parse(opts.body)).toEqual({ planId: 'g' });
  });
});
