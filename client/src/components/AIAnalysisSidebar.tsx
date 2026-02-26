import { useEffect, useMemo, useState } from 'react';
import { generateAIAnalysis, type AIAnalysisResult } from '../lib/aiAnalysis';
import { fetchHistory, type HistoryPoint } from '../api';
import type { DashboardData } from '../types';

interface AIAnalysisSidebarProps {
  data: DashboardData | null;
  isOpen: boolean;
  onClose: () => void;
}

function Section({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="group border-b border-gray-200 last:border-0" open={defaultOpen}>
      <summary className="flex items-center gap-2 py-2 font-medium text-gray-800 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <span className="text-lg">{icon}</span>
        {title}
      </summary>
      <div className="pb-3 pl-7 text-sm text-gray-600 space-y-1">{children}</div>
    </details>
  );
}

function AnalysisContent({ result }: { result: AIAnalysisResult }) {
  const sentimentLabel = result.sentiment === 'bullish' ? '偏多' : result.sentiment === 'bearish' ? '偏空' : '中性';
  const sentimentColor =
    result.sentiment === 'bullish' ? 'text-green-600' : result.sentiment === 'bearish' ? 'text-red-600' : 'text-amber-600';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">综合情绪</span>
        <span className={`font-medium ${sentimentColor}`}>{sentimentLabel}</span>
      </div>

      <Section title="形态分析" icon="📐">
        <ul className="list-disc list-inside space-y-1">
          {result.formAnalysis.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </Section>

      <Section title="技术分析" icon="📉">
        <ul className="list-disc list-inside space-y-1">
          {result.technicalAnalysis.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </Section>

      {result.periodTechnical && result.periodTechnical.length > 0 && (
        <Section title="过去 1 个月 / 3 个月 / 6 个月 / 1 年 技术形态" icon="📅">
          <ul className="space-y-2">
            {result.periodTechnical.map((p) => (
              <li key={p.period}>
                <span className="font-medium text-gray-700">{p.period}</span>
                <p className="text-gray-600">{p.summary}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="关键水平" icon="📍">
        <ul className="space-y-1">
          {result.keyLevels.map((k) => (
            <li key={k.level} className="flex justify-between">
              <span className="text-gray-500">{k.label}</span>
              <span className="font-mono font-medium">${k.level}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="买入区间" icon="🟢">
        <div className="rounded bg-green-50 border border-green-200 p-2">
          <p className="font-mono font-semibold text-green-800">
            ${result.buyZone.low} – ${result.buyZone.high}
          </p>
          <p className="mt-1 text-gray-600">{result.buyZone.reason}</p>
        </div>
      </Section>

      <Section title="卖出区间" icon="🔴">
        <div className="rounded bg-red-50 border border-red-200 p-2">
          <p className="font-mono font-semibold text-red-800">
            ${result.sellZone.low} – ${result.sellZone.high}
          </p>
          <p className="mt-1 text-gray-600">{result.sellZone.reason}</p>
        </div>
      </Section>

      <Section title="综合结论" icon="📋">
        <p className="leading-relaxed">{result.conclusion}</p>
      </Section>

      <Section title="风险提示" icon="⚠️" defaultOpen={false}>
        <ul className="list-disc list-inside space-y-1 text-amber-800">
          {result.risks.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </Section>

      <p className="text-xs text-gray-400 pt-2">生成时间：{result.generatedAt}</p>
    </div>
  );
}

const HISTORY_DAYS = [30, 90, 180, 365];

export default function AIAnalysisSidebar({ data, isOpen, onClose }: AIAnalysisSidebarProps) {
  const [historyByPeriod, setHistoryByPeriod] = useState<{ days: number; data: HistoryPoint[] }[]>([]);

  useEffect(() => {
    if (!data?.symbol) {
      setHistoryByPeriod([]);
      return;
    }
    let cancelled = false;
    Promise.all(HISTORY_DAYS.map((days) => fetchHistory(data.symbol, days)))
      .then((responses) => {
        if (cancelled) return;
        setHistoryByPeriod(responses.map((r, i) => ({ days: HISTORY_DAYS[i], data: r.data })));
      })
      .catch(() => {
        if (!cancelled) setHistoryByPeriod([]);
      });
    return () => {
      cancelled = true;
    };
  }, [data?.symbol]);

  const result = useMemo(
    () => (data ? generateAIAnalysis(data, historyByPeriod) : null),
    [data?.symbol, data?.expiration, data?.timestamp, data, historyByPeriod]
  );

  if (!isOpen) return null;

  return (
    <aside
      className="w-full md:w-96 shrink-0 bg-white border-l border-gray-200 shadow-lg flex flex-col max-h-[calc(100vh-4rem)] overflow-hidden"
      aria-label="AI 期权分析"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-white">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <span className="text-xl">🤖</span>
          AI 期权分析
          {data?.symbol && (
            <span className="text-sm font-normal text-slate-500">({data.symbol})</span>
          )}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
          aria-label="关闭侧边栏"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {result ? (
          <AnalysisContent result={result} />
        ) : (
          <p className="text-gray-500 text-sm">加载标的并点击 Load 后，将基于期权数据生成形态分析、技术分析与买卖区间。</p>
        )}
      </div>
    </aside>
  );
}
