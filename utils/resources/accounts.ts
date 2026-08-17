// utils/resources/accounts.ts
//
// Account self-service that isn't part of the auth context: password reset,
// the public profile projection the profile page renders, and the two
// destructive/self-editing calls on /auth/me/.
//
// With the backend off every function falls back to the localStorage mock
// exactly as before, so the mock-only demo is unaffected.
import { ApiError, apiEnabled, apiFetch, apiRequest, API_BASE_URL } from '../api';
import { getItem, addRecord, updateRecord, deleteRecord } from '../localStorage';
import { Role, Tier, User } from '../types';
import { fetchAll, mediaUrl } from './http';

// Always resolves (the backend returns 204 whether or not the email exists,
// which is the correct anti-enumeration behaviour — we mirror it).
export async function requestPasswordReset(email: string): Promise<void> {
  if (apiEnabled) {
    await apiFetch('/auth/password-reset/', { method: 'POST', auth: false, body: { email } });
    return;
  }
  // Mock: pretend to send.
  await new Promise((r) => setTimeout(r, 400));
}

export interface ResetConfirmResult {
  ok: boolean;
  error?: string;
}

export async function confirmPasswordReset(
  uid: string,
  token: string,
  newPassword: string
): Promise<ResetConfirmResult> {
  if (!apiEnabled) {
    await new Promise((r) => setTimeout(r, 400));
    return { ok: true };
  }
  try {
    // apiFetch collapses 204 and error responses both to null, so use a raw
    // fetch here to tell a successful reset (2xx) from a bad/expired token.
    const res = await fetch(`${API_BASE_URL}/auth/password-reset/confirm/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, token, newPassword }),
    });
    if (res.ok) return { ok: true };
    return { ok: false, error: 'This reset link is invalid or has expired.' };
  } catch {
    return { ok: false, error: 'Could not reach the server. Please try again.' };
  }
}


// ---- Public profile ------------------------------------------------------

// What a profile page needs about *any* user. The counts are aggregated by
// the backend (doc.tex forbids doing that arithmetic in the frontend), and
// `isFollowing` is resolved against the requesting user server-side, because
// the viewer's following[] only exists in mock mode.
export interface PublicProfile {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  tier: Tier;
  bio: string;
  avatar?: string;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
}

interface BackendPublicProfile {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  tier: Tier;
  bio: string;
  avatar: string | null;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
}

// null means "no such user" — the caller renders its not-found state. In API
// mode that is a real 404 rather than "absent from the mock collection",
// which is what made /profile show "User not found" for every real account.
export async function loadUserProfile(userId: string): Promise<PublicProfile | null> {
  if (apiEnabled) {
    const u = await apiFetch<BackendPublicProfile>(`/users/${userId}/`);
    if (!u) return null;
    return {
      id: u.id,
      username: u.username || '',
      displayName: u.displayName || '',
      role: u.role,
      tier: u.tier || 'basic',
      bio: u.bio || '',
      avatar: mediaUrl(u.avatar),
      followerCount: u.followerCount || 0,
      followingCount: u.followingCount || 0,
      isFollowing: !!u.isFollowing,
    };
  }
  const users: User[] = getItem('users') || [];
  const u = users.find((x) => x.id === userId);
  if (!u) return null;
  const me: User | null = getItem('currentUser');
  return {
    id: u.id,
    username: u.username || '',
    displayName: u.displayName || '',
    role: u.role,
    tier: u.tier || 'basic',
    bio: u.bio || '',
    avatar: u.cover,
    followerCount: u.followers || 0,
    followingCount: u.following?.length || 0,
    isFollowing: !!me?.following?.includes(userId),
  };
}

// ---- The authenticated user ---------------------------------------------

export interface MeUpdate {
  displayName?: string;
  email?: string;
  bio?: string;
  password?: string;
}

// Returns the ApiError rather than a bare boolean: the form has to show
// which field the backend rejected ({detail, code, fields}), and a silent
// failure here is exactly the class of bug this pass is undoing.
export async function updateMe(payload: MeUpdate): Promise<ApiError | null> {
  if (!apiEnabled) {
    const me: User | null = getItem('currentUser');
    if (me) updateRecord('users', me.id, payload as Partial<User>);
    return null;
  }
  const { error } = await apiRequest('/auth/me/', { method: 'PATCH', body: payload });
  return error;
}

// DELETE /auth/me/ — the account itself, not just the local session. Returns
// false when the server refused, so the caller can keep the user signed in
// and say so rather than logging them out of an account that still exists.
export async function deleteMe(): Promise<boolean> {
  if (!apiEnabled) {
    const me: User | null = getItem('currentUser');
    if (me) deleteRecord('users', me.id);
    return true;
  }
  const { error } = await apiRequest('/auth/me/', { method: 'DELETE' });
  return !error;
}

// ---- Artist review (support/admin) ---------------------------------------

interface BackendPendingArtist {
  id: string;
  stageName: string;
  email: string;
  portfolioUrl: string;
  createdAt: string;
}

// The pending-artist review queue, in the shape the support dashboard's
// table already renders (utils/types.ts User). Mock mode reads it straight
// off the seeded users, same as before this endpoint existed.
export async function loadPendingArtists(): Promise<User[]> {
  if (!apiEnabled) {
    const users: User[] = getItem('users') || [];
    return users.filter((u) => u.role === 'artist' && u.status === 'pending');
  }
  const rows = await fetchAll<BackendPendingArtist>('/artists/pending/');
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    role: 'artist',
    status: 'pending',
    stageName: r.stageName,
    portfolio: r.portfolioUrl,
  }));
}

export async function approveArtist(artist: User): Promise<boolean> {
  if (apiEnabled) {
    const { error } = await apiRequest(`/artists/${artist.id}/approve/`, { method: 'POST' });
    return !error;
  }
  updateRecord('users', artist.id, { status: 'active' });
  addRecord('notifications', {
    id: `n-${Date.now()}`,
    userId: artist.id,
    title: 'Artist account approved',
    message: 'You can now publish your work.',
    type: 'approval',
    isRead: false,
    createdAt: new Date().toISOString(),
  });
  return true;
}

export async function rejectArtist(artist: User, reason: string): Promise<boolean> {
  if (apiEnabled) {
    const { error } = await apiRequest(`/artists/${artist.id}/reject/`, {
      method: 'POST',
      body: { reason },
    });
    return !error;
  }
  updateRecord('users', artist.id, { status: 'rejected' });
  addRecord('notifications', {
    id: `n-${Date.now()}`,
    userId: artist.id,
    title: 'Artist application rejected',
    message: `Reason: ${reason || 'Did not meet requirements'}`,
    type: 'approval',
    isRead: false,
    createdAt: new Date().toISOString(),
  });
  return true;
}

export interface SampleWork {
  id: string;
  title: string;
  fileUrl?: string;
}

interface BackendSampleWork {
  id: string;
  title: string;
  file: string | null;
}

// Support-gated (GET /artists/{id}/sample-works/), so the review queue can
// judge submitted work directly rather than trusting an artist-supplied
// portfolio link. No mock-mode backing store — an offline demo shows no
// samples, same as it showed no portfolio-verification before.
export async function loadArtistSampleWorks(artistId: string): Promise<SampleWork[]> {
  if (!apiEnabled) return [];
  const rows = await fetchAll<BackendSampleWork>(`/artists/${artistId}/sample-works/`);
  return rows.map((r) => ({ id: r.id, title: r.title, fileUrl: mediaUrl(r.file) }));
}

// ---- User management (admin) ---------------------------------------------

// A row in the dashboard's Users tab. Admin-only, so unlike PublicProfile it
// carries the email and account status an admin manages the account by.
export interface ManagedUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: Role;
  status: string;
  tier: Tier;
  createdAt?: string;
}

interface BackendManagedUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: Role;
  status: string;
  tier: Tier;
  createdAt: string;
}

function mapManagedUser(u: BackendManagedUser): ManagedUser {
  return {
    id: u.id,
    email: u.email,
    username: u.username || '',
    displayName: u.displayName || '',
    role: u.role,
    status: u.status || 'active',
    tier: u.tier || 'basic',
    createdAt: u.createdAt,
  };
}

// The whole roster (GET /users/, admin-gated). Mock mode reads the seeded
// `users` collection so the offline demo still shows a populated table.
export async function loadUsers(): Promise<ManagedUser[]> {
  if (!apiEnabled) {
    const users: User[] = getItem('users') || [];
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      username: u.username || '',
      displayName: u.displayName || u.stageName || '',
      role: u.role,
      status: u.status || 'active',
      tier: u.tier || 'basic',
    }));
  }
  const rows = await fetchAll<BackendManagedUser>('/users/');
  return rows.map(mapManagedUser);
}

export interface NewUser {
  email: string;
  password: string;
  displayName?: string;
  role: Role;
  status?: string;
}

export interface UserMutationResult {
  user: ManagedUser | null;
  error: ApiError | null;
}

// POST /users/. Returns the ApiError so the form can show which field the
// backend rejected instead of failing silently.
export async function createUser(input: NewUser): Promise<UserMutationResult> {
  if (!apiEnabled) {
    const created: User = {
      id: `u-${Date.now()}`,
      email: input.email,
      password: input.password,
      role: input.role,
      status: (input.status || 'active') as User['status'],
      displayName: input.displayName,
      tier: input.role === 'listener' ? 'basic' : undefined,
    };
    addRecord('users', created);
    return {
      user: {
        id: created.id,
        email: created.email,
        username: '',
        displayName: input.displayName || '',
        role: input.role,
        status: created.status || 'active',
        tier: 'basic',
      },
      error: null,
    };
  }
  const { data, error } = await apiRequest<BackendManagedUser>('/users/', {
    method: 'POST',
    body: {
      email: input.email,
      password: input.password,
      displayName: input.displayName || '',
      role: input.role,
      status: input.status || 'active',
    },
  });
  return { user: data ? mapManagedUser(data) : null, error };
}

// PATCH /users/{id}/ — the role/status editor. Promoting someone to `artist`
// gets them an ArtistProfile server-side, so their tracks resolve a name.
export async function updateUser(
  userId: string,
  changes: { role?: Role; status?: string; displayName?: string }
): Promise<UserMutationResult> {
  if (!apiEnabled) {
    updateRecord('users', userId, changes as Partial<User>);
    const users: User[] = getItem('users') || [];
    const found = users.find((u) => u.id === userId);
    return {
      user: found
        ? {
            id: found.id,
            email: found.email,
            username: found.username || '',
            displayName: found.displayName || found.stageName || '',
            role: found.role,
            status: found.status || 'active',
            tier: found.tier || 'basic',
          }
        : null,
      error: null,
    };
  }
  const { data, error } = await apiRequest<BackendManagedUser>(`/users/${userId}/`, {
    method: 'PATCH',
    body: changes,
  });
  return { user: data ? mapManagedUser(data) : null, error };
}
