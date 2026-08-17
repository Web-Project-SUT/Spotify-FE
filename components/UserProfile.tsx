// components/UserProfile.tsx
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { getItem, setItem, initializeMockDatabase } from '../utils/localStorage';
import { getCurrentUser } from '../utils/auth';
import { toggleFollow } from '../utils/follow';
import { apiEnabled } from '../utils/api';
import { PublicProfile, loadUserProfile, updateMe } from '../utils/resources/accounts';
import { loadListeningStats } from '../utils/resources/reports';
import { uploadAvatar } from '../utils/resources/uploads';
import { useAuth } from '../context/AuthContext';
import { User } from '../utils/types';
import { Avatar, Badge, Button, EmptyState, Input, Spinner } from './ui';

interface UserProfileProps {
  userId: string;
}

export default function UserProfile({ userId }: UserProfileProps) {
  const { refresh, refreshMe } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [viewer, setViewer] = useState<User | null>(null);
  // null = "not applicable" (another user's daily streams are nobody
  // else's business, and the backend correctly exposes no endpoint for it).
  const [dailyStreams, setDailyStreams] = useState<number | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);

  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    // Seed defensively: React runs this child effect before the parent
    // page / AuthProvider effect, so on a direct load the collections may
    // not exist yet. initializeMockDatabase is a no-op once seeded.
    initializeMockDatabase();

    const current = getCurrentUser();
    setViewer(current);

    const found = await loadUserProfile(userId);
    setProfile(found);
    setNotFound(!found);
    if (!found) return;

    setIsFollowing(found.isFollowing);
    setDisplayName(found.displayName || '');
    // The public projection deliberately omits email; the viewer's own
    // address comes from the session they are already holding.
    setEmail(current?.id === found.id ? current?.email || '' : '');

    // Streams-today is a self-only number, and it is aggregated by the
    // backend — doc.tex forbids counting it in the frontend.
    if (current?.id === found.id) {
      const stats = await loadListeningStats();
      setDailyStreams(stats ? stats.streamsToday : 0);
    } else {
      setDailyStreams(null);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (notFound) {
    return (
      <div className="p-4 sm:p-6 md:p-10">
        <EmptyState icon="🙈" title="User not found" description={`No user exists with id "${userId}".`} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-4 sm:p-6 md:p-10 flex items-center justify-center">
        <Spinner size={32} label="Loading profile…" />
      </div>
    );
  }

  const tier = profile.tier;
  const isSelf = viewer?.id === profile.id;
  const canChangeAvatar = tier !== 'basic';

  const save = async () => {
    if (password && password !== confirmPassword) {
      setPwError('Passwords do not match');
      return;
    }
    setPwError('');
    setSaveError('');

    const payload = { displayName, email, ...(password ? { password } : {}) };
    const error = await updateMe(payload);
    if (error) {
      // The backend names the offending field in `fields`; fall back to the
      // normalized detail so nothing fails silently.
      const first = error.fields && Object.values(error.fields)[0]?.[0];
      setSaveError(first || error.detail);
      return;
    }

    setProfile({ ...profile, displayName });
    if (isSelf) {
      if (apiEnabled) {
        await refreshMe();
      } else {
        setItem('currentUser', { ...(getItem('currentUser') || {}), displayName, email });
        refresh();
      }
    }
    setPassword('');
    setConfirmPassword('');
    setEditing(false);
  };

  const cancelEdit = () => {
    setPassword('');
    setConfirmPassword('');
    setPwError('');
    setSaveError('');
    setEditing(false);
  };

  const startEdit = () => {
    setPassword('');
    setConfirmPassword('');
    setPwError('');
    setSaveError('');
    setEditing(true);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError('');
    setUploading(true);
    const ok = await uploadAvatar(file);
    setUploading(false);
    if (!ok) {
      setAvatarError('Could not upload that photo. Please try another file.');
      return;
    }
    // The stored path is decided server-side, so re-read rather than guess.
    await load();
    await refreshMe();
  };

  const handleFollowToggle = async () => {
    if (!viewer) return;
    const result = await toggleFollow(viewer, profile.id, profile.followerCount, isFollowing);
    setIsFollowing(result.isFollowing);
    setProfile({ ...profile, followerCount: result.followers });
    setViewer({ ...viewer, following: result.following });
  };

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center gap-6 mb-8">
        <Avatar src={profile.avatar} name={profile.displayName || profile.username} size={96} />
        <div>
          <h1 className="text-3xl font-bold">{profile.displayName || 'Listener'}</h1>
          <p className="text-muted">@{profile.username || profile.id}</p>
          <div className="mt-2">
            {tier === 'gold' ? (
              <Badge tone="gold">Gold</Badge>
            ) : tier === 'silver' ? (
              <Badge tone="silver">Silver</Badge>
            ) : (
              <Badge>Free</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-8">
        <div className="bg-surface-2 p-2 sm:p-4 rounded-lg text-center">
          <p className="text-lg sm:text-2xl font-bold">{profile.followerCount.toLocaleString()}</p>
          <p className="text-muted text-xs sm:text-sm">Followers</p>
        </div>
        <div className="bg-surface-2 p-2 sm:p-4 rounded-lg text-center">
          <p className="text-lg sm:text-2xl font-bold">{profile.followingCount.toLocaleString()}</p>
          <p className="text-muted text-xs sm:text-sm">Following</p>
        </div>
        <div className="bg-surface-2 p-2 sm:p-4 rounded-lg text-center">
          <p className="text-lg sm:text-2xl font-bold">
            {dailyStreams === null ? '—' : dailyStreams.toLocaleString()}
          </p>
          <p className="text-muted text-xs sm:text-sm">Streams today</p>
        </div>
      </div>

      {isSelf ? (
        editing ? (
          <div className="space-y-3 bg-surface-2 p-6 rounded-lg">
            <Input
              label="Display name"
              name="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <Input label="Email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input
              label="New password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to keep current"
            />
            <Input
              label="Confirm new password"
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={pwError}
            />
            <div>
              <label htmlFor="avatar-upload" className="block text-sm font-bold mb-1">
                Profile photo
              </label>
              {canChangeAvatar ? (
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="text-sm"
                  disabled={uploading}
                  onChange={handleAvatarChange}
                />
              ) : (
                <p className="text-muted text-sm">Upgrade to silver or gold to change your profile photo.</p>
              )}
              {uploading && <p className="text-muted text-sm mt-1">Uploading…</p>}
              {avatarError && (
                <p role="alert" className="text-danger text-sm mt-1">
                  {avatarError}
                </p>
              )}
            </div>
            {saveError && (
              <p role="alert" className="text-danger text-sm">
                {saveError}
              </p>
            )}
            <div className="flex gap-2">
              <Button onClick={save}>Save</Button>
              <Button variant="ghost" onClick={cancelEdit}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={startEdit}>Edit profile</Button>
        )
      ) : (
        <Button variant={isFollowing ? 'secondary' : 'primary'} onClick={handleFollowToggle}>
          {isFollowing ? 'Following' : 'Follow'}
        </Button>
      )}
    </div>
  );
}
