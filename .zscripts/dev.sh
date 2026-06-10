#!/bin/bash
# OpenWorkflow dev script
# Executed by /start.sh as: sudo -u z bash /home/z/my-project/.zscripts/dev.sh
# Runs in background subshell under the Caddy process tree
set -e

cd /home/z/my-project

# Generate Prisma client
npx prisma generate --no-hints 2>/dev/null || true

# Push schema to database
npx prisma db push --skip-generate 2>/dev/null || true

# Start the Next.js dev server
exec npx next dev -p 3000 -H 0.0.0.0
