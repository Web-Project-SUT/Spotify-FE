// utils/resources/uploads.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const fakeFile = () => new File(['x'], 'a.png', { type: 'image/png' });

describe('uploads resource — API disabled', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it('is a no-op that returns false when the backend is off', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { uploadAvatar } = await import('./uploads');
    expect(await uploadAvatar(fakeFile())).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe('uploads resource — API mode', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_API_URL = 'http://backend.test/api';
    // token accessor reads localStorage via getItem; stub it.
    vi.doMock('../localStorage', () => ({
      getItem: (key: string) => (key === 'accessToken' ? 'tok123' : null),
      setItem: vi.fn(),
    }));
  });
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_API_URL;
    vi.doUnmock('../localStorage');
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('PUTs multipart with the avatar field and bearer token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    const { uploadAvatar } = await import('./uploads');

    const ok = await uploadAvatar(fakeFile());
    expect(ok).toBe(true);

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('http://backend.test/api/auth/me/avatar/');
    expect(opts.method).toBe('PUT');
    expect(opts.headers.Authorization).toBe('Bearer tok123');
    expect(opts.body).toBeInstanceOf(FormData);
    expect((opts.body as FormData).get('avatar')).toBeInstanceOf(File);
    // Never set Content-Type by hand — the browser adds the boundary.
    expect(opts.headers['Content-Type']).toBeUndefined();
  });

  it('sends audioHigh/audioLow fields for track audio', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    const { uploadTrackAudio } = await import('./uploads');

    await uploadTrackAudio('t1', { high: fakeFile(), low: fakeFile() });
    const form = fetchMock.mock.calls[0][1].body as FormData;
    expect(form.get('audioHigh')).toBeInstanceOf(File);
    expect(form.get('audioLow')).toBeInstanceOf(File);
    expect(fetchMock.mock.calls[0][0]).toBe('http://backend.test/api/tracks/t1/audio/');
  });
});
