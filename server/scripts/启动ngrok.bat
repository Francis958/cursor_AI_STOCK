@echo off
chcp 65001 >nul
cd /d "%~dp0"

set NGROK_CMD=
if exist "%~dp0ngrok.exe" (
  set "NGROK_CMD=%~dp0ngrok.exe"
) else (
  where ngrok >nul 2>&1
  if not errorlevel 1 set NGROK_CMD=ngrok
)

if "%NGROK_CMD%"=="" (
  echo.
  echo 未检测到 ngrok。请任选一种方式安装：
  echo.
  echo 方式一（推荐）：把 ngrok.exe 放到本脚本同目录
  echo   1. 打开 https://ngrok.com/download
  echo   2. 下载 Windows 版，解压得到 ngrok.exe
  echo   3. 将 ngrok.exe 复制到： %~dp0
  echo   4. 重新双击本脚本
  echo.
  echo 方式二：用 winget 安装后「新开一个终端」再运行本脚本
  echo   winget install ngrok.ngrok
  echo.
  pause
  exit /b 1
)

echo.
echo 正在启动 ngrok，暴露本地 8765 端口...
echo 请把下面显示的 "Forwarding" 里的 https 地址记下来，
echo 回调网址填：  https://你的域名.ngrok-free.app/callback
echo.
echo 保持本窗口不关，再开一个终端运行：
echo   cd server
echo   python scripts/get_schwab_token.py --redirect-uri https://你的域名.ngrok-free.app/callback
echo.
echo ----------------------------------------
"%NGROK_CMD%" http 8765
if errorlevel 1 (
  echo.
  echo 若提示需要 authtoken：先注册 https://dashboard.ngrok.com/signup
  echo 再在 https://dashboard.ngrok.com/get-started/your-authtoken 复制 token，
  echo 在终端执行：ngrok config add-authtoken 你的token
  echo 然后重新运行本脚本。
  pause
)
