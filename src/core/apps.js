'use strict';
// Programas instalados: listar, desinstalar, buscar restos y actualizar con winget.

const { spawn, execFile } = require('node:child_process');
const fssync = require('node:fs');
const path = require('node:path');
const { psJson, ps, recycle, runStream } = require('./util');

const LIST_SCRIPT = `
$ErrorActionPreference='SilentlyContinue'
$paths = @(
  'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
  'HKLM:\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
  'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'
)
$apps = Get-ItemProperty $paths |
  Where-Object { $_.DisplayName -and $_.SystemComponent -ne 1 -and -not $_.ParentKeyName } |
  Select-Object DisplayName, DisplayVersion, Publisher, InstallLocation, UninstallString, QuietUninstallString, EstimatedSize, InstallDate, PSChildName |
  Sort-Object DisplayName
$apps | ConvertTo-Json -Compress -Depth 3
`;

/** Lista de programas instalados según el registro de Windows. */
async function list() {
  const rows = await psJson(LIST_SCRIPT, { timeout: 120000 });
  if (!rows) return [];
  const array = Array.isArray(rows) ? rows : [rows];

  return array
    .filter((r) => r && r.DisplayName)
    .map((r, i) => ({
      id: `${r.PSChildName || i}`,
      name: r.DisplayName,
      version: r.DisplayVersion || '',
      publisher: r.Publisher || '',
      location: r.InstallLocation || '',
      uninstall: r.UninstallString || '',
      quiet: r.QuietUninstallString || '',
      sizeBytes: (Number(r.EstimatedSize) || 0) * 1024,
      installDate: r.InstallDate || '',
    }))
    .sort((a, b) => b.sizeBytes - a.sizeBytes || a.name.localeCompare(b.name, 'es'));
}

/** Lanza el desinstalador del programa. Abre su propia ventana. */
function uninstall(app) {
  const command = app.quiet || app.uninstall;
  if (!command) return { ok: false, error: 'Este programa no tiene desinstalador registrado.' };

  try {
    const child = spawn('cmd.exe', ['/c', command], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    });
    child.unref();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
}

/** Palabras significativas del nombre, para buscar carpetas parecidas. */
function tokens(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúñ ]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !['microsoft', 'windows', 'update', 'setup', 'install', 'version'].includes(w));
}

/** Busca carpetas y claves que hayan quedado tras desinstalar. */
async function leftovers(app) {
  const candidates = [];
  const words = tokens(app.name);

  if (app.location && fssync.existsSync(app.location)) {
    candidates.push({ kind: 'carpeta', path: app.location, why: 'Carpeta de instalación original' });
  }

  const roots = [
    process.env.LOCALAPPDATA,
    process.env.APPDATA,
    process.env.PROGRAMDATA,
    process.env.PROGRAMFILES,
    process.env['PROGRAMFILES(X86)'],
  ].filter(Boolean);

  for (const root of roots) {
    let entries = [];
    try {
      entries = fssync.readdirSync(root);
    } catch {
      continue;
    }
    for (const name of entries) {
      const lower = name.toLowerCase();
      if (words.some((w) => lower.includes(w)) && lower.length <= 40) {
        const full = path.join(root, name);
        try {
          if (fssync.statSync(full).isDirectory()) {
            candidates.push({ kind: 'carpeta', path: full, why: `Nombre parecido en ${path.basename(root)}` });
          }
        } catch {
          /* sin acceso */
        }
      }
    }
  }

  // Claves de registro con el nombre del programa (solo se informa, no se borra).
  const regWords = words.slice(0, 2).join(' ');
  if (regWords) {
    const keys = await ps(
      `Get-ChildItem 'HKCU:\\Software','HKLM:\\Software' -ErrorAction SilentlyContinue | Where-Object { $_.PSChildName -like '*${regWords.replace(/'/g, "''")}*' } | Select-Object -ExpandProperty Name`
    );
    for (const line of keys.out.split(/\r?\n/)) {
      if (line.trim()) candidates.push({ kind: 'registro', path: line.trim(), why: 'Clave con nombre parecido' });
    }
  }

  // Quitamos duplicados.
  const seen = new Set();
  return candidates.filter((c) => {
    const key = `${c.kind}|${c.path}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Borra carpetas sobrantes enviándolas a la papelera. */
async function removeLeftovers(paths) {
  return recycle(paths);
}

// ---------- winget (actualizaciones) ----------

function wingetAvailable() {
  return new Promise((resolve) => {
    execFile('where.exe', ['winget'], { windowsHide: true }, (error, stdout) => {
      resolve(!error && Boolean(String(stdout).trim()));
    });
  });
}

function cleanAnsi(text) {
  return text.replace(/\u001b\[[0-9;]*[A-Za-z]/g, '').replace(/\r/g, '');
}

/** Lista de programas con actualización disponible. */
async function upgrades() {
  if (!(await wingetAvailable())) return { available: false, items: [], raw: '' };

  const lines = [];
  await runStream(
    'winget.exe',
    ['upgrade', '--include-unknown', '--accept-source-agreements', '--disable-interactivity'],
    (line) => lines.push(line),
    { timeout: 180000 }
  );

  const text = cleanAnsi(lines.join('\n'));
  const rows = text.split('\n');

  // Buscamos la línea de separadores (-----) y leemos lo que viene después.
  const separator = rows.findIndex((l) => /^-{5,}/.test(l.trim()));
  const items = [];

  if (separator >= 0) {
    for (const line of rows.slice(separator + 1)) {
      const clean = line.trimEnd();
      if (!clean || /^-{5,}/.test(clean)) continue;
      if (/^\s*\d+\s+(actualiz|upgrade)/i.test(clean)) continue;

      const parts = clean.split(/\s{2,}/).map((p) => p.trim()).filter(Boolean);
      if (parts.length < 4) continue;

      const [name, id, version, available] = parts;
      if (!id || !/[a-z0-9]/i.test(id)) continue;
      items.push({ name, id, version, available, source: parts[4] || '' });
    }
  }

  return { available: true, items, raw: text };
}

/** Actualiza un programa concreto por su id. */
async function upgradeOne(id, onLine) {
  return runStream(
    'winget.exe',
    ['upgrade', '--id', id, '--exact', '--silent', '--accept-package-agreements', '--accept-source-agreements', '--disable-interactivity'],
    onLine,
    { timeout: 900000 }
  );
}

module.exports = { list, uninstall, leftovers, removeLeftovers, upgrades, upgradeOne, wingetAvailable };
