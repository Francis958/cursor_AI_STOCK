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

interface BidAskSpreadLiquidityProps {
  data: DashboardData | null;
}

/** Bid-Ask Spread Liquidity：按行权价显示买卖价差 */
export default function BidAskSpreadLiquidity({ data }: BidAskSpreadLiquidityProps) {
  if (!data) {
    return (
      <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800">买卖价差与流动性</h2>
        <p className="text-gray-500 text-sm">加载标的后显示价差。</p>
      </section>
    );
  }

  const chartData = data.byStrike
    .filter((r) => (r.callSpread ?? r.putSpread) != null)
    .map((r) => ({
      strike: r.strike,
      callSpread: r.callSpread ?? 0,
      putSpread: -(r.putSpread ?? 0),
    }));

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800">买卖价差与流动性</h2>
      <p className="text-gray-500 text-sm mb-3">
        按行权价的买卖价差；价差越窄流动性越好。
      </p>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="strike" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: number) => v.toFixed(2)} />
            <ReferenceLine x={data.spot} stroke="#374151" strokeDasharray="4 2" />
            <Bar dataKey="callSpread" fill="#22c55e" name="看涨价差" radius={[2, 2, 0, 0]} />
            <Bar dataKey="putSpread" fill="#ef4444" name="看跌价差" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
