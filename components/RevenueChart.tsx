// components/RevenueChart.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { getItem } from '../utils/localStorage';
import { RevenueData, User } from '../utils/types';

const TIER_COLORS: Record<string, string> = {
  basic: '#6b7280',
  silver: '#9ca3af',
  gold: '#eab308',
};

export default function RevenueChart() {
  const [data, setData] = useState<RevenueData[]>([]);
  const [tierCounts, setTierCounts] = useState<Record<string, number>>({ basic: 0, silver: 0, gold: 0 });

  useEffect(() => {
    const revenue = getItem('revenueData') || [];
    setData(revenue);

    const users: User[] = getItem('users') || [];
    const listeners = users.filter((u) => u.role === 'listener');
    const counts = { basic: 0, silver: 0, gold: 0 };
    listeners.forEach((u) => {
      const tier = u.tier || 'basic';
      counts[tier as 'basic' | 'silver' | 'gold'] += 1;
    });
    setTierCounts(counts);
  }, []);

  const maxAmount = Math.max(...data.map((d) => d.amount), 1);
  const currentMonthRevenue = data.length > 0 ? data[data.length - 1].amount : 0;
  const totalRevenue = data.reduce((sum, d) => sum + d.amount, 0);

  const totalListeners = tierCounts.basic + tierCounts.silver + tierCounts.gold;
  // Build pie slices as cumulative percentages around the circle.
  let cumulative = 0;
  const slices = (['basic', 'silver', 'gold'] as const).map((tier) => {
    const value = tierCounts[tier];
    const pct = totalListeners > 0 ? (value / totalListeners) * 100 : 0;
    const start = cumulative;
    cumulative += pct;
    return { tier, value, pct, start, end: cumulative };
  });

  const radius = 60;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="bg-gray-900 p-6 rounded-lg text-white space-y-8">
      <div>
        <h2 className="text-xl font-bold mb-4">Revenue overview</h2>
        {data.length === 0 ? (
          <p className="text-gray-500 italic">No revenue data yet.</p>
        ) : (
          <div className="flex items-end gap-4 h-48">
            {data.map((d, index) => (
              <div key={index} className="flex flex-col items-center gap-2 flex-1">
                <div
                  className="w-full bg-green-500 rounded-t"
                  style={{ height: `${(d.amount / maxAmount) * 100}%` }}
                ></div>
                <span className="text-xs text-gray-400">{d.month}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg">
          <p className="text-xs text-gray-400">This month's revenue</p>
          <p className="text-2xl font-bold">${currentMonthRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <p className="text-xs text-gray-400">Total revenue (period)</p>
          <p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold mb-4">Subscription tier distribution</h3>
        {totalListeners === 0 ? (
          <p className="text-gray-500 italic">No listener data yet.</p>
        ) : (
          <div className="flex items-center gap-8">
            <svg width="140" height="140" viewBox="0 0 140 140">
              <g transform="translate(70,70) rotate(-90)">
                {slices.map((s) => {
                  if (s.value === 0) return null;
                  const dash = (s.pct / 100) * circumference;
                  const offset = circumference - (s.start / 100) * circumference;
                  return (
                    <circle
                      key={s.tier}
                      r={radius}
                      fill="none"
                      stroke={TIER_COLORS[s.tier]}
                      strokeWidth="24"
                      strokeDasharray={`${dash} ${circumference - dash}`}
                      strokeDashoffset={offset}
                    />
                  );
                })}
              </g>
            </svg>
            <div className="space-y-2">
              {slices.map((s) => (
                <div key={s.tier} className="flex items-center gap-2 text-sm">
                  <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: TIER_COLORS[s.tier] }} />
                  <span className="capitalize">{s.tier}</span>
                  <span className="text-gray-400">
                    {s.value} ({Math.round(s.pct)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
