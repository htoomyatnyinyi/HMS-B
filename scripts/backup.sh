#!/usr/bin/env bash
set -euo pipefail

backup_dir="${BACKUP_DIR:-./backups}"
timestamp="$(date +%Y%m%d-%H%M%S)"
file="${backup_dir}/hms-${timestamp}.dump"

mkdir -p "$backup_dir"
docker compose exec -T postgres pg_dump \
  -U "${POSTGRES_USER:-hms_user}" \
  -d "${POSTGRES_DB:-hms_db}" \
  --format=custom > "$file"

echo "Backup created: $file"
