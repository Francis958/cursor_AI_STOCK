import { useState } from 'react';
import type { DashboardData } from '../types';

interface GammaAnalysisPanelProps {
  data: DashboardData | null;
}

/** Gamma 分析（Gamma Product）面板：滑杆与输入，用于跟踪 flow */
export default function GammaAnalysisPanel({ data }: GammaAnalysisPanelProps) {
  const [strikePct, setStrikePct] = useState(-1.8);
  const [putIvPct, setPutIvPct] = useState(-1);
  const [callIvPct, setCallIvPct] = useState(1);
  const [gammaFilled, setGammaFilled] = useState(50);
  const [gammaOpen, setGammaOpen] = useState(100);
  const [gammaDayEnd, setGammaDayEnd] = useState(50);

  const reset = () => {
    setStrikePct(-1.8);
    setPutIvPct(-1);
    setCallIvPct(1);
    setGammaFilled(50);
    setGammaOpen(100);
    setGammaDayEnd(50);
  };

  if (!data) {
    return (
      <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800">Gamma 分析</h2>
        <p className="text-gray-500 text-sm">加载标的后可调节参数。</p>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800">Gamma 分析</h2>
      <p className="text-gray-500 text-sm mb-3">
        跟踪市场 Gamma 流、成交与挂单影响；调节参数观察对结果的影响。
      </p>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <label className="block text-gray-600 mb-0.5">行权价 (%)</label>
          <input
            type="range"
            min={-5}
            max={5}
            step={0.1}
            value={strikePct}
            onChange={(e) => setStrikePct(Number(e.target.value))}
            className="w-full"
          />
          <span className="text-gray-800 font-medium">{strikePct}%</span>
        </div>
        <div>
          <label className="block text-gray-600 mb-0.5">Put IV (%)</label>
          <input
            type="range"
            min={-5}
            max={5}
            step={0.5}
            value={putIvPct}
            onChange={(e) => setPutIvPct(Number(e.target.value))}
            className="w-full"
          />
          <span className="text-gray-800 font-medium">{putIvPct}%</span>
        </div>
        <div>
          <label className="block text-gray-600 mb-0.5">看涨 IV (%)</label>
          <input
            type="range"
            min={-5}
            max={5}
            step={0.5}
            value={callIvPct}
            onChange={(e) => setCallIvPct(Number(e.target.value))}
            className="w-full"
          />
          <span className="text-gray-800 font-medium">{callIvPct}%</span>
        </div>
        <div>
          <label className="block text-gray-600 mb-0.5">Gamma 已成交 ($)</label>
          <input
            type="number"
            value={gammaFilled}
            onChange={(e) => setGammaFilled(Number(e.target.value))}
            className="w-full border border-gray-300 rounded px-2 py-1"
          />
        </div>
        <div>
          <label className="block text-gray-600 mb-0.5">Gamma 未平 ($)</label>
          <input
            type="number"
            value={gammaOpen}
            onChange={(e) => setGammaOpen(Number(e.target.value))}
            className="w-full border border-gray-300 rounded px-2 py-1"
          />
        </div>
        <div>
          <label className="block text-gray-600 mb-0.5">Gamma 日终 ($)</label>
          <input
            type="number"
            value={gammaDayEnd}
            onChange={(e) => setGammaDayEnd(Number(e.target.value))}
            className="w-full border border-gray-300 rounded px-2 py-1"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={reset}
        className="mt-3 px-3 py-1.5 rounded border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
      >
        重置
      </button>
    </section>
  );
}
