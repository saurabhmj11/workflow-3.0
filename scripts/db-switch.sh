#!/bin/bash
# ─── OpenWorkflow Database Provider Switcher ──────────
# Switches Prisma provider between SQLite and PostgreSQL
#
# Usage:
#   ./scripts/db-switch.sh sqlite       # Switch to SQLite (default for development)
#   ./scripts/db-switch.sh postgresql   # Switch to PostgreSQL (for production / Docker)
#
# What it does:
#   1. Updates prisma/schema.prisma datasource provider
#   2. Updates .env DATABASE_URL
#   3. Runs npx prisma generate
#
# Prerequisites:
#   - For PostgreSQL: Set POSTGRES_URL env var or accept the default
#     Default: postgresql://openworkflow:openworkflow@localhost:5432/openworkflow?schema=public
# ───────────────────────────────────────────────────────

set -euo pipefail

SCHEMA_FILE="prisma/schema.prisma"
ENV_FILE=".env"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# ─── Validate argument ──────────────────────────────
if [ $# -ne 1 ]; then
  echo "Usage: $0 sqlite|postgresql"
  echo ""
  echo "  sqlite       Switch to SQLite (default for local development)"
  echo "  postgresql   Switch to PostgreSQL (for production / Docker)"
  exit 1
fi

PROVIDER="${1,,}"  # lowercase

if [ "$PROVIDER" != "sqlite" ] && [ "$PROVIDER" != "postgresql" ]; then
  echo "Error: Invalid provider '$PROVIDER'. Must be 'sqlite' or 'postgresql'."
  exit 1
fi

# ─── Validate files exist ───────────────────────────
if [ ! -f "$SCHEMA_FILE" ]; then
  echo "Error: $SCHEMA_FILE not found. Run this script from the project root."
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "Warning: $ENV_FILE not found. It will be created."
fi

# ─── Switch logic ───────────────────────────────────
if [ "$PROVIDER" = "sqlite" ]; then
  echo "==> Switching to SQLite..."

  # Update schema.prisma provider
  if [[ "$(uname)" == "Darwin" ]]; then
    # macOS sed
    sed -i '' 's/provider = "postgresql"/provider = "sqlite"/g' "$SCHEMA_FILE"
  else
    # GNU sed
    sed -i 's/provider = "postgresql"/provider = "sqlite"/g' "$SCHEMA_FILE"
  fi

  # Update .env DATABASE_URL
  SQLITE_URL='file:./db/custom.db'
  if [ -f "$ENV_FILE" ]; then
    if [[ "$(uname)" == "Darwin" ]]; then
      sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=\"${SQLITE_URL}\"|" "$ENV_FILE"
    else
      sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"${SQLITE_URL}\"|" "$ENV_FILE"
    fi
  else
    echo "DATABASE_URL=\"${SQLITE_URL}\"" > "$ENV_FILE"
  fi

  echo "    Provider:  sqlite"
  echo "    DB URL:    ${SQLITE_URL}"

elif [ "$PROVIDER" = "postgresql" ]; then
  echo "==> Switching to PostgreSQL..."

  # Determine PostgreSQL URL
  PG_URL="${POSTGRES_URL:-postgresql://openworkflow:openworkflow@localhost:5432/openworkflow?schema=public}"

  # Update schema.prisma provider
  if [[ "$(uname)" == "Darwin" ]]; then
    sed -i '' 's/provider = "sqlite"/provider = "postgresql"/g' "$SCHEMA_FILE"
  else
    sed -i 's/provider = "sqlite"/provider = "postgresql"/g' "$SCHEMA_FILE"
  fi

  # Update .env DATABASE_URL
  if [ -f "$ENV_FILE" ]; then
    if [[ "$(uname)" == "Darwin" ]]; then
      sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=\"${PG_URL}\"|" "$ENV_FILE"
    else
      sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"${PG_URL}\"|" "$ENV_FILE"
    fi
  else
    echo "DATABASE_URL=\"${PG_URL}\"" > "$ENV_FILE"
  fi

  echo "    Provider:  postgresql"
  echo "    DB URL:    ${PG_URL}"
  echo ""
  echo "    Note: Make sure PostgreSQL is running and the database exists."
  echo "    You can use: docker compose -f docker-compose.dev.yml up -d"
  echo "    Or run:       ./scripts/setup-postgres.sh"
fi

# ─── Generate Prisma client ─────────────────────────
echo ""
echo "==> Running prisma generate..."
npx prisma generate

echo ""
echo "✅ Done! Switched to ${PROVIDER}."
echo "   Run 'npx prisma db push' to apply the schema to the database."
