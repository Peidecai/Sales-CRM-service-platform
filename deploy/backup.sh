#!/bin/bash
# =============================================================================
# CRM Sales Platform — Database Backup Script
# =============================================================================
# Usage: bash deploy/backup.sh
# Cron:  0 3 * * * cd /opt/crm-sales-platform && bash deploy/backup.sh
#
# Creates daily backups of MySQL and Redis, keeps 7 days
# =============================================================================
set -euo pipefail

BACKUP_DIR="/opt/crm-backups"
DATE=$(date +%Y%m%d_%H%M%S)
KEEP_DAYS=7

GREEN='\033[1;32m'
BLUE='\033[1;34m'
NC='\033[0m'
info() { echo -e "${BLUE}[INFO]${NC} $(date '+%H:%M:%S') $*"; }
ok()   { echo -e "${GREEN}[ OK ]${NC} $(date '+%H:%M:%S') $*"; }

mkdir -p "$BACKUP_DIR"

# ------- Load env -------
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

if [[ -f .env ]]; then
  set -a
  source .env
  set +a
fi

DB_USER="${DB_USERNAME:-crm_user}"
DB_PASS="${DB_PASSWORD:-}"
DB_NAME="${DB_DATABASE:-crm_sales}"

# ------- MySQL Backup -------
info "Backing up MySQL..."
MYSQL_FILE="$BACKUP_DIR/mysql_${DB_NAME}_${DATE}.sql.gz"

docker compose exec -T mysql mysqldump \
  -u"$DB_USER" -p"$DB_PASS" \
  --single-transaction \
  --routines \
  --triggers \
  --quick \
  "$DB_NAME" \
  | gzip > "$MYSQL_FILE"

MYSQL_SIZE=$(du -sh "$MYSQL_FILE" | cut -f1)
ok "MySQL backup: $MYSQL_FILE ($MYSQL_SIZE)"

# ------- Redis Backup -------
info "Backing up Redis..."
REDIS_FILE="$BACKUP_DIR/redis_dump_${DATE}.rdb"

docker compose exec -T redis redis-cli \
  ${REDIS_PASSWORD:+-a "$REDIS_PASSWORD"} \
  --no-auth-warning \
  BGSAVE &>/dev/null

# Wait for BGSAVE to complete
sleep 2
docker compose cp redis:/data/dump.rdb "$REDIS_FILE" 2>/dev/null || true

if [[ -f "$REDIS_FILE" ]]; then
  REDIS_SIZE=$(du -sh "$REDIS_FILE" | cut -f1)
  ok "Redis backup: $REDIS_FILE ($REDIS_SIZE)"
else
  info "Redis backup skipped (no dump.rdb found)"
fi

# ------- Cleanup old backups -------
info "Cleaning up backups older than ${KEEP_DAYS} days..."
DELETED=$(find "$BACKUP_DIR" -name "mysql_*" -o -name "redis_*" \
  | xargs -r -I{} find {} -mtime +$KEEP_DAYS -delete -print 2>/dev/null \
  | wc -l)
ok "Deleted $DELETED old backup files"

# ------- Summary -------
echo ""
echo "===== Backup Summary ====="
echo "  Location: $BACKUP_DIR"
echo "  MySQL:    $MYSQL_FILE"
echo "  Retain:   ${KEEP_DAYS} days"
echo ""
ls -lhS "$BACKUP_DIR"/ 2>/dev/null | head -10
echo ""

TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
DISK_FREE=$(df -h / | tail -1 | awk '{print $4}')
echo "  Backup total: $TOTAL_SIZE | Disk free: $DISK_FREE"
