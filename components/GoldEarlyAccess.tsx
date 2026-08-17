// components/GoldEarlyAccess.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Song } from '../utils/types';
import { loadSongs } from '../utils/resources/catalog';
import { isGoldUser } from '../utils/auth';
import { useLanguage } from '../context/LanguageContext';
import { CoverArt } from './ui';

export default function GoldEarlyAccess() {
  const router = useRouter();
  const { t } = useLanguage();
  const [isGold, setIsGold] = useState(false);
  const [earlyAccessSongs, setEarlyAccessSongs] = useState<Song[]>([]);

  useEffect(() => {
    setIsGold(isGoldUser());
    let active = true;
    void (async () => {
      // Ask the backend for the real early-access set (early_access_until in
      // the future) rather than approximating it by sorting the whole
      // catalog by year — a gold user should see exactly the embargoed
      // tracks, not just "whatever's newest".
      const songs: Song[] = await loadSongs({ earlyAccess: true });
      if (!active) return;
      setEarlyAccessSongs(songs.slice(0, 4));
    })();
    return () => {
      active = false;
    };
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
            <CoverArt
              cover={song.cover}
              fallback="💿"
              alt={song.title}
              className="w-16 h-16 bg-yellow-500 rounded-full text-2xl mb-3 shadow-inner"
            />
            <p className="text-sm font-bold text-center truncate w-full">{song.title}</p>
            <p className="text-xs text-yellow-500">{t('home.newRelease')}</p>
          </div>
        ))}
      </div>
    </div>
  );
}