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

// The normalized error body every backend view produces
// (apps.common.exceptions.api_exception_handler), plus the status that
// carried it. `status: 0` means the request never reached the server.
export interface ApiError {
  status: number;
  detail: string;
  code?: string;
  fields?: Record<string, string[]>;
}

export interface ApiResult<T> {
  data: T | null;
  error: ApiError | null;
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

export function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// Exposed so the multipart upload path (which can't go through the JSON
// apiFetch) can read the current access token and the API base URL.
export function getAccessToken(): string | null {
  return getItem('accessToken');
}

export const API_BASE_URL = API_URL;

// The full-fidelity request. Callers that need to tell "the backend is
// switched off" apart from "the backend said no" use this; `apiFetch` below
// is the thin `T | null` wrapper the rest of the app already speaks.
//
// The distinction matters: collapsing both into `null` is what made every
// server-side rejection look like mock mode and silently reroute writes into
// localStorage. `{ data: null, error: null }` means disabled; a non-null
// `error` means the server rejected us and the caller must not fall back.
export async function apiRequest<T = unknown>(
  path: string,
  { method = 'GET', body, auth = true }: ApiFetchOptions = {}
): Promise<ApiResult<T>> {
  if (!apiEnabled) return { data: null, error: null };

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
      if (!token) {
        return { data: null, error: failure(method, path, 401, 'Not authenticated.') };
      }
      response = await request(token);
    }

    if (!response.ok) {
      return { data: null, error: await readError(method, path, response) };
    }
    if (response.status === 204) return { data: null, error: null };
    return { data: (await response.json()) as T, error: null };
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : 'Network request failed.';
    return { data: null, error: failure(method, path, 0, detail) };
  }
}

// Parse the backend's { detail, code, fields } body and log it. Without this
// a 400 is invisible: no throw, no console entry, just a null return.
async function readError(method: string, path: string, response: Response): Promise<ApiError> {
  let parsed: Partial<ApiError> = {};
  try {
    parsed = (await response.json()) as Partial<ApiError>;
  } catch {
    // Not JSON (a proxy error page, an empty body) — the status is all we get.
  }
  return failure(method, path, response.status, parsed.detail || response.statusText, parsed);
}

function failure(
  method: string,
  path: string,
  status: number,
  detail: string,
  extra: Partial<ApiError> = {}
): ApiError {
  const error: ApiError = {
    status,
    detail: detail || 'Request failed.',
    code: extra.code,
    fields: extra.fields,
  };
  console.error(`[api] ${method} ${path} -> ${status || 'network error'}`, error);
  return error;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T | null> {
  const { data } = await apiRequest<T>(path, options);
  return data;
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
