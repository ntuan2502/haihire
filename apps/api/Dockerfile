# Multi-stage production build for HaiHire Backend
FROM node:26-alpine AS builder

RUN apk add --no-cache libc6-compat

# Install latest pnpm and clean npm cache
RUN npm install -g pnpm && npm cache clean --force

WORKDIR /app

# Copy root workspace manifests
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install build dependencies using BuildKit pnpm store cache
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --filter @haihire/shared --filter api... --frozen-lockfile || \
    pnpm install --filter @haihire/shared --filter api...

# Copy source code
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
COPY scripts ./scripts

# Build shared and backend (esbuild produces dist/server.mjs)
RUN pnpm --filter @haihire/shared run build && pnpm --filter api run build

# Stage 2: Production lean runtime
FROM node:26-alpine AS runner

# OCI Image Spec Labels
LABEL org.opencontainers.image.title="HaiHire Backend Service" \
      org.opencontainers.image.description="NestJS 12 Enterprise ATS API Service" \
      org.opencontainers.image.vendor="HaiHire Platform" \
      org.opencontainers.image.licenses="Proprietary"

RUN apk add --no-cache libc6-compat

# Install latest pnpm and clean npm cache
RUN npm install -g pnpm && npm cache clean --force

WORKDIR /app

ENV NODE_ENV=production

# Copy root package manifests
COPY --chown=node:node pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json ./
COPY --chown=node:node packages/shared/package.json ./packages/shared/
COPY --chown=node:node apps/api/package.json ./apps/api/

# Install production dependencies with cache mount (instantaneous from cache)
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --prod --filter @haihire/shared --filter api... --frozen-lockfile || \
    pnpm install --prod --filter @haihire/shared --filter api...

# Copy compiled code and Prisma schema with non-root ownership
COPY --chown=node:node --from=builder /app/packages/shared/src ./packages/shared/src
COPY --chown=node:node --from=builder /app/apps/api/dist ./apps/api/dist
COPY --chown=node:node --from=builder /app/apps/api/src/prisma ./apps/api/src/prisma
COPY --chown=node:node --from=builder /app/apps/api/src/common ./apps/api/src/common
COPY --chown=node:node --from=builder /app/scripts ./scripts

WORKDIR /app/apps/api

USER node

EXPOSE 3001

# Run production server using native Node 26 runtime
CMD ["node", "dist/server.mjs"]
