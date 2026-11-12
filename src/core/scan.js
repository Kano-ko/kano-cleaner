'use strict';
// Catálogo de cosas que se pueden limpiar y dónde viven.
// Cada categoría dice qué rutas toca, qué riesgo tiene y si necesita administrador.

const fssync = require('node:fs');
const path = require('node:path');
const { measure, expand } = require('./util');

const L = process.env.LOCALAPPDATA || '';
const R = process.env.APPDATA || '';
const PD = process.env.PROGRAMDATA || 'C:\\ProgramData';
const WIN = process.env.WINDIR || 'C:\\Windows';

/** Detecta los perfiles de los navegadores instalados. */
function browserProfiles() {
  const chromium = [
    { browser: 'Chrome', base: path.join(L, 'Google', 'Chrome', 'User Data') },
    { browser: 'Edge', base: path.join(L, 'Microsoft', 'Edge', 'User Data') },
    { browser: 'Brave', base: path.join(L, 'BraveSoftware', 'Brave-Browser', 'User Data') },
    { browser: 'Vivaldi', base: path.join(L, 'Vivaldi', 'User Data') },
    { browser: 'Opera', base: path.join(R, 'Opera Software', 'Opera Stable') },
  ];

  const profiles = [];
  for (const def of chromium) {
    if (!fssync.existsSync(def.base)) continue;
    let names = [];
    try {
      names = fssync.readdirSync(def.base);
    } catch {
      continue;
    }
    for (const name of names) {
      if (name !== 'Default' && !/^Profile \d+$/.test(name)) continue;
      const dir = path.join(def.base, name);
      if (fssync.existsSync(dir)) profiles.push({ browser: def.browser, dir });
    }
  }

  // Firefox guarda cada perfil en una carpeta con nombre aleatorio.
  const ff = path.join(L, 'Mozilla', 'Firefox', 'Profiles');
  if (fssync.existsSync(ff)) {
    try {
      for (const name of fssync.readdirSync(ff)) {
        const dir = path.join(ff, name);
        if (fssync.existsSync(dir)) profiles.push({ browser: 'Firefox', dir });
      }
    } catch {
      /* sin permisos */
    }
  }
  return profiles;
}

/** Rutas de caché de cada navegador detectado. */
function browserCachePaths() {
  const out = [];
  for (const { dir } of browserProfiles()) {
    for (const sub of [
      'Cache\\Cache_Data',
      'Cache',
      'Code Cache',
      'GPUCache',
      'Service Worker\\CacheStorage',
      'cache2', // Firefox
      'startupCache', // Firefox
    ]) {
      const full = path.join(dir, sub);
      if (fssync.existsSync(full)) out.push(full);
    }
  }
  return out;
}

function browserFilePaths(names) {
  const out = [];
  for (const { dir } of browserProfiles()) {
    for (const name of names) {
      for (const candidate of [path.join(dir, name), path.join(dir, 'Network', name)]) {
        if (fssync.existsSync(candidate)) out.push(candidate);
      }
    }
  }
  return out;
}

/** Todo lo que se puede limpiar. */
function junkCategories() {
  return [
    {
      id: 'user-temp',
      group: 'Archivos temporales',
      name: 'Temporales del usuario',
      hint: 'Archivos que los programas dejan en %TEMP%. Nunca se borran los de las últimas 24 horas.',
      risk: 'safe',
      minAgeHours: 24,
      targets: ['%TEMP%'],
    },
    {
      id: 'system-temp',
      group: 'Archivos temporales',
      name: 'Temporales de Windows',
      hint: 'Carpeta temporal del sistema. Parte necesita administrador.',
      risk: 'safe',
      minAgeHours: 24,
      targets: [path.join(WIN, 'Temp')],
    },
    {
      id: 'crash-dumps',
      group: 'Archivos temporales',
      name: 'Volcados de errores',
      hint: 'Informes que Windows guarda cuando un programa falla. No hacen falta para nada.',
      risk: 'safe',
      targets: [path.join(L, 'CrashDumps'), path.join(WIN, 'Minidump'), path.join(WIN, 'MEMORY.DMP')],
    },
    {
      id: 'wer',
      group: 'Archivos temporales',
      name: 'Informes de errores de Windows',
      hint: 'Registros de fallos que Windows acumula con los años.',
      risk: 'safe',
      targets: [path.join(L, 'Microsoft', 'Windows', 'WER'), path.join(PD, 'Microsoft', 'Windows', 'WER')],
    },
    {
      id: 'thumbnails',
      group: 'Archivos temporales',
      name: 'Caché de miniaturas',
      hint: 'Las fotos en pequeño del Explorador. Windows las vuelve a crear solo.',
      risk: 'safe',
      targets: [path.join(L, 'Microsoft', 'Windows', 'Explorer', 'thumbcache_*.db')],
    },
    {
      id: 'browser-cache',
      group: 'Navegadores',
      name: 'Caché de los navegadores',
      hint: 'Copias de páginas y vídeos para cargar más rápido. Se regeneran.',
      risk: 'safe',
      targets: browserCachePaths(),
    },
    {
      id: 'd3d-cache',
      group: 'Navegadores',
      name: 'Caché de gráficos (DirectX)',
      hint: 'Compilaciones de sombreadores de los juegos. Se vuelven a generar.',
      risk: 'safe',
      targets: [
        path.join(L, 'D3DSCache'),
        path.join(L, 'AMD', 'DxCache'),
        path.join(L, 'AMD', 'DxcCache'),
        path.join(L, 'NVIDIA', 'DXCache'),
        path.join(L, 'NVIDIA', 'GLCache'),
      ],
    },
    {
      id: 'delivery-optimization',
      group: 'Windows',
      name: 'Caché de Optimización de entrega',
      hint: 'Restos de actualizaciones compartidas entre equipos.',
      risk: 'safe',
      targets: [path.join(WIN, 'ServiceProfiles', 'NetworkService', 'AppData', 'Local', 'Microsoft', 'Windows', 'DeliveryOptimization')],
    },
    {
      id: 'windows-update',
      group: 'Windows',
      name: 'Restos de Windows Update',
      hint: 'Instaladores ya aplicados. Libera mucho espacio. Necesita administrador.',
      risk: 'caution',
      needsAdmin: true,
      targets: [path.join(WIN, 'SoftwareDistribution', 'Download')],
    },
    {
      id: 'prefetch',
      group: 'Windows',
      name: 'Datos de Prefetch',
      hint: 'Ayuda a Windows a abrir programas. Borrarlo puede hacer que la primera apertura sea más lenta.',
      risk: 'caution',
      needsAdmin: true,
      targets: [path.join(WIN, 'Prefetch')],
    },
    {
      id: 'windows-old',
      group: 'Windows',
      name: 'Copia de Windows anterior (Windows.old)',
      hint: 'Solo existe tras actualizar Windows. Ocupa muchísimo y desaparece solo a los 10 días.',
      risk: 'caution',
      needsAdmin: true,
      targets: [path.join(path.parse(WIN).root, 'Windows.old')],
    },
    {
      id: 'recycle-bin',
      group: 'Sistema',
      name: 'Papelera de reciclaje',
      hint: 'Todo lo que has ido borrando. Revisa antes de vaciarla.',
      risk: 'caution',
      special: 'recycle',
    },
  ];
}

