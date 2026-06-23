
// components/AccountingTable.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { getItem } from '../utils/localStorage';
import { Payout } from '../utils/types';

export default function AccountingTable() {
  const [payouts, setPayouts] = useState<Payout[]>([]);

  useEffect(() => {
    // Fetch payouts from localStorage
    const data = getItem('payouts') || [];
    setPayouts(data);
  }, []);

  return (
    <div className="bg-gray-900 p-6 rounded-lg text-white">
      <h2 className="text-xl font-bold mb-4">Monthly Artist Payouts</h2>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-gray-700 text-gray-400">
            <th className="p-2">Name</th>
            <th className="p-2">Unique Listeners</th>
            <th className="p-2">Streams</th>
            <th className="p-2">Amount</th>
            <th className="p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {payouts.map((p) => (
            <tr key={p.id} className="border-b border-gray-800">
              <td className="p-2">{p.artistName}</td>
              <td className="p-2">{p.listeners}</td>
              <td className="p-2">{p.streams}</td>
              <td className="p-2">${p.amount}</td>
              <td className={`p-2 font-bold ${p.status === 'paid' ? 'text-green-500' : 'text-yellow-500'}`}>
                {p.status}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}