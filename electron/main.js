'use strict';
// Proceso principal de Kano Cleaner: crea la ventana y atiende a la interfaz.

const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('node:path');
const fssync = require('node:fs');

const util = require('../src/core/util');
const scan = require('../src/core/scan');
const clean = require('../src/core/clean');
const startup = require('../src/core/startup');
const apps = require('../src/core/apps');
const files = require('../src/core/files');
const security = require('../src/core/security');
const health = require('../src/core/health');

const isDev = !app.isPackaged;
let mainWindow = null;
let isAdmin = false;

// Modos de desarrollo (no existen en la versión publicada).
if (process.env.KANO_SELFTEST) require('./selftest');
if (process.env.KANO_SHOTS) require('./shots');

// Una sola instancia: si ya está abierta, se trae al frente.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 800,
    minWidth: 1000,
    minHeight: 640,
    show: false,
    frame: false,
    backgroundColor: '#10151F',
    title: 'Kano Cleaner',
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  });

  Menu.setApplicationMenu(null);
  mainWindow.loadFile(path.join(__dirname, '..', 'src', 'ui', 'index.html'));

  mainWindow.once('ready-to-show', () => mainWindow.show());

  // Los enlaces externos se abren en el navegador, nunca dentro de la app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev && process.env.KANO_DEVTOOLS === '1') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

/** Avisa a la interfaz de un progreso. */
function progress(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('progress', payload);
  }
}

// ---------------- Ventana ----------------
ipcMain.handle('win:minimize', () => mainWindow?.minimize());
ipcMain.handle('win:maximize', () => {
  if (!mainWindow) return false;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
  return mainWindow.isMaximized();
});
ipcMain.handle('win:close', () => mainWindow?.close());

// ---------------- Aplicación ----------------
ipcMain.handle('app:info', async () => ({
  version: app.getVersion(),
  isAdmin,
  electron: process.versions.electron,
  node: process.versions.node,
  packaged: app.isPackaged,
}));

ipcMain.handle('app:openPath', async (_e, target) => {
  if (!target) return { ok: false };
  return { ok: !(await shell.openPath(target)) };
});

ipcMain.handle('app:showInFolder', (_e, target) => {
  if (target && fssync.existsSync(target)) shell.showItemInFolder(target);
  return { ok: true };
});

/** Reinicia la app pidiendo permisos de administrador (UAC). */
ipcMain.handle('app:relaunchAdmin', async () => {
  const exe = process.execPath;
  const args = app.isPackaged ? '' : `"${app.getAppPath()}"`;
  const command = `Start-Process -FilePath '${exe}' -Verb RunAs ${args ? `-ArgumentList '${args}'` : ''}`;
  const r = await util.ps(command);
  if (r.ok) setTimeout(() => app.quit(), 400);
  return { ok: r.ok, error: r.err };
});

// ---------------- Limpieza ----------------
ipcMain.handle('scan:junk', async () => {
  const result = await scan.scanMany(scan.junkCategories(), (p) => progress({ scope: 'junk', ...p }));
  return result;
});

ipcMain.handle('scan:privacy', async () => {
  const result = await scan.scanMany(scan.privacyCategories(), (p) => progress({ scope: 'privacy', ...p }));
  return result;
});

ipcMain.handle('clean:ids', async (_e, ids) => {
  const report = await clean.cleanIds(ids || [], (p) => progress({ scope: 'clean', ...p }));
  return report;
});

