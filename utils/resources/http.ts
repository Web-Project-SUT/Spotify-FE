// utils/resources/http.ts
//
// Small helpers shared by every resource module. They sit on top of the
// thin `apiFetch` wrapper in utils/api.ts and add the two things every
// catalog-style endpoint needs: walking DRF's paginated envelope, and
// turning the backend's relative media paths into absolute URLs the
// browser can actually load.
//
// Everything here is a no-op when the backend is disabled (no
// NEXT_PUBLIC_API_URL): callers get null / [] and fall back to the mock
// localStorage layer, exactly like the rest of the app.
import { apiFetch, apiEnabled } from '../api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

// MEDIA is served from the site root ("/media/..."), not under "/api", so
// strip a trailing "/api" to get the origin the media lives on.
const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Resolve a media reference from the backend into something loadable.
// - null/empty  -> undefined (let the UI show its emoji/placeholder)
// - absolute    -> used as-is
// - relative    -> joined onto the API origin
export function mediaUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value) || value.startsWith('data:')) return value;
  const path = value.startsWith('/') ? value : `/${value}`;
  return `${API_ORIGIN}${path}`;
}

// Follow DRF's `next` links and concatenate every page's `results`. Guarded
// so one failed page degrades to whatever was collected so far rather than
// throwing. `firstPath` is an app-relative path like "/albums/".
export async function fetchAll<T>(firstPath: string): Promise<T[]> {
  if (!apiEnabled) return [];
  const collected: T[] = [];
  let path: string | null = firstPath;
  // Bound the walk so a misbehaving backend can't spin forever.
  for (let page = 0; path && page < 50; page += 1) {
    const data: Paginated<T> | T[] | null = await apiFetch<Paginated<T> | T[]>(path);
    if (!data) break;
    if (Array.isArray(data)) {
      collected.push(...data);
      break;
    }
    collected.push(...(data.results || []));
    // `next` is an absolute URL; reduce it back to an app-relative path so
    // apiFetch re-prepends API_URL consistently.
    path = data.next ? data.next.replace(API_URL, '') : null;
  }
  return collected;
}
