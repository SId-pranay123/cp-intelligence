#!/bin/sh
set -e

# Prisma config reads DATABASE_URL; fall back to POSTGRES_URL if not set separately
export DATABASE_URL="${DATABASE_URL:-$POSTGRES_URL}"

# Run Prisma migrations (creates schema on first deploy, applies changes on subsequent)
echo "Running database migrations…"
cd apps/api
npx prisma migrate deploy

# Seed the problems table (upsert — safe to run on every deploy)
echo "Seeding database…"
npx prisma db seed

cd /app

# Start Go processor in background — listens on localhost:50051
echo "Starting Go processor…"
./processor &

# Start NestJS API in foreground — Render routes external traffic here
echo "Starting NestJS API…"
exec node apps/api/dist/main
