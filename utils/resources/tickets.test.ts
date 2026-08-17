// utils/resources/tickets.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('tickets resource — mock fallback (API disabled)', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_API_URL;
  });
  afterEach(() => vi.doUnmock('../localStorage'));

  it("loadTickets returns only the current user's tickets", async () => {
    vi.doMock('../localStorage', () => ({
      getItem: (key: string) =>
        key === 'tickets'
          ? [
              { id: 't1', userId: 'u1', userName: 'Mine', subject: 'A', date: '2026-01-01', status: 'open', messages: [] },
              { id: 't2', userId: 'u2', userName: 'Theirs', subject: 'B', date: '2026-01-01', status: 'open', messages: [] },
            ]
          : [],
      addRecord: vi.fn(),
      updateRecord: vi.fn(),
    }));
    const { loadTickets } = await import('./tickets');
    const mine = await loadTickets('u1');
    expect(mine.map((t) => t.id)).toEqual(['t1']);
  });

  it('loadAllTickets returns every ticket regardless of owner', async () => {
    vi.doMock('../localStorage', () => ({
      getItem: (key: string) =>
        key === 'tickets'
          ? [
              { id: 't1', userId: 'u1', userName: 'Mine', subject: 'A', date: '2026-01-01', status: 'open', messages: [] },
              { id: 't2', userId: 'u2', userName: 'Theirs', subject: 'B', date: '2026-01-01', status: 'open', messages: [] },
            ]
          : [],
      addRecord: vi.fn(),
      updateRecord: vi.fn(),
    }));
    const { loadAllTickets } = await import('./tickets');
    const all = await loadAllTickets();
    expect(all.map((t) => t.id)).toEqual(['t1', 't2']);
  });

  it('createTicket writes the ticket and fans out a notification to support/admin', async () => {
    const addRecord = vi.fn();
    vi.doMock('../localStorage', () => ({
      getItem: (key: string) =>
        key === 'users'
          ? [
              { id: 's1', role: 'support' },
              { id: 'a1', role: 'admin' },
              { id: 'u1', role: 'listener' },
            ]
          : [],
      addRecord,
      updateRecord: vi.fn(),
    }));
    const { createTicket } = await import('./tickets');
    const user = { id: 'u1', displayName: 'Alex', email: 'alex@demo.com' } as any;
    const ticket = await createTicket(user, 'Payment issue', 'Charged twice.');

    expect(ticket).toMatchObject({ userId: 'u1', subject: 'Payment issue', status: 'open' });
    expect(addRecord).toHaveBeenCalledWith('tickets', expect.objectContaining({ subject: 'Payment issue' }));
    expect(addRecord).toHaveBeenCalledWith('notifications', expect.objectContaining({ userId: 's1', type: 'support' }));
    expect(addRecord).toHaveBeenCalledWith('notifications', expect.objectContaining({ userId: 'a1', type: 'support' }));
  });

  it('replyToTicket(from: support) marks the ticket answered and notifies the author', async () => {
    const updateRecord = vi.fn();
    const addRecord = vi.fn();
    vi.doMock('../localStorage', () => ({ getItem: () => [], addRecord, updateRecord }));
    const { replyToTicket } = await import('./tickets');
    const ticket = {
      id: 't1', userId: 'u1', userName: 'Alex', subject: 'A', date: '2026-01-01',
      status: 'open' as const, messages: [],
    };

    const updated = await replyToTicket(ticket, 'Try clearing your cache.', 'support');

    expect(updated?.status).toBe('answered');
    expect(updated?.messages).toEqual([{ from: 'support', text: 'Try clearing your cache.', at: expect.any(String) }]);
    expect(updateRecord).toHaveBeenCalledWith('tickets', 't1', expect.objectContaining({ status: 'answered' }));
    expect(addRecord).toHaveBeenCalledWith('notifications', expect.objectContaining({ userId: 'u1', type: 'support' }));
  });

  it('replyToTicket(from: user) reopens a closed ticket without notifying anyone', async () => {
    const updateRecord = vi.fn();
    const addRecord = vi.fn();
    vi.doMock('../localStorage', () => ({ getItem: () => [], addRecord, updateRecord }));
    const { replyToTicket } = await import('./tickets');
    const ticket = {
      id: 't1', userId: 'u1', userName: 'Alex', subject: 'A', date: '2026-01-01',
      status: 'closed' as const, messages: [],
    };

    const updated = await replyToTicket(ticket, 'Still broken.', 'user');

    expect(updated?.status).toBe('open');
    expect(addRecord).not.toHaveBeenCalled();
  });

  it('closeTicket updates the mock store', async () => {
    const updateRecord = vi.fn();
    vi.doMock('../localStorage', () => ({ getItem: () => [], addRecord: vi.fn(), updateRecord }));
    const { closeTicket } = await import('./tickets');
    const ticket = {
      id: 't1', userId: 'u1', userName: 'Alex', subject: 'A', date: '2026-01-01',
      status: 'answered' as const, messages: [],
    };

    const updated = await closeTicket(ticket);
    expect(updated?.status).toBe('closed');
    expect(updateRecord).toHaveBeenCalledWith('tickets', 't1', { status: 'closed' });
  });
});

