'use strict';
// Puente seguro entre la interfaz y el sistema.
// La interfaz NO tiene acceso a Node ni a archivos: solo a estas funciones.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('kano', {
  // Ventana
  minimize: () => ipcRenderer.invoke('win:minimize'),
  maximize: () => ipcRenderer.invoke('win:maximize'),
  close: () => ipcRenderer.invoke('win:close'),

  // Aplicación
  info: () => ipcRenderer.invoke('app:info'),
  openPath: (target) => ipcRenderer.invoke('app:openPath', target),
  showInFolder: (target) => ipcRenderer.invoke('app:showInFolder', target),
  relaunchAdmin: () => ipcRenderer.invoke('app:relaunchAdmin'),

  // Limpieza
  scanJunk: () => ipcRenderer.invoke('scan:junk'),
  scanPrivacy: () => ipcRenderer.invoke('scan:privacy'),
  clean: (ids) => ipcRenderer.invoke('clean:ids', ids),

  // Chequeo
  chequeo: () => ipcRenderer.invoke('chequeo:run'),
  fixSafe: () => ipcRenderer.invoke('chequeo:fixSafe'),

  // Inicio
  startupList: () => ipcRenderer.invoke('startup:list'),
  startupSet: (entry) => ipcRenderer.invoke('startup:set', entry),

  // Programas
  appsList: () => ipcRenderer.invoke('apps:list'),
  appsUninstall: (target) => ipcRenderer.invoke('apps:uninstall', target),
  appsLeftovers: (target) => ipcRenderer.invoke('apps:leftovers', target),
  appsRecycle: (paths) => ipcRenderer.invoke('apps:recycle', paths),

  // Archivos
  pickFolder: (options) => ipcRenderer.invoke('files:pick', options),
  duplicates: (payload) => ipcRenderer.invoke('files:duplicates', payload),
  diskUsage: (folder) => ipcRenderer.invoke('files:disk', folder),
  bigFiles: (payload) => ipcRenderer.invoke('files:big', payload),
  recycle: (paths) => ipcRenderer.invoke('files:recycle', paths),

  // Seguridad
  securityStatus: () => ipcRenderer.invoke('security:status'),
  securityThreats: () => ipcRenderer.invoke('security:threats'),
  securityHeuristics: () => ipcRenderer.invoke('security:heuristics'),
  securityScan: (payload) => ipcRenderer.invoke('security:scan', payload),

  // Estado del equipo
  healthInfo: () => ipcRenderer.invoke('health:info'),
  processes: () => ipcRenderer.invoke('health:processes'),
  devices: () => ipcRenderer.invoke('health:devices'),

  // winget
  wingetList: () => ipcRenderer.invoke('winget:list'),
  wingetUpgrade: (id) => ipcRenderer.invoke('winget:upgrade', id),

  // Avisos que llegan solos desde el proceso principal
  onProgress: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('progress', handler);
    return () => ipcRenderer.removeListener('progress', handler);
  },
  onScanLine: (callback) => {
    const handler = (_event, line) => callback(line);
    ipcRenderer.on('scan:line', handler);
    return () => ipcRenderer.removeListener('scan:line', handler);
  },
});
