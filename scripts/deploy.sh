#!/usr/bin/env bash
# ==============================================================
# CRM Sales Platform — Deployment Script
# Usage: bash scripts/deploy.sh --env <test|staging|prod> --tag <version> [--skip-backup]
# ==============================================================

set -euo pipefail

# ── Color helpers ────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info()  { echo -e "${BLUE}[INFO]${NC}  $(date '+%Y-%m-%d %H:%M:%S') $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $(date '+%Y-%m-%d %H:%M:%S') $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $(date '+%Y-%m-%d %H:%M:%S') $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*"; }

# ── Default values ───────────────────────────────────────────
ENV=""
TAG=""
SKIP_BACKUP=false
HEALTH_URL="http://localhost:3000/api/v1/health"
HEALTH_TIMEOUT=120
COMPOSE_FILE="docker-compose.yml"
BACKUP_SCRIPT="scripts/db-backup.sh"

# ── Parse arguments ──────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case "$1" in
        --env)       ENV="$2";          shift 2 ;;
        --env=*)     ENV="${1#*=}";      shift ;;
        --tag)       TAG="$2";          shift 2 ;;
        --tag=*)     TAG="${1#*=}";      shift ;;
        --skip-backup) SKIP_BACKUP=true; shift ;;
        --skip-backup=*) SKIP_BACKUP="${1#*=}"; shift ;;
        -h|--help)
            echo "Usage: $0 --env <test|staging|prod> --tag <version> [--skip-backup]"
            exit 0
            ;;
        *) log_error "Unknown argument: $1"; exit 1 ;;
    esac
done

# ── Validate arguments ──────────────────────────────────────
if [[ -z "$ENV" ]]; then
    log_error "--env is required (test|staging|prod)"
    exit 1
fi

if [[ ! "$ENV" =~ ^(test|staging|prod|production)$ ]]; then
    log_error "Invalid environment: $ENV. Must be test, staging, or prod."
    exit 1
fi

if [[ -z "$TAG" ]]; then
    log_error "--tag is required (e.g., v1.0.0, sha-abc123)"
    exit 1
fi

# Normalize env name
[[ "$ENV" == "production" ]] && ENV="prod"

# Use environment-specific compose override if it exists
COMPOSE_OVERRIDE="docker-compose.${ENV}.yml"
if [[ -f "$COMPOSE_OVERRIDE" ]]; then
    COMPOSE_FILE="${COMPOSE_FILE} -f ${COMPOSE_OVERRIDE}"
fi

log_info "========================================"
log_info "Deploying CRM Sales Platform"
log_info "  Environment : ${ENV}"
log_info "  Image Tag   : ${TAG}"
log_info "  Skip Backup : ${SKIP_BACKUP}"
log_info "========================================"

# ── Step 1: Database backup (optional) ──────────────────────
if [[ "$SKIP_BACKUP" != "true" && "$SKIP_BACKUP" != "false" ]]; then
    SKIP_BACKUP=false
fi

if [[ "$SKIP_BACKUP" == "false" ]]; then
    if [[ -x "$BACKUP_SCRIPT" ]]; then
        log_info "Step 1/6: Running database backup..."
        if bash "$BACKUP_SCRIPT"; then
            log_ok "Database backup completed."
        else
            log_warn "Database backup failed — continuing deployment (data is still safe)."
        fi
    else
        log_warn "Backup script not found or not executable at ${BACKUP_SCRIPT}. Skipping backup."
    fi
else
    log_info "Step 1/6: Skipping database backup (--skip-backup)."
fi

# ── Step 2: Pull latest images ──────────────────────────────
log_info "Step 2/6: Pulling Docker images (tag: ${TAG})..."

if [[ -n "${ACR_REGISTRY:-}" ]]; then
    docker pull "${ACR_REGISTRY}/crm-server:${TAG}" || true
    docker pull "${ACR_REGISTRY}/crm-web:${TAG}" || true
    # Tag for local compose usage
    docker tag "${ACR_REGISTRY}/crm-server:${TAG}" "crm-server:${TAG}" 2>/dev/null || true
    docker tag "${ACR_REGISTRY}/crm-web:${TAG}" "crm-web:${TAG}" 2>/dev/null || true
else
    log_warn "ACR_REGISTRY not set. Using locally built images."
fi

log_ok "Images ready."

# ── Step 3: Pre-deployment health check ─────────────────────
log_info "Step 3/6: Pre-deployment health check..."
PRE_HEALTH="unknown"
if curl -sf --max-time 5 "${HEALTH_URL}" > /dev/null 2>&1; then
    PRE_HEALTH="healthy"
    log_ok "Current service is healthy."
else
    PRE_HEALTH="unhealthy"
    log_warn "Current service is not responding (may be first deploy)."
fi

# ── Step 4: Export image tag and stop old containers ────────
log_info "Step 4/6: Stopping current containers..."
export IMAGE_TAG="${TAG}"

# Graceful stop with timeout
docker compose -f ${COMPOSE_FILE} stop --timeout 30 server web 2>/dev/null || true
log_ok "Old containers stopped."

# ── Step 5: Start new containers ────────────────────────────
log_info "Step 5/6: Starting new containers..."
docker compose -f ${COMPOSE_FILE} up -d --remove-orphans
log_ok "Containers started."

# ── Step 6: Post-deployment health check with retry ─────────
log_info "Step 6/6: Waiting for health check (timeout: ${HEALTH_TIMEOUT}s)..."

SECONDS_WAITED=0
INTERVAL=5

while [[ $SECONDS_WAITED -lt $HEALTH_TIMEOUT ]]; do
    if curl -sf --max-time 5 "${HEALTH_URL}" > /dev/null 2>&1; then
        log_ok "Health check passed after ${SECONDS_WAITED}s!"
        echo ""
        log_ok "========================================"
        log_ok "Deployment to [${ENV}] completed successfully!"
        log_ok "  Tag: ${TAG}"
        log_ok "  Time: $(date '+%Y-%m-%d %H:%M:%S')"
        log_ok "========================================"
        exit 0
    fi

    sleep $INTERVAL
    SECONDS_WAITED=$((SECONDS_WAITED + INTERVAL))
    echo -ne "\r  Waiting... ${SECONDS_WAITED}/${HEALTH_TIMEOUT}s"
done

echo ""

# ── Rollback on health check failure ────────────────────────
log_error "Health check failed after ${HEALTH_TIMEOUT}s!"
log_error "Attempting rollback..."

# Show container logs for debugging
log_info "Recent server logs:"
docker compose -f ${COMPOSE_FILE} logs --tail=50 server 2>/dev/null || true

log_error "========================================"
log_error "DEPLOYMENT FAILED — manual intervention required"
log_error "  Environment: ${ENV}"
log_error "  Tag: ${TAG}"
log_error "  Check logs: docker compose logs server"
log_error "========================================"

exit 1
