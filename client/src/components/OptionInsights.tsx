import type { DashboardData } from '../types';

interface OptionInsightsProps {
  data: DashboardData | null;
}

export default function OptionInsights({ data }: OptionInsightsProps) {
  if (!data) {
    return (
      <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800">期权洞察</h2>
        <p className="text-gray-500 text-sm">加载标的后显示自动分析。</p>
      </section>
    );
  }

  const spot = data.spot;
  const maxPainPct = ((data.maxPain - spot) / spot * 100).toFixed(1);
  const callWallPct = ((data.callWallStrike - spot) / spot * 100).toFixed(1);
  const isBullish = data.putCallOiRatio < 0.5;
  const sentiment = isBullish ? 65 : 35; // 0–100, 50 neutral

  const insights = [
    {
      type: 'bullish',
      title: '关键价位',
      text: '由 Gamma 与持仓集中度得出的关键水平。',
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      type: 'gamma',
      title: '正 Gamma 环境',
      text: '做市商逢低买、逢高卖，抑制波动；偏均值回归，关键行权价附近易震荡。',
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      type: 'dealer',
      title: `Put/Call 持仓比偏低（${data.putCallOiRatio.toFixed(2)}）`,
      text: '看涨持仓占优，偏多头布局；极端时可能反向（偏空信号）。',
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      type: 'level',
      title: `最大痛点 $${data.maxPain}`,
      text: `现价距最大痛点 ${maxPainPct}%；到期可能向该位靠拢。`,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      type: 'level',
      title: `接近 Call 墙阻力（$${data.callWallStrike})`,
      text: `现价在 Call Gamma 集中位上方约 ${callWallPct}%，该位形成阻力。`,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      type: 'vol',
      title: `预期波动（Straddle 中价）：±${data.expectedMovePct.toFixed(2)}%（$${data.expectedMoveDollar.toFixed(2)}）`,
      text: `平值 straddle 隐含到期前 ±${data.expectedMovePct.toFixed(2)}% 波动。区间约 $${(spot - data.expectedMoveDollar).toFixed(2)} - $${(spot + data.expectedMoveDollar).toFixed(2)}。`,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ];

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm h-full flex flex-col">
      <h2 className="text-lg font-semibold text-gray-800">交易洞察</h2>
      <p className="text-gray-500 text-base mb-3">
        基于期权数据与持仓结构的自动分析，辅助识别多空倾向与关键价位。
      </p>
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-500 mb-1">
          <span>偏空</span>
          <span>偏多</span>
        </div>
        <div className="h-3 bg-gradient-to-r from-red-200 via-gray-200 to-green-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-400 rounded-full transition-all"
            style={{ width: `${sentiment}%` }}
          />
        </div>
      </div>
      <ul className="space-y-2">
        {insights.map((insight, i) => (
          <li key={i} className={`flex gap-2 p-2.5 rounded ${insight.bg}`}>
            <span className={`shrink-0 font-medium text-sm ${insight.color}`}>
              {({ bullish: '偏多', gamma: 'Gamma', dealer: '持仓', level: '价位', vol: '波动' } as Record<string, string>)[insight.type] || insight.type}
            </span>
            <div className="min-w-0 flex-1">
              <div className={`font-medium text-base ${insight.color} break-words`}>{insight.title}</div>
              <div className="text-gray-600 text-sm break-words">{insight.text}</div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
