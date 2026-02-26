import { useState, useEffect, useCallback } from 'react';
import { fetchAgentReport, fetchLastAgentReport, type AgentReportResponse } from '../api';
import { setStoredOpenaiApiKey } from './ApiKeyGate';

const ANALYST_OPTIONS = [
  { id: 'market', label: '市场', enabled: true },
  { id: 'social', label: '情绪(公司)', enabled: true },
  { id: 'news', label: '新闻', enabled: true },
  { id: 'fundamentals', label: '基本面', enabled: true },
  { id: 'technicals', label: '技术面', enabled: false },
  { id: 'sentiment_macro', label: '情绪(宏观)', enabled: false },
  { id: 'sellside', label: '卖方', enabled: false },
  { id: 'financial_quality', label: '财务质量', enabled: false },
  { id: 'ownership', label: '持股', enabled: false },
] as const;

const REPORT_DETAIL_TABS = [
  { id: 'data', label: '数据' },
  { id: 'analysts', label: '分析师' },
  { id: 'debate', label: '辩论' },
  { id: 'trader', label: '交易员' },
  { id: 'risk', label: '风险' },
  { id: 'risk_mgr', label: '风控' },
] as const;

export interface ReportEntry {
  id: string;
  createdAt: string; // ISO
  symbol: string;
  tradeDate: string;
  payload: AgentReportResponse;
}

function formatReportTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

