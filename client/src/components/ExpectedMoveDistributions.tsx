import type { DashboardData } from '../types';

interface ExpectedMoveDistributionsProps {
  data: DashboardData | null;
}

/** 预期波动（分布）：1σ / 2σ 区间，用于与参考图一致 */
export default function ExpectedMoveDistributions({ data }: ExpectedMoveDistributionsProps) {
  if (!data) {
    return (
      <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800">预期波动（分布）</h2>
        <p className="text-gray-500 text-sm">加载标的后显示 1σ/2σ 预期区间。</p>
      </section>
    );
  }

  const low1 = data.spot - data.expectedMoveDollar;
  const high1 = data.spot + data.expectedMoveDollar;
  const low2 = data.spot - data.expectedMoveDollar * 2;
  const high2 = data.spot + data.expectedMoveDollar * 2;

  const movePctDisplay = data.expectedMovePct > 2 ? data.expectedMovePct.toFixed(1) : (data.expectedMovePct * 100).toFixed(1);

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800">预期波动（分布）</h2>
      <p className="text-gray-500 text-base mb-3">
        基于平值 Straddle 的隐含波动；1σ 约 68% 概率，2σ 约 95%。
      </p>
      <div className="space-y-3 text-base">
        <div className="flex justify-between items-center rounded bg-slate-50 p-2.5">
          <span className="text-gray-600">1σ 区间</span>
          <span className="font-medium text-gray-800">
            ${low1.toFixed(2)} ~ ${high1.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between items-center rounded bg-slate-50 p-2.5">
          <span className="text-gray-600">2σ 区间</span>
          <span className="font-medium text-gray-800">
            ${low2.toFixed(2)} ~ ${high2.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm text-gray-500">
          <span>现价</span>
          <span className="font-medium text-gray-800">${data.spot.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center text-sm text-gray-500">
          <span>预期波动 %</span>
          <span>±{movePctDisplay}%</span>
        </div>
      </div>
    </section>
  );
}
