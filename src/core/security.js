'use strict';
// Seguridad: estado de Windows Defender, análisis de virus y comprobaciones propias.

const fs = require('node:fs/promises');
const fssync = require('node:fs');
const path = require('node:path');
const { ps, psJson, runStream } = require('./util');
const startup = require('./startup');

const MP_CMD = path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Windows Defender', 'MpCmdRun.exe');

/** Estado general del antivirus de Windows. */
async function defenderStatus() {
  const status = await psJson(`
$ErrorActionPreference='SilentlyContinue'
$s = Get-MpComputerStatus
if (-not $s) { 'null'; return }
[pscustomobject]@{
  antivirus      = $s.AntivirusEnabled
  tiempoReal     = $s.RealTimeProtectionEnabled
  nube           = $s.MAPSReportingEnabled
  firmaVersion   = $s.AntivirusSignatureVersion
  firmaFecha     = if ($s.AntivirusSignatureLastUpdated) { $s.AntivirusSignatureLastUpdated.ToString('yyyy-MM-dd HH:mm') } else { '' }
  ultimoRapido   = if ($s.QuickScanEndTime) { $s.QuickScanEndTime.ToString('yyyy-MM-dd HH:mm') } else { '' }
  ultimoCompleto = if ($s.FullScanEndTime) { $s.FullScanEndTime.ToString('yyyy-MM-dd HH:mm') } else { '' }
  manipulacion   = $s.IsTamperProtected
  motor          = $s.AMEngineVersion
} | ConvertTo-Json -Compress
`);

  const exclusions = await psJson(`
$ErrorActionPreference='SilentlyContinue'
$p = Get-MpPreference
[pscustomobject]@{
  rutas       = @($p.ExclusionPath)
  extensiones = @($p.ExclusionExtension)
  procesos    = @($p.ExclusionProcess)
} | ConvertTo-Json -Compress
`);

  return {
    installed: Boolean(status),
    ...(status || {}),
    exclusions: exclusions || { rutas: [], extensiones: [], procesos: [] },
    mpCmd: fssync.existsSync(MP_CMD),
  };
}

/** Historial de amenazas detectadas por Defender. */
async function threatHistory() {
  const rows = await psJson(`
$ErrorActionPreference='SilentlyContinue'
$names = @{}
Get-MpThreat | ForEach-Object { $names[[string]$_.ThreatID] = $_.ThreatName }
Get-MpThreatDetection | Sort-Object InitialDetectionTime -Descending | Select-Object -First 30 | ForEach-Object {
  [pscustomobject]@{
    id       = [string]$_.ThreatID
    nombre   = $names[[string]$_.ThreatID]
    fecha    = if ($_.InitialDetectionTime) { $_.InitialDetectionTime.ToString('yyyy-MM-dd HH:mm') } else { '' }
    recursos = @($_.Resources) -join '; '
    limpiado = $_.ActionSuccess
  }
} | ConvertTo-Json -Compress
`);
  if (!rows) return [];
  return Array.isArray(rows) ? rows : [rows];
}

/**
 * Lanza un análisis con el motor de Defender.
 * type: 'quick' | 'full' | 'custom'
 */
async function scan(type, target, onLine) {
  if (!fssync.existsSync(MP_CMD)) {
    return { ok: false, error: 'No se ha encontrado el motor de Windows Defender en este equipo.' };
  }

  const args = ['-Scan', '-ScanType', type === 'full' ? '2' : type === 'custom' ? '3' : '1'];
  if (type === 'custom' && target) args.push('-File', target);

  const result = await runStream(MP_CMD, args, onLine, { timeout: 3600000 });
  return { ok: result.code === 0, code: result.code };
}

