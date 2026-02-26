# Options Dashboard

与参考图类似的期权分析仪表盘，支持通过 **Schwab API** 获取期权链数据（也可使用内置模拟数据）。

## 功能概览

- **顶部栏**：股票代码、到期日、行权数量、Greeks 来源（Bid/Mid/Ask）、Load/Refresh/Live/History，以及 SPOT、FORWARD、DTE、ATM IV、25D RR、CALL/PUT OI、P/C VOL、NET GEX、时间戳等核心指标。
- **Option Insights**：基于仓位与波动率结构的自动洞察、情绪滑块、关键水平与预期波动。
- **Key Levels**：Put Wall、Call Wall、Max Pain、Gamma Flip 四张卡片 + 按行权价的 Call OI / Put OI 柱状图。
- **Cumulative Gamma Exposure**：按行权价累积的 Call GEX / Put GEX 面积图。
- **Dealer Gamma Exposure (GEX)**：按行权价的正/负 GEX 柱状图及 Spot 参考线。
- **Greeks Exposure**：Gamma / Vanna / Charm / Delta / Theta / Vega 切换，正负暴露柱状图 + 净暴露折线。
- **Volume Profile**：按行权价的 Call / Put 成交量柱状图。

## 前置要求

- Node.js 18+
- （可选）Schwab 开发者账号与 API 密钥，用于真实行情

## 安装与运行

```bash
# 安装根目录并发脚本依赖
npm install

# 安装后端依赖
cd server && npm install && cd ..

# 安装前端依赖
cd client && npm install && cd ..

# 同时启动后端 (3001) 与前端 (5173)
npm run dev
```

浏览器打开 **http://localhost:5173**，选择股票后点击 **Load** 即可加载。

### 以桌面应用运行（无需开命令行）

先完成一次构建后，可直接用 Electron 打开窗口，不必再在终端跑 `npm run dev`：

```bash
# 首次或代码更新后：构建前后端
npm run build

# 以桌面应用启动（会自动先 build，再打开窗口）
npm run app
```

- **`npm run app`**：先执行 `npm run build`，再启动 Electron 窗口，后端在应用内自动启动。
- **`npm run app:dev`**：在已构建过的前提下，直接启动应用（不重新 build）。

关闭应用窗口后，后端进程会自动退出。

**在文件夹里双击启动（Windows）**  
- 双击 **`启动应用.bat`**：会打开一个命令行窗口并启动应用；若启动失败，窗口会保留以便查看报错。  
- 双击 **`启动应用-无窗口.vbs`**：不显示命令行窗口直接启动应用（依赖同目录下的 `启动应用.bat`）。

**数据源**：仅使用 **Schwab**（已配置时）或 **模拟数据**（未配置时）。顶部栏会显示当前来源（Schwab / 模拟）。过去 N 日 K 线接口 `GET /api/history/:symbol?days=7` 仅返回模拟数据。

## 配置 Schwab API（可选）

1. 在 [Charles Schwab Developer Portal](https://developer.schwab.com/) 注册并创建应用，获取 App Key 与 App Secret。
2. 使用 OAuth 2.0 流程获取 Access Token 与 Refresh Token（可参考 [schwab-py](https://schwab-py.readthedocs.io/) 或官方文档）。
3. 在项目根目录复制 `server/.env.example` 为 `server/.env`，填写：

```env
SCHWAB_APP_KEY=your_app_key
SCHWAB_APP_SECRET=your_app_secret
SCHWAB_ACCESS_TOKEN=your_access_token
SCHWAB_REFRESH_TOKEN=your_refresh_token
PORT=3001
```

4. 重启后端；仪表盘将使用真实期权链数据。

**用 Python 脚本拿 Token（推荐）**  
在 `server/.env` 里已填好 `SCHWAB_APP_KEY` 和 `SCHWAB_APP_SECRET` 后，任选一种方式：

**方式一：最简单，不用 ngrok**

1. 在 Schwab 开发者门户 → 你的应用 → **回调网址**里添加：`https://developer.schwab.com/oauth2-redirect.html`，保存。
2. 在项目里执行：
   ```bash
   cd server
   pip install requests
   python scripts/get_schwab_token.py --manual
   ```
3. 按提示按回车，浏览器会打开 Schwab 登录页，登录并授权。
4. 授权后会跳转，**地址栏**里会有 `code=xxxxx`，把 **code= 后面的整段**复制下来，粘贴回终端回车。
5. 脚本会用该 code 换 token 并写入 `server/.env`，重启应用即可。

**方式二：本地 HTTP 回调**（若门户允许 HTTP）  
在应用里添加 `http://127.0.0.1:8765/callback`，然后执行：`python scripts/get_schwab_token.py`（无需手动复制 code）。

**方式三：门户只允许 HTTPS 且必须用自己的域名时用 ngrok**

1. 安装 [ngrok](https://ngrok.com/)（官网下载或 `winget install ngrok.ngrok`）。首次使用需注册并执行：`ngrok config add-authtoken 你的token`（token 在 [控制台](https://dashboard.ngrok.com/get-started/your-authtoken)）。
2. 运行 `ngrok http 8765`（或双击 `server/scripts/启动ngrok.bat`），记下 `https://xxx.ngrok-free.app`。
3. 在应用里添加回调：`https://xxx.ngrok-free.app/callback`。
4. 执行：`python scripts/get_schwab_token.py --redirect-uri https://xxx.ngrok-free.app/callback`。

## 项目结构

- `server/`：Express API，Schwab 适配层、期权链拉取、GEX/Max Pain/Put-Call Wall/Gamma Flip/Expected Move 等计算。
- `client/`：React + TypeScript + Vite + Recharts + Tailwind，六块分析面板与顶部控制栏。

## 说明

- 数据源：Schwab（已配置）或模拟。未配置 Schwab 时后端返回**模拟期权链**，便于本地开发与演示。
- GEX 公式：`Gamma × OI × 100 × Spot² × 0.01 × (Calls +1 / Puts -1)`，按 1% 标价变动换算。
- Max Pain、Put/Call Wall、Gamma Flip、Expected Move 等均在服务端根据期权链与希腊值计算。
