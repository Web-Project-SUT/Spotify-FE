// utils/resources/tickets.ts
//
// Support-ticket integration seam. The backend owns the ticket thread
// (Ticket + TicketMessage, apps/tickets) so a ticket filed by one user is
// visible to support/admin from a different browser — the whole point of
// C-3. Every function mirrors mock-mode behaviour into localStorage so the
// offline demo and existing tests keep working unchanged.
import { apiFetch, apiEnabled } from '../api';
import { getItem, addRecord, updateRecord } from '../localStorage';
import { Ticket, TicketMessage, User } from '../types';
import { fetchAll } from './http';

interface BackendTicketAuthor {
  id: string;
  displayName: string;
  role: string;
}

interface BackendTicketMessage {
  id: string;
  author: BackendTicketAuthor;
  body: string;
  createdAt: string;
}

interface BackendTicketListItem {
  id: string;
  author: BackendTicketAuthor;
  subject: string;
  status: Ticket['status'];
  createdAt: string;
  updatedAt: string;
}

interface BackendTicketDetail extends BackendTicketListItem {
  messages: BackendTicketMessage[];
}

function mapListItem(t: BackendTicketListItem): Ticket {
  return {
    id: t.id,
    userId: t.author.id,
    userName: t.author.displayName,
    subject: t.subject,
    date: t.createdAt.slice(0, 10),
    status: t.status,
    messages: [],
  };
}

function mapDetail(t: BackendTicketDetail): Ticket {
  return {
    ...mapListItem(t),
    messages: t.messages.map((m) => ({
      from: m.author.id === t.author.id ? 'user' : 'support',
      text: m.body,
      at: m.createdAt,
    })),
  };
}

// The signed-in user's own tickets.
export async function loadTickets(userId: string | undefined): Promise<Ticket[]> {
  if (!apiEnabled) {
    const all: Ticket[] = getItem('tickets') || [];
    return userId ? all.filter((t) => t.userId === userId) : [];
  }
  const items = await fetchAll<BackendTicketListItem>('/tickets/');
  return items.map(mapListItem);
}

// Every ticket — for the support/admin dashboard, which is already
// role-gated at the route level (ProtectedRoute). In API mode this hits the
// same endpoint as loadTickets: the backend queryset widens automatically
// for support/admin requesters (apps/tickets/views.py).
export async function loadAllTickets(): Promise<Ticket[]> {
  if (!apiEnabled) return getItem('tickets') || [];
  const items = await fetchAll<BackendTicketListItem>('/tickets/');
  return items.map(mapListItem);
}

// List rows carry no messages (the backend keeps that endpoint cheap);
// opening a ticket fetches the full thread.
export async function loadTicketDetail(id: string): Promise<Ticket | null> {
  if (!apiEnabled) {
    const all: Ticket[] = getItem('tickets') || [];
    return all.find((t) => t.id === id) || null;
  }
  const detail = await apiFetch<BackendTicketDetail>(`/tickets/${id}/`);
  return detail ? mapDetail(detail) : null;
}

export async function createTicket(
  currentUser: User,
  subject: string,
  body: string
): Promise<Ticket | null> {
  if (apiEnabled) {
    const created = await apiFetch<BackendTicketDetail>('/tickets/', {
      method: 'POST',
      body: { subject, body },
    });
    return created ? mapDetail(created) : null;
  }
  const userName = currentUser.displayName || currentUser.stageName || currentUser.email;
  const ticket: Ticket = {
    id: `T-${Date.now()}`,
    userId: currentUser.id,
    userName,
    subject,
    date: new Date().toISOString().slice(0, 10),
    status: 'open',
    messages: [{ from: 'user', text: body, at: new Date().toISOString() }],
  };
  addRecord('tickets', ticket);
  const recipients: User[] = (getItem('users') || []).filter(
    (u: User) => u.role === 'support' || u.role === 'admin'
  );
  recipients.forEach((recipient) => {
    addRecord('notifications', {
      id: `n-${Date.now()}-${recipient.id}`,
      userId: recipient.id,
      title: 'New support ticket',
      message: `${userName} submitted: ${subject}`,
      type: 'support',
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  });
  return ticket;
}

// Appends a message and returns the updated ticket (status transitions —
// open -> answered on a support reply, closed -> open on any reply — are
// applied the same way in both modes). `from` is known client-side (the
// caller is either the ticket's own author or a support/admin agent), so
// there is no need to infer it from the backend response.
export async function replyToTicket(
  ticket: Ticket,
  body: string,
  from: 'user' | 'support'
): Promise<Ticket | null> {
  const status: Ticket['status'] =
    from === 'support' ? 'answered' : ticket.status === 'closed' ? 'open' : ticket.status;

  if (apiEnabled) {
    const message = await apiFetch<BackendTicketMessage>(`/tickets/${ticket.id}/messages/`, {
      method: 'POST',
      body: { body },
    });
    if (!message) return null;
    const newMessage: TicketMessage = { from, text: message.body, at: message.createdAt };
    return { ...ticket, status, messages: [...ticket.messages, newMessage] };
  }

  const newMessage: TicketMessage = { from, text: body, at: new Date().toISOString() };
  const messages = [...ticket.messages, newMessage];
  updateRecord('tickets', ticket.id, { status, messages });
  if (from === 'support') {
    addRecord('notifications', {
      id: `n-${Date.now()}`,
      userId: ticket.userId,
      title: 'Support replied to your ticket',
      message: `Re: ${ticket.subject}`,
      type: 'support',
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  }
  return { ...ticket, status, messages };
}

export async function closeTicket(ticket: Ticket): Promise<Ticket | null> {
  if (apiEnabled) {
    const updated = await apiFetch<BackendTicketDetail>(`/tickets/${ticket.id}/`, {
      method: 'PATCH',
      body: { status: 'closed' },
    });
    return updated ? mapDetail(updated) : null;
  }
  updateRecord('tickets', ticket.id, { status: 'closed' });
  return { ...ticket, status: 'closed' };
}
