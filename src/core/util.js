'use strict';
// Utilidades comunes: hablar con PowerShell, medir carpetas, borrar y formatear.
// Todo lo que usan los demás módulos de src/core.

const { execFile, spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const fssync = require('node:fs');
const path = require('node:path');

/** Ejecuta un trozo de PowerShell y devuelve { ok, out, err }. */
function ps(script, opts = {}) {
  const { timeout = 90000 } = opts;
  const full = [
    "$ProgressPreference='SilentlyContinue'",
    '[Console]::OutputEncoding=[System.Text.Encoding]::UTF8',
    '$OutputEncoding=[System.Text.Encoding]::UTF8',
    script,
  ].join('; ');

  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', full],
      { timeout, windowsHide: true, maxBuffer: 32 * 1024 * 1024, encoding: 'utf8' },
      (error, stdout, stderr) => {
        resolve({
          ok: !error,
          out: (stdout || '').replace(/^\uFEFF/, '').trim(),
          err: error ? String(stderr || error.message).trim() : '',
        });
      }
    );
  });
}

/** Igual que ps(), pero convierte la salida JSON en objeto. */
async function psJson(script, opts) {
  const r = await ps(script, opts);
  if (!r.out) return null;
  try {
    return JSON.parse(r.out);
  } catch {
    return null;
  }
}

/** Ejecuta un programa y va contando su salida línea a línea. */
function runStream(command, args, onLine, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { windowsHide: true, ...opts });
    let buffer = '';

    const emit = (chunk) => {
      buffer += chunk.toString('utf8');
      const parts = buffer.split(/\r?\n/);
      buffer = parts.pop() || '';
      for (const line of parts) {
        if (line.trim()) onLine(line.trim());
      }
    };

    child.stdout.on('data', emit);
    child.stderr.on('data', emit);
    child.on('error', (e) => {
      onLine(String(e.message || e));
      resolve({ code: -1 });
    });
    child.on('close', (code) => {
      if (buffer.trim()) onLine(buffer.trim());
      resolve({ code });
    });
  });
}

/** ¿La app se está ejecutando como administrador? */
async function isAdmin() {
  const r = await ps(
    '([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent())' +
      '.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)'
  );
  return r.out.toLowerCase() === 'true';
}

