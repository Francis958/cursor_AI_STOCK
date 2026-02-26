/**
 * 基于期权仪表盘数据生成「AI 形态 + 技术分析」、买卖区间与综合结论
 * 规则驱动，后续可替换为真实 LLM 接口
 */
import type { DashboardData } from '../types';

export interface PeriodTechnical {
  period: string;
  summary: string;
}

export interface HistoryPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface AIAnalysisResult {
  symbol: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  formAnalysis: string[];
  technicalAnalysis: string[];
  buyZone: { low: number; high: number; reason: string };
  sellZone: { low: number; high: number; reason: string };
  conclusion: string;
  risks: string[];
  keyLevels: { level: number; label: string; type: 'support' | 'resistance' | 'magnet' | 'flip' }[];
  periodTechnical?: PeriodTechnical[];
  generatedAt: string;
}

function summarizePeriod(periodLabel: string, data: HistoryPoint[], _spot: number): string {
  if (!data.length) return `${periodLabel}：无数据。`;
  const closes = data.map((d) => d.close).filter((c) => c > 0);
  if (!closes.length) return `${periodLabel}：无有效收盘价。`;
  const first = closes[0];
  const last = closes[closes.length - 1];
  const low = Math.min(...data.map((d) => d.low).filter((l) => l > 0));
  const high = Math.max(...data.map((d) => d.high));
  const ret = first > 0 ? (((last - first) / first) * 100) : 0;
  const range = high - low;
  const volPct = low > 0 ? (range / low) * 100 : 0;
  let trend = '震荡';
  if (ret > 5) trend = '偏多';
  else if (ret < -5) trend = '偏空';
  return `${periodLabel}：区间涨跌幅约 ${ret >= 0 ? '+' : ''}${ret.toFixed(1)}%，高低点 $${low.toFixed(2)}–$${high.toFixed(2)}，波动约 ${volPct.toFixed(0)}%。形态${trend}。`;
}

const PERIOD_DAYS = [
  { days: 30, label: '过去1个月' },
  { days: 90, label: '过去3个月' },
  { days: 180, label: '过去6个月' },
  { days: 365, label: '过去1年' },
] as const;

