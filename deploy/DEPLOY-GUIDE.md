# CRM Sales Platform — Alibaba Cloud ECS Deployment Guide

> Tested on 2026-04-04. ECS: ecs.u1-c1m2.xlarge (4vCPU/8GB), Ubuntu 22.04, 40GB ESSD, Hangzhou

## Prerequisites

- Alibaba Cloud ECS instance with public IP
- Security group: open ports 22 (SSH), 80 (HTTP), 443 (HTTPS)
- SSH access: `ssh root@<ECS_IP>`

---

## Step 1: Clone Repository

GitHub direct access is unreliable in China, use proxy:

```bash
git clone https://ghproxy.net/https://github.com/<your-org>/crm-sales-platform.git /opt/crm-sales-platform
cd /opt/crm-sales-platform

# Set proxy for future pulls
git remote set-url origin https://ghproxy.net/https://github.com/<your-org>/crm-sales-platform.git

# Fix HTTP2 framing issues common in China
git config --global http.version HTTP/1.1
```

## Step 2: Install Docker (Alibaba Cloud Mirror)

China cannot directly use `get.docker.com`, use Alibaba Cloud mirror:

```bash
apt-get update
apt-get install -y ca-certificates curl gnupg

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://mirrors.aliyun.com/docker-ce/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# Use printf to avoid shell expansion issues (hardcode amd64 + jammy)
printf 'deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.gpg] https://mirrors.aliyun.com/docker-ce/linux/ubuntu jammy stable\n' > /etc/apt/sources.list.d/docker.list

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable --now docker
docker --version
docker compose version
```

## Step 3: Configure Docker Registry Mirrors

Docker Hub is blocked in China. Add registry mirrors:

```bash
cat > /etc/docker/daemon.json << 'EOF'
{
  "registry-mirrors": [
    "https://docker.1ms.run",
    "https://docker.xuanyuan.me",
    "https://docker.m.daocloud.io"
  ],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "3"
  }
}
EOF

systemctl restart docker
```

> Note: Mirror availability changes frequently. If builds fail with timeout, search "docker mirror 2026" for latest working mirrors.

## Step 4: Server Initialization

```bash
cd /opt/crm-sales-platform
bash deploy/aliyun-setup.sh
```

This configures:

- UFW firewall (22/80/443 only)
- 2GB swap (important for 8GB RAM with 5 containers)
- Timezone Asia/Shanghai
- Weekly Docker prune cron job
- Docker log rotation

> Note: `aliyun-setup.sh` uses `download.docker.com` for Docker install, which may fail in China. If Docker is already installed from Step 2, the script will skip this step automatically.

## Step 5: Configure Environment

```bash
cd /opt/crm-sales-platform
cp deploy/.env.production.template .env
```

`deploy.sh` will auto-replace all `CHANGE_ME_*` placeholders with random secrets via `openssl rand`.

**Important**: Review `.env` after generation:

- `CORS_ORIGINS` should match your domain/IP
- AI keys (optional) for AI features

## Step 6: Build & Start Services

```bash
bash deploy/deploy.sh
```

This runs: preflight checks → build images → start services → wait healthy.

> **Note**: The migration step in `deploy.sh` may fail due to shell escaping issues. If so, use the manual migration method in Step 7.

### Known Issues During Build

- **pnpm install timeout**: Both Dockerfiles use `registry.npmmirror.com`. If timeout, retry.
- **Image pull timeout**: If `node:20-alpine` or `nginx:1.25-alpine` pull fails, verify registry mirrors in Step 3.

## Step 7: Database Migration (Manual)

Run migration using env-file approach (avoids shell escaping issues):

```bash
source .env

cat > /tmp/migrate.env << EOF
DB_HOST=mysql
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=$DB_ROOT_PASSWORD
DB_DATABASE=crm_sales
NODE_ENV=production
EOF

cat > /tmp/migrate.js << 'MIGEOF'
const { AppDataSource } = require('./dist/database/data-source');
AppDataSource.initialize()
  .then(ds => ds.runMigrations())
  .then(() => { console.log('Migrations OK'); process.exit(0); })
  .catch(e => { console.error('Migration failed:', e); process.exit(1); });
MIGEOF

docker run --rm --network crm-sales-platform_crm-network -v /tmp/migrate.js:/app/packages/server/migrate.js --env-file /tmp/migrate.env -w /app/packages/server crm-sales-platform-server node migrate.js
```

