// app/group/page.tsx
'use client';

import React, { useEffect } from 'react';
import { initializeMockDatabase } from '../../utils/localStorage';
import GroupSession from '../../components/GroupSession';

export default function GroupPage() {
  useEffect(() => {
    initializeMockDatabase();
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 p-8 flex justify-center">
      <GroupSession />
    </div>
  );
}
