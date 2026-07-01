// app/forgot-password/page.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, Spinner } from '../../components/ui';
import { getRoleHome, EMAIL_RE } from '../../utils/auth';

export default function ForgotPasswordPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace(getRoleHome(user));
    }
  }, [user, loading, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    if (!EMAIL_RE.test(email)) {
      setError('Enter a valid email address.');
      return;
    }
    setError('');
    // Mock a network "send" — no real email/network in Phase 1.
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-surface rounded-lg p-8 space-y-4">
        <h1 className="text-2xl font-bold text-center">Reset password</h1>
        {submitted ? (
          <>
            <p className="text-muted text-sm text-center">
              If an account exists for <span className="text-white">{email}</span>, we&apos;ve sent
              recovery instructions.
            </p>
            <Link href="/login" className="block">
              <Button type="button" className="w-full">
                Back to login
              </Button>
            </Link>
          </>
        ) : (
          <>
            <p className="text-muted text-sm text-center">
              Enter your email and we&apos;ll send recovery instructions.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <Input
                label="Email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                error={error}
                placeholder="you@example.com"
                disabled={sending}
              />
              <Button type="submit" className="w-full" disabled={sending}>
                {sending ? <Spinner size={18} /> : 'Send recovery link'}
              </Button>
            </form>
            <Link
              href="/login"
              className="text-muted text-sm w-full hover:text-white block text-center"
            >
              Back to login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
