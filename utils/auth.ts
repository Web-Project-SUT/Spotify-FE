// utils/auth.ts
// Single source of truth for "who is logged in" and tier/role checks.
// Components should use these helpers instead of reading currentUser
// and comparing role/tier directly, so the rules only live in one place.

import { getItem } from './localStorage';
import { User, Tier } from './types';

export const getCurrentUser = (): User | null => {
  return getItem('currentUser');
};

export const isGoldUser = (user: User | null = getCurrentUser()): boolean => {
  return !!user && user.role === 'listener' && user.tier === 'gold';
};

export const isSilverOrAbove = (user: User | null = getCurrentUser()): boolean => {
  return !!user && user.role === 'listener' && (user.tier === 'silver' || user.tier === 'gold');
};

export const getTier = (user: User | null = getCurrentUser()): Tier => {
  if (!user || user.role !== 'listener') return 'basic';
  return user.tier || 'basic';
};

export const PLAYLIST_LIMITS: Record<Tier, number> = {
  basic: 6,
  silver: 100,
  gold: Infinity,
};

export const getPlaylistLimit = (user: User | null = getCurrentUser()): number => {
  return PLAYLIST_LIMITS[getTier(user)];
};
