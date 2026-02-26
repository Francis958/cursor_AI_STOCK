import { useState, useCallback } from 'react';
import { fetchDashboard, fetchExpirations } from './api';
import type { DashboardData } from './types';
import TopBar from './components/TopBar';
import OptionInsights from './components/OptionInsights';
import KeyLevels from './components/KeyLevels';
import CumulativeGex from './components/CumulativeGex';
import DealerGex from './components/DealerGex';
import GreeksExposure from './components/GreeksExposure';
import VolumeProfile from './components/VolumeProfile';
import PatternChart from './components/PatternChart';
import DataSourceIndicator from './components/DataSourceIndicator';
import IndicatorGuide from './components/IndicatorGuide';
import MultiAgentPipelinePage from './components/MultiAgentPipelinePage';
import ApiKeyGate, { getStoredOpenaiApiKey, setStoredOpenaiApiKey } from './components/ApiKeyGate';
import IvTermStructure from './components/IvTermStructure';
import OptionsActivityHeatmap from './components/OptionsActivityHeatmap';
import GammaAnalysisPanel from './components/GammaAnalysisPanel';
import SeasonedBreakdown from './components/SeasonedBreakdown';
import OpenInterestTabs from './components/OpenInterestTabs';
import IvSkewChart from './components/IvSkewChart';
import IvSmileComparison from './components/IvSmileComparison';
import VolatilitySurfaceChart from './components/VolatilitySurfaceChart';
import OrderBookOrderFlow from './components/OrderBookOrderFlow';
import BidAskSpreadLiquidity from './components/BidAskSpreadLiquidity';
import TimeToMaturityMoneyness from './components/TimeToMaturityMoneyness';
import ExpectedMoveDistributions from './components/ExpectedMoveDistributions';
import ExpiryDecomposition from './components/ExpiryDecomposition';

type ViewMode = 'dashboard' | 'pipeline';

