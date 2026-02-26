import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { DashboardData } from '../types';

interface KeyLevelsProps {
  data: DashboardData | null;
}

function fmtOi(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

export default function KeyLevels({ data }: KeyLevelsProps) {
  if (!data) {
    return (
      <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800">关键水平</h2>
        <p className="text-gray-500 text-sm">加载标的后显示关键价位。</p>
      </section>
    );
  }

  const chartData = data.byStrike.map((row) => ({
    strike: row.strike,
    callOi: row.callOi,
    putOi: -row.putOi,
    spot: data.spot,
  }));

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm h-full flex flex-col">
      <h2 className="text-lg font-semibold text-gray-800">关键水平</h2>
      <p className="text-gray-500 text-base mb-3">
        由做市商 Gamma 敞口与持仓得出的支撑、阻力与震荡区间。
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <div className="bg-orange-100 rounded-lg p-3 border border-orange-200">
          <div className="text-sm font-medium text-orange-800 uppercase">Put 墙 / 支撑</div>
          <div className="text-xl font-bold text-orange-900">${data.putWallStrike}</div>
          <div className="text-sm text-orange-700">GEX: {data.putWallGex != null ? (data.putWallGex / 1e6).toFixed(1) : '—'}M</div>
        </div>
        <div className="bg-blue-100 rounded-lg p-3 border border-blue-200">
          <div className="text-sm font-medium text-blue-800 uppercase">Call 墙 / 阻力</div>
          <div className="text-xl font-bold text-blue-900">${data.callWallStrike}</div>
          <div className="text-sm text-blue-700">持仓: {data.callWallOi != null ? fmtOi(data.callWallOi) : '—'}</div>
        </div>
        <div className="bg-green-100 rounded-lg p-3 border border-green-200">
          <div className="text-sm font-medium text-green-800 uppercase">最大痛点</div>
          <div className="text-xl font-bold text-green-900">${data.maxPain}</div>
          <div className="text-sm text-green-700">到期易被吸引的价位</div>
        </div>
        <div className="bg-purple-100 rounded-lg p-3 border border-purple-200">
          <div className="text-sm font-medium text-purple-800 uppercase">Gamma 翻转</div>
          <div className="text-xl font-bold text-purple-900">${data.gammaFlipStrike}</div>
          <div className="text-sm text-purple-700">正 Gamma 区间</div>
        </div>
      </div>
      <div className="flex gap-4 text-base text-gray-600 mb-2">
        <span>现价 ${data.spot.toFixed(2)}</span>
        <span>远期 ${data.forward.toFixed(2)}</span>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="strike" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => (v >= 1000 ? v / 1000 + 'K' : String(v))} />
            <Tooltip formatter={(v: number) => (v < 0 ? -v : v)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine x={data.spot} stroke="#374151" strokeDasharray="4 2" label="现价" />
            <Bar dataKey="callOi" fill="#22c55e" name="看涨持仓" radius={[2, 2, 0, 0]} />
            <Bar dataKey="putOi" fill="#ef4444" name="看跌持仓" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
