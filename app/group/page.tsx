// app/group/page.tsx
'use client';
import React from 'react';
import AppShell from '../../components/AppShell';
import GroupSession from '../../components/GroupSession';
import { useLanguage } from '../../context/LanguageContext';

function GroupPageContent() {
  const { t } = useLanguage();
  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-6">{t('group.title')}</h1>
      <GroupSession />
    </div>
  );
}

export default function GroupPage() {
  return (
    <AppShell allow={['listener']}>
      <GroupPageContent />
    </AppShell>
  );
}
