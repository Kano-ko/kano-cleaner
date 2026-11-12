'use strict';
// Programas que arrancan solos con Windows: lectura y activar/desactivar.
// Se usa el mismo mecanismo que el Administrador de tareas (clave StartupApproved).

const { ps, psJson } = require('./util');

const LIST_SCRIPT = `
$ErrorActionPreference='SilentlyContinue'
$rows = @()

# --- Entradas del registro (Run / RunOnce) ---
$keys = @(
  @{ Path='HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';       Scope='Usuario' },
  @{ Path='HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\RunOnce';  Scope='Usuario' },
  @{ Path='HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';       Scope='Equipo'  },
  @{ Path='HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\RunOnce';  Scope='Equipo'  },
  @{ Path='HKLM:\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Run'; Scope='Equipo' }
)

foreach ($k in $keys) {
  if (-not (Test-Path -LiteralPath $k.Path)) { continue }
  $item = Get-ItemProperty -LiteralPath $k.Path
  foreach ($p in $item.PSObject.Properties) {
    if ($p.Name -like 'PS*') { continue }
    $rows += [pscustomobject]@{
      Name     = $p.Name
      Command  = [string]$p.Value
      Location = $k.Path
      Scope    = $k.Scope
      Type     = 'Registro'
    }
  }
}

# --- Carpeta de inicio (accesos directos) ---
$folders = @(
  @{ Path = (Join-Path $env:APPDATA 'Microsoft\\Windows\\Start Menu\\Programs\\Startup');       Scope='Usuario' },
  @{ Path = (Join-Path $env:ProgramData 'Microsoft\\Windows\\Start Menu\\Programs\\Startup');   Scope='Equipo'  }
)
foreach ($f in $folders) {
  if (-not (Test-Path -LiteralPath $f.Path)) { continue }
  foreach ($file in (Get-ChildItem -LiteralPath $f.Path -File)) {
    $rows += [pscustomobject]@{
      Name     = $file.Name
      Command  = $file.FullName
      Location = $f.Path
      Scope    = $f.Scope
      Type     = 'Carpeta'
    }
  }
}

# --- Estado activado/desactivado (lo guarda Windows en StartupApproved) ---
$approvedKeys = @(
  @{ Key='HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run';            Type='Registro' },
  @{ Key='HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run32';         Type='Registro' },
  @{ Key='HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\StartupFolder'; Type='Carpeta'  }
)
$state = @{}
foreach ($a in $approvedKeys) {
  if (-not (Test-Path -LiteralPath $a.Key)) { continue }
  $item = Get-ItemProperty -LiteralPath $a.Key
  foreach ($p in $item.PSObject.Properties) {
    if ($p.Name -like 'PS*') { continue }
    $bytes = $p.Value
    $first = 2
    if ($bytes -is [byte[]] -and $bytes.Length -gt 0) { $first = $bytes[0] }
    $state["$($a.Type)|$($p.Name)"] = ($first -band 1) -eq 0
  }
}

# --- Firma digital del ejecutable ---
function Get-Exe([string]$command) {
  if (-not $command) { return '' }
  $c = $command.Trim()
  if ($c.StartsWith('"')) {
    $end = $c.IndexOf('"', 1)
    if ($end -gt 1) { return $c.Substring(1, $end - 1) }
  }
  $match = [regex]::Match($c, '^(.+?\\.exe)')
  if ($match.Success) { return $match.Groups[1].Value }
  return ''
}

foreach ($row in $rows) {
  $key = "$($row.Type)|$($row.Name)"
  $row | Add-Member -NotePropertyName Enabled -NotePropertyValue ($state[$key] -ne $false) -Force
  $exe = Get-Exe $row.Command
  $row | Add-Member -NotePropertyName Exe -NotePropertyValue $exe -Force
  $signed = $null
  if ($exe -and (Test-Path -LiteralPath $exe)) {
    try { $signed = (Get-AuthenticodeSignature -LiteralPath $exe).Status.ToString() } catch { $signed = 'Desconocido' }
  }
  $row | Add-Member -NotePropertyName Signature -NotePropertyValue $signed -Force
}

$rows | ConvertTo-Json -Compress -Depth 3
`;

/** Devuelve la lista de programas de inicio. */
async function list() {
  const rows = await psJson(LIST_SCRIPT, { timeout: 120000 });
  if (!rows) return [];
  const array = Array.isArray(rows) ? rows : [rows];

  return array
    .filter((r) => r && r.Name)
    .map((r, index) => ({
      id: `${r.Type}|${r.Name}|${index}`,
      name: r.Name,
      command: r.Command,
      location: r.Location,
      scope: r.Scope,
      type: r.Type,
      enabled: r.Enabled !== false,
      exe: r.Exe || '',
      signature: r.Signature || null,
    }))
    .sort((a, b) => Number(b.enabled) - Number(a.enabled) || a.name.localeCompare(b.name, 'es'));
}

/** Activa o desactiva una entrada. */
async function setEnabled({ name, type, enabled }) {
  const approvedKey =
    type === 'Carpeta'
      ? 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\StartupFolder'
      : 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run';

  const safeName = String(name).replace(/'/g, "''");
  const firstByte = enabled ? 2 : 3;

  const script = `
$key = '${approvedKey}'
if (-not (Test-Path -LiteralPath $key)) { New-Item -Path $key -Force | Out-Null }
$data = New-Object byte[] 12
$data[0] = ${firstByte}
Set-ItemProperty -LiteralPath $key -Name '${safeName}' -Value $data -Type Binary -Force
'ok'
`;
  const r = await ps(script);
  return { ok: r.ok, error: r.ok ? '' : r.err };
}

module.exports = { list, setEnabled };
