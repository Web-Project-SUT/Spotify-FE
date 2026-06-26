// components/GroupSession.tsx
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { getItem, setItem } from '../utils/localStorage';
import { GroupSessionData, Song } from '../utils/types';
import { getCurrentUser } from '../utils/auth';

// Phase 1 simulates "real-time" group listening across browser tabs via
// the localStorage 'storage' event. In Phase 2 this is replaced by a real
// WebSocket channel so sync works across different devices/users.
const SESSION_KEY = 'groupSession';

export default function GroupSession() {
  const [session, setSession] = useState<GroupSessionData | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Load current user and any existing session, and subscribe to changes
  // made by other tabs so playback state stays in sync.
  useEffect(() => {
    const user = getCurrentUser();
    const id = user?.id || `guest-${Math.random().toString(36).slice(2, 8)}`;
    setUserId(id);
    setSession(getItem(SESSION_KEY));

    const onStorage = (e: StorageEvent) => {
      if (e.key === SESSION_KEY) {
        setSession(e.newValue ? JSON.parse(e.newValue) : null);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const persist = useCallback((next: GroupSessionData | null) => {
    setSession(next);
    if (next) setItem(SESSION_KEY, next);
    else {
      if (typeof window !== 'undefined') localStorage.removeItem(SESSION_KEY);
    }
  }, []);

  const createGroup = () => {
    const newSession: GroupSessionData = {
      id: Math.random().toString(36).slice(2, 9),
      hostId: userId,
      members: [userId],
      isPlaying: false,
      progress: 0,
    };
    persist(newSession);
  };

  const joinGroup = () => {
    if (!session) return;
    if (session.members.includes(userId)) return;
    persist({ ...session, members: [...session.members, userId] });
  };

  const leaveGroup = () => {
    if (!session) return;
    const remaining = session.members.filter((m) => m !== userId);
    // When the last member leaves, the group is destroyed.
    if (remaining.length === 0) {
      persist(null);
      return;
    }
    // If the host leaves, hand off hosting to the next member.
    const nextHost = session.hostId === userId ? remaining[0] : session.hostId;
    persist({ ...session, members: remaining, hostId: nextHost });
  };

  const togglePlay = () => {
    if (!session) return;
    // Any member can control playback; the change broadcasts to everyone.
    persist({ ...session, isPlaying: !session.isPlaying });
  };

  const playCurrentTrack = () => {
    if (!session) return;
    const track: Song | null = getItem('currentTrack');
    persist({ ...session, currentSongId: track?.id, isPlaying: true, progress: 0 });
  };

  const copyInvite = () => {
    if (!session) return;
    const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/group?invite=${session.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const isMember = !!session && session.members.includes(userId);
  const isHost = !!session && session.hostId === userId;

  return (
    <div className="bg-gray-900 p-6 rounded-lg text-white border border-gray-700 max-w-md">
      <h2 className="text-xl font-bold mb-4">Group session</h2>

      {!session ? (
        <button onClick={createGroup} className="bg-green-600 px-4 py-2 rounded font-bold">
          Create group
        </button>
      ) : (
        <div className="space-y-4">
          <div className="text-sm">
            <p className="text-gray-400">Session ID: <span className="text-white">{session.id}</span></p>
            <p className="text-gray-400">Members: <span className="text-white">{session.members.length}</span></p>
            <p className="text-gray-400">
              Playback:{' '}
              <span className={session.isPlaying ? 'text-green-400' : 'text-yellow-400'}>
                {session.isPlaying ? 'Playing' : 'Paused'}
              </span>
            </p>
            {isHost && <span className="text-xs text-indigo-400">You are the host</span>}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyInvite}
              className="text-xs bg-gray-700 px-3 py-2 rounded hover:bg-gray-600"
            >
              {copied ? 'Copied!' : 'Copy invite link'}
            </button>
          </div>

          {isMember ? (
            <div className="flex flex-wrap gap-2">
              <button onClick={togglePlay} className="bg-blue-600 px-4 py-2 rounded text-sm">
                {session.isPlaying ? 'Pause for all' : 'Play for all'}
              </button>
              <button onClick={playCurrentTrack} className="bg-indigo-600 px-4 py-2 rounded text-sm">
                Share current track
              </button>
              <button onClick={leaveGroup} className="bg-red-600 px-4 py-2 rounded text-sm">
                Leave group
              </button>
            </div>
          ) : (
            <button onClick={joinGroup} className="bg-green-600 px-4 py-2 rounded text-sm">
              Join group
            </button>
          )}
        </div>
      )}
    </div>
  );
}
