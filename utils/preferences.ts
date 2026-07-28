// utils/preferences.ts
// Single owner of the `userPrefs` localStorage key. Namespaced per user
// (mirroring `listeningStats`/`listeningHistory`) so settings don't leak
// between accounts on a shared device; a logged-out session uses the
// `__anon__` bucket so e.g. the login page can still render in Persian.
//
// Load-bearing constraint: Player.test.tsx, AuthContext.test.tsx, and
// LanguageContext.test.tsx mock '../utils/localStorage' with an exhaustive
// module factory ({ getItem: vi.fn(), setItem: vi.fn() }), so this module
// must import ONLY getItem/setItem from localStorage.ts — anything else
// resolves to undefined inside those tests.
import { getItem, setItem } from './localStorage';
import { apiFetch, apiEnabled } from './api';
import type { Language } from './i18n';

export type RepeatMode = 'off' | 'all' | 'one';
export type PlaybackQuality = 'high' | 'low';

export interface Preferences {
  language: Language;
  notifLimit: boolean;
  volume: number; // 0-100 integer
  repeatMode: RepeatMode;
  shuffle: boolean;
  playbackQuality: PlaybackQuality;
}

// Backend model defaults are the single source of truth (see
// apps/accounts/models.py UserPreferences); the FE previously had its own
// (different) defaults, which visibly flipped on first sync after login.
export const DEFAULT_PREFERENCES: Preferences = {
  language: 'en',
  notifLimit: false,
  volume: 80,
  repeatMode: 'off',
  shuffle: false,
  playbackQuality: 'high',
};

type PreferenceBuckets = Record<string, Partial<Preferences>>;

function bucketKey(): string {
  return getItem('currentUser')?.id ?? '__anon__';
}

function readBuckets(): PreferenceBuckets {
  const raw = getItem('userPrefs');
  if (!raw) return {};
  // Legacy shim: pre-namespacing storage was one flat object at the
  // top level (`{ language, volume, ... }`) rather than keyed by user id.
  if ('language' in raw) {
    return { [bucketKey()]: raw as Partial<Preferences> };
  }
  return raw as PreferenceBuckets;
}

function writeBuckets(buckets: PreferenceBuckets): void {
  setItem('userPrefs', buckets);
  // Native 'storage' never fires in the tab that made the change; this repo's
  // established same-tab sync trick (see Player/LanguageContext).
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new StorageEvent('storage', { key: 'userPrefs' }));
  }
}

function clampVolume(volume: number): number {
  return Math.min(100, Math.max(0, Math.round(volume)));
}

function normalize(patch: Partial<Preferences>): Partial<Preferences> {
  if (patch.volume === undefined) return patch;
  return { ...patch, volume: clampVolume(patch.volume) };
}

export function readPreferences(): Preferences {
  const bucket = readBuckets()[bucketKey()];
  return { ...DEFAULT_PREFERENCES, ...bucket };
}

export function clearPreferencesBucket(userId: string): void {
  const buckets = readBuckets();
  if (!(userId in buckets)) return;
  const rest = { ...buckets };
  delete rest[userId];
  writeBuckets(rest);
}

function toWireBody(patch: Partial<Preferences>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  (Object.keys(patch) as (keyof Preferences)[]).forEach((field) => {
    if (patch[field] !== undefined) body[field] = patch[field];
  });
  return body;
}

function queueOfflinePatch(patch: Partial<Preferences>): void {
  const pending = getItem('pendingPrefsPatch') || {};
  setItem('pendingPrefsPatch', { ...pending, ...patch });
}

async function sendPatch(patch: Partial<Preferences>): Promise<void> {
  if (!apiEnabled || Object.keys(patch).length === 0) return;
  const result = await apiFetch('/auth/me/preferences/', {
    method: 'PATCH',
    body: toWireBody(patch),
  });
  if (result === null) queueOfflinePatch(patch);
}

// Debounced so a slider drag (an onChange per pixel) doesn't fire a PATCH
// per pixel — local write + storage dispatch stay immediate, only the
// network write waits and merges.
const DEBOUNCE_MS = 400;
let debounceHandle: ReturnType<typeof setTimeout> | null = null;
let pendingNetworkPatch: Partial<Preferences> = {};

function scheduleNetworkWrite(patch: Partial<Preferences>): void {
  pendingNetworkPatch = { ...pendingNetworkPatch, ...patch };
  if (debounceHandle) clearTimeout(debounceHandle);
  debounceHandle = setTimeout(() => {
    const toSend = pendingNetworkPatch;
    pendingNetworkPatch = {};
    debounceHandle = null;
    void sendPatch(toSend);
  }, DEBOUNCE_MS);
}

export function writePreferences(patch: Partial<Preferences>): void {
  const normalized = normalize(patch);
  const key = bucketKey();
  const buckets = readBuckets();
  buckets[key] = { ...DEFAULT_PREFERENCES, ...buckets[key], ...normalized };
  writeBuckets(buckets);
  scheduleNetworkWrite(normalized);
}

// Server wins wholesale on hydrate (login response / an explicit pull),
// then any patch that failed to reach the server while offline is
// re-applied on top and re-sent — see pendingPrefsPatch above.
export function hydratePreferences(serverPrefs: Partial<Preferences> | null | undefined): void {
  if (!serverPrefs) return;
  const key = bucketKey();
  const buckets = readBuckets();
  buckets[key] = { ...DEFAULT_PREFERENCES, ...serverPrefs };
  writeBuckets(buckets);

  const pending: Partial<Preferences> | null = getItem('pendingPrefsPatch');
  if (pending && Object.keys(pending).length > 0) {
    setItem('pendingPrefsPatch', {});
    writePreferences(pending);
  }
}

export async function pullPreferences(): Promise<void> {
  if (!apiEnabled) return;
  const result = await apiFetch<Partial<Preferences>>('/auth/me/preferences/');
  if (result) hydratePreferences(result);
}

export async function flushPending(): Promise<void> {
  if (!apiEnabled) return;
  const pending: Partial<Preferences> | null = getItem('pendingPrefsPatch');
  if (!pending || Object.keys(pending).length === 0) return;
  const result = await apiFetch('/auth/me/preferences/', {
    method: 'PATCH',
    body: toWireBody(pending),
  });
  if (result !== null) setItem('pendingPrefsPatch', {});
}