/** Cosas de privacidad: historiales, cookies y rastros de uso. */
function privacyCategories() {
  return [
    {
      id: 'browser-history',
      group: 'Navegadores',
      name: 'Historial de navegación',
      hint: 'Páginas visitadas en Chrome, Edge, Brave, Vivaldi, Opera y Firefox.',
      risk: 'safe',
      targets: browserFilePaths(['History', 'places.sqlite']),
    },
    {
      id: 'browser-cookies',
      group: 'Navegadores',
      name: 'Cookies',
      hint: 'Te mantienen con la sesión abierta en las webs. Al borrarlas tendrás que volver a entrar.',
      risk: 'caution',
      targets: browserFilePaths(['Cookies', 'cookies.sqlite']),
    },
    {
      id: 'browser-session',
      group: 'Navegadores',
      name: 'Pestañas y sesiones guardadas',
      hint: 'Lo que el navegador recuerda para reabrir al cerrarse.',
      risk: 'safe',
      targets: [
        ...browserFilePaths(['Sessions']),
        ...expand(path.join(L, 'Microsoft', 'Edge', 'User Data', '*', 'Session Storage')),
        ...expand(path.join(L, 'Google', 'Chrome', 'User Data', '*', 'Session Storage')),
      ],
    },
    {
      id: 'windows-recent',
      group: 'Windows',
      name: 'Archivos recientes',
      hint: 'Accesos directos a lo último que abriste.',
      risk: 'safe',
      targets: [path.join(R, 'Microsoft', 'Windows', 'Recent')],
    },
    {
      id: 'jump-lists',
      group: 'Windows',
      name: 'Listas de saltos',
      hint: 'Lo que aparece al pulsar con el botón derecho en el icono de un programa.',
      risk: 'safe',
      targets: [
        path.join(R, 'Microsoft', 'Windows', 'Recent', 'AutomaticDestinations'),
        path.join(R, 'Microsoft', 'Windows', 'Recent', 'CustomDestinations'),
      ],
    },
    {
      id: 'dns-cache',
      group: 'Red',
      name: 'Caché de DNS',
      hint: 'Direcciones web guardadas en memoria. Se vacía al instante y no rompe nada.',
      risk: 'safe',
      special: 'dns',
    },
  ];
}

/** Mide una categoría y devuelve su tamaño y ejemplos. */
async function scanCategory(cat) {
  if (cat.special === 'recycle') {
    const info = await measure([path.join(path.parse(WIN).root, '$Recycle.Bin')], { sample: 0 });
    return { ...cat, bytes: info.bytes, count: info.count, examples: [], blocked: info.blocked };
  }
  if (cat.special === 'dns') {
    // La caché DNS no ocupa espacio medible; se cuenta como 0 bytes.
    return { ...cat, bytes: 0, count: 1, examples: [], blocked: 0 };
  }

  const targets = cat.targets || [];
  if (!targets.length) return { ...cat, bytes: 0, count: 0, examples: [], blocked: 0, empty: true };

  const info = await measure(targets, { minAgeMs: (cat.minAgeHours || 0) * 3600 * 1000 });
  return { ...cat, ...info };
}

/** Mide varias categorías, una detrás de otra para no saturar el disco. */
async function scanMany(cats, onProgress) {
  const out = [];
  for (let i = 0; i < cats.length; i++) {
    const result = await scanCategory(cats[i]);
    out.push(result);
    if (onProgress) onProgress({ done: i + 1, total: cats.length, id: cats[i].id, result });
  }
  return out;
}

module.exports = { junkCategories, privacyCategories, scanCategory, scanMany, browserProfiles };
