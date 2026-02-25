#!/bin/sh
set -e

PB=/app/pocketbase
DATA_DIR=/app/pb_data

# Create the superuser from env vars on startup (safe to run multiple times — upsert)
if [ -n "$PB_ADMIN_EMAIL" ] && [ -n "$PB_ADMIN_PASSWORD" ]; then
  echo "[Moni] Criando/atualizando superusuário: $PB_ADMIN_EMAIL"
  $PB superuser upsert "$PB_ADMIN_EMAIL" "$PB_ADMIN_PASSWORD" --dir="$DATA_DIR" 2>/dev/null || true
fi

echo "[Moni] Iniciando PocketBase..."
exec $PB serve --http=0.0.0.0:8090 --dir="$DATA_DIR"
