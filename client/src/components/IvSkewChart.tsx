import { useState } from 'react';
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

interface IvSkewChartProps {
  data: DashboardData | null;
}

/** IV Skew：隐含波动率 vs 行权价，Call / Put 切换 */
export default function IvSkewChart({ data }: IvSkewChartProps) {
  const [callOrPut, setCallOrPut] = useState<'call' | 'put'>('call');

  if (!data) {
    return (
      <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800">IV 偏斜</h2>
        <p className="text-gray-500 text-sm">加载标的后显示 IV 曲线。</p>
      </section>
    );
  }

  const chartData = data.byStrike
    .filter((r) => (callOrPut === 'call' ? r.callIv != null : r.putIv != null))
    .map((r) => ({
      strike: r.strike,
      iv: toIvPercent(callOrPut === 'call' ? r.callIv! : r.putIv!),
    }));

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800">IV 偏斜</h2>
      <p className="text-gray-500 text-base mb-2">
        按行权价的隐含波动率；价内与价外定价不同。
      </p>
      <div className="flex gap-2 mb-2">
        <button
          type="button"
          onClick={() => setCallOrPut('call')}
          className={`px-3 py-1.5 rounded text-sm font-medium ${callOrPut === 'call' ? 'bg-green-100 text-green-800' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          看涨期权
        </button>
        <button
          type="button"
          onClick={() => setCallOrPut('put')}
          className={`px-3 py-1.5 rounded text-sm font-medium ${callOrPut === 'put' ? 'bg-red-100 text-red-800' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          看跌期权
        </button>
      </div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="strike" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => v + '%'} domain={['auto', 'auto']} />
            <Tooltip formatter={(v: number) => v.toFixed(2) + '%'} />
            <ReferenceLine x={data.spot} stroke="#374151" strokeDasharray="4 2" />
            <Line type="monotone" dataKey="iv" stroke="#22c55e" strokeWidth={2} dot={{ r: 2 }} name="IV %" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