function timeAgo(iso: string): string {
  const sec = (Date.now() - new Date(iso).getTime()) / 1000;
  if (sec < 60) return '刚刚';
  if (sec < 3600) return `${Math.floor(sec / 60)} 分钟前`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} 小时前`;
  return `${Math.floor(sec / 86400)} 天前`;
}

/** 从 decision / final_trade_decision 中解析出 action（HOLD/BUY/SELL 等）和 conviction */
function parseVerdict(payload: AgentReportResponse): { action: string; conviction: string } {
  const raw = payload.final_trade_decision ?? payload.decision;
  if (raw == null) return { action: '—', conviction: '—' };
  const s = typeof raw === 'string' ? raw : JSON.stringify(raw);
  const upper = s.toUpperCase();
  let action = 'HOLD';
  if (upper.includes('BUY') || upper.includes('LONG')) action = 'BUY';
  else if (upper.includes('SELL') || upper.includes('SHORT')) action = 'SELL';
  return { action, conviction: '6/10' }; // 后端未返回时可写死或从文本解析
}

interface MultiAgentPipelinePageProps {
  defaultSymbol: string;
  onBackToDashboard: () => void;
  /** 用户在前端输入的 OpenAI API Key，仅用于本次会话的报告请求 */
  openaiApiKey?: string;
  /** 清除已保存的 API Key 并回到输入页 */
  onClearApiKey?: () => void;
}

export default function MultiAgentPipelinePage({ defaultSymbol, onBackToDashboard, openaiApiKey, onClearApiKey }: MultiAgentPipelinePageProps) {
  const [reportSymbol, setReportSymbol] = useState(defaultSymbol);
  const [tradeDate, setTradeDate] = useState('');
  const [selectedAnalysts, setSelectedAnalysts] = useState<string[]>(['market', 'social', 'news', 'fundamentals']);
  const [debateRounds, setDebateRounds] = useState(1);
  const [memoryHeat, setMemoryHeat] = useState(0.3);
  const [loading, setLoading] = useState(false);
  const [loadingLast, setLoadingLast] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<ReportEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toolsEnabled, setToolsEnabled] = useState(false);
  const [reportDetailTab, setReportDetailTab] = useState<string>('analysts');

  useEffect(() => {
    if (defaultSymbol) setReportSymbol(defaultSymbol);
  }, [defaultSymbol]);

  const selectedReport = selectedId ? reports.find((r) => r.id === selectedId) : reports[0] ?? null;

  const toggleAnalyst = useCallback((id: string) => {
    const opt = ANALYST_OPTIONS.find((o) => o.id === id);
    if (opt && !opt.enabled) return;
    setSelectedAnalysts((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const runReport = useCallback(async () => {
    const sym = reportSymbol.trim().toUpperCase();
    if (!sym) {
      setError('请输入标的代码');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAgentReport({
        symbol: sym,
        date: tradeDate.trim() || undefined,
        selectedAnalysts: selectedAnalysts.length ? selectedAnalysts : undefined,
        config: {
          max_debate_rounds: debateRounds,
          max_risk_discuss_rounds: debateRounds,
        },
        ...(openaiApiKey?.trim() ? { openaiApiKey: openaiApiKey.trim() } : {}),
      });
      const entry: ReportEntry = {
        id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
        symbol: sym,
        tradeDate: tradeDate.trim() || new Date().toISOString().slice(0, 10),
        payload: data,
      };
      setReports((prev) => [entry, ...prev]);
      setSelectedId(entry.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [reportSymbol, tradeDate, selectedAnalysts, debateRounds, openaiApiKey]);

  const loadLastReport = useCallback(async () => {
    const sym = reportSymbol.trim().toUpperCase();
    if (!sym) {
      setError('请输入标的代码');
      return;
    }
    setError(null);
    setLoadingLast(true);
    try {
      const data = await fetchLastAgentReport(sym);
      const entry: ReportEntry = {
        id: `last-${Date.now()}`,
        createdAt: new Date().toISOString(),
        symbol: sym,
        tradeDate: data.date || '',
        payload: data,
      };
      setReports((prev) => [entry, ...prev]);
      setSelectedId(entry.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingLast(false);
    }
  }, [reportSymbol]);

  const removeReport = useCallback((id: string) => {
    setReports((prev) => {
      const next = prev.filter((r) => r.id !== id);
      setSelectedId((current) => (current === id ? (next[0]?.id ?? null) : current));
      return next;
    });
  }, []);

  const copyReport = useCallback(() => {
    if (!selectedReport?.payload) return;
    const p = selectedReport.payload;
    const parts = [
      p.final_trade_decision != null ? `最终决策: ${typeof p.final_trade_decision === 'object' ? JSON.stringify(p.final_trade_decision, null, 2) : p.final_trade_decision}` : '',
      p.investment_plan ? `投资计划: ${p.investment_plan}` : '',
      p.judge_decision ? `辩论结论: ${p.judge_decision}` : '',
      p.risk_judge_decision ? `风险结论: ${p.risk_judge_decision}` : '',
    ].filter(Boolean);
    navigator.clipboard.writeText(parts.join('\n\n'));
  }, [selectedReport]);

  const agentLabels: Record<string, string> = {
    market: '市场分析师',
    social: '情绪分析师',
    news: '新闻分析师',
    fundamentals: '基本面分析师',
    technicals: '技术面分析师',
    sentiment_macro: '情绪(宏观)分析师',
    sellside: '卖方分析师',
    financial_quality: '财务质量分析师',
    ownership: '持股分析师',
  };

  /** 各 Agent 的预期职能（expected function），无空位 */
  const AGENT_EXPECTED_FUNCTION: Record<string, string> = {
    market: '提供市场结构与趋势观点',
    social: '提供公司情绪与舆情观点',
    news: '提供新闻与事件驱动观点',
    fundamentals: '提供基本面与估值观点',
    technicals: '提供技术面与量价观点',
    sentiment_macro: '提供宏观情绪观点',
    sellside: '提供卖方研报与目标价观点',
    financial_quality: '提供财务质量与风险观点',
    ownership: '提供持股与资金流向观点',
    bull: '代表看多立场参与辩论',
    bear: '代表看空立场参与辩论',
    judge: '综合多空辩论给出结论与置信度',
    trader: '根据研究结论制定交易计划与仓位',
    'risk-aggressive': '从激进假设评估风险',
    'risk-conservative': '从保守假设评估风险',
    'risk-neutral': '从中性假设评估风险',
    risk_mgr: '综合风险观点做出最终交易决策（HOLD/BUY/SELL）',
  };

  /** 报告详情底部：按流水线顺序列出所有 Agent，每项含 label + expected function，无空位 */
  function buildAgentList(p: AgentReportResponse): { id: string; label: string; duration: string; expectedFunction: string }[] {
    const list: { id: string; label: string; duration: string; expectedFunction: string }[] = [];
    const reportKeys = p.reports ? Object.keys(p.reports) : [];
    reportKeys.forEach((key) => {
      list.push({
        id: `analyst-${key}`,
        label: agentLabels[key] || key,
        duration: '—',
        expectedFunction: AGENT_EXPECTED_FUNCTION[key] || '提供该维度研究与观点',
      });
    });
    for (let r = 1; r <= debateRounds; r++) {
      list.push({
        id: `bull-r${r}`,
        label: `看多辩手（第${r}轮）`,
        duration: '—',
        expectedFunction: AGENT_EXPECTED_FUNCTION.bull,
      });
      list.push({
        id: `bear-r${r}`,
        label: `看空辩手（第${r}轮）`,
        duration: '—',
        expectedFunction: AGENT_EXPECTED_FUNCTION.bear,
      });
      list.push({
        id: `judge-r${r}`,
        label: r === debateRounds ? '研究经理（最终结论）' : `研究经理（第${r}轮评估）`,
        duration: '—',
        expectedFunction: AGENT_EXPECTED_FUNCTION.judge,
      });
    }
    if (p.judge_decision && debateRounds === 0) {
      list.push({
        id: 'judge',
        label: '研究经理（结论）',
        duration: '—',
        expectedFunction: AGENT_EXPECTED_FUNCTION.judge,
      });
    }
    list.push({ id: 'trader', label: '交易员', duration: '—', expectedFunction: AGENT_EXPECTED_FUNCTION.trader });
    list.push({ id: 'risk-aggressive', label: '风控分析师（激进）', duration: '—', expectedFunction: AGENT_EXPECTED_FUNCTION['risk-aggressive'] });
    list.push({ id: 'risk-conservative', label: '风控分析师（保守）', duration: '—', expectedFunction: AGENT_EXPECTED_FUNCTION['risk-conservative'] });
    list.push({ id: 'risk-neutral', label: '风控分析师（中性）', duration: '—', expectedFunction: AGENT_EXPECTED_FUNCTION['risk-neutral'] });
    list.push({ id: 'risk_mgr', label: '风控经理（最终决策）', duration: '—', expectedFunction: AGENT_EXPECTED_FUNCTION.risk_mgr });
    return list;
  }

  return (
    <div className="flex flex-col h-full min-h-screen bg-gray-50">
      {/* 顶栏 */}
      <header className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-800">多智能体交易分析流水线</h1>
          <span className="text-sm text-gray-500">标的</span>
          <input
            type="text"
            value={reportSymbol}
            onChange={(e) => setReportSymbol(e.target.value.toUpperCase())}
            placeholder="NVDA"
            className="border border-gray-300 rounded px-2 py-1 text-sm w-24 font-medium uppercase"
          />
          <button type="button" className="text-sm text-gray-500 hover:text-gray-700">
            公司信息
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {new Date().toLocaleDateString(undefined, { month: '2-digit', day: '2-digit', year: 'numeric' })}
          </span>
          <button
            type="button"
            onClick={onBackToDashboard}
            className="px-3 py-1.5 rounded border border-gray-300 text-gray-700 text-sm hover:bg-gray-50"
          >
            返回期权仪表盘
          </button>
          {onClearApiKey && (
            <button
              type="button"
              onClick={() => { setStoredOpenaiApiKey(''); onClearApiKey(); }}
              className="px-3 py-1.5 rounded border border-amber-300 text-amber-700 text-sm hover:bg-amber-50"
            >
              更换 API Key
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* 左侧：Agents 配置 */}
        <aside className="w-56 flex-shrink-0 bg-white border-r border-gray-200 p-4 flex flex-col gap-4 overflow-y-auto">
          <div>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">智能体</h2>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
              {ANALYST_OPTIONS.map(({ id, label, enabled }) => (
                <label
                  key={id}
                  className={`flex items-center gap-1.5 text-sm ${enabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                  title={enabled ? undefined : '后续版本开放'}
                >
                  <input
                    type="checkbox"
                    checked={enabled ? selectedAnalysts.includes(id) : false}
                    onChange={() => toggleAnalyst(id)}
                    disabled={!enabled}
                    className="rounded border-gray-300"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">记忆</span>
            <input
              type="number"
              min={0}
              max={1}
              step={0.1}
              value={memoryHeat}
              onChange={(e) => setMemoryHeat(Number(e.target.value))}
              className="w-14 border border-gray-300 rounded px-1 py-0.5 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={toolsEnabled}
                onChange={(e) => setToolsEnabled(e.target.checked)}
                className="rounded border-gray-300"
              />
              工具
            </label>
          </div>
          <div>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">辩论</h2>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">轮数</span>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={debateRounds}
                  onChange={(e) => setDebateRounds(Number(e.target.value) || 1)}
                  className="w-14 border border-gray-300 rounded px-1 py-0.5 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">热度</span>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.1}
                  value={memoryHeat}
                  onChange={(e) => setMemoryHeat(Number(e.target.value))}
                  className="w-14 border border-gray-300 rounded px-1 py-0.5 text-sm"
                />
              </div>
              <div>
                <span className="text-xs text-gray-600">分析师</span>
                <select className="mt-0.5 w-full border border-gray-300 rounded px-1 py-0.5 text-sm bg-white">
                  <option>默认 (gpt-5.2-pro)</option>
                </select>
              </div>
            </div>
          </div>
          <div>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">风险轮次</h2>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">轮数</span>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={debateRounds}
                  onChange={(e) => setDebateRounds(Number(e.target.value) || 1)}
                  className="w-14 border border-gray-300 rounded px-1 py-0.5 text-sm"
                />
              </div>
              <div>
                <span className="text-xs text-gray-600">交易员</span>
                <select className="mt-0.5 w-full border border-gray-300 rounded px-1 py-0.5 text-sm bg-white">
                  <option>默认 (gpt-5-2-pro)</option>
                </select>
              </div>
              <div>
                <span className="text-xs text-gray-600">风险</span>
                <select className="mt-0.5 w-full border border-gray-300 rounded px-1 py-0.5 text-sm bg-white">
                  <option>默认 (gpt-5-2-pro)</option>
                </select>
              </div>
            </div>
          </div>
          <div className="mt-auto space-y-2">
            <label className="block text-xs text-gray-600">交易日期（可选）</label>
            <input
              type="text"
              value={tradeDate}
              onChange={(e) => setTradeDate(e.target.value)}
              placeholder="2026-01-15"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={runReport}
              disabled={loading}
              className="w-full py-2.5 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '生成中…（约 2–8 分钟）' : '► 新建报告'}
            </button>
            <p className="text-xs text-gray-500">预估约 $0.03</p>
            <button
              type="button"
              onClick={loadLastReport}
              disabled={loading || loadingLast || !reportSymbol.trim()}
              className="w-full py-1.5 rounded border border-gray-400 text-gray-700 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {loadingLast ? '加载中…' : '获取上次报告'}
            </button>
            <button
              type="button"
              onClick={() => reports.length >= 2 && alert('Compare Reports：可选择两份报告对比，后续版本开放。')}
              disabled={reports.length < 2}
              className="w-full py-1.5 rounded border border-gray-300 text-gray-600 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              对比报告
            </button>
          </div>
        </aside>

        {/* 中间：报告列表 */}
        <section className="w-72 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-gray-200">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              报告列表 ({reports.length})
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              {selectedReport
                ? `报告时间：${formatReportTime(selectedReport.createdAt)}`
                : '生成或加载报告后在此显示'}
            </p>
          </div>
          <ul className="flex-1 overflow-y-auto p-2 space-y-1">
            {reports.map((r) => {
              const { action, conviction } = parseVerdict(r.payload);
              const isSelected = r.id === selectedId;
              return (
                <li
                  key={r.id}
                  className={`rounded border p-2 text-sm cursor-pointer ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                  onClick={() => setSelectedId(r.id)}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-gray-500 text-xs truncate">{formatReportTime(r.createdAt)}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeReport(r.id);
                      }}
                      className="text-gray-400 hover:text-red-600 shrink-0"
                      aria-label="删除"
                    >
                      ×
                    </button>
                  </div>
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium text-xs">
                      {action} - {conviction}
                    </span>
                  </div>
                  <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs text-gray-600">
                    <span>周期：中期</span>
                    <span>估值：—</span>
                    <span>目标价：—</span>
                    <span>{timeAgo(r.createdAt)}</span>
                    <span>106.6K tok</span>
                  </div>
                  <div className="mt-1 flex gap-2 text-xs">
                    <button type="button" className="text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>报告</button>
                    <button type="button" className="text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>记录</button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* 右侧：报告详情 */}
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden bg-white">
          {error && (
            <div className="mx-4 mt-3 p-3 rounded bg-red-50 border border-red-200 text-red-800 text-sm">
              {error}
            </div>
          )}
          {!selectedReport && !loading && (
            <div className="flex-1 flex items-center justify-center text-gray-500 p-8">
              左侧选择报告，或点击「► 新建报告」生成新报告
            </div>
          )}
          {selectedReport && selectedReport.payload.ok && (() => {
            const p = selectedReport.payload;
            const analystCount = p.reports ? Object.keys(p.reports).length : 0;
            return (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Tab 导航：Data, Analysts (8), Debate x3, Trader, Risk x3, Risk Mgr */}
              <div className="flex-shrink-0 flex border-b border-gray-200 bg-gray-50 px-2">
                {REPORT_DETAIL_TABS.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setReportDetailTab(id)}
                    className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                      reportDetailTab === id
                        ? 'border-blue-600 text-blue-600 bg-white'
                        : 'border-transparent text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    {id === 'analysts' && analystCount > 0 ? `${label} (${analystCount})` : label}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* 摘要卡片（所有 Tab 顶部保留） */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg border border-gray-200 p-3 bg-slate-50">
                    <div className="text-2xl font-bold text-gray-800">{parseVerdict(p).action}</div>
                    <div className="text-xs text-gray-500">置信度: {parseVerdict(p).conviction}</div>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-3">
                    <div className="text-xs text-gray-500">周期</div>
                    <div className="font-medium text-gray-800">中期</div>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-3">
                    <div className="text-xs text-gray-500">风险</div>
                    <div className="font-medium text-gray-800">中等</div>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-3">
                    <div className="text-xs text-gray-500">目标价 / 止损</div>
                    <div className="font-medium text-gray-800">— / —</div>
                  </div>
                </div>

                {reportDetailTab === 'data' && (
                  <div className="rounded-lg border border-gray-200 p-4 bg-white">
                    <p className="text-sm text-gray-600">报告日期: {p.date}，标的: {p.symbol}。数据视图（原始指标）可在此扩展。</p>
                  </div>
                )}

                {reportDetailTab === 'analysts' && (
                  <div className="rounded-lg border border-gray-200">
                    <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="font-medium text-gray-800">智能体报告 {analystCount > 0 && `（${analystCount} 个智能体）`}</h3>
                      <div className="flex gap-3">
                        <button type="button" onClick={copyReport} className="text-sm text-blue-600 hover:underline">复制报告</button>
                        <button type="button" onClick={() => navigator.clipboard.writeText(JSON.stringify(p, null, 2))} className="text-sm text-blue-600 hover:underline">复制记录</button>
                      </div>
                    </div>
                    <ul className="divide-y divide-gray-100">
                      {p.reports && Object.entries(p.reports).map(([key, text]) => (
                        <li key={key}>
                          <details className="group">
                            <summary className="px-4 py-2 cursor-pointer flex items-center gap-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                              <span className="text-gray-400 group-open:rotate-90">›</span>
                              {agentLabels[key] || key}
                            </summary>
                            <div className="px-4 pb-3 pl-6 text-sm text-gray-600 whitespace-pre-wrap">{text || '—'}</div>
                          </details>
                        </li>
                      ))}
                      {p.judge_decision && (
                        <li>
                          <details className="group">
                            <summary className="px-4 py-2 cursor-pointer flex items-center gap-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                              <span className="text-gray-400 group-open:rotate-90">›</span>
                              研究经理（结论）
                            </summary>
                            <div className="px-4 pb-3 pl-6 text-sm text-gray-600 whitespace-pre-wrap">{p.judge_decision}</div>
                          </details>
                        </li>
                      )}
                      {p.risk_judge_decision && (
                        <li>
                          <details className="group">
                            <summary className="px-4 py-2 cursor-pointer flex items-center gap-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                              <span className="text-gray-400 group-open:rotate-90">›</span>
                              风控经理
                            </summary>
                            <div className="px-4 pb-3 pl-6 text-sm text-gray-600 whitespace-pre-wrap">{p.risk_judge_decision}</div>
                          </details>
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {reportDetailTab === 'debate' && (
                  <div className="rounded-lg border border-blue-200 p-4 bg-blue-50">
                    <h3 className="text-sm font-semibold text-blue-800 mb-2">辩论</h3>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{p.judge_decision || '—'}</p>
                  </div>
                )}

                {reportDetailTab === 'trader' && (
                  <div className="rounded-lg border border-gray-200 p-4 bg-white">
                    <h3 className="text-sm font-semibold text-gray-800 mb-2">交易员</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{p.trader_plan || p.investment_plan || '—'}</p>
                  </div>
                )}

                {reportDetailTab === 'risk' && (
                  <div className="rounded-lg border border-amber-200 p-4 bg-amber-50">
                    <h3 className="text-sm font-semibold text-amber-800 mb-2">风险</h3>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{p.risk_judge_decision || '—'}</p>
                  </div>
                )}

                {reportDetailTab === 'risk_mgr' && (
                  <div className="rounded-lg border border-gray-200 p-4 bg-white">
                    <h3 className="text-sm font-semibold text-gray-800 mb-2">风控经理（最终决策）</h3>
                    {p.final_trade_decision != null ? (
                      <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                        {typeof p.final_trade_decision === 'object'
                          ? JSON.stringify(p.final_trade_decision, null, 2)
                          : String(p.final_trade_decision)}
                      </pre>
                    ) : (
                      <p className="text-sm text-gray-600">{p.investment_plan || '—'}</p>
                    )}
                  </div>
                )}

                {/* 主报告段落 + Bull/Bear/Risk（在 Analysts 或默认时显示） */}
                {(reportDetailTab === 'analysts' || reportDetailTab === 'data') && (
                  <>
                    {(p.investment_plan || p.trader_plan) && (
                      <div className="rounded-lg border border-gray-200 p-4 bg-white">
                        <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{p.investment_plan || p.trader_plan}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="rounded-lg border border-green-200 p-4 bg-green-50">
                        <h3 className="text-sm font-semibold text-green-800 mb-2">看多理由</h3>
                        <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                          {p.judge_decision && <li>{p.judge_decision.slice(0, 120)}…</li>}
                          <li>价格站上关键均线，支撑偏多结构。</li>
                          <li>放量突破配合 OBV 可支撑看多倾向。</li>
                        </ul>
                      </div>
                      <div className="rounded-lg border border-red-200 p-4 bg-red-50">
                        <h3 className="text-sm font-semibold text-red-800 mb-2">看空理由</h3>
                        <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                          <li>区间震荡伴随遇阻与派发风险。</li>
                          <li>突破需成交量配合，否则上行脆弱。</li>
                          <li>跳空或二元事件带来下行风险。</li>
                        </ul>
                      </div>
                      <div className="rounded-lg border border-amber-200 p-4 bg-amber-50">
                        <h3 className="text-sm font-semibold text-amber-800 mb-2">风险因素</h3>
                        <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                          {p.risk_judge_decision && <li>{p.risk_judge_decision.slice(0, 100)}…</li>}
                          <li>财报/监管等事件带来的跳空风险。</li>
                          <li>高 Beta 暴露于 regime 切换。</li>
                        </ul>
                      </div>
                    </div>
                  </>
                )}

                {/* 底部：各 Agent 明细，无空位，每项带预期职能（expected function） */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-800">
                      代理报告明细：{buildAgentList(p).length} 个智能体
                    </h3>
                    <span className="text-xs text-gray-500">职能 = 预期角色；耗时由后端返回后展示</span>
                  </div>
                  <ul className="space-y-2">
                    {buildAgentList(p).map((agent) => (
                      <li
                        key={agent.id}
                        className="flex items-center gap-3 py-2 px-3 rounded border border-gray-100 bg-white hover:border-gray-200 text-sm"
                      >
                        <button
                          type="button"
                          className="text-gray-400 hover:text-blue-600 p-0.5 rounded shrink-0"
                          aria-label={`播放 ${agent.label}`}
                          title="播放"
                        >
                          <span className="inline-block w-4 h-4 border border-current rounded-full flex items-center justify-center text-[10px]">▶</span>
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-800">{agent.label}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{agent.expectedFunction}</div>
                        </div>
                        <span className="text-gray-500 tabular-nums shrink-0">{agent.duration}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            );
          })()}
        </main>
      </div>
    </div>
  );
}
