'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  data: { month: string; amount: number }[];
}

export default function EarningsChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#B8860B" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#B8860B" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,12,10,0.06)" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'rgba(14,12,10,0.4)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'rgba(14,12,10,0.4)' }} axisLine={false} tickLine={false}
          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
        <Tooltip
          formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Net Earnings']}
          contentStyle={{ background: 'var(--ink)', border: 'none', borderRadius: '8px', color: 'var(--cream)', fontSize: '12px' }}
        />
        <Area type="monotone" dataKey="amount" stroke="#B8860B" strokeWidth={2} fill="url(#earningsGradient)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
