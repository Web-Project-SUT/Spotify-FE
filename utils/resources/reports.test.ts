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
