// utils/resources/reports.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('reports resource — API disabled', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it('returns null/empty so mock dashboards keep their own numbers', async () => {
    const { loadMyArtistSummary, loadPayouts, loadAdminOverview } = await import('./reports');
    expect(await loadMyArtistSummary()).toBeNull();
    expect(await loadPayouts()).toEqual([]);
    expect(await loadAdminOverview()).toBeNull();
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
