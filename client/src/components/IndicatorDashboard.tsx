import { useEffect, useState } from 'react';
import { fetchHistory } from '../api';
import { summarizeIndicators } from '../lib/indicators';
import type { DashboardData } from '../types';

interface IndicatorDashboardProps {
  data: DashboardData | null;
}

export default function IndicatorDashboard({ data }: IndicatorDashboardProps) {
  const [historySummary, setHistorySummary] = useState<ReturnType<typeof summarizeIndicators> | null>(null);

  useEffect(() => {
    if (!data?.symbol) {
      setHistorySummary(null);
      return;
    }
    fetchHistory(data.symbol, 30)
      .then((res) => setHistorySummary(summarizeIndicators(res.data || [])))
      .catch(() => setHistorySummary(null));
  }, [data?.symbol]);

  if (!data) {
    return (
      <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800">技术指标概览</h2>
        <p className="text-gray-500 text-sm">加载标的后显示期权与价格技术指标。</p>
      </section>
    );
  }

  const pcRatio = data.putCallOiRatio;
  const ivPct = (data.atmIv * 100).toFixed(1);
  const ivLevel = data.atmIv >= 0.4 ? '偏高' : data.atmIv <= 0.2 ? '偏低' : '中性';
  const gexSign = data.netGex >= 0 ? '正' : '负';
  const gexHint = data.netGex >= 0 ? '做市商偏多，易抑制波动' : '做市商偏空，波动易放大';

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm lg:col-span-2">
      <h2 className="text-lg font-semibold text-gray-800 mb-1">技术指标概览</h2>
      <p className="text-gray-500 text-sm mb-4">期权与价格常用指标，供参考（不构成投资建议）</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
          <div className="text-xs font-medium text-slate-600">期权情绪 P/C OI</div>
          <div className="text-lg font-bold text-slate-800">{pcRatio.toFixed(2)}</div>
          <div className="text-xs text-slate-600 mt-0.5">
            {pcRatio < 0.8 ? '偏多' : pcRatio > 1.2 ? '偏空' : '中性'}（&lt;0.8 偏多，&gt;1.2 偏空）
          </div>
        </div>
        <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
          <div className="text-xs font-medium text-amber-800">隐含波动率</div>
          <div className="text-lg font-bold text-amber-900">{ivPct}%</div>
          <div className="text-xs text-amber-700">{ivLevel}（高=期权贵，低=期权便宜）</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <div className="text-xs font-medium text-blue-800">预期波动</div>
          <div className="text-lg font-bold text-blue-900">±{data.expectedMovePct.toFixed(1)}%</div>
          <div className="text-xs text-blue-700">到期前约 ±${data.expectedMoveDollar.toFixed(1)}</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
          <div className="text-xs font-medium text-purple-800">GEX 环境</div>
          <div className="text-lg font-bold text-purple-900">{gexSign} GEX</div>
          <div className="text-xs text-purple-700">{gexHint}</div>
        </div>
        <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
          <div className="text-xs font-medium text-emerald-800">最大痛点</div>
          <div className="text-lg font-bold text-emerald-900">${data.maxPain}</div>
          <div className="text-xs text-emerald-700">到期日价格易被吸引至此</div>
        </div>
        {historySummary && (historySummary.ma5 != null || historySummary.rsi14 != null) && (
          <div className="bg-cyan-50 rounded-lg p-3 border border-cyan-200">
            <div className="text-xs font-medium text-cyan-800">均线 / RSI</div>
            <div className="text-sm font-bold text-cyan-900">
              MA5 ${historySummary.ma5?.toFixed(2) ?? '—'} / MA20 ${historySummary.ma20?.toFixed(2) ?? '—'}
            </div>
            <div className="text-xs text-cyan-700">
              RSI(14) {historySummary.rsi14 != null ? historySummary.rsi14.toFixed(0) : '—'}
              {historySummary.summary[0] ? ` · ${historySummary.summary[0]}` : ''}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
