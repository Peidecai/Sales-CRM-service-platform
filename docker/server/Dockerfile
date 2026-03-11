# ============================================================
# Stage 1 — deps: install workspace dependencies
# ============================================================
FROM node:20-alpine AS deps

RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace config for dependency caching
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/

# Install all dependencies (frozen lockfile for reproducibility)
RUN pnpm install --frozen-lockfile

# ============================================================
# Stage 2 — builder: compile shared + server
# ============================================================
FROM deps AS builder

# Copy source code
COPY packages/shared/ ./packages/shared/
COPY packages/server/ ./packages/server/

# Build shared package first (server depends on it)
RUN pnpm --filter @crm/shared build

# Build NestJS server
RUN pnpm --filter @crm/server build

# ============================================================
# Stage 3 — prod: minimal runtime with tini + non-root
# ============================================================
FROM node:20-alpine AS production

# Install tini for proper PID 1 signal handling
RUN apk add --no-cache tini

WORKDIR /app

# Copy workspace config (needed for pnpm workspace resolution)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/

# Copy node_modules from deps stage (preserves native bindings)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/server/node_modules ./packages/server/node_modules
COPY --from=builder /app/packages/shared/node_modules ./packages/shared/node_modules

# Copy built shared package
COPY --from=builder /app/packages/shared/ ./packages/shared/

# Copy built server (dist + database migrations)
COPY --from=builder /app/packages/server/dist/ ./packages/server/dist/
COPY --from=builder /app/packages/server/database/ ./packages/server/database/

# Create runtime directories and symlink for Swagger metadata resolution
RUN mkdir -p /app/packages/server/data \
    && ln -sfn /app/packages/shared /app/packages/server/shared \
    && chown -R node:node /app/packages/server/data

WORKDIR /app/packages/server

# Run as non-root user (node user is built-in to node:alpine)
USER node

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
    CMD wget -qO- http://localhost:3000/api/v1/health || exit 1

# Use tini as PID 1 for proper signal forwarding
ENTRYPOINT ["/sbin/tini", "--"]

CMD ["node", "dist/src/main"]
