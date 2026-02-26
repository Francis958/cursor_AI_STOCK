import { useState } from 'react';
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

interface DealerGexProps {
  data: DashboardData | null;
}

type GexTab = 'puts' | 'calls' | 'total';

function fmtGex(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return v.toFixed(0);
}

export default function DealerGex({ data }: DealerGexProps) {
  const [tab, setTab] = useState<GexTab>('total');

  if (!data) {
    return (
      <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800">做市商 Gamma 敞口 (GEX)</h2>
        <p className="text-gray-500 text-sm">加载标的后按行权价显示 GEX。</p>
      </section>
    );
  }

  const chartData = data.byStrike.map((row) => ({
    strike: row.strike,
    putGex: row.putGex,
    callGex: row.callGex,
    positive: row.netGex > 0 ? row.netGex : 0,
    negative: row.netGex < 0 ? row.netGex : 0,
  }));

  const positiveGexTotal = data.byStrike.reduce((s, r) => s + (r.netGex > 0 ? r.netGex : 0), 0);
  const maxAbs = Math.max(
    ...chartData.map((d) =>
      tab === 'total'
        ? Math.max(d.positive, Math.abs(d.negative))
        : tab === 'puts'
          ? Math.abs(d.putGex)
          : Math.abs(d.callGex)
    ),
    0
  );
  const yDomain = maxAbs === 0 ? [0, 1] : ['auto', 'auto'];

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800">做市商 Gamma 敞口 (GEX)</h2>
      <p className="text-gray-500 text-base mb-2">
        正 GEX 合计: {fmtGex(positiveGexTotal)} · Put 墙: ${data.putWallStrike} · Call 墙: ${data.callWallStrike}
        {maxAbs === 0 && <span className="text-amber-600"> 当前净 GEX 为 0。</span>}
      </p>
      <div className="flex gap-1 mb-2">
        {(['puts', 'calls', 'total'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-2 py-1 rounded text-sm ${tab === t ? 'bg-blue-100 text-blue-800 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            {t === 'puts' ? 'Puts' : t === 'calls' ? 'Calls' : 'Total'}
          </button>
        ))}
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="strike" tick={{ fontSize: 12 }} />
            <YAxis domain={yDomain} tick={{ fontSize: 12 }} tickFormatter={(v) => fmtGex(v)} />
            <Tooltip formatter={(v: number) => fmtGex(v)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine x={data.spot} stroke="#374151" strokeDasharray="4 2" label={`现价 ${data.spot.toFixed(2)}`} />
            {tab === 'total' && (
              <>
                <Bar dataKey="positive" fill="#22c55e" name="正 GEX" radius={[2, 2, 0, 0]} />
                <Bar dataKey="negative" fill="#ef4444" name="负 GEX" radius={[2, 2, 0, 0]} />
              </>
            )}
            {tab === 'puts' && <Bar dataKey="putGex" fill="#ef4444" name="Put GEX" radius={[2, 2, 0, 0]} />}
            {tab === 'calls' && <Bar dataKey="callGex" fill="#22c55e" name="Call GEX" radius={[2, 2, 0, 0]} />}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
