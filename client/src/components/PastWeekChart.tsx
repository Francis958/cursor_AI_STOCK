import { useEffect, useState } from 'react';
import { fetchHistory, type HistoryPoint } from '../api';
import { rsi } from '../lib/indicators';
import CandlestickChart from './CandlestickChart';

interface PastWeekChartProps {
  symbol: string | null;
}

export default function PastWeekChart({ symbol }: PastWeekChartProps) {
  const [data, setData] = useState<HistoryPoint[]>([]);
  const [source, setSource] = useState<'mock' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) {
      setData([]);
      setSource(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetchHistory(symbol, 30)
      .then((res) => {
        setData(res.data || []);
        setSource(res.source ?? null);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [symbol]);

  if (!symbol) return null;

  const closes = data.map((d) => d.close);
  const rsiArr = rsi(closes, 14);
  const lastRsi = rsiArr[rsiArr.length - 1];
  const sourceText = source === 'mock' ? '模拟' : '';

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800">标的走势（约 30 日）K 线 + 成交量</h2>
      <p className="text-gray-500 text-sm mb-3">
        {sourceText ? `数据来源：${sourceText}` : '加载后可显示数据来源。'}
        {lastRsi != null && (
          <span className="ml-2 text-amber-700">· RSI(14) = {lastRsi.toFixed(0)}（&lt;30 超卖，&gt;70 超买）</span>
        )}
      </p>
      {loading && <div className="h-64 flex items-center justify-center text-gray-500">加载中…</div>}
      {error && (
        <div className="h-64 flex items-center justify-center text-amber-600 text-sm">
          {error}
        </div>
      )}
      {!loading && !error && data.length > 0 && (
        <CandlestickChart data={data} height={280} volumeHeight={72} showVolume />
      )}
      {!loading && !error && data.length === 0 && symbol && (
        <div className="h-64 flex items-center justify-center text-gray-500 text-sm">暂无历史数据</div>
      )}
    </section>
  );
}
