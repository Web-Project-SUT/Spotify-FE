// components/AccountingTable.tsx
'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { Payout, Role } from '../utils/types';
import { generatePayouts, loadPayouts, settlePayout } from '../utils/resources/reports';
import { apiEnabled } from '../utils/api';

interface AccountingTableProps {
  // Per spec, the settle action is restricted to the admin; support
  // agents can view the same table read-only.
  currentRole?: Role;
}

// YYYY-MM, the format both <input type="month"> and the backend's ?period=
// filter speak.
function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function AccountingTable({ currentRole }: AccountingTableProps) {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [period, setPeriod] = useState(currentPeriod);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSettle = currentRole === 'admin';

  // In mock mode loadPayouts ignores the period and returns the whole seeded
  // collection, exactly as this component always did.
  const refresh = useCallback(async () => {
    setPayouts(await loadPayouts(apiEnabled ? period : undefined));
  }, [period]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleSettle = async (id: string) => {
    setError(null);
    const settled = await settlePayout(id);
    if (apiEnabled && !settled) {
      setError('Could not settle that payout. Please try again.');
      return;
    }
    setPayouts((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'paid' } : p)));
  };

  // Aggregates the month's recorded streams into payout rows server-side —
  // the spec forbids computing these numbers in the frontend.
  const handleGenerate = async () => {
    setBusy(true);
    setError(null);
    const result = await generatePayouts(period);
    if (!result) setError('Could not generate payouts for this period.');
    else await refresh();
    setBusy(false);
  };

  return (
    <div className="bg-gray-900 p-6 rounded-lg text-white">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-bold">Monthly artist payouts</h2>
        {apiEnabled && (
          <div className="flex items-center gap-2">
            <label htmlFor="payout-period" className="text-sm text-gray-400">
              Period
            </label>
            <input
              id="payout-period"
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-gray-800 text-sm rounded px-2 py-1"
            />
            {canSettle && (
              <button
                onClick={handleGenerate}
                disabled={busy}
                className="text-xs bg-blue-600 px-3 py-1 rounded font-bold disabled:opacity-50"
              >
                {busy ? 'Generating…' : 'Generate payouts'}
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-400 mb-4">
          {error}
        </p>
      )}

      {payouts.length === 0 ? (
        <p className="text-gray-500 italic">No payout records for this month yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
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
                  <td className="p-2 whitespace-nowrap">{p.artistName}</td>
                  <td className="p-2 whitespace-nowrap">{p.listeners.toLocaleString()}</td>
                  <td className="p-2 whitespace-nowrap">{p.streams.toLocaleString()}</td>
                  <td className="p-2 whitespace-nowrap">${p.amount.toLocaleString()}</td>
                  <td className={`p-2 whitespace-nowrap font-bold ${p.status === 'paid' ? 'text-green-500' : 'text-yellow-500'}`}>
                    {p.status}
                  </td>
                  {canSettle && (
                    <td className="p-2 whitespace-nowrap">
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
        </div>
      )}
    </div>
  );
}
