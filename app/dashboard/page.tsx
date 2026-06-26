// app/dashboard/page.tsx
'use client';
import React from 'react';
import AppShell from '../../components/AppShell';
import { useAuth } from '../../context/AuthContext';
import AccountingTable from '../../components/AccountingTable';
import RevenueChart from '../../components/RevenueChart';
import PriceControl from '../../components/PriceControl';

function DashboardContent() {
  const { user } = useAuth();
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold">Admin dashboard</h1>
      <PriceControl />
      <AccountingTable currentRole={user?.role} />
      <RevenueChart />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AppShell allow={['admin']}>
      <DashboardContent />
    </AppShell>
  );
}
