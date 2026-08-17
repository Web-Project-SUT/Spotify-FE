// app/register/page.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { Button, Input } from '../../components/ui';
import { getRoleHome, EMAIL_RE } from '../../utils/auth';
import { getItem } from '../../utils/localStorage';
import { apiEnabled, ApiError } from '../../utils/api';
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

interface ArtistFieldErrors {
  email?: string;
  password?: string;
  stageName?: string;
  portfolio?: string;
}

// The backend's normalized error body carries per-field messages under
// `fields`, already camelCased by the API's renderer — so its keys line up
// with the form's own field names. Flatten each field's messages into one
// string for the matching <Input error=…>.
function fieldErrorsFrom<T extends object>(error: ApiError, known: (keyof T)[]): T {
  const errors = {} as T;
  Object.entries(error.fields || {}).forEach(([field, messages]) => {
    if ((known as string[]).includes(field)) {
      errors[field as keyof T] = (
        Array.isArray(messages) ? messages.join(' ') : String(messages)
      ) as T[keyof T];
    }
  });
  return errors;
}

export default function RegisterPage() {
  const { registerListener, registerArtist, user, loading } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('listener');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ListenerFieldErrors>({});
  const [showPolicy, setShowPolicy] = useState(false);
  const [artistSubmitted, setArtistSubmitted] = useState(false);
  const [artistFieldErrors, setArtistFieldErrors] = useState<ArtistFieldErrors>({});
  const [listenerError, setListenerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    } else if (!apiEnabled) {
      // Only the mock store can be checked client-side. With the backend on,
      // `users` holds seed data rather than real accounts, so this lookup
      // both missed real duplicates and could reject free addresses — the
      // 400 from the server is the authoritative answer.
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

  const handleListenerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setListenerError('');
    const errors = validateListener();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    const { user: created, error: failure } = await registerListener({
      displayName: form.displayName,
      email: form.email,
      password: form.password,
      birthDate: form.birthDate,
      gender: form.gender as Gender,
    });
    setSubmitting(false);

    // Only navigate on an account that actually exists server-side.
    if (!created) {
      const fields = failure
        ? fieldErrorsFrom<ListenerFieldErrors>(failure, [
            'displayName',
            'email',
            'password',
            'birthDate',
            'gender',
          ])
        : {};
      setFieldErrors(fields);
      setListenerError(
        Object.keys(fields).length > 0
          ? ''
          : failure?.detail || 'Could not create your account. Please try again.'
      );
      return;
    }
    router.push('/home');
  };

  const handleArtistSubmit = async () => {
    setError('');
    setArtistFieldErrors({});
    if (!artistForm.email || !artistForm.password || !artistForm.stageName) {
      setError('Email, password, and stage name are required.');
      return;
    }
    setSubmitting(true);
    const { user: created, error: failure } = await registerArtist(artistForm);
    setSubmitting(false);

    // "Application pending" is only true if the application reached the
    // backend — showing it on a rejected request left the applicant waiting
    // on a review queue they were never in.
    if (!created) {
      const fields = failure
        ? fieldErrorsFrom<ArtistFieldErrors>(failure, [
            'email',
            'password',
            'stageName',
            'portfolio',
          ])
        : {};
      setArtistFieldErrors(fields);
      setError(
        Object.keys(fields).length > 0
          ? 'Please fix the highlighted fields.'
          : failure?.detail || 'Could not submit your application. Please try again.'
      );
      return;
    }
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
        {mode === 'listener' && listenerError && (
          <p className="text-danger text-sm text-center">{listenerError}</p>
        )}

        {mode === 'listener' ? (
          <form onSubmit={(e) => void handleListenerSubmit(e)} className="space-y-3" noValidate>
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
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
        ) : (
          <div className="space-y-3">
            <Input label="Email" name="artist-email" type="email" value={artistForm.email} onChange={(e) => setArtistForm({ ...artistForm, email: e.target.value })} error={artistFieldErrors.email} />
            <Input label="Password" name="artist-password" type="password" value={artistForm.password} onChange={(e) => setArtistForm({ ...artistForm, password: e.target.value })} error={artistFieldErrors.password} />
            <Input label="Stage name" name="stageName" value={artistForm.stageName} onChange={(e) => setArtistForm({ ...artistForm, stageName: e.target.value })} error={artistFieldErrors.stageName} />
            <Input label="Portfolio / sample works URL" name="portfolio" value={artistForm.portfolio} onChange={(e) => setArtistForm({ ...artistForm, portfolio: e.target.value })} error={artistFieldErrors.portfolio} />
            <Button className="w-full" onClick={() => void handleArtistSubmit()} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit application'}
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
