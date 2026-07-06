// components/SupportDashboard.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { getItem, updateRecord, addRecord } from '../utils/localStorage';
import { User, Ticket } from '../utils/types';
import { Badge, Button, EmptyState, Input } from './ui';

type Tab = 'approvals' | 'tickets';

export default function SupportDashboard() {
  const [tab, setTab] = useState<Tab>('approvals');
  const [pendingArtists, setPendingArtists] = useState<User[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [openTicket, setOpenTicket] = useState<Ticket | null>(null);
  const [reply, setReply] = useState('');
  const [rejectTarget, setRejectTarget] = useState<User | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    const users: User[] = getItem('users') || [];
    setPendingArtists(users.filter((u) => u.role === 'artist' && u.status === 'pending'));
    setTickets(getItem('tickets') || []);
  }, []);

  const decideArtist = (artist: User, approve: boolean, reason?: string) => {
    updateRecord('users', artist.id, { status: approve ? 'active' : 'rejected' });
    addRecord('notifications', {
      id: `n-${Date.now()}`,
      userId: artist.id,
      title: approve ? 'Artist account approved' : 'Artist application rejected',
      message: approve ? 'You can now publish your work.' : `Reason: ${reason || 'Did not meet requirements'}`,
      type: 'approval',
      isRead: false,
      createdAt: new Date().toISOString(),
    });
    setPendingArtists((prev) => prev.filter((a) => a.id !== artist.id));
  };

  const confirmReject = () => {
    if (!rejectTarget) return;
    decideArtist(rejectTarget, false, rejectReason);
    setRejectTarget(null);
    setRejectReason('');
  };

  const sendReply = () => {
    if (!openTicket || !reply.trim()) return;
    const updated: Ticket = {
      ...openTicket,
      status: 'answered',
      messages: [
        ...openTicket.messages,
        { from: 'support', text: reply.trim(), at: new Date().toISOString() },
      ],
    };
    updateRecord('tickets', updated.id, { status: updated.status, messages: updated.messages });
    addRecord('notifications', {
      id: `n-${Date.now()}`,
      userId: updated.userId,
      title: 'Support replied to your ticket',
      message: `Re: ${updated.subject}`,
      type: 'support',
      isRead: false,
      createdAt: new Date().toISOString(),
    });
    setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setOpenTicket(updated);
    setReply('');
  };

  const closeTicket = () => {
    if (!openTicket) return;
    const updated: Ticket = { ...openTicket, status: 'closed' };
    updateRecord('tickets', updated.id, { status: 'closed' });
    setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setOpenTicket(updated);
  };

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-6">Support</h1>

      <div className="flex gap-2 mb-6 border-b border-border">
        <button
          onClick={() => setTab('approvals')}
          className={`px-4 py-2 text-sm font-bold border-b-2 ${tab === 'approvals' ? 'border-accent text-white' : 'border-transparent text-muted'}`}
        >
          Artist approvals
        </button>
        <button
          onClick={() => setTab('tickets')}
          className={`px-4 py-2 text-sm font-bold border-b-2 ${tab === 'tickets' ? 'border-accent text-white' : 'border-transparent text-muted'}`}
        >
          Support tickets
        </button>
      </div>

      {tab === 'approvals' ? (
        pendingArtists.length === 0 ? (
          <EmptyState icon="✅" title="No pending applications" description="All artist applications have been reviewed." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-border text-muted text-sm">
                  <th className="p-2">Stage name</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Portfolio</th>
                  <th className="p-2">Decision</th>
                </tr>
              </thead>
              <tbody>
                {pendingArtists.map((a) => (
                  <tr key={a.id} className="border-b border-border">
                    <td className="p-2 font-bold whitespace-nowrap">{a.stageName}</td>
                    <td className="p-2 text-muted whitespace-nowrap">{a.email}</td>
                    <td className="p-2 whitespace-nowrap">
                      {a.portfolio ? (
                        <a href={a.portfolio} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                          View samples
                        </a>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="p-2 flex gap-2 whitespace-nowrap">
                      <Button size="sm" onClick={() => decideArtist(a, true)}>Approve</Button>
                      <Button size="sm" variant="danger" onClick={() => setRejectTarget(a)}>Reject</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : openTicket ? (
        <div className="max-w-xl">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setOpenTicket(null)} className="text-muted text-sm hover:text-white">
              ← Back to tickets
            </button>
            {openTicket.status !== 'closed' && (
              <Button variant="ghost" size="sm" onClick={closeTicket}>
                Close ticket
              </Button>
            )}
          </div>
          <h2 className="text-lg font-bold mb-1">{openTicket.subject}</h2>
          <p className="text-muted text-sm mb-4">
            {openTicket.userName} · {openTicket.id} · <Badge tone={openTicket.status === 'open' ? 'info' : openTicket.status === 'answered' ? 'success' : 'neutral'}>{openTicket.status}</Badge>
          </p>
          <div className="space-y-2 mb-4">
            {openTicket.messages.map((m, i) => (
              <div key={i} className={`p-3 rounded-lg max-w-[80%] ${m.from === 'support' ? 'bg-accent/20 ml-auto' : 'bg-surface-3'}`}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-xs text-muted">{m.from}</p>
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
                placeholder="Type a reply…"
              />
            </div>
            <Button onClick={sendReply}>Send</Button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <thead>
              <tr className="border-b border-border text-muted text-sm">
                <th className="p-2">ID</th>
                <th className="p-2">User</th>
                <th className="p-2">Subject</th>
                <th className="p-2">Date</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="border-b border-border hover:bg-surface-2 cursor-pointer" onClick={() => setOpenTicket(ticket)}>
                  <td className="p-2 whitespace-nowrap">{ticket.id}</td>
                  <td className="p-2 text-muted whitespace-nowrap">{ticket.userName}</td>
                  <td className="p-2 whitespace-nowrap">{ticket.subject}</td>
                  <td className="p-2 text-muted whitespace-nowrap">{ticket.date}</td>
                  <td className="p-2 whitespace-nowrap">
                    <Badge tone={ticket.status === 'open' ? 'info' : ticket.status === 'answered' ? 'success' : 'neutral'}>{ticket.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rejectTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Reject application</h2>
            <label className="block text-sm text-muted mb-2">Reason for rejection</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explain why this application is being rejected…"
              className="w-full bg-surface-2 border border-border rounded px-3 py-2 mb-4 min-h-24"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setRejectTarget(null);
                  setRejectReason('');
                }}
              >
                Cancel
              </Button>
              <Button variant="danger" onClick={confirmReject}>
                Confirm rejection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
