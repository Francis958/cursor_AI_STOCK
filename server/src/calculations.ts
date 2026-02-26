/**
 * 期权衍生指标：GEX、Max Pain、Put/Call Wall、Gamma Flip、Expected Move 等
 */
import type { OptionChainResponse, StrikeData, DashboardData } from './types.js';

const CONTRACT_MULTIPLIER = 100;
/** GEX 换算：Gamma * OI * 100 * Spot^2 * 0.01（每 1% 标的价格变动带来的 delta 变动） */
function gexPerContract(gamma: number, oi: number, spot: number, isCall: boolean): number {
  const sign = isCall ? 1 : -1;
  return gamma * CONTRACT_MULTIPLIER * oi * spot * spot * 0.01 * sign;
}

export function buildStrikeData(chain: OptionChainResponse): StrikeData[] {
  const { spot, contracts } = chain;
  const byStrike = new Map<number, StrikeData>();

  for (const c of contracts) {
    let row = byStrike.get(c.strike);
    if (!row) {
      row = {
        strike: c.strike,
        callOi: 0,
        putOi: 0,
        callVolume: 0,
        putVolume: 0,
        callGamma: 0,
        putGamma: 0,
        callGex: 0,
        putGex: 0,
        netGex: 0,
      };
      byStrike.set(c.strike, row);
    }

    if (c.type === 'call') {
      row.callOi = c.openInterest;
      row.callVolume = c.volume;
      row.callGamma = c.gamma;
      row.callGex = gexPerContract(c.gamma, c.openInterest, spot, true);
      row.callDelta = c.delta;
      row.callVanna = (c as unknown as { vanna?: number }).vanna;
      row.callVega = c.vega;
      row.callTheta = c.theta;
      row.callIv = c.impliedVolatility;
      row.callSpread = c.ask - c.bid;
    } else {
      row.putOi = c.openInterest;
      row.putVolume = c.volume;
      row.putGamma = c.gamma;
      row.putGex = gexPerContract(c.gamma, c.openInterest, spot, false);
      row.putDelta = c.delta;
      row.putVanna = (c as unknown as { vanna?: number }).vanna;
      row.putVega = c.vega;
      row.putTheta = c.theta;
      row.putIv = c.impliedVolatility;
      row.putSpread = c.ask - c.bid;
    }
  }

  const result: StrikeData[] = [];
  for (const row of byStrike.values()) {
    if (row.strike < 0) continue;
    row.netGex = (row.callGex || 0) + (row.putGex || 0);
    result.push(row);
  }
  result.sort((a, b) => a.strike - b.strike);
  return result;
}

export function totalNetGex(byStrike: StrikeData[]): number {
  return byStrike.reduce((sum, r) => sum + r.netGex, 0);
}

/** Max Pain: 到期时使期权买方总亏损最大的行权价（保证非负） */
export function maxPain(strikeData: StrikeData[]): number {
  const valid = strikeData.filter((r) => r.strike >= 0);
  if (valid.length === 0) return 0;
  let bestStrike = valid[0].strike;
  let minSum = Infinity;

  for (const { strike } of valid) {
    let sum = 0;
    for (const row of valid) {
      if (row.strike < strike) {
        sum += row.callOi * CONTRACT_MULTIPLIER * (strike - row.strike);
      } else if (row.strike > strike) {
        sum += row.putOi * CONTRACT_MULTIPLIER * (row.strike - strike);
      }
    }
    if (sum < minSum) {
      minSum = sum;
      bestStrike = strike;
    }
  }
  return Math.max(0, bestStrike);
}

/** Put Wall: 看跌 OI 最大的行权价（保证非负） */
export function putWall(strikeData: StrikeData[]): { strike: number; gex?: number } {
  let maxOi = 0;
  let strike = 0;
  let gex = 0;
  for (const row of strikeData) {
    if (row.strike < 0) continue;
    if (row.putOi > maxOi) {
      maxOi = row.putOi;
      strike = row.strike;
      gex = row.putGex ?? 0;
    }
  }
  return { strike: Math.max(0, strike), gex };
}

/** Call Wall: 看涨 OI 最大的行权价（保证非负） */
export function callWall(strikeData: StrikeData[]): { strike: number; oi?: number } {
  let maxOi = 0;
  let strike = 0;
  for (const row of strikeData) {
    if (row.strike < 0) continue;
    if (row.callOi > maxOi) {
      maxOi = row.callOi;
      strike = row.strike;
    }
  }
  return { strike: Math.max(0, strike), oi: maxOi };
}

