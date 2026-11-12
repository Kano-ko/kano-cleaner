'use strict';
// Archivos: duplicados, uso de disco y archivos grandes.

const fs = require('node:fs/promises');
const fssync = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { human, recycle } = require('./util');

/** Recorre una carpeta y llama a onFile por cada archivo. */
async function walk(root, onFile, opts = {}) {
  const { maxDepth = 30, maxFiles = 400000, skipNames = new Set(['$Recycle.Bin', 'System Volume Information', 'node_modules', '.git']) } = opts;
  let seen = 0;

  async function visit(dir, depth) {
    if (depth > maxDepth || seen >= maxFiles) return;
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (seen >= maxFiles) return;
      if (entry.isSymbolicLink()) continue;
      if (skipNames.has(entry.name)) continue;
      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await visit(full, depth + 1);
      } else if (entry.isFile()) {
        seen++;
        let st;
        try {
          st = await fs.lstat(full);
        } catch {
          continue;
        }
        await onFile({ path: full, size: st.size, modified: st.mtimeMs }, seen);
      }
    }
  }

  await visit(root, 0);
  return seen;
}

/** Hash de los primeros N bytes (rápido) o del archivo completo. */
function hashFile(file, limit = 0) {
  return new Promise((resolve) => {
    const hash = crypto.createHash('sha256');
    let read = 0;
    const stream = fssync.createReadStream(file, { start: 0, end: limit > 0 ? limit - 1 : undefined });
    stream.on('data', (chunk) => {
      hash.update(chunk);
      read += chunk.length;
    });
    stream.on('error', () => resolve(null));
    stream.on('end', () => resolve(`${read}:${hash.digest('hex')}`));
  });
}

/**
 * Busca archivos duplicados por contenido.
 * 1) agrupa por tamaño, 2) compara los primeros 64 KB, 3) compara el archivo entero.
 */
async function duplicates(root, opts = {}, onProgress) {
  const { minSize = 1024 * 1024, maxFiles = 200000 } = opts;

  const bySize = new Map();
  const total = await walk(
    root,
    (file) => {
      if (file.size < minSize) return;
      const list = bySize.get(file.size) || [];
      list.push(file);
      bySize.set(file.size, list);
      if (onProgress && list.length === 1 && bySize.size % 40 === 0) {
        onProgress({ phase: 'leyendo', files: bySize.size });
      }
    },
    { maxFiles }
  );

  const candidates = [...bySize.values()].filter((list) => list.length > 1);
  const groups = [];
  let processed = 0;

  for (const list of candidates) {
    // Segundo filtro: primeros 64 KB.
    const byHead = new Map();
    for (const file of list) {
      const head = await hashFile(file.path, 65536);
      if (!head) continue;
      const bucket = byHead.get(head) || [];
      bucket.push(file);
      byHead.set(head, bucket);
    }

    for (const bucket of byHead.values()) {
      if (bucket.length < 2) continue;

      // Tercer filtro: archivo completo.
      const byFull = new Map();
      for (const file of bucket) {
        const full = await hashFile(file.path, 0);
        if (!full) continue;
        const same = byFull.get(full) || [];
        same.push(file);
        byFull.set(full, same);
      }

      for (const same of byFull.values()) {
        if (same.length < 2) continue;
        const wasted = same[0].size * (same.length - 1);
        groups.push({
          size: same[0].size,
          wasted,
          files: same
            .sort((a, b) => a.path.length - b.path.length)
            .map((f) => ({ path: f.path, size: f.size, modified: f.modified })),
        });
      }
    }

    processed++;
    if (onProgress) {
      onProgress({ phase: 'comparando', done: processed, total: candidates.length });
    }
  }

  groups.sort((a, b) => b.wasted - a.wasted);

  return {
    scanned: total,
    groups,
    wasted: groups.reduce((sum, g) => sum + g.wasted, 0),
  };
}

/** Tamaño de cada carpeta de primer nivel dentro de root. */
async function diskUsage(root, opts = {}) {
  const { budgetMs = 25000 } = opts;
  const start = Date.now();
  const children = [];
  let partial = false;

  let entries = [];
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch (e) {
    return { root, children: [], total: 0, partial: false, error: String(e.message || e) };
  }

  for (const entry of entries) {
    if (Date.now() - start > budgetMs) {
      partial = true;
      break;
    }
    const full = path.join(root, entry.name);
    if (entry.isSymbolicLink()) continue;

    if (entry.isFile()) {
      let st;
      try {
        st = await fs.lstat(full);
      } catch {
        continue;
      }
      children.push({ name: entry.name, path: full, bytes: st.size, dir: false });
      continue;
    }

    if (!entry.isDirectory()) continue;

    let bytes = 0;
    await walk(
      full,
      (file) => {
        bytes += file.size;
      },
      { maxDepth: 12, maxFiles: 120000 }
    );
    children.push({ name: entry.name, path: full, bytes, dir: true });
  }

  children.sort((a, b) => b.bytes - a.bytes);
  return {
    root,
    children,
    total: children.reduce((sum, c) => sum + c.bytes, 0),
    partial,
    error: '',
  };
}

/** Archivos más grandes a partir de un tamaño mínimo. */
async function bigFiles(root, opts = {}) {
  const { minSize = 100 * 1024 * 1024, limit = 200, budgetMs = 40000 } = opts;
  const start = Date.now();
  const found = [];

  await walk(
    root,
    (file) => {
      if (file.size >= minSize && Date.now() - start < budgetMs) {
        found.push(file);
      }
    },
    { maxDepth: 14, maxFiles: 400000 }
  );

  found.sort((a, b) => b.size - a.size);
  return {
    items: found.slice(0, limit).map((f) => ({ path: f.path, size: f.size, pretty: human(f.size), modified: f.modified })),
    total: found.reduce((sum, f) => sum + f.size, 0),
    partial: Date.now() - start >= budgetMs,
  };
}

module.exports = { duplicates, diskUsage, bigFiles, recycle };
