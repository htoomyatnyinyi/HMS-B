#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${1:-}" ]]; then
  echo "Usage: RESTORE_CONFIRM=YES bash scripts/restore.sh backups/file.dump" >&2
  exit 1
fi
if [[ "${RESTORE_CONFIRM:-}" != "YES" ]]; then
  echo "Restore is destructive. Set RESTORE_CONFIRM=YES to continue." >&2
  exit 1
fi
if [[ ! -f "$1" ]]; then
  echo "Backup file not found: $1" >&2
  exit 1
fi

cat "$1" | docker compose exec -T postgres pg_restore \
  -U "${POSTGRES_USER:-hms_user}" \
  -d "${POSTGRES_DB:-hms_db}" \
  --clean --if-exists --no-owner

echo "Database restored from: $1"
