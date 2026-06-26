// app/login/page.tsx
'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { Button, Input } from '../../components/ui';

const roleHome: Record<string, string> = {
  listener: '/home',
  artist: '/artist-panel',
  support: '/support',
  admin: '/dashboard',
};

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showForgot, setShowForgot] = useState(false);

  const handleLogin = () => {
    setError('');
    const user = login(email, password);
    if (!user) {
      setError('No account found with those credentials.');
      return;
    }
    router.push(roleHome[user.role] || '/home');
  };

  if (showForgot) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-surface rounded-lg p-8 space-y-4">
          <h1 className="text-2xl font-bold text-center">Reset password</h1>
          <p className="text-muted text-sm text-center">
            Enter your email and we&apos;ll send recovery instructions.
          </p>
          <Input label="Email" name="recovery-email" type="email" placeholder="you@example.com" />
          <Button className="w-full" onClick={() => setShowForgot(false)}>
            Send recovery link
          </Button>
          <button onClick={() => setShowForgot(false)} className="text-muted text-sm w-full hover:text-white">
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-surface rounded-lg p-8 space-y-4">
        <h1 className="text-2xl font-bold text-center">Log in</h1>
        {error && <p className="text-danger text-sm text-center">{error}</p>}
        <Input
          label="Email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <Input
          label="Password"
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
        <button onClick={() => setShowForgot(true)} className="text-accent text-sm hover:underline">
          Forgot password?
        </button>
        <Button className="w-full" onClick={handleLogin}>
          Log in
        </Button>
        <p className="text-muted text-sm text-center">
          No account?{' '}
          <Link href="/register" className="text-white hover:underline">
            Sign up
          </Link>
        </p>
        <div className="border-t border-border pt-3 text-xs text-muted text-center space-y-1">
          <p className="font-bold">Demo accounts (any password):</p>
          <p>listener@demo.com · gold@demo.com · admin@demo.com</p>
        </div>
      </div>
    </div>
  );
}
