'use strict';
// Controladores: estado real de las tarjetas gráficas y actualizaciones que
// ofrece Microsoft Update.
//
// Regla del proyecto: no se inventan versiones. Si un fabricante no publica una
// forma abierta de consultar su última versión, no se muestra un número falso:
// se enseña lo que hay instalado, su antigüedad y el enlace oficial.

const util = require('./util');

// Identificadores de fabricante que aparecen dentro del identificador del
// dispositivo (PNPDeviceID), por ejemplo PCI\VEN_1002&DEV_1636...
const FABRICANTES = {
  '10de': { id: 'nvidia', nombre: 'NVIDIA', web: 'https://www.nvidia.com/en-us/drivers/' },
  '1002': { id: 'amd', nombre: 'AMD', web: 'https://www.amd.com/en/support/download/drivers.html' },
  '1022': { id: 'amd', nombre: 'AMD', web: 'https://www.amd.com/en/support/download/drivers.html' },
  '8086': { id: 'intel', nombre: 'Intel', web: 'https://www.intel.com/content/www/us/en/download-center/home.html' },
  '8087': { id: 'intel', nombre: 'Intel', web: 'https://www.intel.com/content/www/us/en/download-center/home.html' },
};

// Adaptadores que no son una tarjeta física: pantallas remotas, virtuales, etc.
const VIRTUAL = /virtual|parsec|basic display|remote|spacedesk|citrix|vmware|hyper-v|microsoft remote/i;

/** Página oficial del fabricante, o null si no lo conocemos. */
function vendorPage(vendorId) {
  return FABRICANTES[vendorId]?.web || null;
}

/** Normaliza la salida de PowerShell: siempre un array. */
function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Tarjetas gráficas instaladas, con la versión y la fecha del controlador.
 * Devuelve datos de Windows tal cual: no se compara con nada inventado.
 */
async function graphics() {
  const script = `
$ErrorActionPreference = 'SilentlyContinue'
Get-CimInstance -ClassName Win32_VideoController | ForEach-Object {
  [pscustomobject]@{
    nombre    = $_.Name
    version   = $_.DriverVersion
    fecha     = if ($_.DriverDate) { ([datetime]$_.DriverDate).ToString('o') } else { $null }
    proveedor = $_.DriverProviderName
    pnp       = $_.PNPDeviceID
    estado    = $_.Status
    memoria   = $_.AdapterRAM
  }
} | ConvertTo-Json -Depth 3 -Compress
`;

  const raw = await util.psJson(script, { timeout: 45000 });
  const hoy = Date.now();

  return asArray(raw).map((g) => {
    const pnp = String(g.pnp || '');
    const vendorId = (pnp.match(/VEN_([0-9A-F]{4})/i) || [])[1]?.toLowerCase() || null;
    const fabricante = vendorId ? FABRICANTES[vendorId] : null;
    const fecha = g.fecha ? Date.parse(g.fecha) : null;
    const dias = fecha ? Math.floor((hoy - fecha) / 86400000) : null;

    // Un controlador de hace más de dos años casi seguro tiene algo mejor.
    let estado = 'al-dia';
    if (dias !== null && dias > 730) estado = 'antiguo';
    else if (dias !== null && dias > 365) estado = 'revisable';

    return {
      nombre: String(g.nombre || 'Tarjeta gráfica sin nombre'),
      version: String(g.version || ''),
      fecha,
      dias,
      vendorId,
      fabricante: fabricante?.nombre || (vendorId ? 'Desconocido' : null),
      web: fabricante?.web || null,
      pnp,
      virtual: VIRTUAL.test(String(g.nombre || '')) || /^ROOT\\\\/i.test(pnp),
      estado,
      estadoWindows: String(g.estado || ''),
      memoria: Number(g.memoria) || 0,
    };
  });
}

/**
 * Busca actualizaciones de controladores en Microsoft Update.
 * Es la misma fuente que usa Windows Update, así que lo que aparece aquí existe
 * de verdad. Tarda entre 10 y 40 segundos según la conexión.
 */
async function updates() {
  const script = `
$ErrorActionPreference = 'Stop'
try {
  $sesion = New-Object -ComObject Microsoft.Update.Session
  $buscador = $sesion.CreateUpdateSearcher()
  # 3 = buscar también en Microsoft Update (no solo Windows Update)
  $buscador.ServerSelection = 3
  $buscador.ServiceID = '7971f918-a847-4430-9279-4a52d1efe18d'
  $resultado = $buscador.Search("IsInstalled=0 and Type='Driver' and IsHidden=0")

  $lista = @()
  foreach ($u in $resultado.Updates) {
    $lista += [pscustomobject]@{
      titulo     = $u.Title
      clase      = $u.DriverClass
      fabricante = $u.DriverManufacturer
      modelo     = $u.DriverModel
      proveedor  = $u.DriverProvider
      fecha      = if ($u.DriverVerDate) { ([datetime]$u.DriverVerDate).ToString('o') } else { $null }
      descargado = $u.IsDownloaded
    }
  }
  [pscustomobject]@{ ok = $true; total = $lista.Count; items = $lista } | ConvertTo-Json -Depth 4 -Compress
} catch {
  [pscustomobject]@{ ok = $false; error = $_.Exception.Message; items = @() } | ConvertTo-Json -Depth 4 -Compress
}
`;

  const inicio = Date.now();
  const r = await util.psJson(script, { timeout: 180000 });
  const ms = Date.now() - inicio;

  if (!r || r.ok === false) {
    return {
      ok: false,
      ms,
      items: [],
      error: r?.error || 'Windows Update no ha respondido. Puede que no haya conexión.',
    };
  }

  return {
    ok: true,
    ms,
    items: asArray(r.items).map((i) => ({
      titulo: String(i.titulo || 'Controlador sin nombre'),
      clase: String(i.clase || ''),
      fabricante: String(i.fabricante || ''),
      modelo: String(i.modelo || ''),
      proveedor: String(i.proveedor || ''),
      fecha: i.fecha ? Date.parse(i.fecha) : null,
      descargado: Boolean(i.descargado),
    })),
  };
}

module.exports = { graphics, updates, vendorPage };
