#!/usr/bin/env bash
# Restaura un backup generado con backup-postgres.sh.
#
# Uso:
#   scripts/restaurar-postgres.sh <archivo.sql.gz> --confirmar
#
# Reemplaza por completo el esquema public de la base. Detiene el backend
# mientras restaura y lo vuelve a iniciar al terminar (o si falla).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${ENV_FILE:-$REPO_DIR/.env.produccion}"
COMPOSE_FILE="${COMPOSE_FILE:-$REPO_DIR/docker-compose.prod.yaml}"

if [[ $# -lt 1 ]]; then
  echo "Uso: $0 <archivo.sql.gz> --confirmar" >&2
  exit 1
fi

ARCHIVO="$1"
if [[ "${2:-}" != "--confirmar" ]]; then
  echo "Esto reemplaza TODOS los datos de la base. Repetí el comando con --confirmar." >&2
  exit 1
fi

if [[ ! -f "$ARCHIVO" ]]; then
  echo "No existe el archivo: $ARCHIVO" >&2
  exit 1
fi

if ! gzip -t "$ARCHIVO"; then
  echo "El archivo no es un gzip válido: $ARCHIVO" >&2
  exit 1
fi

compose=(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE")

echo "Deteniendo el backend..."
"${compose[@]}" stop backend

reiniciar_backend() {
  echo "Iniciando el backend..."
  "${compose[@]}" start backend
}
trap reiniciar_backend EXIT

echo "Recreando el esquema public..."
"${compose[@]}" exec -T postgres sh -c \
  'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"'

echo "Restaurando $ARCHIVO..."
gunzip -c "$ARCHIVO" | "${compose[@]}" exec -T postgres sh -c \
  'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'

echo "Restauración completa. El backend aplica las migraciones pendientes al arrancar."
