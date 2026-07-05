// app/register/page.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { Button, Input } from '../../components/ui';
import { getRoleHome, EMAIL_RE } from '../../utils/auth';
import { getItem } from '../../utils/localStorage';
import { Gender, User } from '../../utils/types';

type Mode = 'listener' | 'artist';

interface ListenerFieldErrors {
  displayName?: string;
  email?: string;
  password?: string;
  confirm?: string;
  birthDate?: string;
  gender?: string;
  acceptPolicy?: string;
}

export default function RegisterPage() {
  const { registerListener, registerArtist, user, loading } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('listener');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ListenerFieldErrors>({});
  const [showPolicy, setShowPolicy] = useState(false);
  const [artistSubmitted, setArtistSubmitted] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace(getRoleHome(user));
    }
  }, [user, loading, router]);

  // Listener fields
  const [form, setForm] = useState({
    displayName: '',
    email: '',
    password: '',
    confirm: '',
    birthDate: '',
    gender: '',
    acceptPolicy: false,
  });

  // Artist fields
  const [artistForm, setArtistForm] = useState({
    email: '',
    password: '',
    stageName: '',
    portfolio: '',
  });

  const clearFieldError = (field: keyof ListenerFieldErrors) => {
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateListener = (): ListenerFieldErrors => {
    const errors: ListenerFieldErrors = {};
    if (!form.displayName.trim()) {
      errors.displayName = 'Display name is required.';
    }
    if (!form.email.trim()) {
      errors.email = 'Email is required.';
    } else if (!EMAIL_RE.test(form.email)) {
      errors.email = 'Enter a valid email address.';
    } else {
      const users: User[] = getItem('users') || [];
      if (users.some((u) => u.email === form.email)) {
        errors.email = 'An account with this email already exists.';
      }
    }
    if (!form.password) {
      errors.password = 'Password is required.';
    }
    if (!form.confirm) {
      errors.confirm = 'Please confirm your password.';
    } else if (form.password !== form.confirm) {
      errors.confirm = 'Passwords do not match.';
    }
    if (!form.birthDate) {
      errors.birthDate = 'Birth date is required.';
    }
    if (!form.gender) {
      errors.gender = 'Please select a gender.';
    }
    if (!form.acceptPolicy) {
      errors.acceptPolicy = 'You must accept the privacy policy.';
    }
    return errors;
  };

  const handleListenerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateListener();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    registerListener({
      displayName: form.displayName,
      email: form.email,
      password: form.password,
      birthDate: form.birthDate,
      gender: form.gender as Gender,
    });
    router.push('/home');
  };

  const handleArtistSubmit = () => {
    setError('');
    if (!artistForm.email || !artistForm.password || !artistForm.stageName) {
      setError('Email, password, and stage name are required.');
      return;
    }
    registerArtist(artistForm);
    setArtistSubmitted(true);
  };

  if (artistSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-surface rounded-lg p-8 text-center space-y-4">
          <span className="text-5xl">⏳</span>
          <h1 className="text-2xl font-bold">Application pending</h1>
          <p className="text-muted">
            Your artist account is in review. You&apos;ll be notified once support approves it.
          </p>
          <Link href="/login">
            <Button>Back to login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-md bg-surface rounded-lg p-8 space-y-4">
        <h1 className="text-2xl font-bold text-center">Sign up</h1>

        <div className="flex gap-2 bg-surface-2 rounded-full p-1">
          <button
            onClick={() => setMode('listener')}
            className={`flex-1 rounded-full py-1.5 text-sm font-bold transition-colors ${mode === 'listener' ? 'bg-accent text-black' : 'text-muted'}`}
          >
            Listener
          </button>
          <button
            onClick={() => setMode('artist')}
            className={`flex-1 rounded-full py-1.5 text-sm font-bold transition-colors ${mode === 'artist' ? 'bg-accent text-black' : 'text-muted'}`}
          >
            Artist
          </button>
        </div>

        {mode === 'artist' && error && <p className="text-danger text-sm text-center">{error}</p>}

        {mode === 'listener' ? (
          <form onSubmit={handleListenerSubmit} className="space-y-3" noValidate>
            <Input
              label="Display name"
              name="displayName"
              value={form.displayName}
              onChange={(e) => {
                setForm({ ...form, displayName: e.target.value });
                clearFieldError('displayName');
              }}
              error={fieldErrors.displayName}
            />
            <Input
              label="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={(e) => {
                setForm({ ...form, email: e.target.value });
                clearFieldError('email');
              }}
              error={fieldErrors.email}
            />
            <Input
              label="Password"
              name="password"
              type="password"
              value={form.password}
              onChange={(e) => {
                setForm({ ...form, password: e.target.value });
                clearFieldError('password');
              }}
              error={fieldErrors.password}
            />
            <Input
              label="Confirm password"
              name="confirm"
              type="password"
              value={form.confirm}
              onChange={(e) => {
                setForm({ ...form, confirm: e.target.value });
                clearFieldError('confirm');
              }}
              error={fieldErrors.confirm}
            />
            <Input
              label="Birth date"
              name="birthDate"
              type="date"
              value={form.birthDate}
              onChange={(e) => {
                setForm({ ...form, birthDate: e.target.value });
                clearFieldError('birthDate');
              }}
              error={fieldErrors.birthDate}
            />
            <div>
              <label className="block text-sm font-bold mb-1">Gender</label>
              <select
                name="gender"
                value={form.gender}
                onChange={(e) => {
                  setForm({ ...form, gender: e.target.value });
                  clearFieldError('gender');
                }}
                className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-white"
              >
                <option value="">Select…</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
              {fieldErrors.gender && <p className="text-danger text-xs mt-1">{fieldErrors.gender}</p>}
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.acceptPolicy}
                  onChange={(e) => {
                    setForm({ ...form, acceptPolicy: e.target.checked });
                    clearFieldError('acceptPolicy');
                  }}
                />
                <span>
                  I accept the{' '}
                  <button type="button" onClick={() => setShowPolicy(true)} className="text-accent hover:underline">
                    privacy policy
                  </button>
                </span>
              </label>
              {fieldErrors.acceptPolicy && <p className="text-danger text-xs mt-1">{fieldErrors.acceptPolicy}</p>}
            </div>
            <Button type="submit" className="w-full">
              Create account
            </Button>
          </form>
        ) : (
          <div className="space-y-3">
            <Input label="Email" name="artist-email" type="email" value={artistForm.email} onChange={(e) => setArtistForm({ ...artistForm, email: e.target.value })} />
            <Input label="Password" name="artist-password" type="password" value={artistForm.password} onChange={(e) => setArtistForm({ ...artistForm, password: e.target.value })} />
            <Input label="Stage name" name="stageName" value={artistForm.stageName} onChange={(e) => setArtistForm({ ...artistForm, stageName: e.target.value })} />
            <Input label="Portfolio / sample works URL" name="portfolio" value={artistForm.portfolio} onChange={(e) => setArtistForm({ ...artistForm, portfolio: e.target.value })} />
            <Button className="w-full" onClick={handleArtistSubmit}>
              Submit application
            </Button>
          </div>
        )}

        <p className="text-muted text-sm text-center">
          Have an account?{' '}
          <Link href="/login" className="text-white hover:underline">
            Log in
          </Link>
        </p>
      </div>

      {showPolicy && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={() => setShowPolicy(false)}>
          <div className="bg-surface rounded-lg p-6 max-w-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-3">Privacy policy</h2>
            <p className="text-muted text-sm leading-relaxed">
              This is a mock privacy policy for the Phase 1 frontend. In the real
              service, we describe how listening data, profile information, and
              payment details are stored and used. No real data is collected in
              this demo.
            </p>
            <Button className="mt-4" onClick={() => setShowPolicy(false)}>
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
