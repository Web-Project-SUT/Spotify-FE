// app/profile/page.tsx
'use client';
import React, { useState } from 'react';
import AppShell from '../../components/AppShell';
import { useAuth } from '../../context/AuthContext';
import { updateRecord, setItem } from '../../utils/localStorage';
import { getTier } from '../../utils/auth';
import { Avatar, Badge, Button, Input } from '../../components/ui';

function ProfileContent() {
  const { user, refresh } = useAuth();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');

  if (!user) return null;
  const tier = getTier(user);
  const canChangeAvatar = tier !== 'basic';

  const save = () => {
    const updated = { ...user, displayName, email };
    updateRecord('users', user.id, { displayName, email });
    setItem('currentUser', updated);
    refresh();
    setEditing(false);
  };

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-6 mb-8">
        <Avatar src={user.cover} name={user.displayName || user.email} size={96} />
        <div>
          <h1 className="text-3xl font-bold">{user.displayName || 'Listener'}</h1>
          <p className="text-muted">@{user.username || user.id}</p>
          <div className="mt-2">
            {tier === 'gold' ? <Badge tone="gold">Gold</Badge> : tier === 'silver' ? <Badge tone="silver">Silver</Badge> : <Badge>Free</Badge>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-surface-2 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold">{user.followers || 0}</p>
          <p className="text-muted text-sm">Followers</p>
        </div>
        <div className="bg-surface-2 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold">{user.following?.length || 0}</p>
          <p className="text-muted text-sm">Following</p>
        </div>
        <div className="bg-surface-2 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold">0</p>
          <p className="text-muted text-sm">Streams today</p>
        </div>
      </div>

      {editing ? (
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
            <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button onClick={() => setEditing(true)}>Edit profile</Button>
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AppShell allow={['listener']}>
      <ProfileContent />
    </AppShell>
  );
}
