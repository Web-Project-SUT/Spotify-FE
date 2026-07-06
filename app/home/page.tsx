// app/home/page.tsx
'use client';

import React from 'react';
import AppShell from '../../components/AppShell';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Avatar } from '../../components/ui';
import TopSongsRow from '../../components/TopSongsRow';
import GoldEarlyAccess from '../../components/GoldEarlyAccess';
import RecommendationEngine from '../../components/RecommendationEngine';
import RecentPlaylistsRow from '../../components/RecentPlaylistsRow';
import LatestAlbumsRow from '../../components/LatestAlbumsRow';

function HomeContent() {
  const { user } = useAuth();
  const { t } = useLanguage();
  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center gap-3 mb-8">
        <Avatar src={user?.cover} name={user?.displayName || user?.stageName || user?.email} size={48} />
        <div>
          <p className="text-muted text-sm">{t('home.welcomeBack')}</p>
          <h1 className="text-2xl font-bold">{user?.displayName || user?.stageName || user?.email}</h1>
        </div>
      </div>
      <GoldEarlyAccess />
      <RecentPlaylistsRow />
      <LatestAlbumsRow />
      <TopSongsRow />
      <RecommendationEngine />
    </div>
  );
}

export default function HomePage() {
  return (
    <AppShell allow={['listener']}>
      <HomeContent />
    </AppShell>
  );
}
