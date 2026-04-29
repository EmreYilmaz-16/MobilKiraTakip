#!/bin/sh
set -eu

DB_NAME="${POSTGRES_DB:-kiratakip}"
DB_USER="${POSTGRES_USER:-kiratakip}"
DB_HOST="${DB_HOST:-db}"

echo "[migrate] waiting for PostgreSQL at ${DB_HOST}..."
until pg_isready -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; do
  sleep 2
done

for file in \
  /migrations/007_multi_tenant_foundation.sql \
  /migrations/008_documents_multi_tenant_repair.sql \
  /migrations/009_add_organization_to_extended_modules.sql \
  /migrations/010_organization_audit_logs.sql \
  /migrations/011_seed_platform_admin.sql \
  /migrations/012_organization_subscription_ledger.sql \
  /migrations/013_organization_invoices.sql
do
  echo "[migrate] applying $(basename "$file")"
  psql \
    -v ON_ERROR_STOP=1 \
    -h "$DB_HOST" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -f "$file"
done

echo "[migrate] completed"