import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { DashboardData } from '../types';

type TabId = 'oi' | 'gamma' | 'vega' | 'delta' | 'theta' | 'rho';

interface OpenInterestTabsProps {
  data: DashboardData | null;
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'oi', label: '持仓量' },
  { id: 'gamma', label: '伽马' },
  { id: 'vega', label: '维加' },
  { id: 'delta', label: '德尔塔' },
  { id: 'theta', label: '西塔' },
  { id: 'rho', label: '罗' },
];

export default function OpenInterestTabs({ data }: OpenInterestTabsProps) {
  const [tab, setTab] = useState<TabId>('oi');

  if (!data) {
    return (
      <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800">持仓量</h2>
        <p className="text-gray-500 text-sm">加载标的后按维度查看。</p>
      </section>
    );
  }

  const getChartData = () => {
    return data.byStrike.map((r) => {
      const callVega = r.callVega ?? 0;
      const putVega = r.putVega ?? 0;
      const callDelta = r.callDelta ?? 0;
      const putDelta = r.putDelta ?? 0;
      const callTheta = r.callTheta ?? 0;
      const putTheta = r.putTheta ?? 0;
      return {
        strike: r.strike,
        call: tab === 'oi' ? r.callOi : tab === 'gamma' ? r.callGex / 1e6 : tab === 'vega' ? callVega : tab === 'delta' ? callDelta : tab === 'theta' ? callTheta : 0,
        put: tab === 'oi' ? -r.putOi : tab === 'gamma' ? -r.putGex / 1e6 : tab === 'vega' ? -putVega : tab === 'delta' ? -putDelta : tab === 'theta' ? -putTheta : 0,
      };
    });
  };

  const chartData = getChartData();
  const totalOi = data.callOi + data.putOi;
  const strikeCount = data.byStrike.length;
  const avgOiPerStrike = strikeCount > 0 ? Math.round(totalOi / strikeCount) : 0;
  const putCallOi = data.putCallOiRatio.toFixed(2);

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800">持仓量</h2>
      <div className="flex flex-wrap gap-1 mb-2">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-2 py-1 rounded text-sm ${tab === id ? 'bg-blue-100 text-blue-800 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="text-xs text-gray-500 mb-1">
        到期: {data.expiration} · 行权价数: {strikeCount} · P/C 持仓比: {putCallOi}
      </div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="strike" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <ReferenceLine x={data.spot} stroke="#374151" strokeDasharray="4 2" />
            <Bar dataKey="call" fill="#22c55e" name="看涨" radius={[2, 2, 0, 0]} />
            <Bar dataKey="put" fill="#ef4444" name="看跌" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-gray-500 mt-1">
        总持仓 {(totalOi / 1000).toFixed(1)}K · 每行权价均持仓约 {avgOiPerStrike >= 1000 ? (avgOiPerStrike / 1000).toFixed(1) + 'K' : avgOiPerStrike}
      </p>
    </section>
  );
}
