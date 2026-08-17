// utils/resources/groupSocket.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

class FakeWebSocket {
  static OPEN = 1;
  static instances: FakeWebSocket[] = [];
  url: string;
  readyState = 1;
  onmessage: ((e: { data: string }) => void) | null = null;
  sent: string[] = [];
  closed = false;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    this.closed = true;
  }
}

describe('groupSocket', () => {
  beforeEach(() => {
    vi.resetModules();
    FakeWebSocket.instances = [];
  });
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_API_URL;
    vi.unstubAllGlobals();
    vi.doUnmock('../localStorage');
  });

  it('returns null when the backend is disabled', async () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    const { openGroupSocket } = await import('./groupSocket');
    expect(openGroupSocket('room1', () => {})).toBeNull();
  });

  it('connects to ws/session/<id>/ with the access token as a query param', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://backend.test/api';
    vi.doMock('../localStorage', () => ({
      getItem: (k: string) => (k === 'accessToken' ? 'tok123' : null),
    }));
    vi.stubGlobal('WebSocket', FakeWebSocket as any);

    const { openGroupSocket } = await import('./groupSocket');
    const socket = openGroupSocket('room1', () => {});

    expect(socket).not.toBeNull();
    expect(FakeWebSocket.instances[0].url).toBe(
      'ws://backend.test/ws/session/room1/?token=tok123'
    );
  });

  it('omits the query string when there is no access token', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://backend.test/api';
    vi.doMock('../localStorage', () => ({ getItem: () => null }));
    vi.stubGlobal('WebSocket', FakeWebSocket as any);

    const { openGroupSocket } = await import('./groupSocket');
    openGroupSocket('room1', () => {});

    expect(FakeWebSocket.instances[0].url).toBe('ws://backend.test/ws/session/room1/');
  });

  it('forwards inbound events, including trackId, to the callback', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://backend.test/api';
    vi.doMock('../localStorage', () => ({ getItem: () => null }));
    vi.stubGlobal('WebSocket', FakeWebSocket as any);

    const { openGroupSocket } = await import('./groupSocket');
    const received: any[] = [];
    openGroupSocket('room1', (e) => received.push(e));

    FakeWebSocket.instances[0].onmessage?.({
      data: JSON.stringify({ action: 'play', progress: 30, trackId: 't9' }),
    });

    expect(received).toEqual([{ action: 'play', progress: 30, trackId: 't9' }]);
  });

  it('send() writes the trackId through to the wire', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://backend.test/api';
    vi.doMock('../localStorage', () => ({ getItem: () => null }));
    vi.stubGlobal('WebSocket', FakeWebSocket as any);

    const { openGroupSocket } = await import('./groupSocket');
    const socket = openGroupSocket('room1', () => {});
    socket?.send({ action: 'play', progress: 0, trackId: 't9' });

    expect(FakeWebSocket.instances[0].sent).toEqual([
      JSON.stringify({ action: 'play', progress: 0, trackId: 't9' }),
    ]);
  });

  it('close() closes the underlying socket', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://backend.test/api';
    vi.doMock('../localStorage', () => ({ getItem: () => null }));
    vi.stubGlobal('WebSocket', FakeWebSocket as any);

    const { openGroupSocket } = await import('./groupSocket');
    const socket = openGroupSocket('room1', () => {});
    socket?.close();

    expect(FakeWebSocket.instances[0].closed).toBe(true);
  });
});
