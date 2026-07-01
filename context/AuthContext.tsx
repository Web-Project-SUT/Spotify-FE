// context/AuthContext.tsx
'use client';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getItem, setItem, addRecord, deleteRecord, initializeMockDatabase } from '../utils/localStorage';
import { User, Role, Tier } from '../utils/types';

interface RegisterListenerInput {
  displayName: string;
  email: string;
  password: string;
  birthDate?: string;
  gender?: string;
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
    const newUser: User = {
      id: `u-${Date.now()}`,
      email: input.email,
      password: input.password,
      role: 'listener' as Role,
      tier: 'basic' as Tier,
      status: 'active',
      stageName: input.displayName,
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
