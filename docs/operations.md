# Operations

Run commands from `backend/`.

## Backup

```bash
bash scripts/backup.sh
```

The dump is written to `backend/backups/` in PostgreSQL custom format.

## Restore

Restore is destructive:

```bash
RESTORE_CONFIRM=YES bash scripts/restore.sh backups/hms-YYYYMMDD-HHMMSS.dump
```

## Verification

```bash
docker compose exec api bun run smoke
```

## Development reset

```bash
docker compose exec api bunx prisma db push --force-reset --accept-data-loss
docker compose exec api bun run seed
```
