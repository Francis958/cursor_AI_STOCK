import type { DashboardData } from '../types';

interface FridayClosePredictionProps {
  data: DashboardData | null;
}

/**
 * 专业 Trader 常用：用期权 Max Pain、成交量加权、OI 加权估算到期收盘价
 * - SPY：可作「每日/当周」预期，并换算 SPX 约估
 * - 任意标的：当所选到期日为周五时，作「本周五收盘预测」
 * 参考：Max Pain 为做市商风险中性区、量/OI 反映市场参与集中位，综合给出区间而非单点。
 * 仅供参考，不构成投资建议。
 */
export default function FridayClosePrediction({ data }: FridayClosePredictionProps) {
  if (!data?.byStrike?.length) {
    return (
      <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800">到期收盘预测（期权）</h2>
        <p className="text-gray-500 text-sm">加载标的后，根据所选到期日的期权数据估算到期收盘。</p>
      </section>
    );
  }

  const byStrike = data.byStrike;
  const isSpy = data.symbol.toUpperCase() === 'SPY';

  let totalVol = 0;
  let volWeightedSum = 0;
  let oiWeightedSum = 0;
  let totalOi = 0;

  for (const row of byStrike) {
    const vol = row.callVolume + row.putVolume;
    const oi = row.callOi + row.putOi;
    totalVol += vol;
    volWeightedSum += row.strike * vol;
    totalOi += oi;
    oiWeightedSum += row.strike * oi;
  }

  const volumeWeighted = totalVol > 0 ? volWeightedSum / totalVol : data.spot;
  const oiWeighted = totalOi > 0 ? oiWeightedSum / totalOi : data.spot;
  const maxPain = data.maxPain;

  // 专业做法：综合区间 = [min(maxPain, vol, oi) - 缓冲, max(...) + 缓冲]，或取中位数
  const points = [maxPain, volumeWeighted, oiWeighted].filter((p) => p > 0);
  const low = Math.min(...points);
  const high = Math.max(...points);
  const buffer = data.expectedMoveDollar * 0.15 || (data.spot * 0.005);
  const rangeLow = Math.max(0, low - buffer);
  const rangeHigh = high + buffer;
  const combinedMid = (rangeLow + rangeHigh) / 2;

  // 所选到期日是否为周五
  const expDate = new Date(data.expiration + 'T12:00:00');
  const isFriday = expDate.getDay() === 5;
  const dte = data.dte ?? 0;

  const title = isSpy && dte <= 1 ? 'SPY 每日收盘预测（期权）' : isSpy ? 'SPY 当周/到期收盘预测（期权）' : isFriday ? '本周五收盘预测（期权）' : '到期收盘预测（期权）';
  const spxEstimate = isSpy ? Math.round(combinedMid * 10) : null;

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm lg:col-span-2">
      <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
      <p className="text-gray-500 text-sm mb-3">
        专业 Trader 常用：<strong>Max Pain</strong>（做市商风险中性位）、<strong>成交量加权</strong>（近期参与集中位）、<strong>OI 加权</strong>（持仓集中位）。
        三者结合给出预期区间，非单点预测。{isSpy && ' SPY 受 ETF 流动影响可能偏离；低 VIX、周五到期时参考价值更高。'}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
          <div className="text-xs font-medium text-slate-600">Max Pain</div>
          <div className="text-xl font-bold text-slate-900">${maxPain}</div>
          <div className="text-xs text-slate-600">期权卖方亏损最小价位，常作磁吸参考</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <div className="text-xs font-medium text-blue-800">成交量加权</div>
          <div className="text-xl font-bold text-blue-900">${volumeWeighted.toFixed(2)}</div>
          <div className="text-xs text-blue-700">近期交易最集中的价位</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
          <div className="text-xs font-medium text-purple-800">OI 加权</div>
          <div className="text-xl font-bold text-purple-900">${oiWeighted.toFixed(2)}</div>
          <div className="text-xs text-purple-700">持仓最集中的价位</div>
        </div>
        <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
          <div className="text-xs font-medium text-amber-800">综合预期区间</div>
          <div className="text-lg font-bold text-amber-900">${rangeLow.toFixed(2)} – ${rangeHigh.toFixed(2)}</div>
          <div className="text-xs text-amber-700">中位约 ${combinedMid.toFixed(2)}</div>
        </div>
        <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
          <div className="text-xs font-medium text-emerald-800">当前现价（来自期权数据）</div>
          <div className="text-xl font-bold text-emerald-900">${data.spot.toFixed(2)}</div>
          <div className="text-xs text-emerald-700">加载/刷新时更新 · 预期波动 ±${data.expectedMoveDollar.toFixed(1)}</div>
        </div>
      </div>
      {isSpy && spxEstimate != null && (
        <div className="mt-3 p-3 rounded-lg bg-sky-50 border border-sky-200">
          <div className="text-sm font-medium text-sky-800">大盘约估（SPX）</div>
          <div className="text-2xl font-bold text-sky-900">{spxEstimate.toLocaleString()} 点</div>
          <div className="text-xs text-sky-700">按 SPY 综合预期 ×10 近似；SPX 期权到期日与 SPY 不同，仅作参考。</div>
        </div>
      )}
      {!isSpy && (
        <p className="text-gray-500 text-xs mt-2">
          将标的改为 SPY 并选择到期日，可查看 SPY/SPX 的每日或当周预期。
        </p>
      )}
    </section>
  );
}
