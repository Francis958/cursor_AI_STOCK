import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { DashboardData } from '../types';

interface SeasonedBreakdownProps {
  data: DashboardData | null;
}

/** Seasoned View (Breakdown)：净 Gamma 流 / 真实 underlying gamma flow */
export default function SeasonedBreakdown({ data }: SeasonedBreakdownProps) {
  if (!data) {
    return (
      <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800">净 Gamma 流（分拆）</h2>
        <p className="text-gray-500 text-sm">加载标的后显示净 gamma 流。</p>
      </section>
    );
  }

  const chartData = data.byStrike.map((r) => ({
    strike: r.strike,
    netGex: r.netGex / 1e6,
    callGex: r.callGex / 1e6,
    putGex: r.putGex / 1e6,
  }));

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800">净 Gamma 流（分拆）</h2>
      <p className="text-gray-500 text-sm mb-3">
        按行权价的 Call/Put Gamma 敞口，反映做市商真实头寸。
      </p>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="strike" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => v + 'M'} />
            <Tooltip formatter={(v: number) => v.toFixed(2) + 'M'} />
            <ReferenceLine x={data.spot} stroke="#374151" strokeDasharray="4 2" />
            <Area type="monotone" dataKey="callGex" stroke="#22c55e" fill="#22c55e" fillOpacity={0.4} name="Call GEX" />
            <Area type="monotone" dataKey="putGex" stroke="#ef4444" fill="#ef4444" fillOpacity={0.4} name="Put GEX" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
