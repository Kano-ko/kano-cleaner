# Seguridad

## Cómo informar de un problema de seguridad

**No abras un Issue público.** Un limpiador borra archivos y se ejecuta con permisos
elevados: un fallo de seguridad aquí puede hacer daño de verdad.

Usa el aviso privado de GitHub:

**[Informar en privado](../../security/advisories/new)**

(o ve a la pestaña *Security* del repositorio → *Report a vulnerability*).

Incluye, si puedes:

- Qué permite hacer el fallo (borrar archivos que no toca, ejecutar comandos, saltarse la
  confirmación…).
- Cómo reproducirlo, paso a paso.
- Versión de Kano Cleaner y de Windows.
- Si lo has probado como administrador o como usuario normal.

Intento responder en unos días. Si el fallo es grave, publicaré una versión corregida antes
de contar los detalles.

## Qué se considera un problema de seguridad

- Que la interfaz pueda ejecutar comandos arbitrarios en el equipo.
- Que una ruta o un nombre de archivo manipulado consiga borrar algo fuera de lo previsto.
- Que se pueda saltar el aviso de confirmación antes de borrar.
- Que la aplicación escriba fuera de sus carpetas o del registro de usuario.
- Cualquier forma de enviar datos del usuario fuera del equipo.

## Qué **no** es un problema de seguridad

- Que Windows muestre el aviso "Windows protegió tu PC": el programa no está firmado
  digitalmente. Está explicado en el README.
- Que un antivirus de terceros marque el `.exe` como sospechoso. Los limpiadores que borran
  archivos y llaman a PowerShell se parecen mucho al malware en su forma de trabajar. Si te
  pasa, comprueba la huella SHA256 publicada junto a la descarga y, si no coincide, avísame.
- Que haga falta administrador para algunas funciones. Es intencionado.
