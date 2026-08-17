// components/ArtistApprovalGate.tsx
'use client';
import React from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { Button, EmptyState } from './ui';

/**
 * Hides the artist workspace from an artist whose application is still under
 * review (or was rejected).
 *
 * The backend already refuses their writes — `IsApprovedArtist` answers a 403
 * on POST /tracks/ — but a pending artist could fill in the whole upload form
 * before finding that out, and the rejection read as a form error. Showing the
 * account's real state up front is the honest version of the same rule.
 */
export default function ArtistApprovalGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (!user || user.role !== 'artist' || user.status === 'active' || user.status === undefined) {
    return <>{children}</>;
  }

  if (user.status === 'rejected') {
    return (
      <EmptyState
        icon="🚫"
        title="Your artist application was not approved"
        description="Support reviewed your application and could not approve it. Check your notifications for the reason, or open a ticket if you would like it reconsidered."
        action={
          <Link href="/help">
            <Button>Contact support</Button>
          </Link>
        }
      />
    );
  }

  return (
    <EmptyState
      icon="⏳"
      title="Your artist account is awaiting approval"
      description="Support is reviewing your application. Publishing, albums and stats unlock as soon as it is approved — you'll get a notification."
      action={
        <Link href="/notifications">
          <Button>View notifications</Button>
        </Link>
      }
    />
  );
}
