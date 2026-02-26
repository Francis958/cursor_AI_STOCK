import type { DashboardData } from '../types';

interface OptionsActivityHeatmapProps {
  data: DashboardData | null;
}

/** 期权活动热力图：行权价 × 到期（当前单到期），蓝=Call 活动 红=Put 活动 */
export default function OptionsActivityHeatmap({ data }: OptionsActivityHeatmapProps) {
  if (!data) {
    return (
      <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800">期权活动热力图</h2>
        <p className="text-gray-500 text-sm">加载标的后按行权价与到期显示活动。</p>
      </section>
    );
  }

  const { byStrike, spot, expiration } = data;
  const maxCall = Math.max(...byStrike.map((r) => r.callOi + r.callVolume), 1);
  const maxPut = Math.max(...byStrike.map((r) => r.putOi + r.putVolume), 1);

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800">期权活动热力图</h2>
      <p className="text-gray-500 text-sm mb-3">
        按行权价与到期的期权活动；蓝=看涨活动，红=看跌活动。
      </p>
      <div className="flex gap-2 mb-2">
        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-medium">看涨活动</span>
        <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-xs font-medium">看跌活动</span>
      </div>
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="text-xs text-gray-500 mb-1">{expiration}</div>
          <div className="flex gap-0.5 flex-wrap">
            {byStrike.map((r) => {
              const callAct = (r.callOi + r.callVolume) / maxCall;
              const putAct = (r.putOi + r.putVolume) / maxPut;
              const net = callAct - putAct;
              const isAtm = Math.abs(r.strike - spot) < spot * 0.02;
              if (net > 0) {
                const opacity = Math.min(1, 0.3 + callAct * 0.7);
                return (
                  <div
                    key={r.strike}
                    className={`w-8 h-8 rounded flex items-center justify-center text-[10px] font-medium ${isAtm ? 'ring-2 ring-gray-800' : ''}`}
                    style={{ backgroundColor: `rgba(59, 130, 246, ${opacity})`, color: opacity > 0.6 ? 'white' : '#1e3a8a' }}
                    title={`${r.strike}: Call OI ${r.callOi} Vol ${r.callVolume}, Put OI ${r.putOi} Vol ${r.putVolume}`}
                  >
                    {r.strike}
                  </div>
                );
              }
              if (net < 0) {
                const opacity = Math.min(1, 0.3 + putAct * 0.7);
                return (
                  <div
                    key={r.strike}
                    className={`w-8 h-8 rounded flex items-center justify-center text-[10px] font-medium ${isAtm ? 'ring-2 ring-gray-800' : ''}`}
                    style={{ backgroundColor: `rgba(239, 68, 68, ${opacity})`, color: opacity > 0.6 ? 'white' : '#991b1b' }}
                    title={`${r.strike}: Call OI ${r.callOi}, Put OI ${r.putOi} Vol ${r.putVolume}`}
                  >
                    {r.strike}
                  </div>
                );
              }
              return (
                <div
                  key={r.strike}
                  className={`w-8 h-8 rounded bg-gray-200 flex items-center justify-center text-[10px] ${isAtm ? 'ring-2 ring-gray-800' : ''}`}
                  title={`${r.strike}`}
                >
                  {r.strike}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 mt-1">
            <span>行权价 →</span>
            <span>现价: ${spot.toFixed(0)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
