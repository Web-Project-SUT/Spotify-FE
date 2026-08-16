// utils/resources/reports.ts
//
// Read-only reporting endpoints, mapped into shapes the existing dashboards
// already understand (Payout, RevenueData, and a small ArtistSummary the
// stats header uses). Every loader returns null / [] when the backend is
// off so the mock dashboards keep rendering their localStorage-derived
// numbers unchanged.
import { apiEnabled, apiFetch } from '../api';
import { getItem, updateRecord } from '../localStorage';
import { getCurrentUser } from '../auth';
import { Payout, RevenueData, Song, User } from '../types';
import { fetchAll, mediaUrl } from './http';

// ---- Artist: my summary -------------------------------------------------

export interface ArtistSummary {
  period: string | null;
  totalStreams: number;
  totalListeners: number;
  totalEarnings: number;
}

interface BackendArtistSummary {
  period: string | null;
  totalStreams: number;
  totalListeners: number;
  totalEarnings: string; // DecimalField serialises as a string
}

export async function loadMyArtistSummary(): Promise<ArtistSummary | null> {
  if (!apiEnabled) {
    // Mock: aggregate the current artist's own tracks from the local store.
    const me = getCurrentUser();
    if (!me) return null;
    const mine: Song[] = (getItem('songs') || []).filter((s: Song) => s.artistId === me.id);
    return {
      period: null,
      totalStreams: mine.reduce((n, s) => n + (s.streamCount || 0), 0),
      totalListeners: mine.reduce((n, s) => n + (s.listenerCount || 0), 0),
      totalEarnings: mine.reduce((n, s) => n + (s.earnings || 0), 0),
    };
  }
  const data = await apiFetch<BackendArtistSummary>('/reports/artists/me/summary/');
  if (!data) return null;
  return {
    period: data.period,
    totalStreams: data.totalStreams,
    totalListeners: data.totalListeners,
    totalEarnings: Number(data.totalEarnings),
  };
}

// ---- Artist: my per-track stats ----------------------------------------

export interface TrackStat {
  id: string;
  title: string;
  cover?: string;
  streamCount: number;
  listenerCount: number;
  earnings: number;
  releasedAt: string;
}

interface BackendTrackStat {
  id: string;
  title: string;
  cover: string | null;
  streamCount: number;
  listenerCount: number;
  earnings: string;
  releasedAt: string;
}

export async function loadMyTrackStats(): Promise<TrackStat[]> {
  if (!apiEnabled) {
    const me = getCurrentUser();
    if (!me) return [];
    return (getItem('songs') || [])
      .filter((s: Song) => s.artistId === me.id)
      .map((s: Song) => ({
        id: s.id,
        title: s.title,
        cover: typeof s.cover === 'string' && s.cover.startsWith('http') ? s.cover : undefined,
        streamCount: s.streamCount || 0,
        listenerCount: s.listenerCount || 0,
        earnings: s.earnings || 0,
        releasedAt: '',
      }));
  }
  const rows = await fetchAll<BackendTrackStat>('/reports/artists/me/tracks/');
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    cover: mediaUrl(r.cover),
    streamCount: r.streamCount,
    listenerCount: r.listenerCount,
    earnings: Number(r.earnings),
    releasedAt: r.releasedAt,
  }));
}

// ---- Payouts (admin / accounting view) ---------------------------------

interface BackendPayout {
  id: string;
  artistId: string;
  artistName: string;
  listeners: number;
  streams: number;
  amount: string;
  status: 'paid' | 'pending';
}

// `period` is a YYYY-MM string; omitted means every period the backend has.
export async function loadPayouts(period?: string): Promise<Payout[]> {
  if (!apiEnabled) return getItem('payouts') || [];
  const query = period ? `?period=${encodeURIComponent(period)}` : '';
  const rows = await fetchAll<BackendPayout>(`/reports/payouts/${query}`);
  return rows.map((r) => ({
    id: r.id,
    artistId: r.artistId,
    artistName: r.artistName,
    listeners: r.listeners,
    streams: r.streams,
    amount: Number(r.amount),
    status: r.status,
  }));
}

// Admin-only. Returns the settled payout, or null if the backend refused —
// the caller surfaces that rather than optimistically marking the row paid.
export async function settlePayout(id: string): Promise<Payout | null> {
  if (!apiEnabled) {
    updateRecord('payouts', id, { status: 'paid' });
    return null;
  }
  const row = await apiFetch<BackendPayout>(`/reports/payouts/${id}/settle/`, { method: 'POST' });
  if (!row) return null;
  return {
    id: row.id,
    artistId: row.artistId,
    artistName: row.artistName,
    listeners: row.listeners,
    streams: row.streams,
    amount: Number(row.amount),
    status: row.status,
  };
}

// Admin-only: (re)computes the month's payouts from the recorded PlayEvents.
// Already-settled rows are left alone by the backend. No mock counterpart —
// the mock store has no play history to aggregate.
export interface GeneratePayoutsResult {
  period: string;
  created: number;
  updated: number;
  skippedSettled: number;
}

export async function generatePayouts(period?: string): Promise<GeneratePayoutsResult | null> {
  if (!apiEnabled) return null;
  return apiFetch<GeneratePayoutsResult>('/reports/payouts/generate/', {
    method: 'POST',
    body: { period: period || null },
  });
}

// ---- Admin overview (revenue series for the chart) ---------------------

interface BackendAdminOverview {
  revenue: {
    currentMonth: string;
    total: string;
    activeSubscriptions: number;
    series?: Array<{ month: string; label: string; amount: string }>;
  };
  tierDistribution: { basic: number; silver: number; gold: number };
  totals: Record<string, number>;
}

export interface AdminOverview {
  currentMonthRevenue: number;
  totalRevenue: number;
  activeSubscriptions: number;
  revenueSeries: RevenueData[];
  tierDistribution: { basic: number; silver: number; gold: number };
}

export async function loadAdminOverview(): Promise<AdminOverview | null> {
  if (!apiEnabled) {
    // Mock: revenue series from the local store, tier counts from users.
    const series: RevenueData[] = getItem('revenueData') || [];
    const users: User[] = getItem('users') || [];
    const tierDistribution = { basic: 0, silver: 0, gold: 0 };
    users
      .filter((u) => u.role === 'listener')
      .forEach((u) => {
        const tier = (u.tier || 'basic') as keyof typeof tierDistribution;
        if (tier in tierDistribution) tierDistribution[tier] += 1;
      });
    return {
      currentMonthRevenue: series.length ? series[series.length - 1].amount : 0,
      totalRevenue: series.reduce((n, r) => n + (r.amount || 0), 0),
      activeSubscriptions: tierDistribution.silver + tierDistribution.gold,
      revenueSeries: series,
      tierDistribution,
    };
  }
  const data = await apiFetch<BackendAdminOverview>('/reports/admin/overview/');
  if (!data) return null;
  return {
    currentMonthRevenue: Number(data.revenue.currentMonth),
    totalRevenue: Number(data.revenue.total),
    activeSubscriptions: data.revenue.activeSubscriptions,
    revenueSeries: (data.revenue.series || []).map((s) => ({
      month: s.label,
      amount: Number(s.amount),
    })),
    tierDistribution: data.tierDistribution,
  };
}
