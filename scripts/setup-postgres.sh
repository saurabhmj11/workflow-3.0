#!/bin/bash
# ─── OpenWorkflow PostgreSQL Setup ──────────────────
# One-command setup: starts PostgreSQL via Docker, switches
# Prisma to PostgreSQL mode, pushes the schema, and verifies.
#
# Usage:
#   ./scripts/setup-postgres.sh
#
# Prerequisites:
#   - Docker and docker compose must be installed
#   - Port 5432 must be available
#
# To tear down:
#   docker compose -f docker-compose.dev.yml down
#   ./scripts/db-switch.sh sqlite   # Switch back to SQLite
# ────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "╔══════════════════════════════════════════════════╗"
echo "║   OpenWorkflow — PostgreSQL Setup                ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ─── Step 1: Check Docker ──────────────────────────
echo "==> Step 1/5: Checking Docker..."
if ! command -v docker &> /dev/null; then
  echo "Error: Docker is not installed."
  echo "       Install it from: https://docs.docker.com/get-docker/"
  exit 1
fi

if ! docker compose version &> /dev/null; then
  echo "Error: Docker Compose V2 is not available."
  echo "       Update Docker Desktop or install docker-compose-plugin."
  exit 1
fi

echo "    ✓ Docker and Docker Compose are available"
echo ""

# ─── Step 2: Start PostgreSQL ──────────────────────
echo "==> Step 2/5: Starting PostgreSQL via Docker..."
docker compose -f docker-compose.dev.yml up -d

echo "    Waiting for PostgreSQL to be healthy..."
MAX_WAIT=60
WAITED=0
until docker compose -f docker-compose.dev.yml exec -T postgres pg_isready -U openworkflow &> /dev/null; do
  sleep 2
  WAITED=$((WAITED + 2))
  if [ $WAITED -ge $MAX_WAIT ]; then
    echo "Error: PostgreSQL did not become healthy within ${MAX_WAIT}s"
    echo "       Check logs: docker compose -f docker-compose.dev.yml logs postgres"
    exit 1
  fi
  echo "    ...waiting (${WAITED}s)"
done

echo "    ✓ PostgreSQL is healthy and ready"
echo ""

# ─── Step 3: Switch Prisma to PostgreSQL ───────────
echo "==> Step 3/5: Switching Prisma to PostgreSQL..."
# Set POSTGRES_URL for the db-switch script
export POSTGRES_URL="postgresql://openworkflow:openworkflow@localhost:5432/openworkflow?schema=public"
bash scripts/db-switch.sh postgresql

echo ""

# ─── Step 4: Push schema to database ───────────────
echo "==> Step 4/5: Pushing schema to PostgreSQL..."
npx prisma db push

echo "    ✓ Schema applied successfully"
echo ""

# ─── Step 5: Verify ────────────────────────────────
echo "==> Step 5/5: Verifying connection..."
if docker compose -f docker-compose.dev.yml exec -T postgres psql -U openworkflow -d openworkflow -c "SELECT 1;" &> /dev/null; then
  echo "    ✓ Database connection verified"
else
  echo "    ⚠ Could not verify via psql, but Prisma push succeeded."
  echo "      This is fine — Prisma has already validated the connection."
fi

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   ✅ PostgreSQL setup complete!                  ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║                                                  ║"
echo "║   Database:  openworkflow                        ║"
echo "║   Host:      localhost:5432                      ║"
echo "║   User:      openworkflow                        ║"
echo "║   Password:  openworkflow                        ║"
echo "║                                                  ║"
echo "║   Start the app:  bun dev                        ║"
echo "║                                                  ║"
echo "║   To switch back to SQLite:                      ║"
echo "║     ./scripts/db-switch.sh sqlite                ║"
echo "║                                                  ║"
echo "║   To stop PostgreSQL:                            ║"
echo "║     docker compose -f docker-compose.dev.yml down║"
echo "║                                                  ║"
echo "╚══════════════════════════════════════════════════╝"
