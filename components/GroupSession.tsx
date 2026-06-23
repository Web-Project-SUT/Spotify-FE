// components/GroupSession.tsx
'use client';
import React, { useState } from 'react';
import { getItem, setItem } from '../utils/localStorage';
import { GroupSessionData } from '../utils/types'; // Import renamed interface

export default function GroupSession() {
  const [session, setSession] = useState<GroupSessionData | null>(null); // Use renamed interface

  const createGroup = () => {
    const newSession: GroupSessionData = { // Use renamed interface
      id: Math.random().toString(36).substring(7),
      hostId: 'current-user',
      members: ['current-user'],
      isPlaying: false,
      progress: 0,
    };
    setItem('groupSession', newSession);
    setSession(newSession);
  };


  const toggleSync = () => {
    if (!session) return;
    const updated = { ...session, isPlaying: !session.isPlaying };
    setItem('groupSession', updated);
    setSession(updated);
  };

  return (
    <div className="bg-gray-900 p-6 rounded-lg text-white border border-gray-700">
      <h2 className="text-xl font-bold mb-4">Group Session</h2>
      {!session ? (
        <button onClick={createGroup} className="bg-green-600 px-4 py-2 rounded">Create Group</button>
      ) : (
        <div>
          <p className="mb-2">Session ID: {session.id}</p>
          <p className="mb-4">Members: {session.members.length}</p>
          <button onClick={toggleSync} className="bg-blue-600 px-4 py-2 rounded">
            {session.isPlaying ? 'Pause Sync' : 'Play Sync'}
          </button>
        </div>
      )}
    </div>
  );
}