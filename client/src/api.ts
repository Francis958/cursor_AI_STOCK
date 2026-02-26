import type { DashboardData } from './types';

/** 生产环境可设置 VITE_API_URL 指向后端地址（如 https://你的后端.railway.app）；不设则用相对路径 /api */
const API = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '') || '/api';

/** 检查后端是否已启动 */
export async function checkBackend(): Promise<boolean> {
  try {
    const res = await fetch(`${API}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchDashboard(
  symbol: string,
  expiration?: string,
  strikes?: number
): Promise<DashboardData> {
  const params = new URLSearchParams();
  if (expiration) params.set('expiration', expiration);
  if (strikes != null && strikes > 0) params.set('strikes', String(strikes));
  const q = params.toString();
  const url = `${API}/dashboard/${symbol}${q ? `?${q}` : ''}`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === 'Failed to fetch' || msg.includes('NetworkError') || msg.includes('Load failed')) {
      throw new Error('无法连接后端（请确认已在项目根目录执行 npm run dev 启动前后端）');
    }
    throw e;
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `请求失败 ${res.status}`);
  }
  return res.json();
}

export async function fetchExpirations(symbol: string): Promise<string[]> {
  const res = await fetch(`${API}/expirations/${symbol}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export interface HistoryPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function fetchHistory(
  symbol: string,
  days = 7
): Promise<{ symbol: string; days: number; data: HistoryPoint[]; source?: 'mock' }> {
  const res = await fetch(`${API}/history/${symbol}?days=${days}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** Multi-Agent 报告请求参数（openaiApiKey 为前端用户输入，仅本次请求使用） */
export interface AgentReportRequest {
  symbol: string;
  date?: string;
  selectedAnalysts?: string[];
  config?: { max_debate_rounds?: number; max_risk_discuss_rounds?: number };
  openaiApiKey?: string;
}

/** Multi-Agent 报告响应（TradingAgents 桥接） */
export interface AgentReportResponse {
  ok: boolean;
  symbol?: string;
  date?: string;
  decision?: unknown;
  reports?: Record<string, string | null>;
  trader_plan?: string | null;
  investment_plan?: string | null;
  judge_decision?: string | null;
  risk_judge_decision?: string | null;
  final_trade_decision?: unknown;
  error?: string;
  detail?: string;
}

const AGENT_REPORT_FETCH_TIMEOUT_MS = 18 * 60 * 1000; // 18 分钟，略小于服务端 20 分钟（多分析师+辩论较耗时）

export async function fetchAgentReport(body: AgentReportRequest): Promise<AgentReportResponse> {
  const ac = new AbortController();
  const timeoutId = setTimeout(() => ac.abort(), AGENT_REPORT_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${API}/agent-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ac.signal,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.detail || `请求失败 ${res.status}`);
    return data;
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      throw new Error('请求超时（约 18 分钟）。请减少辩论轮次或分析师后重试；若后端已生成，可点击「获取上次报告」查看。');
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** 获取该标的最近一次成功生成的报告（服务端缓存），用于超时或刷新后查看 */
export async function fetchLastAgentReport(symbol: string): Promise<AgentReportResponse> {
  const res = await fetch(`${API}/agent-report/last?symbol=${encodeURIComponent(symbol)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.detail || `获取失败 ${res.status}`);
  return data;
}
