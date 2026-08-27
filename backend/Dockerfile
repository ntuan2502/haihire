# Use Node.js 20 Alpine as base image
FROM node:20-alpine AS base

# Install pnpm globally using corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package management files
COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile || pnpm install

# Copy source code
COPY . .

# Generate Prisma Client
RUN pnpx prisma generate

# Build NestJS application
RUN pnpm run build

# Expose port
EXPOSE 3001

# Start development / production server
CMD ["pnpm", "run", "start:dev"]
