// ============================================================
// Opus8 Desktop — Electron Main Process (Agentic Edition)
// Full agentic AI coding assistant backend with filesystem,
// terminal, search, network, and dialog capabilities.
// ============================================================

const { app, BrowserWindow, ipcMain, dialog, shell, session, clipboard, Notification, Menu } = require('electron');
const path = require('path');
const { fileURLToPath } = require('url');
const { spawn } = require('child_process');
const http = require('http');
const net = require('net');
const fs = require('fs');
const fsPromises = require('fs/promises');
const os = require('os');
const crypto = require('crypto');

// ============================================================
// Globals
// ============================================================

let mainWindow = null;
let rufloDaemon = null;
let currentWorkingDir = os.homedir();
const runningProcesses = new Map();
let previewServer = null;
let previewPort = 3000;
let previewRoot = '';
let previewEntry = 'index.html';
let currentPreviewUrl = '';

app.setName('Hormachuelos');

const isPlaywrightLaunch = process.env.HORMACHUELOS_PLAYWRIGHT === '1';
if (isPlaywrightLaunch) {
  app.setPath('userData', path.join(os.tmpdir(), `hormachuelos-playwright-${process.pid}`));
}
const gotSingleInstanceLock = isPlaywrightLaunch || app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else if (!isPlaywrightLaunch) {
  app.on('second-instance', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });
}

// ============================================================
// Utility Functions
// ============================================================

function toLocalPath(value) {
  if (typeof value !== 'string') return '';
  var normalized = value.trim();
  if (!normalized) return '';
  if (/^file:\/\//i.test(normalized)) return fileURLToPath(normalized);
  if (process.platform === 'win32') {
    var fakeHome = normalized.match(/^\/(?:home\/(?:user|runner|sandbox)|workspace)\/?(.*)$/i);
    if (fakeHome) return path.resolve(currentWorkingDir, fakeHome[1] || '.');
  }
  return path.isAbsolute(normalized) ? normalized : path.resolve(currentWorkingDir, normalized);
}

function isExternalUrl(value) {
  return typeof value === 'string'
    && /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value)
    && !/^[a-zA-Z]:[\\/]/.test(value)
    && !/^file:\/\//i.test(value);
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8',
    '.htm': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
  }[ext] || 'application/octet-stream';
}

function isPreviewableFile(filePath) {
  return ['.html', '.htm', '.svg'].includes(path.extname(filePath).toLowerCase());
}

function notifyPreviewUpdate(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    safeSend('preview-updated', payload);
  }
}

function safeSend(channel, ...args) {
  try {
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
      mainWindow.webContents.send(channel, ...args);
    }
  } catch (e) {
    console.error('[Hormachuelos] IPC send failed:', channel, e.message);
  }
}

function runBufferedProcess(command, args, options = {}) {
  return new Promise((resolve) => {
    const proc = spawn(command, args, { windowsHide: true, ...options });
    let stdout = '';
    let stderr = '';
    proc.stdout?.on('data', (data) => { stdout += data.toString(); });
    proc.stderr?.on('data', (data) => { stderr += data.toString(); });
    proc.on('close', (code) => resolve({ success: code === 0, stdout, stderr, exitCode: code }));
    proc.on('error', (err) => resolve({ success: false, stdout, stderr: err.message, exitCode: -1 }));
  });
}

function isSensitiveEnvKey(key) {
  return /(?:key|token|secret|password|credential|auth|bearer|cookie)/i.test(String(key || ''));
}

function getSystemInfoPayload() {
  return {
    platform: process.platform,
    arch: process.arch,
    homedir: os.homedir(),
    hostname: os.hostname(),
    cwd: currentWorkingDir,
    nodeVersion: process.version,
    memory: {
      total: os.totalmem(),
      free: os.freemem(),
    },
    cpus: os.cpus().map((cpu) => cpu.model).slice(0, 8),
    uptime: os.uptime(),
  };
}

function checkTcpPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve({ success: true, port, available: false }));
    server.once('listening', () => {
      server.close(() => resolve({ success: true, port, available: true }));
    });
    server.listen(Number(port), '127.0.0.1');
  });
}

function getActiveMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow;
  const focused = BrowserWindow.getFocusedWindow();
  return focused && !focused.isDestroyed() ? focused : null;
}

async function runRendererMenuAction(action) {
  const win = getActiveMainWindow();
  if (!win) return { success: false, error: 'No active window' };
  const script = `
    (() => {
      const action = ${JSON.stringify(action)};
      const textOf = (node) => String(node && (node.innerText || node.textContent) || '').replace(/\\s+/g, ' ').trim();
      const visible = (node) => {
        if (!node) return false;
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      };
      const buttons = () => Array.from(document.querySelectorAll('button,[role="button"]'));
      const clickButton = (predicate) => {
        const button = buttons().find((node) => predicate(node) && visible(node)) || buttons().find(predicate);
        if (!button) return false;
        button.click();
        return true;
      };
      const focusComposer = () => {
        const textarea = Array.from(document.querySelectorAll('textarea')).find((node) => /ask|tell|coordinate|build|code/i.test(node.placeholder || '')) || document.querySelector('textarea');
        if (!textarea) return false;
        textarea.focus();
        return true;
      };
      const openWorkspaceManager = () => {
        if (window.__hormSidebarDrawer && window.__hormSidebarDrawer.ensureDrawerContext) window.__hormSidebarDrawer.ensureDrawerContext();
        const drawerWorkspace = document.querySelector('#horm-sidebar-context [data-horm-drawer-workspace]');
        if (drawerWorkspace) {
          drawerWorkspace.click();
          return true;
        }
        return clickButton((button) => /\\b(Cyrhiel|Add file path)\\b/i.test(textOf(button)));
      };

      switch (action) {
        case 'new-session':
          return { success: clickButton((button) => /Start a new chat session/i.test(button.title || '') || /\\bNew Session\\b/i.test(textOf(button))) };
        case 'focus-composer':
          return { success: focusComposer() };
        case 'show-actions':
          return { success: clickButton((button) => /Show actions/i.test(button.title || '')) };
        case 'toggle-sidebar':
          if (window.__hormSidebarDrawer) {
            window.__hormSidebarDrawer.toggle();
            return { success: true };
          }
          return { success: clickButton((button) => /Open menu/i.test(button.title || '') || /Open menu/i.test(button.getAttribute('aria-label') || '')) };
        case 'open-sidebar':
          if (window.__hormSidebarDrawer) {
            window.__hormSidebarDrawer.open();
            return { success: true };
          }
          return { success: false };
        case 'workspace-manager':
          return { success: openWorkspaceManager() };
        case 'select-model':
          return { success: clickButton((button) => /Select AI Model/i.test(button.title || '')) };
        case 'toggle-preview':
          return { success: clickButton((button) => /Toggle live preview/i.test(button.title || '') || /^Preview$/i.test(textOf(button))) };
        case 'toggle-terminal':
          return { success: clickButton((button) => /Toggle integrated terminal/i.test(button.title || '') || /^Terminal$/i.test(textOf(button))) };
        case 'toggle-theme':
          return { success: clickButton((button) => /^Light$|^Dark$/i.test(textOf(button))) };
        case 'copy-last-reply': {
          const replies = Array.from(document.querySelectorAll('.horm-codex-assistant'));
          const last = replies[replies.length - 1];
          const text = textOf(last);
          return { success: !!text, text };
        }
        case 'reload-renderer':
          window.location.reload();
          return { success: true };
        default:
          return { success: false, error: 'Unknown menu action' };
      }
    })()
  `;

  try {
    const result = await win.webContents.executeJavaScript(script, true);
    if (action === 'copy-last-reply' && result && result.text) clipboard.writeText(result.text);
    return result || { success: true };
  } catch (err) {
    console.error('[Hormachuelos] Menu action failed:', action, err.message);
    return { success: false, error: err.message };
  }
}

function rendererMenuItem(label, action, accelerator) {
  return { label, accelerator, click: () => { void runRendererMenuAction(action); } };
}