Expected output: `Migrations OK`

> **Why use root?** The auto-generated .env password for `crm_migrator` doesn't match the password set in `docker/mysql/init/00-init.sql`. Use root for migrations, or manually sync the password after first deploy.

## Step 8: Restart Server

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart server
```

## Step 9: Verify

```bash
# All 5 services should be healthy
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps

# Health check
curl http://localhost/api/v1/health
# Expected: {"code":0,"message":"success","data":{"status":"ok","info":{"database":{"status":"up"},"redis":{"status":"up","message":"PONG"}}}}
```

Browser access: `http://<ECS_IP>`, login: `admin` / `admin123`

## Step 10: Security Group (Alibaba Cloud Console)

In ECS console → Security Group → Inbound Rules, ensure:

| Port | Protocol | Source    | Description |
| ---- | -------- | --------- | ----------- |
| 22   | TCP      | Your IP   | SSH         |
| 80   | TCP      | 0.0.0.0/0 | HTTP        |
| 443  | TCP      | 0.0.0.0/0 | HTTPS       |

**Do NOT expose**: 3306 (MySQL), 6379 (Redis), 9000/9001 (MinIO)

---

## Daily Operations

### View logs

```bash
cd /opt/crm-sales-platform
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f server
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f mysql
```

### Restart

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart server
```

### Update code & redeploy

```bash
cd /opt/crm-sales-platform
git pull

# Rebuild
docker compose -f docker-compose.yml -f docker-compose.prod.yml build server
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d server

# Run migration if needed (repeat Step 7)

# Restart
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart server
```

### Backup

```bash
bash deploy/backup.sh

# Cron (daily 3AM):
crontab -e
# Add: 0 3 * * * cd /opt/crm-sales-platform && bash deploy/backup.sh >> /var/log/crm-backup.log 2>&1
```

### Check disk usage

```bash
df -h /
docker system df
```

---

## Troubleshooting

### Docker build fails with network timeout

```bash
# Check/update registry mirrors
cat /etc/docker/daemon.json
# Try pulling base image manually first
docker pull node:20-alpine
```

### git pull fails

```bash
git remote set-url origin https://ghproxy.net/https://github.com/<org>/repo.git
git config --global http.version HTTP/1.1
git pull
```

### Server container keeps restarting

```bash
# Check logs
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs server --tail=50

# Common cause: missing migration (Table/column doesn't exist)
# Fix: run Step 7 manual migration, then restart server
```

### Cannot access from browser

1. Check security group: port 80 must be open (inbound, 0.0.0.0/0)
2. Check UFW: `ufw status` should show 80/tcp ALLOW
3. Check Nginx: `curl http://localhost` from ECS
4. Check container: `docker compose ps` — web should be healthy

### Login returns "Internal Server Error"

```bash
# Check server logs
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs server --tail=100

# Common cause: missing column (entity has field but no migration)
# Fix: create migration, rebuild server image, run Step 7
```

### Docker network name for manual commands

```bash
# Find the actual network name
docker network ls | grep crm
# Usually: crm-sales-platform_crm-network
```

---

## Architecture

```
Internet → :80 (Nginx/Web container)
              ├── /          → Vue SPA (static)
              ├── /api/      → NestJS :3000 (reverse proxy)
              └── /ws/       → WebSocket (upgrade)

Internal (crm-sales-platform_crm-network):
  MySQL  :3306  (512MB limit, utf8mb4)
  Redis  :6379  (256MB limit, AOF + password)
  MinIO  :9000  (S3-compatible file storage)
```

## File Reference

| File                              | Purpose                              |
| --------------------------------- | ------------------------------------ |
| `deploy/aliyun-setup.sh`          | Server init (Docker, firewall, swap) |
| `deploy/.env.production.template` | Env var template                     |
| `deploy/deploy.sh`                | One-click deploy                     |
| `deploy/backup.sh`                | MySQL + Redis backup                 |
| `docker-compose.yml`              | Base service definitions             |
| `docker-compose.prod.yml`         | Production overrides                 |
| `docker/server/Dockerfile`        | NestJS backend image                 |
| `docker/web/Dockerfile`           | Nginx frontend image                 |
| `docker/web/nginx.conf`           | Nginx config                         |
| `docker/mysql/init/00-init.sql`   | DB init (users + permissions)        |
