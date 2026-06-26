// components/AccountingTable.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { getItem, updateRecord } from '../utils/localStorage';
import { Payout, Role } from '../utils/types';

interface AccountingTableProps {
  // Per spec, the settle action is restricted to the admin; support
  // agents can view the same table read-only.
  currentRole?: Role;
}

export default function AccountingTable({ currentRole }: AccountingTableProps) {
  const [payouts, setPayouts] = useState<Payout[]>([]);

  useEffect(() => {
    const data = getItem('payouts') || [];
    setPayouts(data);
  }, []);

  const canSettle = currentRole === 'admin';

  const handleSettle = (id: string) => {
    updateRecord('payouts', id, { status: 'paid' });
    setPayouts((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'paid' } : p)));
  };

  return (
    <div className="bg-gray-900 p-6 rounded-lg text-white">
      <h2 className="text-xl font-bold mb-4">Monthly artist payouts</h2>
      {payouts.length === 0 ? (
        <p className="text-gray-500 italic">No payout records for this month yet.</p>
      ) : (
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400">
              <th className="p-2">Name</th>
              <th className="p-2">Unique listeners</th>
              <th className="p-2">Streams</th>
              <th className="p-2">Amount</th>
              <th className="p-2">Status</th>
              {canSettle && <th className="p-2">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {payouts.map((p) => (
              <tr key={p.id} className="border-b border-gray-800">
                <td className="p-2">{p.artistName}</td>
                <td className="p-2">{p.listeners.toLocaleString()}</td>
                <td className="p-2">{p.streams.toLocaleString()}</td>
                <td className="p-2">${p.amount.toLocaleString()}</td>
                <td className={`p-2 font-bold ${p.status === 'paid' ? 'text-green-500' : 'text-yellow-500'}`}>
                  {p.status}
                </td>
                {canSettle && (
                  <td className="p-2">
                    {p.status === 'pending' ? (
                      <button
                        onClick={() => handleSettle(p.id)}
                        className="text-xs bg-green-600 px-3 py-1 rounded font-bold"
                      >
                        Confirm settlement
                      </button>
                    ) : (
                      <span className="text-xs text-gray-500">Settled</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