function showInfoBox(title, message) {
  const win = getActiveMainWindow();
  dialog.showMessageBox(win || undefined, {
    type: 'info',
    title,
    message: title,
    detail: message,
    buttons: ['OK'],
  });
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function showSystemInfo() {
  const info = getSystemInfoPayload();
  showInfoBox('System Info', [
    `Platform: ${info.platform} ${info.arch}`,
    `Host: ${info.hostname}`,
    `Workspace: ${info.cwd}`,
    `Node: ${info.nodeVersion}`,
    `Memory: ${formatBytes(info.memory.free)} free of ${formatBytes(info.memory.total)}`,
    `CPU: ${(info.cpus || []).join(', ')}`,
  ].join('\n'));
}

async function showProxyStatus() {
  const ok = await checkProxyHealth(1500);
  showInfoBox('Backend Proxy Status', ok
    ? `${PROXY_HEALTH_URL} is healthy.`
    : `${PROXY_HEALTH_URL} is not responding yet.`);
}

async function checkInternetStatus(timeoutMs = 2500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch('https://www.gstatic.com/generate_204', {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    return { online: resp.status === 204 || resp.ok, status: resp.status };
  } catch (err) {
    return { online: false, error: err.name === 'AbortError' ? 'timeout' : err.message };
  } finally {
    clearTimeout(timer);
  }
}

async function exportSettingsToFile() {
  try {
    const result = await dialog.showSaveDialog(getActiveMainWindow() || undefined, {
      defaultPath: 'hormachuelos-settings.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) return;
    const settings = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      workspace: currentWorkingDir,
      previewUrl: currentPreviewUrl || '',
    };
    fs.writeFileSync(result.filePath, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (err) {
    dialog.showErrorBox('Export Failed', err.message);
  }
}

function openFolder(targetPath) {
  if (!targetPath) return;
  shell.openPath(targetPath).catch((err) => {
    console.error('[Hormachuelos] Failed to open folder:', err.message);
  });
}

function installApplicationMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        rendererMenuItem('New Session', 'new-session', 'CmdOrCtrl+N'),
        rendererMenuItem('Focus Chatbox', 'focus-composer', 'CmdOrCtrl+L'),
        { type: 'separator' },
        rendererMenuItem('Open Workspace Manager', 'workspace-manager', 'CmdOrCtrl+O'),
        { label: 'Open Current Workspace in Explorer', accelerator: 'CmdOrCtrl+Shift+E', click: () => openFolder(currentWorkingDir) },
        { label: 'Copy Workspace Path', click: () => clipboard.writeText(currentWorkingDir) },
        { type: 'separator' },
        { label: 'Export Settings', click: () => { void exportSettingsToFile(); } },
        { label: 'Open App Folder', click: () => openFolder(app.getAppPath()) },
        { type: 'separator' },
        process.platform === 'darwin' ? { role: 'close' } : { role: 'quit', label: 'Exit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        rendererMenuItem('Copy Last AI Reply', 'copy-last-reply', 'CmdOrCtrl+Shift+C'),
        rendererMenuItem('Show Composer Actions', 'show-actions', 'CmdOrCtrl+Shift+A'),
      ],
    },
    {
      label: 'View',
      submenu: [
        rendererMenuItem('Toggle Hamburger Drawer', 'toggle-sidebar', 'CmdOrCtrl+B'),
        rendererMenuItem('Toggle Live Preview', 'toggle-preview', 'CmdOrCtrl+Shift+P'),
        rendererMenuItem('Toggle Terminal', 'toggle-terminal', 'CmdOrCtrl+`'),
        rendererMenuItem('Toggle Light/Dark Theme', 'toggle-theme', 'CmdOrCtrl+Shift+T'),
        rendererMenuItem('Select AI Model', 'select-model', 'CmdOrCtrl+Shift+M'),
        { type: 'separator' },
        { role: 'reload', label: 'Reload App' },
        { role: 'forceReload', label: 'Force Reload' },
        { role: 'toggleDevTools', label: 'Developer Tools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        {
          label: 'Maximize / Restore',
          accelerator: 'F11',
          click: () => {
            const win = getActiveMainWindow();
            if (!win) return;
            if (win.isMaximized()) win.unmaximize();
            else win.maximize();
          },
        },
        {
          label: 'Reset Window Size',
          click: () => {
            const win = getActiveMainWindow();
            if (!win) return;
            win.setSize(1400, 900);
            win.center();
          },
        },
        {
          label: 'Always on Top',
          type: 'checkbox',
          click: (item) => {
            const win = getActiveMainWindow();
            if (win) win.setAlwaysOnTop(item.checked);
          },
        },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Hormachuelos',
          click: () => showInfoBox('About Hormachuelos', 'Hormachuelos AI Coding Platform\nBuilt for Cyrhiel Moralla.'),
        },
        { label: 'System Info', click: showSystemInfo },
        { label: 'Backend Proxy Status', click: () => { void showProxyStatus(); } },
        { type: 'separator' },
        { label: 'Open Executable Folder', click: () => openFolder(path.dirname(process.execPath)) },
        { label: 'Open GitHub Repository', click: () => { void shell.openExternal('https://github.com/chmoralla-code/opus8-platform'); } },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createPreviewServer() {
  return http.createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url || '/', 'http://127.0.0.1');
      const rawPath = decodeURIComponent(requestUrl.pathname || '/');
      const relativePath = rawPath === '/' ? previewEntry : rawPath.replace(/^\/+/, '');
      const root = path.resolve(previewRoot || currentWorkingDir);
      let targetPath = path.resolve(root, relativePath);

      if (targetPath !== root && !targetPath.startsWith(root + path.sep)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Forbidden');
        return;
      }

      let stat = await fsPromises.stat(targetPath);
      if (stat.isDirectory()) {
        targetPath = path.join(targetPath, 'index.html');
        stat = await fsPromises.stat(targetPath);
      }

      res.writeHead(200, {
        'Content-Type': getMimeType(targetPath),
        'Cache-Control': 'no-store',
      });
      fs.createReadStream(targetPath).pipe(res);
    } catch (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`Preview file not found: ${err.message}`);
    }
  });
}

async function ensurePreviewServer() {
  if (previewServer && previewServer.listening) return previewPort;

  previewServer = createPreviewServer();
  const listenOn = (port) => new Promise((resolve, reject) => {
    const onError = (err) => {
      previewServer.removeListener('listening', onListening);
      reject(err);
    };
    const onListening = () => {
      previewServer.removeListener('error', onError);
      resolve(previewServer.address().port);
    };
    previewServer.once('error', onError);
    previewServer.once('listening', onListening);
    previewServer.listen(port, '127.0.0.1');
  });

  try {
    previewPort = await listenOn(3000);
  } catch (err) {
    if (err.code !== 'EADDRINUSE') throw err;
    previewServer = createPreviewServer();
    previewPort = await listenOn(0);
  }

  return previewPort;
}

async function previewLocalPath(targetPath, options = {}) {
  const localPath = toLocalPath(targetPath);
  const stat = await fsPromises.stat(localPath);
  let entryPath = localPath;

  if (stat.isDirectory()) {
    const indexPath = path.join(localPath, 'index.html');
    await fsPromises.access(indexPath);
    previewRoot = localPath;
    previewEntry = 'index.html';
    entryPath = indexPath;
  } else {
    if (!isPreviewableFile(localPath)) return { success: false, previewable: false, path: localPath };
    previewRoot = path.dirname(localPath);
    previewEntry = path.basename(localPath);
  }

  const port = await ensurePreviewServer();
  const urlPath = previewEntry.split(path.sep).map(encodeURIComponent).join('/');
  currentPreviewUrl = `http://127.0.0.1:${port}/${urlPath}`;
  const payload = { success: true, previewable: true, url: currentPreviewUrl, path: entryPath, port };
  if (options.notify !== false) notifyPreviewUpdate(payload);
  return payload;
}

async function refreshPreviewAfterWrite(filePath) {
  try {
    // Auto-preview HTML files even if no preview is active yet
    if (isPreviewableFile(filePath)) {
      const preview = await previewLocalPath(filePath, { notify: true });
      if (preview.success) return;
    }
  } catch {
    // Non-previewable or error — fall through
  }

  try {
    const localPath = path.resolve(filePath);
    const root = previewRoot ? path.resolve(previewRoot) : '';
    if (root && currentPreviewUrl && (localPath === root || localPath.startsWith(root + path.sep))) {
      notifyPreviewUpdate({ success: true, previewable: true, url: currentPreviewUrl, path: localPath, port: previewPort, reload: true });
    }
  } catch {
    // Ignore preview refresh failures
  }
}

function isBinaryBuffer(buffer) {
  const sample = buffer.slice(0, 8192);
  for (let i = 0; i < sample.length; i++) {
    if (sample[i] === 0) return true;
  }
  return false;
}

// ---- Env Overrides ----
function buildEnvOverrides(apiKey, billingMode) {
  return {
    ANTHROPIC_BASE_URL: 'https://yourcentraldomain.com',
    ANTHROPIC_AUTH_TOKEN: apiKey,
    OPUS8_API_KEY: apiKey,
    OPUS8_BILLING_MODE: billingMode || 'platform',
  };
}

