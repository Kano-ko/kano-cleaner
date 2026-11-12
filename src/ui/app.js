'use strict';
// Interfaz de Kano Cleaner. Sin frameworks: DOM a mano y llamadas a window.kano.

const api = window.kano;

/* ============================================================
   Utilidades
   ============================================================ */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

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

function fecha(ms) {
  if (!ms) return '';
  const d = new Date(ms);
  return d.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const ICON = {
  chequeo: '<path d="M12 3.2 20 6.4v5.9c0 4.6-3.4 8.4-8 9.5-4.6-1.1-8-4.9-8-9.5V6.4L12 3.2Z"/><path d="m8.7 12.2 2.2 2.3 4.4-4.7"/>',
  limpieza: '<path d="M4.5 19.5h8"/><path d="M6.8 19.5 9.4 9.2"/><path d="M9.4 9.2 11.2 4h3.6l1.6 5.2"/><path d="M13.2 9.2h3.6l1.2 4.3"/><path d="M18 13.5v6"/>',
  desinstalar: '<path d="M4 7h16"/><path d="M9 7V4.8h6V7"/><path d="M6.5 7l1 12.2h9L17.5 7"/><path d="M10 10.5v5.5M14 10.5v5.5"/>',
  duplicados: '<rect x="8.5" y="8.5" width="11" height="11" rx="2.2"/><path d="M15.5 8.5v-2A2 2 0 0 0 13.5 4.5h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/>',
  disco: '<ellipse cx="12" cy="6" rx="7.5" ry="2.8"/><path d="M4.5 6v6c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V6"/><path d="M4.5 12v6c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8v-6"/>',
  rendimiento: '<path d="M4 18a8 8 0 1 1 16 0"/><path d="M12 14.5 15.6 10"/><circle cx="12" cy="15" r="1.4"/>',
  inicio: '<path d="M12 3v9"/><path d="M7.2 5.6a8 8 0 1 0 9.6 0"/>',
  actualizar: '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/>',
  controlador: '<rect x="6" y="6" width="12" height="12" rx="2.5"/><path d="M9.5 3.5v2.5M14.5 3.5v2.5M9.5 18v2.5M14.5 18v2.5M3.5 9.5H6M3.5 14.5H6M18 9.5h2.5M18 14.5h2.5"/>',
  seguridad: '<path d="M12 3 19.5 6v5.5c0 4.3-3.1 7.8-7.5 9-4.4-1.2-7.5-4.7-7.5-9V6L12 3Z"/><path d="M12 9v3.5M12 15.5v.1"/>',
  config: '<circle cx="12" cy="12" r="3"/><path d="M19.4 14.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5v.2a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"/>',
  ayuda: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .9-1 1.6v.4"/><path d="M12 17v.1"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  alerta: '<path d="M12 4 21 20H3L12 4Z"/><path d="M12 10v4M12 17v.1"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8v.1"/>',
  carpeta: '<path d="M3.5 7.5a2 2 0 0 1 2-2h3.2l2 2.2h7.8a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z"/>',
  buscar: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
  play: '<path d="M8 5.5 18.5 12 8 18.5Z"/>',
  basura: '<path d="M4 7h16"/><path d="M9 7V4.8h6V7"/><path d="M6.5 7l1 12.2h9L17.5 7"/>',
  escudo: '<path d="M12 3 19.5 6v5.5c0 4.3-3.1 7.8-7.5 9-4.4-1.2-7.5-4.7-7.5-9V6L12 3Z"/>',
  rayo: '<path d="M13 3 5 13.5h6L11 21l8-10.5h-6L13 3Z"/>',
  reloj: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  candado: '<rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
};

function svg(name, cls = 'icon') {
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[name] || ''}</svg>`;
}

/* ============================================================
   Estado
   ============================================================ */

const state = {
  view: 'chequeo',
  info: null,
  theme: localStorage.getItem('kano-theme') || 'dark',
  lastRun: (() => {
    try {
      return JSON.parse(localStorage.getItem('kano-last-run') || 'null');
    } catch {
      return null;
    }
  })(),
  junk: [],
  privacy: [],
  apps: [],
  startup: [],
  duplicates: null,
  disk: null,
  security: null,
  chequeo: null,
};

const NAV = [
  { id: 'chequeo', label: 'Chequeo', icon: 'chequeo' },
  { id: 'limpieza', label: 'Limpieza', icon: 'limpieza' },
  { id: 'desinstalador', label: 'Desinstalador', icon: 'desinstalar' },
  { id: 'duplicados', label: 'Buscador de duplicados', icon: 'duplicados' },
  { id: 'disco', label: 'Uso del disco', icon: 'disco' },
  { id: 'rendimiento', label: 'Rendimiento', icon: 'rendimiento' },
  { id: 'inicio', label: 'Administrador de inicio', icon: 'inicio' },
  { id: 'actualizaciones', label: 'Actualizaciones', icon: 'actualizar' },
  { id: 'controladores', label: 'Dispositivos y controladores', icon: 'controlador' },
  { id: 'seguridad', label: 'Seguridad', icon: 'seguridad' },
];

/* ============================================================
   Piezas de interfaz
   ============================================================ */

function pageHead(title, sub) {
  return `<div class="page-head">
    <h1 class="page-title">${esc(title)}</h1>
    ${sub ? `<p class="page-sub">${sub}</p>` : ''}
  </div>`;
}

function notice(kind, html) {
  const icon = kind === 'ok' ? 'check' : kind === 'bad' ? 'alerta' : kind === 'warn' ? 'alerta' : 'info';
  return `<div class="notice notice-${kind}">${svg(icon)}<div>${html}</div></div>`;
}

function toast(message, kind = 'info', ms = 4200) {
  const box = document.createElement('div');
  box.className = `toast ${kind}`;
  box.textContent = message;
  $('#toasts').appendChild(box);
  setTimeout(() => {
    box.style.opacity = '0';
    box.style.transition = 'opacity .2s ease';
    setTimeout(() => box.remove(), 220);
  }, ms);
}

function closeModal() {
  const root = $('#modalRoot');
  root.innerHTML = '';
  root.onclick = null;
}

function confirmDialog({ title, text, confirm = 'Continuar', danger = false }) {
  return new Promise((resolve) => {
    $('#modalRoot').innerHTML = `
      <div class="overlay">
        <div class="dialog" role="dialog" aria-modal="true">
          <h2>${esc(title)}</h2>
          <p>${text}</p>
          <div class="dialog-actions">
            <button class="btn btn-ghost" data-modal="cancel">Cancelar</button>
            <button class="btn ${danger ? 'btn-danger' : ''}" data-modal="ok">${esc(confirm)}</button>
          </div>
        </div>
      </div>`;
    $('#modalRoot').onclick = (e) => {
      const action = e.target.closest('[data-modal]')?.dataset.modal;
      if (action) {
        closeModal();
        resolve(action === 'ok');
      }
      if (e.target.classList.contains('overlay')) {
        closeModal();
        resolve(false);
      }
    };
  });
}

function infoDialog({ title, body }) {
  $('#modalRoot').innerHTML = `
    <div class="overlay">
      <div class="dialog" role="dialog" aria-modal="true">
        <h2>${esc(title)}</h2>
        ${body}
        <div class="dialog-actions">
          <button class="btn" data-modal="ok">Entendido</button>
        </div>
      </div>
    </div>`;
  $('#modalRoot').onclick = (e) => {
    if (e.target.closest('[data-modal]') || e.target.classList.contains('overlay')) closeModal();
  };
}

function progressLine(label) {
  return `<div class="progress-line" id="progressLine">
    <div class="spinner"></div>
    <span id="progressText">${esc(label)}</span>
    <div class="bar"><i id="progressBar" style="width:8%"></i></div>
  </div>`;
}

function emptyState(text, iconName = 'carpeta') {
  return `<div class="empty">${svg(iconName)}<div>${esc(text)}</div></div>`;
}

function levelBadge(level) {
  const kind = level === 'óptimo' ? 'ok' : level === 'bueno' ? 'ok' : level === 'mejorable' ? 'warn' : 'bad';
  return `<span class="level level-${kind}">${esc(level)}</span>`;
}

/* ============================================================
   Navegación
   ============================================================ */

function renderSidebar() {
  const items = NAV.map(
    (n) => `<button class="nav-item ${state.view === n.id ? 'active' : ''}" data-action="nav" data-view="${n.id}">
      ${svg(n.icon)}<span>${esc(n.label)}</span>
    </button>`
  ).join('');

  $('#sidebar').innerHTML = `
    ${items}
    <div class="nav-sep"></div>
    <button class="nav-item ${state.view === 'config' ? 'active' : ''}" data-action="nav" data-view="config">${svg('config')}<span>Configuración</span></button>
    <button class="nav-item ${state.view === 'ayuda' ? 'active' : ''}" data-action="nav" data-view="ayuda">${svg('ayuda')}<span>Ayuda</span></button>
    <div class="nav-grow"></div>
    <div class="nav-label">Kano Cleaner ${esc(state.info?.version || '')}</div>`;
}

const VIEWS = {};

async function go(view) {
  state.view = view;
  renderSidebar();
  const content = $('#content');
  content.scrollTop = 0;
  content.innerHTML = `<div class="empty"><div class="spinner"></div></div>`;
  try {
    await (VIEWS[view] || VIEWS.chequeo)();
  } catch (e) {
    content.innerHTML = pageHead('Algo ha fallado', '') + notice('bad', `<b>Error:</b> ${esc(e.message || e)}`);
  }
}

/* ============================================================
   Chequeo
   ============================================================ */

VIEWS.chequeo = async () => {
  const content = $('#content');
  const last = state.lastRun;

  content.innerHTML = `
    ${pageHead('Chequeo', 'Una pasada rápida para saber cómo está el equipo y qué se puede arreglar.')}
    <div class="hero">
      <h1>Es el momento de realizar tu<br /><b>Chequeo</b></h1>
      <p>Revisa archivos basura, rastros de privacidad, programas de inicio y el estado del antivirus. Sin anuncios y sin versión de pago.</p>
      ${
        last
          ? `<div class="last-run">
              <div>La última vez se encontró<b>${esc(last.pretty)} de archivos no deseados</b></div>
              <div>Y<b>${esc(last.count.toLocaleString('es-ES'))} archivos que limpiar</b></div>
            </div>`
          : ''
      }
      <div><button class="btn" data-action="chequeo-run">${svg('play')}Analizar ahora</button></div>
    </div>`;
};

VIEWS.chequeoRun = async () => {
  const content = $('#content');
  content.innerHTML = `
    ${pageHead('Chequeo en marcha', 'No cierres la ventana. Tarda entre unos segundos y un par de minutos.')}
    <div class="card">
      ${progressLine('Preparando el análisis…')}
      <div class="group-title">Qué se está revisando</div>
      <div class="list" id="chequeoSteps">
        ${['Archivos basura', 'Rastros de privacidad', 'Programas de inicio', 'Seguridad', 'Estado del equipo']
          .map((t) => `<div class="list-row" data-step="${esc(t)}"><span class="grow list-name">${esc(t)}</span><span class="badge">En espera</span></div>`)
          .join('')}
      </div>
    </div>`;

  const result = await api.chequeo();
  state.chequeo = result;
  state.lastRun = { pretty: result.junk.pretty, count: result.junk.count, when: Date.now() };
  localStorage.setItem('kano-last-run', JSON.stringify(state.lastRun));
  renderChequeoResult(result);
};

function renderChequeoResult(r) {
  const content = $('#content');
  const circumference = 2 * Math.PI * 70;
  const offset = circumference * (1 - r.score / 100);
  const color = r.score >= 85 ? 'var(--green)' : r.score >= 65 ? 'var(--accent)' : r.score >= 40 ? 'var(--amber)' : 'var(--red)';

  const stats = [
    { label: 'Archivos no deseados', value: r.junk.pretty, hint: `${r.junk.count.toLocaleString('es-ES')} archivos`, icon: 'basura' },
    { label: 'Rastros de privacidad', value: String(r.privacy.count.toLocaleString('es-ES')), hint: 'historial, cookies y recientes', icon: 'reloj' },
    { label: 'Programas de inicio', value: String(r.startup.enabled), hint: `de ${r.startup.total} en total`, icon: 'inicio' },
    { label: 'Avisos de seguridad', value: String(r.security.findings.length), hint: 'revisa la sección Seguridad', icon: 'escudo' },
  ];

  content.innerHTML = `
    ${pageHead('Resultado del chequeo', 'Esto es lo que se ha encontrado. Nada se ha borrado todavía.')}
    <div class="card">
      <div class="score-wrap">
        <div class="ring">
          <svg viewBox="0 0 160 160">
            <circle class="ring-track" cx="80" cy="80" r="70"></circle>
            <circle class="ring-value" cx="80" cy="80" r="70"
              stroke="${color}"
              stroke-dasharray="${circumference.toFixed(1)}"
              stroke-dashoffset="${offset.toFixed(1)}"></circle>
          </svg>
          <div class="ring-text"><strong>${r.score}</strong><span>de 100</span></div>
        </div>
        <div style="flex:1;min-width:280px">
          <div class="row" style="margin-bottom:10px">
            <h2 class="page-title" style="font-size:20px;margin:0">Tu dispositivo tiene ${r.problems} ${r.problems === 1 ? 'problema' : 'problemas'}</h2>
            ${levelBadge(r.level)}
          </div>
          <p class="page-sub" style="margin-bottom:16px">Estado general: <b>${esc(r.level)}</b>. ${
            r.problems === 0 ? 'No hay nada urgente que arreglar.' : 'Puedes solucionar lo seguro con un clic y revisar el resto con calma.'
          }</p>
          <div class="row">
            <button class="btn" data-action="chequeo-fix" ${r.problems === 0 ? 'disabled' : ''}>${svg('check')}Solucionar lo seguro</button>
            <button class="btn btn-ghost" data-action="chequeo-run">${svg('play')}Repetir chequeo</button>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-4" style="margin-top:14px">
      ${stats
        .map(
          (s) => `<div class="stat">
            <div class="stat-label">${svg(s.icon)}${esc(s.label)}</div>
            <div class="stat-value">${esc(s.value)}</div>
            <div class="stat-hint">${esc(s.hint)}</div>
          </div>`
        )
        .join('')}
    </div>

    ${
      r.disk
        ? `<div class="card" style="margin-top:14px">
            <div class="row-between" style="margin-bottom:10px">
              <div>
                <h3 class="card-title">Disco ${esc(r.disk.letra)}</h3>
                <p class="card-sub" style="margin:0">${esc(r.disk.prettyLibre)} libres de ${human(r.disk.total)}</p>
              </div>
              <span class="badge ${r.disk.librePct < 10 ? 'badge-bad' : r.disk.librePct < 20 ? 'badge-warn' : 'badge-ok'}">${Math.round(r.disk.librePct)}% libre</span>
            </div>
            <div class="bar ${r.disk.librePct < 10 ? 'red' : r.disk.librePct < 20 ? 'amber' : ''}"><i style="width:${Math.min(100, 100 - r.disk.librePct)}%"></i></div>
          </div>`
        : ''
    }

    <div class="card" style="margin-top:14px">
      <h3 class="card-title">Archivos que se pueden borrar</h3>
      <p class="card-sub">Los de riesgo bajo son seguros. Los marcados como "con cuidado" conviene revisarlos antes.</p>
      <div class="list">
        ${r.junk.categories
          .filter((c) => c.bytes > 0)
          .sort((a, b) => b.bytes - a.bytes)
          .map(
            (c) => `<div class="list-row">
              <div class="grow">
                <div class="list-name">${esc(c.name)} ${c.risk === 'caution' ? '<span class="badge badge-warn">con cuidado</span>' : ''}</div>
                <div class="list-hint">${esc(c.hint)}</div>
              </div>
              <span class="list-size">${human(c.bytes)}</span>
            </div>`
          )
          .join('') || emptyState('No se ha encontrado basura. Bien.', 'check')}
      </div>
    </div>

    ${
      r.security.findings.length
        ? `<div class="card" style="margin-top:14px">
            <h3 class="card-title">Avisos de seguridad</h3>
            <p class="card-sub">Comprobaciones propias, además de lo que vigila Windows Defender.</p>
            <div class="list">
              ${r.security.findings
                .map(
                  (f) => `<div class="list-row">
                    <span class="badge ${f.severity === 'alta' ? 'badge-bad' : 'badge-warn'}">${esc(f.severity)}</span>
                    <div class="grow"><div class="list-name">${esc(f.title)}</div><div class="list-hint">${esc(f.detail)}</div></div>
                  </div>`
                )
                .join('')}
            </div>
          </div>`
        : ''
    }`;
}

/* ============================================================
   Limpieza
   ============================================================ */

VIEWS.limpieza = async () => {
  renderLimpieza();
  if (!state.junk.length) await scanLimpieza('junk');
  if (!state.privacy.length) await scanLimpieza('privacy');
  renderLimpieza();
};

async function scanLimpieza(kind) {
  const label = kind === 'junk' ? 'buscando archivos basura…' : 'buscando rastros de privacidad…';
  const box = $('#scanStatus');
  if (box) box.innerHTML = progressLine(label);

  const data = kind === 'junk' ? await api.scanJunk() : await api.scanPrivacy();
  if (kind === 'junk') state.junk = data;
  else state.privacy = data;
  renderLimpieza();
}

function categoryGroups(cats, kind) {
  const groups = {};
  for (const c of cats) {
    if (!groups[c.group]) groups[c.group] = [];
    groups[c.group].push(c);
  }

  return Object.entries(groups)
    .map(([group, list]) => {
      const total = list.reduce((s, c) => s + (c.bytes || 0), 0);
      const hasData = list.some((c) => (c.bytes || 0) > 0 || c.special);
      return `<div class="group-title">${esc(group)} <span class="muted" style="text-transform:none;letter-spacing:0;font-weight:400">· ${human(total)}</span></div>
        <div class="card" style="padding:6px 18px">
          <div class="list">
            ${list
              .map(
                (c) => `<div class="list-row">
                  <label class="check">
                    <input type="checkbox" data-cat="${esc(kind)}" value="${esc(c.id)}" ${c.empty ? 'disabled' : ''} ${hasData && !c.empty ? 'checked' : ''} />
                  </label>
                  <div class="grow">
                    <div class="list-name">${esc(c.name)}
                      ${c.risk === 'caution' ? '<span class="badge badge-warn">con cuidado</span>' : ''}
                      ${c.needsAdmin ? `<span class="badge" title="Necesita administrador">${svg('candado', 'icon')}</span>` : ''}
                    </div>
                    <div class="list-hint">${esc(c.hint)}</div>
                  </div>
                  <span class="list-size">${c.special === 'dns' ? '—' : human(c.bytes || 0)}</span>
                </div>`
              )
              .join('')}
          </div>
        </div>`;
    })
    .join('');
}

function selectedTotal(kind) {
  const map = new Map((kind === 'junk' ? state.junk : state.privacy).map((c) => [c.id, c]));
  return $$(`input[data-cat="${kind}"]:checked`).reduce((sum, input) => sum + (map.get(input.value)?.bytes || 0), 0);
}

function updateTotals() {
  const junk = selectedTotal('junk');
  const privacy = selectedTotal('privacy');
  const junkEl = $('#totalJunk');
  const privEl = $('#totalPrivacy');
  const bothEl = $('#totalAll');
  if (junkEl) junkEl.textContent = human(junk);
  if (privEl) privEl.textContent = human(privacy);
  if (bothEl) bothEl.textContent = human(junk + privacy);
  $$('[data-action="clean-selected"]').forEach((b) => {
    b.disabled = junk + privacy === 0;
  });
}

function renderLimpieza() {
  const content = $('#content');
  content.innerHTML = `
    ${pageHead('Limpieza', 'Marca lo que quieras borrar. Nada se toca hasta que pulses el botón.')}
    ${notice('info', 'Los archivos en uso (por ejemplo, con el navegador abierto) se respetan y se informa de cuántos han quedado.')}
    <div id="scanStatus" style="margin-top:14px"></div>

    <div class="row-between" style="margin-top:22px">
      <h2 class="page-title" style="font-size:18px;margin:0">Archivos basura <span class="muted small">· <span id="totalJunk">0 B</span></span></h2>
      <button class="btn btn-ghost btn-sm" data-action="scan" data-kind="junk">${svg('buscar')}Volver a analizar</button>
    </div>
    ${categoryGroups(state.junk, 'junk')}

    <div class="row-between" style="margin-top:26px">
      <h2 class="page-title" style="font-size:18px;margin:0">Privacidad <span class="muted small">· <span id="totalPrivacy">0 B</span></span></h2>
      <button class="btn btn-ghost btn-sm" data-action="scan" data-kind="privacy">${svg('buscar')}Volver a analizar</button>
    </div>
    ${categoryGroups(state.privacy, 'privacy')}

    <div class="card" style="margin-top:20px;position:sticky;bottom:0;display:flex;align-items:center;gap:16px;flex-wrap:wrap">
      <div style="flex:1;min-width:200px">
        <div class="stat-label">Seleccionado</div>
        <div class="stat-value" id="totalAll">0 B</div>
      </div>
      <button class="btn" data-action="clean-selected" disabled>${svg('basura')}Limpiar lo seleccionado</button>
    </div>`;

  updateTotals();
}

/* ============================================================
   Desinstalador
   ============================================================ */

VIEWS.desinstalador = async () => {
  const content = $('#content');
  content.innerHTML = `${pageHead('Desinstalador', 'Programas instalados según el registro de Windows.')}${progressLine('Leyendo la lista de programas…')}`;
  if (!state.apps.length) state.apps = await api.appsList();
  renderApps();
};

function renderApps() {
  const content = $('#content');
  const total = state.apps.reduce((s, a) => s + (a.sizeBytes || 0), 0);
  content.innerHTML = `
    ${pageHead('Desinstalador', `${state.apps.length} programas instalados. Ocupan unos ${human(total)} según Windows.`)}
    <div class="row" style="margin-bottom:14px">
      <div class="search-wrap" style="flex:1;max-width:420px">
        ${svg('buscar')}
        <input class="input input-search" id="appSearch" placeholder="Buscar por nombre o editorial…" style="width:100%" />
      </div>
      <button class="btn btn-ghost btn-sm" data-action="apps-refresh">${svg('actualizar')}Actualizar lista</button>
    </div>
    <div class="card" style="padding:0;overflow:hidden">
      <div style="max-height:calc(100vh - 260px);overflow:auto">
        <table class="table">
          <thead><tr><th>Programa</th><th>Editorial</th><th>Versión</th><th class="num">Tamaño</th><th></th></tr></thead>
          <tbody id="appsBody"></tbody>
        </table>
      </div>
    </div>`;

  const input = $('#appSearch');
  input.addEventListener('input', () => fillApps(input.value));
  fillApps('');
}

function fillApps(filter) {
  const needle = filter.trim().toLowerCase();
  const rows = state.apps.filter(
    (a) => !needle || a.name.toLowerCase().includes(needle) || a.publisher.toLowerCase().includes(needle)
  );

  $('#appsBody').innerHTML =
    rows
      .map(
        (a, i) => `<tr>
          <td class="name">${esc(a.name)}</td>
          <td class="muted">${esc(a.publisher || '—')}</td>
          <td class="muted">${esc(a.version || '—')}</td>
          <td class="num">${a.sizeBytes ? human(a.sizeBytes) : '—'}</td>
          <td class="num" style="white-space:nowrap">
            <button class="btn btn-ghost btn-sm" data-action="app-leftovers" data-index="${state.apps.indexOf(a)}">Restos</button>
            <button class="btn btn-soft btn-sm" data-action="app-uninstall" data-index="${state.apps.indexOf(a)}">Desinstalar</button>
          </td>
        </tr>`
      )
      .join('') || `<tr><td colspan="5">${emptyState('Ningún programa coincide.', 'buscar')}</td></tr>`;
}

async function appUninstall(index) {
  const app = state.apps[index];
  if (!app) return;
  const ok = await confirmDialog({
    title: `¿Desinstalar ${app.name}?`,
    text: 'Se abrirá el desinstalador del propio programa. Kano Cleaner no borra nada por su cuenta. Si Windows pide permisos, acéptalos.',
    confirm: 'Abrir desinstalador',
    danger: true,
  });
  if (!ok) return;
  const r = await api.appsUninstall(app);
  if (r.ok) toast('Desinstalador abierto. Sigue sus pasos.', 'ok');
  else toast(r.error || 'No se pudo abrir el desinstalador.', 'bad');
}

async function appLeftovers(index) {
  const app = state.apps[index];
  if (!app) return;
  $('#modalRoot').innerHTML = `<div class="overlay"><div class="dialog"><h2>Buscando restos…</h2><div class="progress-line">${svg('buscar')}<span>Revisando carpetas y registro</span></div></div></div>`;

  const found = await api.appsLeftovers(app);
  const folders = found.filter((f) => f.kind === 'carpeta');
  const regs = found.filter((f) => f.kind === 'registro');

  $('#modalRoot').innerHTML = `
    <div class="overlay">
      <div class="dialog" role="dialog" aria-modal="true">
        <h2>Restos de ${esc(app.name)}</h2>
        <p>Cosas que se quedan cuando un programa se desinstala mal. Las carpetas se envían a la papelera; las claves de registro solo se muestran, no se borran solas.</p>
        ${
          folders.length
            ? `<div class="group-title">Carpetas</div>
               <div class="list">${folders
                 .map(
                   (f, i) => `<div class="list-row">
                     <label class="check"><input type="checkbox" data-leftover value="${esc(f.path)}" checked /></label>
                     <div class="grow"><div class="list-name mono">${esc(f.path)}</div><div class="list-hint">${esc(f.why)}</div></div>
                   </div>`
                 )
                 .join('')}</div>`
            : ''
        }
        ${
          regs.length
            ? `<div class="group-title">Claves de registro (información)</div>
               <div class="list">${regs
                 .map(
                   (f) => `<div class="list-row"><div class="grow"><div class="list-name mono">${esc(f.path)}</div><div class="list-hint">${esc(f.why)}</div></div></div>`
                 )
                 .join('')}</div>`
            : ''
        }
        ${!found.length ? emptyState('No se han encontrado restos claros. Mejor así.', 'check') : ''}
        <div class="dialog-actions">
          <button class="btn btn-ghost" data-modal="cancel">Cerrar</button>
          ${folders.length ? '<button class="btn btn-danger" data-modal="trash">Enviar carpetas a la papelera</button>' : ''}
        </div>
      </div>
    </div>`;

  $('#modalRoot').onclick = async (e) => {
    const action = e.target.closest('[data-modal]')?.dataset.modal;
    if (action === 'cancel' || e.target.classList.contains('overlay')) closeModal();
    if (action === 'trash') {
      const paths = $$('[data-leftover]:checked').map((i) => i.value);
      if (!paths.length) return closeModal();
      const r = await api.appsRecycle(paths);
      closeModal();
      toast(`${r.count} carpetas enviadas a la papelera.`, 'ok');
    }
  };
}

/* ============================================================
   Duplicados
   ============================================================ */

VIEWS.duplicados = async () => {
  const content = $('#content');
  content.innerHTML = `
    ${pageHead('Buscador de duplicados', 'Encuentra archivos idénticos por contenido, no solo por nombre.')}
    <div class="card">
      <div class="row" style="align-items:flex-end">
        <div style="flex:1;min-width:240px">
          <div class="stat-label">Carpeta a revisar</div>
          <div class="path-box"><span id="dupFolder">${esc(state.dupFolder || 'Ninguna carpeta elegida')}</span></div>
        </div>
        <button class="btn btn-ghost" data-action="pick-dup">${svg('carpeta')}Elegir carpeta</button>
        <div>
          <div class="stat-label">Tamaño mínimo</div>
          <select class="select" id="dupMinSize">
            <option value="102400">100 KB</option>
            <option value="1048576" selected>1 MB</option>
            <option value="10485760">10 MB</option>
            <option value="104857600">100 MB</option>
          </select>
        </div>
        <button class="btn" data-action="run-duplicates">${svg('buscar')}Buscar</button>
      </div>
    </div>
    <div id="dupResults" style="margin-top:14px">
      ${notice('info', 'Se comparan primero los tamaños y luego el contenido real, así que no hay falsos positivos. Los archivos se envían a la papelera, nunca se borran del todo.')}
    </div>`;
};

async function runDuplicates() {
  const folder = state.dupFolder;
  if (!folder) return toast('Elige primero una carpeta.', 'bad');
  const minSize = Number($('#dupMinSize').value);
  const box = $('#dupResults');
  box.innerHTML = `<div class="card">${progressLine('Leyendo archivos…')}</div>`;

  const result = await api.duplicates({ folder, minSize });
  state.duplicates = result;
  renderDuplicates();
}

function renderDuplicates() {
  const r = state.duplicates;
  const box = $('#dupResults');
  if (!r || r.error) {
    box.innerHTML = notice('bad', esc(r?.error || 'No se pudo analizar.'));
    return;
  }
  if (!r.groups.length) {
    box.innerHTML = `<div class="card">${emptyState('No hay duplicados con ese tamaño mínimo. Buen trabajo.', 'check')}</div>`;
    return;
  }

  box.innerHTML = `
    <div class="row-between" style="margin-bottom:12px">
      <div>
        <h2 class="page-title" style="font-size:18px;margin:0">${r.groups.length} grupos de duplicados</h2>
        <p class="page-sub" style="margin:4px 0 0">Se pueden recuperar <b>${human(r.wasted)}</b> conservando una copia de cada grupo.</p>
      </div>
      <button class="btn btn-danger" data-action="trash-duplicates">${svg('basura')}Enviar seleccionados a la papelera</button>
    </div>
    ${r.groups
      .slice(0, 300)
      .map(
        (g, gi) => `<div class="card" style="margin-bottom:10px">
          <div class="row-between" style="margin-bottom:8px">
            <div class="list-name">${human(g.size)} por archivo · ${g.files.length} copias</div>
            <span class="badge badge-warn">${human(g.wasted)} recuperables</span>
          </div>
          <div class="list">
            ${g.files
              .map(
                (f, fi) => `<div class="list-row">
                  <label class="check">
                    <input type="checkbox" data-dup="${esc(f.path)}" ${fi === 0 ? '' : 'checked'} />
                  </label>
                  <div class="grow">
                    <div class="list-name mono ellipsis" title="${esc(f.path)}">${esc(f.path)}</div>
                    <div class="list-hint">${fi === 0 ? 'Se conserva esta copia' : `Modificado: ${fecha(f.modified)}`}</div>
                  </div>
                  <button class="btn btn-ghost btn-sm" data-action="show-folder" data-path="${esc(f.path)}">Abrir</button>
                </div>`
              )
              .join('')}
          </div>
        </div>`
      )
      .join('')}`;
}

async function trashDuplicates() {
  const paths = $$('[data-dup]:checked').map((i) => i.dataset.dup);
  if (!paths.length) return toast('No hay nada marcado.', 'info');
  const ok = await confirmDialog({
    title: '¿Enviar a la papelera?',
    text: `Se enviarán <b>${paths.length} archivos</b> a la papelera de reciclaje. Podrás recuperarlos desde ella.`,
    confirm: 'Enviar a la papelera',
    danger: true,
  });
  if (!ok) return;
  const r = await api.recycle(paths);
  toast(`${r.count} archivos enviados a la papelera.`, 'ok');
  runDuplicates();
}

/* ============================================================
   Uso del disco
   ============================================================ */

VIEWS.disco = async () => {
  const content = $('#content');
  content.innerHTML = `
    ${pageHead('Uso del disco', 'Mira qué carpetas ocupan más y localiza archivos enormes.')}
    <div class="card">
      <div class="row" style="align-items:flex-end">
        <div style="flex:1;min-width:240px">
          <div class="stat-label">Carpeta o unidad</div>
          <div class="path-box"><span id="diskFolder">${esc(state.diskFolder || 'C:\\')}</span></div>
        </div>
        <button class="btn btn-ghost" data-action="pick-disk">${svg('carpeta')}Cambiar</button>
        <button class="btn" data-action="run-disk">${svg('disco')}Analizar</button>
      </div>
    </div>
    <div id="diskResults" style="margin-top:14px"></div>`;

  if (state.disk) renderDisk();
  else $('#diskResults').innerHTML = notice('info', 'Pulsa <b>Analizar</b>. En unidades grandes puede tardar un poco; se detiene solo a los 25 segundos y avisa de que el resultado es parcial.');
};

function renderDisk() {
  const d = state.disk;
  const box = $('#diskResults');
  if (!d) return;
  const max = Math.max(1, ...d.children.map((c) => c.bytes));

  box.innerHTML = `
    <div class="card">
      <div class="row-between" style="margin-bottom:12px">
        <div>
          <h3 class="card-title">${esc(d.root)}</h3>
          <p class="card-sub" style="margin:0">${human(d.total)} en total${d.partial ? ' · análisis parcial por tiempo' : ''}</p>
        </div>
      </div>
      <div class="list">
        ${d.children
          .slice(0, 40)
          .map(
            (c) => `<div class="list-row" style="align-items:flex-start">
              <div class="grow">
                <div class="row-between" style="gap:10px">
                  <div class="list-name">${esc(c.name)}</div>
                  <div class="list-size">${human(c.bytes)}</div>
                </div>
                <div class="bar" style="margin-top:6px"><i style="width:${Math.max(1, (c.bytes / max) * 100)}%"></i></div>
              </div>
              <button class="btn btn-ghost btn-sm" data-action="open-path" data-path="${esc(c.path)}">Abrir</button>
            </div>`
          )
          .join('') || emptyState('No se ha podido leer esa carpeta.', 'carpeta')}
      </div>
    </div>

    <div class="card" style="margin-top:14px">
      <div class="row-between">
        <div>
          <h3 class="card-title">Archivos grandes (más de 100 MB)</h3>
          <p class="card-sub" style="margin:0">Ordenados de mayor a menor.</p>
        </div>
        <button class="btn btn-ghost btn-sm" data-action="run-big">${svg('buscar')}Buscar</button>
      </div>
      <div id="bigFiles" class="list"></div>
    </div>`;
}

/* ============================================================
   Rendimiento
   ============================================================ */

VIEWS.rendimiento = async () => {
  const content = $('#content');
  content.innerHTML = `${pageHead('Rendimiento', 'Qué está usando la memoria ahora mismo.')}${progressLine('Consultando procesos…')}`;
  const [info, procs] = await Promise.all([api.healthInfo(), api.processes()]);
  const usedPct = info.memoria ? Math.round(((info.memoria.total - info.memoria.libre) / info.memoria.total) * 100) : 0;

  content.innerHTML = `
    ${pageHead('Rendimiento', 'Qué está usando la memoria ahora mismo.')}
    <div class="grid grid-3">
      <div class="stat">
        <div class="stat-label">${svg('rayo')}Memoria RAM</div>
        <div class="stat-value">${usedPct}%</div>
        <div class="bar ${usedPct > 85 ? 'red' : usedPct > 65 ? 'amber' : ''}" style="margin-top:10px"><i style="width:${usedPct}%"></i></div>
        <div class="stat-hint">${human(info.memoria.libre)} libres de ${human(info.memoria.total)}</div>
      </div>
      <div class="stat">
        <div class="stat-label">${svg('reloj')}Encendido</div>
        <div class="stat-value">${info.uptimeHoras} h</div>
        <div class="stat-hint">desde el último reinicio</div>
      </div>
      <div class="stat">
        <div class="stat-label">${svg('controlador')}Procesadores lógicos</div>
        <div class="stat-value">${info.cpu || '—'}</div>
        <div class="stat-hint">${esc(info.windows || '')} · build ${esc(info.build || '')}</div>
      </div>
    </div>

    <div class="card" style="margin-top:14px;padding:0;overflow:hidden">
      <div class="row-between" style="padding:16px 20px 10px">
        <h3 class="card-title" style="margin:0">Procesos que más memoria usan</h3>
        <button class="btn btn-ghost btn-sm" data-action="refresh-processes">${svg('actualizar')}Actualizar</button>
      </div>
      <table class="table">
        <thead><tr><th>Proceso</th><th>PID</th><th class="num">Memoria</th></tr></thead>
        <tbody>
          ${procs
            .map(
              (p) => `<tr>
                <td class="name">${esc(p.name)}<div class="list-hint mono ellipsis" title="${esc(p.path)}">${esc(p.path || '')}</div></td>
                <td class="muted">${p.pid}</td>
                <td class="num">${human(p.memory)}</td>
              </tr>`
            )
            .join('') || `<tr><td colspan="3">${emptyState('No se han podido leer los procesos.', 'rayo')}</td></tr>`}
        </tbody>
      </table>
    </div>

    ${notice('info', 'Kano Cleaner no cierra procesos por su cuenta: cerrar el equivocado puede perder trabajo sin guardar. Si algo va lento, usa el Administrador de tareas de Windows.')}`;
};

/* ============================================================
   Inicio
   ============================================================ */

VIEWS.inicio = async () => {
  const content = $('#content');
  content.innerHTML = `${pageHead('Administrador de inicio', 'Programas que se abren solos al encender el equipo.')}${progressLine('Leyendo el arranque…')}`;
  state.startup = await api.startupList();
  renderStartup();
};

function renderStartup() {
  const content = $('#content');
  const enabled = state.startup.filter((s) => s.enabled).length;

  content.innerHTML = `
    ${pageHead('Administrador de inicio', `${state.startup.length} entradas, ${enabled} activas. Desactivar algo no lo desinstala: se puede volver a activar.`)}
    ${
      state.info?.isAdmin
        ? ''
        : notice('warn', 'Estás sin permisos de administrador. Las entradas del equipo (HKLM) se ven, pero Windows puede impedir cambiarlas. Usa <b>Configuración → Reiniciar como administrador</b>.')
    }
    <div class="card" style="padding:0;overflow:hidden;margin-top:14px">
      <div style="max-height:calc(100vh - 250px);overflow:auto">
        <table class="table">
          <thead><tr><th style="width:56px">Activo</th><th>Programa</th><th>Origen</th><th>Firma</th><th></th></tr></thead>
          <tbody>
            ${state.startup
              .map(
                (s, i) => `<tr>
                  <td>
                    <label class="switch">
                      <input type="checkbox" data-startup="${i}" ${s.enabled ? 'checked' : ''} />
                      <span></span>
                    </label>
                  </td>
                  <td>
                    <div class="name">${esc(s.name)}</div>
                    <div class="list-hint mono ellipsis" title="${esc(s.exe || s.command)}">${esc(s.exe || s.command)}</div>
                  </td>
                  <td class="muted">${esc(s.scope)} · ${esc(s.type)}</td>
                  <td>${
                    s.signature === 'Valid'
                      ? '<span class="badge badge-ok">firmado</span>'
                      : s.signature
                        ? `<span class="badge ${s.signature === 'NotSigned' ? 'badge-warn' : 'badge-bad'}">${esc(s.signature)}</span>`
                        : '<span class="badge">—</span>'
                  }</td>
                  <td class="num">${s.exe ? `<button class="btn btn-ghost btn-sm" data-action="show-folder" data-path="${esc(s.exe)}">Carpeta</button>` : ''}</td>
                </tr>`
              )
              .join('') || `<tr><td colspan="5">${emptyState('No hay programas de inicio.', 'check')}</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>`;
}

/* ============================================================
   Actualizaciones (winget)
   ============================================================ */

VIEWS.actualizaciones = async () => {
  const content = $('#content');
  content.innerHTML = `
    ${pageHead('Actualizaciones', 'Usa winget, el gestor de programas de Windows, para actualizar lo que tengas instalado.')}
    <div class="card">
      <div class="row-between">
        <div>
          <h3 class="card-title">Buscar programas desactualizados</h3>
          <p class="card-sub" style="margin:0">Necesita conexión a internet. Tarda unos segundos.</p>
        </div>
        <button class="btn" data-action="winget-check">${svg('actualizar')}Buscar actualizaciones</button>
      </div>
    </div>
    <div id="wingetResults" style="margin-top:14px"></div>`;
};

async function wingetCheck() {
  const box = $('#wingetResults');
  box.innerHTML = `<div class="card">${progressLine('Consultando winget…')}</div>`;
  const r = await api.wingetList();
  state.winget = r;

  if (!r.available) {
    box.innerHTML = notice('bad', 'No se ha encontrado <b>winget</b> en este equipo. Viene con la aplicación <i>Instalador de aplicaciones</i> de Microsoft Store.');
    return;
  }

  box.innerHTML = `
    <div class="card" style="padding:0;overflow:hidden">
      <div class="row-between" style="padding:16px 20px 10px">
        <h3 class="card-title" style="margin:0">${r.items.length} actualizaciones disponibles</h3>
        ${r.items.length ? '<button class="btn btn-ghost btn-sm" data-action="winget-all">Actualizar todo</button>' : ''}
      </div>
      ${
        r.items.length
          ? `<table class="table">
              <thead><tr><th>Programa</th><th>Versión</th><th>Disponible</th><th></th></tr></thead>
              <tbody>
                ${r.items
                  .map(
                    (i) => `<tr>
                      <td class="name">${esc(i.name)}<div class="list-hint mono">${esc(i.id)}</div></td>
                      <td class="muted">${esc(i.version)}</td>
                      <td><span class="badge badge-warn">${esc(i.available)}</span></td>
                      <td class="num"><button class="btn btn-soft btn-sm" data-action="winget-upgrade" data-id="${esc(i.id)}">Actualizar</button></td>
                    </tr>`
                  )
                  .join('')}
              </tbody>
            </table>`
          : emptyState('Todo está al día según winget.', 'check')
      }
    </div>`;
}

/* ============================================================
   Dispositivos y controladores
   ============================================================ */

VIEWS.controladores = async () => {
  const content = $('#content');
  content.innerHTML = `${pageHead('Dispositivos y controladores', '')}${progressLine('Revisando dispositivos…')}`;
  const devices = await api.devices();

  content.innerHTML = `
    ${pageHead('Dispositivos y controladores', 'Windows avisa cuando un dispositivo no tiene controlador o falla.')}
    ${notice('info', '<b>Sin milagros:</b> aquí no hay un "actualizador de controladores" que inventa versiones nuevas. Solo se listan los dispositivos que Windows marca con problemas, que es lo que de verdad se puede comprobar sin descargar software de terceros.')}
    <div class="card" style="margin-top:14px;padding:0;overflow:hidden">
      <table class="table">
        <thead><tr><th>Dispositivo</th><th>Tipo</th><th>Estado</th><th class="num">Código</th></tr></thead>
        <tbody>
          ${
            devices.length
              ? devices
                  .map(
                    (d) => `<tr>
                      <td class="name">${esc(d.name)}</td>
                      <td class="muted">${esc(d.class || '—')}</td>
                      <td><span class="badge ${d.status === 'Error' ? 'badge-bad' : 'badge-warn'}">${esc(d.status)}</span></td>
                      <td class="num muted">${d.code || '—'}</td>
                    </tr>`
                  )
                  .join('')
              : `<tr><td colspan="4">${emptyState('Todos los dispositivos funcionan correctamente.', 'check')}</td></tr>`
          }
        </tbody>
      </table>
    </div>
    <div class="card" style="margin-top:14px">
      <h3 class="card-title">¿Y si un dispositivo falla?</h3>
      <p class="card-sub">Abre el <b>Administrador de dispositivos</b> de Windows, busca el dispositivo amarillo y pulsa con el botón derecho → <i>Actualizar controlador</i>. Para la tarjeta gráfica, lo mejor es la web del fabricante (AMD, NVIDIA o Intel).</p>
      <button class="btn btn-ghost btn-sm" data-action="open-devmgmt">Abrir Administrador de dispositivos</button>
    </div>`;
};

/* ============================================================
   Seguridad
   ============================================================ */

VIEWS.seguridad = async () => {
  const content = $('#content');
  content.innerHTML = `${pageHead('Seguridad', '')}${progressLine('Consultando Windows Defender…')}`;
  const status = await api.securityStatus();
  state.security = status;
  const findings = (await api.securityHeuristics()).findings;
  const threats = await api.securityThreats();

  const ok = status.installed && status.antivirus;
  content.innerHTML = `
    ${pageHead('Seguridad', 'Windows Defender hace el trabajo de antivirus. Kano Cleaner añade comprobaciones que Defender no mira.')}
    ${
      ok
        ? notice('ok', '<b>Windows Defender está activo.</b> Las firmas se actualizan solas con Windows Update.')
        : notice('bad', '<b>Windows Defender no está activo.</b> Este equipo no tiene antivirus en tiempo real. Actívalo en Seguridad de Windows.')
    }

    <div class="grid grid-4" style="margin-top:14px">
      <div class="stat">
        <div class="stat-label">${svg('escudo')}Antivirus</div>
        <div class="stat-value">${status.antivirus ? 'Activo' : 'Apagado'}</div>
        <div class="stat-hint">protección en tiempo real: ${status.tiempoReal ? 'sí' : 'no'}</div>
      </div>
      <div class="stat">
        <div class="stat-label">${svg('actualizar')}Firmas</div>
        <div class="stat-value" style="font-size:15px">${esc(status.firmaVersion || '—')}</div>
        <div class="stat-hint">${esc(status.firmaFecha || 'sin fecha')}</div>
      </div>
      <div class="stat">
        <div class="stat-label">${svg('reloj')}Último análisis rápido</div>
        <div class="stat-value" style="font-size:15px">${esc(status.ultimoRapido || 'nunca')}</div>
        <div class="stat-hint">completo: ${esc(status.ultimoCompleto || 'nunca')}</div>
      </div>
      <div class="stat">
        <div class="stat-label">${svg('candado')}Antimanipulación</div>
        <div class="stat-value" style="font-size:15px">${status.manipulacion ? 'Activada' : 'Apagada'}</div>
        <div class="stat-hint">impide que el malware apague Defender</div>
      </div>
    </div>

    <div class="card" style="margin-top:14px">
      <div class="row-between">
        <div>
          <h3 class="card-title">Analizar el equipo</h3>
          <p class="card-sub" style="margin:0">Usa el motor y las firmas oficiales de Microsoft. Puede tardar y consumir recursos.</p>
        </div>
        <div class="row">
          <button class="btn" data-action="sec-quick">${svg('play')}Análisis rápido</button>
          <button class="btn btn-ghost" data-action="sec-full">Análisis completo</button>
          <button class="btn btn-ghost" data-action="sec-heuristics">${svg('seguridad')}Comprobar a fondo</button>
        </div>
      </div>
      <div id="scanConsole" class="console" style="margin-top:14px;display:none"></div>
    </div>

    <div class="card" style="margin-top:14px">
      <h3 class="card-title">Comprobaciones propias</h3>
      <p class="card-sub">Cosas que suelen pasar desapercibidas.</p>
      <div class="list" id="findingsList">
        ${
          findings.length
            ? findings
                .map(
                  (f) => `<div class="list-row">
                    <span class="badge ${f.severity === 'alta' ? 'badge-bad' : 'badge-warn'}">${esc(f.severity)}</span>
                    <div class="grow"><div class="list-name">${esc(f.title)}</div><div class="list-hint">${esc(f.detail)}</div></div>
                  </div>`
                )
                .join('')
            : emptyState('No se ha encontrado nada raro.', 'check')
        }
      </div>
    </div>

    ${
      threats.length
        ? `<div class="card" style="margin-top:14px">
            <h3 class="card-title">Últimas amenazas detectadas por Defender</h3>
            <p class="card-sub">Historial del propio Windows.</p>
            <div class="list">
              ${threats
                .map(
                  (t) => `<div class="list-row">
                    <div class="grow">
                      <div class="list-name">${esc(t.nombre || 'Amenaza ' + t.id)}</div>
                      <div class="list-hint mono ellipsis">${esc(t.recursos || '')}</div>
                    </div>
                    <span class="list-size">${esc(t.fecha)}</span>
                  </div>`
                )
                .join('')}
            </div>
          </div>`
        : ''
    }

    ${notice('info', '<b>Importante:</b> Kano Cleaner no es un antivirus propio. No inventa firmas ni promete detecciones mágicas: se apoya en Defender, que es el que tiene permiso para analizar archivos de todo el sistema.')}`;
};

async function runSecurityScan(type) {
  const box = $('#scanConsole');
  box.style.display = 'block';
  box.textContent = type === 'full' ? 'Iniciando análisis completo…\n' : 'Iniciando análisis rápido…\n';
  toast('Análisis iniciado. Puede tardar varios minutos.', 'info');
  const r = await api.securityScan({ type });
  if (r.ok) toast('Análisis terminado.', 'ok');
  else toast('El análisis no pudo completarse. Prueba a reiniciar como administrador.', 'bad');
}

/* ============================================================
   Configuración
   ============================================================ */

VIEWS.config = async () => {
  const content = $('#content');
  const info = state.info || {};
  content.innerHTML = `
    ${pageHead('Configuración', 'Ajustes de la aplicación.')}
    <div class="card">
      <h3 class="card-title">Aspecto</h3>
      <p class="card-sub">Tema oscuro o claro. El menú lateral siempre es oscuro, como en CCleaner.</p>
      <div class="tabs">
        <button class="tab ${state.theme === 'dark' ? 'active' : ''}" data-action="theme" data-theme="dark">Oscuro</button>
        <button class="tab ${state.theme === 'light' ? 'active' : ''}" data-action="theme" data-theme="light">Claro</button>
      </div>
    </div>

    <div class="card">
      <h3 class="card-title">Permisos</h3>
      <p class="card-sub">${
        info.isAdmin
          ? 'La aplicación se está ejecutando como administrador. Puede limpiar las carpetas del sistema y leer todo.'
          : 'Sin permisos de administrador. La limpieza funciona, pero algunas carpetas del sistema y entradas de inicio del equipo no se pueden tocar.'
      }</p>
      ${info.isAdmin ? '<span class="badge badge-ok">administrador</span>' : '<button class="btn btn-ghost btn-sm" data-action="admin">Reiniciar como administrador</button>'}
    </div>

    <div class="card">
      <h3 class="card-title">Datos guardados</h3>
      <p class="card-sub">Kano Cleaner guarda en tu equipo solo el último resultado del chequeo y el tema elegido. Nada sale de aquí.</p>
      <button class="btn btn-ghost btn-sm" data-action="forget">Borrar esos datos</button>
    </div>

    <div class="card">
      <h3 class="card-title">Acerca de</h3>
      <p class="card-sub" style="margin-bottom:8px">Kano Cleaner ${esc(info.version || '')} · Electron ${esc(info.electron || '')} · Node ${esc(info.node || '')}</p>
      <p class="card-sub" style="margin:0">Gratis y sin versión Pro. Hecho para Windows 10 y 11.</p>
    </div>`;
};

/* ============================================================
   Ayuda
   ============================================================ */

VIEWS.ayuda = async () => {
  const content = $('#content');
  content.innerHTML = `
    ${pageHead('Ayuda', 'Qué hace cada cosa y qué no hace, explicado sin rodeos.')}

    <div class="card">
      <h3 class="card-title">¿Es un antivirus?</h3>
      <p class="card-sub" style="margin-bottom:0">No. Es un limpiador y un comprobador. El antivirus real es <b>Windows Defender</b>, que ya viene con Windows y tiene firmas oficiales. Aquí se usa su motor para analizar y se añaden avisos sobre cosas raras (inicio, exclusiones, archivo hosts). Un antivirus propio necesitaría un equipo de años y un controlador firmado; fingir uno sería peligroso.</p>
    </div>

    <div class="card">
      <h3 class="card-title">Qué es seguro borrar</h3>
      <p class="card-sub" style="margin-bottom:0">Temporales, cachés de navegadores, miniaturas, informes de errores y restos de Windows Update. Todo eso se regenera solo. Lo marcado como <b>con cuidado</b> (papelera, Prefetch, Windows.old, cookies) conviene leerlo antes: no rompe nada, pero puede hacer que pierdas sesiones abiertas o que la primera apertura de un programa tarde un poco más.</p>
    </div>

    <div class="card">
      <h3 class="card-title">Qué no se hace a propósito</h3>
      <p class="card-sub" style="margin-bottom:0"><b>Limpiar el registro.</b> No acelera nada y puede romper programas. <b>Inventar controladores nuevos.</b> Solo se listan los dispositivos que Windows marca con error. <b>Cerrar procesos a lo loco.</b> Se muestran, pero no se tocan. <b>Venderte una versión Pro.</b> No existe.</p>
    </div>

    <div class="card">
      <h3 class="card-title">Atajos y detalles</h3>
      <p class="card-sub" style="margin-bottom:0">Los archivos que se borran desde Duplicados o Restos van a la <b>papelera</b>, así que se pueden recuperar. La limpieza normal borra directamente porque son temporales. Si algo está en uso, se respeta y se te dice cuántos archivos han quedado.</p>
    </div>

    <div class="card">
      <h3 class="card-title">Si algo va mal</h3>
      <p class="card-sub" style="margin-bottom:0">Cierra la aplicación y vuelve a abrirla. Si el problema es de permisos, usa <b>Configuración → Reiniciar como administrador</b>. Kano Cleaner no instala servicios ni se queda corriendo en segundo plano.</p>
    </div>`;
};

/* ============================================================
   Acciones (delegación de eventos)
   ============================================================ */

document.addEventListener('click', async (e) => {
  const target = e.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;

  switch (action) {
    case 'nav':
      return go(target.dataset.view);

    case 'chequeo-run':
      return go('chequeoRun');

    case 'chequeo-fix': {
      const ok = await confirmDialog({
        title: '¿Solucionar lo seguro?',
        text: 'Se borrarán los temporales, cachés y rastros de privacidad de riesgo bajo. No se toca la papelera ni las cookies. Al terminar se repetirá el chequeo.',
        confirm: 'Limpiar ahora',
      });
      if (!ok) return;
      const r = await api.fixSafe();
      toast(`Se han liberado ${r.pretty}.`, 'ok');
      state.junk = [];
      state.privacy = [];
      return go('chequeoRun');
    }

    case 'scan':
      return scanLimpieza(target.dataset.kind);

    case 'clean-selected': {
      const ids = [
        ...$$('input[data-cat="junk"]:checked').map((i) => i.value),
        ...$$('input[data-cat="privacy"]:checked').map((i) => i.value),
      ];
      if (!ids.length) return toast('No hay nada marcado.', 'info');
      const ok = await confirmDialog({
        title: '¿Limpiar lo seleccionado?',
        text: `Se van a borrar los archivos de <b>${ids.length} categorías</b>. Los que estén en uso se respetarán.`,
        confirm: 'Limpiar',
        danger: true,
      });
      if (!ok) return;
      const r = await api.clean(ids);
      toast(`Limpieza terminada: ${r.pretty} liberados.`, 'ok');
      state.junk = [];
      state.privacy = [];
      return go('limpieza');
    }

    case 'apps-refresh':
      state.apps = [];
      return go('desinstalador');

    case 'app-uninstall':
      return appUninstall(Number(target.dataset.index));

    case 'app-leftovers':
      return appLeftovers(Number(target.dataset.index));

    case 'pick-dup': {
      const folder = await api.pickFolder({ title: 'Carpeta para buscar duplicados' });
      if (folder) {
        state.dupFolder = folder;
        $('#dupFolder').textContent = folder;
      }
      return;
    }

    case 'run-duplicates':
      return runDuplicates();

    case 'trash-duplicates':
      return trashDuplicates();

    case 'pick-disk': {
      const folder = await api.pickFolder({ title: 'Carpeta o unidad a analizar' });
      if (folder) {
        state.diskFolder = folder;
        $('#diskFolder').textContent = folder;
      }
      return;
    }

    case 'run-disk': {
      const box = $('#diskResults');
      box.innerHTML = `<div class="card">${progressLine('Midiendo carpetas…')}</div>`;
      state.disk = await api.diskUsage(state.diskFolder || 'C:\\');
      return renderDisk();
    }

    case 'run-big': {
      const box = $('#bigFiles');
      box.innerHTML = `<div class="progress-line">${svg('buscar')}<span>Buscando archivos grandes…</span></div>`;
      const r = await api.bigFiles({ folder: state.diskFolder || 'C:\\', minSize: 100 * 1024 * 1024 });
      box.innerHTML =
        r.items
          .map(
            (f) => `<div class="list-row">
              <div class="grow">
                <div class="list-name mono ellipsis" title="${esc(f.path)}">${esc(f.path)}</div>
                <div class="list-hint">${fecha(f.modified)}</div>
              </div>
              <span class="list-size">${esc(f.pretty)}</span>
              <button class="btn btn-ghost btn-sm" data-action="show-folder" data-path="${esc(f.path)}">Abrir</button>
            </div>`
          )
          .join('') || emptyState('No hay archivos tan grandes.', 'check');
      return;
    }

    case 'refresh-processes':
      return go('rendimiento');

    case 'winget-check':
      return wingetCheck();

    case 'winget-upgrade': {
      const id = target.dataset.id;
      const ok = await confirmDialog({
        title: '¿Actualizar este programa?',
        text: `Se ejecutará <span class="mono">winget upgrade --id ${esc(id)}</span>. El programa puede pedir permisos o cerrarse durante la actualización.`,
        confirm: 'Actualizar',
      });
      if (!ok) return;
      const box = $('#scanConsole') || $('#wingetResults');
      toast('Actualizando… puede tardar varios minutos.', 'info');
      const r = await api.wingetUpgrade(id);
      toast(r.code === 0 ? 'Actualización terminada.' : 'winget terminó con errores. Revisa la consola.', r.code === 0 ? 'ok' : 'bad');
      return wingetCheck();
    }

    case 'winget-all': {
      const items = state.winget?.items || [];
      const ok = await confirmDialog({
        title: `¿Actualizar los ${items.length} programas?`,
        text: 'Se actualizarán uno detrás de otro. Puede tardar bastante y algunos pedirán permisos.',
        confirm: 'Actualizar todo',
      });
      if (!ok) return;
      for (const item of items) {
        toast(`Actualizando ${item.name}…`, 'info');
        await api.wingetUpgrade(item.id);
      }
      toast('Actualizaciones terminadas.', 'ok');
      return wingetCheck();
    }

    case 'sec-quick':
      return runSecurityScan('quick');

    case 'sec-full':
      return runSecurityScan('full');

    case 'sec-heuristics': {
      toast('Comprobando de nuevo…', 'info');
      const r = await api.securityHeuristics();
      $('#findingsList').innerHTML =
        r.findings
          .map(
            (f) => `<div class="list-row">
              <span class="badge ${f.severity === 'alta' ? 'badge-bad' : 'badge-warn'}">${esc(f.severity)}</span>
              <div class="grow"><div class="list-name">${esc(f.title)}</div><div class="list-hint">${esc(f.detail)}</div></div>
            </div>`
          )
          .join('') || emptyState('No se ha encontrado nada raro.', 'check');
      return;
    }

    case 'theme': {
      state.theme = target.dataset.theme;
      localStorage.setItem('kano-theme', state.theme);
      document.body.dataset.theme = state.theme;
      return go('config');
    }

    case 'admin': {
      const ok = await confirmDialog({
        title: 'Reiniciar como administrador',
        text: 'Windows mostrará el aviso de control de cuentas (UAC). La aplicación se cerrará y volverá a abrir con permisos completos.',
        confirm: 'Continuar',
      });
      if (!ok) return;
      const r = await api.relaunchAdmin();
      if (!r.ok) toast('No se pudo reiniciar con permisos: ' + (r.error || ''), 'bad');
      return;
    }

    case 'forget': {
      localStorage.removeItem('kano-last-run');
      state.lastRun = null;
      toast('Datos guardados borrados.', 'ok');
      return;
    }

    case 'open-path': {
      const r = await api.openPath(target.dataset.path);
      if (!r.ok) toast('No se pudo abrir esa carpeta.', 'bad');
      return;
    }

    case 'show-folder':
      return api.showInFolder(target.dataset.path);

    case 'open-devmgmt': {
      await api.openPath('C:\\Windows\\System32\\devmgmt.msc');
      return;
    }
  }
});

// Casillas de limpieza y switches de inicio
document.addEventListener('change', async (e) => {
  if (e.target.matches('input[data-cat]')) {
    updateTotals();
    return;
  }

  if (e.target.matches('input[data-startup]')) {
    const index = Number(e.target.dataset.startup);
    const entry = state.startup[index];
    if (!entry) return;
    const wanted = e.target.checked;
    const r = await api.startupSet({ name: entry.name, type: entry.type, enabled: wanted });
    if (!r.ok) {
      e.target.checked = !wanted;
      toast('Windows no ha dejado cambiar esa entrada. Prueba como administrador.', 'bad');
      return;
    }
    entry.enabled = wanted;
    toast(`${entry.name}: ${wanted ? 'activado' : 'desactivado'}.`, 'ok');
  }
});

/* ============================================================
   Arranque de la interfaz
   ============================================================ */

api.onProgress((p) => {
  const text = $('#progressText');
  const bar = $('#progressBar');
  if (!text || !bar) return;

  const names = {
    junk: 'Buscando archivos basura',
    privacy: 'Buscando rastros de privacidad',
    clean: 'Limpiando',
    duplicates: 'Comparando archivos',
  };

  if (p.scope?.startsWith('chequeo')) {
    const step = $('[data-step]');
    if (p.phase) text.textContent = `Revisando: ${p.phase}…`;
    if (p.done && p.total) {
      bar.style.width = `${Math.round((p.done / p.total) * 100)}%`;
    }
    return;
  }

  const base = names[p.scope] || 'Trabajando';
  if (p.done && p.total) {
    text.textContent = `${base}: ${p.done} de ${p.total}`;
    bar.style.width = `${Math.round((p.done / p.total) * 100)}%`;
  } else if (p.files) {
    text.textContent = `${base}: ${p.files} archivos leídos`;
  } else if (p.phase) {
    text.textContent = `${base}: ${p.phase}`;
  }
});

api.onScanLine((line) => {
  const box = $('#scanConsole');
  if (!box) return;
  box.style.display = 'block';
  box.textContent += line + '\n';
  box.scrollTop = box.scrollHeight;
});

async function boot() {
  document.body.dataset.theme = state.theme;
  state.info = await api.info();

  const badge = $('#adminBadge');
  if (state.info.isAdmin) {
    badge.hidden = false;
    badge.textContent = 'administrador';
    badge.className = 'badge badge-ok';
  } else {
    badge.hidden = false;
    badge.textContent = 'sin permisos de administrador';
    badge.className = 'badge badge-ghost';
  }

  $('#winMin').addEventListener('click', () => api.minimize());
  $('#winMax').addEventListener('click', () => api.maximize());
  $('#winClose').addEventListener('click', () => api.close());

  renderSidebar();
  await go('chequeo');
}

boot();
