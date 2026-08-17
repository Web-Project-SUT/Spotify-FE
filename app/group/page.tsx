// app/group/page.tsx
'use client';
import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AppShell from '../../components/AppShell';
import GroupSession from '../../components/GroupSession';
import { useLanguage } from '../../context/LanguageContext';

function GroupPageContent() {
  const { t } = useLanguage();
  const params = useSearchParams();
  const inviteId = params.get('invite') || undefined;
  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-6">{t('group.title')}</h1>
      <GroupSession inviteId={inviteId} />
    </div>
  );
}

export default function GroupPage() {
  return (
    <AppShell allow={['listener']}>
      <Suspense fallback={null}>
        <GroupPageContent />
      </Suspense>
    </AppShell>
  );
}
