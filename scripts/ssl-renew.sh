#!/usr/bin/env bash
# ==============================================================
# CRM Sales Platform — SSL Certificate Auto-Renewal
# Usage: bash scripts/ssl-renew.sh
#
# This script uses acme.sh (recommended) or certbot to
# obtain and renew LetsEncrypt SSL certificates.
#
# Environment variables:
#   DOMAIN          (required — e.g., crm.example.com)
#   DOMAIN_WILDCARD (optional — e.g., *.example.com)
#   SSL_TOOL        (default: acme.sh — or certbot)
#   EMAIL           (required — LetsEncrypt account email)
#   NGINX_CONTAINER (default: crm-web)
#   CERT_DIR        (default: /etc/ssl/crm)
#
#   # For Aliyun DNS API (wildcard certs):
#   Ali_Key         (Aliyun AccessKey ID)
#   Ali_Secret      (Aliyun AccessKey Secret)
#
# Crontab (monthly on the 1st at 3 AM):
#   0 3 1 * * /bin/bash /opt/crm/scripts/ssl-renew.sh >> /var/log/crm-ssl-renew.log 2>&1
# ==============================================================

set -euo pipefail

# ── Configuration ────────────────────────────────────────────
DOMAIN="${DOMAIN:?ERROR: DOMAIN is required (e.g., crm.example.com)}"
DOMAIN_WILDCARD="${DOMAIN_WILDCARD:-}"
SSL_TOOL="${SSL_TOOL:-acme.sh}"
EMAIL="${EMAIL:?ERROR: EMAIL is required for LetsEncrypt}"
NGINX_CONTAINER="${NGINX_CONTAINER:-crm-web}"
CERT_DIR="${CERT_DIR:-/etc/ssl/crm}"
ACME_HOME="${ACME_HOME:-~/.acme.sh}"

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

# ── Ensure certificate directory exists ─────────────────────
mkdir -p "${CERT_DIR}"

log_info "========================================"
log_info "SSL Certificate Renewal"
log_info "  Domain  : ${DOMAIN}"
log_info "  Tool    : ${SSL_TOOL}"
log_info "  Cert Dir: ${CERT_DIR}"
log_info "========================================"

# ── Reload nginx function ───────────────────────────────────
reload_nginx() {
    log_info "Reloading nginx..."
    if docker exec "${NGINX_CONTAINER}" nginx -s reload 2>/dev/null; then
        log_ok "Nginx reloaded successfully."
    elif systemctl reload nginx 2>/dev/null; then
        log_ok "Nginx (systemd) reloaded successfully."
    elif nginx -s reload 2>/dev/null; then
        log_ok "Nginx reloaded successfully."
    else
        log_warn "Could not reload nginx automatically. Please reload manually."
    fi
}

# ── Option A: acme.sh ───────────────────────────────────────
renew_with_acme() {
    # Install acme.sh if not present
    if [[ ! -f "${ACME_HOME}/acme.sh" ]]; then
        log_info "Installing acme.sh..."
        curl -fsSL https://get.acme.sh | sh -s email="${EMAIL}"
        source "${ACME_HOME}/acme.sh.env" 2>/dev/null || true
    fi

    local ACME="${ACME_HOME}/acme.sh"
    local DOMAINS="-d ${DOMAIN}"

    # Add wildcard domain if configured (requires DNS API)
    if [[ -n "${DOMAIN_WILDCARD}" ]]; then
        DOMAINS="${DOMAINS} -d ${DOMAIN_WILDCARD}"
    fi

    # Determine validation method
    if [[ -n "${Ali_Key:-}" && -n "${Ali_Secret:-}" ]]; then
        # Use Aliyun DNS API for DNS-01 validation (supports wildcard)
        log_info "Using Aliyun DNS API for validation..."
        export Ali_Key Ali_Secret

        ${ACME} --issue \
            --dns dns_ali \
            ${DOMAINS} \
            --keylength ec-256 \
            --force \
            || log_warn "Issue command returned non-zero (may already be valid)."
    else
        # Use HTTP-01 validation (webroot mode)
        log_info "Using HTTP-01 webroot validation..."
        local WEBROOT="/usr/share/nginx/html"

        ${ACME} --issue \
            --webroot "${WEBROOT}" \
            ${DOMAINS} \
            --keylength ec-256 \
            --force \
            || log_warn "Issue command returned non-zero (may already be valid)."
    fi

    # Install certificate
    log_info "Installing certificate to ${CERT_DIR}..."
    ${ACME} --install-cert -d "${DOMAIN}" \
        --key-file       "${CERT_DIR}/privkey.pem" \
        --fullchain-file "${CERT_DIR}/fullchain.pem" \
        --reloadcmd      "docker exec ${NGINX_CONTAINER} nginx -s reload 2>/dev/null || nginx -s reload 2>/dev/null || true"

    log_ok "Certificate installed via acme.sh."
}

# ── Option B: certbot ───────────────────────────────────────
renew_with_certbot() {
    if ! command -v certbot &> /dev/null; then
        log_error "certbot not found. Install it:"
        log_error "  apt install certbot python3-certbot-nginx  # Debian/Ubuntu"
        log_error "  yum install certbot python3-certbot-nginx  # CentOS/RHEL"
        exit 1
    fi

    log_info "Running certbot renew..."

    certbot certonly \
        --webroot \
        --webroot-path /usr/share/nginx/html \
        -d "${DOMAIN}" \
        --email "${EMAIL}" \
        --agree-tos \
        --non-interactive \
        --keep-until-expiring \
        --preferred-challenges http-01

    # Copy certs to our standard location
    local CERTBOT_DIR="/etc/letsencrypt/live/${DOMAIN}"
    if [[ -d "${CERTBOT_DIR}" ]]; then
        cp "${CERTBOT_DIR}/fullchain.pem" "${CERT_DIR}/fullchain.pem"
        cp "${CERTBOT_DIR}/privkey.pem"   "${CERT_DIR}/privkey.pem"
        log_ok "Certificate copied to ${CERT_DIR}."
    fi

    log_ok "Certificate renewed via certbot."
}

# ── Execute renewal ─────────────────────────────────────────
case "${SSL_TOOL}" in
    acme.sh|acme)
        renew_with_acme
        ;;
    certbot)
        renew_with_certbot
        ;;
    *)
        log_error "Unknown SSL_TOOL: ${SSL_TOOL}. Use acme.sh or certbot."
        exit 1
        ;;
esac

# ── Reload nginx ────────────────────────────────────────────
reload_nginx

# ── Verify certificate ──────────────────────────────────────
if [[ -f "${CERT_DIR}/fullchain.pem" ]]; then
    EXPIRY=$(openssl x509 -enddate -noout -in "${CERT_DIR}/fullchain.pem" 2>/dev/null | cut -d= -f2)
    log_ok "Certificate valid until: ${EXPIRY}"
else
    log_warn "Certificate file not found at ${CERT_DIR}/fullchain.pem"
fi

echo ""
log_ok "========================================"
log_ok "SSL certificate renewal complete!"
log_ok "========================================"
