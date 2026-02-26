/**
 * Schwab API 适配层
 * 数据源：Schwab（已配置时）或模拟（未配置时）。仅使用 Schwab，不使用 Yahoo。
 */
import type { OptionChainResponse, OptionContract } from './types.js';

const SCHWAB_BASE = 'https://api.schwabapi.com';
const SCHWAB_TOKEN_URL = 'https://api.schwabapi.com/v1/oauth/token';

function hasSchwabConfig(): boolean {
  return !!(
    (process.env.SCHWAB_ACCESS_TOKEN || (process.env.SCHWAB_REFRESH_TOKEN && process.env.SCHWAB_APP_KEY && process.env.SCHWAB_APP_SECRET)) &&
    process.env.SCHWAB_APP_KEY
  );
}

/** 是否具备用 refresh_token 刷新 access_token 的配置 */
function canRefreshSchwabToken(): boolean {
  return !!(process.env.SCHWAB_APP_KEY && process.env.SCHWAB_APP_SECRET && process.env.SCHWAB_REFRESH_TOKEN);
}

/**
 * 用 refresh_token 向 Schwab 换取新的 access_token（Access Token 约 30 分钟过期，需定期刷新）
 * 成功后会更新 process.env.SCHWAB_ACCESS_TOKEN，若响应含 refresh_token 也会更新 SCHWAB_REFRESH_TOKEN
 */
async function refreshSchwabToken(): Promise<string> {
  const appKey = process.env.SCHWAB_APP_KEY;
  const appSecret = process.env.SCHWAB_APP_SECRET;
  const refreshToken = process.env.SCHWAB_REFRESH_TOKEN;
  if (!appKey || !appSecret || !refreshToken) {
    throw new Error('Schwab 刷新 Token 需要配置 SCHWAB_APP_KEY、SCHWAB_APP_SECRET、SCHWAB_REFRESH_TOKEN');
  }
  const basic = Buffer.from(`${appKey}:${appSecret}`, 'utf8').toString('base64');
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  const res = await fetch(SCHWAB_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Schwab Token 刷新失败 ${res.status}: ${text}`);
  }
  const data = (await res.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
  if (!data.access_token) {
    throw new Error('Schwab 刷新响应中无 access_token');
  }
  process.env.SCHWAB_ACCESS_TOKEN = data.access_token;
  if (data.refresh_token) process.env.SCHWAB_REFRESH_TOKEN = data.refresh_token;
  console.warn('[Schwab] Access Token 已刷新，有效期约', Math.round((data.expires_in ?? 0) / 60), '分钟');
  return data.access_token;
}

/** 返回当前可用的 Access Token，若仅有 refresh_token 则先刷新再返回 */
async function getValidSchwabAccessToken(): Promise<string> {
  const existing = process.env.SCHWAB_ACCESS_TOKEN;
  if (existing) return existing;
  if (canRefreshSchwabToken()) return refreshSchwabToken();
  throw new Error('未配置 SCHWAB_ACCESS_TOKEN，且无法刷新（需配置 SCHWAB_APP_KEY、SCHWAB_APP_SECRET、SCHWAB_REFRESH_TOKEN）');
}

export type DataSource = 'schwab' | 'mock';

export type OptionChainResult = {
  chain: OptionChainResponse;
  source: DataSource;
  mockReason?: string;
  /** 该标的全部可选到期日（多个月），供前端下拉用 */
  allExpirations?: string[];
};

/** 获取期权链；有 Schwab 配置时仅返回 Schwab 数据，否则返回模拟数据 */
export async function fetchOptionChain(
  symbol: string,
  expiration?: string,
  strikeCount?: number
): Promise<OptionChainResult> {
  if (hasSchwabConfig()) {
    const out = await fetchOptionChainFromSchwab(symbol, expiration, strikeCount);
    return { chain: out.chain, source: 'schwab', allExpirations: out.allExpirations };
  }
  console.warn('[期权数据] 未配置 Schwab，使用模拟数据。请配置 Schwab API 获取真实期权链。');
  const mockOut = await getMockOptionChain(symbol, expiration, strikeCount);
  return {
    chain: mockOut.chain,
    source: 'mock',
    mockReason: '未配置 Schwab API',
    allExpirations: mockOut.allExpirations,
  };
}

/** 从 Schwab 获取期权链（需在开发者门户配置 OAuth 与 Token）；401 时自动尝试刷新 Token 并重试一次 */
async function fetchOptionChainFromSchwab(
  symbol: string,
  expiration?: string,
  strikeCount?: number
): Promise<{ chain: OptionChainResponse; allExpirations: string[] }> {
  const fromDate = new Date().toISOString().slice(0, 10);
  const toDate = new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const params = new URLSearchParams({
    symbol,
    contractType: 'ALL',
    strategy: 'SINGLE',
    range: 'ALL',
    fromDate,
    toDate,
    includeUnderlyingQuote: 'true',
  });
  if (typeof strikeCount === 'number' && strikeCount > 0) params.set('strikeCount', String(strikeCount));
  const url = `${SCHWAB_BASE}/marketdata/v1/chains?${params}`;

  let token = await getValidSchwabAccessToken();
  let res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (res.status === 401 && canRefreshSchwabToken()) {
    token = await refreshSchwabToken();
    res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Schwab API error ${res.status}: ${text}`);
  }

  type ExpDateMap = Record<string, Record<string, unknown[]>>;
  type UnderlyingQuote = {
    close?: number;
    lastPrice?: number;
    regularMarketLastPrice?: number;
    bid?: number;
    ask?: number;
    [k: string]: unknown;
  };
  interface SchwabChainResponse {
    symbol?: string;
    underlying?: UnderlyingQuote;
    /** 部分响应里标的价格在顶层 */
    underlyingPrice?: number;
    callExpDateMap?: ExpDateMap;
    putExpDateMap?: ExpDateMap;
  }
  const data = (await res.json()) as SchwabChainResponse;

  const u = data.underlying;
  let spot =
    (typeof data.underlyingPrice === 'number' && data.underlyingPrice > 0 ? data.underlyingPrice : 0) ||
    (typeof u?.close === 'number' && u.close > 0 ? u.close : 0) ||
    (typeof u?.regularMarketLastPrice === 'number' && u.regularMarketLastPrice > 0 ? u.regularMarketLastPrice : 0) ||
    (typeof u?.lastPrice === 'number' && u.lastPrice > 0 ? u.lastPrice : 0) ||
    (typeof u?.ask === 'number' && u.ask > 0 ? u.ask : 0) ||
    (typeof u?.bid === 'number' && u.bid > 0 ? u.bid : 0) ||
    0;
  if (spot <= 0) {
    spot = seedSpotForSymbol(symbol);
    console.warn('[Schwab] 标的价格未在链式响应中返回，已用模拟值补全:', spot);
  }
  const contracts: OptionContract[] = [];
  const strikes = new Set<number>();

  const pushContracts = (map: ExpDateMap, type: 'call' | 'put') => {
    for (const expStr of Object.keys(map)) {
      for (const strikeStr of Object.keys(map[expStr])) {
        const arr = map[expStr][strikeStr] as Array<Record<string, unknown>>;
        if (!Array.isArray(arr) || arr.length === 0) continue;
        const c = arr[0];
        const strike = Number(c.strikePrice ?? strikeStr);
        strikes.add(strike);
        contracts.push(normalizeSchwabContract(c, type, strike, expStr));
      }
    }
  };

  if (data.callExpDateMap) pushContracts(data.callExpDateMap, 'call');
  if (data.putExpDateMap) pushContracts(data.putExpDateMap, 'put');

  const expirations = Array.from(new Set(contracts.map((c) => c.expiration))).sort();
  const chosenExp = expiration && expirations.includes(expiration)
    ? expiration
    : expirations[0] ?? new Date().toISOString().slice(0, 10);

  const filtered = contracts.filter((c) => c.expiration === chosenExp);
  const strikeList = Array.from(strikes).filter((s) =>
    filtered.some((c) => c.strike === s)
  ).sort((a, b) => a - b);

  const dte = Math.ceil((new Date(chosenExp).getTime() - Date.now()) / (24 * 60 * 60 * 1000));

  return {
    chain: {
      symbol: data.symbol ?? symbol,
      spot,
      expiration: chosenExp,
      dte: Math.max(0, dte),
      contracts: filtered,
      strikes: strikeList,
    },
    allExpirations: expirations,
  };
}

