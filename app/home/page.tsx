// app/home/page.tsx
'use client';

import React, { useEffect } from 'react';
import { initializeMockDatabase } from '../../utils/localStorage';
import TopSongsRow from '../../components/TopSongsRow';
import GoldEarlyAccess from '../../components/GoldEarlyAccess';
import RecommendationEngine from '../../components/RecommendationEngine';

export default function HomePage() {
  useEffect(() => {
    initializeMockDatabase();
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 pb-32">
      <h1 className="text-3xl font-bold mb-6">Home</h1>
      <GoldEarlyAccess />
      <TopSongsRow />
      <RecommendationEngine />
    </div>
  );
}