/** Convierte bytes a texto legible: 1,23 GB */
function human(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = n / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value >= 100 ? 0 : 1).replace('.', ',')} ${units[i]}`;
}

/** Expande variables de entorno (%TEMP%) y comodines (*) en una ruta. */
function expand(p) {
  if (!p) return [];
  const withEnv = p.replace(/%([^%]+)%/g, (_, name) => process.env[name] || '');
  if (!withEnv.includes('*')) return [withEnv];

  // Expandimos un nivel de comodín por cada segmento que lo contenga.
  let results = [''];
  for (const part of withEnv.split(path.sep)) {
    const next = [];
    for (const base of results) {
      if (!part.includes('*')) {
        next.push(base ? path.join(base, part) : part);
        continue;
      }
      const dir = base || path.parse(withEnv).root;
      let entries = [];
      try {
        entries = fssync.readdirSync(dir);
      } catch {
        entries = [];
      }
      const regex = new RegExp('^' + part.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$', 'i');
      for (const name of entries) {
        if (regex.test(name)) next.push(path.join(dir, name));
      }
    }
    results = next;
  }
  return results;
}

/**
 * Mide y recoge archivos de una lista de rutas.
 * - minAgeMs: ignora archivos modificados hace menos de ese tiempo.
 * - sample: cuántas rutas de ejemplo devolver.
 */
async function measure(targets, opts = {}) {
  const { minAgeMs = 0, maxFiles = 300000, sample = 15 } = opts;
  const now = Date.now();
  let bytes = 0;
  let count = 0;
  let blocked = 0;
  const examples = [];

  async function visit(target) {
    let st;
    try {
      st = await fs.lstat(target);
    } catch {
      blocked++;
      return;
    }
    if (st.isSymbolicLink()) return; // no seguimos enlaces (evita bucles)

    if (st.isDirectory()) {
      let entries;
      try {
        entries = await fs.readdir(target, { withFileTypes: true });
      } catch {
        blocked++;
        return;
      }
      for (const entry of entries) {
        if (count >= maxFiles) return;
        await visit(path.join(target, entry.name));
      }
      return;
    }

    if (!st.isFile()) return;
    if (minAgeMs && now - st.mtimeMs < minAgeMs) return;

    bytes += st.size;
    count++;
    if (examples.length < sample) {
      examples.push({ path: target, size: st.size, modified: st.mtimeMs });
    }
  }

  for (const raw of targets) {
    for (const target of expand(raw)) {
      await visit(target);
    }
  }

  return { bytes, count, blocked, examples };
}

/** Borra archivos o carpetas y devuelve cuánto se liberó de verdad. */
async function removeFiles(targets, opts = {}) {
  const { minAgeMs = 0 } = opts;
  const now = Date.now();
  let bytes = 0;
  let removed = 0;
  let failed = 0;
  const errors = [];

  async function visit(target) {
    let st;
    try {
      st = await fs.lstat(target);
    } catch {
      return;
    }
    if (st.isSymbolicLink()) {
      try {
        await fs.unlink(target);
        removed++;
      } catch {
        failed++;
      }
      return;
    }

    if (st.isDirectory()) {
      let entries;
      try {
        entries = await fs.readdir(target, { withFileTypes: true });
      } catch {
        failed++;
        return;
      }
      for (const entry of entries) {
        await visit(path.join(target, entry.name));
      }
      // Intentamos quitar la carpeta si quedó vacía; si no, se ignora.
      try {
        await fs.rmdir(target);
      } catch {
        /* queda algo dentro: normal */
      }
      return;
    }

    if (!st.isFile()) return;
    if (minAgeMs && now - st.mtimeMs < minAgeMs) return;

    const size = st.size;
    try {
      await fs.rm(target, { force: true, maxRetries: 1 });
      bytes += size;
      removed++;
    } catch (e) {
      failed++;
      if (errors.length < 20) errors.push({ path: target, error: e.code || e.message });
    }
  }

  for (const raw of targets) {
    for (const target of expand(raw)) {
      await visit(target);
    }
  }

  return { bytes, removed, failed, errors };
}

/** Envía archivos a la papelera (se puede deshacer). */
async function recycle(paths) {
  if (!paths.length) return { ok: true, count: 0 };

  // PowerShell con la API de Visual Basic: es la forma fiable de usar la papelera.
  const list = paths.map((p) => p.replace(/'/g, "''")).map((p) => `'${p}'`).join(',');
  const script = `
$ErrorActionPreference='Stop'
Add-Type -AssemblyName Microsoft.VisualBasic
$n=0; $errores=@()
foreach ($p in @(${list})) {
  try {
    if (Test-Path -LiteralPath $p -PathType Container) {
      [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory($p,'OnlyErrorDialogs','SendToRecycleBin')
    } else {
      [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile($p,'OnlyErrorDialogs','SendToRecycleBin')
    }
    $n++
  } catch { $errores += $_.Exception.Message }
}
[pscustomobject]@{ borrados=$n; errores=$errores } | ConvertTo-Json -Compress
`;

  const result = await psJson(script, { timeout: 180000 });
  return { ok: true, count: result?.borrados ?? 0, errors: result?.errores ?? [] };
}

/** Lee el registro de Windows con reg.exe y devuelve un texto limpio. */
async function regQuery(key) {
  return new Promise((resolve) => {
    execFile('reg.exe', ['query', key, '/s'], { windowsHide: true, maxBuffer: 16 * 1024 * 1024, encoding: 'utf8' }, (error, stdout) => {
      resolve(error ? '' : stdout);
    });
  });
}

module.exports = { ps, psJson, runStream, isAdmin, human, expand, measure, removeFiles, recycle, regQuery };
