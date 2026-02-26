import type { DashboardData } from '../types';

interface StrategyBacktestPlaceholderProps {
  data: DashboardData | null;
}

/** 策略回测占位：后续可接回测引擎与图表 */
export default function StrategyBacktestPlaceholder({ data }: StrategyBacktestPlaceholderProps) {
  if (!data) {
    return (
      <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800">Strategy Backtest</h2>
        <p className="text-gray-500 text-sm">加载标的后可配置回测参数。</p>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm h-full flex flex-col">
      <h2 className="text-lg font-semibold text-gray-800">Strategy Backtest</h2>
      <p className="text-gray-500 text-sm mb-3">
        Backtest options strategies (straddle, strangle, etc.) against historical moves.
      </p>
      <div className="flex-1 flex flex-col justify-center text-sm text-gray-600">
        <p>预期波动（1σ）: ±${data.expectedMoveDollar.toFixed(2)} ({data.expectedMovePct.toFixed(2)}%)</p>
        <p className="mt-2 text-xs text-gray-500">回测模块将在后续版本开放：选择策略、区间与标的后运行回测并展示 P&amp;L 曲线。</p>
      </div>
    </section>
  );
}
