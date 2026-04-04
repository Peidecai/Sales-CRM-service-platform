#!/bin/bash
# =============================================================================
# CRM Sales Platform — Alibaba Cloud ECS initialization
# Run once on a fresh Ubuntu 22.04 ECS instance
# Usage: sudo bash aliyun-setup.sh
# =============================================================================
set -euo pipefail

BLUE='\033[1;34m'
GREEN='\033[1;32m'
NC='\033[0m'
info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[ OK ]${NC}  $*"; }

# ------- 0. Root check -------
if [[ $EUID -ne 0 ]]; then
  echo "Please run as root: sudo bash $0"
  exit 1
fi

# ------- 1. System update -------
info "Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq
ok "System updated"

# ------- 2. Install Docker Engine -------
if command -v docker &>/dev/null; then
  ok "Docker already installed: $(docker --version)"
else
  info "Installing Docker..."
  apt-get install -y -qq ca-certificates curl gnupg
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg

  echo "deb [arch=$(dpkg --print-architecture) \
    signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list

  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io \
    docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
  ok "Docker installed: $(docker --version)"
fi

# ------- 3. Docker log rotation (critical for 40GB disk) -------
info "Configuring Docker log rotation..."
mkdir -p /etc/docker
cat > /etc/docker/daemon.json <<'DJSON'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "3"
  },
  "storage-driver": "overlay2"
}
DJSON
systemctl restart docker
ok "Docker log rotation: 50MB x 3 per container"

# ------- 4. Common tools -------
info "Installing utilities..."
apt-get install -y -qq git htop ncdu tree
ok "Utilities installed"

# ------- 5. UFW Firewall -------
info "Configuring firewall..."
apt-get install -y -qq ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   comment 'SSH'
ufw allow 80/tcp   comment 'HTTP'
ufw allow 443/tcp  comment 'HTTPS'
ufw --force enable
ok "Firewall: only 22/80/443 open"

# ------- 6. Swap (recommended for 8GB with MySQL) -------
if [[ ! -f /swapfile ]]; then
  info "Creating 2GB swap..."
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  # Reduce swappiness for DB workload
  sysctl vm.swappiness=10
  echo 'vm.swappiness=10' >> /etc/sysctl.conf
  ok "2GB swap enabled (swappiness=10)"
else
  ok "Swap already exists"
fi

# ------- 7. Weekly Docker prune cron (disk saver) -------
info "Setting up weekly Docker cleanup..."
cat > /etc/cron.weekly/docker-prune <<'CRON'
#!/bin/bash
docker system prune -af --filter "until=168h" >> /var/log/docker-prune.log 2>&1
CRON
chmod +x /etc/cron.weekly/docker-prune
ok "Weekly Docker prune enabled"

# ------- 8. Timezone -------
timedatectl set-timezone Asia/Shanghai
ok "Timezone: Asia/Shanghai"

# ------- 9. Backup directory -------
mkdir -p /opt/crm-backups
ok "Backup dir: /opt/crm-backups"

# ------- Done -------
echo ""
echo "======================================="
echo "  ECS initialization complete!"
echo "  Docker:  $(docker --version)"
echo "  Compose: $(docker compose version)"
echo "  Disk:    $(df -h / | tail -1 | awk '{print $4 " free"}')"
echo "  Swap:    $(free -h | grep Swap | awk '{print $2}')"
echo "======================================="
echo ""
echo "Next steps:"
echo "  1. git clone <repo> /opt/crm-sales-platform"
echo "  2. cd /opt/crm-sales-platform"
echo "  3. bash deploy/deploy.sh"
