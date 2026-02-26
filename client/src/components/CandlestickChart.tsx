import { useMemo, useState } from 'react';
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  Line,
  Cell,
} from 'recharts';
import type { HistoryPoint } from '../api';
import type { DetectedPattern } from '../lib/patternDetection';

/** K 线 + 下方成交量；Y 轴显示价格，点击某根 K 线可固定显示当日 OHLC */
interface CandlestickChartProps {
  data: HistoryPoint[];
  height?: number;
  volumeHeight?: number;
  showVolume?: boolean;
  pattern?: DetectedPattern | null;
}

export default function CandlestickChart({
  data,
  height = 320,
  volumeHeight = 80,
  showVolume = true,
  pattern,
}: CandlestickChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const chartData = useMemo(
    () =>
      data.map((d, i) => ({
        ...d,
        name: d.date.slice(5),
        fullDate: d.date,
        index: i,
        volume: d.volume ?? 0,
      })),
    [data]
  );

  if (chartData.length === 0) return null;

  const minLow = Math.min(...chartData.map((d) => Number(d.low) || 0));
  const maxHigh = Math.max(...chartData.map((d) => Number(d.high) || 0));
  if (!Number.isFinite(minLow) || !Number.isFinite(maxHigh)) return null;
  const padding = Math.max((maxHigh - minLow) * 0.02, 0.5);
  const domain: [number, number] = [minLow - padding, maxHigh + padding];
  const maxVol = Math.max(...chartData.map((d) => Number(d.volume) || 0), 1);

  const selected = activeIndex != null ? chartData[activeIndex] : null;

  return (
    <div className="w-full" style={{ height: height + (showVolume ? volumeHeight : 0) }}>
      {/* 选中日信息卡片 */}
      {selected && (
        <div className="mb-2 px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 text-sm flex flex-wrap gap-4">
          <span className="font-medium text-slate-800">{selected.fullDate}</span>
          <span className="text-green-700">开 {selected.open?.toFixed(2)}</span>
          <span className="text-slate-700">高 {selected.high?.toFixed(2)}</span>
          <span className="text-slate-700">低 {selected.low?.toFixed(2)}</span>
          <span className="text-red-700">收 {selected.close?.toFixed(2)}</span>
          {showVolume && <span className="text-slate-600">量 {(selected.volume ?? 0).toLocaleString()}</span>}
          <button type="button" onClick={() => setActiveIndex(null)} className="text-slate-500 hover:text-slate-700 underline">
            取消选中
          </button>
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={chartData}
          margin={{ top: 12, right: 12, left: 52, bottom: 8 }}
          barCategoryGap="20%"
          barGap={2}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="index"
            type="number"
            domain={['dataMin - 0.5', 'dataMax + 0.5']}
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickFormatter={(v) => chartData[Math.round(Number(v))]?.name ?? String(v)}
            axisLine={{ stroke: '#cbd5e1' }}
            tickLine={{ stroke: '#cbd5e1' }}
          />
          <YAxis
            yAxisId="price"
            orientation="left"
            domain={domain}
            width={50}
            tick={{ fontSize: 11, fill: '#475569' }}
            tickFormatter={(v) => `$${Number(v).toFixed(2)}`}
            axisLine={{ stroke: '#cbd5e1' }}
            tickLine={{ stroke: '#cbd5e1' }}
          />
          <Tooltip
            cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 2' }}
            content={({ active, payload: p }) => {
              if (!active || !p?.[0]?.payload) return null;
              const d = p[0].payload as HistoryPoint & { name: string; fullDate: string; index: number };
              return (
                <div className="bg-white/95 border border-slate-200 rounded-lg shadow-lg px-3 py-2.5 text-sm min-w-[180px]">
                  <div className="font-semibold text-slate-800 border-b border-slate-100 pb-1 mb-1">{d.fullDate}</div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-slate-600">
                    <span>开</span><span className="text-right font-medium">${d.open?.toFixed(2)}</span>
                    <span>高</span><span className="text-right font-medium text-green-700">${d.high?.toFixed(2)}</span>
                    <span>低</span><span className="text-right font-medium text-red-700">${d.low?.toFixed(2)}</span>
                    <span>收</span><span className="text-right font-medium">${d.close?.toFixed(2)}</span>
                  </div>
                  {showVolume && <div className="mt-1 pt-1 border-t border-slate-100 text-slate-500">成交量 {(d.volume ?? 0).toLocaleString()}</div>}
                  <button type="button" onClick={() => setActiveIndex(d.index)} className="mt-2 text-xs text-blue-600 hover:underline">点击固定此日</button>
                </div>
              );
            }}
          />
          {/* 隐形折线：占位让 Y 轴正确显示价格刻度 */}
          <Line
            type="monotone"
            dataKey="close"
            yAxisId="price"
            stroke="transparent"
            strokeWidth={0}
            dot={false}
            isAnimationActive={false}
          />
          {pattern && (
            <>
              <ReferenceArea yAxisId="price" y1={pattern.entryMin} y2={pattern.entryMax} fill="#3b82f6" fillOpacity={0.15} strokeOpacity={0} />
              <ReferenceArea yAxisId="price" y1={pattern.targetMin} y2={pattern.targetMax} fill={pattern.isBearish ? '#ef4444' : '#22c55e'} fillOpacity={0.15} strokeOpacity={0} />
              <ReferenceLine yAxisId="price" y={pattern.necklinePrice} stroke="#f59e0b" strokeDasharray="4 2" strokeWidth={1.5} label={{ value: '颈线', position: 'right', fill: '#b45309', fontSize: 10 }} />
            </>
          )}
          {chartData.map((d, i) => (
            <ReferenceLine key={`wick-${i}`} yAxisId="price" segment={[{ x: d.index, y: Number(d.low) || 0 }, { x: d.index, y: Number(d.high) || 0 }]} stroke="#64748b" strokeWidth={1.2} />
          ))}
          {chartData.map((d, i) => {
            const open = Number(d.open) || 0;
            const close = Number(d.close) || 0;
            let top = Math.max(open, close);
            let bottom = Math.min(open, close);
            if (top === bottom) top = bottom + (domain[1] - domain[0]) * 0.001;
            const isUp = close >= open;
            const isSelected = activeIndex === i;
            return (
              <ReferenceArea
                key={`body-${i}`}
                yAxisId="price"
                x1={d.index - 0.38}
                x2={d.index + 0.38}
                y1={bottom}
                y2={top}
                fill={isUp ? '#22c55e' : '#ef4444'}
                fillOpacity={isSelected ? 0.95 : 0.85}
                stroke={isUp ? '#16a34a' : '#dc2626'}
                strokeWidth={isSelected ? 2 : 1}
              />
            );
          })}
        </ComposedChart>
      </ResponsiveContainer>
      {showVolume && (
        <ResponsiveContainer width="100%" height={volumeHeight}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 12, left: 52, bottom: 8 }} syncId="candle-vol" barCategoryGap="18%">
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
            <YAxis yAxisId="vol" width={50} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => (v >= 1000 ? (v / 1000).toFixed(1) + 'K' : String(v))} domain={[0, maxVol]} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
            <Tooltip formatter={(v: number) => [v.toLocaleString(), '成交量']} labelFormatter={(l) => `日期 ${l}`} contentStyle={{ borderRadius: 8 }} />
            <Bar yAxisId="vol" dataKey="volume" fill="#94a3b8" radius={[2, 2, 0, 0]} isAnimationActive={false}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.close >= entry.open ? '#22c55e' : '#ef4444'} fillOpacity={0.7} />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
