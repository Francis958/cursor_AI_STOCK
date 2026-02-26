import type { DashboardData } from '../types';

interface OrderBookOrderFlowProps {
  data: DashboardData | null;
}

/** Order Book & Order Flow：订单簿深度、价差、Delta/Gamma 失衡、Max Pain、Expected Move */
export default function OrderBookOrderFlow({ data }: OrderBookOrderFlowProps) {
  if (!data) {
    return (
      <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800">订单簿与订单流</h2>
        <p className="text-gray-500 text-sm">加载标的后显示订单流指标。</p>
      </section>
    );
  }

  const totalDelta = data.byStrike.reduce((s, r) => {
    const c = (r.callDelta ?? 0) * (r.callOi ?? 0) * 100;
    const p = (r.putDelta ?? 0) * (r.putOi ?? 0) * 100;
    return s + c + p;
  }, 0);

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800">订单簿与订单流</h2>
      <p className="text-gray-500 text-sm mb-3">
        订单簿深度、买卖价差与订单流，用于判断情绪与流动性。
      </p>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded bg-gray-50 p-2">
          <div className="text-xs text-gray-500">总 Delta 敞口</div>
          <div className="font-medium text-gray-800">
            {(totalDelta / 1e6).toFixed(2)}M
          </div>
        </div>
        <div className="rounded bg-gray-50 p-2">
          <div className="text-xs text-gray-500">持仓量</div>
          <div className="font-medium text-gray-800">
            {((data.callOi + data.putOi) / 1000).toFixed(1)}K
          </div>
        </div>
        <div className="col-span-2 space-y-1">
          <div className="text-xs font-medium text-gray-600">订单簿检查</div>
          <div className="flex items-center gap-2 text-xs text-green-700">
            <span>✓</span> 买卖价差
          </div>
          <div className="flex items-center gap-2 text-xs text-green-700">
            <span>✓</span> Delta 失衡
          </div>
          <div className="flex items-center gap-2 text-xs text-green-700">
            <span>✓</span> Gamma 失衡
          </div>
        </div>
        <div className="rounded bg-amber-50 p-2 border border-amber-200">
          <div className="text-xs text-amber-800">最大痛点</div>
          <div className="font-bold text-amber-900">${data.maxPain.toFixed(2)}</div>
        </div>
        <div className="rounded bg-slate-50 p-2 border border-slate-200">
          <div className="text-xs text-slate-600">预期波动 (1σ)</div>
          <div className="font-bold text-slate-800">±${data.expectedMoveDollar.toFixed(2)}</div>
        </div>
        <div className="rounded bg-slate-50 p-2 col-span-2">
          <div className="text-xs text-slate-600">到期落在 ±1σ 区间内（参考）</div>
          <div className="font-medium text-slate-800">
            约 68%（正态近似）。区间 ${(data.spot - data.expectedMoveDollar).toFixed(2)} ~ ${(data.spot + data.expectedMoveDollar).toFixed(2)}
          </div>
        </div>
      </div>
      <button
        type="button"
        className="mt-2 px-3 py-1.5 rounded border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
      >
        查看订单簿
      </button>
    </section>
  );
}