describe('tickets resource — API mode', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_API_URL = 'http://backend.test/api';
  });
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_API_URL;
    vi.restoreAllMocks();
  });

  it('createTicket POSTs { subject, body } and maps the detail response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        id: 'srv1',
        author: { id: 'u1', displayName: 'Alex', role: 'listener' },
        subject: 'Payment issue',
        status: 'open',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        messages: [
          { id: 'm1', author: { id: 'u1', displayName: 'Alex', role: 'listener' }, body: 'Charged twice.', createdAt: '2026-01-01T00:00:00Z' },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { createTicket } = await import('./tickets');
    const user = { id: 'u1' } as any;
    const ticket = await createTicket(user, 'Payment issue', 'Charged twice.');

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('http://backend.test/api/tickets/');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ subject: 'Payment issue', body: 'Charged twice.' });
    expect(ticket).toMatchObject({ id: 'srv1', userId: 'u1', userName: 'Alex' });
    expect(ticket?.messages).toEqual([{ from: 'user', text: 'Charged twice.', at: '2026-01-01T00:00:00Z' }]);
  });

  it('replyToTicket posts to the messages endpoint and appends the mapped message', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        id: 'm2',
        author: { id: 's1', displayName: 'Support', role: 'support' },
        body: 'Try clearing your cache.',
        createdAt: '2026-01-02T00:00:00Z',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { replyToTicket } = await import('./tickets');
    const ticket = {
      id: 't1', userId: 'u1', userName: 'Alex', subject: 'A', date: '2026-01-01',
      status: 'open' as const, messages: [],
    };

    const updated = await replyToTicket(ticket, 'Try clearing your cache.', 'support');

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('http://backend.test/api/tickets/t1/messages/');
    expect(JSON.parse(opts.body)).toEqual({ body: 'Try clearing your cache.' });
    expect(updated).toMatchObject({ status: 'answered' });
    expect(updated?.messages).toEqual([{ from: 'support', text: 'Try clearing your cache.', at: '2026-01-02T00:00:00Z' }]);
  });

  it('closeTicket PATCHes { status: "closed" } and maps the detail response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: 't1',
        author: { id: 'u1', displayName: 'Alex', role: 'listener' },
        subject: 'A',
        status: 'closed',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-02T00:00:00Z',
        messages: [],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { closeTicket } = await import('./tickets');
    const ticket = {
      id: 't1', userId: 'u1', userName: 'Alex', subject: 'A', date: '2026-01-01',
      status: 'answered' as const, messages: [],
    };

    const updated = await closeTicket(ticket);

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('http://backend.test/api/tickets/t1/');
    expect(opts.method).toBe('PATCH');
    expect(JSON.parse(opts.body)).toEqual({ status: 'closed' });
    expect(updated?.status).toBe('closed');
  });

  it('loadTicketDetail derives from/support by comparing message author to the ticket author', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: 't1',
        author: { id: 'u1', displayName: 'Alex', role: 'listener' },
        subject: 'A',
        status: 'answered',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        messages: [
          { id: 'm1', author: { id: 'u1', displayName: 'Alex', role: 'listener' }, body: 'Help please.', createdAt: '2026-01-01T00:00:00Z' },
          { id: 'm2', author: { id: 's1', displayName: 'Support', role: 'support' }, body: 'On it.', createdAt: '2026-01-01T01:00:00Z' },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { loadTicketDetail } = await import('./tickets');
    const detail = await loadTicketDetail('t1');
    expect(detail?.messages).toEqual([
      { from: 'user', text: 'Help please.', at: '2026-01-01T00:00:00Z' },
      { from: 'support', text: 'On it.', at: '2026-01-01T01:00:00Z' },
    ]);
  });
});
