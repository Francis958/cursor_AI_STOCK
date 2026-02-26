import { useState } from 'react';

/** 指标解读与合理区间：可折叠，避免页面杂乱 */
export default function IndicatorGuide() {
  const [open, setOpen] = useState(false);

  const items: { name: string; howToRead: string; range: string }[] = [
    {
      name: '交易洞察 / 情绪',
      howToRead: '根据 Put/Call 持仓比与 Gamma 结构自动判断偏多/偏空。滑块越靠右越偏多。',
      range: '50 为中性；低于 40 偏空、高于 60 偏多。极端（低于 30 或高于 70）需警惕反转。',
    },
    {
      name: '关键水平（Put 墙 / Call 墙 / Max Pain / Gamma 翻转）',
      howToRead: 'Put 墙：看跌持仓最集中的行权价，常成支撑。Call 墙：看涨持仓最集中，常成阻力。Max Pain：到期日标的易被「钉」向的价位。Gamma 翻转：做市商从负 Gamma 转正 Gamma 的临界，以上多空博弈加剧。',
      range: '现价在 Put 墙上方、Call 墙下方为常态。Max Pain 接近现价时到期波动可能收敛。',
    },
    {
      name: '累计 Gamma 敞口（CGE）',
      howToRead: '绿区：做市商整体正 Gamma，倾向高抛低吸、抑制波动。红区：负 Gamma，波动易放大。',
      range: '净 GEX 转负时波动风险上升；接近到期或大行权价集中时效应更明显。',
    },
    {
      name: '成交量分布（Volume Profile）',
      howToRead: '按行权价看 Call/Put 成交量分布，反映资金集中度与多空倾向。',
      range: '平值附近量通常最大；远端大量可视为关键位或情绪极端。',
    },
    {
      name: '期权活动热力图',
      howToRead: '蓝=Call 活动占优（看涨），红=Put 活动占优（看跌），灰=均衡。',
      range: '单一行权价或到期活动异常集中时，可能形成支撑/阻力或到期挤仓。',
    },
    {
      name: 'ATM IV / 平价隐含波动率',
      howToRead: '当前到期平值期权隐含的波动率，反映市场对后续波动的定价。',
      range: '一般 15%–80% 较常见；&gt;100% 多为高波动标的或危机预期。可与历史波动率 HV 对比：IV &gt; HV 偏贵，IV &lt; HV 偏便宜。',
    },
    {
      name: '25Δ Risk Reversal（25 Delta 风险反转）',
      howToRead: '看涨 25Δ 与看跌 25Δ IV 之差，反映偏斜（Skew）：正=Put 更贵，市场防跌。',
      range: '股票期权多为正（Put 贵于 Call）；绝对值过大表示恐慌或事件溢价。',
    },
    {
      name: 'IV Skew / IV Smile',
      howToRead: '不同行权价的 IV 曲线。Skew：虚值 Put 通常更贵（左偏）。Smile：平值附近最低、两端升高。',
      range: '左尾（低行权价）IV 明显高于平值为常态；若整体平坦或倒挂需结合事件与流动性判断。',
    },
    {
      name: 'Max Pain / 预期移动（Expected Move）',
      howToRead: 'Max Pain：到期使期权买方总亏损最大的价格。Expected Move：平值 Straddle 隐含的 ±1 倍标准差波动幅度（金额或百分比）。',
      range: '到期前标的有向 Max Pain 靠拢倾向。Expected Move 可作止损/目标参考；±1σ 约覆盖 68% 情形。',
    },
    {
      name: 'Dealer GEX / 做市商 Gamma 敞口',
      howToRead: '按行权价看做市商 Gamma 头寸：正=高抛低吸稳价格，负=追涨杀跌放大波动。',
      range: '现价穿过负 Gamma 密集区时波动易放大；正 Gamma 密集区附近易震荡。',
    },
    {
      name: 'Greeks 敞口（Delta / Gamma / Theta / Vega）',
      howToRead: 'Delta：方向敞口。Gamma：Delta 变化率，近到期或平值附近大。Theta：时间损耗。Vega：波动率敏感度。',
      range: '按持仓汇总看净敞口；净 Delta 大时方向风险高，净 Gamma 为负时波动风险高。',
    },
    {
      name: '买卖价差（Bid-Ask Spread）',
      howToRead: '各行权价 Call/Put 的买一卖一差，反映流动性。',
      range: '价差越小流动性越好；平值通常最紧，深度虚值/实值常较宽。',
    },
  ];

  return (
    <section className="bg-white border-b border-gray-200">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-2.5 flex items-center justify-between text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <span className="flex items-center gap-2">
          <span aria-hidden>📖</span>
          指标解读与合理区间
        </span>
        <span className="text-gray-400">{open ? '▼' : '▶'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-3 mt-2">
            以下为各面板指标的简要解读及常见合理区间，便于快速理解、避免误读。
          </p>
          <ul className="space-y-3 text-sm">
            {items.map((item, i) => (
              <li key={i} className="border-l-2 border-blue-200 pl-3 py-1">
                <div className="font-medium text-gray-800">{item.name}</div>
                <div className="text-gray-600 mt-0.5">
                  <span className="text-gray-500">怎么看：</span>
                  {item.howToRead}
                </div>
                <div className="text-gray-600 mt-0.5">
                  <span className="text-gray-500">合理区间 / 注意：</span>
                  {item.range}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
