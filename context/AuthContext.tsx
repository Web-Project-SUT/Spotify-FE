// context/AuthContext.tsx
'use client';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getItem, setItem, addRecord, deleteRecord, initializeMockDatabase } from '../utils/localStorage';
import { apiFetch, apiEnabled, apiLogout, storeTokens, clearTokens } from '../utils/api';
import { mediaUrl } from '../utils/resources/http';
import {
  hydratePreferences,
  pullPreferences,
  flushPending,
  clearPreferencesBucket,
  Preferences,
} from '../utils/preferences';
import { User, Role, Tier, Gender } from '../utils/types';

interface BackendUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: Role;
  status: string;
  tier: Tier;
  bio: string;
  avatar: string | null;
  birthDate: string | null;
  gender: string;
  preferences: Partial<Preferences>;
}

interface LoginResponse {
  access: string;
  refresh: string;
  user: BackendUser;
}

function mapBackendUser(u: BackendUser): User {
  return {
    id: u.id,
    email: u.email,
    role: u.role,
    tier: u.role === 'listener' ? u.tier : undefined,
    status: u.status as User['status'],
    displayName: u.displayName || undefined,
    username: u.username || undefined,
    birthDate: u.birthDate || undefined,
    gender: (u.gender || undefined) as Gender | undefined,
    bio: u.bio || undefined,
    // The API returns a relative media path; absolutize it here so every
    // Avatar/CoverArt reading `user.cover` gets a loadable src.
    cover: mediaUrl(u.avatar),
  };
}

interface RegisterListenerInput {
  displayName: string;
  email: string;
  password: string;
  birthDate?: string;
  gender?: Gender;
}

// Slugifies the display name and appends a random suffix, retrying on
// collision so the generated username stays unique within `users`.
function generateUsername(displayName: string, existing: User[]): string {
  const base =
    displayName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'user';
  const taken = new Set(existing.map((u) => u.username).filter(Boolean));
  let candidate = '';
  do {
    candidate = `${base}_${Math.random().toString(36).slice(2, 7)}`;
  } while (taken.has(candidate));
  return candidate;
}

