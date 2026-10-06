# Multi-stage production build for HaiHire Backend
FROM node:26-alpine AS builder

RUN apk add --no-cache libc6-compat

# Install latest pnpm and clean npm cache
RUN npm install -g pnpm && npm cache clean --force

WORKDIR /app

# Copy root workspace manifests
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json ./
COPY packages/shared/package.json ./packages/shared/
COPY backend/package.json ./backend/

# Install build dependencies using BuildKit pnpm store cache
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --filter @haihire/shared --filter backend... --frozen-lockfile || \
    pnpm install --filter @haihire/shared --filter backend...

# Copy source code
COPY packages/shared ./packages/shared
COPY backend ./backend
COPY scripts ./scripts

# Build shared and backend (esbuild produces dist/server.mjs)
RUN pnpm --filter @haihire/shared run build && pnpm --filter backend run build

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
COPY --chown=node:node backend/package.json ./backend/

# Install production dependencies with cache mount (instantaneous from cache)
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --prod --filter @haihire/shared --filter backend... --frozen-lockfile || \
    pnpm install --prod --filter @haihire/shared --filter backend...

# Copy compiled code, Prisma 8 schema & contract with non-root ownership
COPY --chown=node:node --from=builder /app/packages/shared/src ./packages/shared/src
COPY --chown=node:node --from=builder /app/backend/dist ./backend/dist
COPY --chown=node:node --from=builder /app/backend/src/prisma ./backend/src/prisma
COPY --chown=node:node --from=builder /app/scripts ./scripts

WORKDIR /app/backend

USER node

EXPOSE 3001

# Run production server using native Node 26 runtime
CMD ["node", "dist/server.mjs"]
