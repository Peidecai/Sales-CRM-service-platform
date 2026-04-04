#!/bin/bash
# =============================================================================
# CRM Sales Platform — One-Click Deploy Script
# =============================================================================
# Usage: bash deploy/deploy.sh [--build] [--migrate-only] [--status]
#
# Prerequisites:
#   - Docker + Docker Compose installed (run aliyun-setup.sh first)
#   - .env file in project root (copy from deploy/.env.production.template)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_CMD="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

RED='\033[1;31m'
BLUE='\033[1;34m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[ OK ]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
fail()  { echo -e "${RED}[FAIL]${NC}  $*"; exit 1; }

cd "$PROJECT_DIR"

# ------- Parse args -------
ACTION="full"
for arg in "$@"; do
  case $arg in
    --build)        ACTION="build" ;;
    --migrate-only) ACTION="migrate" ;;
    --status)       ACTION="status" ;;
    --help)
      echo "Usage: bash deploy/deploy.sh [--build|--migrate-only|--status|--help]"
      exit 0 ;;
  esac
done

# ------- Pre-flight checks -------
preflight() {
  info "Running pre-flight checks..."

  command -v docker &>/dev/null || fail "Docker not found. Run: sudo bash deploy/aliyun-setup.sh"
  docker compose version &>/dev/null || fail "Docker Compose plugin not found"

  if [[ ! -f .env ]]; then
    warn ".env not found. Generating from template..."
    generate_env
  fi

  # Validate critical env vars
  source .env
  for var in DB_PASSWORD DB_ROOT_PASSWORD JWT_SECRET JWT_REFRESH_SECRET REDIS_PASSWORD; do
    val="${!var:-}"
    if [[ -z "$val" || "$val" == CHANGE_ME* ]]; then
      fail "$var is not set or still has placeholder value. Edit .env first."
    fi
  done

  ok "Pre-flight checks passed"
}

# ------- Auto-generate .env with random secrets -------
generate_env() {
  cp deploy/.env.production.template .env

  # Generate random secrets
  JWT_SEC=$(openssl rand -hex 32)
  JWT_REF=$(openssl rand -hex 32)
  ENC_KEY=$(openssl rand -hex 32)
  DB_PASS=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 20)
  DB_ROOT=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 20)
  DB_MIG=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 20)
  REDIS_PW=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 20)
  MINIO_KEY=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 20)
  MINIO_SEC=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32)

  # Replace placeholders
  sed -i "s|CHANGE_ME_jwt_secret|$JWT_SEC|" .env
  sed -i "s|CHANGE_ME_jwt_refresh_secret|$JWT_REF|" .env
  sed -i "s|CHANGE_ME_encryption_key|$ENC_KEY|" .env
  sed -i "s|CHANGE_ME_crm_user_password|$DB_PASS|" .env
  sed -i "s|CHANGE_ME_root_password|$DB_ROOT|" .env
  sed -i "s|CHANGE_ME_migrator_password|$DB_MIG|" .env
  sed -i "s|CHANGE_ME_redis_password|$REDIS_PW|" .env
  sed -i "s|CHANGE_ME_minio_access_key|$MINIO_KEY|" .env
  sed -i "s|CHANGE_ME_minio_secret_key|$MINIO_SEC|" .env

  ok ".env generated with random secrets"
  warn "Review .env before continuing — especially CORS_ORIGINS and AI keys"
}

# ------- Build images -------
build() {
  info "Building Docker images..."
  $COMPOSE_CMD build --parallel
  ok "Images built successfully"
}

# ------- Start services -------
start() {
  info "Starting services..."
  $COMPOSE_CMD up -d
  ok "Services starting..."
}

# ------- Wait for health -------
wait_healthy() {
  info "Waiting for services to become healthy..."

  local max_wait=120
  local elapsed=0

  while [[ $elapsed -lt $max_wait ]]; do
    local healthy
    healthy=$($COMPOSE_CMD ps --format json 2>/dev/null \
      | grep -c '"healthy"' || true)

    # We expect 5 services: mysql, redis, minio, server, web
    if [[ $healthy -ge 5 ]]; then
      ok "All services healthy ($elapsed seconds)"
      return 0
    fi

    echo -ne "\r  Waiting... ${elapsed}s (${healthy}/5 healthy)"
    sleep 5
    elapsed=$((elapsed + 5))
  done

  echo ""
  warn "Timed out waiting for health (${elapsed}s). Current status:"
  $COMPOSE_CMD ps
  fail "Not all services are healthy. Check logs: docker compose logs"
}

# ------- Run database migrations -------
migrate() {
  info "Running database migrations..."

  source .env
  local migrator_user="${DB_MIGRATOR_USERNAME:-crm_migrator}"
  local migrator_pass="${DB_MIGRATOR_PASSWORD:-$DB_PASSWORD}"

  $COMPOSE_CMD exec -T server sh -c \
    "DB_USERNAME=$migrator_user DB_PASSWORD=$migrator_pass \
     node -e \"
       const { AppDataSource } = require('./dist/src/data-source');
       AppDataSource.initialize()
         .then(ds => ds.runMigrations())
         .then(() => { console.log('Migrations complete'); process.exit(0); })
         .catch(e => { console.error('Migration failed:', e.message); process.exit(1); });
     \""

  ok "Migrations applied"
}

# ------- Show status -------
status() {
  echo ""
  echo "===== Service Status ====="
  $COMPOSE_CMD ps
  echo ""

  echo "===== Health Check ====="
  local health
  health=$(curl -sf http://localhost:3000/api/v1/health 2>/dev/null || echo '{"error":"server unreachable"}')
  echo "  $health"
  echo ""

  echo "===== Disk Usage ====="
  df -h / | tail -1 | awk '{printf "  Used: %s / %s (%s)\n", $3, $2, $5}'
  echo "  Docker: $(docker system df --format '{{.Size}}' 2>/dev/null | head -1 || echo 'N/A')"
  echo ""

  echo "===== Access URLs ====="
  local ip
  ip=$(curl -sf http://ifconfig.me 2>/dev/null || echo "120.26.108.226")
  echo "  Web:     http://$ip"
  echo "  API:     http://$ip/api/v1/health"
  echo "  MinIO:   ssh -L 9001:localhost:9001 root@$ip (then http://localhost:9001)"
  echo ""
}

# ------- Main -------
case $ACTION in
  full)
    preflight
    build
    start
    wait_healthy
    migrate
    status
    echo ""
    ok "Deployment complete!"
    ;;
  build)
    preflight
    build
    ;;
  migrate)
    migrate
    ;;
  status)
    status
    ;;
esac