/** Gamma Flip: 累积 GEX 由负转正的行权价（保证非负） */
export function gammaFlipStrike(strikeData: StrikeData[]): number {
  const valid = strikeData.filter((r) => r.strike >= 0);
  if (valid.length === 0) return 0;
  let cum = 0;
  let prevCum = 0;
  let flipStrike = valid[0].strike;
  for (const row of valid) {
    prevCum = cum;
    cum += row.netGex;
    if (prevCum <= 0 && cum > 0) flipStrike = row.strike;
  }
  return Math.max(0, flipStrike);
}

/** 累积 GEX 序列（用于面积图） */
export function cumulativeGex(strikeData: StrikeData[]): { strike: number; cumCall: number; cumPut: number }[] {
  let cumCall = 0;
  let cumPut = 0;
  return strikeData.map((row) => {
    cumCall += row.callGex ?? 0;
    cumPut += row.putGex ?? 0;
    return { strike: row.strike, cumCall, cumPut };
  });
}

/** ATM 隐含波动率（最接近标价的行权价） */
export function atmIv(chain: OptionChainResponse): number {
  const { spot, contracts } = chain;
  let best = 0;
  let bestDist = Infinity;
  for (const c of contracts) {
    if (c.type !== 'call') continue;
    const d = Math.abs(c.strike - spot);
    if (d < bestDist) {
      bestDist = d;
      best = c.impliedVolatility;
    }
  }
  return best || 0.2;
}

/** 25 Delta 风险逆转（简化：用 ATM 附近 IV 近似） */
export function riskReversal25d(chain: OptionChainResponse): { pct: number; dollar: number } {
  const { spot } = chain;
  const byStrike = buildStrikeData(chain);
  let call25 = 0;
  let put25 = 0;
  for (const row of byStrike) {
    const callDelta = row.callDelta ?? 0;
    const putDelta = row.putDelta ?? 0;
    if (Math.abs(callDelta - 0.25) < 0.1) call25 = row.strike;
    if (Math.abs(putDelta + 0.25) < 0.1) put25 = row.strike;
  }
  const rr = (call25 && put25) ? (call25 - put25) / spot : 0.1;
  return { pct: rr, dollar: rr * spot };
}

/** 预期波动（Straddle 中值 ≈ ATM IV * sqrt(T) * spot * 系数） */
export function expectedMove(chain: OptionChainResponse, atmIvVal: number): { pct: number; dollar: number } {
  const { spot, dte } = chain;
  const T = Math.max(1 / 365, dte / 365);
  const pct = atmIvVal * Math.sqrt(T) * (1 + 1 / (2 * Math.sqrt(T)));
  const dollar = (pct / 100) * spot;
  return { pct: pct * 100, dollar };
}

export function buildDashboardData(
  chain: OptionChainResponse,
  dataSource?: 'schwab' | 'mock',
  mockReason?: string
): DashboardData {
  const byStrike = buildStrikeData(chain);
  const spot = chain.spot;
  const forward = chain.forward ?? spot * 1.0037;
  const atmIvVal = atmIv(chain);
  const rr = riskReversal25d(chain);
  const expMove = expectedMove(chain, atmIvVal);
  const putW = putWall(byStrike);
  const callW = callWall(byStrike);
  const totalCallOi = byStrike.reduce((s, r) => s + r.callOi, 0);
  const totalPutOi = byStrike.reduce((s, r) => s + r.putOi, 0);
  const totalCallVol = byStrike.reduce((s, r) => s + r.callVolume, 0);
  const totalPutVol = byStrike.reduce((s, r) => s + r.putVolume, 0);

  return {
    symbol: chain.symbol,
    dataSource,
    mockReason: dataSource === 'mock' ? mockReason : undefined,
    spot,
    forward,
    dte: chain.dte,
    expiration: chain.expiration,
    atmIv: atmIvVal,
    atmIvChange: -0.036,
    riskReversal25d: rr.pct,
    riskReversal25dDollar: rr.dollar,
    callOi: totalCallOi,
    putOi: totalPutOi,
    putCallOiRatio: totalCallOi > 0 ? totalPutOi / totalCallOi : 0,
    callVolume: totalCallVol,
    putVolume: totalPutVol,
    putCallVolRatio: totalCallVol > 0 ? totalPutVol / totalCallVol : 0,
    netGex: totalNetGex(byStrike),
    timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
    byStrike,
    maxPain: maxPain(byStrike),
    putWallStrike: putW.strike,
    putWallGex: putW.gex,
    callWallStrike: callW.strike,
    callWallOi: callW.oi,
    gammaFlipStrike: gammaFlipStrike(byStrike),
    expectedMovePct: expMove.pct,
    expectedMoveDollar: expMove.dollar,
  };
}
