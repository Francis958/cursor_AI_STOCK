import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { DashboardData } from '../types';
import { toIvPercent, toIvPercentFixed } from '../utils/ivDisplay';

interface IvTermStructureProps {
  data: DashboardData | null;
}

/** IV 期限结构：单到期时显示一条柱状 + 摘要；多到期时为曲线 */
export default function IvTermStructure({ data }: IvTermStructureProps) {
  if (!data) {
    return (
      <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800">IV 期限结构</h2>
        <p className="text-gray-500 text-sm">加载标的后显示各到期 IV 曲线。</p>
      </section>
    );
  }

  const atmPct = toIvPercentFixed(data.atmIv);
  const rr = (data.riskReversal25d * 100).toFixed(2);
  const chartData = [{ name: data.expiration, iv: toIvPercent(data.atmIv), dte: data.dte }];

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm h-full flex flex-col">
      <h2 className="text-lg font-semibold text-gray-800">IV 期限结构</h2>
      <p className="text-gray-500 text-base mb-3">
        各到期日的隐含波动率；接入多到期期权链后可显示完整期限结构曲线。
      </p>
      <div className="h-32 flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => v + '%'} domain={[0, 'auto']} />
            <Tooltip formatter={(v: number) => v.toFixed(1) + '%'} />
            <Bar dataKey="iv" fill="#6366f1" name="平价 IV %" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 flex flex-col justify-center gap-2 text-base mt-3">
        <div className="flex justify-between">
          <span className="text-gray-600">到期日</span>
          <span className="font-medium text-gray-800">{data.expiration}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">剩余天数 (DTE)</span>
          <span className="font-medium text-gray-800">{data.dte} 天</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">平价 IV（当前到期）</span>
          <span className="font-medium text-gray-800">{atmPct}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">25Δ 风险反转</span>
          <span className="font-medium text-gray-800">{rr}%</span>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          当前为单到期摘要；多到期时此处将展示不同到期日的 IV 曲线（近月通常低于远月，反向为倒挂）。
        </p>
      </div>
    </section>
  );
}
