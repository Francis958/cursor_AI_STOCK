import type { DashboardData } from '../types';
import { toIvPercent } from '../utils/ivDisplay';

interface VolatilitySurfaceChartProps {
  data: DashboardData | null;
}

/** 波动率曲面：行权价 × 到期（当前单到期），颜色=IV */
export default function VolatilitySurfaceChart({ data }: VolatilitySurfaceChartProps) {
  if (!data) {
    return (
      <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800">波动率曲面</h2>
        <p className="text-gray-500 text-sm">加载标的后显示 IV 曲面。</p>
      </section>
    );
  }

  const rows = data.byStrike.filter((r) => (r.callIv ?? r.putIv) != null);
  const ivValues = rows.map((r) => toIvPercent(r.callIv ?? r.putIv ?? 0));
  const minIv = Math.min(...ivValues, 0);
  const maxIv = Math.max(...ivValues, 1);

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800">波动率曲面</h2>
      <p className="text-gray-500 text-base mb-3">
        行权价 × 到期 IV；红=高波动率，绿=低。当前仅展示 {data.expiration} 单到期曲面；多到期时为行权价 × 到期日热力图。
      </p>
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="text-sm text-gray-500 mb-1">行权价 →</div>
          <div className="flex gap-1 flex-wrap">
            {rows.map((r) => {
              const iv = toIvPercent(r.callIv ?? r.putIv ?? 0);
              const t = maxIv > minIv ? (iv - minIv) / (maxIv - minIv) : 0.5;
              const green = Math.round(255 * (1 - t));
              const red = Math.round(255 * t);
              const bg = `rgb(${red},${green},100)`;
              return (
                <div
                  key={r.strike}
                  className="min-w-[3.5rem] h-9 rounded flex items-center justify-center text-xs font-medium"
                  style={{ backgroundColor: bg, color: t > 0.5 ? 'white' : '#333' }}
                  title={`${r.strike}: IV ${iv.toFixed(1)}%`}
                >
                  {iv.toFixed(0)}%
                </div>
              );
            })}
          </div>
          <div className="text-sm text-gray-500 mt-1">{data.expiration}</div>
        </div>
      </div>
    </section>
  );
}
