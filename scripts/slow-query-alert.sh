#!/usr/bin/env bash
# ==============================================================
# CRM Sales Platform — Slow Query Monitor & Alert
# Usage: bash scripts/slow-query-alert.sh
#
# Prerequisites:
#   - percona-toolkit (pt-query-digest)
#   - curl (for DingTalk webhook)
#
# Environment variables (or defaults):
#   SLOW_LOG_PATH       (default: /var/lib/mysql/slow.log)
#   SLOW_QUERY_THRESHOLD (default: 50 — alert if more than N slow queries)
#   SLOW_TIME_THRESHOLD  (default: 300 — alert if total slow query time > N seconds)
#   DINGTALK_WEBHOOK     (required — DingTalk robot webhook URL)
#   DINGTALK_SECRET      (optional — DingTalk robot signing secret)
#   HOSTNAME_LABEL       (default: $(hostname))
#
# Crontab (every 30 minutes):
#   */30 * * * * /bin/bash /opt/crm/scripts/slow-query-alert.sh >> /var/log/crm-slow-query.log 2>&1
# ==============================================================

set -euo pipefail

# ── Configuration ────────────────────────────────────────────
SLOW_LOG_PATH="${SLOW_LOG_PATH:-/var/lib/mysql/slow.log}"
SLOW_QUERY_THRESHOLD="${SLOW_QUERY_THRESHOLD:-50}"
SLOW_TIME_THRESHOLD="${SLOW_TIME_THRESHOLD:-300}"
DINGTALK_WEBHOOK="${DINGTALK_WEBHOOK:-}"
HOSTNAME_LABEL="${HOSTNAME_LABEL:-$(hostname)}"
REPORT_DIR="/tmp/crm-slow-query-reports"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')

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

# ── Prerequisite checks ─────────────────────────────────────
if ! command -v pt-query-digest &> /dev/null; then
    log_error "pt-query-digest not found. Install percona-toolkit:"
    log_error "  apt-get install percona-toolkit  # Debian/Ubuntu"
    log_error "  yum install percona-toolkit       # CentOS/RHEL"
    exit 1
fi

if [[ ! -f "${SLOW_LOG_PATH}" ]]; then
    log_info "Slow query log not found at ${SLOW_LOG_PATH}. Nothing to analyze."
    exit 0
fi

# ── Run pt-query-digest ─────────────────────────────────────
log_info "Analyzing slow query log: ${SLOW_LOG_PATH}"

mkdir -p "${REPORT_DIR}"
REPORT_FILE="${REPORT_DIR}/slow_query_${TIMESTAMP}.txt"

pt-query-digest \
    --limit=20 \
    --since "$(date -d '30 minutes ago' '+%Y-%m-%d %H:%M:%S' 2>/dev/null || date -v-30M '+%Y-%m-%d %H:%M:%S')" \
    "${SLOW_LOG_PATH}" > "${REPORT_FILE}" 2>/dev/null || true

# ── Parse digest results ────────────────────────────────────
# Extract overall stats from the first section
TOTAL_QUERIES=$(grep -oP 'total:\s+\K\d+' "${REPORT_FILE}" | head -1 || echo "0")
TOTAL_TIME=$(grep -oP 'total:\s+[\d.]+\w+\s+\K[\d.]+' "${REPORT_FILE}" | head -1 || echo "0")

# Fallback: count lines if parsing fails
if [[ -z "$TOTAL_QUERIES" || "$TOTAL_QUERIES" == "0" ]]; then
    TOTAL_QUERIES=$(grep -c "^# Query" "${REPORT_FILE}" 2>/dev/null || echo "0")
fi

log_info "Slow queries in last 30 min: ${TOTAL_QUERIES}"
log_info "Total query time: ${TOTAL_TIME}s"

# ── Check thresholds ────────────────────────────────────────
ALERT_NEEDED=false
ALERT_REASONS=""

if [[ "$TOTAL_QUERIES" -gt "$SLOW_QUERY_THRESHOLD" ]]; then
    ALERT_NEEDED=true
    ALERT_REASONS="${ALERT_REASONS}\n- Slow query count: ${TOTAL_QUERIES} (threshold: ${SLOW_QUERY_THRESHOLD})"
fi

# Compare total time (integer comparison, strip decimals)
TOTAL_TIME_INT=${TOTAL_TIME%.*}
TOTAL_TIME_INT=${TOTAL_TIME_INT:-0}
if [[ "$TOTAL_TIME_INT" -gt "$SLOW_TIME_THRESHOLD" ]]; then
    ALERT_NEEDED=true
    ALERT_REASONS="${ALERT_REASONS}\n- Total slow query time: ${TOTAL_TIME}s (threshold: ${SLOW_TIME_THRESHOLD}s)"
fi

# ── Extract top 5 slowest queries for alert ─────────────────
TOP_QUERIES=""
if [[ "$ALERT_NEEDED" == "true" ]]; then
    TOP_QUERIES=$(grep -A 2 "^# Query" "${REPORT_FILE}" | head -30 || echo "No details available")
fi

# ── Send DingTalk Alert ─────────────────────────────────────
send_dingtalk_alert() {
    if [[ -z "${DINGTALK_WEBHOOK}" ]]; then
        log_warn "DINGTALK_WEBHOOK not set. Alert not sent."
        log_warn "Set DINGTALK_WEBHOOK to enable DingTalk notifications."
        return
    fi

    local title="⚠️ CRM 慢查询告警"
    local content="## ⚠️ MySQL 慢查询告警\n\n"
    content+="**主机**: ${HOSTNAME_LABEL}\n\n"
    content+="**时间**: $(date '+%Y-%m-%d %H:%M:%S')\n\n"
    content+="**统计**:\n"
    content+="- 慢查询数量: ${TOTAL_QUERIES}\n"
    content+="- 总执行时间: ${TOTAL_TIME}s\n\n"
    content+="**触发条件**:\n${ALERT_REASONS}\n\n"
    content+="**Top 慢查询**:\n\`\`\`\n${TOP_QUERIES}\n\`\`\`\n\n"
    content+="请及时排查优化！"

    local payload
    payload=$(cat <<EOF
{
    "msgtype": "markdown",
    "markdown": {
        "title": "${title}",
        "text": "${content}"
    }
}
EOF
)

    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Content-Type: application/json" \
        -d "${payload}" \
        "${DINGTALK_WEBHOOK}")

    if [[ "$http_code" == "200" ]]; then
        log_ok "DingTalk alert sent successfully."
    else
        log_error "DingTalk alert failed (HTTP ${http_code})."
    fi
}

# ── Decision ─────────────────────────────────────────────────
if [[ "$ALERT_NEEDED" == "true" ]]; then
    log_warn "Threshold exceeded — sending alert!"
    send_dingtalk_alert
else
    log_ok "Slow queries within acceptable range. No alert needed."
fi

# ── Cleanup old reports (keep last 7 days) ──────────────────
find "${REPORT_DIR}" -name "slow_query_*.txt" -type f -mtime +7 -delete 2>/dev/null || true

log_ok "Slow query analysis complete."
