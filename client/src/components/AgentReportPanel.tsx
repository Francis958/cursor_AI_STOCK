import { useState, useEffect } from 'react';
import { fetchAgentReport, fetchLastAgentReport, type AgentReportResponse } from '../api';

// 当仪表盘标的变化时同步到报告标的输入
function useSymbolSync(symbol: string, setReportSymbol: (s: string) => void) {
  useEffect(() => {
    if (symbol) setReportSymbol(symbol);
  }, [symbol, setReportSymbol]);
}

const ANALYST_OPTIONS = [
  { id: 'market', label: 'Market' },
  { id: 'social', label: 'Sentiment (Social)' },
  { id: 'news', label: 'News' },
  { id: 'fundamentals', label: 'Fundamentals' },
] as const;

interface AgentReportPanelProps {
  /** 当前仪表盘标的，默认用于生成报告 */
  symbol: string;
}

export default function AgentReportPanel({ symbol }: AgentReportPanelProps) {
  const [reportSymbol, setReportSymbol] = useState(symbol);
  const [tradeDate, setTradeDate] = useState('');
  const [selectedAnalysts, setSelectedAnalysts] = useState<string[]>(['market', 'social', 'news', 'fundamentals']);
  const [debateRounds, setDebateRounds] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingLast, setLoadingLast] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AgentReportResponse | null>(null);

  useSymbolSync(symbol, setReportSymbol);

  const toggleAnalyst = (id: string) => {
    setSelectedAnalysts((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const runReport = async () => {
    const sym = reportSymbol.trim().toUpperCase();
    if (!sym) {
      setError('请输入标的代码');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await fetchAgentReport({
        symbol: sym,
        date: tradeDate.trim() || undefined,
        selectedAnalysts: selectedAnalysts.length ? selectedAnalysts : undefined,
        config: {
          max_debate_rounds: debateRounds,
          max_risk_discuss_rounds: debateRounds,
        },
      });
      setResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadLastReport = async () => {
    const sym = reportSymbol.trim().toUpperCase();
    if (!sym) {
      setError('请输入标的代码');
      return;
    }
    setError(null);
    setLoadingLast(true);
    try {
      const data = await fetchLastAgentReport(sym);
      setResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingLast(false);
    }
  };

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm lg:col-span-2">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">
        Multi-Agent 报告（TradingAgents）
      </h2>
      <p className="text-gray-500 text-sm mb-4">
        使用 TradingAgents 多智能体框架（Market / Sentiment / News / Fundamentals 分析师 + 辩论 + 风险）生成交易分析。需在服务端配置 Python 与 TradingAgents，见 <code className="bg-gray-100 px-1 rounded">server/agent-report/README.md</code>。首次或辩论轮次多时约 2–8 分钟，可先选「辩论轮次 1」、少勾选分析师以加快。
      </p>

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="block text-xs text-gray-600 mb-1">标的</label>
          <input
            type="text"
            value={reportSymbol}
            onChange={(e) => setReportSymbol(e.target.value.toUpperCase())}
            placeholder="如 NVDA"
            className="border border-gray-300 rounded px-2 py-1.5 text-sm w-24"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">交易日期（可选）</label>
          <input
            type="text"
            value={tradeDate}
            onChange={(e) => setTradeDate(e.target.value)}
            placeholder="2026-01-15"
            className="border border-gray-300 rounded px-2 py-1.5 text-sm w-32"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">辩论轮次</label>
          <input
            type="number"
            min={1}
            max={5}
            value={debateRounds}
            onChange={(e) => setDebateRounds(Number(e.target.value) || 1)}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm w-14"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {ANALYST_OPTIONS.map(({ id, label }) => (
            <label key={id} className="flex items-center gap-1 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={selectedAnalysts.includes(id)}
                onChange={() => toggleAnalyst(id)}
                className="rounded"
              />
              {label}
            </label>
          ))}
        </div>
        <button
          type="button"
          onClick={runReport}
          disabled={loading}
          className="px-4 py-1.5 rounded bg-slate-700 text-white text-sm font-medium hover:bg-slate-600 disabled:opacity-50"
        >
          {loading ? '生成中…（约 2–8 分钟，请勿关闭）' : '生成报告'}
        </button>
        <button
          type="button"
          onClick={loadLastReport}
          disabled={loading || loadingLast || !reportSymbol.trim()}
          className="px-4 py-1.5 rounded border border-slate-400 text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
        >
          {loadingLast ? '加载中…' : '获取上次报告'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      {result && result.ok && (
        <div className="space-y-3 text-sm border-t border-gray-200 pt-4">
          <div className="font-medium text-gray-800">
            标的 {result.symbol}，日期 {result.date}
          </div>
          {result.decision != null && (
            <div className="p-3 rounded bg-slate-50 border border-slate-200">
              <div className="text-xs font-medium text-slate-600 mb-1">决策 / Decision</div>
              <pre className="whitespace-pre-wrap break-words text-gray-800">
                {typeof result.decision === 'object'
                  ? JSON.stringify(result.decision, null, 2)
                  : String(result.decision)}
              </pre>
            </div>
          )}
          {result.final_trade_decision != null && (
            <div className="p-3 rounded bg-amber-50 border border-amber-200">
              <div className="text-xs font-medium text-amber-800 mb-1">最终交易决策</div>
              <pre className="whitespace-pre-wrap break-words text-gray-800">
                {typeof result.final_trade_decision === 'object'
                  ? JSON.stringify(result.final_trade_decision, null, 2)
                  : String(result.final_trade_decision)}
              </pre>
            </div>
          )}
          {result.reports && Object.keys(result.reports).length > 0 && (
            <details className="border border-gray-200 rounded">
              <summary className="px-3 py-2 cursor-pointer font-medium text-gray-700 bg-gray-50">
                各分析师报告摘要
              </summary>
              <div className="p-3 space-y-2">
                {Object.entries(result.reports).map(
                  ([key, text]) =>
                    text && (
                      <div key={key}>
                        <span className="text-xs font-medium text-gray-500 uppercase">{key}</span>
                        <p className="whitespace-pre-wrap text-gray-700 mt-0.5">{text}</p>
                      </div>
                    )
                )}
              </div>
            </details>
          )}
          {result.judge_decision && (
            <div className="p-3 rounded bg-blue-50 border border-blue-200">
              <div className="text-xs font-medium text-blue-800 mb-1">辩论法官结论</div>
              <p className="whitespace-pre-wrap text-gray-800">{result.judge_decision}</p>
            </div>
          )}
          {result.risk_judge_decision && (
            <div className="p-3 rounded bg-purple-50 border border-purple-200">
              <div className="text-xs font-medium text-purple-800 mb-1">风险讨论结论</div>
              <p className="whitespace-pre-wrap text-gray-800">{result.risk_judge_decision}</p>
            </div>
          )}
          {result.trader_plan && (
            <div className="p-3 rounded bg-gray-50 border border-gray-200">
              <div className="text-xs font-medium text-gray-600 mb-1">Trader 投资计划</div>
              <p className="whitespace-pre-wrap text-gray-800">{result.trader_plan}</p>
            </div>
          )}
          {result.investment_plan && (
            <div className="p-3 rounded bg-gray-50 border border-gray-200">
              <div className="text-xs font-medium text-gray-600 mb-1">投资计划</div>
              <p className="whitespace-pre-wrap text-gray-800">{result.investment_plan}</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
