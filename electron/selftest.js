'use strict';
// Comprobación automática de la interfaz. Solo se usa en desarrollo:
//   $env:KANO_SELFTEST='1'; npx electron .
// Carga la ventana, navega por varias secciones y escribe el resultado en consola.

const { app } = require('electron');

const errors = [];

app.on('browser-window-created', (_event, win) => {
  win.webContents.on('console-message', (event, level, message) => {
    // Electron nuevo pasa un objeto; el antiguo, argumentos sueltos.
    const lvl = event?.level ?? level;
    const msg = event?.message ?? message;
    if (lvl === 'error' || lvl === 3 || lvl === 2) errors.push(String(msg));
  });

  win.webContents.on('did-finish-load', async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const report = { errors, views: {} };

    // Perro guardián: si algo se atasca, avisa y cierra.
    const watchdog = setTimeout(() => {
      console.log('SELFTEST TIMEOUT ' + JSON.stringify(report));
      app.exit(2);
    }, 300000);

    try {
      await wait(2500);

      const info = await win.webContents.executeJavaScript(`(() => ({
        navItems: document.querySelectorAll('.nav-item').length,
        title: document.querySelector('.page-title')?.textContent || '',
        hero: Boolean(document.querySelector('.hero')),
        failed: document.body.innerText.includes('Algo ha fallado'),
        admin: document.getElementById('adminBadge')?.textContent || '',
        theme: document.body.dataset.theme
      }))()`);
      report.inicio = info;

      for (const view of ['limpieza', 'desinstalador', 'duplicados', 'disco', 'rendimiento', 'inicio', 'actualizaciones', 'controladores', 'seguridad', 'config', 'ayuda']) {
        const t0 = Date.now();
        console.log('SELFTEST-STEP ' + view + ' ...');
        const result = await win.webContents.executeJavaScript(
          `(async () => { await go(${JSON.stringify(view)}); return { title: document.querySelector('.page-title')?.textContent || '', failed: document.body.innerText.includes('Algo ha fallado'), len: document.getElementById('content').innerText.length }; })()`
        );
        report.views[view] = { ...result, ms: Date.now() - t0 };
        console.log('SELFTEST-STEP ' + view + ' OK ' + (Date.now() - t0) + 'ms');
      }
    } catch (e) {
      report.fatal = String(e && e.message ? e.message : e);
    }

    if (process.env.KANO_SELFTEST === 'full') {
      try {
        console.log('SELFTEST-STEP chequeo ...');
        report.chequeo = await win.webContents.executeJavaScript(`(async () => {
          await go('chequeoRun');
          return {
            title: document.querySelector('.page-title')?.textContent || '',
            score: document.querySelector('.ring-text strong')?.textContent || '',
            stats: document.querySelectorAll('.stat').length,
            failed: document.body.innerText.includes('Algo ha fallado')
          };
        })()`);
      } catch (e) {
        report.chequeoError = String(e && e.message ? e.message : e);
      }
    }

    clearTimeout(watchdog);

    console.log('SELFTEST ' + JSON.stringify(report, null, 2));
    app.exit(0);
  });
});
