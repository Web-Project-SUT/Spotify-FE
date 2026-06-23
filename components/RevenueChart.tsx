// components/RevenueChart.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { getItem } from '../utils/localStorage';
import { RevenueData } from '../utils/types';

export default function RevenueChart() {
  const [data, setData] = useState<RevenueData[]>([]);

  useEffect(() => {
    const revenue = getItem('revenueData') || [
      { month: 'Jan', amount: 4000 },
      { month: 'Feb', amount: 3000 },
      { month: 'Mar', amount: 5000 },
      { month: 'Apr', amount: 2000 },
    ];
    setData(revenue);
  }, []);

  const maxAmount = Math.max(...data.map(d => d.amount));

  return (
    <div className="bg-gray-900 p-6 rounded-lg text-white">
      <h2 className="text-xl font-bold mb-6">Revenue Overview</h2>
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
    </div>
  );
}