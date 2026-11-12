'use strict';
// Estado del equipo: disco, memoria, batería, procesos y dispositivos con problemas.

const os = require('node:os');
const { psJson } = require('./util');

/** Información general del sistema. */
async function info() {
  const data = await psJson(`
$ErrorActionPreference='SilentlyContinue'
$os = Get-CimInstance Win32_OperatingSystem
$cs = Get-CimInstance Win32_ComputerSystem
$disks = @(Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | ForEach-Object {
  [pscustomobject]@{ letra=$_.DeviceID; total=$_.Size; libre=$_.FreeSpace; nombre=$_.VolumeName }
})
$bateria = Get-CimInstance Win32_Battery | Select-Object -First 1
$arranque = (Get-CimInstance Win32_OperatingSystem).LastBootUpTime
[pscustomobject]@{
  equipo    = $cs.Name
  windows   = $os.Caption
  build     = $os.BuildNumber
  version   = $os.Version
  memoria   = $cs.TotalPhysicalMemory
  discos    = $disks
  bateria   = if ($bateria) { [pscustomobject]@{ carga=$bateria.EstimatedChargeRemaining; estado=$bateria.BatteryStatus } } else { $null }
  arranque  = if ($arranque) { $arranque.ToString('yyyy-MM-dd HH:mm') } else { '' }
  cpu       = $cs.NumberOfLogicalProcessors
} | ConvertTo-Json -Compress -Depth 4
`, { timeout: 60000 });

  const memoria = {
    total: os.totalmem(),
    libre: os.freemem(),
  };

  return {
    ...(data || {}),
    memoria,
    uptimeHoras: Math.round(os.uptime() / 3600),
    plataforma: `${os.platform()} ${os.arch()}`,
  };
}

/** Procesos que más memoria usan. */
async function processes() {
  const rows = await psJson(`
$ErrorActionPreference='SilentlyContinue'
Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 25 Name, Id, WorkingSet64, CPU, @{n='Ruta';e={ $_.Path }} | ConvertTo-Json -Compress
`, { timeout: 60000 });

  if (!rows) return [];
  const array = Array.isArray(rows) ? rows : [rows];
  return array.map((p) => ({
    name: p.Name,
    pid: p.Id,
    memory: p.WorkingSet64 || 0,
    cpu: p.CPU || 0,
    path: p.Ruta || '',
  }));
}

/** Dispositivos que Windows marca con error o sin controlador. */
async function problemDevices() {
  const rows = await psJson(`
$ErrorActionPreference='SilentlyContinue'
Get-PnpDevice | Where-Object { $_.Status -eq 'Error' -or $_.Status -eq 'Unknown' -or $_.ConfigManagerErrorCode -ne 0 } |
  Select-Object FriendlyName, Status, Class, InstanceId, ConfigManagerErrorCode |
  Sort-Object Class, FriendlyName | ConvertTo-Json -Compress
`, { timeout: 120000 });

  if (!rows) return [];
  const array = Array.isArray(rows) ? rows : [rows];
  return array.map((d) => ({
    name: d.FriendlyName || '(sin nombre)',
    status: d.Status || '',
    class: d.Class || '',
    code: d.ConfigManagerErrorCode || 0,
  }));
}

/** ¿Hay un reinicio pendiente? */
async function pendingReboot() {
  const r = await psJson(`
$ErrorActionPreference='SilentlyContinue'
$pending = $false
if (Test-Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Component Based Servicing\\RebootPending') { $pending = $true }
if (Test-Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\WindowsUpdate\\Auto Update\\RebootRequired') { $pending = $true }
if ((Get-ItemProperty 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager' -ErrorAction SilentlyContinue).PendingFileRenameOperations) { $pending = $true }
$pending | ConvertTo-Json
`);
  return r === true;
}

module.exports = { info, processes, problemDevices, pendingReboot };
