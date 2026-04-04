# ============================================================
# Stage 1 — deps: install workspace dependencies
# ============================================================
FROM node:20-alpine AS deps

RUN npm install -g pnpm@9 --registry=https://registry.npmmirror.com

WORKDIR /app

# Use China npm mirror for faster installs
RUN pnpm config set registry https://registry.npmmirror.com

# Copy workspace config for dependency caching
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/web/package.json ./packages/web/

# Install all dependencies (frozen lockfile for reproducibility)
RUN pnpm install --frozen-lockfile

# ============================================================
# Stage 2 — builder: compile shared + web
# ============================================================
FROM deps AS builder

# Copy source code
COPY packages/shared/ ./packages/shared/
COPY packages/web/ ./packages/web/

# Build shared package first (web depends on it)
RUN pnpm --filter @crm/shared build

# Build Vue frontend
RUN pnpm --filter @crm/web build

# ============================================================
# Stage 3 — prod: serve with nginx (non-root)
# ============================================================
FROM nginx:1.25-alpine AS production

# Remove default nginx config
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY docker/web/nginx.conf /etc/nginx/nginx.conf

# Copy built frontend assets
COPY --from=builder /app/packages/web/dist /usr/share/nginx/html

# Create non-root nginx user and fix permissions
RUN chown -R nginx:nginx /usr/share/nginx/html \
    && chown -R nginx:nginx /var/cache/nginx \
    && chown -R nginx:nginx /var/log/nginx \
    && touch /var/run/nginx.pid \
    && chown nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
