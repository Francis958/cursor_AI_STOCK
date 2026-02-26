import type { DashboardData } from '../types';

interface DataSourceIndicatorProps {
  data: DashboardData | null;
}

const SOURCE_CONFIG = {
  schwab: {
    label: 'Schwab',
    desc: '期权数据来自 Charles Schwab API（实时/准实时）',
    className: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    badge: 'bg-emerald-600 text-white',
  },
  mock: {
    label: '模拟',
    desc: '期权数据为本地模拟，仅用于演示',
    className: 'bg-slate-100 border-slate-300 text-slate-700',
    badge: 'bg-slate-500 text-white',
  },
} as const;

export default function DataSourceIndicator({ data }: DataSourceIndicatorProps) {
  if (!data?.dataSource) return null;

  const config = SOURCE_CONFIG[data.dataSource];
  const desc =
    data.dataSource === 'mock' && data.mockReason
      ? `本地模拟（${data.mockReason}）。可配置 Schwab API 获取真实数据。`
      : config.desc;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2 border-b ${config.className}`}
      role="status"
      aria-label={`期权数据来源：${config.label}`}
    >
      <span className="text-xs font-medium uppercase tracking-wide text-inherit opacity-80">
        期权数据来源
      </span>
      <span className={`px-2 py-0.5 rounded text-sm font-semibold ${config.badge}`}>
        {config.label}
      </span>
      <span className="text-sm opacity-90">{desc}</span>
    </div>
  );
}
