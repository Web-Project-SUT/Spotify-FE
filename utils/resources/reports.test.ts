// utils/resources/reports.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('reports resource — API disabled (mock fallback)', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_API_URL;
  });
  afterEach(() => {
    vi.doUnmock('../localStorage');
    vi.doUnmock('../auth');
  });

  it('falls back to the local daily stream counter', async () => {
    vi.doMock('../auth', () => ({ getCurrentUser: () => ({ id: 'u1' }) }));
    vi.doMock('../localStorage', () => ({
      getItem: () => [],
      updateRecord: vi.fn(),
      getDailyStreams: (id: string) => (id === 'u1' ? 7 : 0),
    }));
    const { loadListeningStats } = await import('./reports');
    expect(await loadListeningStats()).toMatchObject({ streamsToday: 7, dailyLimit: null });
  });

  it('aggregates the current artist\'s own songs for the summary', async () => {
    vi.doMock('../auth', () => ({ getCurrentUser: () => ({ id: 'a1' }) }));
    vi.doMock('../localStorage', () => ({
      getItem: (key: string) =>
        key === 'songs'
          ? [
              { id: 's1', artistId: 'a1', streamCount: 100, listenerCount: 40, earnings: 5 },
              { id: 's2', artistId: 'a1', streamCount: 50, listenerCount: 20, earnings: 3 },
              { id: 's3', artistId: 'other', streamCount: 999, listenerCount: 1, earnings: 9 },
            ]
          : [],
    }));
    const { loadMyArtistSummary, loadMyTrackStats } = await import('./reports');
    const summary = await loadMyArtistSummary();
    expect(summary).toMatchObject({ totalStreams: 150, totalListeners: 60, totalEarnings: 8 });
    const stats = await loadMyTrackStats();
    expect(stats.map((s) => s.id)).toEqual(['s1', 's2']);
  });

  it('builds admin overview from local revenue + users', async () => {
    vi.doMock('../auth', () => ({ getCurrentUser: () => null }));
    vi.doMock('../localStorage', () => ({
      getItem: (key: string) => {
        if (key === 'revenueData') return [{ month: 'Jul', amount: 100 }, { month: 'Aug', amount: 150 }];
        if (key === 'users')
          return [
            { role: 'listener', tier: 'gold' },
            { role: 'listener', tier: 'silver' },
            { role: 'listener', tier: 'basic' },
            { role: 'listener' },
            { role: 'artist' },
          ];
        return [];
      },
    }));
    const { loadAdminOverview } = await import('./reports');
    const o = await loadAdminOverview();
    expect(o).toMatchObject({
      currentMonthRevenue: 150,
      totalRevenue: 250,
      activeSubscriptions: 2,
      tierDistribution: { basic: 2, silver: 1, gold: 1 },
    });
  });
});

describe('reports resource — API mode', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_API_URL = 'http://backend.test/api';
  });
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_API_URL;
    vi.restoreAllMocks();
  });

  it('reads listening stats from the backend rather than counting locally', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ streamsToday: 12, streamsThisMonth: 340, dailyLimit: 60, remainingToday: 48 }),
      })
    );
    const { loadListeningStats } = await import('./reports');
    expect(await loadListeningStats()).toEqual({
      streamsToday: 12,
      streamsThisMonth: 340,
      dailyLimit: 60,
      remainingToday: 48,
    });
  });

  it('maps the artist summary, coercing the decimal earnings string', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          period: '2026-08',
          totalStreams: 1200,
          totalListeners: 340,
          totalEarnings: '84.50',
        }),
      })
    );
    const { loadMyArtistSummary } = await import('./reports');
    const summary = await loadMyArtistSummary();
    expect(summary).toEqual({
      period: '2026-08',
      totalStreams: 1200,
      totalListeners: 340,
      totalEarnings: 84.5,
    });
  });

  it('maps payouts with numeric amounts', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: 'po1',
              artistId: 'a1',
              artistName: 'Nova Ray',
              listeners: 100,
              streams: 500,
              amount: '12.00',
              status: 'pending',
            },
          ],
        }),
      })
    );
    const { loadPayouts } = await import('./reports');
    const payouts = await loadPayouts();
    expect(payouts).toEqual([
      {
        id: 'po1',
        artistId: 'a1',
        artistName: 'Nova Ray',
        listeners: 100,
        streams: 500,
        amount: 12,
        status: 'pending',
      },
    ]);
  });
});

describe('payout actions — API mode', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_API_URL = 'http://backend.test/api';
  });
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_API_URL;
    vi.restoreAllMocks();
  });

  it('loadPayouts filters by period when one is given', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ count: 0, next: null, previous: null, results: [] }),
      })
    );
    const { loadPayouts } = await import('./reports');
    await loadPayouts('2026-08');
    expect((globalThis.fetch as any).mock.calls[0][0]).toBe(
      'http://backend.test/api/reports/payouts/?period=2026-08'
    );
  });

  it('settlePayout posts to the settle action and maps the row back', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'po1', artistId: 'a1', artistName: 'Nova Ray',
          listeners: 3, streams: 9, amount: '12.50', status: 'paid',
        }),
      })
    );
    const { settlePayout } = await import('./reports');
    const settled = await settlePayout('po1');
    const [url, init] = (globalThis.fetch as any).mock.calls[0];
    expect(url).toBe('http://backend.test/api/reports/payouts/po1/settle/');
    expect(init.method).toBe('POST');
    expect(settled).toMatchObject({ id: 'po1', amount: 12.5, status: 'paid' });
  });

  it('generatePayouts sends the period the admin picked', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ period: '2026-08-01', created: 1, updated: 0, skippedSettled: 0 }),
      })
    );
    const { generatePayouts } = await import('./reports');
    const result = await generatePayouts('2026-08');
    expect(JSON.parse((globalThis.fetch as any).mock.calls[0][1].body)).toEqual({
      period: '2026-08',
    });
    expect(result).toMatchObject({ created: 1 });
  });
});

describe('payout actions — mock fallback', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_API_URL;
  });
  afterEach(() => vi.doUnmock('../localStorage'));

  it('settlePayout marks the mock record paid instead of calling the API', async () => {
    const updateRecord = vi.fn();
    vi.doMock('../localStorage', () => ({ getItem: () => [], updateRecord }));
    const { settlePayout } = await import('./reports');
    await settlePayout('po1');
    expect(updateRecord).toHaveBeenCalledWith('payouts', 'po1', { status: 'paid' });
  });

  it('generatePayouts is a no-op with no play history to aggregate', async () => {
    vi.doMock('../localStorage', () => ({ getItem: () => [], updateRecord: vi.fn() }));
    const { generatePayouts } = await import('./reports');
    expect(await generatePayouts('2026-08')).toBeNull();
  });
});
