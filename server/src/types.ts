/** 期权合约（单腿） */
export interface OptionContract {
  symbol: string;
  strike: number;
  expiration: string; // YYYY-MM-DD
  type: 'call' | 'put';
  bid: number;
  ask: number;
  mark: number;
  volume: number;
  openInterest: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  impliedVolatility: number;
}

/** 按行权价汇总的看涨/看跌 */
export interface StrikeData {
  strike: number;
  callOi: number;
  putOi: number;
  callVolume: number;
  putVolume: number;
  callGamma: number;
  putGamma: number;
  callGex: number;
  putGex: number;
  netGex: number;
  callDelta?: number;
  putDelta?: number;
  callVanna?: number;
  putVanna?: number;
  callVega?: number;
  putVega?: number;
  callTheta?: number;
  putTheta?: number;
  /** 隐含波动率（0-1），用于 IV Skew / Vol Surface */
  callIv?: number;
  putIv?: number;
  callSpread?: number;
  putSpread?: number;
}

/** 期权链 + 标的 */
export interface OptionChainResponse {
  symbol: string;
  spot: number;
  forward?: number;
  expiration: string;
  dte: number;
  contracts: OptionContract[];
  strikes: number[];
}

/** 仪表盘所需完整数据 */
export interface DashboardData {
  symbol: string;
  dataSource?: 'schwab' | 'mock';
  /** 当 dataSource 为 mock 时，可说明为何回退到模拟 */
  mockReason?: string;
  spot: number;
  forward: number;
  dte: number;
  expiration: string;
  atmIv: number;           // 平价 IV，如 0.935
  atmIvChange?: number;    // -0.036
  riskReversal25d: number; // 25 delta RR，如 0.1041
  riskReversal25dDollar?: number;
  callOi: number;
  putOi: number;
  putCallOiRatio: number;
  callVolume: number;
  putVolume: number;
  putCallVolRatio: number;
  netGex: number;
  timestamp: string;
  byStrike: StrikeData[];
  maxPain: number;
  putWallStrike: number;
  putWallGex?: number;
  callWallStrike: number;
  callWallOi?: number;
  gammaFlipStrike: number;
  expectedMovePct: number;
  expectedMoveDollar: number;
}
