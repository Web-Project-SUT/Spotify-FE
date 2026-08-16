// utils/resources/streams.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('streams resource — API disabled', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_API_URL;
  });
  afterEach(() => vi.restoreAllMocks());

  it('recordStream is a no-op that never touches the network', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { recordStream } = await import('./streams');
    expect(await recordStream('t1')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('streams resource — API mode', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_API_URL = 'http://backend.test/api';
  });
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_API_URL;
    vi.restoreAllMocks();
  });

  it('posts the track and the playlist it was played from', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 201, json: async () => ({ id: 'e1' }) });
    vi.stubGlobal('fetch', fetchMock);

    const { recordStream } = await import('./streams');
    expect(await recordStream('t1', 'pl1')).toBeNull();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://backend.test/api/streams/');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ track: 't1', playlist: 'pl1' });
  });

  it('sends a null playlist when the track was not played from one', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 201, json: async () => ({ id: 'e1' }) });
    vi.stubGlobal('fetch', fetchMock);

    const { recordStream } = await import('./streams');
    await recordStream('t1');

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ track: 't1', playlist: null });
  });

  it('returns the quota error instead of swallowing it', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({
          detail: 'Limit of 60 reached for your subscription tier.',
          code: 'daily_stream_quota_exceeded',
        }),
      })
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { recordStream, DAILY_STREAM_QUOTA_CODE } = await import('./streams');
    const error = await recordStream('t1');

    expect(error?.status).toBe(403);
    expect(error?.code).toBe(DAILY_STREAM_QUOTA_CODE);
  });
});
