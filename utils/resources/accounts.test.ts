// utils/resources/accounts.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('accounts resource — mock mode', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it('requestPasswordReset resolves without a network call', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { requestPasswordReset } = await import('./accounts');
    await expect(requestPasswordReset('a@b.com')).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('confirmPasswordReset returns ok in mock mode', async () => {
    const { confirmPasswordReset } = await import('./accounts');
    expect(await confirmPasswordReset('u', 't', 'password123')).toEqual({ ok: true });
  });
});

describe('accounts resource — API mode', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_API_URL = 'http://backend.test/api';
  });
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_API_URL;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('requestPasswordReset POSTs the email', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);
    const { requestPasswordReset } = await import('./accounts');
    await requestPasswordReset('a@b.com');
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('http://backend.test/api/auth/password-reset/');
    expect(JSON.parse(opts.body)).toEqual({ email: 'a@b.com' });
  });

  it('confirmPasswordReset succeeds on 2xx and fails otherwise', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 }));
    let mod = await import('./accounts');
    expect(await mod.confirmPasswordReset('u', 't', 'password123')).toEqual({ ok: true });

    vi.resetModules();
    process.env.NEXT_PUBLIC_API_URL = 'http://backend.test/api';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400 }));
    mod = await import('./accounts');
    const bad = await mod.confirmPasswordReset('u', 'bad', 'password123');
    expect(bad.ok).toBe(false);
    expect(bad.error).toBeTruthy();
  });
});
