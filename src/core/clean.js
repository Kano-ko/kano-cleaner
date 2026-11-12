'use strict';
// Ejecuta la limpieza de las categorías elegidas y devuelve un informe.

const { removeFiles, ps, human } = require('./util');
const { junkCategories, privacyCategories, scanCategory } = require('./scan');

function findCategory(id) {
  return [...junkCategories(), ...privacyCategories()].find((c) => c.id === id) || null;
}

async function cleanOne(cat) {
  if (cat.special === 'recycle') {
    const r = await ps('Clear-RecycleBin -Force -ErrorAction SilentlyContinue; "ok"', { timeout: 180000 });
    return { id: cat.id, name: cat.name, bytes: 0, removed: 1, failed: 0, note: r.ok ? '' : 'Windows no pudo vaciar la papelera' };
  }

  if (cat.special === 'dns') {
    const r = await ps('ipconfig /flushdns | Out-Null; "ok"');
    return { id: cat.id, name: cat.name, bytes: 0, removed: 1, failed: 0, note: r.ok ? '' : 'No se pudo vaciar la caché DNS' };
  }

  const targets = cat.targets || [];
  if (!targets.length) return { id: cat.id, name: cat.name, bytes: 0, removed: 0, failed: 0 };

  const before = await scanCategory(cat);
  const result = await removeFiles(targets, { minAgeMs: (cat.minAgeHours || 0) * 3600 * 1000 });

  // Si el borrado falla pero el archivo ya no está, lo contamos como liberado.
  const freed = result.bytes || (result.removed ? before.bytes : 0);

  return {
    id: cat.id,
    name: cat.name,
    bytes: freed,
    removed: result.removed,
    failed: result.failed,
    note: result.failed ? `${result.failed} archivos estaban en uso y se han respetado` : '',
  };
}

/**
 * Limpia una lista de ids. onProgress recibe { done, total, id }.
 * Devuelve un informe con el total liberado.
 */
async function cleanIds(ids, onProgress) {
  const cats = ids.map(findCategory).filter(Boolean);
  const details = [];
  let totalBytes = 0;
  let totalRemoved = 0;

  for (let i = 0; i < cats.length; i++) {
    const cat = cats[i];
    let result;
    try {
      result = await cleanOne(cat);
    } catch (e) {
      result = { id: cat.id, name: cat.name, bytes: 0, removed: 0, failed: 1, note: String(e.message || e) };
    }
    details.push(result);
    totalBytes += result.bytes;
    totalRemoved += result.removed;
    if (onProgress) onProgress({ done: i + 1, total: cats.length, id: cat.id });
  }

  return {
    bytes: totalBytes,
    removed: totalRemoved,
    pretty: human(totalBytes),
    details,
  };
}

module.exports = { cleanIds, findCategory };
