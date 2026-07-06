// utils/auth.test.ts
import { describe, it, expect } from 'vitest';
import {
  getPlaylistLimit,
  getTier,
  isGoldUser,
  isSilverOrAbove,
  getRoleHome,
  ROLE_HOME,
  PLAYLIST_LIMITS,
} from './auth';
import { User } from './types';

const listener = (tier?: User['tier']): User => ({
  id: 'u1',
  email: 'a@b.com',
  role: 'listener',
  tier,
});

const artist: User = { id: 'a1', email: 'artist@b.com', role: 'artist' };

describe('PLAYLIST_LIMITS', () => {
  it('has the spec tier limits', () => {
    expect(PLAYLIST_LIMITS.basic).toBe(6);
    expect(PLAYLIST_LIMITS.silver).toBe(100);
    expect(PLAYLIST_LIMITS.gold).toBe(Infinity);
  });
});

describe('getPlaylistLimit', () => {
  it('returns 6 for a basic listener', () => {
    expect(getPlaylistLimit(listener('basic'))).toBe(6);
  });

  it('returns 100 for a silver listener', () => {
    expect(getPlaylistLimit(listener('silver'))).toBe(100);
  });

  it('returns Infinity for a gold listener', () => {
    expect(getPlaylistLimit(listener('gold'))).toBe(Infinity);
  });

  it('falls back to the basic limit for a non-listener', () => {
    expect(getPlaylistLimit(artist)).toBe(6);
  });

  it('falls back to the basic limit for null', () => {
    expect(getPlaylistLimit(null)).toBe(6);
  });
});

describe('getTier', () => {
  it("returns the listener's tier", () => {
    expect(getTier(listener('gold'))).toBe('gold');
  });

  it('returns basic when tier is undefined', () => {
    expect(getTier(listener(undefined))).toBe('basic');
  });

  it('returns basic for a non-listener', () => {
    expect(getTier(artist)).toBe('basic');
  });

  it('returns basic for null', () => {
    expect(getTier(null)).toBe('basic');
  });
});

describe('isGoldUser', () => {
  it('is true for a gold listener', () => {
    expect(isGoldUser(listener('gold'))).toBe(true);
  });

  it('is false for a silver listener', () => {
    expect(isGoldUser(listener('silver'))).toBe(false);
  });

  it('is false for a basic listener', () => {
    expect(isGoldUser(listener('basic'))).toBe(false);
  });

  it('is false for an artist', () => {
    expect(isGoldUser(artist)).toBe(false);
  });

  it('is false for null', () => {
    expect(isGoldUser(null)).toBe(false);
  });
});

describe('isSilverOrAbove', () => {
  it('is true for a silver listener', () => {
    expect(isSilverOrAbove(listener('silver'))).toBe(true);
  });

  it('is true for a gold listener', () => {
    expect(isSilverOrAbove(listener('gold'))).toBe(true);
  });

  it('is false for a basic listener', () => {
    expect(isSilverOrAbove(listener('basic'))).toBe(false);
  });

  it('is false for an artist', () => {
    expect(isSilverOrAbove(artist)).toBe(false);
  });

  it('is false for null', () => {
    expect(isSilverOrAbove(null)).toBe(false);
  });
});

describe('getRoleHome', () => {
  it('routes each role to its ROLE_HOME entry', () => {
    expect(getRoleHome({ ...listener('basic') })).toBe(ROLE_HOME.listener);
    expect(getRoleHome(artist)).toBe(ROLE_HOME.artist);
    expect(getRoleHome({ id: 's1', email: 's@b.com', role: 'support' })).toBe(ROLE_HOME.support);
    expect(getRoleHome({ id: 'ad1', email: 'ad@b.com', role: 'admin' })).toBe(ROLE_HOME.admin);
  });

  it('routes null to /login', () => {
    expect(getRoleHome(null)).toBe('/login');
  });
});
