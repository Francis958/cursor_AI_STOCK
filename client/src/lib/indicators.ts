/**
 * 简单技术指标（基于 OHLC 序列），便于新手理解
 */

export interface HistoryPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** 简单移动平均 */
export function sma(closes: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += closes[j];
    out.push(sum / period);
  }
  return out;
}

/** RSI(14)，返回值 0–100 */
export function rsi(closes: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      out.push(null);
      continue;
    }
    let gain = 0, loss = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const ch = j > 0 ? closes[j] - closes[j - 1] : 0;
      if (ch > 0) gain += ch;
      else loss -= ch;
    }
    const avgGain = gain / period;
    const avgLoss = loss / period;
    if (avgLoss === 0) {
      out.push(100);
      continue;
    }
    const rs = avgGain / avgLoss;
    out.push(100 - 100 / (1 + rs));
  }
  return out;
}

/** 从历史数据计算最近一根的 MA5/MA20 和 RSI，以及简短解读 */
export function summarizeIndicators(data: HistoryPoint[]): {
  ma5: number | null;
  ma20: number | null;
  rsi14: number | null;
  lastClose: number;
  trendVsMa: 'above_both' | 'between' | 'below_both' | 'unknown';
  rsiZone: 'oversold' | 'neutral' | 'overbought' | 'unknown';
  summary: string[];
} {
  const closes = data.map((d) => d.close).filter((c) => c > 0);
  if (closes.length < 5) {
    return {
      ma5: null,
      ma20: null,
      rsi14: null,
      lastClose: closes[closes.length - 1] ?? 0,
      trendVsMa: 'unknown',
      rsiZone: 'unknown',
      summary: ['数据不足，无法计算均线与 RSI'],
    };
  }
  const ma5Arr = sma(closes, 5);
  const ma20Arr = sma(closes, 20);
  const rsiArr = rsi(closes, 14);
  const lastClose = closes[closes.length - 1];
  const ma5 = ma5Arr[ma5Arr.length - 1] ?? null;
  const ma20 = ma20Arr[ma20Arr.length - 1] ?? null;
  const rsi14 = rsiArr[rsiArr.length - 1] ?? null;

  let trendVsMa: 'above_both' | 'between' | 'below_both' | 'unknown' = 'unknown';
  if (ma5 != null && ma20 != null) {
    if (lastClose > ma5 && lastClose > ma20) trendVsMa = 'above_both';
    else if (lastClose < ma5 && lastClose < ma20) trendVsMa = 'below_both';
    else trendVsMa = 'between';
  }
  let rsiZone: 'oversold' | 'neutral' | 'overbought' | 'unknown' = 'unknown';
  if (rsi14 != null) {
    if (rsi14 <= 30) rsiZone = 'oversold';
    else if (rsi14 >= 70) rsiZone = 'overbought';
    else rsiZone = 'neutral';
  }

  const summary: string[] = [];
  if (trendVsMa === 'above_both') summary.push('价格在均线之上，短期趋势偏多');
  else if (trendVsMa === 'below_both') summary.push('价格在均线之下，短期趋势偏空');
  else if (trendVsMa === 'between') summary.push('价格在均线之间，震荡整理');
  if (rsiZone === 'oversold') summary.push('RSI 超卖（≤30），可能短期反弹');
  else if (rsiZone === 'overbought') summary.push('RSI 超买（≥70），注意回调风险');
  else if (rsiZone === 'neutral' && rsi14 != null) summary.push(`RSI 中性（${rsi14.toFixed(0)}），多空均衡`);

  return {
    ma5,
    ma20,
    rsi14,
    lastClose,
    trendVsMa,
    rsiZone,
    summary: summary.length ? summary : ['暂无解读'],
  };
}
