# Multi-stage production build for HaiHire Backend
FROM node:26-alpine AS builder

RUN apk add --no-cache libc6-compat

# Install pinned pnpm matching packageManager and clean npm cache
RUN npm install -g pnpm@12.18.0 && npm cache clean --force

WORKDIR /app

# Copy root workspace manifests
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install build dependencies using BuildKit pnpm store cache
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --filter @haihire/shared --filter api... --frozen-lockfile

# Copy source code
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
COPY scripts ./scripts

# Generate Prisma Client and build shared + backend (esbuild produces dist/server.mjs)
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" pnpm --filter api run db:generate && \
    mkdir -p /app/.prisma-generated && \
    cp -r /app/node_modules/.pnpm/@prisma+client*/node_modules/.prisma/* /app/.prisma-generated/ && \
    pnpm --filter @haihire/shared run build && \
    pnpm --filter api run build

# Stage 2: Production lean runtime
FROM node:26-alpine AS runner

# OCI Image Spec Labels
LABEL org.opencontainers.image.title="HaiHire Backend Service" \
      org.opencontainers.image.description="NestJS 12 Enterprise ATS API Service" \
      org.opencontainers.image.vendor="HaiHire Platform" \
      org.opencontainers.image.licenses="Proprietary"

RUN apk add --no-cache libc6-compat

# Install pinned pnpm matching packageManager and clean npm cache
RUN npm install -g pnpm@12.18.0 && npm cache clean --force

WORKDIR /app

ENV NODE_ENV=production \
    HOME=/home/node

RUN mkdir -p /app /home/node/.local/share/pnpm/store && chown -R node:node /app /home/node

USER node

# Copy root package manifests
COPY --chown=node:node pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json ./
COPY --chown=node:node packages/shared/package.json ./packages/shared/
COPY --chown=node:node apps/api/package.json ./apps/api/

# Install production dependencies with cache mount (instantaneous from cache)
RUN --mount=type=cache,id=pnpm-node,uid=1000,gid=1000,target=/home/node/.local/share/pnpm/store \
    pnpm install --prod --filter @haihire/shared --filter api... --frozen-lockfile

# Copy pre-generated Prisma Client into the production @prisma/client virtual store entry
COPY --chown=node:node --from=builder /app/.prisma-generated /tmp/.prisma-generated
RUN for dir in /app/node_modules/.pnpm/@prisma+client*/node_modules; do \
      mkdir -p "$dir/.prisma" && cp -r /tmp/.prisma-generated/* "$dir/.prisma/"; \
    done && rm -rf /tmp/.prisma-generated

# Copy compiled code and Prisma schema with non-root ownership
COPY --chown=node:node --from=builder /app/packages/shared/src ./packages/shared/src
COPY --chown=node:node --from=builder /app/apps/api/dist ./apps/api/dist
COPY --chown=node:node --from=builder /app/apps/api/prisma.config.ts ./apps/api/prisma.config.ts
COPY --chown=node:node --from=builder /app/apps/api/src/prisma ./apps/api/src/prisma
COPY --chown=node:node --from=builder /app/apps/api/src/common ./apps/api/src/common
COPY --chown=node:node --from=builder /app/apps/api/src/config/database-url.ts ./apps/api/src/config/database-url.ts
COPY --chown=node:node --from=builder /app/scripts/cleanup-orphan-minio.ts ./scripts/cleanup-orphan-minio.ts

WORKDIR /app/apps/api

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/health || exit 1

# Run production server using native Node 26 runtime
CMD ["node", "dist/server.mjs"]
