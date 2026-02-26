@echo off
chcp 65001 >nul
setlocal
echo ========================================
echo TradingAgents 一键安装（克隆 + 依赖）
echo ========================================

:: 本脚本所在目录 = server\scripts，目标 = server\agent-report\TradingAgents
set "SCRIPT_DIR=%~dp0"
set "AGENT_DIR=%SCRIPT_DIR%..\agent-report"
set "REPO_DIR=%AGENT_DIR%\TradingAgents"

if not exist "%AGENT_DIR%" (
    echo [错误] 未找到目录: %AGENT_DIR%
    pause
    exit /b 1
)

if exist "%REPO_DIR%\tradingagents\graph\trading_graph.py" (
    echo [跳过] 已存在 TradingAgents: %REPO_DIR%
    goto :install
)

echo [1/2] 下载 TradingAgents 到 %REPO_DIR%

:: 优先尝试 git（若在 PATH 中）
where git >nul 2>nul
if %errorlevel% equ 0 (
    git clone --depth 1 https://github.com/TauricResearch/TradingAgents.git "%REPO_DIR%"
    if %errorlevel% equ 0 goto :install
)

:: 无 Git 或 clone 失败：用 PowerShell 下载 ZIP 并解压（无需安装 Git）
echo Git 未安装或不可用，改用 ZIP 下载...
set "ZIP_URL=https://github.com/TauricResearch/TradingAgents/archive/refs/heads/main.zip"
set "ZIP_FILE=%TEMP%\TradingAgents_main.zip"
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%ZIP_URL%' -OutFile '%ZIP_FILE%' -UseBasicParsing } catch { exit 1 }"
if errorlevel 1 (
    echo [错误] 下载失败，请检查网络。或手动安装 Git 后重试。
    pause
    exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "Expand-Archive -Path '%ZIP_FILE%' -DestinationPath '%AGENT_DIR%' -Force; if (Test-Path '%REPO_DIR%') { Remove-Item '%REPO_DIR%' -Recurse -Force }; Rename-Item -Path '%AGENT_DIR%\TradingAgents-main' -NewName 'TradingAgents'"
del "%ZIP_FILE%" 2>nul
if not exist "%REPO_DIR%\tradingagents\graph\trading_graph.py" (
    echo [错误] 解压后未找到源码，请检查 %AGENT_DIR%
    pause
    exit /b 1
)
echo 下载并解压完成。

:install
echo [2/2] 安装 Python 依赖（在 TradingAgents 目录内）
cd /d "%REPO_DIR%"
if not exist "requirements.txt" (
    echo [错误] 未找到 requirements.txt，克隆可能不完整。
    pause
    exit /b 1
)
python -m pip install -r requirements.txt
if errorlevel 1 (
    echo [错误] pip install 失败。请确认已安装 Python 3.10+ 且已加入 PATH。
    pause
    exit /b 1
)

echo.
echo ========================================
echo 安装完成。下一步：
echo ========================================
echo 1. 在项目根或 server 目录下的 .env 中配置至少一个 LLM 的 API Key，例如：
echo    OPENAI_API_KEY=sk-xxx
echo    （或 ANTHROPIC_API_KEY、GOOGLE_API_KEY、XAI_API_KEY）
echo 2. 无需设置 TRADINGAGENT_REPO_%%PATH%%，脚本会自动使用上述目录。
echo    %REPO_DIR%
echo 3. 重启 Node 后端后，在仪表盘点击「生成报告」即可。
echo.
echo 如何获取 API Key：
echo   - OpenAI: https://platform.openai.com/api-keys 注册并创建
echo   - Anthropic: https://console.anthropic.com/ 注册后 API Keys
echo   - Google: https://aistudio.google.com/app/apikey
echo ========================================
pause
