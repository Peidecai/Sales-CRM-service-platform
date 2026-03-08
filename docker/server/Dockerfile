# ---- Build stage ----
FROM node:20-alpine AS builder

RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace config
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared/ ./packages/shared/
COPY packages/server/ ./packages/server/

# Build shared package
RUN cd packages/shared && pnpm build

# Build NestJS server
RUN cd packages/server && pnpm build

# ---- Production stage ----
FROM node:20-alpine AS production

RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace config
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/

# Reuse dependencies built in builder stage to keep native bindings (better-sqlite3).
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/server/node_modules ./packages/server/node_modules
COPY --from=builder /app/packages/shared/node_modules ./packages/shared/node_modules

# Copy built shared package
COPY --from=builder /app/packages/shared/ ./packages/shared/

# Copy built server
COPY --from=builder /app/packages/server/dist/ ./packages/server/dist/
COPY --from=builder /app/packages/server/database/ ./packages/server/database/

# Create runtime directories/symlink.
# Nest Swagger metadata in compiled DTOs may reference ../../../../../shared/dist/*
# from inside packages/server/dist, which resolves via packages/server/shared.
RUN mkdir -p /app/packages/server/data \
    && ln -sfn /app/packages/shared /app/packages/server/shared

WORKDIR /app/packages/server

EXPOSE 3000

CMD ["node", "dist/src/main"]
