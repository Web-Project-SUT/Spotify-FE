// app/reset-password/[uid]/[token]/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Spinner } from '../../../../components/ui';
import { confirmPasswordReset } from '../../../../utils/resources/accounts';

interface Params {
  params: { uid: string; token: string };
}

export default function ResetPasswordPage({ params }: Params) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setSaving(true);
    const result = await confirmPasswordReset(params.uid, params.token, password);
    setSaving(false);
    if (result.ok) {
      setDone(true);
      setTimeout(() => router.replace('/login'), 1500);
    } else {
      setError(result.error || 'Could not reset your password.');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-surface rounded-lg p-8 space-y-4">
        <h1 className="text-2xl font-bold text-center">Choose a new password</h1>
        {done ? (
          <p className="text-muted text-sm text-center">
            Your password has been reset. Redirecting you to login…
          </p>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4" noValidate>
            <Input
              label="New password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="At least 8 characters"
              disabled={saving}
            />
            <Input
              label="Confirm new password"
              name="confirm"
              type="password"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                setError('');
              }}
              error={error}
              disabled={saving}
            />
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? <Spinner size={18} /> : 'Reset password'}
            </Button>
            <Link
              href="/login"
              className="text-muted text-sm w-full hover:text-white block text-center"
            >
              Back to login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
