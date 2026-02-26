import { useEffect, useState } from 'react';
import { fetchHistory, type HistoryPoint } from '../api';
import {
  detectPattern,
  detectAllPatterns,
  TIMEFRAME_DAYS,
  TIMEFRAME_LABELS,
  type OHLC,
  type DetectedPattern,
} from '../lib/patternDetection';
import CandlestickChart from './CandlestickChart';

type TimeframeKey = keyof typeof TIMEFRAME_DAYS;

interface PatternChartProps {
  symbol: string | null;
}

export default function PatternChart({ symbol }: PatternChartProps) {
  const [timeframe, setTimeframe] = useState<TimeframeKey>('1m');
  const [data, setData] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pattern, setPattern] = useState<DetectedPattern | null>(null);
  const [allPatterns, setAllPatterns] = useState<DetectedPattern[]>([]);

  const days = TIMEFRAME_DAYS[timeframe] ?? 30;

  useEffect(() => {
    if (!symbol) {
      setData([]);
      setPattern(null);
      setAllPatterns([]);
      return;
    }
    setLoading(true);
    setError(null);
    fetchHistory(symbol, days)
      .then((res) => {
        const raw = res.data || [];
        setData(raw);
        const ohlc: OHLC[] = raw.map((d) => ({
          date: d.date,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
          volume: d.volume,
        }));
        const all = detectAllPatterns(ohlc);
        setAllPatterns(all);
        setPattern(detectPattern(ohlc));
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [symbol, days]);

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm lg:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="text-lg font-semibold text-gray-800">多周期形态分析</h2>
        <div className="flex gap-1 flex-wrap">
          {(Object.keys(TIMEFRAME_DAYS) as TimeframeKey[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTimeframe(k)}
              className={`px-3 py-1 rounded text-sm ${timeframe === k ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {TIMEFRAME_LABELS[k]}
            </button>
          ))}
        </div>
      </div>
      <p className="text-gray-500 text-sm mb-3">
        识别多种经典形态（头肩、双顶底、三角、楔形、锤子、吞没、十字星等）及 K 线组合，并标注颈线、入场与目标区间。仅供参考，不构成投资建议。
      </p>
      {loading && <div className="h-64 flex items-center justify-center text-gray-500">加载中…</div>}
      {error && (
        <div className="h-64 flex items-center justify-center text-amber-600 text-sm">
          {error}
        </div>
      )}
      {!loading && !error && data.length > 0 && (
        <>
          <CandlestickChart data={data} height={320} volumeHeight={80} showVolume pattern={pattern} />
          {/* 图例说明 */}
          {pattern && (
            <div className="mt-3 flex flex-wrap gap-4 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-4 h-0.5 bg-amber-400 rounded" style={{ border: '1px dashed #f59e0b' }} />
                颈线 ${pattern.necklinePrice.toFixed(2)}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-3 bg-blue-400 opacity-30 rounded" />
                入场区间
              </span>
              <span className="flex items-center gap-1">
                <span
                  className="w-4 h-3 rounded opacity-30"
                  style={{ backgroundColor: pattern.isBearish ? '#ef4444' : '#22c55e' }}
                />
                {pattern.isBearish ? '下跌目标区间' : '上涨目标区间'}
              </span>
            </div>
          )}
          {/* 形态结论与入场/目标区间（结合当前价显示合理入场与说明） */}
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
            {pattern ? (() => {
              const lastClose = data.length > 0 ? data[data.length - 1].close : 0;
              const neck = pattern.necklinePrice;
              const pct = 0.02;
              let displayEntryMin = pattern.entryMin;
              let displayEntryMax = pattern.entryMax;
              let entryLabel = '建议入场区间';
              let noteAdd = '';
              if (pattern.isBearish) {
                if (lastClose < neck) {
                  displayEntryMin = neck * (1 - pct);
                  displayEntryMax = neck;
                  entryLabel = '反弹做空参考区间';
                  noteAdd = ' 当前价已低于颈线，形态可能已兑现或部分兑现；上述区间为反弹至颈线附近再考虑做空的参考，目标仍可参考下方。';
                } else {
                  noteAdd = ' 跌破颈线后入场做空，或反弹至颈线附近再空。';
                }
              } else {
                if (lastClose > neck) {
                  displayEntryMin = neck;
                  displayEntryMax = neck * (1 + pct);
                  entryLabel = '回踩做多参考区间';
                  noteAdd = ' 当前价已高于颈线，上述区间为回踩做多参考。';
                } else {
                  noteAdd = ' 突破颈线后做多，或回踩颈线附近再多。';
                }
              }
              return (
                <>
                  <div className="font-semibold text-gray-800 mb-2">
                    识别形态：{pattern.name}
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      {pattern.isBearish ? '（偏空，可考虑做空或减仓）' : '（偏多，可考虑做多或持有）'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                    <div className="bg-white rounded p-2 border border-slate-200">
                      <div className="text-slate-600 font-medium">当前价（最新K线收盘）</div>
                      <div className="text-gray-800">${lastClose.toFixed(2)}</div>
                    </div>
                    <div className="bg-white rounded p-2 border border-amber-200">
                      <div className="text-amber-800 font-medium">颈线</div>
                      <div className="text-gray-800">${pattern.necklinePrice.toFixed(2)}</div>
                    </div>
                    <div className="bg-white rounded p-2 border border-blue-200">
                      <div className="text-blue-800 font-medium">{entryLabel}</div>
                      <div className="text-gray-800">
                        ${displayEntryMin.toFixed(2)} – ${displayEntryMax.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-white rounded p-2 border border-emerald-200">
                      <div className="text-emerald-800 font-medium">
                        {pattern.isBearish ? '下跌目标区间' : '上涨目标区间'}
                      </div>
                      <div className="text-gray-800">
                        ${pattern.targetMin.toFixed(2)} – ${pattern.targetMax.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-white rounded p-2 border border-gray-200 sm:col-span-2 lg:col-span-1">
                      <div className="text-gray-600 font-medium">说明</div>
                      <div className="text-gray-600 text-xs">{pattern.note}{noteAdd}</div>
                    </div>
                  </div>
                </>
              );
            })() : (
              <div className="text-gray-600 text-sm">
                当前周期（{TIMEFRAME_LABELS[timeframe]}）未识别到可标注的典型形态。
                {allPatterns.length > 0 && (
                  <span className="block mt-2">其他可能形态：{allPatterns.map((p) => p.name).join('、')}。</span>
                )}
                可切换其他周期查看，或结合技术指标与期权数据综合判断。
              </div>
            )}
            {pattern && allPatterns.length > 1 && (
              <div className="mt-2 text-xs text-gray-500">
                本周期还识别到：{allPatterns.filter((p) => p.name !== pattern.name).map((p) => p.name).join('、')}。
              </div>
            )}
          </div>
        </>
      )}
      {!loading && !error && data.length === 0 && symbol && (
        <div className="h-64 flex items-center justify-center text-gray-500 text-sm">暂无该周期历史数据</div>
      )}
    </section>
  );
}
