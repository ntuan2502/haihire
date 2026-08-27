# Use Node.js 20 Alpine as base image
FROM node:20-alpine AS base

# Install pnpm globally using corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package management files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Copy application source
COPY . .

# Expose Next.js port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start Next.js in development mode
CMD ["pnpm", "run", "dev"]
