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
  callIv?: number;
  putIv?: number;
  callSpread?: number;
  putSpread?: number;
}

export interface DashboardData {
  symbol: string;
  dataSource?: 'schwab' | 'mock';
  /** 当 dataSource 为 mock 时，说明为何回退到模拟 */
  mockReason?: string;
  spot: number;
  forward: number;
  dte: number;
  expiration: string;
  atmIv: number;
  atmIvChange?: number;
  riskReversal25d: number;
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
