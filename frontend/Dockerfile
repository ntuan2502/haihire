# Multi-stage production build for HaiHire Frontend
FROM node:26-alpine AS builder

RUN apk add --no-cache libc6-compat

# Install latest pnpm (no pinned version)
RUN npm install -g pnpm

WORKDIR /app

# Copy root workspace manifests
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json ./
COPY packages/shared/package.json ./packages/shared/
COPY frontend/package.json frontend/tsconfig.json ./frontend/

# Install build dependencies using BuildKit pnpm store cache
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --filter @haihire/shared --filter frontend... --frozen-lockfile || \
    pnpm install --filter @haihire/shared --filter frontend...

# Copy source code
COPY packages/shared ./packages/shared
COPY frontend ./frontend

# Set backend host for Next.js build-time rewrite route manifest
ENV BACKEND_HOST=backend
ENV MINIO_HOST=minio

# Build shared and Next.js frontend with output: "standalone"
RUN pnpm --filter @haihire/shared run build && pnpm --filter frontend run build

# Stage 2: Production ultra-lean runtime (standalone mode)
FROM node:26-alpine AS runner

RUN apk add --no-cache libc6-compat

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy Next.js standalone build artifacts and static assets (zero package install needed)
COPY --from=builder /app/frontend/public ./frontend/public
COPY --from=builder /app/frontend/.next/standalone ./
COPY --from=builder /app/frontend/.next/static ./frontend/.next/static

WORKDIR /app/frontend

EXPOSE 3000

# Start Next.js standalone production server directly via Node 26
CMD ["node", "server.js"]
