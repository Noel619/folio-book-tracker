#!/bin/zsh

set -u

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_URL="http://localhost:3000/"
LOG_FILE="$APP_DIR/.folio-server.log"

cd "$APP_DIR" || exit 1

show_error() {
  osascript -e "display dialog \"$1\" with title \"Folio\" buttons {\"Aceptar\"} default button \"Aceptar\" with icon stop"
}

if curl --silent --fail --max-time 1 "$APP_URL" >/dev/null 2>&1; then
  open "$APP_URL"
  exit 0
fi

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  show_error "Folio necesita Node.js 22 o superior. Instálalo desde nodejs.org y vuelve a abrir Folio.command."
  exit 1
fi

if [ ! -d "$APP_DIR/node_modules" ]; then
  npm install >>"$LOG_FILE" 2>&1
  if [ $? -ne 0 ]; then
    show_error "No se pudieron instalar los componentes de Folio. Revisa .folio-server.log."
    exit 1
  fi
fi

if [ ! -f "$APP_DIR/dist/server/index.js" ]; then
  npm run build >>"$LOG_FILE" 2>&1
  if [ $? -ne 0 ]; then
    show_error "No se pudo preparar Folio. Revisa .folio-server.log."
    exit 1
  fi
fi

nohup npm run start >>"$LOG_FILE" 2>&1 &

attempt=0
while [ $attempt -lt 45 ]; do
  sleep 1
  if curl --silent --fail --max-time 1 "$APP_URL" >/dev/null 2>&1; then
    open "$APP_URL"
    exit 0
  fi
  attempt=$((attempt + 1))
done

show_error "Folio tardó demasiado en iniciar. Revisa .folio-server.log."
exit 1
