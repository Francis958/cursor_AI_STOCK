import type { DashboardData } from '../types';
import { toIvPercentFixed } from '../utils/ivDisplay';

interface ExpiryDecompositionProps {
  data: DashboardData | null;
}

/** 到期分解：与参考图一致，展示 Weighted GEX/OI、Max Pain、各到期 IV% 与准确度 */
export default function ExpiryDecomposition({ data }: ExpiryDecompositionProps) {
  if (!data) {
    return (
      <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800">到期分解</h2>
        <p className="text-gray-500 text-sm">加载标的后显示各到期权重与 IV。</p>
      </section>
    );
  }

  const totalOi = data.callOi + data.putOi;
  const netGexAbs = Math.abs(data.netGex);
  const weightedGexOi = totalOi > 0 ? (netGexAbs / 1e6 / (totalOi / 1000)).toFixed(2) : '—';
  const ivPct = toIvPercentFixed(data.atmIv);

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800">到期分解</h2>
      <p className="text-gray-500 text-sm mb-3">
        按到期的加权 Gamma 敞口/持仓与最大痛点；多到期时列出各到期 IV% 与准确度。
      </p>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between items-center rounded bg-slate-50 px-3 py-2">
          <span className="text-gray-600">Weighted GEX / OI</span>
          <span className="font-medium text-gray-800">{weightedGexOi}</span>
        </div>
        <div className="flex justify-between items-center rounded bg-amber-50 px-3 py-2 border border-amber-200">
          <span className="text-amber-800">Max Pain</span>
          <span className="font-bold text-amber-900">${data.maxPain.toFixed(2)}</span>
        </div>
        <div className="text-xs font-medium text-gray-600 mb-1">到期日 · IV% · 准确度</div>
        <div className="rounded border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-3 gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200 text-center">
            <span className="font-medium text-gray-700">到期日</span>
            <span className="font-medium text-gray-700">IV%</span>
            <span className="font-medium text-gray-700">准确度</span>
          </div>
          <div className="grid grid-cols-3 gap-2 px-3 py-2 bg-white text-center">
            <span className="text-gray-800">{data.expiration}</span>
            <span className="text-gray-800">{ivPct}%</span>
            <span className="text-gray-500">—</span>
          </div>
          <div className="px-3 py-1.5 bg-gray-50/50 text-xs text-gray-500">
            准确度由后端多到期回测提供后可接入
          </div>
        </div>
      </div>
    </section>
  );
}
