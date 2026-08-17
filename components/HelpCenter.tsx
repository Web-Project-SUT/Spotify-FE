// components/HelpCenter.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { getCurrentUser } from '../utils/auth';
import { useLanguage } from '../context/LanguageContext';
import { Ticket } from '../utils/types';
import { loadTickets, loadTicketDetail, createTicket, replyToTicket } from '../utils/resources/tickets';
import { Badge, Button, EmptyState, Input } from './ui';

export default function HelpCenter() {
  const { t } = useLanguage();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [openTicket, setOpenTicket] = useState<Ticket | null>(null);
  const [reply, setReply] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const currentUser = getCurrentUser();

  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    void loadTickets(currentUser.id).then((loaded) => {
      if (active) setTickets(loaded);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitTicket = async () => {
    if (!currentUser || !subject.trim() || !message.trim()) return;
    const created = await createTicket(currentUser, subject.trim(), message.trim());
    if (!created) return;
    setTickets((prev) => [...prev, created]);
    setSubject('');
    setMessage('');
  };

  const openTicketDetail = async (ticket: Ticket) => {
    const detail = await loadTicketDetail(ticket.id);
    setOpenTicket(detail || ticket);
  };

  const sendFollowUp = async () => {
    if (!openTicket || !reply.trim()) return;
    const updated = await replyToTicket(openTicket, reply.trim(), 'user');
    if (!updated) return;
    setTickets((prev) => prev.map((ticket) => (ticket.id === updated.id ? updated : ticket)));
    setOpenTicket(updated);
    setReply('');
  };

  if (!currentUser) return null;

  const badgeTone = (status: Ticket['status']) =>
    status === 'open' ? 'info' : status === 'answered' ? 'success' : 'neutral';
  const statusLabel = (status: Ticket['status']) => t(`help.status.${status}`);

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-6">{t('help.title')}</h1>

      {openTicket ? (
        <div className="max-w-xl">
          <button
            onClick={() => setOpenTicket(null)}
            className="text-muted text-sm mb-4 hover:text-white"
          >
            {t('help.backToTickets')}
          </button>
          <h2 className="text-lg font-bold mb-1">{openTicket.subject}</h2>
          <p className="text-muted text-sm mb-4">
            {openTicket.id} · <Badge tone={badgeTone(openTicket.status)}>{statusLabel(openTicket.status)}</Badge>
          </p>
          <div className="space-y-2 mb-4">
            {openTicket.messages.map((m, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg max-w-[80%] ${m.from === 'user' ? 'bg-accent/20 ml-auto' : 'bg-surface-3'}`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-xs text-muted">{m.from === 'user' ? t('help.you') : t('help.support')}</p>
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
                placeholder={t('help.replyPlaceholder')}
              />
            </div>
            <Button onClick={() => void sendFollowUp()}>{t('help.send')}</Button>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-surface border border-border rounded-xl p-6 mb-8 max-w-xl">
            <h2 className="text-lg font-bold mb-4">{t('help.newTicket')}</h2>
            <div className="mb-3">
              <Input
                label={t('help.subjectLabel')}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t('help.subjectPlaceholder')}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-bold mb-1 text-white">{t('help.messageLabel')}</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('help.messagePlaceholder')}
                className="w-full bg-surface-2 border border-border rounded px-3 py-2 min-h-24 placeholder-muted focus:outline-none focus:border-white transition-colors"
              />
            </div>
            <Button onClick={() => void submitTicket()} disabled={!subject.trim() || !message.trim()}>
              {t('help.submit')}
            </Button>
          </div>

          {tickets.length === 0 ? (
            <EmptyState icon="🎧" title={t('help.emptyTitle')} description={t('help.emptyDesc')} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left">
                <thead>
                  <tr className="border-b border-border text-muted text-sm">
                    <th className="p-2">{t('help.columnId')}</th>
                    <th className="p-2">{t('help.columnSubject')}</th>
                    <th className="p-2">{t('help.columnDate')}</th>
                    <th className="p-2">{t('help.columnStatus')}</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className="border-b border-border hover:bg-surface-2 cursor-pointer"
                      onClick={() => void openTicketDetail(ticket)}
                    >
                      <td className="p-2 whitespace-nowrap">{ticket.id}</td>
                      <td className="p-2 whitespace-nowrap">{ticket.subject}</td>
                      <td className="p-2 text-muted whitespace-nowrap">{ticket.date}</td>
                      <td className="p-2 whitespace-nowrap">
                        <Badge tone={badgeTone(ticket.status)}>{statusLabel(ticket.status)}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
