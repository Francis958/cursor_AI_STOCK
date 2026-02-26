@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo 正在启动 Options Dashboard...
call npm run app
if errorlevel 1 (
  echo.
  echo 启动失败，请检查是否已安装 Node.js 并在此文件夹运行过 npm install。
  pause
)
