#!/usr/bin/env bash
# Arranque de UniX Driver · Cartagena en Linux / macOS
set -e
cd "$(dirname "$0")"

echo "=============================================="
echo "  UniX Driver · Cartagena — escritorio"
echo "=============================================="

command -v node >/dev/null 2>&1 || { echo "✖ Falta Node.js 18+ (https://nodejs.org)"; exit 1; }
command -v mysql >/dev/null 2>&1 || echo "⚠ No encuentro el cliente mysql; asegúrate de que MySQL/MariaDB esté corriendo."

if [ -f .env ]; then
  echo "✔ Usando credenciales de .env"
else
  if [ -f .env.example ]; then cp .env.example .env; echo "✔ Se creó .env (revisa usuario/contraseña de MySQL)"; fi
fi

if [ ! -d node_modules ]; then
  echo "→ Instalando dependencias (npm install)…"
  npm install
fi

echo "→ Iniciando servidor en http://localhost:${PORT:-3000}"
npm start
