/**
 * Electron 主进程：启动后端并打开窗口，无需在命令行跑 npm run dev
 */
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '..');
const SERVER_DIR = path.join(PROJECT_ROOT, 'server');
const CLIENT_DIST = path.join(PROJECT_ROOT, 'client', 'dist');
const PORT = process.env.PORT || 3001;
const HEALTH_URL = `http://127.0.0.1:${PORT}/api/health`;
const APP_URL = `http://127.0.0.1:${PORT}`;

let serverProcess = null;
let mainWindow = null;

function startServer() {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(SERVER_DIR, 'dist', 'index.js');
    const env = {
      ...process.env,
      PORT: String(PORT),
      PUBLIC_DIR: CLIENT_DIST,
    };
    serverProcess = spawn(process.execPath, [serverPath], {
      cwd: SERVER_DIR,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    serverProcess.stdout.on('data', (d) => process.stdout.write(d.toString()));
    serverProcess.stderr.on('data', (d) => process.stderr.write(d.toString()));
    serverProcess.on('error', reject);
    serverProcess.on('exit', (code) => {
      if (code !== null && code !== 0) console.error('Server exited with code', code);
    });

    const deadline = Date.now() + 30000;
    function wait() {
      if (Date.now() > deadline) {
        reject(new Error('Server did not start in 30s'));
        return;
      }
      fetch(HEALTH_URL, { method: 'GET' }).then(
        (r) => (r.ok ? resolve() : setTimeout(wait, 200)),
        () => setTimeout(wait, 200)
      );
    }
    setTimeout(wait, 500);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
    title: 'Options Dashboard',
  });
  mainWindow.loadURL(APP_URL);
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(async () => {
  await startServer();
  createWindow();
  app.on('window-all-closed', () => {
    if (serverProcess) {
      serverProcess.kill();
      serverProcess = null;
    }
    app.quit();
  });
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});