export function generateAIAnalysis(
  data: DashboardData,
  historyByPeriod?: { days: number; data: HistoryPoint[] }[]
): AIAnalysisResult {
  const spot = data.spot;
  const expMove = data.expectedMoveDollar;
  const putWall = data.putWallStrike;
  const callWall = data.callWallStrike;
  const maxPain = data.maxPain;
  const gammaFlip = data.gammaFlipStrike;
  const netGex = data.netGex;
  const pcOi = data.putCallOiRatio;
  const atmIv = data.atmIv * 100;

  // 形态分析
  const formAnalysis: string[] = [];
  if (netGex > 0) {
    formAnalysis.push(`净 GEX 为正（${(netGex / 1e6).toFixed(1)}M），交易商正伽马环境，买跌卖涨，波动受抑制，价格易在关键行权价附近区间震荡。`);
  } else {
    formAnalysis.push(`净 GEX 为负，交易商负伽马，对冲会放大波动，需警惕单边快速行情。`);
  }
  if (pcOi < 0.5) {
    formAnalysis.push(`P/C OI 比偏低（${pcOi.toFixed(2)}），看涨期权持仓占优，市场偏看涨布局；极端低值有时为反向信号。`);
  } else if (pcOi > 1.2) {
    formAnalysis.push(`P/C OI 比偏高（${pcOi.toFixed(2)}），看跌持仓占优，偏防守或看跌；可关注是否过度悲观后的反弹。`);
  } else {
    formAnalysis.push(`P/C OI 比中性（${pcOi.toFixed(2)}），多空持仓相对均衡。`);
  }
  formAnalysis.push(`最大痛苦点 $${maxPain}，到期周附近价格有向该水平靠拢的统计倾向。`);
  if (spot > callWall * 0.99 && spot < callWall * 1.01) {
    formAnalysis.push(`现价贴近 Call Wall $${callWall}，该处为交易商伽马集中区，上行易遇阻力。`);
  }
  if (spot > putWall * 0.99 && spot < putWall * 1.01) {
    formAnalysis.push(`现价贴近 Put Wall $${putWall}，该处为下行支撑密集区。`);
  }
  formAnalysis.push(`Gamma 翻转约在 $${gammaFlip}，该水平附近由负伽马转正伽马，波动结构会发生变化。`);

  // 技术分析（基于关键水平与预期波动）
  const technicalAnalysis: string[] = [];
  technicalAnalysis.push(`关键支撑：Put Wall $${putWall}、Gamma Flip $${gammaFlip}；跌破 $${putWall} 则下一支撑看 $${Math.round(putWall - expMove)} 一带。`);
  technicalAnalysis.push(`关键阻力：Call Wall $${callWall}；突破后下一阻力看 $${Math.round(callWall + expMove)} 一带。`);
  technicalAnalysis.push(`到期前预期波动（Straddle 中值）：±$${expMove.toFixed(2)}（约 ±${data.expectedMovePct.toFixed(1)}%），区间参考 $${(spot - expMove).toFixed(0)}–$${(spot + expMove).toFixed(0)}。`);
  technicalAnalysis.push(`ATM 隐含波动率 ${atmIv.toFixed(1)}%，${data.atmIvChange != null && data.atmIvChange < 0 ? '较前日下降，波动预期收敛。' : '波动预期需结合 DTE 与事件判断。'}`);
  const dte = data.dte;
  if (dte <= 7) {
    technicalAnalysis.push(`距离到期 ${dte} 天，时间价值衰减加速，Gamma 效应放大，临近到期日波动与 Max Pain 引力增强。`);
  }

  const roundStep = spot < 20 ? 0.5 : 5;
  const clamp = (v: number) => Math.max(0, Math.round(v / roundStep) * roundStep);

  // 买入区间（支撑带）
  const buyLow = Math.min(putWall, gammaFlip, maxPain) - expMove * 0.5;
  const buyHigh = Math.min(putWall, spot * 0.98) + expMove * 0.2;
  const buyZone = {
    low: clamp(buyLow),
    high: clamp(buyHigh),
    reason: `基于 Put Wall $${putWall}、Gamma Flip $${gammaFlip} 及预期波动下沿，逢回调至该区间可关注多头或抄底机会；跌破下沿则观望或止损。`,
  };

  // 卖出区间（阻力带）
  const sellLow = Math.max(callWall * 0.98, spot);
  const sellHigh = callWall + expMove * 0.5;
  const sellZone = {
    low: clamp(sellLow),
    high: clamp(sellHigh),
    reason: `Call Wall $${callWall} 为阻力密集区，反弹至该区间可考虑减仓或卖 Call；有效突破上沿则趋势延续概率增加。`,
  };

  // 综合结论
  let sentiment: AIAnalysisResult['sentiment'] = 'neutral';
  if (pcOi < 0.45 && netGex > 0) sentiment = 'bullish';
  else if (pcOi > 1.1 && netGex < 0) sentiment = 'bearish';
  const conclusionLines: string[] = [];
  if (sentiment === 'bullish') {
    conclusionLines.push(`期权结构偏多：低 P/C OI 比 + 正 GEX，支撑带 $${buyZone.low}–$${buyZone.high}，阻力带 $${sellZone.low}–$${sellZone.high}。`);
  } else if (sentiment === 'bearish') {
    conclusionLines.push(`期权结构偏空或防守加重：高 P/C OI 比或负 GEX，建议在 $${sellZone.low}–$${sellZone.high} 考虑减仓或对冲，支撑关注 $${buyZone.low}–$${buyZone.high}。`);
  } else {
    conclusionLines.push(`期权结构中性，区间思路：支撑 $${buyZone.low}–$${buyZone.high}，阻力 $${sellZone.low}–$${sellZone.high}，结合 Max Pain $${maxPain} 与到期日观察方向选择。`);
  }
  conclusionLines.push(`以上由期权数据规则生成，不构成投资建议；实盘请结合趋势与风控。`);

  // 风险提示
  const risks: string[] = [];
  risks.push('分析基于当前 OI、GEX 与 IV，数据延迟或换月会改变关键水平。');
  risks.push('买入/卖出区间为统计与结构参考，非精确点位，需结合止损与仓位管理。');
  risks.push('临近到期 Gamma 与 Max Pain 效应放大，波动可能加剧。');
  if (atmIv > 50) risks.push('当前 IV 较高，期权权利金偏贵，买权成本大，卖权风险增加。');

  // 关键水平列表
  const keyLevels = [
    { level: putWall, label: `Put Wall (支撑)`, type: 'support' as const },
    { level: gammaFlip, label: 'Gamma Flip', type: 'flip' as const },
    { level: maxPain, label: 'Max Pain (到期磁铁)', type: 'magnet' as const },
    { level: callWall, label: `Call Wall (阻力)`, type: 'resistance' as const },
  ].sort((a, b) => a.level - b.level);

  const periodTechnical: PeriodTechnical[] | undefined = historyByPeriod?.length
    ? PERIOD_DAYS.map(({ days, label }) => {
        const h = historyByPeriod.find((x) => x.days === days);
        return { period: label, summary: h ? summarizePeriod(label, h.data, spot) : `${label}：暂无数据` };
      })
    : undefined;

  return {
    symbol: data.symbol,
    sentiment,
    formAnalysis,
    technicalAnalysis,
    buyZone,
    sellZone,
    conclusion: conclusionLines.join(' '),
    risks,
    keyLevels,
    periodTechnical,
    generatedAt: new Date().toLocaleString('zh-CN'),
  };
}
