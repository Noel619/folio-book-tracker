# Instalar Folio en macOS

1. Copia la carpeta completa del proyecto al Mac. No muevas `Folio.app` fuera de esa carpeta.
2. Si recibiste `Folio-macOS.zip`, descomprímelo y reemplaza la carpeta `Folio.app` del proyecto por la incluida en el ZIP.
3. Haz doble clic en `Folio.app` desde Finder.
4. Como esta copia no está firmada con una cuenta Apple Developer, en la primera apertura macOS puede bloquearla. Haz clic derecho sobre `Folio.app`, elige **Abrir** y confirma **Abrir** una vez.
5. Si falta un componente compatible, pulsa **Preparar automáticamente**. Folio descargará una copia portátil oficial dentro de tu carpeta de usuario, verificará su firma SHA-256 y continuará sin pedir permisos de administrador.

La primera apertura instala y compila silenciosamente los componentes compatibles con Apple Silicon o Intel. Puede tardar unos minutos; las siguientes aperturas son rápidas. Folio abre el navegador sin mostrar una ventana de Terminal. El componente portátil, si hiciera falta, se guarda en `~/Library/Application Support/Folio` y no modifica macOS.

El registro técnico se guarda en `~/Library/Logs/Folio/server.log`. `Folio.command` continúa disponible como alternativa de diagnóstico.

## Sobre la seguridad de macOS

La aplicación es un bundle estándar de macOS, pero no está firmada ni notarizada porque Apple exige una cuenta Apple Developer y el proceso de firma debe realizarse desde un Mac. El clic derecho → **Abrir** autoriza esta copia concreta sin desactivar Gatekeeper para el resto del sistema.
