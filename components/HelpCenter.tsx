// components/HelpCenter.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { getItem, addRecord, updateRecord } from '../utils/localStorage';
import { getCurrentUser } from '../utils/auth';
import { Ticket, User } from '../utils/types';
import { Badge, Button, EmptyState, Input } from './ui';

export default function HelpCenter() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [openTicket, setOpenTicket] = useState<Ticket | null>(null);
  const [reply, setReply] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const currentUser = getCurrentUser();

  useEffect(() => {
    if (!currentUser) return;
    const all: Ticket[] = getItem('tickets') || [];
    setTickets(all.filter((t) => t.userId === currentUser.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitTicket = () => {
    if (!currentUser || !subject.trim() || !message.trim()) return;
    const userName = currentUser.displayName || currentUser.stageName || currentUser.email;
    const newTicket: Ticket = {
      id: `T-${Date.now()}`,
      userId: currentUser.id,
      userName,
      subject: subject.trim(),
      date: new Date().toISOString().slice(0, 10),
      status: 'open',
      messages: [{ from: 'user', text: message.trim(), at: new Date().toISOString() }],
    };
    addRecord('tickets', newTicket);

    const recipients: User[] = (getItem('users') || []).filter(
      (u: User) => u.role === 'support' || u.role === 'admin'
    );
    recipients.forEach((recipient) => {
      addRecord('notifications', {
        id: `n-${Date.now()}-${recipient.id}`,
        userId: recipient.id,
        title: 'New support ticket',
        message: `${userName} submitted: ${newTicket.subject}`,
        type: 'support',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    });

    setTickets((prev) => [...prev, newTicket]);
    setSubject('');
    setMessage('');
  };

  const sendFollowUp = () => {
    if (!openTicket || !reply.trim()) return;
    const updated: Ticket = {
      ...openTicket,
      status: 'open',
      messages: [
        ...openTicket.messages,
        { from: 'user', text: reply.trim(), at: new Date().toISOString() },
      ],
    };
    updateRecord('tickets', updated.id, { status: updated.status, messages: updated.messages });
    setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setOpenTicket(updated);
    setReply('');
  };

  if (!currentUser) return null;

  const badgeTone = (status: Ticket['status']) =>
    status === 'open' ? 'info' : status === 'answered' ? 'success' : 'neutral';

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Help</h1>

      {openTicket ? (
        <div className="max-w-xl">
          <button
            onClick={() => setOpenTicket(null)}
            className="text-muted text-sm mb-4 hover:text-white"
          >
            ← Back to tickets
          </button>
          <h2 className="text-lg font-bold mb-1">{openTicket.subject}</h2>
          <p className="text-muted text-sm mb-4">
            {openTicket.id} · <Badge tone={badgeTone(openTicket.status)}>{openTicket.status}</Badge>
          </p>
          <div className="space-y-2 mb-4">
            {openTicket.messages.map((m, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg max-w-[80%] ${m.from === 'user' ? 'bg-accent/20 ml-auto' : 'bg-surface-3'}`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-xs text-muted">{m.from === 'user' ? 'You' : 'Support'}</p>
                  <p className="text-xs text-muted">{new Date(m.at).toLocaleString()}</p>
                </div>
                <p className="text-sm">{m.text}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2 items-start">
            <div className="flex-1">
              <Input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Type a message…"
              />
            </div>
            <Button onClick={sendFollowUp}>Send</Button>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-surface border border-border rounded-xl p-6 mb-8 max-w-xl">
            <h2 className="text-lg font-bold mb-4">New ticket</h2>
            <div className="mb-3">
              <Input
                label="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="What do you need help with?"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-bold mb-1 text-white">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue…"
                className="w-full bg-surface-2 border border-border rounded px-3 py-2 min-h-24 placeholder-muted focus:outline-none focus:border-white transition-colors"
              />
            </div>
            <Button onClick={submitTicket} disabled={!subject.trim() || !message.trim()}>
              Submit ticket
            </Button>
          </div>

          {tickets.length === 0 ? (
            <EmptyState icon="🎧" title="No tickets yet" description="Submit a ticket above and we'll get back to you." />
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border text-muted text-sm">
                  <th className="p-2">ID</th>
                  <th className="p-2">Subject</th>
                  <th className="p-2">Date</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="border-b border-border hover:bg-surface-2 cursor-pointer"
                    onClick={() => setOpenTicket(ticket)}
                  >
                    <td className="p-2">{ticket.id}</td>
                    <td className="p-2">{ticket.subject}</td>
                    <td className="p-2 text-muted">{ticket.date}</td>
                    <td className="p-2">
                      <Badge tone={badgeTone(ticket.status)}>{ticket.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
