// app/dashboard/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { initializeMockDatabase } from '../../utils/localStorage';
import { getCurrentUser } from '../../utils/auth';
import AccountingTable from '../../components/AccountingTable';
import RevenueChart from '../../components/RevenueChart';
import { Role } from '../../utils/types';

export default function DashboardPage() {
  const [role, setRole] = useState<Role | undefined>(undefined);

  useEffect(() => {
    initializeMockDatabase();
    setRole(getCurrentUser()?.role);
  }, []);

  // Per spec: support sees tickets + artist approvals only; admin sees
  // everything including financials. This page covers the financial
  // half (accounting + revenue), so it only renders for admin.
  if (role && role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-8">
        <p className="text-gray-400">Financial dashboard is restricted to admin.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 space-y-8">
      <h1 className="text-3xl font-bold">Admin dashboard</h1>
      <AccountingTable currentRole={role} />
      <RevenueChart />
    </div>
  );
}
