/**
 * 模拟过去 N 天日线（仅使用 Schwab 时无历史 K 线 API，用此模拟）
 */
export interface HistoryPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** 根据代码生成一个大致“当前价”（仅用于模拟） */
function seedSpot(symbol: string): number {
  let n = 100;
  for (let i = 0; i < symbol.length; i++) n += symbol.charCodeAt(i) * 1.5;
  return Math.round(n / 10) * 10 || 200;
}

/** 生成过去 days 天的模拟 OHLCV */
export function getMockHistory(symbol: string, days: number): HistoryPoint[] {
  const spot = seedSpot(symbol);
  const out: HistoryPoint[] = [];
  const today = new Date();
  let close = spot;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const date = d.toISOString().slice(0, 10);
    const open = close;
    const ret = (Math.random() - 0.48) * 0.03;
    close = Math.round(open * (1 + ret) * 100) / 100;
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    const volume = Math.round(1e6 + Math.random() * 4e6);
    out.push({
      date,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume,
    });
  }
  return out;
}
