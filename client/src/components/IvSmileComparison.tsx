import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { DashboardData } from '../types';
import { toIvPercent } from '../utils/ivDisplay';

interface IvSmileComparisonProps {
  data: DashboardData | null;
}

/** IV Smile Comparison：Call IV / Put IV / ATM 参考线 同图对比 */
export default function IvSmileComparison({ data }: IvSmileComparisonProps) {
  if (!data) {
    return (
      <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800">IV 微笑对比</h2>
        <p className="text-gray-500 text-sm">加载标的后显示多条 IV 曲线对比。</p>
      </section>
    );
  }

  const chartData = data.byStrike
    .filter((r) => r.callIv != null || r.putIv != null)
    .map((r) => ({
      strike: r.strike,
      callIv: r.callIv != null ? toIvPercent(r.callIv) : null,
      putIv: r.putIv != null ? toIvPercent(r.putIv) : null,
    }));

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800">IV 微笑对比</h2>
      <p className="text-gray-500 text-base mb-3">
        对比看涨与看跌的隐含波动率曲线；竖线为平价（现价）。
      </p>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="strike" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => v + '%'} domain={['auto', 'auto']} />
            <Tooltip
              formatter={(v: unknown) => (v != null && typeof v === 'number' ? v.toFixed(2) + '%' : '—')}
              labelFormatter={(label) => `行权价 ${label}`}
            />
            <Legend />
            <ReferenceLine x={data.spot} stroke="#374151" strokeDasharray="4 2" label={{ value: '平价', position: 'top' }} />
            <Line
              type="monotone"
              dataKey="callIv"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 2 }}
              name="看涨 IV"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="putIv"
              stroke="#dc2626"
              strokeWidth={2}
              dot={{ r: 2 }}
              name="看跌 IV"
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
