# Multi-Agent 报告（TradingAgents 桥接）

在期权仪表盘后端调用 [TradingAgents](https://github.com/TauricResearch/TradingAgents) 生成多智能体交易分析报告。

---

## Windows 快速配置（推荐）

1. **一键安装**：双击运行  
   `server\scripts\安装TradingAgents.bat`  
   会克隆 TradingAgents 到 `server/agent-report/TradingAgents` 并安装 Python 依赖（需已安装 Git 和 Python 3.10+）。

2. **配置 LLM API Key**：在**项目根目录**的 `server/.env`（或根目录 `.env`）中增加至少一个：
   ```env
   OPENAI_API_KEY=sk-xxx
   ```
   也可用 `ANTHROPIC_API_KEY`、`GOOGLE_API_KEY`、`XAI_API_KEY`（与 TradingAgents 一致即可）。

   **如何获取 API Key：**
   - **OpenAI**：打开 https://platform.openai.com/api-keys ，登录/注册后点击 “Create new secret key”，复制保存（格式 `sk-...`）。
   - **Anthropic (Claude)**：打开 https://console.anthropic.com/ ，登录后进入 API Keys 创建。
   - **Google (Gemini)**：打开 https://aistudio.google.com/app/apikey 创建密钥。

3. **重启 Node 后端**，在仪表盘「Multi-Agent 报告」里点击「生成报告」。  
   脚本会**自动**使用 `server/agent-report/TradingAgents`，无需再设 `TRADINGAGENT_REPO_PATH`。

---

## 自动查找 TradingAgents 的路径

脚本按以下顺序查找（找到即用，无需环境变量）：

1. 环境变量 `TRADINGAGENT_REPO_PATH`
2. `server/agent-report/TradingAgents`（安装脚本默认克隆位置）
3. `server/TradingAgents`
4. 项目根目录 `TradingAgents`

---

## 方式二：手动克隆 + 指定路径

```bash
git clone https://github.com/TauricResearch/TradingAgents.git
cd TradingAgents
pip install -r requirements.txt
```

若克隆到其它目录，在启动 Node 前设置：

- Windows: `set TRADINGAGENT_REPO_PATH=C:\path\to\TradingAgents`
- Linux/macOS: `export TRADINGAGENT_REPO_PATH=/path/to/TradingAgents`

或在 `server/.env` 中写一行：`TRADINGAGENT_REPO_PATH=C:\path\to\TradingAgents`（需在启动时被加载）。

---

## 可选环境变量（单次报告由后端传入）

- `AGENT_SYMBOL`：标的代码
- `AGENT_DATE`：交易日期，如 2026-01-15
- `AGENT_SELECTED_ANALYSTS`：逗号分隔，如 `market,social,news,fundamentals`
- `AGENT_REPORT_CONFIG`：JSON 字符串，覆盖 default_config

## 遇 429 配额不足（RESOURCE_EXHAUSTED）时

Gemini 免费版对部分模型有**每日请求数**限制（如 gemini-2.5-flash 可能仅约 20 次/天），一次多智能体报告会发起多次调用，容易触发。

**可做：**

1. **换用额度更高的模型**（在 `server/.env` 中增加）  
   - `AGENT_QUICK_LLM=gemini-2.5-flash-lite`（默认已使用，免费额度通常更高）  
   - 或 `AGENT_QUICK_LLM=gemini-2.0-flash`、`AGENT_DEEP_LLM=gemini-2.0-flash` 等，具体以 [Gemini 配额说明](https://ai.google.dev/gemini-api/docs/rate-limits) 为准。
2. **等配额重置**：免费配额一般按日重置（如太平洋时间 0 点）。
3. **开通计费**：在 [Google AI Studio](https://aistudio.google.com) 为项目启用付费后，配额会提高。

## 测试脚本

```bash
set AGENT_SYMBOL=NVDA
python server/agent-report/run_report.py
# 或
python server/agent-report/run_report.py NVDA 2026-01-15
```

脚本仅向 **stdout** 输出一行 JSON；错误信息在该 JSON 的 `error` 字段中。
