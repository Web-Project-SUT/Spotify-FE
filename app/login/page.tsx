// app/login/page.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Button, Input } from '../../components/ui';
import { getRoleHome, EMAIL_RE } from '../../utils/auth';

interface FieldErrors {
  email?: string;
  password?: string;
}

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (!loading && user) {
      router.replace(getRoleHome(user));
    }
  }, [user, loading, router]);

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (!email.trim()) {
      errors.email = 'Email is required.';
    } else if (!EMAIL_RE.test(email)) {
      errors.email = 'Enter a valid email address.';
    }
    if (!password) {
      errors.password = 'Password is required.';
    }
    return errors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setAuthError('');
    const loggedInUser = login(email, password);
    if (!loggedInUser) {
      setAuthError('No account found with those credentials.');
      return;
    }
    router.replace(getRoleHome(loggedInUser));
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-surface rounded-lg p-8 space-y-4">
        <h1 className="text-2xl font-bold text-center">{t('auth.login')}</h1>
        {authError && <p className="text-danger text-sm text-center">{authError}</p>}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label={t('auth.email')}
            name="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setFieldErrors((prev) => ({ ...prev, email: undefined }));
              setAuthError('');
            }}
            error={fieldErrors.email}
            placeholder="you@example.com"
          />
          <Input
            label={t('auth.password')}
            name="password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setFieldErrors((prev) => ({ ...prev, password: undefined }));
              setAuthError('');
            }}
            error={fieldErrors.password}
            placeholder="••••••••"
          />
          <Link href="/forgot-password" className="text-accent text-sm hover:underline inline-block">
            {t('auth.forgotPassword')}
          </Link>
          <Button type="submit" className="w-full">
            {t('auth.login')}
          </Button>
        </form>
        <p className="text-muted text-sm text-center">
          {t('auth.noAccount')}{' '}
          <Link href="/register" className="text-white hover:underline">
            {t('auth.signUp')}
          </Link>
        </p>
        <div className="border-t border-border pt-3 text-xs text-muted text-center space-y-1">
          <p className="font-bold">{t('auth.demoAccounts')}</p>
          <p>listener@demo.com · gold@demo.com · admin@demo.com</p>
        </div>
      </div>
    </div>
  );
}
