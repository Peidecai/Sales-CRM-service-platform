#!/usr/bin/env bash
# ==============================================================
# CRM Sales Platform — Database Backup Script
# Usage: bash scripts/db-backup.sh
#
# Environment variables (or defaults):
#   DB_HOST         (default: 127.0.0.1)
#   DB_PORT         (default: 3306)
#   DB_USERNAME     (default: root)
#   DB_PASSWORD     (required)
#   DB_DATABASE     (default: crm_sales)
#   BACKUP_DIR      (default: /data/backups/mysql)
#   BACKUP_RETAIN_DAYS (default: 30)
#   OSS_BUCKET      (optional — upload to Aliyun OSS if set)
#   OSS_PATH        (default: mysql-backups/)
#
# Crontab (daily at 2:00 AM):
#   0 2 * * * /bin/bash /opt/crm/scripts/db-backup.sh >> /var/log/crm-backup.log 2>&1
# ==============================================================

set -euo pipefail

# ── Configuration ────────────────────────────────────────────
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_USERNAME="${DB_USERNAME:-root}"
DB_PASSWORD="${DB_PASSWORD:?ERROR: DB_PASSWORD is required}"
DB_DATABASE="${DB_DATABASE:-crm_sales}"

BACKUP_DIR="${BACKUP_DIR:-/data/backups/mysql}"
BACKUP_RETAIN_DAYS="${BACKUP_RETAIN_DAYS:-30}"
OSS_BUCKET="${OSS_BUCKET:-}"
OSS_PATH="${OSS_PATH:-mysql-backups/}"

TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BACKUP_FILENAME="${DB_DATABASE}_${TIMESTAMP}.sql.gz"
BACKUP_FILEPATH="${BACKUP_DIR}/${BACKUP_FILENAME}"

# ── Color helpers ────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC}  $(date '+%Y-%m-%d %H:%M:%S') $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $(date '+%Y-%m-%d %H:%M:%S') $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $(date '+%Y-%m-%d %H:%M:%S') $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*"; }

# ── Step 1: Ensure backup directory exists ──────────────────
log_info "========================================"
log_info "CRM Database Backup"
log_info "  Database : ${DB_DATABASE}"
log_info "  Host     : ${DB_HOST}:${DB_PORT}"
log_info "  Backup   : ${BACKUP_FILEPATH}"
log_info "========================================"

mkdir -p "${BACKUP_DIR}"

# ── Step 2: Run mysqldump ───────────────────────────────────
log_info "Step 1/4: Running mysqldump..."

mysqldump \
    --host="${DB_HOST}" \
    --port="${DB_PORT}" \
    --user="${DB_USERNAME}" \
    --password="${DB_PASSWORD}" \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    --set-gtid-purged=OFF \
    --databases "${DB_DATABASE}" \
    2>/dev/null \
    | gzip > "${BACKUP_FILEPATH}"

BACKUP_SIZE=$(du -h "${BACKUP_FILEPATH}" | cut -f1)
log_ok "Backup created: ${BACKUP_FILEPATH} (${BACKUP_SIZE})"

# ── Step 3: Copy binlog files (if available) ────────────────
log_info "Step 2/4: Checking for binary logs..."

BINLOG_DIR="${BACKUP_DIR}/binlogs"
MYSQL_DATA_DIR="/var/lib/mysql"

if [[ -d "${MYSQL_DATA_DIR}" ]]; then
    mkdir -p "${BINLOG_DIR}"
    BINLOG_COUNT=0
    for binlog in "${MYSQL_DATA_DIR}"/binlog.*; do
        if [[ -f "$binlog" ]]; then
            cp "$binlog" "${BINLOG_DIR}/" 2>/dev/null || true
            BINLOG_COUNT=$((BINLOG_COUNT + 1))
        fi
    done
    if [[ $BINLOG_COUNT -gt 0 ]]; then
        log_ok "Copied ${BINLOG_COUNT} binary log files."
    else
        log_info "No binary log files found."
    fi
else
    log_info "MySQL data directory not accessible — skipping binlog backup."
fi

# ── Step 4: Upload to OSS (optional) ────────────────────────
log_info "Step 3/4: OSS upload..."

if [[ -n "${OSS_BUCKET}" ]]; then
    if command -v ossutil64 &> /dev/null || command -v ossutil &> /dev/null; then
        OSS_CMD=$(command -v ossutil64 || command -v ossutil)
        OSS_DEST="oss://${OSS_BUCKET}/${OSS_PATH}${BACKUP_FILENAME}"
        log_info "Uploading to ${OSS_DEST}..."

        if "${OSS_CMD}" cp "${BACKUP_FILEPATH}" "${OSS_DEST}"; then
            log_ok "Upload to OSS completed."
        else
            log_warn "OSS upload failed. Local backup is still available."
        fi
    else
        log_warn "ossutil not found. Install ossutil to enable OSS backup upload."
        log_warn "  Download: https://help.aliyun.com/document_detail/120075.html"
    fi
else
    log_info "OSS_BUCKET not set — skipping cloud upload."
fi

# ── Step 5: Cleanup old backups ─────────────────────────────
log_info "Step 4/4: Cleaning up backups older than ${BACKUP_RETAIN_DAYS} days..."

DELETED_COUNT=$(find "${BACKUP_DIR}" -name "${DB_DATABASE}_*.sql.gz" -type f -mtime "+${BACKUP_RETAIN_DAYS}" -print -delete | wc -l)
log_ok "Deleted ${DELETED_COUNT} old backup files."

# ── Summary ─────────────────────────────────────────────────
TOTAL_BACKUPS=$(find "${BACKUP_DIR}" -name "${DB_DATABASE}_*.sql.gz" -type f | wc -l)
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" 2>/dev/null | cut -f1)

echo ""
log_ok "========================================"
log_ok "Backup completed successfully!"
log_ok "  File    : ${BACKUP_FILEPATH}"
log_ok "  Size    : ${BACKUP_SIZE}"
log_ok "  Total   : ${TOTAL_BACKUPS} backups (${TOTAL_SIZE})"
log_ok "  Retain  : ${BACKUP_RETAIN_DAYS} days"
log_ok "========================================"