// ---- Create Window ----
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    center: true,
    title: 'Hormachuelos - Agentic AI',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false,
    },
    icon: path.join(__dirname, 'icon.ico'),
  });
  installApplicationMenu();

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer Console] ${message} (line ${line} in ${sourceId})`);
  });

  mainWindow.webContents.on('crashed', () => {
    console.error('[Hormachuelos] Renderer process crashed');
    dialog.showErrorBox('Hormachuelos Error', 'The application has crashed. Please restart the app.');
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('[Hormachuelos] Renderer process gone:', details.reason);
  });

  mainWindow.webContents.on('did-fail-load', (event, code, desc, url) => {
    console.error('[Hormachuelos] Failed to load:', code, desc, url);
  });

  // Handle permission requests - auto-grant audio access for voice commands
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'audioCapture' || permission === 'media') {
      callback(true);
    } else {
      callback(false);
    }
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission, origin) => {
    return permission === 'audioCapture' || permission === 'media';
  });

  // Load the built React app (check multiple locations)
  const candidatePaths = [
    path.join(__dirname, 'dist'),              // resources/app/dist
    path.join(__dirname, '..', 'dist'),         // resources/dist
    path.join(__dirname, '..', 'app', 'dist'),  // resources/app/dist (alt)
  ];
  let distPath = candidatePaths.find(p => {
    try { return require('fs').existsSync(p); } catch { return false; }
  });
  if (!distPath) {
    dialog.showErrorBox('Hormachuelos Error', 'Could not find the application files. Please reinstall.');
    app.quit();
    return;
  }
  mainWindow.loadFile(path.join(distPath, 'index.html'));

  // Auto-start ruflo daemon silently
  try {
    rufloDaemon = spawn('cmd.exe', ['/d', '/s', '/c', 'npx ruflo@latest mcp start'], {
      env: { ...process.env },
      windowsHide: true,
      windowsVerbatimArguments: true,
    });
    rufloDaemon.unref();
  } catch (_) {}

  mainWindow.on('closed', () => {
    mainWindow = null;
    stopRufloDaemonInternal();
    // Clean up running processes
    for (const [pid, proc] of runningProcesses) {
      try { proc.kill('SIGTERM'); } catch {}
    }
    runningProcesses.clear();
    // Clean up preview server
    if (previewServer) {
      previewServer.close(() => {});
      previewServer = null;
      previewPort = 0;
    }
  });
}

// ---- Ruflo Daemon ----
function stopRufloDaemonInternal() {
  if (rufloDaemon) {
    rufloDaemon.kill('SIGTERM');
    rufloDaemon = null;
  }
}

// ============================================================
// IPC Handlers (mirror Tauri commands.rs)
// ============================================================

ipcMain.handle('execute_claude_cli', async (_event, request) => {
  const { command, args, api_key, billing_mode } = request;
  const envVars = buildEnvOverrides(api_key, billing_mode);

  return new Promise((resolve) => {
    // Wrap in cmd.exe with windowsHide to prevent the popup console
    // that Windows creates when a GUI process spawns a console app.
    const quotedCmd = `"${command}"`;
    const quotedArgs = (args || []).map((a) => `"${String(a).replace(/"/g, '\\"')}"`).join(' ');
    const fullCmd = `${quotedCmd}${quotedArgs ? ' ' + quotedArgs : ''}`;
    const proc = spawn('cmd.exe', ['/d', '/s', '/c', fullCmd], {
      env: { ...process.env, ...envVars, TERM: 'dumb' },
      windowsHide: true,
      windowsVerbatimArguments: true,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      resolve({
        success: code === 0,
        stdout,
        stderr,
        exit_code: code,
      });
    });

    proc.on('error', (err) => {
      resolve({
        success: false,
        stdout,
        stderr: err.message,
        exit_code: -1,
      });
    });
  });
});

ipcMain.handle('execute_ruflo_command', async (_event, request) => {
  const { args, api_key, billing_mode } = request;
  const envVars = buildEnvOverrides(api_key, billing_mode);
  const allArgs = ['ruflo@latest', ...(args || [])];
  const quoted = allArgs.map((a) => `"${String(a).replace(/"/g, '\\"')}"`).join(' ');

  return new Promise((resolve) => {
    const proc = spawn('cmd.exe', ['/d', '/s', '/c', `npx ${quoted}`], {
      env: { ...process.env, ...envVars, TERM: 'dumb' },
      windowsHide: true,
      windowsVerbatimArguments: true,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      resolve({ success: code === 0, stdout, stderr, exit_code: code });
    });

    proc.on('error', (err) => {
      resolve({ success: false, stdout, stderr: err.message, exit_code: -1 });
    });
  });
});

ipcMain.handle('start_ruflo_daemon', async (_event, apiKey, billingMode) => {
  const envVars = buildEnvOverrides(apiKey, billingMode);

  return new Promise((resolve) => {
    if (rufloDaemon) {
      resolve('Daemon already running');
      return;
    }

    rufloDaemon = spawn('cmd.exe', ['/d', '/s', '/c', 'npx ruflo@latest daemon start'], {
      env: { ...process.env, ...envVars, TERM: 'dumb' },
      windowsHide: true,
      windowsVerbatimArguments: true,
    });

    rufloDaemon.on('error', (err) => {
      rufloDaemon = null;
      resolve(`Error: ${err.message}`);
    });

    resolve('Daemon started');
  });
});

ipcMain.handle('stop_ruflo_daemon', async () => {
  stopRufloDaemonInternal();
  return 'Daemon stopped';
});

ipcMain.handle('check_balance', async (_event, apiKey, centralDomain) => {
  try {
    const url = `${centralDomain}/api/billing/balance`;
    const resp = await fetch(url, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    if (!resp.ok) {
      return { wallet_balance: 0, last_deposit_amount: 0, percentage: 0 };
    }
    const data = await resp.json();
    return {
      wallet_balance: data.wallet_balance || 0,
      last_deposit_amount: data.last_deposit_amount || 0,
      percentage: data.percentage || 0,
    };
  } catch (e) {
    return { wallet_balance: 0, last_deposit_amount: 0, percentage: 0 };
  }
});

ipcMain.handle('generate_api_key', async (_event, userId, centralDomain) => {
  try {
    const url = `${centralDomain}/api/api-keys/generate`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, label: 'Hormachuelos Desktop App' }),
    });
    if (!resp.ok) throw new Error('Failed');
    const data = await resp.json();
    return {
      api_key: data.api_key || '',
      key_prefix: data.key_prefix || '',
    };
  } catch (e) {
    throw new Error(`Key generation failed: ${e.message}`);
  }
});

ipcMain.handle('export_chat_log', async (_event, messagesJson, filePath) => {
  try {
    const messages = JSON.parse(messagesJson);
    let md = '# Hormachuelos Chat Log\n';
    md += `**Exported:** ${new Date().toISOString()}\n`;
    md += '**Model:** Claude Opus 8\n\n---\n\n';

    for (const msg of messages) {
      const role = (msg.role || 'unknown').toUpperCase();
      md += `## ${role}\n\n${msg.content || ''}\n\n`;

      if (msg.thinking && msg.thinking.length > 0) {
        md += '<details>\n<summary>Thinking Process</summary>\n\n';
        for (const block of msg.thinking) {
          md += `- ${block.content || ''}\n`;
        }
        md += '\n</details>\n\n';
      }
    }

    fs.writeFileSync(filePath, md, 'utf-8');
    return `Chat log exported to ${filePath}`;
  } catch (e) {
    throw new Error(`Export failed: ${e.message}`);
  }
});

ipcMain.handle('vision_route_image', async (_event, request) => {
  try {
    const { image_base64, user_prompt } = request;
    const resp = await fetch('https://pollinations.ai/api/vision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: image_base64,
        prompt: user_prompt,
        model: 'vision-free',
      }),
    });

    if (!resp.ok) throw new Error(`Status: ${resp.status}`);
    const data = await resp.json();
    const imageAnalysis = data.analysis || 'Image analysis unavailable';
    const combinedPrompt = `[System: Image uploaded. Vision analysis: ${imageAnalysis}] ${user_prompt}`;

    return { success: true, image_analysis: imageAnalysis, combined_prompt: combinedPrompt };
  } catch (e) {
    return { success: false, image_analysis: '', combined_prompt: user_prompt };
  }
});

ipcMain.handle('dialog_open', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
  });
  return result.filePaths;
});

// ============================================================
// IPC Handlers — File System
// ============================================================

