// utils/api.ts
// Thin fetch wrapper for the real Django backend, gated behind a build-time
// env var so the mock-only app (and all existing tests, which never set the
// var) never touches the network. See CLAUDE.md for the honest limitation
// around storing tokens in localStorage (XSS-readable; httpOnly cookies
// would be the upgrade path) — kept consistent with the rest of this app's
// localStorage-backed persistence rather than introducing a second storage
// mechanism for just these two values.
import { getItem, setItem } from './localStorage';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const apiEnabled = Boolean(API_URL);

interface ApiFetchOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
}

async function doRefresh(): Promise<string | null> {
  const refresh = getItem('refreshToken');
  if (!refresh) return null;
  try {
    const response = await fetch(`${API_URL}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (!response.ok) {
      setItem('accessToken', null);
      setItem('refreshToken', null);
      return null;
    }
    const data = await response.json();
    setItem('accessToken', data.access);
    // SIMPLE_JWT rotates + blacklists refresh tokens, so the old one is now
    // dead. Store the rotated one or the *next* refresh silently 401s.
    if (data.refresh) setItem('refreshToken', data.refresh);
    return data.access as string;
  } catch {
    return null;
  }
}

// Module-level so concurrent 401s share one in-flight refresh instead of
// each presenting the (now-blacklisted-by-the-first) refresh token.
let refreshPromise: Promise<string | null> | null = null;

function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function apiFetch<T = unknown>(
  path: string,
  { method = 'GET', body, auth = true }: ApiFetchOptions = {}
): Promise<T | null> {
  if (!apiEnabled) return null;

  const request = (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (auth && token) headers.Authorization = `Bearer ${token}`;
    return fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  try {
    let response = await request(auth ? getItem('accessToken') : null);

    if (response.status === 401 && auth) {
      const token = await refreshAccessToken();
      if (!token) return null;
      response = await request(token);
    }

    if (!response.ok) return null;
    if (response.status === 204) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

// A live refresh token surviving logout is a real session left standing;
// blacklist it server-side rather than just dropping it client-side.
export async function apiLogout(): Promise<void> {
  if (!apiEnabled) return;
  const refresh = getItem('refreshToken');
  if (!refresh) return;
  await apiFetch('/auth/logout/', { method: 'POST', body: { refresh } });
}

export function storeTokens(access: string, refresh: string): void {
  setItem('accessToken', access);
  setItem('refreshToken', refresh);
}

export function clearTokens(): void {
  setItem('accessToken', null);
  setItem('refreshToken', null);
}
