import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { DashboardData } from '../types';

interface CumulativeGexProps {
  data: DashboardData | null;
}

export default function CumulativeGex({ data }: CumulativeGexProps) {
  if (!data) {
    return (
      <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800">累计 Gamma 敞口</h2>
        <p className="text-gray-500 text-sm">加载标的后显示累计 GEX。</p>
      </section>
    );
  }

  let cumCall = 0;
  let cumPut = 0;
  const chartData = data.byStrike.map((row) => {
    cumCall += row.callGex;
    cumPut += row.putGex;
    return {
      strike: row.strike,
      cumCall: cumCall / 1e6,
      cumPut: cumPut / 1e6,
    };
  });

  const maxCum = Math.max(...chartData.map((d) => Math.max(d.cumCall, Math.abs(d.cumPut))), 0);
  const yDomain = maxCum === 0 ? [0, 1] : ['auto', 'auto'];

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm h-full flex flex-col">
      <h2 className="text-lg font-semibold text-gray-800">累计 Gamma 敞口</h2>
      <p className="text-gray-500 text-base mb-3">
        按行权价累计的正负 Gamma 敞口；绿=做市商正 Gamma（抑制波动），红=负 Gamma（放大波动）。
        {maxCum === 0 && <span className="text-amber-600"> 当前数据无 GEX。</span>}
      </p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="strike" tick={{ fontSize: 12 }} />
            <YAxis domain={yDomain} tick={{ fontSize: 12 }} tickFormatter={(v) => v + 'M'} />
            <Tooltip formatter={(v: number) => v.toFixed(2) + 'M'} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="cumCall" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.5} name="累计 Call GEX" />
            <Area type="monotone" dataKey="cumPut" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.5} name="累计 Put GEX" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
