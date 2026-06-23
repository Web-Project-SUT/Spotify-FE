// components/GoldEarlyAccess.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { getItem } from '../utils/localStorage';

export default function GoldEarlyAccess() {
  const [isGoldUser, setIsGoldUser] = useState(false);

  useEffect(() => {
    // Check the current logged-in user's role
    const currentUser = getItem('currentUser');
    if (currentUser && currentUser.role === 'gold') {
      setIsGoldUser(true);
    }
  }, []);

  if (!isGoldUser) {
    return (
      <div className="bg-gradient-to-r from-yellow-600 to-yellow-400 p-6 rounded-xl text-black my-8 flex flex-col items-center shadow-lg">
        <h2 className="text-2xl font-extrabold mb-2">Unlock Early Access! 🌟</h2>
        <p className="mb-4 font-medium">Upgrade to Gold to listen to exclusive new releases before anyone else.</p>
        <button className="bg-black text-white px-8 py-3 rounded-full font-bold hover:bg-gray-800 transition shadow-md">
          Upgrade to Gold
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-yellow-500 p-6 rounded-xl text-white my-8 shadow-lg">
      <h2 className="text-2xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
        <span>🌟</span> Gold Early Access
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[1, 2, 3, 4].map((num) => (
          <div key={num} className="bg-black p-4 rounded-lg flex flex-col items-center justify-center hover:bg-gray-800 transition cursor-pointer">
            <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center text-2xl mb-3 shadow-inner">
              💿
            </div>
            <p className="text-sm font-bold">Secret Track {num}</p>
            <p className="text-xs text-yellow-500">Unreleased</p>
          </div>
        ))}
      </div>
    </div>
  );
}