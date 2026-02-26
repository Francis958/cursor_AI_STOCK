import { useState } from 'react';
import {
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import type { DashboardData, StrikeData } from '../types';

interface GreeksExposureProps {
  data: DashboardData | null;
}

type GreekKey = 'gamma' | 'vanna' | 'charm' | 'delta' | 'theta' | 'vega';

const GREEK_LABELS: Record<GreekKey, string> = {
  gamma: '伽马',
  vanna: 'Vanna',
  charm: 'Charm',
  delta: '德尔塔',
  theta: '西塔',
  vega: '维加',
};

function getNetForStrike(row: StrikeData, key: GreekKey): number {
  const mult = 100; // contract multiplier
  if (key === 'gamma') return row.netGex;
  if (key === 'delta')
    return (row.callDelta ?? 0) * row.callOi * mult + (row.putDelta ?? 0) * row.putOi * mult;
  const cap = key.charAt(0).toUpperCase() + key.slice(1);
  const cV = (row as unknown as Record<string, number>)[`call${cap}`] ?? 0;
  const pV = (row as unknown as Record<string, number>)[`put${cap}`] ?? 0;
  return cV * row.callOi * mult + pV * row.putOi * mult;
}

export default function GreeksExposure({ data }: GreeksExposureProps) {
  const [greek, setGreek] = useState<GreekKey>('gamma');

  if (!data) {
    return (
      <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800">Greeks 敞口</h2>
        <p className="text-gray-500 text-sm">加载标的后显示各希腊值敞口。</p>
      </section>
    );
  }

  const chartData = data.byStrike.map((row) => {
    const net = greek === 'gamma' ? row.netGex : getNetForStrike(row, greek);
    return {
      strike: row.strike,
      positive: net > 0 ? net : 0,
      negative: net < 0 ? net : 0,
      net,
    };
  });

  const posSum = chartData.reduce((s, d) => s + d.positive, 0);
  const negSum = chartData.reduce((s, d) => s + Math.abs(d.negative), 0);
  const netSum = chartData.reduce((s, d) => s + d.net, 0);
  const maxAbs = Math.max(posSum, negSum, 1);
  const yDomain = maxAbs <= 0 ? [0, 1] : ['auto', 'auto'];

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800">Greeks 敞口</h2>
      <p className="text-gray-500 text-base mb-3">
        按行权价的净敞口。正 = 做市商做空 Gamma（均值回归）。
        {posSum === 0 && negSum === 0 && <span className="text-amber-600"> 当前敞口为 0。</span>}
      </p>
      <div className="flex gap-2 mb-3 flex-wrap">
        {(Object.keys(GREEK_LABELS) as GreekKey[]).map((k) => (
          <button
            key={k}
            onClick={() => setGreek(k)}
            className={`px-3 py-1 rounded text-sm ${greek === k ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            {GREEK_LABELS[k]}
          </button>
        ))}
      </div>
      <div className="flex gap-4 text-sm text-gray-600 mb-2">
        <span>正: {posSum >= 1000 ? (posSum / 1000).toFixed(1) + 'K' : posSum.toFixed(0)}</span>
        <span>负: {negSum >= 1000 ? '-' + (negSum / 1000).toFixed(1) + 'K' : negSum.toFixed(0)}</span>
        <span>净: {netSum >= 1000 ? (netSum / 1000).toFixed(1) + 'K' : netSum.toFixed(0)}</span>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="strike" tick={{ fontSize: 12 }} />
            <YAxis domain={yDomain} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="positive" fill="#22c55e" name="正" radius={[2, 2, 0, 0]} />
            <Bar dataKey="negative" fill="#ef4444" name="负" radius={[2, 2, 0, 0]} />
            <Line type="monotone" dataKey="net" stroke="#f59e0b" name="净" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
