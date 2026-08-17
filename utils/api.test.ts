// utils/api.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const store: Record<string, unknown> = {};

vi.mock('./localStorage', () => ({
  getItem: vi.fn((key: string) => (key in store ? store[key] : null)),
  setItem: vi.fn((key: string, value: unknown) => {
    store[key] = value;
  }),
}));

const ORIGINAL_ENV = process.env.NEXT_PUBLIC_API_URL;

async function loadApi(envUrl: string | undefined) {
  vi.resetModules();
  if (envUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL;
  else process.env.NEXT_PUBLIC_API_URL = envUrl;
  return import('./api');
}

describe('utils/api', () => {
  beforeEach(() => {
    Object.keys(store).forEach((key) => delete store[key]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (ORIGINAL_ENV === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = ORIGINAL_ENV;
  });

  it('is disabled and never touches fetch when the env var is unset', async () => {
    const { apiEnabled, apiFetch } = await loadApi(undefined);
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    expect(apiEnabled).toBe(false);
    const result = await apiFetch('/whatever/');

    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('apiRequest reports a rejection distinctly from a disabled backend', async () => {
    // The whole point of apiRequest: "the backend said no" must not look like
    // "there is no backend", or callers silently fall back to the mock store.
    const { apiRequest } = await loadApi('http://backend.test/api');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          detail: 'Validation failed.',
          code: 'invalid_choice',
          fields: { releaseType: ['"album" is not a valid choice.'] },
        }),
      })
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { data, error } = await apiRequest('/tracks/', { method: 'POST', body: {} });

    expect(data).toBeNull();
    expect(error).toMatchObject({
      status: 400,
      detail: 'Validation failed.',
      code: 'invalid_choice',
      fields: { releaseType: ['"album" is not a valid choice.'] },
    });
    expect(console.error).toHaveBeenCalled();
  });

  it('apiRequest returns neither data nor error when the backend is disabled', async () => {
    const { apiRequest } = await loadApi(undefined);
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    expect(await apiRequest('/tracks/')).toEqual({ data: null, error: null });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('treats an empty success body as success, not as a parse failure', async () => {
    const { apiRequest } = await loadApi('http://api.test');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => {
          throw new SyntaxError('Unexpected end of JSON input');
        },
      })
    );

    // POST /users/{id}/follow/ answers 201 with no body.
    expect(await apiRequest('/users/u2/follow/', { method: 'POST' })).toEqual({ data: null, error: null });
  });

  it('attaches Authorization: Bearer <token> when an access token is stored', async () => {
    const { apiFetch } = await loadApi('http://api.test');
    store.accessToken = 'access-123';
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    await apiFetch('/me/');

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://api.test/me/',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer access-123' }),
      })
    );
  });

  it('refreshes once on a 401 and retries the original request', async () => {
    const { apiFetch } = await loadApi('http://api.test');
    store.accessToken = 'stale';
    store.refreshToken = 'refresh-1';

    let meCallCount = 0;
    const fetchSpy = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith('/auth/refresh/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ access: 'fresh', refresh: 'refresh-2' }),
        });
      }
      meCallCount += 1;
      if (meCallCount === 1) {
        return Promise.resolve({ ok: false, status: 401, json: async () => ({}) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ id: 1 }) });
    });
    vi.stubGlobal('fetch', fetchSpy);

    const result = await apiFetch('/me/');

    expect(result).toEqual({ id: 1 });
    expect(store.accessToken).toBe('fresh');
    expect(store.refreshToken).toBe('refresh-2');
    expect(meCallCount).toBe(2);
  });

  it('two concurrent 401s share a single refresh call', async () => {
    const { apiFetch } = await loadApi('http://api.test');
    store.accessToken = 'stale';
    store.refreshToken = 'refresh-1';

    let refreshCalls = 0;
    let meCallCount = 0;
    const fetchSpy = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith('/auth/refresh/')) {
        refreshCalls += 1;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ access: 'fresh', refresh: 'refresh-2' }),
        });
      }
      meCallCount += 1;
      // First two calls are the concurrent requests using the stale token;
      // any further call is a post-refresh retry.
      if (meCallCount <= 2) {
        return Promise.resolve({ ok: false, status: 401, json: async () => ({}) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true }) });
    });
    vi.stubGlobal('fetch', fetchSpy);

    const [a, b] = await Promise.all([apiFetch('/a/'), apiFetch('/b/')]);

    expect(refreshCalls).toBe(1);
    expect(a).toEqual({ ok: true });
    expect(b).toEqual({ ok: true });
  });
});
