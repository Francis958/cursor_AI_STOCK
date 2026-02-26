# 在 iPhone 上使用期权仪表盘

## 方式一：同一 WiFi 下用手机浏览器访问（开发/内网）

1. **启动后端**（在项目根目录或 server 目录）  
   ```bash
   cd server && npm run dev
   ```
2. **启动前端**（已配置 `host: true`，会监听本机局域网 IP）  
   ```bash
   cd client && npm run dev
   ```
3. 终端里会显示类似：  
   `Local: http://localhost:5173/`  
   `Network: http://192.168.x.x:5173/`
4. **iPhone 连同一 WiFi**，在 Safari 地址栏输入：  
   `http://192.168.x.x:5173`  
   （把 `192.168.x.x` 换成你电脑上显示的 Network 地址）
5. **添加到主屏幕**（当 PWA 用）：  
   Safari 底部点「分享」→「添加到主屏幕」→ 命名（如「期权仪表盘」）→ 添加。  
   之后从主屏幕图标打开即可，接近 App 体验。

**注意**：API 请求会走你电脑上的 `localhost:3001`，所以必须保证手机能访问到电脑的后端。若后端只监听 127.0.0.1，手机访问会失败，需让后端监听 `0.0.0.0`（例如 `server` 用 `HOST=0.0.0.0` 或对应配置）。

---

## 方式二：部署到公网后用 iPhone 访问

把前端和后端都部署到一台有公网 IP 或域名的服务器上，iPhone 用 Safari 打开该网址即可；同样可以「添加到主屏幕」当 PWA 使用。

### 1. 前端（Vite 构建 + 静态托管）

```bash
cd client
npm run build
```

将 `client/dist` 目录部署到任意静态托管（如 Nginx、Vercel、Netlify、对象存储 + CDN 等），并确保：

- 若前端与后端不同域，需配置 API 代理或后端 CORS，请求发到正确后端地址。
- 根路径或子路径要与 `vite.config.ts` 里 `base` 一致（默认 `base: '/'` 即可）。

### 2. 后端

在服务器上运行你的 Node 后端（如 `server`），并保证：

- 监听 `0.0.0.0` 或对外网可访问的地址。
- 若用 Nginx 反向代理，把 `/api` 转发到该后端。

### 3. 前端请求后端地址

若前后端同域（例如都通过 Nginx 反向代理），无需改代码。  
若前端在 `https://your-domain.com`，后端在 `https://api.your-domain.com`，需在客户端把 API 请求发到 `https://api.your-domain.com`（例如通过环境变量 `VITE_API_BASE` + `vite.config.ts` 里配置的 proxy 或 axios baseURL）。

### 4. iPhone 上使用

- Safari 打开你的前端地址（如 `https://your-domain.com`）。
- 可选：分享 → 添加到主屏幕，名称如「期权仪表盘」。

---

## PWA 与图标说明

- 项目已配置 `manifest.json` 和 Apple 的 meta，支持「添加到主屏幕」和独立显示。
- 如需自定义主屏幕图标：在 `client/public` 下放一张 **192×192** 的 PNG，命名为 `icon-192.png`；未放置时 iOS 会使用默认或截图。

---

## 常见问题

| 问题 | 处理 |
|------|------|
| 手机打开页面空白或接口报错 | 检查手机和电脑是否同一 WiFi；后端是否监听 `0.0.0.0`；前端 proxy 的 target 是否为本机后端地址。 |
| 部署后接口 404 | 检查 Nginx/托管是否把 `/api` 转发到后端；或前端 API baseURL 是否指向正确域名。 |
| 添加到主屏幕后仍跳转 Safari | 正常；iOS 会以 Safari 内核运行，但全屏显示。 |
