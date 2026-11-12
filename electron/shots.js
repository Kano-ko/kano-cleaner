'use strict';
// Genera las capturas de pantalla para la documentación (solo desarrollo).
// Uso:  $env:KANO_SHOTS='1'; npx electron .
// Las imágenes salen en docs/capturas/.

const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'docs', 'capturas');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

app.on('browser-window-created', (_event, win) => {
  win.webContents.on('did-finish-load', async () => {
    fs.mkdirSync(outDir, { recursive: true });
    const shoot = async (name) => {
      const img = await win.webContents.capturePage();
      fs.writeFileSync(path.join(outDir, `${name}.png`), img.toPNG());
      console.log('captura: ' + name);
    };

    try {
      await wait(3000);
      await shoot('chequeo');

      for (const view of ['limpieza', 'seguridad', 'disco', 'inicio', 'desinstalador']) {
        await win.webContents.executeJavaScript(`go(${JSON.stringify(view)})`);
        await wait(1500);
        await shoot(view);
      }

      // El resultado del chequeo tarda: se espera a que aparezca el anillo.
      await win.webContents.executeJavaScript(`go('chequeoRun')`);
      for (let i = 0; i < 60; i++) {
        await wait(1000);
        const done = await win.webContents.executeJavaScript(
          `Boolean(document.querySelector('.ring-text strong'))`
        );
        if (done) break;
      }
      await wait(800);
      await shoot('resultado');
    } catch (e) {
      console.log('SHOTS ERROR ' + (e && e.message ? e.message : e));
    }

    app.exit(0);
  });
});
