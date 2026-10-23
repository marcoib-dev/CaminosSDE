#!/usr/bin/env bash
# Backup diario de PostgreSQL para Caminos Rurales SDE.
#
# Uso:
#   scripts/backup-postgres.sh
#
# Variables opcionales:
#   ENV_FILE        Archivo de variables (por defecto <repo>/.env.produccion)
#   COMPOSE_FILE    Compose de producción (por defecto <repo>/docker-compose.prod.yaml)
#   BACKUP_DIR      Destino local (por defecto ~/backups/caminos)
#   RETENCION_DIAS  Días a conservar (por defecto 30)
#   RCLONE_REMOTE   Remoto opcional de rclone para copiar fuera del servidor
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${ENV_FILE:-$REPO_DIR/.env.produccion}"
COMPOSE_FILE="${COMPOSE_FILE:-$REPO_DIR/docker-compose.prod.yaml}"
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups/caminos}"
RETENCION_DIAS="${RETENCION_DIAS:-30}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "No existe el archivo de variables: $ENV_FILE" >&2
  exit 1
fi

umask 077
mkdir -p "$BACKUP_DIR"

fecha="$(date +%F_%H%M%S)"
archivo="$BACKUP_DIR/caminos-$fecha.sql.gz"
parcial="$archivo.parcial"
compose=(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE")

echo "Generando $archivo..."
if ! "${compose[@]}" exec -T postgres sh -c \
  'pg_dump --no-owner --no-privileges -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  | gzip > "$parcial"; then
  echo "Falló pg_dump. Se descarta el archivo parcial." >&2
  rm -f "$parcial"
  exit 1
fi

if ! gzip -t "$parcial"; then
  echo "El archivo generado no es un gzip válido. Se descarta." >&2
  rm -f "$parcial"
  exit 1
fi

mv "$parcial" "$archivo"
echo "Backup listo: $archivo ($(du -h "$archivo" | cut -f1))"

# Copia fuera del servidor (opcional).
if [[ -n "${RCLONE_REMOTE:-}" ]]; then
  echo "Copiando a $RCLONE_REMOTE..."
  rclone copy "$archivo" "$RCLONE_REMOTE"
fi

# Retención local.
find "$BACKUP_DIR" -maxdepth 1 -name 'caminos-*.sql.gz' -mtime "+$RETENCION_DIAS" -print -delete
echo "Retención aplicada: $RETENCION_DIAS días en $BACKUP_DIR."