/** Comprobaciones propias que Defender no hace. */
async function heuristics() {
  const findings = [];
  const add = (severity, title, detail, extra = {}) => findings.push({ severity, title, detail, ...extra });

  // 1. Programas de inicio: ruta rara o sin firma.
  let entries = [];
  try {
    entries = await startup.list();
  } catch {
    /* sin lista */
  }

  const raras = entries.filter((e) => {
    if (!e.enabled || !e.exe) return false;
    const lower = e.exe.toLowerCase();
    const enSitioRaro = /\\temp\\|\\tmp\\|\\downloads\\|\\appdata\\local\\temp\\/.test(lower);
    return enSitioRaro || e.signature === 'NotSigned' || e.signature === 'HashMismatch';
  });

  for (const e of raras) {
    add(
      e.signature === 'HashMismatch' ? 'alta' : 'media',
      `Inicio sospechoso: ${e.name}`,
      `${e.exe}${e.signature === 'NotSigned' ? ' (sin firma digital)' : e.signature === 'HashMismatch' ? ' (firma alterada)' : ''}`,
      { kind: 'startup', name: e.name }
    );
  }

  // 2. Exclusiones del antivirus: el malware las añade para no ser detectado.
  const exclusions = await psJson(`
$ErrorActionPreference='SilentlyContinue'
$p = Get-MpPreference
@(@($p.ExclusionPath) + @($p.ExclusionExtension) + @($p.ExclusionProcess)) | Where-Object { $_ } | ConvertTo-Json -Compress
`);
  const excl = exclusions ? (Array.isArray(exclusions) ? exclusions : [exclusions]) : [];
  for (const item of excl) {
    add('media', 'Exclusión en el antivirus', `Defender está ignorando: ${item}`, { kind: 'exclusion', value: item });
  }

  // 3. Archivo hosts manipulado.
  const hostsPath = path.join(process.env.WINDIR || 'C:\\Windows', 'System32', 'drivers', 'etc', 'hosts');
  try {
    const text = await fs.readFile(hostsPath, 'utf8');
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));
    const normales = new Set(['127.0.0.1 localhost', '::1 localhost', '127.0.0.1 localhost.localdomain']);
    const raras = lines.filter((l) => !normales.has(l.toLowerCase()));
    if (raras.length) {
      add('alta', 'El archivo hosts tiene entradas añadidas', `${raras.length} líneas. Ejemplo: ${raras[0]}`, {
        kind: 'hosts',
        lines: raras.slice(0, 20),
      });
    }
  } catch {
    /* sin acceso */
  }

  // 4. Ejecutables sueltos en carpetas temporales.
  const tempDirs = [process.env.TEMP, path.join(process.env.WINDIR || 'C:\\Windows', 'Temp')].filter(Boolean);
  const exes = [];
  for (const dir of tempDirs) {
    let items = [];
    try {
      items = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const item of items) {
      if (item.isFile() && /\.(exe|scr|bat|cmd|ps1|vbs|js)$/i.test(item.name)) {
        exes.push(path.join(dir, item.name));
      }
    }
  }
  if (exes.length) {
    add('media', 'Ejecutables en carpetas temporales', `${exes.length} archivos. Suele ser resto de instaladores, pero también es sitio típico de malware.`, {
      kind: 'temp-exes',
      lines: exes.slice(0, 20),
    });
  }

  // 5. Tareas programadas que lanzan cosas desde carpetas del usuario.
  const tasks = await psJson(`
$ErrorActionPreference='SilentlyContinue'
Get-ScheduledTask | Where-Object { $_.State -ne 'Disabled' -and $_.Actions.Execute } | ForEach-Object {
  [pscustomobject]@{ nombre=$_.TaskName; ruta=$_.TaskPath; exe=$_.Actions.Execute; args=$_.Actions.Arguments }
} | ConvertTo-Json -Compress
`, { timeout: 120000 });

  const taskList = tasks ? (Array.isArray(tasks) ? tasks : [tasks]) : [];
  const tareasRaras = taskList.filter((t) => {
    const exe = String(t.exe || '').toLowerCase();
    return /\\appdata\\|\\temp\\|\\downloads\\/.test(exe);
  });
  for (const t of tareasRaras) {
    add('media', `Tarea programada sospechosa: ${t.nombre}`, `${t.exe} ${t.args || ''}`.trim(), { kind: 'task' });
  }

  // 6. Protecciones básicas apagadas.
  const uac = await psJson(`(Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System' -ErrorAction SilentlyContinue).EnableLUA | ConvertTo-Json`);
  if (uac === 0) {
    add('alta', 'El control de cuentas de usuario (UAC) está desactivado', 'Windows deja de pedir permiso cuando un programa intenta cambiar el sistema.');
  }

  const def = await defenderStatus();
  if (def.installed) {
    if (!def.antivirus) add('alta', 'Windows Defender está desactivado', 'El antivirus integrado no está protegiendo el equipo.');
    if (!def.tiempoReal) add('alta', 'La protección en tiempo real está apagada', 'Los archivos no se revisan al abrirlos.');
  }

  return {
    findings,
    checked: {
      inicio: entries.length,
      exclusiones: excl.length,
      temporales: exes.length,
      tareas: taskList.length,
    },
  };
}

module.exports = { defenderStatus, threatHistory, scan, heuristics };
