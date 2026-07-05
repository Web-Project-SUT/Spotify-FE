// context/AuthContext.tsx
'use client';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getItem, setItem, addRecord, deleteRecord, initializeMockDatabase } from '../utils/localStorage';
import { User, Role, Tier, Gender } from '../utils/types';

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
  login: (email: string, password: string) => User | null;
  logout: () => void;
  deleteAccount: () => void;
  registerListener: (input: RegisterListenerInput) => User;
  registerArtist: (input: RegisterArtistInput) => User;
  refresh: () => void;
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

  const refresh = useCallback(() => {
    setUser(getItem('currentUser'));
  }, []);

  const login = useCallback((email: string, password: string): User | null => {
    const users: User[] = getItem('users') || [];
    const found = users.find(
      (u) => u.email === email && (u.password === undefined || u.password === password)
    );
    if (found) {
      setItem('currentUser', found);
      setUser(found);
      return found;
    }
    return null;
  }, []);

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('currentTrack');
      localStorage.removeItem('queue');
      // The native 'storage' event only fires in other tabs; dispatch it
      // manually so Player (which listens for it) clears itself here too.
      window.dispatchEvent(new StorageEvent('storage', { key: 'currentTrack' }));
    }
    setUser(null);
  }, []);

  // Removes the account from the users collection, then logs out.
  const deleteAccount = useCallback(() => {
    if (user) deleteRecord('users', user.id);
    logout();
  }, [user, logout]);

  const registerListener = useCallback((input: RegisterListenerInput): User => {
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
    return newUser;
  }, []);

  const registerArtist = useCallback((input: RegisterArtistInput): User => {
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
      value={{ user, loading, login, logout, deleteAccount, registerListener, registerArtist, refresh }}
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
