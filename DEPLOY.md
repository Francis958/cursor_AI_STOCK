# 部署：先推 GitHub，再部署到 Vercel

## 一、推到 GitHub

在项目根目录执行（按需改仓库名和远程地址）：

```bash
# 初始化（若尚未 git init）
git init

# 添加所有文件（.gitignore 已排除 node_modules、.env、dist 等）
git add .
git commit -m "Initial commit: options dashboard + agent report"

# 在 GitHub 网页新建仓库（如 cursor_AI_STOCK），然后添加远程并推送
git remote add origin https://github.com/你的用户名/cursor_AI_STOCK.git
git branch -M main
git push -u origin main
```

---

## 二、Vercel 部署前端

1. 打开 [vercel.com](https://vercel.com)，用 GitHub 登录。
2. **Add New** → **Project**，选择刚推送的 `cursor_AI_STOCK` 仓库。
3. **Configure Project**：
   - **Root Directory**：保持默认（根目录）。
   - **Build Command**：已由根目录的 `vercel.json` 指定（会执行 `cd client && npm ci && npm run build`）。
   - **Output Directory**：已指定为 `client/dist`。
   - **Install Command**：可不填（Vercel 会用 `npm install` 装根目录依赖；若构建报错可改为 `npm install` 或 `npm ci`）。
4. **Environment Variables**（可选）：
   - 若后端单独部署在其他域名（如 Railway、Render），添加变量：
     - 名称：`VITE_API_URL`
     - 值：`https://你的后端域名`（不要末尾斜杠，例如 `https://xxx.railway.app`）
   - 若不填，前端会请求当前域名下的 `/api`（仅当你在同一 Vercel 项目里配置了 API 或代理时才有用）。
5. 点击 **Deploy**，等构建完成即可获得前端访问地址。

---

## 三、后端单独部署（可选）

Vercel 主要托管静态/前端；当前 **Node 后端**（Express + 调用 Python Agent）适合部署在：

- **Railway** / **Render** / **Fly.io** 等（支持长时间运行、子进程、环境变量）。
- 部署后把得到的后端地址填到 Vercel 的 `VITE_API_URL`，前端即可连到该后端。

本地开发仍用：项目根目录 `npm run dev`（前端 + 后端一起跑）。

---

## 四、简要检查清单

- [ ] 已推送代码到 GitHub（含 `vercel.json`、`client/`、根目录 `.gitignore`）。
- [ ] Vercel 已从该仓库导入并成功构建（输出目录为 `client/dist`）。
- [ ] 若使用独立后端：已在 Vercel 中设置 `VITE_API_URL` 并重新部署一次。
