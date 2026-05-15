#!/usr/bin/env bash
set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-mfasaowbvqntdbgojtvi}"
BACKUP_DIR="${BACKUP_DIR:-/home/anton/projects/backups}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUTPUT_FILE="${BACKUP_DIR}/${PROJECT_REF}_${TIMESTAMP}.dump"

if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source ".env"
  set +a
fi

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "SUPABASE_DB_URL is required." >&2
  echo "Set it to the Supabase Postgres connection string before running this script." >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump is not installed or not available in PATH." >&2
  echo "Install PostgreSQL client tools before running this script." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

pg_dump \
  --format=custom \
  --verbose \
  --no-owner \
  --no-privileges \
  --file="$OUTPUT_FILE" \
  "$SUPABASE_DB_URL"

echo "$OUTPUT_FILE"
