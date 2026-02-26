import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use(routes);

/** 以 Electron 桌面应用运行时，由主进程传入 PUBLIC_DIR，在此提供前端静态与 SPA 回退 */
const publicDir = process.env.PUBLIC_DIR;
if (publicDir) {
  app.use(express.static(publicDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Options Dashboard API at http://localhost:${PORT}`);
});
