#!/usr/bin/env bash
set -e

# Reset local PostgreSQL development database and re-seed with RFC 4122 UUID v4 IDs
echo "🔄 Resetting local HaiHire database and re-seeding..."

# 1. Ensure schema is synchronized via Prisma
pnpm --filter ./backend run db:update

# 2. Run seed script with updated RFC 4122 UUID v4 demo accounts
pnpm --filter ./backend run db:seed

echo "✅ Re-seed completed successfully with RFC 4122 UUID v4 IDs!"
