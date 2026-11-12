# Kano Cleaner

**Limpiador y comprobador para Windows 10 y 11. Gratis, sin versiÃ³n Pro, sin anuncios y sin telemetrÃ­a.**

[English version](README.en.md) Â· [Descargar la Ãºltima versiÃ³n](../../releases/latest)

![Resultado del chequeo](docs/capturas/resultado.png)

---

## QuÃ© es

Una aplicaciÃ³n de escritorio que limpia el equipo y dice la verdad sobre su estado. No
tiene cuentas, no se registra en ningÃºn sitio, no abre conexiones a internet por su cuenta
y no se queda corriendo en segundo plano.

EstÃ¡ pensada como alternativa libre a CCleaner 7: las mismas secciones que se usan de
verdad, sin candados, sin insignias de "premium" y sin el botÃ³n de *Actualizar ahora*.

## Descargar

1. Entra en **[Releases](../../releases/latest)**.
2. Descarga `KanoCleaner-x.x.x-portable.exe`.
3. Doble clic. No se instala nada: es un Ãºnico archivo portable.

Si quieres comprobar que la descarga estÃ¡ Ã­ntegra, en la misma pÃ¡gina hay un archivo
`SHA256SUMS.txt` con la huella de cada `.exe`.

### El aviso azul de Windows (importante)

La primera vez, Windows puede mostrar **"Windows protegiÃ³ tu PC"**. Es normal: el archivo
no estÃ¡ firmado digitalmente, y firmar cuesta dinero cada aÃ±o. No significa que tenga un
virus; significa que Microsoft no conoce al autor.

Para abrirlo:

1. Pulsa **MÃ¡s informaciÃ³n**.
2. Pulsa **Ejecutar de todas formas**.

Puedes revisar el cÃ³digo entero aquÃ­ mismo: es lo que se compila en cada versiÃ³n, de forma
automÃ¡tica y pÃºblica (ver [`.github/workflows`](.github/workflows)).

## QuÃ© hace

| SecciÃ³n | Para quÃ© sirve |
|---|---|
| **Chequeo** | PuntuaciÃ³n de 0 a 100, resumen de problemas y botÃ³n para arreglar lo seguro de una vez. |
| **Limpieza** | 18 categorÃ­as de basura y privacidad: temporales, cachÃ©s de navegadores, miniaturas, informes de errores, restos de Windows Update, historial, cookies, papeleraâ€¦ |
| **Desinstalador** | Lista los programas instalados, abre su desinstalador real y busca restos que se quedan. |
| **Buscador de duplicados** | Encuentra archivos idÃ©nticos comparando el **contenido**, no el nombre. |
| **Uso del disco** | Mide quÃ© carpetas ocupan mÃ¡s y localiza archivos enormes. |
| **Rendimiento** | Memoria usada, tiempo encendido y los procesos que mÃ¡s consumen (solo informa). |
| **Administrador de inicio** | Activa o desactiva programas que arrancan con Windows, igual que el Administrador de tareas. |
| **Actualizaciones** | Actualiza programas instalados usando `winget`, el gestor oficial de Microsoft. |
| **Dispositivos y controladores** | Lista los dispositivos que Windows marca con error y explica cÃ³mo resolverlo. |
| **Seguridad** | Estado real de Windows Defender, historial de amenazas, anÃ¡lisis rÃ¡pido o completo y comprobaciones propias. |
| **ConfiguraciÃ³n y Ayuda** | Tema claro u oscuro, permisos de administrador y explicaciones sin rodeos. |

## QuÃ© **no** hace, y por quÃ©

- **No limpia el registro.** No acelera nada y puede romper programas. Es la mitad del
  negocio de los limpiadores comerciales y es humo.
- **No inventa controladores nuevos.** Solo muestra lo que Windows marca con error. Los
  "actualizadores de controladores" que prometen versiones mÃ¡gicas suelen instalar cosas
  peores.
- **No cierra procesos por su cuenta.** Cerrar el equivocado hace perder trabajo sin
  guardar. Para eso estÃ¡ el Administrador de tareas.
- **No es un antivirus.** SerÃ­a irresponsable fingir uno: hace falta un equipo, aÃ±os de
  firmas y un controlador firmado. AquÃ­ se usa el motor real de **Windows Defender**, que
  es el que tiene permiso para analizar todo el disco.
- **No manda datos a ningÃºn sitio.** No hay analÃ­ticas, ni cuentas, ni "mejora de la
  experiencia". Las dos Ãºnicas salidas a internet son las que tÃº pides: actualizar con
  `winget` y analizar con Defender.

## Seguridad al borrar

- Lo que se borra desde **Duplicados** o **Restos** va a la **papelera de reciclaje**: se
  puede recuperar.
- La limpieza normal borra directamente, porque son archivos temporales que Windows
  regenera solo.
- Las categorÃ­as delicadas (papelera, Prefetch, `Windows.old`, cookies) estÃ¡n marcadas
  como **con cuidado** y nunca se marcan solas.
- Los archivos en uso se respetan y la aplicaciÃ³n dice cuÃ¡ntos han quedado.

## Capturas

| Limpieza | Uso del disco |
|---|---|
| ![Limpieza](docs/capturas/limpieza.png) | ![Uso del disco](docs/capturas/disco.png) |

| Chequeo | Resultado |
|---|---|
| ![Chequeo](docs/capturas/chequeo.png) | ![Resultado del chequeo](docs/capturas/resultado.png) |

## Requisitos

- Windows 10 (1809 o posterior) o Windows 11, 64 bits.
- Unos 120 MB de espacio libre.
- Opcional: `winget` para la secciÃ³n de actualizaciones. Viene con la app *Instalador de
  aplicaciones* de la Microsoft Store.
- Opcional: permisos de administrador para limpiar carpetas del sistema y cambiar entradas
  de inicio del equipo. Sin ellos funciona igual, pero con menos alcance.

## Compilar desde el cÃ³digo

Hace falta [Node.js](https://nodejs.org/) 20 o superior.

```powershell
git clone https://github.com/Kano-ko/kano-cleaner.git
cd kano-cleaner
npm install
npm start        # abrir en modo desarrollo
npm run dist     # generar el .exe portable en release/
```

El proyecto no usa frameworks de interfaz: es HTML, CSS y JavaScript a mano, mÃ¡s
PowerShell para hablar con Windows. La estructura estÃ¡ explicada en
[`AGENTS.md`](AGENTS.md).

## Contribuir

Se aceptan fallos y sugerencias en [Issues](../../issues). Antes de abrir uno, lee
[`CONTRIBUTING.md`](CONTRIBUTING.md).

Si encuentras un problema de seguridad, no lo publiques: sigue
[`SECURITY.md`](SECURITY.md).

## Licencia

[MIT](LICENSE). Puedes usarlo, copiarlo, modificarlo y redistribuirlo, tambiÃ©n
comercialmente, siempre que mantengas el aviso de copyright.

El software se ofrece **tal cual**, sin garantÃ­as. Borra archivos: Ãºsalo con cabeza y
mantÃ©n copias de seguridad de lo que te importe.
