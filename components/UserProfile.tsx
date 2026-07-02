// components/UserProfile.tsx
'use client';

import React, { useEffect, useState } from 'react';
import {
  getItem,
  updateRecord,
  setItem,
  getDailyStreams,
  initializeMockDatabase,
} from '../utils/localStorage';
import { getCurrentUser, getTier } from '../utils/auth';
import { toggleFollow } from '../utils/follow';
import { useAuth } from '../context/AuthContext';
import { User } from '../utils/types';
import { Avatar, Badge, Button, EmptyState, Input, Spinner } from './ui';

interface UserProfileProps {
  userId: string;
}

export default function UserProfile({ userId }: UserProfileProps) {
  const { refresh } = useAuth();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [viewer, setViewer] = useState<User | null>(null);
  const [dailyStreams, setDailyStreams] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);

  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    // Seed defensively: React runs this child effect before the parent
    // page / AuthProvider effect, so on a direct load the collections may
    // not exist yet. initializeMockDatabase is a no-op once seeded.
    initializeMockDatabase();

    const users: User[] = getItem('users') || [];
    const found = users.find((u) => u.id === userId) || null;
    const current = getCurrentUser();

    setProfileUser(found);
    setNotFound(!found);
    setViewer(current);
    setDailyStreams(getDailyStreams(userId));
    setIsFollowing(!!current?.following?.includes(userId));
    if (found) {
      setDisplayName(found.displayName || '');
      setEmail(found.email || '');
    }
  }, [userId]);

  if (notFound) {
    return (
      <div className="p-10">
        <EmptyState icon="🙈" title="User not found" description={`No user exists with id "${userId}".`} />
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="p-10 flex items-center justify-center">
        <Spinner size={32} label="Loading profile…" />
      </div>
    );
  }

  const tier = getTier(profileUser);
  const isSelf = viewer?.id === profileUser.id;
  const canChangeAvatar = tier !== 'basic';

  const save = () => {
    updateRecord('users', profileUser.id, { displayName, email });
    const updated = { ...profileUser, displayName, email };
    setProfileUser(updated);
    if (isSelf) {
      setItem('currentUser', updated);
      refresh();
    }
    setEditing(false);
  };

  const handleFollowToggle = () => {
    if (!viewer) return;
    const result = toggleFollow(viewer, profileUser.id, profileUser.followers || 0);
    setIsFollowing(result.isFollowing);
    setProfileUser({ ...profileUser, followers: result.followers });
    setViewer({ ...viewer, following: result.following });
  };

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center gap-6 mb-8">
        <Avatar src={profileUser.cover} name={profileUser.displayName || profileUser.email} size={96} />
        <div>
          <h1 className="text-3xl font-bold">{profileUser.displayName || 'Listener'}</h1>
          <p className="text-muted">@{profileUser.username || profileUser.id}</p>
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

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-surface-2 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold">{(profileUser.followers || 0).toLocaleString()}</p>
          <p className="text-muted text-sm">Followers</p>
        </div>
        <div className="bg-surface-2 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold">{profileUser.following?.length || 0}</p>
          <p className="text-muted text-sm">Following</p>
        </div>
        <div className="bg-surface-2 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold">{dailyStreams.toLocaleString()}</p>
          <p className="text-muted text-sm">Streams today</p>
        </div>
      </div>

      {isSelf ? (
        editing ? (
          <div className="space-y-3 bg-surface-2 p-6 rounded-lg">
            <Input label="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <div>
              <label className="block text-sm font-bold mb-1">Profile photo</label>
              {canChangeAvatar ? (
                <input type="file" accept="image/*" className="text-sm" />
              ) : (
                <p className="text-muted text-sm">Upgrade to silver or gold to change your profile photo.</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={save}>Save</Button>
              <Button variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => setEditing(true)}>Edit profile</Button>
        )
      ) : (
        <Button variant={isFollowing ? 'secondary' : 'primary'} onClick={handleFollowToggle}>
          {isFollowing ? 'Following' : 'Follow'}
        </Button>
      )}
    </div>
  );
}
