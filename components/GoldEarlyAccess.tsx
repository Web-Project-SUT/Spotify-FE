// components/GoldEarlyAccess.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getItem } from '../utils/localStorage';
import { Song } from '../utils/types';
import { isGoldUser } from '../utils/auth';
import { useLanguage } from '../context/LanguageContext';

export default function GoldEarlyAccess() {
  const router = useRouter();
  const { t } = useLanguage();
  const [isGold, setIsGold] = useState(false);
  const [earlyAccessSongs, setEarlyAccessSongs] = useState<Song[]>([]);

  useEffect(() => {
    setIsGold(isGoldUser());

    // Early access songs are simply the most recently released tracks,
    // surfaced here before they appear anywhere else for non-gold users.
    const allSongs: Song[] = getItem('songs') || [];
    const newest = [...allSongs]
      .sort((a, b) => (b.year || 0) - (a.year || 0))
      .slice(0, 4);
    setEarlyAccessSongs(newest);
  }, []);

  if (!isGold) {
    return (
      <div className="bg-gradient-to-r from-yellow-600 to-yellow-400 p-6 rounded-xl text-black my-8 flex flex-col items-center shadow-lg">
        <h2 className="text-2xl font-extrabold mb-2">{t('home.unlockEarlyAccess')}</h2>
        <p className="mb-4 font-medium text-center">{t('home.unlockEarlyAccessDesc')}</p>
        <button
          onClick={() => router.push('/settings')}
          className="bg-black text-white px-8 py-3 rounded-full font-bold hover:bg-gray-800 transition shadow-md"
        >
          {t('home.upgradeToGold')}
        </button>
      </div>
    );
  }

  if (earlyAccessSongs.length === 0) {
    return (
      <div className="bg-gray-900 border border-yellow-500 p-6 rounded-xl text-gray-400 my-8 shadow-lg">
        {t('home.noEarlyAccessTracks')}
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-yellow-500 p-6 rounded-xl text-white my-8 shadow-lg">
      <h2 className="text-2xl font-bold text-yellow-400 mb-4">{t('home.goldEarlyAccess')}</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {earlyAccessSongs.map((song) => (
          <div
            key={song.id}
            className="bg-black p-4 rounded-lg flex flex-col items-center justify-center hover:bg-gray-800 transition cursor-pointer"
          >
            <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center text-2xl mb-3 shadow-inner">
              {song.cover || '💿'}
            </div>
            <p className="text-sm font-bold text-center truncate w-full">{song.title}</p>
            <p className="text-xs text-yellow-500">{t('home.newRelease')}</p>
          </div>
        ))}
      </div>
    </div>
  );
}