#!/usr/bin/env python3
"""
TradingAgents 桥接脚本：接收标的与可选配置，运行多智能体报告，向 stdout 输出 JSON。
供 Node 后端 spawn 调用。需先安装 TradingAgents 或设置 TRADINGAGENT_REPO_PATH。
直接运行时可从 server/.env 或本目录 .env 加载 OPENAI_API_KEY 等（仅当未设置时补全）。
"""
import json
import os
import sys
from datetime import date, timedelta

# 强制 stdout 使用 UTF-8，避免 Windows 下中文乱码
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")


def _load_dotenv_if_needed():
    """直接运行脚本时加载 .env（OPENAI_API_KEY、AGENT_SYMBOL 等）。Node spawn 时已传 env，不会依赖此逻辑。"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    for rel in (os.path.join(script_dir, ".env"), os.path.join(script_dir, "..", ".env")):
        if not os.path.isfile(rel):
            continue
        try:
            with open(rel, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    if "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip('"').strip("'")
                        if k and not os.environ.get(k):
                            os.environ[k] = v
        except Exception:
            pass


def _serialize(obj):
    """将可能含 Pydantic/复杂对象的结果转为可 JSON 序列化。"""
    if obj is None:
        return None
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    if hasattr(obj, "__dict__"):
        return {k: _serialize(v) for k, v in obj.__dict__.items()}
    if isinstance(obj, (list, tuple)):
        return [_serialize(x) for x in obj]
    if isinstance(obj, dict):
        return {k: _serialize(v) for k, v in obj.items()}
    if isinstance(obj, (str, int, float, bool)):
        return obj
    return str(obj)


def main():
    _load_dotenv_if_needed()
    # 从环境变量或命令行取参数
    symbol = os.environ.get("AGENT_SYMBOL", "").strip().upper()
    date_str = os.environ.get("AGENT_DATE", "").strip()
    if not symbol and len(sys.argv) >= 2:
        symbol = sys.argv[1].strip().upper()
    if not date_str and len(sys.argv) >= 3:
        date_str = sys.argv[2].strip()
    if not date_str:
        # 默认下一个交易日近似为明天
        d = date.today() + timedelta(days=1)
        date_str = d.isoformat()

    # TradingAgents 路径：环境变量 > 本脚本同目录下 TradingAgents > 上级目录 TradingAgents
    script_dir = os.path.dirname(os.path.abspath(__file__))
    repo_path = os.environ.get("TRADINGAGENT_REPO_PATH", "").strip()
    if not repo_path:
        for candidate in [
            os.path.join(script_dir, "TradingAgents"),
            os.path.join(script_dir, "..", "TradingAgents"),
            os.path.join(script_dir, "..", "..", "TradingAgents"),
        ]:
            abs_candidate = os.path.abspath(candidate)
            if os.path.isdir(abs_candidate) and os.path.isfile(
                os.path.join(abs_candidate, "tradingagents", "graph", "trading_graph.py")
            ):
                repo_path = abs_candidate
                break
    if repo_path and repo_path not in sys.path:
        sys.path.insert(0, repo_path)

    try:
        from tradingagents.graph.trading_graph import TradingAgentsGraph
        from tradingagents.default_config import DEFAULT_CONFIG
    except ImportError as e:
        out = {
            "ok": False,
            "error": "TradingAgents 未安装或未找到。请运行 server/scripts/安装TradingAgents.bat 自动克隆并安装，或在 server/agent-report 下克隆仓库到 TradingAgents 目录，并配置 .env 中的 OPENAI_API_KEY（或其它 LLM Key）。详见 server/agent-report/README.md。",
            "detail": str(e),
        }
        print(json.dumps(out, ensure_ascii=False))
        sys.stdout.flush()
        sys.exit(1)

    config = DEFAULT_CONFIG.copy()

    # 若只配置了 Google/Gemini 而未配置 OpenAI，自动改用 Google 提供商
    # 遇 429 配额不足时可在 .env 中设置 AGENT_QUICK_LLM / AGENT_DEEP_LLM 换用额度更高的模型（如 gemini-2.5-flash-lite、gemini-2.0-flash）
    has_openai = bool(os.environ.get("OPENAI_API_KEY", "").strip())
    has_google = bool(os.environ.get("GOOGLE_API_KEY", "").strip())
    if has_google and not has_openai:
        config["llm_provider"] = "google"
        # 免费 tier 下 2.5-pro 额度为 0，故默认都用 flash-lite，避免 429
        config["deep_think_llm"] = os.environ.get("AGENT_DEEP_LLM", "").strip() or "gemini-2.5-flash-lite"
        config["quick_think_llm"] = os.environ.get("AGENT_QUICK_LLM", "").strip() or "gemini-2.5-flash-lite"
        config["backend_url"] = "https://generativelanguage.googleapis.com/v1"

    config_overrides = os.environ.get("AGENT_REPORT_CONFIG", "")
    if config_overrides:
        try:
            config.update(json.loads(config_overrides))
        except json.JSONDecodeError:
            pass

    selected = os.environ.get("AGENT_SELECTED_ANALYSTS", "market,social,news,fundamentals").strip()
    selected_analysts = [a.strip() for a in selected.split(",") if a.strip()]
    if not selected_analysts:
        selected_analysts = ["market", "social", "news", "fundamentals"]

    try:
        ta = TradingAgentsGraph(
            selected_analysts=selected_analysts,
            debug=False,
            config=config,
        )
        final_state, decision = ta.propagate(symbol, date_str)
    except Exception as e:
        out = {
            "ok": False,
            "error": str(e),
            "symbol": symbol,
            "date": date_str,
        }
        print(json.dumps(out, ensure_ascii=False, default=str))
        sys.stdout.flush()
        sys.exit(1)

    # 摘要报告（截断过长内容便于前端展示）
    def _truncate(s, max_len=800):
        if s is None:
            return None
        s = str(s).strip()
        return s[:max_len] + "…" if len(s) > max_len else s

    reports = {}
    for key in ("market_report", "sentiment_report", "news_report", "fundamentals_report"):
        reports[key.replace("_report", "")] = _truncate(final_state.get(key))

    inv = final_state.get("investment_debate_state") or {}
    risk = final_state.get("risk_debate_state") or {}

    out = {
        "ok": True,
        "symbol": symbol,
        "date": date_str,
        "decision": _serialize(decision),
        "reports": reports,
        "trader_plan": _truncate(final_state.get("trader_investment_plan")),
        "investment_plan": _truncate(final_state.get("investment_plan")),
        "judge_decision": _truncate(inv.get("judge_decision")),
        "risk_judge_decision": _truncate(risk.get("judge_decision")),
        "final_trade_decision": _serialize(final_state.get("final_trade_decision")),
    }
    print(json.dumps(out, ensure_ascii=False, default=str))
    sys.stdout.flush()


if __name__ == "__main__":
    main()
