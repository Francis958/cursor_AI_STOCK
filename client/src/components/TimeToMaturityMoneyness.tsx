import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { DashboardData } from '../types';
import { toIvPercent } from '../utils/ivDisplay';

interface TimeToMaturityMoneynessProps {
  data: DashboardData | null;
}

/** Time to Maturity vs. Moneyness：IV vs 货币性（strike/spot），单到期 */
export default function TimeToMaturityMoneyness({ data }: TimeToMaturityMoneynessProps) {
  if (!data) {
    return (
      <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800">期限与货币性</h2>
        <p className="text-gray-500 text-sm">加载标的后显示 IV 与货币性。</p>
      </section>
    );
  }

  const { spot } = data;
  const chartData = data.byStrike
    .filter((r) => (r.callIv ?? r.putIv) != null)
    .map((r) => ({
      moneyness: (r.strike / spot).toFixed(2),
      iv: toIvPercent(r.callIv ?? r.putIv ?? 0),
    }));

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800">到期时间与货币性</h2>
      <p className="text-gray-500 text-base mb-3">
        IV 与货币性（行权价/现价）。当前为 {data.expiration} 单到期；多到期时可增加「到期时间」轴形成 2D 曲面。
      </p>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="moneyness" tick={{ fontSize: 12 }} name="货币性 (K/S)" />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => v + '%'} />
            <Tooltip formatter={(v: number) => v.toFixed(2) + '%'} />
            <ReferenceLine x="1.00" stroke="#374151" strokeDasharray="4 2" label="平价" />
            <Line type="monotone" dataKey="iv" stroke="#f97316" strokeWidth={2} dot={{ r: 2 }} name="IV %" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
