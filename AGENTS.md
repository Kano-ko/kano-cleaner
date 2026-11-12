# Kano Cleaner

Limpiador, comprobador de seguridad y mantenimiento para Windows 10 y 11.
Sustituye a CCleaner 7 sin pagar nada: no hay versión "Pro" ni funciones
bloqueadas.

## Qué es

Una aplicación de escritorio con ventana propia. Hace el trabajo real desde el
propio Windows: borra temporales, revisa el arranque, desinstala programas,
busca duplicados, mide el disco y comprueba el estado del antivirus.

No incluye un motor antivirus propio: usa el de Windows Defender que ya viene
instalado, más una serie de comprobaciones extra (programas de inicio raros,
exclusiones del antivirus, archivo `hosts` manipulado...).

## Estructura

```text
electron/          Ventana, puente seguro y controles de Windows
  main.js          Proceso principal: crea la ventana y atiende las llamadas
  preload.js       Puente entre la interfaz y el sistema (sin acceso libre)
  selftest.js      Prueba automática de la interfaz (solo desarrollo)
  shots.js         Genera las capturas de docs/capturas (solo desarrollo)
src/core/          El trabajo real (escaneos y acciones)
  util.js          Utilidades: PowerShell, tamaños, recorrer carpetas
  scan.js          Qué se puede limpiar y dónde está
  clean.js         Borrado con recuento e informe
  startup.js       Programas que arrancan con Windows
  apps.js          Programas instalados, desinstalación y winget
  files.js         Duplicados, uso de disco y archivos grandes
  security.js      Windows Defender y comprobaciones propias
  health.js        Estado del equipo
  drivers.js       Tarjetas gráficas y actualizaciones de Microsoft Update
src/ui/            Interfaz (HTML, CSS y JavaScript sin frameworks)
build/             Icono de la aplicación
docs/capturas/     Capturas usadas en el README
.github/           Compilación y publicación automáticas, plantillas de Issues
```

## Cómo se ejecuta

```powershell
npm install
npm start
```

Para generar el `.exe` portable:

```powershell
npm run dist
```

El archivo sale en `release\KanoCleaner-0.1.0-portable.exe`.

Pruebas de desarrollo (no forman parte de la versión publicada):

```powershell
$env:KANO_SELFTEST='1'; npx electron .   # recorre todas las secciones y avisa de errores
$env:KANO_SHOTS='1'; npx electron .      # regenera docs/capturas/
```

Antes de lanzar cualquier prueba, cerrar las instancias abiertas: la aplicación permite
una sola a la vez y la nueva se cierra sola si hay otra en marcha.

## Publicación

El repositorio es público y la compilación la hace GitHub, no un PC personal:

1. Subir los cambios a `main`.
2. Crear una etiqueta con la versión: `git tag v0.1.0` y `git push origin v0.1.0`.
3. GitHub Actions compila el `.exe` en un Windows limpio, calcula el SHA256 y crea la
   versión con el archivo adjunto.
4. El número de versión de `package.json` debe coincidir con la etiqueta.

Nunca subir `node_modules/` ni `release/`: están en `.gitignore` y el `.exe` se descarga
desde *Releases*.

## Reglas del proyecto

- Compatible con Windows 10 y Windows 11.
- Todo gratis y desbloqueado: nada de versión Pro, candados, anuncios ni
  banners de "Actualizar ahora". Si una función no se puede hacer, se explica,
  no se vende.
- Nada de telemetría ni conexiones a internet salvo que el usuario lo pida
  (por ejemplo, actualizar con `winget`).
- Antes de borrar algo delicado se avisa y se puede deshacer (papelera).
- No se toca el registro "para limpiarlo": no acelera nada y puede romper cosas.
