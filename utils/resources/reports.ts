// utils/resources/reports.ts
//
// Read-only reporting endpoints, mapped into shapes the existing dashboards
// already understand (Payout, RevenueData, and a small ArtistSummary the
// stats header uses). Every loader returns null / [] when the backend is
// off so the mock dashboards keep rendering their localStorage-derived
// numbers unchanged.
import { apiEnabled, apiFetch } from '../api';
import { Payout, RevenueData } from '../types';
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
  if (!apiEnabled) return null;
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
  if (!apiEnabled) return [];
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

export async function loadPayouts(): Promise<Payout[]> {
  if (!apiEnabled) return [];
  const rows = await fetchAll<BackendPayout>('/reports/payouts/');
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
  if (!apiEnabled) return null;
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
