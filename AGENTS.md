# Project Rules

- Build the application with Next.js, not Vite.
- Before applying any database migration, data import, destructive SQL, or schema-changing Supabase MCP action, create a fresh database backup.
- Backups must be stored outside the repository in `/home/anton/projects/backups`.
- Use `scripts/backup-supabase.sh` for the backup. Do not proceed with database changes if the backup command fails.
- The backup script requires `SUPABASE_DB_URL` to be set to the Supabase Postgres connection string.
- Do not commit `.env` files or secrets.

