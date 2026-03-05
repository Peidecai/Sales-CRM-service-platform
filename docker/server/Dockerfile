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
RUN cd packages/shared && pnpm build 2>/dev/null || true

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

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built shared package
COPY --from=builder /app/packages/shared/ ./packages/shared/

# Copy built server
COPY --from=builder /app/packages/server/dist/ ./packages/server/dist/
COPY --from=builder /app/packages/server/database/ ./packages/server/database/

# Create data directory for SQLite vector store
RUN mkdir -p /app/packages/server/data

WORKDIR /app/packages/server

EXPOSE 3000

CMD ["node", "dist/src/main"]
