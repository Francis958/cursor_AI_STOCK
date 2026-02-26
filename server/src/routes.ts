import { Router } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchOptionChain } from './schwab.js';
import { buildDashboardData } from './calculations.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();
const AGENT_REPORT_SCRIPT = path.join(__dirname, '..', 'agent-report', 'run_report.py');
const AGENT_REPORT_TIMEOUT_MS = 600000; // 10 min（多智能体 + 多轮辩论较耗时）

/** 按标的缓存最近一次成功报告，便于超时/刷新后「获取上次报告」 */
const lastAgentReportBySymbol: Record<string, unknown> = {};

router.get('/api/dashboard/:symbol', async (req, res) => {
  try {
    const symbol = (req.params.symbol || 'SNDK').toUpperCase();
    const expiration = req.query.expiration as string | undefined;
    const rawStrikes = req.query.strikes;
    const strikeCount = rawStrikes === undefined || rawStrikes === ''
      ? undefined
      : Number(rawStrikes) || undefined;
    const { chain, source, mockReason } = await fetchOptionChain(symbol, expiration, strikeCount);
    const data = buildDashboardData(chain, source, mockReason);
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String((e as Error).message) });
  }
});

/** 返回该标的全部可选到期日（多个月），供前端下拉选择 */
router.get('/api/expirations/:symbol', async (req, res) => {
  try {
    const symbol = (req.params.symbol || 'SNDK').toUpperCase();
    const { chain, allExpirations } = await fetchOptionChain(symbol, undefined, 5);
    const expirations = (allExpirations && allExpirations.length > 0)
      ? allExpirations
      : [...new Set(chain.contracts.map((c) => c.expiration))].sort();
    res.json(expirations);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String((e as Error).message) });
  }
});

/** 获取该标的最近一次成功生成的报告（若存在），用于超时或刷新后查看 */
router.get('/api/agent-report/last', (req, res) => {
  const symbol = (req.query.symbol || '').toString().trim().toUpperCase();
  if (!symbol) return res.status(400).json({ error: '请提供 symbol' });
  const cached = lastAgentReportBySymbol[symbol];
  if (!cached) return res.status(404).json({ error: '暂无该标的的缓存报告' });
  return res.json(cached);
});

/** Multi-Agent 报告（TradingAgents）：POST body { symbol, date?, selectedAnalysts?, config?, openaiApiKey? }；openaiApiKey 为前端用户输入，仅本次请求使用，不落库不打印 */
router.post('/api/agent-report', (req, res) => {
  const { symbol, date: tradeDate, selectedAnalysts, config, openaiApiKey: userOpenaiApiKey } = req.body || {};
  const sym = (symbol || '').toString().trim().toUpperCase();
  if (!sym) {
    return res.status(400).json({ error: '请提供 symbol' });
  }
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PYTHONIOENCODING: 'utf-8', // 避免 Windows 下中文错误信息乱码
    AGENT_SYMBOL: sym,
    AGENT_DATE: (tradeDate || '').toString().trim() || undefined,
    AGENT_SELECTED_ANALYSTS: Array.isArray(selectedAnalysts)
      ? selectedAnalysts.join(',')
      : (selectedAnalysts || 'market,social,news,fundamentals').toString(),
    AGENT_REPORT_CONFIG: config && typeof config === 'object' ? JSON.stringify(config) : undefined,
    ...(process.env.TRADINGAGENT_REPO_PATH
      ? { TRADINGAGENT_REPO_PATH: process.env.TRADINGAGENT_REPO_PATH }
      : {}),
  };
  // 用户在前端输入的 API Key 仅用于本子进程，不写入 process.env，不记录日志
  const apiKey = typeof userOpenaiApiKey === 'string' && userOpenaiApiKey.trim() ? userOpenaiApiKey.trim() : undefined;
  if (apiKey) {
    env.OPENAI_API_KEY = apiKey;
  }

  const pythonCmd = process.env.PYTHON_PATH || 'python';
  const py = spawn(pythonCmd, [AGENT_REPORT_SCRIPT], {
    env,
    cwd: path.dirname(AGENT_REPORT_SCRIPT),
    shell: true,
  });
  let stdout = '';
  let stderr = '';
  py.stdout.setEncoding('utf8');
  py.stderr.setEncoding('utf8');
  py.stdout.on('data', (chunk) => { stdout += chunk; });
  py.stderr.on('data', (chunk) => { stderr += chunk; });

  const timer = setTimeout(() => {
    py.kill('SIGTERM');
  }, AGENT_REPORT_TIMEOUT_MS);

  py.on('close', (code) => {
    clearTimeout(timer);
    try {
      const lines = stdout.trim().split('\n').filter((s) => s.trim());
      const line = lines.reverse().find((s) => s.trim().startsWith('{')) || lines[0] || stdout.trim();
      const data = JSON.parse(line);
      if (data.ok === true) {
        lastAgentReportBySymbol[sym] = data;
        return res.json(data);
      }
      return res.status(500).json({ error: data.error || '报告生成失败', detail: data.detail });
    } catch (e) {
      const err = (e as Error).message;
      return res.status(500).json({
        error: 'TradingAgents 未安装或脚本执行失败。请参阅 server/agent-report/README.md 配置 Python 与 TradingAgents。',
        detail: stderr || err,
      });
    }
  });
  py.on('error', (err) => {
    clearTimeout(timer);
    res.status(500).json({ error: '无法启动 Python 脚本', detail: String(err) });
  });
});

/** 过去 N 天标的日线（仅模拟；仅使用 Schwab 时不提供历史 K 线 API） */
router.get('/api/history/:symbol', async (req, res) => {
  try {
    const symbol = (req.params.symbol || '').toUpperCase();
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 7));
    const { getMockHistory } = await import('./mockHistory.js');
    const data = getMockHistory(symbol, days);
    res.json({ symbol, days, data, source: 'mock' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String((e as Error).message) });
  }
});

export default router;
