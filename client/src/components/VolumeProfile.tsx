import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { DashboardData } from '../types';

interface VolumeProfileProps {
  data: DashboardData | null;
}

export default function VolumeProfile({ data }: VolumeProfileProps) {
  if (!data) {
    return (
      <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800">成交量分布</h2>
        <p className="text-gray-500 text-sm">加载标的后按行权价显示成交量。</p>
      </section>
    );
  }

  const byStrike = data.byStrike ?? [];
  const chartData = byStrike.map((row) => ({
    strike: row.strike,
    callVolume: Number(row.callVolume) || 0,
    putVolume: Number(row.putVolume) || 0,
  }));

  const maxVol = chartData.length
    ? Math.max(...chartData.flatMap((r) => [r.callVolume, r.putVolume]), 0)
    : 0;
  const hasVolume = maxVol > 0;
  const yDomain: [number, number] = [0, hasVolume ? Math.max(maxVol * 1.05, 1) : 1];

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800">成交量分布</h2>
      <p className="text-gray-500 text-base mb-3">
        按行权价的看涨/看跌成交量。
      </p>
      {!hasVolume && (
        <p className="text-amber-600 text-sm mb-2">
          暂无成交量数据（当前数据源未提供按行权价的成交量，或均为 0）。
        </p>
      )}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }} barCategoryGap="4%">
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="strike" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => (v >= 1000 ? v / 1000 + 'K' : String(v))} domain={yDomain} />
            <Tooltip formatter={(v: number) => (v >= 1000 ? v / 1000 + 'K' : v)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="callVolume" fill="#22c55e" name="看涨成交量" radius={[2, 2, 0, 0]} />
            <Bar dataKey="putVolume" fill="#ef4444" name="看跌成交量" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