export default function App() {
  const [view, setView] = useState<ViewMode>('dashboard');
  const [openaiApiKey, setOpenaiApiKey] = useState<string>(() => getStoredOpenaiApiKey());
  const [symbol, setSymbol] = useState('SNDK');
  const [expiration, setExpiration] = useState('');
  const [expirations, setExpirations] = useState<string[]>([]);
  const [strikes, setStrikes] = useState(200);
  const [greekSource, setGreekSource] = useState<'Mid' | 'Bid' | 'Ask'>('Mid');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashboard, exps] = await Promise.all([
        fetchDashboard(symbol, expiration || undefined, strikes),
        fetchExpirations(symbol),
      ]);
      setData(dashboard);
      const expList = exps.length ? exps : [dashboard.expiration];
      setExpirations(expList);
      if (!expiration || !expList.includes(expiration)) setExpiration(expList[0]);
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg);
      console.error('Load failed:', e);
    } finally {
      setLoading(false);
    }
  }, [symbol, expiration, strikes]);

  const refresh = useCallback(async () => {
    if (!data) return load();
    setLoading(true);
    setError(null);
    try {
      const dashboard = await fetchDashboard(symbol, data.expiration, strikes);
      setData(dashboard);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [symbol, data, strikes, load]);

  /** 切换到期日时用新到期日重新拉取 dashboard，使 Max Pain / Put Wall 等数据更新 */
  const handleExpirationChange = useCallback(
    (newExp: string) => {
      setExpiration(newExp);
      if (!data || newExp === data.expiration) return;
      setLoading(true);
      setError(null);
      fetchDashboard(symbol, newExp, strikes)
        .then(setData)
        .catch((e) => setError((e as Error).message))
        .finally(() => setLoading(false));
    },
    [symbol, strikes, data]
  );

  if (view === 'pipeline') {
    if (!openaiApiKey.trim()) {
      return (
        <ApiKeyGate
          onSuccess={(key) => setOpenaiApiKey(key)}
          onSkip={() => setView('dashboard')}
        />
      );
    }
    return (
      <MultiAgentPipelinePage
        defaultSymbol={data?.symbol ?? symbol}
        onBackToDashboard={() => setView('dashboard')}
        openaiApiKey={openaiApiKey}
        onClearApiKey={() => { setStoredOpenaiApiKey(''); setOpenaiApiKey(''); }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
      <TopBar
        symbol={symbol}
        expiration={expiration}
        expirations={expirations.length ? expirations : [expiration || '']}
        strikes={strikes}
        greekSource={greekSource}
        data={data}
        loading={loading}
        onSymbolChange={setSymbol}
        onExpirationChange={handleExpirationChange}
        onStrikesChange={setStrikes}
        onGreekSourceChange={setGreekSource}
        onLoad={load}
        onRefresh={refresh}
        onOpenPipeline={() => setView('pipeline')}
      />
      {data && <DataSourceIndicator data={data} />}
      {error && (
        <div className="mx-4 mt-2 px-4 py-2 bg-red-100 text-red-800 rounded text-sm">
          {error}
        </div>
      )}
      {loading && (
        <div className="mx-4 mt-2 px-4 py-4 bg-amber-50 border border-amber-200 rounded text-amber-800 font-medium">
          ⏳ 正在加载…（若长时间无反应，说明后端未启动，请在项目根目录执行 <code className="bg-amber-100 px-1 rounded">npm run dev</code>）
        </div>
      )}
      {!data && !loading && (
        <div className="mx-4 mt-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
          👆 点击上方 <strong>加载</strong> 获取数据（无需配置 Schwab API 即可预览效果）。请确保后端已启动（项目根目录执行 <code className="bg-blue-100 px-1 rounded">npm run dev</code>）。
        </div>
      )}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-[1720px] mx-auto w-full space-y-14">
        {/* 第一区：概览 — 首行仅 2 个卡片，不挤 */}
        {data && (
          <section className="space-y-6">
            <h2 className="text-lg font-medium text-gray-600 tracking-wide px-1 pb-1 border-b border-gray-100">概览</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <OptionInsights data={data} />
              <KeyLevels data={data} />
            </div>
          </section>
        )}
        {/* 第二区：Gamma 与成交量 — 3 列 */}
        {data && (
          <section className="space-y-6">
            <h2 className="text-lg font-medium text-gray-600 tracking-wide px-1 pb-1 border-b border-gray-100">Gamma 与成交量</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <CumulativeGex data={data} />
              <DealerGex data={data} />
              <GreeksExposure data={data} />
              <div className="xl:col-span-2 md:col-span-2">
                <VolumeProfile data={data} />
              </div>
            </div>
          </section>
        )}
        {/* 第三区：活动与预期 — 热力图单独一行或与 3 卡并列 */}
        {data && (
          <section className="space-y-6">
            <h2 className="text-lg font-medium text-gray-600 tracking-wide px-1 pb-1 border-b border-gray-100">活动与预期</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              <div className="xl:col-span-2 min-w-0"><OptionsActivityHeatmap data={data} /></div>
              <GammaAnalysisPanel data={data} />
              <ExpectedMoveDistributions data={data} />
              <ExpiryDecomposition data={data} />
            </div>
          </section>
        )}
        {/* 第四区：隐含波动率 — 2×2 网格，每块更大 */}
        {data && (
          <section className="space-y-6">
            <h2 className="text-lg font-medium text-gray-600 tracking-wide px-1 pb-1 border-b border-gray-100">隐含波动率</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <IvTermStructure data={data} />
              <IvSkewChart data={data} />
              <IvSmileComparison data={data} />
              <VolatilitySurfaceChart data={data} />
            </div>
          </section>
        )}
        {/* 第五区：订单流与流动性 */}
        {data && (
          <section className="space-y-6">
            <h2 className="text-lg font-medium text-gray-600 tracking-wide px-1 pb-1 border-b border-gray-100">订单流与流动性</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <OrderBookOrderFlow data={data} />
              <BidAskSpreadLiquidity data={data} />
              <TimeToMaturityMoneyness data={data} />
            </div>
          </section>
        )}
        {/* 第六区：持仓与净 Gamma */}
        {data && (
          <section className="space-y-6">
            <h2 className="text-lg font-medium text-gray-600 tracking-wide px-1 pb-1 border-b border-gray-100">持仓与净 Gamma</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SeasonedBreakdown data={data} />
              <OpenInterestTabs data={data} />
            </div>
          </section>
        )}
        {/* 最下方：指标解读 + 形态分析 */}
        {data && (
          <section className="space-y-8 pt-4">
            <IndicatorGuide />
            <PatternChart symbol={data.symbol} />
          </section>
        )}
      </main>
        </div>
      </div>
    </div>
  );
}