// ---------------- Chequeo general ----------------
ipcMain.handle('chequeo:run', async () => {
  progress({ scope: 'chequeo', phase: 'junk' });
  const junk = await scan.scanMany(scan.junkCategories(), (p) => progress({ scope: 'chequeo-junk', ...p }));

  progress({ scope: 'chequeo', phase: 'privacy' });
  const privacy = await scan.scanMany(scan.privacyCategories(), (p) => progress({ scope: 'chequeo-privacy', ...p }));

  progress({ scope: 'chequeo', phase: 'startup' });
  let startupList = [];
  try {
    startupList = await startup.list();
  } catch {
    startupList = [];
  }

  progress({ scope: 'chequeo', phase: 'security' });
  let sec = { findings: [], checked: {} };
  try {
    sec = await security.heuristics();
  } catch {
    /* si falla una comprobación no se cae el chequeo */
  }

  progress({ scope: 'chequeo', phase: 'health' });
  const sys = await health.info();
  const reboot = await health.pendingReboot();

  // ---- Cálculo de la nota ----
  const junkBytes = junk.reduce((s, c) => s + (c.bytes || 0), 0);
  const junkCount = junk.reduce((s, c) => s + (c.count || 0), 0);
  const privacyCount = privacy.reduce((s, c) => s + (c.count || 0), 0);
  const startupEnabled = startupList.filter((s) => s.enabled).length;
  const altas = sec.findings.filter((f) => f.severity === 'alta').length;
  const medias = sec.findings.filter((f) => f.severity === 'media').length;

  const disk = (sys.discos || [])[0] || null;
  const librePct = disk && disk.total ? (disk.libre / disk.total) * 100 : 100;

  let penalty = 0;
  penalty += Math.min(25, (junkBytes / (1024 ** 3)) * 2.5);
  penalty += Math.min(10, privacyCount / 60);
  penalty += Math.max(0, startupEnabled - 10) * 1.5;
  penalty += altas * 14 + medias * 5;
  if (librePct < 8) penalty += 18;
  else if (librePct < 15) penalty += 9;
  if (reboot) penalty += 3;

  const score = Math.max(0, Math.min(100, Math.round(100 - penalty)));
  const level = score >= 85 ? 'óptimo' : score >= 65 ? 'bueno' : score >= 40 ? 'mejorable' : 'crítico';

  // Número de "problemas" como en CCleaner: cosas concretas que se pueden arreglar.
  const problems =
    junk.filter((c) => c.bytes > 0).length +
    privacy.filter((c) => c.count > 0).length +
    Math.max(0, startupEnabled - 5) +
    sec.findings.length +
    (reboot ? 1 : 0);

  return {
    score,
    level,
    problems,
    junk: { bytes: junkBytes, count: junkCount, pretty: util.human(junkBytes), categories: junk },
    privacy: { count: privacyCount, categories: privacy },
    startup: { enabled: startupEnabled, total: startupList.length, items: startupList },
    security: sec,
    health: sys,
    reboot,
    disk: disk ? { letra: disk.letra, total: disk.total, libre: disk.libre, librePct, prettyLibre: util.human(disk.libre) } : null,
  };
});

/** Arregla lo seguro del chequeo: basura y rastros de privacidad sin riesgo. */
ipcMain.handle('chequeo:fixSafe', async () => {
  const ids = [
    ...scan.junkCategories().filter((c) => c.risk === 'safe').map((c) => c.id),
    ...scan.privacyCategories().filter((c) => c.risk === 'safe').map((c) => c.id),
  ];
  return clean.cleanIds(ids, (p) => progress({ scope: 'clean', ...p }));
});

// ---------------- Inicio ----------------
ipcMain.handle('startup:list', () => startup.list());
ipcMain.handle('startup:set', (_e, entry) => startup.setEnabled(entry));

// ---------------- Programas ----------------
ipcMain.handle('apps:list', () => apps.list());
ipcMain.handle('apps:uninstall', (_e, target) => apps.uninstall(target));
ipcMain.handle('apps:leftovers', (_e, target) => apps.leftovers(target));
ipcMain.handle('apps:recycle', (_e, paths) => files.recycle(paths || []));

// ---------------- Archivos ----------------
ipcMain.handle('files:pick', async (_e, options = {}) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: options.title || 'Elige una carpeta',
    properties: ['openDirectory'],
  });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
});

ipcMain.handle('files:duplicates', async (_e, payload) => {
  const { folder, minSize } = payload || {};
  if (!folder) return { error: 'Falta la carpeta' };
  return files.duplicates(folder, { minSize: minSize || 1024 * 1024 }, (p) => progress({ scope: 'duplicates', ...p }));
});

ipcMain.handle('files:disk', (_e, folder) => files.diskUsage(folder || 'C:\\'));

ipcMain.handle('files:big', (_e, payload) => {
  const { folder, minSize } = payload || {};
  return files.bigFiles(folder || 'C:\\', { minSize: minSize || 100 * 1024 * 1024 });
});

ipcMain.handle('files:recycle', (_e, paths) => files.recycle(paths || []));

// ---------------- Seguridad ----------------
ipcMain.handle('security:status', () => security.defenderStatus());
ipcMain.handle('security:threats', () => security.threatHistory());
ipcMain.handle('security:heuristics', () => security.heuristics());

ipcMain.handle('security:scan', async (_e, payload) => {
  const { type, target } = payload || {};
  const result = await security.scan(type || 'quick', target, (line) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('scan:line', line);
  });
  return result;
});

// ---------------- Estado del equipo ----------------
ipcMain.handle('health:info', () => health.info());
ipcMain.handle('health:processes', () => health.processes());
ipcMain.handle('health:devices', () => health.problemDevices());

// ---------------- winget ----------------
ipcMain.handle('winget:list', () => apps.upgrades());
ipcMain.handle('winget:upgrade', async (_e, id) => {
  const result = await apps.upgradeOne(id, (line) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('scan:line', line);
  });
  return result;
});

// ---------------- Arranque ----------------
app.whenReady().then(async () => {
  isAdmin = await util.isAdmin();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});

process.on('uncaughtException', (error) => {
  console.error('Error no controlado:', error);
});
