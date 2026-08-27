#!/usr/bin/env bash
set -e

echo "================================================="
echo "  Starting ATS Platform (Backend:3001, Frontend:3000)"
echo "================================================="

# 1. Start Docker containers
echo "[1/2] Checking PostgreSQL and MinIO Docker services..."
docker-compose up -d postgres minio minio-create-bucket

# 2. Start Apps
echo "[2/2] Launching NestJS Backend and Next.js Frontend concurrently..."
pnpm --parallel -r run dev
