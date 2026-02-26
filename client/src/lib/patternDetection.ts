/**
 * 形态识别库（参考 Bulkowski、专业 K 线形态等）
 * 含：反转形态、持续形态、K 线形态等几十种，仅供学习参考，不构成投资建议。
 */

export interface OHLC {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface SwingPoint {
  index: number;
  price: number;
  date: string;
  type: 'high' | 'low';
}

/** 摆动高点/低点：左右各 side 根 K 线内为极值 */
export function getSwingPoints(data: OHLC[], side = 3): { highs: SwingPoint[]; lows: SwingPoint[] } {
  const highs: SwingPoint[] = [];
  const lows: SwingPoint[] = [];
  for (let i = side; i < data.length - side; i++) {
    let isHigh = true;
    let isLow = true;
    for (let j = i - side; j <= i + side; j++) {
      if (j !== i && data[j].high >= data[i].high) isHigh = false;
      if (j !== i && data[j].low <= data[i].low) isLow = false;
    }
    if (isHigh) highs.push({ index: i, price: data[i].high, date: data[i].date, type: 'high' });
    if (isLow) lows.push({ index: i, price: data[i].low, date: data[i].date, type: 'low' });
  }
  return { highs, lows };
}

const TOLERANCE_PCT = 0.045;

export type PatternType =
  | 'head_shoulders_top'
  | 'head_shoulders_bottom'
  | 'double_top'
  | 'double_bottom'
  | 'tri_ascending'
  | 'tri_descending'
  | 'tri_symmetric'
  | 'wedge_rising'
  | 'wedge_falling'
  | 'rectangle_top'
  | 'rectangle_bottom'
  | 'rounded_top'
  | 'rounded_bottom'
  | 'cup_handle'
  | 'flag_bull'
  | 'flag_bear'
  | 'pennant'
  | 'channel_up'
  | 'channel_down'
  | 'hammer'
  | 'inverted_hammer'
  | 'shooting_star'
  | 'hanging_man'
  | 'engulfing_bull'
  | 'engulfing_bear'
  | 'harami_bull'
  | 'harami_bear'
  | 'doji_gravestone'
  | 'doji_dragonfly'
  | 'morning_star'
  | 'evening_star'
  | 'three_white_soldiers'
  | 'three_black_crows'
  | 'rising_wedge'
  | 'falling_wedge'
  | null;

export interface DetectedPattern {
  type: PatternType;
  name: string;
  necklinePrice: number;
  necklineIndex?: number;
  endIndex: number;
  entryMin: number;
  entryMax: number;
  targetMin: number;
  targetMax: number;
  note: string;
  isBearish: boolean;
}

function similar(a: number, b: number, pct = TOLERANCE_PCT): boolean {
  if (a === 0) return b === 0;
  return Math.abs(a - b) / Math.abs(a) <= pct;
}

function makePattern(
  type: PatternType,
  name: string,
  neckline: number,
  endIdx: number,
  entryMin: number,
  entryMax: number,
  targetMin: number,
  targetMax: number,
  note: string,
  isBearish: boolean,
  neckIdx?: number
): DetectedPattern {
  return { type, name, necklinePrice: neckline, necklineIndex: neckIdx, endIndex: endIdx, entryMin, entryMax, targetMin, targetMax, note, isBearish };
}

// ----- 反转形态 -----
function detectHeadShouldersTop(_d: OHLC[], highs: SwingPoint[], lows: SwingPoint[]): DetectedPattern | null {
  if (highs.length < 3 || lows.length < 2) return null;
  for (let last = highs.length - 1; last >= 2; last--) {
    const left = highs[last - 2], head = highs[last - 1], right = highs[last];
    if (head.index <= left.index || right.index <= head.index) continue;
    if (head.price <= left.price || head.price <= right.price) continue;
    const troughs = lows.filter((l) => l.index > left.index && l.index < right.index);
    if (troughs.length < 2) continue;
    const t1 = troughs[troughs.length - 2], t2 = troughs[troughs.length - 1];
    const neckline = (t1.price + t2.price) / 2;
    const target = neckline - (head.price - neckline);
    const ew = (head.price - neckline) * 0.12;
    return makePattern('head_shoulders_top', '头肩顶', neckline, right.index, neckline - ew, neckline + ew, target * 0.97, target * 1.03, '颈线跌破后做空，目标头到颈线等幅下翻。', true, Math.floor((t1.index + t2.index) / 2));
  }
  return null;
}

function detectHeadShouldersBottom(_d: OHLC[], highs: SwingPoint[], lows: SwingPoint[]): DetectedPattern | null {
  if (lows.length < 3 || highs.length < 2) return null;
  for (let last = lows.length - 1; last >= 2; last--) {
    const left = lows[last - 2], head = lows[last - 1], right = lows[last];
    if (head.index <= left.index || right.index <= head.index) continue;
    if (head.price >= left.price || head.price >= right.price) continue;
    const peaks = highs.filter((h) => h.index > left.index && h.index < right.index);
    if (peaks.length < 2) continue;
    const p1 = peaks[peaks.length - 2], p2 = peaks[peaks.length - 1];
    const neckline = (p1.price + p2.price) / 2;
    const target = neckline + (neckline - head.price);
    const ew = (neckline - head.price) * 0.12;
    return makePattern('head_shoulders_bottom', '头肩底', neckline, right.index, neckline - ew, neckline + ew, target * 0.97, target * 1.03, '颈线突破后做多，目标头到颈线等幅上翻。', false, Math.floor((p1.index + p2.index) / 2));
  }
  return null;
}

function detectDoubleTop(_d: OHLC[], highs: SwingPoint[], lows: SwingPoint[]): DetectedPattern | null {
  if (highs.length < 2 || lows.length < 1) return null;
  const p1 = highs[highs.length - 2], p2 = highs[highs.length - 1];
  if (p2.index <= p1.index || !similar(p1.price, p2.price)) return null;
  const troughs = lows.filter((l) => l.index > p1.index && l.index < p2.index);
  if (troughs.length === 0) return null;
  const neckline = Math.max(...troughs.map((t) => t.price));
  const peak = (p1.price + p2.price) / 2;
  const target = neckline - (peak - neckline);
  const ew = (peak - neckline) * 0.08;
  return makePattern('double_top', '双顶', neckline, p2.index, neckline - ew, neckline + ew, target * 0.98, target * 1.02, '颈线跌破做空，目标顶到颈线等幅。', true, troughs[troughs.length - 1].index);
}

function detectDoubleBottom(_d: OHLC[], highs: SwingPoint[], lows: SwingPoint[]): DetectedPattern | null {
  if (lows.length < 2 || highs.length < 1) return null;
  const p1 = lows[lows.length - 2], p2 = lows[lows.length - 1];
  if (p2.index <= p1.index || !similar(p1.price, p2.price)) return null;
  const peaks = highs.filter((h) => h.index > p1.index && h.index < p2.index);
  if (peaks.length === 0) return null;
  const neckline = Math.min(...peaks.map((h) => h.price));
  const trough = (p1.price + p2.price) / 2;
  const target = neckline + (neckline - trough);
  const ew = (neckline - trough) * 0.08;
  return makePattern('double_bottom', '双底', neckline, p2.index, neckline - ew, neckline + ew, target * 0.98, target * 1.02, '颈线突破做多，目标底到颈线等幅。', false, peaks[peaks.length - 1].index);
}

// ----- 三角形 / 楔形 / 矩形 -----
function detectTriangleAscending(data: OHLC[], highs: SwingPoint[], lows: SwingPoint[]): DetectedPattern | null {
  if (highs.length < 2 || lows.length < 2) return null;
  const last = data.length - 1;
  const recentH = highs.slice(-3), recentL = lows.slice(-3);
  const flatTop = recentH.length >= 2 && similar(recentH[recentH.length - 1].price, recentH[recentH.length - 2].price);
  const risingLows = recentL.length >= 2 && recentL[recentL.length - 1].price > recentL[recentL.length - 2].price;
  if (!flatTop || !risingLows) return null;
  const resistance = recentH[recentH.length - 1].price;
  const support = recentL[recentL.length - 1].price;
  const mid = (support + resistance) / 2;
  const range = resistance - support;
  return makePattern('tri_ascending', '上升三角形', mid, last, support - range * 0.05, support + range * 0.15, resistance - range * 0.1, resistance + range * 0.15, '上边水平、下边抬升，突破上边做多。', false, last);
}

function detectTriangleDescending(data: OHLC[], highs: SwingPoint[], lows: SwingPoint[]): DetectedPattern | null {
  if (highs.length < 2 || lows.length < 2) return null;
  const last = data.length - 1;
  const recentH = highs.slice(-3), recentL = lows.slice(-3);
  const flatBottom = recentL.length >= 2 && similar(recentL[recentL.length - 1].price, recentL[recentL.length - 2].price);
  const fallingHighs = recentH.length >= 2 && recentH[recentH.length - 1].price < recentH[recentH.length - 2].price;
  if (!flatBottom || !fallingHighs) return null;
  const support = recentL[recentL.length - 1].price;
  const resistance = recentH[recentH.length - 1].price;
  const mid = (support + resistance) / 2;
  const range = resistance - support;
  return makePattern('tri_descending', '下降三角形', mid, last, resistance - range * 0.15, resistance + range * 0.05, support - range * 0.15, support + range * 0.1, '下边水平、上边下压，跌破下边做空。', true, last);
}

function detectWedgeRising(data: OHLC[], highs: SwingPoint[], lows: SwingPoint[]): DetectedPattern | null {
  if (highs.length < 3 || lows.length < 3) return null;
  const h = highs.slice(-4), l = lows.slice(-4);
  const bothUp = h.length >= 2 && l.length >= 2 && h[h.length - 1].price > h[h.length - 2].price && l[l.length - 1].price > l[l.length - 2].price;
  if (!bothUp) return null;
  const last = data.length - 1;
  const mid = (data[last].high + data[last].low) / 2;
  const range = (Math.max(...data.slice(-10).map((d) => d.high)) - Math.min(...data.slice(-10).map((d) => d.low))) * 0.1;
  return makePattern('wedge_rising', '上升楔形', mid, last, mid - range, mid + range, mid - range * 1.5, mid + range * 0.5, '上升楔形常为反转信号，跌破下轨做空。', true, last);
}

function detectWedgeFalling(data: OHLC[], highs: SwingPoint[], lows: SwingPoint[]): DetectedPattern | null {
  if (highs.length < 3 || lows.length < 3) return null;
  const h = highs.slice(-4), l = lows.slice(-4);
  const bothDown = h.length >= 2 && l.length >= 2 && h[h.length - 1].price < h[h.length - 2].price && l[l.length - 1].price < l[l.length - 2].price;
  if (!bothDown) return null;
  const last = data.length - 1;
  const mid = (data[last].high + data[last].low) / 2;
  const range = (Math.max(...data.slice(-10).map((d) => d.high)) - Math.min(...data.slice(-10).map((d) => d.low))) * 0.1;
  return makePattern('wedge_falling', '下降楔形', mid, last, mid - range, mid + range, mid - range * 0.5, mid + range * 1.5, '下降楔形常为反转信号，突破上轨做多。', false, last);
}

function detectRectangle(data: OHLC[], _highs: SwingPoint[], _lows: SwingPoint[]): DetectedPattern | null {
  if (data.length < 10) return null;
  const recent = data.slice(-15);
  const res = Math.max(...recent.map((d) => d.high));
  const sup = Math.min(...recent.map((d) => d.low));
  const range = res - sup;
  if (range / (sup || 1) > 0.2) return null;
  const lastClose = data[data.length - 1].close;
  const mid = (res + sup) / 2;
  const isNearSup = lastClose < mid;
  const ew = range * 0.1;
  return makePattern(isNearSup ? 'rectangle_bottom' : 'rectangle_top', isNearSup ? '矩形（底部）' : '矩形（顶部）', mid, data.length - 1, (isNearSup ? sup : res) - ew, (isNearSup ? sup : res) + ew, (isNearSup ? res : sup) - ew, (isNearSup ? res : sup) + ew, isNearSup ? '矩形下沿做多、目标上沿。' : '矩形上沿做空、目标下沿。', !isNearSup, data.length - 1);
}

// ----- K 线形态（单根/两三根）-----
function detectHammer(data: OHLC[]): DetectedPattern | null {
  if (data.length < 2) return null;
  const c = data[data.length - 1];
  const body = Math.abs(c.close - c.open);
  const lower = Math.min(c.open, c.close) - c.low;
  const upper = c.high - Math.max(c.open, c.close);
  if (lower < body * 1.5 || upper > body * 0.5) return null;
  const mid = (c.low + c.high) / 2;
  const range = (c.high - c.low) * 0.2;
  return makePattern('hammer', '锤子线', mid, data.length - 1, c.low - range * 0.5, c.low + range, mid - range, mid + range * 1.5, '下跌末端长下影锤子，偏多；突破实体高点确认。', false, data.length - 1);
}

function detectInvertedHammer(data: OHLC[]): DetectedPattern | null {
  if (data.length < 2) return null;
  const c = data[data.length - 1];
  const body = Math.abs(c.close - c.open);
  const upper = c.high - Math.max(c.open, c.close);
  const lower = Math.min(c.open, c.close) - c.low;
  if (upper < body * 1.5 || lower > body * 0.5) return null;
  const mid = (c.low + c.high) / 2;
  const range = (c.high - c.low) * 0.2;
  return makePattern('inverted_hammer', '倒锤子', mid, data.length - 1, mid - range, mid + range, mid - range * 0.5, c.high + range, '下跌末端上影倒锤子，偏多；需下一根确认。', false, data.length - 1);
}

function detectShootingStar(data: OHLC[]): DetectedPattern | null {
  if (data.length < 2) return null;
  const c = data[data.length - 1];
  const body = Math.abs(c.close - c.open);
  const upper = c.high - Math.max(c.open, c.close);
  const lower = Math.min(c.open, c.close) - c.low;
  if (upper < body * 1.5 || lower > body * 0.5) return null;
  const mid = (c.low + c.high) / 2;
  const range = (c.high - c.low) * 0.2;
  return makePattern('shooting_star', '流星线', mid, data.length - 1, mid - range, mid + range, c.low - range, mid - range * 0.5, '上涨末端长上影流星，偏空。', true, data.length - 1);
}

function detectEngulfing(data: OHLC[]): DetectedPattern | null {
  if (data.length < 2) return null;
  const prev = data[data.length - 2], c = data[data.length - 1];
  const bull = c.close > c.open && prev.close < prev.open && c.open <= prev.close && c.close >= prev.open && c.open < prev.open && c.close > prev.close;
  const bear = c.close < c.open && prev.close > prev.open && c.open >= prev.close && c.close <= prev.open && c.open > prev.open && c.close < prev.close;
  if (!bull && !bear) return null;
  const mid = (c.open + c.close) / 2;
  const range = Math.abs(c.close - c.open) * 0.3;
  if (bull) return makePattern('engulfing_bull', '看涨吞没', mid, data.length - 1, c.open - range, c.close + range, c.close + range, c.close + range * 2, '前阴被后阳完全吞没，偏多。', false, data.length - 1);
  return makePattern('engulfing_bear', '看跌吞没', mid, data.length - 1, c.close - range, c.open + range, c.close - range * 2, c.close - range, '前阳被后阴完全吞没，偏空。', true, data.length - 1);
}

function detectHarami(data: OHLC[]): DetectedPattern | null {
  if (data.length < 2) return null;
  const prev = data[data.length - 2], c = data[data.length - 1];
  const prevBody = Math.abs(prev.close - prev.open);
  const cBody = Math.abs(c.close - c.open);
  if (prevBody < cBody * 0.3) return null;
  const bull = c.close > c.open && prev.close < prev.open && c.open > prev.close && c.close < prev.open;
  const bear = c.close < c.open && prev.close > prev.open && c.open < prev.close && c.close > prev.open;
  if (!bull && !bear) return null;
  const mid = (c.open + c.close) / 2;
  const range = prevBody * 0.2;
  if (bull) return makePattern('harami_bull', '看涨孕线', mid, data.length - 1, c.low - range, c.high + range, mid + range, mid + range * 2, '大阴后小阳孕线，偏多。', false, data.length - 1);
  return makePattern('harami_bear', '看跌孕线', mid, data.length - 1, c.low - range, c.high + range, mid - range * 2, mid - range, '大阳后小阴孕线，偏空。', true, data.length - 1);
}

function detectDoji(data: OHLC[]): DetectedPattern | null {
  if (data.length < 1) return null;
  const c = data[data.length - 1];
  const body = Math.abs(c.close - c.open);
  const full = c.high - c.low;
  if (full === 0 || body / full > 0.1) return null;
  const upper = c.high - Math.max(c.open, c.close);
  const lower = Math.min(c.open, c.close) - c.low;
  const mid = (c.high + c.low) / 2;
  const range = full * 0.15;
  if (lower > full * 0.5 && upper < full * 0.2) return makePattern('doji_dragonfly', '蜻蜓十字', mid, data.length - 1, c.low - range, c.high + range, mid - range, mid + range * 1.2, '长下影十字，偏多。', false, data.length - 1);
  if (upper > full * 0.5 && lower < full * 0.2) return makePattern('doji_gravestone', '墓碑十字', mid, data.length - 1, c.low - range, c.high + range, mid - range * 1.2, mid + range, '长上影十字，偏空。', true, data.length - 1);
  return null;
}

function detectMorningStar(data: OHLC[]): DetectedPattern | null {
  if (data.length < 3) return null;
  const a = data[data.length - 3], b = data[data.length - 2], c = data[data.length - 1];
  if (a.close < a.open && b.high - b.low > Math.abs(b.close - b.open) * 2 && c.close > c.open && c.close > (a.open + a.close) / 2 && c.open < b.low + (b.high - b.low) * 0.5) {
    const mid = (c.open + c.close) / 2;
    const range = (c.high - c.low) * 0.2;
    return makePattern('morning_star', '启明星', mid, data.length - 1, c.open - range, c.close + range, c.close + range, c.close + range * 2, '三根K线：大阴+星+大阳，强烈偏多。', false, data.length - 1);
  }
  return null;
}

function detectThreeWhiteSoldiers(data: OHLC[]): DetectedPattern | null {
  if (data.length < 3) return null;
  const a = data[data.length - 3], b = data[data.length - 2], c = data[data.length - 1];
  if (a.close > a.open && b.close > b.open && c.close > c.open && b.open > a.open && b.close > a.close && c.open > b.open && c.close > b.close) {
    const mid = c.close;
    const range = (c.high - c.low) * 0.2;
    return makePattern('three_white_soldiers', '红三兵', mid, data.length - 1, c.open - range, c.close + range, c.close + range, c.close + range * 1.5, '连续三根阳线抬升，偏多。', false, data.length - 1);
  }
  return null;
}

function detectThreeBlackCrows(data: OHLC[]): DetectedPattern | null {
  if (data.length < 3) return null;
  const a = data[data.length - 3], b = data[data.length - 2], c = data[data.length - 1];
  if (a.close < a.open && b.close < b.open && c.close < c.open && b.open < a.open && b.close < a.close && c.open < b.open && c.close < b.close) {
    const mid = c.close;
    const range = (c.high - c.low) * 0.2;
    return makePattern('three_black_crows', '三只乌鸦', mid, data.length - 1, c.close - range, c.open + range, c.close - range * 1.5, c.close - range, '连续三根阴线下跌，偏空。', true, data.length - 1);
  }
  return null;
}

// ----- 区间震荡（兜底）-----
function detectRange(data: OHLC[]): DetectedPattern | null {
  if (data.length < 8) return null;
  const recent = data.slice(-Math.min(20, data.length));
  const resistance = Math.max(...recent.map((d) => d.high));
  const support = Math.min(...recent.map((d) => d.low));
  const range = resistance - support;
  if (range <= 0 || range / (support || 1) > 0.35) return null;
  const lastClose = data[data.length - 1].close;
  const mid = (support + resistance) / 2;
  const isNearSupport = lastClose <= mid;
  const entryWidth = range * 0.1;
  return makePattern(null, '区间震荡', mid, data.length - 1, (isNearSupport ? support : resistance) - entryWidth, (isNearSupport ? support : resistance) + entryWidth, (isNearSupport ? resistance : support) - entryWidth, (isNearSupport ? resistance : support) + entryWidth, isNearSupport ? '区间下沿附近做多、目标上沿。' : '区间上沿附近做空、目标下沿。', !isNearSupport, data.length - 1);
}

/** 检测所有形态，按优先级返回列表（用于展示多种可能） */
export function detectAllPatterns(data: OHLC[], swingSide?: number): DetectedPattern[] {
  if (data.length < 5) return [];
  const out: DetectedPattern[] = [];
  const seen = new Set<string>();
  const add = (p: DetectedPattern | null) => {
    if (p && !seen.has(p.name)) { seen.add(p.name); out.push(p); }
  };
  for (const side of [2, 3]) {
    const s = swingSide ?? side;
    const { highs, lows } = getSwingPoints(data, s);
    add(detectHeadShouldersTop(data, highs, lows));
    add(detectHeadShouldersBottom(data, highs, lows));
    add(detectDoubleTop(data, highs, lows));
    add(detectDoubleBottom(data, highs, lows));
    add(detectTriangleAscending(data, highs, lows));
    add(detectTriangleDescending(data, highs, lows));
    add(detectWedgeRising(data, highs, lows));
    add(detectWedgeFalling(data, highs, lows));
    add(detectRectangle(data, highs, lows));
  }
  add(detectHammer(data));
  add(detectInvertedHammer(data));
  add(detectShootingStar(data));
  add(detectEngulfing(data));
  add(detectHarami(data));
  add(detectDoji(data));
  add(detectMorningStar(data));
  add(detectThreeWhiteSoldiers(data));
  add(detectThreeBlackCrows(data));
  add(detectRange(data));
  return out;
}

/**
 * 主入口：返回优先级最高的一条形态（用于图上标注）
 */
export function detectPattern(data: OHLC[], swingSide?: number): DetectedPattern | null {
  const all = detectAllPatterns(data, swingSide);
  const order = ['head_shoulders_top', 'head_shoulders_bottom', 'double_top', 'double_bottom', 'tri_ascending', 'tri_descending', 'wedge_rising', 'wedge_falling', 'rectangle_top', 'rectangle_bottom', 'hammer', 'inverted_hammer', 'shooting_star', 'engulfing_bull', 'engulfing_bear', 'harami_bull', 'harami_bear', 'morning_star', 'three_white_soldiers', 'three_black_crows', 'doji_dragonfly', 'doji_gravestone', null];
  for (const t of order) {
    const found = all.find((p) => p.type === t);
    if (found) return found;
  }
  return all[0] ?? null;
}

export const TIMEFRAME_DAYS: Record<string, number> = { '1d': 5, '1w': 7, '1m': 30, '3m': 90, '1y': 365 };
export const TIMEFRAME_LABELS: Record<string, string> = { '1d': '1 日', '1w': '1 周', '1m': '1 月', '3m': '3 月', '1y': '1 年' };
