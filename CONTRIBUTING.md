# Cómo contribuir

Gracias por querer mejorar Kano Cleaner. Es un proyecto pequeño y sin prisa, así que hay
pocas normas.

## Antes de escribir código

- Abre un **Issue** contando qué quieres cambiar. Así se evita trabajar dos veces en lo
  mismo o en algo que no encaja con el proyecto.
- Lee [`AGENTS.md`](AGENTS.md): explica la estructura y las reglas.

## Reglas del proyecto

1. **Gratis y desbloqueado.** Nada de versión Pro, candados, anuncios ni cuentas.
2. **Sin telemetría.** Ninguna conexión a internet que el usuario no haya pedido.
3. **Sin inventos.** Si algo no se puede comprobar de verdad, se explica; no se finge.
4. **Nada peligroso.** No se limpia el registro, no se fuerzan controladores, no se cierran
   procesos por su cuenta.
5. **Windows 10 y Windows 11.** Si algo solo funciona en 11, tiene que haber una
   alternativa para 10.
6. **Código legible.** Español llano en los comentarios. Nada de dependencias que no hagan
   falta.

## Estilo de código

- Sin frameworks en la interfaz: HTML, CSS y JavaScript a mano.
- Comentarios breves en español, explicando **para qué** sirve el código, no cómo está
  escrito.
- Nombres de variables en español cuando son del dominio (`papelera`, `hallazgos`) y en
  inglés cuando son estándar (`path`, `count`).
- Nada de dependencias nuevas sin hablarlo antes.

## Cómo probar tus cambios

```powershell
npm install
npm start
```

Hay una comprobación automática de la interfaz que recorre todas las secciones y avisa de
errores:

```powershell
$env:KANO_SELFTEST='1'; npx electron .
```

Y otra que genera las capturas de la documentación:

```powershell
$env:KANO_SHOTS='1'; npx electron .
```

Las capturas salen en `docs/capturas/`. Ojo: incluyen datos reales del equipo donde se
generan (nombres de programas, rutas). Revísalas antes de subirlas.

## Enviar cambios

1. Haz un *fork* del repositorio.
2. Crea una rama con un nombre claro: `arreglo-papelera`, `mejora-duplicados`.
3. Un cambio por rama. Mejor cinco cambios pequeños que uno enorme.
4. Abre un *pull request* explicando qué cambia y cómo lo has probado.

La compilación automática (GitHub Actions) comprobará la sintaxis y generará el `.exe`. Si
falla, mira el registro: normalmente es un error de sintaxis o una ruta mal escrita.