interface RegisterArtistInput {
  email: string;
  password: string;
  stageName: string;
  portfolio: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User | null>;
  logout: () => void;
  deleteAccount: () => void;
  registerListener: (input: RegisterListenerInput) => Promise<User>;
  registerArtist: (input: RegisterArtistInput) => Promise<User>;
  refresh: () => void;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeMockDatabase();
    setUser(getItem('currentUser'));
    setLoading(false);
  }, []);

  // Device-B-was-already-logged-in: pick up preference changes made on
  // another device since this tab last loaded. No polling — see 2.5 in the
  // preferences-sync plan for why a WebSocket/polling layer is overkill for
  // six sticky settings fields.
  useEffect(() => {
    if (!apiEnabled || !getItem('accessToken')) return;
    void pullPreferences();
    void flushPending();

    let lastPull = Date.now();
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastPull < 30_000) return;
      lastPull = Date.now();
      void pullPreferences();
    };
    const onOnline = () => void flushPending();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  const refresh = useCallback(() => {
    setUser(getItem('currentUser'));
  }, []);

  // Re-fetch the authenticated user from the backend. Used after the payment
  // redirect so a tier change (a new active subscription) is reflected
  // immediately. In mock mode this degrades to re-reading local state.
  const refreshMe = useCallback(async () => {
    if (apiEnabled) {
      const me = await apiFetch<BackendUser>('/auth/me/');
      if (me) {
        const mapped = mapBackendUser(me);
        setItem('currentUser', mapped);
        setUser(mapped);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new StorageEvent('storage', { key: 'currentUser' }));
        }
        return;
      }
    }
    setUser(getItem('currentUser'));
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<User | null> => {
    if (apiEnabled) {
      const result = await apiFetch<LoginResponse>('/auth/login/', {
        method: 'POST',
        body: { email, password },
        auth: false,
      });
      if (result) {
        storeTokens(result.access, result.refresh);
        const mapped = mapBackendUser(result.user);
        setItem('currentUser', mapped);
        setUser(mapped);
        hydratePreferences(result.user.preferences);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new StorageEvent('storage', { key: 'currentUser' }));
        }
        return mapped;
      }
      // The backend rejected these credentials. Do NOT fall through to the
      // mock path: the seeded mock users carry no `password`, so the lookup
      // below matches on email alone and would hand out a session (admin
      // included) to anyone who typed a valid demo address.
      return null;
    }

    const users: User[] = getItem('users') || [];
    const found = users.find(
      (u) => u.email === email && (u.password === undefined || u.password === password)
    );
    if (found) {
      setItem('currentUser', found);
      setUser(found);
      // The native 'storage' event only fires in other tabs; dispatch it
      // manually so LanguageContext (which forces English for support
      // accounts) re-checks the newly logged-in user's role here too.
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new StorageEvent('storage', { key: 'currentUser' }));
      }
      return found;
    }
    return null;
  }, []);

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      void apiLogout();
      if (user) clearPreferencesBucket(user.id);
      clearTokens();
      localStorage.removeItem('currentUser');
      localStorage.removeItem('currentTrack');
      localStorage.removeItem('queue');
      // The native 'storage' event only fires in other tabs; dispatch it
      // manually so Player (which listens for it) clears itself, and
      // LanguageContext re-checks the (now logged-out) user, here too.
      window.dispatchEvent(new StorageEvent('storage', { key: 'currentTrack' }));
      window.dispatchEvent(new StorageEvent('storage', { key: 'currentUser' }));
    }
    setUser(null);
  }, [user]);

  // Removes the account from the users collection, then logs out.
  const deleteAccount = useCallback(() => {
    if (user) deleteRecord('users', user.id);
    logout();
  }, [user, logout]);

  const registerListener = useCallback(async (input: RegisterListenerInput): Promise<User> => {
    if (apiEnabled) {
      // The listener endpoint returns tokens alongside the user, so a
      // successful registration is also a login — no separate follow-up
      // call needed. acceptedPolicy is required server-side; the register
      // form already gates submission on the user checking that box.
      const result = await apiFetch<LoginResponse>('/auth/register/listener/', {
        method: 'POST',
        auth: false,
        body: {
          email: input.email,
          password: input.password,
          displayName: input.displayName,
          birthDate: input.birthDate || null,
          gender: input.gender || '',
          acceptedPolicy: true,
        },
      });
      if (result) {
        storeTokens(result.access, result.refresh);
        const mapped = mapBackendUser(result.user);
        setItem('currentUser', mapped);
        setUser(mapped);
        hydratePreferences(result.user.preferences);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new StorageEvent('storage', { key: 'currentUser' }));
        }
        return mapped;
      }
      // Backend rejected or unreachable: fall through to the mock path so
      // the demo still produces a usable local account.
    }

    const existing: User[] = getItem('users') || [];
    const newUser: User = {
      id: `u-${Date.now()}`,
      email: input.email,
      password: input.password,
      role: 'listener' as Role,
      tier: 'basic' as Tier,
      status: 'active',
      displayName: input.displayName,
      username: generateUsername(input.displayName, existing),
      birthDate: input.birthDate,
      gender: input.gender,
      followers: 0,
      following: [],
    };
    addRecord('users', newUser);
    setItem('currentUser', newUser);
    setUser(newUser);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new StorageEvent('storage', { key: 'currentUser' }));
    }
    return newUser;
  }, []);

  const registerArtist = useCallback(async (input: RegisterArtistInput): Promise<User> => {
    if (apiEnabled) {
      // Artist registration returns only the user (no tokens): the account
      // is created 'pending' and cannot log in until support/admin approves
      // it, so there is deliberately nothing to auto-login here.
      const result = await apiFetch<{ user: BackendUser }>('/auth/register/artist/', {
        method: 'POST',
        auth: false,
        body: {
          email: input.email,
          password: input.password,
          stageName: input.stageName,
          portfolio: input.portfolio || '',
        },
      });
      if (result) return mapBackendUser(result.user);
      // Fall through to the mock path on failure/unreachable backend.
    }

    // Artist accounts start in 'pending' until support/admin approves them.
    const newArtist: User = {
      id: `a-${Date.now()}`,
      email: input.email,
      password: input.password,
      role: 'artist' as Role,
      status: 'pending',
      stageName: input.stageName,
      portfolio: input.portfolio,
      followers: 0,
    };
    addRecord('users', newArtist);

    const recipients: User[] = (getItem('users') || []).filter(
      (u: User) => u.role === 'support' || u.role === 'admin'
    );
    recipients.forEach((recipient) => {
      addRecord('notifications', {
        id: `n-${Date.now()}-${recipient.id}`,
        userId: recipient.id,
        title: 'New artist verification request',
        message: `${input.stageName} has applied for an artist account and is awaiting review.`,
        type: 'approval',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    });

    return newArtist;
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, deleteAccount, registerListener, registerArtist, refresh, refreshMe }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