function normalizeSchwabContract(
  c: Record<string, unknown>,
  type: 'call' | 'put',
  strike: number,
  expStr: string
): OptionContract {
  const expDate = expStr.slice(0, 10);
  return {
    symbol: String(c.symbol ?? ''),
    strike,
    expiration: expDate,
    type,
    bid: Number(c.bid ?? 0),
    ask: Number(c.ask ?? 0),
    mark: Number(c.mark ?? (Number(c.bid) + Number(c.ask)) / 2),
    volume: Number(c.totalVolume ?? c.volume ?? 0),
    openInterest: Number(c.openInterest ?? 0),
    delta: Number(c.delta ?? 0),
    gamma: Number(c.gamma ?? 0),
    theta: Number(c.theta ?? 0),
    vega: Number(c.vega ?? 0),
    impliedVolatility: Number(c.volatility ?? 0),
  };
}

/** 按 symbol 生成用于模拟的 spot（无 Schwab 时使用） */
function seedSpotForSymbol(symbol: string): number {
  let n = 100;
  for (let i = 0; i < symbol.length; i++) n += symbol.charCodeAt(i) * 1.5;
  const s = Math.round(n / 10) * 10;
  return s > 0 ? s : 200;
}

/** 模拟期权链（无 Schwab 时使用） */
async function getMockOptionChain(
  symbol: string,
  expiration?: string,
  strikeCount = 200
): Promise<{ chain: OptionChainResponse; allExpirations: string[] }> {
  const spot = seedSpotForSymbol(symbol);
  const allExpirations = nextFewFridays(52);
  const exp = expiration && allExpirations.includes(expiration)
    ? expiration
    : allExpirations[0];
  const dte = Math.ceil((new Date(exp).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  const contracts: OptionContract[] = [];

  // 仅拉取到期日列表时（strikeCount 很小）：返回多到期日的少量合约，便于前端下拉显示多个到期日
  const wantManyExpirationsOnly = !expiration && strikeCount <= 10;
  if (wantManyExpirationsOnly) {
    const atmStrike = Math.round(spot / 5) * 5;
    for (const e of allExpirations) {
      contracts.push(mockContract(symbol, atmStrike, e, 'call', spot), mockContract(symbol, atmStrike, e, 'put', spot));
    }
    return {
      chain: {
        symbol,
        spot,
        forward: spot * 1.0037,
        expiration: allExpirations[0],
        dte: Math.max(0, dte),
        contracts,
        strikes: [atmStrike],
      },
      allExpirations,
    };
  }

  const strikes = generateStrikes(spot, strikeCount);
  for (const strike of strikes) {
    const call = mockContract(symbol, strike, exp, 'call', spot);
    const put = mockContract(symbol, strike, exp, 'put', spot);
    contracts.push(call, put);
  }

  return {
    chain: {
      symbol,
      spot,
      forward: spot * 1.0037,
      expiration: exp,
      dte: Math.max(0, dte),
      contracts,
      strikes,
    },
    allExpirations,
  };
}

/** 返回下一个周五的 YYYY-MM-DD */
function nextFriday(): string {
  const d = new Date();
  const day = d.getDay();
  const add = day <= 5 ? 5 - day : 7 - day + 5;
  d.setDate(d.getDate() + add);
  return d.toISOString().slice(0, 10);
}

/** 模拟多个到期日（接下来多个周五，约 1 年），连上 API 后会被真实多到期日替代 */
function nextFewFridays(count: number): string[] {
  const out: string[] = [];
  let d = new Date();
  const day = d.getDay();
  const toNextFriday = day <= 5 ? 5 - day : 7 - day + 5;
  d.setDate(d.getDate() + toNextFriday);
  for (let i = 0; i < count; i++) {
    out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 7);
  }
  return out;
}

/** 生成行权价列表，保证全部 ≥ 0；高价股用更大步长以覆盖更宽区间 */
function generateStrikes(spot: number, count: number): number[] {
  const step = spot < 50 ? 2.5 : spot < 200 ? 5 : 10;
  const half = Math.floor(count / 2);
  let start = Math.floor((spot - half * step) / step) * step;
  start = Math.max(0, start);
  const out: number[] = [];
  for (let i = 0; i < count; i++) out.push(Math.round((start + i * step) * 100) / 100);
  return out;
}

/** OI 集中在 ATM 附近，使 Put/Call Wall、Max Pain 等关键水平围绕当前价 */
function mockOiNearAtm(strike: number, spot: number, base = 80, peak = 1200): number {
  const sigma = Math.max(spot * 0.25, 2);
  const gaussian = Math.exp(-Math.pow(strike - spot, 2) / (2 * sigma * sigma));
  return Math.round(base + peak * gaussian + (Math.random() * 200));
}

function mockContract(
  symbol: string,
  strike: number,
  expiration: string,
  type: 'call' | 'put',
  spot: number
): OptionContract {
  const moneyness = type === 'call' ? (spot - strike) : (strike - spot);
  const vol = 0.2 + Math.abs(moneyness) / Math.max(spot, 1) * 0.5;
  const oi = mockOiNearAtm(strike, spot);
  const volVolume = Math.round(200 + Math.random() * 600);
  const gamma = type === 'call'
    ? (0.02 - Math.abs(spot - strike) / spot * 0.015)
    : -(0.02 - Math.abs(spot - strike) / spot * 0.015);
  const delta = type === 'call'
    ? (strike <= spot ? 0.5 + (spot - strike) / (spot * 0.1) : 0.5 - (strike - spot) / (spot * 0.1))
    : (strike >= spot ? -0.5 - (strike - spot) / (spot * 0.1) : -0.5 + (spot - strike) / (spot * 0.1));
  const mark = Math.max(0.01, type === 'call'
    ? Math.max(0, spot - strike) + vol * Math.sqrt(spot) * 0.4
    : Math.max(0, strike - spot) + vol * Math.sqrt(spot) * 0.4);

  return {
    symbol: `${symbol} ${expiration} ${strike} ${type}`,
    strike,
    expiration,
    type,
    bid: mark * 0.98,
    ask: mark * 1.02,
    mark,
    volume: volVolume,
    openInterest: oi,
    delta: Math.max(-1, Math.min(1, delta)),
    gamma: Math.max(-0.05, Math.min(0.05, gamma)),
    theta: -0.05,
    vega: 0.1,
    impliedVolatility: vol,
  };
}
