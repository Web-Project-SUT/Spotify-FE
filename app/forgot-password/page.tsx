// app/forgot-password/page.tsx
'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { Button, Input } from '../../components/ui';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

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
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-surface rounded-lg p-8 space-y-4">
        <h1 className="text-2xl font-bold text-center">Reset password</h1>
        {submitted ? (
          <p className="text-muted text-sm text-center">
            If an account exists for <span className="text-white">{email}</span>, we&apos;ve sent
            recovery instructions.
          </p>
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
              />
              <Button type="submit" className="w-full">
                Send recovery link
              </Button>
            </form>
          </>
        )}
        <Link href="/login" className="text-muted text-sm w-full hover:text-white block text-center">
          Back to login
        </Link>
      </div>
    </div>
  );
}
