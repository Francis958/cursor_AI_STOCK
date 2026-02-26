import type { DashboardData } from '../types';
import { toIvPercentFixed } from '../utils/ivDisplay';

interface TopBarProps {
  symbol: string;
  expiration: string;
  expirations: string[];
  strikes: number;
  greekSource: 'Mid' | 'Bid' | 'Ask';
  data: DashboardData | null;
  loading: boolean;
  onSymbolChange: (s: string) => void;
  onExpirationChange: (e: string) => void;
  onStrikesChange: (n: number) => void;
  onGreekSourceChange: (s: 'Mid' | 'Bid' | 'Ask') => void;
  onLoad: () => void;
  onRefresh: () => void;
  onClose?: () => void;
  onOpenPipeline?: () => void;
}

function fmtNum(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toFixed(0);
}

function fmtGex(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(0);
}

export default function TopBar({
  symbol,
  expiration,
  expirations,
  strikes,
  greekSource,
  data,
  loading,
  onSymbolChange,
  onExpirationChange,
  onStrikesChange,
  onGreekSourceChange,
  onLoad,
  onRefresh,
  onClose,
  onOpenPipeline,
}: TopBarProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-2 flex flex-wrap items-center gap-3">
      <nav className="flex gap-2">
        <span className="px-3 py-1.5 rounded bg-blue-100 text-blue-800 font-medium text-sm">
          期权仪表盘
        </span>
        {onOpenPipeline && (
          <button
            type="button"
            onClick={onOpenPipeline}
            className="px-3 py-1.5 rounded text-gray-600 hover:bg-gray-100 text-sm"
          >
            多智能体报告
          </button>
        )}
        <a href="#" className="px-3 py-1.5 rounded text-gray-600 hover:bg-gray-100 text-sm">
          设置
        </a>
      </nav>

      <div className="flex items-center gap-2">
        <label className="text-gray-600 text-sm sr-only">股票代码</label>
        <input
          type="text"
          value={symbol}
          onChange={(e) => onSymbolChange(e.target.value.toUpperCase().replace(/[^A-Z0-9.]/g, '').slice(0, 6))}
          placeholder="输入代码如 AAPL"
          className="border border-gray-300 rounded px-2 py-1 text-sm font-medium w-24 uppercase"
          list="symbol-suggestions"
        />
        <datalist id="symbol-suggestions">
          <option value="SNDK" />
          <option value="SPY" />
          <option value="AAPL" />
          <option value="NVDA" />
          <option value="TSLA" />
          <option value="MSFT" />
          <option value="AMZN" />
          <option value="GOOGL" />
          <option value="META" />
          <option value="QQQ" />
        </datalist>
        <button
          onClick={onLoad}
          disabled={loading}
          className="px-3 py-1 rounded bg-gray-800 text-white text-sm hover:bg-gray-700 disabled:opacity-50"
        >
          加载
        </button>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-3 py-1 rounded border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          刷新
        </button>
        <button className="px-3 py-1 rounded border border-gray-300 text-sm hover:bg-gray-50">实时</button>
        <button className="px-3 py-1 rounded border border-gray-300 text-sm hover:bg-gray-50">历史</button>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-gray-600 text-sm" title="到期日；连上 Schwab API 后会显示该标的全部到期日">到期日</label>
        <select
          value={expiration}
          onChange={(e) => onExpirationChange(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm min-w-[140px]"
          title="连上 API 后显示该标的全部到期日"
        >
          {expirations.length === 0 && (
            <option value="">— 请先点击加载 —</option>
          )}
          {expirations.map((e) => (
            <option key={e} value={e}>{e || '—'}</option>
          ))}
        </select>
        <label className="text-gray-600 text-sm" title="请求返回的行权价个数；选「全部」时由数据源返回所有行权价">行权价个数</label>
        <select
          value={strikes}
          onChange={(e) => onStrikesChange(Number(e.target.value))}
          className="border border-gray-300 rounded px-2 py-1 text-sm min-w-[4rem]"
          title="请求返回的行权价个数；全部 = 数据源返回所有行权价"
        >
          <option value={0}>全部</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={75}>75</option>
          <option value={100}>100</option>
          <option value={200}>200</option>
          <option value={300}>300</option>
          <option value={500}>500</option>
        </select>
        {data && data.byStrike && data.byStrike.length > 0 && (() => {
          const byStrike = data!.byStrike!;
          const prices = byStrike.map((r) => r.strike).sort((a, b) => a - b);
          const min = prices[0];
          const max = prices[prices.length - 1];
          return (
            <span
              className="text-gray-700 text-sm font-medium"
              title={`当前加载的行权价（来自 API）共 ${prices.length} 个：${prices.slice(0, 15).join(', ')}${prices.length > 15 ? '…' : ''}`}
            >
              行权价: <span className="text-blue-700">{prices.length} 个</span>，${min.toFixed(0)} – ${max.toFixed(0)}
            </span>
          );
        })()}
        <label className="text-gray-600 text-sm">Greeks 价格</label>
        <select
          value={greekSource}
          onChange={(e) => onGreekSourceChange(e.target.value as 'Mid' | 'Bid' | 'Ask')}
          className="border border-gray-300 rounded px-2 py-1 text-sm"
        >
          <option value="Bid">买价</option>
          <option value="Mid">中间价</option>
          <option value="Ask">卖价</option>
        </select>
      </div>

      {data && (
        <div className="flex flex-wrap items-center gap-4 text-sm ml-auto">
          {data.dataSource && (
            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600" title="数据来源">
              {data.dataSource === 'schwab' ? 'Schwab' : '模拟'}
            </span>
          )}
          <span><strong>现价</strong> ${data.spot.toFixed(2)}</span>
          <span><strong>远期</strong> ${data.forward.toFixed(2)}</span>
          <span><strong>到期天数</strong> {data.dte} 天</span>
          <span>
            <strong>平值 IV</strong> {toIvPercentFixed(data.atmIv)}%
            {data.atmIvChange != null && (
              <span className={data.atmIvChange < 0 ? 'text-green-600' : 'text-red-600'}>
                {' '}{data.atmIvChange > 0 ? '+' : ''}{(data.atmIvChange * 100).toFixed(2)}%
              </span>
            )}
          </span>
          <span>
            <strong>25Δ 风险反转</strong> +{(data.riskReversal25d * 100).toFixed(2)}% (${data.riskReversal25dDollar?.toFixed(2) ?? '—'})
          </span>
          <span><strong>看涨持仓</strong> {fmtNum(data.callOi)}</span>
          <span><strong>看跌持仓</strong> {fmtNum(data.putOi)}</span>
          <span><strong>P/C 成交量</strong> {data.putCallVolRatio.toFixed(2)}</span>
          <span><strong>看涨成交量</strong> {fmtNum(data.callVolume)}</span>
          <span><strong>看跌成交量</strong> {fmtNum(data.putVolume)}</span>
          <span><strong>净 GEX</strong> {fmtGex(data.netGex)}</span>
          <span className="text-gray-500">{data.timestamp}</span>
        </div>
      )}

      {onClose && (
        <button onClick={onClose} className="p-1 text-gray-500 hover:text-black ml-2" aria-label="关闭">✕</button>
      )}
    </header>
  );
}