ipcMain.handle('fs_read_file', async (_event, filePath) => {
  try {
    const resolved = await resolveExistingPathOrSearch(filePath);
    const resolvedPath = resolved.path;
    const buffer = await fsPromises.readFile(resolvedPath);
    if (isBinaryBuffer(buffer)) {
      return { success: true, content: buffer.toString('base64'), encoding: 'base64', path: resolvedPath, foundBySearch: resolved.foundBySearch };
    }
    return { success: true, content: buffer.toString('utf-8'), encoding: 'utf-8', path: resolvedPath, foundBySearch: resolved.foundBySearch };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs_write_file', async (_event, filePath, content) => {
  try {
    const resolvedPath = toLocalPath(filePath);
    const dir = path.dirname(resolvedPath);
    await fsPromises.mkdir(dir, { recursive: true });
    await fsPromises.writeFile(resolvedPath, content);
    await refreshPreviewAfterWrite(resolvedPath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('append_file', async (_event, args = {}) => {
  try {
    const resolvedPath = toLocalPath(args.path);
    await fsPromises.mkdir(path.dirname(resolvedPath), { recursive: true });
    await fsPromises.appendFile(resolvedPath, args.content || '', 'utf-8');
    await refreshPreviewAfterWrite(resolvedPath);
    return { success: true, path: resolvedPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('edit_file', async (_event, args = {}) => {
  try {
    const resolved = await resolveExistingPathOrSearch(args.path);
    const resolvedPath = resolved.path;
    const oldString = args.oldString || args.old_string || '';
    const newString = args.newString || args.new_string || '';
    if (!oldString) return { success: false, error: 'oldString is required' };
    const current = await fsPromises.readFile(resolvedPath, 'utf-8');
    if (!current.includes(oldString)) return { success: false, error: 'oldString not found' };
    await fsPromises.writeFile(resolvedPath, current.split(oldString).join(newString), 'utf-8');
    await refreshPreviewAfterWrite(resolvedPath);
    return { success: true, path: resolvedPath, foundBySearch: resolved.foundBySearch };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('read_json', async (_event, args = {}) => {
  try {
    const resolved = await resolveExistingPathOrSearch(args.path);
    const content = await fsPromises.readFile(resolved.path, 'utf-8');
    return { success: true, value: JSON.parse(content), path: resolved.path, foundBySearch: resolved.foundBySearch };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs_list_dir', async (_event, dirPath) => {
  try {
    const resolvedDir = toLocalPath(dirPath);
    const names = await fsPromises.readdir(resolvedDir);
    const entries = [];
    for (const name of names) {
      try {
        const fullPath = path.join(resolvedDir, name);
        const stat = await fsPromises.stat(fullPath);
        entries.push({
          name,
          isDirectory: stat.isDirectory(),
          size: stat.size,
          modified: stat.mtime.toISOString(),
        });
      } catch {
        entries.push({ name, isDirectory: false, size: 0, modified: null });
      }
    }
    entries.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
    return { success: true, entries };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs_mkdir', async (_event, dirPath) => {
  try {
    const resolvedPath = toLocalPath(dirPath);
    await fsPromises.mkdir(resolvedPath, { recursive: true });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs_delete', async (_event, filePath) => {
  try {
    const resolvedPath = toLocalPath(filePath);
    const stat = await fsPromises.stat(resolvedPath);
    if (stat.isDirectory()) {
      await fsPromises.rm(resolvedPath, { recursive: true, force: true });
    } else {
      await fsPromises.unlink(resolvedPath);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs_exists', async (_event, filePath) => {
  try {
    const resolved = await resolveExistingPathOrSearch(filePath);
    await fsPromises.access(resolved.path);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('fs_stat', async (_event, filePath) => {
  try {
    const resolved = await resolveExistingPathOrSearch(filePath);
    const resolvedPath = resolved.path;
    const stat = await fsPromises.stat(resolvedPath);
    return {
      success: true,
      path: resolvedPath,
      foundBySearch: resolved.foundBySearch,
      stat: {
        size: stat.size,
        isDirectory: stat.isDirectory(),
        isFile: stat.isFile(),
        modified: stat.mtime.toISOString(),
        created: stat.birthtime.toISOString(),
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs_rename', async (_event, oldPath, newPath) => {
  try {
    const resolvedOld = toLocalPath(oldPath);
    const resolvedNew = toLocalPath(newPath);
    const targetDir = path.dirname(resolvedNew);
    await fsPromises.mkdir(targetDir, { recursive: true });
    await fsPromises.rename(resolvedOld, resolvedNew);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ============================================================
// IPC Handlers — Terminal Execution
// ============================================================

ipcMain.handle('terminal_execute', async (_event, command, cwd) => {
  const effectiveCwd = cwd ? toLocalPath(cwd) : currentWorkingDir;
  return new Promise((resolve) => {
    // Use cmd.exe directly with windowsHide to suppress the popup console
    // that Windows otherwise creates when a GUI process spawns cmd.exe.
    const proc = spawn('cmd.exe', ['/d', '/s', '/c', command], {
      cwd: effectiveCwd,
      env: { ...process.env, TERM: 'dumb' },
      windowsHide: true,
      windowsVerbatimArguments: true,
    });
    const pid = proc.pid;
    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      try { proc.kill('SIGTERM'); } catch {}
      resolve({ success: false, stdout, stderr: stderr + '\n[Process timed out after 115 seconds]', exitCode: -1 });
    }, 115000);
    proc.stdout.on('data', (data) => {
      const content = data.toString();
      stdout += content;
      if (mainWindow && !mainWindow.isDestroyed()) {
        safeSend('terminal-output', { pid, type: 'stdout', content });
      }
    });
    proc.stderr.on('data', (data) => {
      const content = data.toString();
      stderr += content;
      if (mainWindow && !mainWindow.isDestroyed()) {
        safeSend('terminal-output', { pid, type: 'stderr', content });
      }
    });
    proc.on('close', (code) => {
      clearTimeout(timeout);
      if (mainWindow && !mainWindow.isDestroyed()) {
        safeSend('terminal-exit', { pid, exitCode: code });
      }
      resolve({ success: code === 0, stdout, stderr, exitCode: code });
    });
    proc.on('error', (err) => {
      clearTimeout(timeout);
      resolve({ success: false, stdout, stderr: err.message, exitCode: -1 });
    });
  });
});

ipcMain.handle('terminal_execute_stream', async (_event, command, cwd) => {
  const effectiveCwd = cwd ? toLocalPath(cwd) : currentWorkingDir;
  try {
    const proc = spawn('cmd.exe', ['/d', '/s', '/c', command], {
      cwd: effectiveCwd,
      env: { ...process.env, TERM: 'dumb' },
      windowsHide: true,
      windowsVerbatimArguments: true,
    });
    const pid = proc.pid;
    runningProcesses.set(pid, proc);
    proc.stdout.on('data', (data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        safeSend('terminal-output', { pid, type: 'stdout', content: data.toString() });
      }
    });
    proc.stderr.on('data', (data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        safeSend('terminal-output', { pid, type: 'stderr', content: data.toString() });
      }
    });
    proc.on('close', (code) => {
      runningProcesses.delete(pid);
      if (mainWindow && !mainWindow.isDestroyed()) {
        safeSend('terminal-exit', { pid, exitCode: code });
      }
    });
    proc.on('error', (err) => {
      runningProcesses.delete(pid);
      if (mainWindow && !mainWindow.isDestroyed()) {
        safeSend('terminal-output', { pid, type: 'stderr', content: `Process error: ${err.message}` });
        safeSend('terminal-exit', { pid, exitCode: -1 });
      }
    });
    return { pid };
  } catch (err) {
    return { pid: null, error: err.message };
  }
});

ipcMain.handle('terminal_kill', async (_event, pid) => {
  try {
    const proc = runningProcesses.get(pid);
    if (!proc) {
      try { process.kill(pid, 'SIGTERM'); return { success: true }; } catch {
        return { success: false, error: `No process found with PID ${pid}` };
      }
    }
    proc.kill('SIGTERM');
    runningProcesses.delete(pid);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ============================================================
// IPC Handlers — Network
// ============================================================

ipcMain.handle('fetch_url', async (_event, url, options = {}) => {
  try {
    const fetchOptions = { method: options.method || 'GET', headers: options.headers || {} };
    if (options.body) fetchOptions.body = options.body;
    const resp = await fetch(url, fetchOptions);
    const body = await resp.text();
    const headers = {};
    resp.headers.forEach((value, key) => { headers[key] = value; });
    return { success: resp.ok, status: resp.status, body, headers };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ============================================================
// IPC Handlers — Working Directory
// ============================================================

ipcMain.handle('get_cwd', async () => currentWorkingDir);

ipcMain.handle('set_cwd', async (_event, dirPath) => {
  try {
    const stat = await fsPromises.stat(dirPath);
    if (!stat.isDirectory()) return { success: false, error: `${dirPath} is not a directory` };
    currentWorkingDir = dirPath;
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ============================================================
// IPC Handlers — File Search
// ============================================================

const SEARCH_SKIP_DIRS = new Set(['node_modules', '.git', '.svn', '.hg', '__pycache__', '.next', '.nuxt', 'dist', 'build', '.cache', 'coverage', '.idea', '.vscode', 'vendor', 'bower_components']);
const BINARY_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg', '.mp3', '.mp4', '.avi', '.mov', '.wav', '.flac', '.zip', '.tar', '.gz', '.rar', '.7z', '.exe', '.dll', '.so', '.dylib', '.bin', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.woff', '.woff2', '.ttf', '.eot', '.otf', '.pyc', '.class', '.o', '.obj']);
const SYSTEM_SKIP_DIRS = new Set(['windows', 'program files', 'program files (x86)', 'programdata', '$recycle.bin', 'system volume information', 'appdata']);

function globPatternToRegex(pattern) {
  const source = String(pattern || '*').replace(/\\/g, '/');
  let out = '';
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    const next = source[i + 1];
    if (ch === '*' && next === '*') {
      out += '.*';
      i++;
    } else if (ch === '*') {
      out += '[^/\\\\]*';
    } else if (ch === '?') {
      out += '[^/\\\\]';
    } else if ('+.^$()|[]{}'.includes(ch)) {
      out += '\\' + ch;
    } else {
      out += ch;
    }
  }
  return new RegExp('^' + out + '$', 'i');
}

function uniqueExistingDirs(dirs) {
  const seen = new Set();
  const results = [];
  for (const dir of dirs) {
    if (!dir) continue;
    try {
      const resolved = path.resolve(toLocalPath(String(dir)));
      const key = resolved.toLowerCase();
      if (seen.has(key)) continue;
      const stat = fs.existsSync(resolved) ? fs.statSync(resolved) : null;
      if (!stat || !stat.isDirectory()) continue;
      seen.add(key);
      results.push(resolved);
    } catch {}
  }
  return results;
}

function defaultSearchRoots(searchPath, options = {}) {
  const requested = searchPath ? [searchPath] : [];
  const home = os.homedir();
  const roots = [
    ...requested,
    currentWorkingDir,
    home,
    path.join(home, 'Desktop'),
    path.join(home, 'Documents'),
    path.join(home, 'Downloads'),
    path.join(home, 'Pictures'),
  ];
  if (options.searchEverywhere || options.wholeComputer || options.allDrives) {
    const driveRoot = path.parse(home).root || 'C:\\';
    roots.push(driveRoot);
  }
  return uniqueExistingDirs(roots);
}

function looksLikeFileName(value) {
  const text = String(value || '').trim();
  if (!text || text.length > 260) return false;
  return /[.][A-Za-z0-9]{1,12}$/.test(path.basename(text)) || /^[\w .()[\]-]+$/.test(text);
}

async function findFilesByName(query, searchPath, options = {}) {
  const raw = String(query || '').trim().replace(/^["']|["']$/g, '');
  if (!raw) return [];
  const targetName = path.basename(raw).toLowerCase();
  const contains = targetName.replace(/\*/g, '').toLowerCase();
  const roots = defaultSearchRoots(searchPath, options);
  const maxResults = Math.max(1, Math.min(Number(options.maxResults || options.limit || 100), 500));
  const maxDirs = Math.max(200, Math.min(Number(options.maxDirs || 12000), 60000));
  const exact = [];
  const fuzzy = [];
  const matchedPaths = new Set();
  let visitedDirs = 0;

  async function pushMatch(fullPath, root, name, isExact) {
    if (exact.length + fuzzy.length >= maxResults) return;
    const key = String(fullPath).toLowerCase();
    if (matchedPaths.has(key)) return;
    matchedPaths.add(key);
    try {
      const stat = await fsPromises.stat(fullPath);
      if (!stat.isFile()) return;
      const item = {
        path: fullPath,
        file: fullPath,
        name,
        root,
        relativePath: path.relative(root, fullPath),
        size: stat.size,
        modified: stat.mtime.toISOString(),
      };
      if (isExact) exact.push(item);
      else fuzzy.push(item);
    } catch {}
  }

  async function walk(dir, root) {
    if (exact.length + fuzzy.length >= maxResults || visitedDirs >= maxDirs) return;
    visitedDirs++;
    let entries;
    try { entries = await fsPromises.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (exact.length + fuzzy.length >= maxResults || visitedDirs >= maxDirs) return;
      const nameLower = entry.name.toLowerCase();
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SEARCH_SKIP_DIRS.has(entry.name) || SYSTEM_SKIP_DIRS.has(nameLower)) continue;
        await walk(fullPath, root);
        continue;
      }
      if (!entry.isFile()) continue;
      const isExact = nameLower === targetName;
      const isFuzzy = !isExact && contains && nameLower.includes(contains);
      if (!isExact && !isFuzzy) continue;
      await pushMatch(fullPath, root, entry.name, isExact);
    }
  }

  for (const root of roots) {
    const direct = path.join(root, raw);
    const name = path.basename(direct);
    if (name.toLowerCase() === targetName) await pushMatch(direct, root, name, true);
    if (exact.length >= maxResults) break;
  }

  for (const root of roots) {
    await walk(root, root);
    if (exact.length >= maxResults) break;
  }
  return exact.concat(fuzzy).slice(0, maxResults);
}

async function resolveExistingPathOrSearch(filePath, options = {}) {
  const resolved = toLocalPath(filePath);
  try {
    await fsPromises.access(resolved);
    return { path: resolved, foundBySearch: false };
  } catch {}
  if (!looksLikeFileName(filePath) || /[\\/]/.test(String(filePath || ''))) {
    return { path: resolved, foundBySearch: false };
  }
  const matches = await findFilesByName(filePath, options.searchPath || currentWorkingDir, { maxResults: 1, maxDirs: options.maxDirs || 8000 });
  if (matches.length > 0) return { path: matches[0].path, foundBySearch: true, matches };
  return { path: resolved, foundBySearch: false };
}

ipcMain.handle('search_files', async (_event, query, searchPath, options = {}) => {
  const MAX_MATCHES = 100;
  const caseSensitive = options.caseSensitive || false;
  const isRegex = options.regex || false;
  const includePattern = options.includePattern || null;
  const matches = [];
  const roots = defaultSearchRoots(searchPath, options);
  if (!options.contentOnly && looksLikeFileName(query)) {
    const nameMatches = await findFilesByName(query, searchPath, { ...options, maxResults: MAX_MATCHES });
    for (const item of nameMatches) {
      matches.push({
        file: item.path,
        path: item.path,
        line: 0,
        content: `Filename match: ${item.relativePath || item.name}`,
        kind: 'filename',
        size: item.size,
        modified: item.modified,
      });
    }
    if (options.nameOnly || matches.length >= MAX_MATCHES) {
      return { success: true, matches: matches.slice(0, MAX_MATCHES), roots, total: matches.length };
    }
  }
  let pattern;
  try {
    if (isRegex) {
      pattern = new RegExp(query, caseSensitive ? 'g' : 'gi');
    } else {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      pattern = new RegExp(escaped, caseSensitive ? 'g' : 'gi');
    }
  } catch (err) {
    return { success: false, error: `Invalid search pattern: ${err.message}` };
  }
  let includeFilter = null;
  if (includePattern) {
    try {
      const globToRegex = includePattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\{([^}]+)\}/g, (_m, p) => `(${p.replace(/,/g, '|')})`);
      includeFilter = new RegExp(`^${globToRegex}$`, 'i');
    } catch { includeFilter = null; }
  }
  async function walkDir(dir) {
    if (matches.length >= MAX_MATCHES) return;
    let entries;
    try { entries = await fsPromises.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (matches.length >= MAX_MATCHES) return;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SEARCH_SKIP_DIRS.has(entry.name)) continue;
        await walkDir(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (BINARY_EXTENSIONS.has(ext)) continue;
        if (includeFilter && !includeFilter.test(entry.name)) continue;
        try {
          const stat = await fsPromises.stat(fullPath);
          if (stat.size > 2 * 1024 * 1024) continue;
          const content = await fsPromises.readFile(fullPath, 'utf-8');
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (matches.length >= MAX_MATCHES) return;
            pattern.lastIndex = 0;
            if (pattern.test(lines[i])) {
              matches.push({ file: fullPath, line: i + 1, content: lines[i].trimEnd() });
            }
          }
        } catch {}
      }
    }
  }
  try {
    for (const root of roots) {
      await walkDir(root);
      if (matches.length >= MAX_MATCHES) break;
    }
    return { success: true, matches: matches.slice(0, MAX_MATCHES), roots, total: matches.length };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('glob_search', async (_event, pattern, basePath) => {
  try {
    const roots = defaultSearchRoots(basePath, {});
    const regex = globPatternToRegex(pattern);
    const results = [];
    const MAX = 500;
    const SKIP = new Set(['node_modules', '.git', '.svn', '__pycache__', 'dist', 'build', '.cache', '.next']);
    if (looksLikeFileName(pattern) && !String(pattern).includes('*') && !String(pattern).includes('?')) {
      const found = await findFilesByName(pattern, basePath, { maxResults: MAX });
      return { success: true, matches: found.map((item) => ({ path: item.path, relativePath: item.relativePath, size: item.size, modified: item.modified })), total: found.length, roots };
    }
    async function walk(dir, root) {
      if (results.length >= MAX) return;
      let entries;
      try { entries = await fsPromises.readdir(dir, { withFileTypes: true }); } catch { return; }
      for (const e of entries) {
        if (results.length >= MAX) return;
        const full = path.join(dir, e.name);
        const rel = path.relative(root, full);
        if (e.isDirectory()) {
          if (SKIP.has(e.name)) continue;
          await walk(full, root);
        } else if (regex.test(rel) || regex.test(e.name)) {
          try {
            const stat = await fsPromises.stat(full);
            results.push({ path: full, relativePath: rel, size: stat.size, modified: stat.mtime.toISOString() });
          } catch { results.push({ path: full, relativePath: rel, size: 0, modified: null }); }
        }
      }
    }
    for (const root of roots) {
      await walk(root, root);
      if (results.length >= MAX) break;
    }
    return { success: true, matches: results.slice(0, MAX), total: results.length, roots };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('grep_search', async (_event, options = {}) => {
  const { pattern, basePath, include, maxResults = 100, contextLines = 0 } = options;
  const roots = defaultSearchRoots(basePath, options);
  const SKIP = new Set(['node_modules', '.git', '.svn', '__pycache__', 'dist', 'build', '.cache', '.next', '.idea', '.vscode']);
  const BIN_EXT = new Set(['.png','.jpg','.jpeg','.gif','.bmp','.ico','.svg','.mp3','.mp4','.avi','.mov','.wav','.flac','.zip','.tar','.gz','.rar','.7z','.exe','.dll','.so','.dylib','.bin','.pdf','.doc','.docx','.xls','.xlsx','.woff','.woff2','.ttf','.eot','.otf','.pyc','.class','.o','.obj']);
  const results = [];
  let regex;
  try { regex = new RegExp(pattern, options.caseInsensitive !== false ? 'gi' : 'g'); } catch (err) { return { success: false, error: `Invalid regex: ${err.message}` }; }
  let incRe = null;
  if (include) {
    try { incRe = new RegExp('^' + include.replace(/\./g, '\\.').replace(/\*/g, '[^/\\\\]*').replace(/\{([^}]+)\}/g, (_, p) => '('+p.replace(/,/g, '|')+')') + '$', 'i'); } catch {}
  }
  if (!options.contentOnly && looksLikeFileName(pattern)) {
    const found = await findFilesByName(pattern, basePath, { maxResults });
    for (const item of found) {
      results.push({ file: item.path, path: item.path, line: 0, content: `Filename match: ${item.relativePath || item.name}`, kind: 'filename' });
      if (results.length >= maxResults) break;
    }
    if (options.nameOnly || results.length >= maxResults) return { success: true, matches: results, total: results.length, roots };
  }
  async function walk(dir, root) {
    if (results.length >= maxResults) return;
    let entries;
    try { entries = await fsPromises.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (results.length >= maxResults) return;
      const full = path.join(dir, e.name);
      const rel = path.relative(root, full);
      if (e.isDirectory()) {
        if (SKIP.has(e.name)) continue;
        await walk(full, root);
      } else if (e.isFile()) {
        const ext = path.extname(e.name).toLowerCase();
        if (BIN_EXT.has(ext)) continue;
        if (incRe && !incRe.test(e.name)) continue;
        try {
          const stat = await fsPromises.stat(full);
          if (stat.size > 2 * 1024 * 1024) continue;
          const content = await fsPromises.readFile(full, 'utf-8');
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (results.length >= maxResults) return;
            regex.lastIndex = 0;
            if (regex.test(lines[i])) {
              const entry = { file: full, relativePath: rel, line: i + 1, content: lines[i].trimEnd() };
              if (contextLines > 0) {
                entry.context = [];
                for (let c = Math.max(0, i - contextLines); c <= Math.min(lines.length - 1, i + contextLines); c++) {
                  entry.context.push({ line: c + 1, content: lines[c], isMatch: c === i });
                }
              }
              results.push(entry);
            }
          }
        } catch {}
      }
    }
  }
  try {
    for (const root of roots) {
      await walk(root, root);
      if (results.length >= maxResults) break;
    }
    return { success: true, matches: results, total: results.length, roots };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ============================================================
// IPC Handlers — Git Operations
// ============================================================

function runGit(args, cwd) {
  return new Promise((resolve) => {
    const quoted = args.map((a) => `"${String(a).replace(/"/g, '\\"')}"`).join(' ');
    const proc = spawn('cmd.exe', ['/d', '/s', '/c', `git ${quoted}`], {
      cwd: cwd || currentWorkingDir,
      windowsHide: true,
      windowsVerbatimArguments: true,
    });
    let stdout = '', stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('close', (code) => resolve({ success: code === 0, stdout, stderr, exitCode: code }));
    proc.on('error', (err) => resolve({ success: false, stdout, stderr: err.message, exitCode: -1 }));
  });
}

ipcMain.handle('git_status', async (_event, repoPath) => {
  const cwd = repoPath || currentWorkingDir;
  return await runGit(['status', '--porcelain', '--branch'], cwd);
});

ipcMain.handle('git_diff', async (_event, options = {}) => {
  const cwd = options.repoPath || currentWorkingDir;
  const args = ['diff', '--unified=3'];
  if (options.staged) args.push('--staged');
  if (options.ref) args.push(options.ref);
  if (options.file) args.push('--', options.file);
  return await runGit(args, cwd);
});

ipcMain.handle('git_log', async (_event, options = {}) => {
  const cwd = options.repoPath || currentWorkingDir;
  const args = ['log', '--oneline', '--decorate', `-n${options.maxCount || 20}`];
  if (options.author) args.push('--author', options.author);
  if (options.since) args.push('--since', options.since);
  if (options.file) args.push('--', options.file);
  return await runGit(args, cwd);
});

// ============================================================
// IPC Handlers — Dialogs
// ============================================================

ipcMain.handle('dialog_open_folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
  return result.filePaths;
});

ipcMain.handle('dialog_open_file', async (_event, filters) => {
  const dialogOptions = { properties: ['openFile', 'multiSelections'] };
  if (filters && Array.isArray(filters)) dialogOptions.filters = filters;
  const result = await dialog.showOpenDialog(mainWindow, dialogOptions);
  return result.filePaths;
});

ipcMain.handle('dialog_save_file', async (_event, defaultName) => {
  const dialogOptions = {};
  if (defaultName) dialogOptions.defaultPath = defaultName;
  const result = await dialog.showSaveDialog(mainWindow, dialogOptions);
  return result.filePath || '';
});

// ============================================================
// IPC Handlers — System Info
// ============================================================

ipcMain.handle('get_system_info', async () => {
  return getSystemInfoPayload();
});

ipcMain.handle('system_info', async () => {
  return { success: true, ...getSystemInfoPayload() };
});

ipcMain.handle('list_processes', async (_event, args = {}) => {
  const filter = String(args.filter || '').toLowerCase();
  const result = await runBufferedProcess('powershell.exe', [
    '-NoProfile',
    '-Command',
    'Get-Process | Select-Object Id,ProcessName,Path | ConvertTo-Json -Compress',
  ]);
  if (!result.success) return result;
  try {
    const parsed = JSON.parse(result.stdout || '[]');
    const processes = (Array.isArray(parsed) ? parsed : [parsed])
      .filter((proc) => !filter || String(proc.ProcessName || '').toLowerCase().includes(filter))
      .slice(0, 200);
    return { success: true, processes };
  } catch (err) {
    return { success: false, error: err.message, raw: result.stdout };
  }
});

ipcMain.handle('kill_process', async (_event, args = {}) => {
  try {
    const pid = Number(args.pid);
    if (!Number.isInteger(pid) || pid <= 0) return { success: false, error: 'Valid pid is required' };
    process.kill(pid, 'SIGTERM');
    return { success: true, pid };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('clipboard_read', async () => {
  return { success: true, text: clipboard.readText() };
});

ipcMain.handle('clipboard_write', async (_event, args = {}) => {
  clipboard.writeText(String(args.text || ''));
  return { success: true };
});

ipcMain.handle('screenshot', async (_event, args = {}) => {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) return { success: false, error: 'No active window' };
    const outputPath = toLocalPath(args.outputPath || args.path || `screenshot-${Date.now()}.png`);
    await fsPromises.mkdir(path.dirname(outputPath), { recursive: true });
    const image = await mainWindow.webContents.capturePage();
    await fsPromises.writeFile(outputPath, image.toPNG());
    return { success: true, path: outputPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('zip_directory', async (_event, args = {}) => {
  try {
    const sourceDir = toLocalPath(args.sourceDir || args.dir);
    const outputPath = toLocalPath(args.outputPath || args.path || `${path.basename(sourceDir)}.zip`);
    await fsPromises.mkdir(path.dirname(outputPath), { recursive: true });
    return await runBufferedProcess('tar.exe', ['-a', '-c', '-f', outputPath, '-C', sourceDir, '.']);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('unzip_archive', async (_event, args = {}) => {
  try {
    const zipPath = toLocalPath(args.zipPath || args.path);
    const destDir = toLocalPath(args.destDir || args.dir || path.basename(zipPath, path.extname(zipPath)));
    await fsPromises.mkdir(destDir, { recursive: true });
    return await runBufferedProcess('tar.exe', ['-x', '-f', zipPath, '-C', destDir]);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('notify', async (_event, args = {}) => {
  try {
    if (Notification.isSupported()) {
      new Notification({ title: String(args.title || 'Hormachuelos'), body: String(args.message || '') }).show();
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get_env', async (_event, args = {}) => {
  const key = String(args.key || '');
  if (key) {
    return { success: true, key, value: isSensitiveEnvKey(key) ? '[filtered]' : (process.env[key] || '') };
  }
  const values = {};
  for (const [envKey, envValue] of Object.entries(process.env)) {
    values[envKey] = isSensitiveEnvKey(envKey) ? '[filtered]' : envValue;
  }
  return { success: true, values };
});

ipcMain.handle('set_env', async (_event, args = {}) => {
  const key = String(args.key || '').trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) return { success: false, error: 'Invalid env key' };
  process.env[key] = String(args.value || '');
  return { success: true, key };
});

ipcMain.handle('check_port', async (_event, args = {}) => {
  return await checkTcpPort(Number(args.port));
});

ipcMain.handle('find_open_port', async (_event, args = {}) => {
  const startPort = Number(args.startPort || 3000);
  for (let port = startPort; port < startPort + 200; port++) {
    const result = await checkTcpPort(port);
    if (result.available) return result;
  }
  return { success: false, error: 'No open port found' };
});

ipcMain.handle('internet_status', async (_event, args = {}) => {
  return await checkInternetStatus(Number(args.timeoutMs || 2500));
});

// ============================================================
// IPC Handlers — Preview
// ============================================================

ipcMain.handle('preview_path', async (_event, targetPath) => {
  try {
    return await previewLocalPath(targetPath, { notify: true });
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('preview_url', async (_event, url) => {
  try {
    if (!isExternalUrl(url)) {
      return await previewLocalPath(url, { notify: true });
    }
    const payload = { success: true, previewable: true, url, path: url, external: true };
    currentPreviewUrl = url;
    notifyPreviewUpdate(payload);
    return payload;
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('open_path', async (_event, targetPath) => {
  try {
    const localPath = toLocalPath(targetPath);
    try {
      const preview = await previewLocalPath(localPath, { notify: true });
      if (preview.success) return preview;
    } catch {}
    const error = await shell.openPath(localPath);
    if (error) return { success: false, error };
    return { success: true, path: localPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('open_external_url', async (_event, url) => {
  try {
    if (isExternalUrl(url)) {
      await shell.openExternal(url);
      return { success: true, url };
    }
    const localPath = toLocalPath(url);
    const error = await shell.openPath(localPath);
    if (error) return { success: false, error };
    return { success: true, path: localPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ============================================================
// IPC Handlers — Web Search
// ============================================================

ipcMain.handle('web_search', async (_event, query, maxResults = 8) => {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const html = await resp.text();
    const results = [];
    const linkRe = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    const snippetRe = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
    const links = [...html.matchAll(linkRe)];
    const snippets = [...html.matchAll(snippetRe)];
    for (let i = 0; i < Math.min(links.length, maxResults); i++) {
      results.push({
        title: links[i][2].replace(/<[^>]*>/g, '').trim(),
        url: decodeURIComponent(links[i][1].replace(/&amp;/g, '&').replace(/\/l\/\?uddg=/g, '')),
        snippet: snippets[i] ? snippets[i][1].replace(/<[^>]*>/g, '').trim() : ''
      });
    }
    return { success: true, results };
  } catch (err) {
    return { success: false, error: err.message, results: [] };
  }
});

// ============================================================
// IPC Handlers — Subagent
// ============================================================

ipcMain.handle('subagent_run', async (_event, options = {}) => {
  const { command, args = [], cwd, timeoutMs = 300000, env = {} } = options;
  const effectiveCwd = cwd || currentWorkingDir;
  return new Promise((resolve) => {
    const quotedCmd = `"${command}"`;
    const quotedArgs = args.map((a) => `"${String(a).replace(/"/g, '\\"')}"`).join(' ');
    const fullCmd = `${quotedCmd}${quotedArgs ? ' ' + quotedArgs : ''}`;
    const proc = spawn('cmd.exe', ['/d', '/s', '/c', fullCmd], {
      cwd: effectiveCwd,
      env: { ...process.env, ...env, TERM: 'dumb' },
      windowsHide: true,
      windowsVerbatimArguments: true,
    });
    const pid = proc.pid;
    runningProcesses.set(pid, proc);
    let stdout = '', stderr = '';
    const timer = setTimeout(() => {
      try { proc.kill('SIGTERM'); } catch {}
      runningProcesses.delete(pid);
      resolve({ success: false, stdout, stderr: stderr + '\n[Subagent timed out]', exitCode: -1, pid });
    }, timeoutMs);
    proc.stdout.on('data', (d) => {
      stdout += d.toString();
      if (mainWindow && !mainWindow.isDestroyed()) {
        safeSend('subagent-output', { pid, type: 'stdout', content: d.toString() });
      }
    });
    proc.stderr.on('data', (d) => {
      stderr += d.toString();
      if (mainWindow && !mainWindow.isDestroyed()) {
        safeSend('subagent-output', { pid, type: 'stderr', content: d.toString() });
      }
    });
    proc.on('close', (code) => {
      clearTimeout(timer);
      runningProcesses.delete(pid);
      if (mainWindow && !mainWindow.isDestroyed()) {
        safeSend('subagent-exit', { pid, exitCode: code });
      }
      resolve({ success: code === 0, stdout, stderr, exitCode: code, pid });
    });
    proc.on('error', (err) => {
      clearTimeout(timer);
      runningProcesses.delete(pid);
      resolve({ success: false, stdout, stderr: err.message, exitCode: -1, pid });
    });
  });
});

ipcMain.handle('subagent_kill', async (_event, pid) => {
  try {
    const proc = runningProcesses.get(pid);
    if (proc) { proc.kill('SIGTERM'); runningProcesses.delete(pid); return { success: true }; }
    try { process.kill(pid, 'SIGTERM'); return { success: true }; } catch {}
    return { success: false, error: `No subagent with PID ${pid}` };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ============================================================
// IPC Handlers — Ruflo MCP Integration
// ============================================================

ipcMain.handle('ruflo_memory_store', async (_event, options = {}) => {
  const { content, metadata = {}, tags = [] } = options;
  return new Promise((resolve) => {
    const input = JSON.stringify({ content, metadata, tags });
    const proc = spawn('npx', ['ruflo@latest', 'memory', 'store', '--json'], {
      env: { ...process.env },
      shell: true,
      windowsHide: true,
    });
    let stdout = '', stderr = '';
    proc.stdin.write(input);
    proc.stdin.end();
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('close', (code) => {
      try {
        resolve({ success: code === 0, data: code === 0 ? JSON.parse(stdout) : null, error: code !== 0 ? stderr : null });
      } catch {
        resolve({ success: code === 0, data: stdout, error: stderr || null });
      }
    });
    proc.on('error', (err) => resolve({ success: false, data: null, error: err.message }));
  });
});

ipcMain.handle('ruflo_memory_search', async (_event, options = {}) => {
  const { query, limit = 5, tags = [] } = options;
  const args = ['ruflo@latest', 'memory', 'search', query, '--limit', String(limit), '--json'];
  if (tags.length > 0) args.push('--tags', tags.join(','));
  return new Promise((resolve) => {
    const proc = spawn('npx', args, {
      env: { ...process.env },
      shell: true,
      windowsHide: true,
    });
    let stdout = '', stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('close', (code) => {
      try {
        resolve({ success: code === 0, results: code === 0 ? JSON.parse(stdout) : [], error: code !== 0 ? stderr : null });
      } catch {
        resolve({ success: code === 0, results: [], error: stderr || null, raw: stdout });
      }
    });
    proc.on('error', (err) => resolve({ success: false, results: [], error: err.message }));
  });
});

ipcMain.handle('ruflo_agent_spawn', async (_event, options = {}) => {
  const { task, model, tools = [] } = options;
  const args = ['ruflo@latest', 'agent', 'spawn', '--task', task, '--json'];
  if (model) args.push('--model', model);
  if (tools.length > 0) args.push('--tools', tools.join(','));
  return new Promise((resolve) => {
    const proc = spawn('npx', args, {
      env: { ...process.env },
      shell: true,
      windowsHide: true,
    });
    let stdout = '', stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('close', (code) => {
      try {
        resolve({ success: code === 0, agent: code === 0 ? JSON.parse(stdout) : null, error: code !== 0 ? stderr : null });
      } catch {
        resolve({ success: code === 0, agent: null, error: stderr || null, raw: stdout });
      }
    });
    proc.on('error', (err) => resolve({ success: false, agent: null, error: err.message }));
  });
});

ipcMain.handle('ruflo_agent_status', async (_event, agentId) => {
  return new Promise((resolve) => {
    const proc = spawn('npx', ['ruflo@latest', 'agent', 'status', agentId, '--json'], {
      env: { ...process.env },
      shell: true,
      windowsHide: true,
    });
    let stdout = '', stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('close', (code) => {
      try {
        resolve({ success: code === 0, status: code === 0 ? JSON.parse(stdout) : null, error: code !== 0 ? stderr : null });
      } catch {
        resolve({ success: code === 0, status: null, error: stderr || null, raw: stdout });
      }
    });
    proc.on('error', (err) => resolve({ success: false, status: null, error: err.message }));
  });
});

ipcMain.handle('ruflo_web_search', async (_event, options = {}) => {
  const { query, maxResults = 5 } = options;
  return new Promise((resolve) => {
    const proc = spawn('npx', ['ruflo@latest', 'web', 'search', query, '--limit', String(maxResults), '--json'], {
      env: { ...process.env },
      shell: true,
      windowsHide: true,
    });
    let stdout = '', stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('close', (code) => {
      try {
        resolve({ success: code === 0, results: code === 0 ? JSON.parse(stdout) : [], error: code !== 0 ? stderr : null });
      } catch {
        resolve({ success: code === 0, results: [], error: stderr || null, raw: stdout });
      }
    });
    proc.on('error', (err) => resolve({ success: false, results: [], error: err.message }));
  });
});

ipcMain.handle('ruflo_task_create', async (_event, options = {}) => {
  const { description, priority = 'medium', assignee } = options;
  const args = ['ruflo@latest', 'task', 'create', '--description', description, '--priority', priority, '--json'];
  if (assignee) args.push('--assignee', assignee);
  return new Promise((resolve) => {
    const proc = spawn('npx', args, {
      env: { ...process.env },
      shell: true,
      windowsHide: true,
    });
    let stdout = '', stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('close', (code) => {
      try {
        resolve({ success: code === 0, task: code === 0 ? JSON.parse(stdout) : null, error: code !== 0 ? stderr : null });
      } catch {
        resolve({ success: code === 0, task: null, error: stderr || null, raw: stdout });
      }
    });
    proc.on('error', (err) => resolve({ success: false, task: null, error: err.message }));
  });
});

// ============================================================
// IPC Handlers — Settings Export/Import & Upload
// ============================================================

ipcMain.handle('upload_to_google_drive', async (_event, projectPath, fbName, fbLink) => {
  try {
    return { success: false, error: 'Google Drive upload is not yet configured. Please contact support.' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('settings_export', async (_event) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: 'hormachuelos-settings.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) return { success: false };
    const settings = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };
    fs.writeFileSync(result.filePath, JSON.stringify(settings, null, 2), 'utf-8');
    return { success: true, path: result.filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('settings_import', async (_event) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    });
    if (result.canceled || !result.filePaths.length) return { success: false };
    const content = fs.readFileSync(result.filePaths[0], 'utf-8');
    const settings = JSON.parse(content);
    return { success: true, settings };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ---- Proxy Server ----
var proxyProcess = null;
var proxyStartPromise = null;
const PROXY_HEALTH_URL = 'http://127.0.0.1:8082/health';

function checkProxyHealth(timeoutMs) {
  return new Promise((resolve) => {
    var settled = false;
    function finish(value) {
      if (settled) return;
      settled = true;
      resolve(value);
    }

    var req = http.get(PROXY_HEALTH_URL, function(res) {
      res.resume();
      finish(res.statusCode === 200);
    });
    req.on('error', function() { finish(false); });
    req.setTimeout(timeoutMs, function() {
      req.destroy();
      finish(false);
    });
  });
}

function addProxyDirCandidates(basePath, candidateDirs) {
  if (!basePath || typeof basePath !== 'string') return;
  var resolved = path.resolve(basePath);
  try {
    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
      resolved = path.dirname(resolved);
    }
  } catch {}

  var current = resolved;
  for (var i = 0; i < 8 && current; i++) {
    candidateDirs.push(path.join(current, 'free-claude-code'));
    candidateDirs.push(path.join(current, 'resources', 'free-claude-code'));
    var parent = path.dirname(current);
    if (!parent || parent === current) break;
    current = parent;
  }
}

function findProxySourceDir() {
  var candidateDirs = [];
  addProxyDirCandidates(process.env.HORMACHUELOS_PROXY_DIR, candidateDirs);
  addProxyDirCandidates(process.env.FREE_CLAUDE_CODE_DIR, candidateDirs);
  addProxyDirCandidates(process.env.PORTABLE_EXECUTABLE_DIR, candidateDirs);
  addProxyDirCandidates(process.env.PORTABLE_EXECUTABLE_FILE, candidateDirs);
  addProxyDirCandidates(process.cwd(), candidateDirs);
  addProxyDirCandidates(typeof app.getAppPath === 'function' ? app.getAppPath() : '', candidateDirs);
  addProxyDirCandidates(process.resourcesPath, candidateDirs);
  addProxyDirCandidates(__dirname, candidateDirs);
  addProxyDirCandidates(process.execPath, candidateDirs);

  var seen = new Set();
  for (var d = 0; d < candidateDirs.length; d++) {
    var candidate = path.resolve(candidateDirs[d]);
    var key = candidate.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (fs.existsSync(path.join(candidate, 'server.py'))) return candidate;
  }
  return null;
}

function startProxyServer() {
  if (proxyStartPromise) return proxyStartPromise;
  proxyStartPromise = (async () => {
    if (await checkProxyHealth(1500)) return true;

    var foundDir = findProxySourceDir();
    if (!foundDir) {
      console.log('[Hormachuelos] Proxy source not found, skipping auto-start');
      return false;
    }

    var venvPython = path.join(foundDir, '.venv', 'Scripts', 'python.exe');
    var pythonExe = fs.existsSync(venvPython) ? venvPython : 'python';
    console.log('[Hormachuelos] Starting proxy from:', foundDir);

    proxyProcess = spawn(pythonExe, ['server.py'], {
      cwd: foundDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
      env: { ...process.env, FCC_ENV_FILE: path.join(foundDir, '.env') },
    });

    proxyProcess.stdout.on('data', function(d) { process.stdout.write('[proxy] ' + d); });
    proxyProcess.stderr.on('data', function(d) { process.stderr.write('[proxy] ' + d); });
    proxyProcess.on('error', function(err) {
      console.log('[Hormachuelos] Proxy failed to start:', err.message);
      proxyProcess = null;
    });
    proxyProcess.on('exit', function(code) {
      console.log('[Hormachuelos] Proxy exited:', code);
      proxyProcess = null;
    });

    for (var retry = 0; retry < 24; retry++) {
      await new Promise((resolve) => setTimeout(resolve, retry === 0 ? 1000 : 500));
      if (await checkProxyHealth(1000)) return true;
      if (proxyProcess && proxyProcess.exitCode !== null) break;
    }

    console.log('[Hormachuelos] Proxy did not start in time');
    return false;
  })();
  proxyStartPromise.finally(() => { proxyStartPromise = null; });
  return proxyStartPromise;
}

function stopProxyServer() {
  if (proxyProcess) {
    try { proxyProcess.kill('SIGTERM'); } catch {}
    proxyProcess = null;
  }
}

// ---- App Lifecycle ----
app.whenReady().then(function() {
  startProxyServer().then(function() { createWindow(); });
});

app.on('window-all-closed', () => {
  stopRufloDaemonInternal();
  stopProxyServer();
  // Clean up running processes
  for (const [pid, proc] of runningProcesses) {
    try { proc.kill('SIGTERM'); } catch {}
  }
  runningProcesses.clear();
  // Clean up preview server
  if (previewServer) {
    previewServer.close(() => {});
    previewServer = null;
    previewPort = 0;
  }
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
