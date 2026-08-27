# PowerShell script to start ATS Infrastructure and Apps concurrently
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  Starting ATS Platform (Backend:3001, Frontend:3000)" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# 1. Ensure Docker containers are running
Write-Host "`n[1/2] Checking PostgreSQL and MinIO Docker services..." -ForegroundColor Yellow
docker-compose up -d postgres minio minio-create-bucket

# 2. Run Backend (Port 3001) & Frontend (Port 3000) concurrently
Write-Host "`n[2/2] Launching NestJS Backend and Next.js Frontend concurrently..." -ForegroundColor Green
pnpm --parallel -r run dev
