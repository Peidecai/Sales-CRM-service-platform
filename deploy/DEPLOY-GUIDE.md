# CRM Sales Platform — Alibaba Cloud ECS Deployment Guide

> Actual deployment steps tested on 2026-04-04.
> ECS: ecs.u1-c1m2.xlarge (4vCPU/8GB), Ubuntu 22.04, 40GB ESSD, Hangzhou

## Prerequisites

- Alibaba Cloud ECS instance with public IP
- Security group: open ports 22 (SSH), 80 (HTTP), 443 (HTTPS)
- SSH access: `ssh root@<ECS_IP>`

---

## Step 1: Clone Repository

```bash
# Use GitHub proxy (direct access unreliable in China)
git clone https://ghproxy.net/https://github.com/<your-org>/crm-sales-platform.git /opt/crm-sales-platform
cd /opt/crm-sales-platform

# Set proxy for future pulls
git remote set-url origin https://ghproxy.net/https://github.com/<your-org>/crm-sales-platform.git

# Fix HTTP2 framing issues common in China
git config --global http.version HTTP/1.1
```

## Step 2: Install Docker

China cannot directly use `get.docker.com`. Use Alibaba Cloud mirror:

```bash
# Install dependencies
apt-get update
apt-get install -y ca-certificates curl gnupg

# Add Docker GPG key (Alibaba mirror)
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://mirrors.aliyun.com/docker-ce/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker apt source (Alibaba mirror, hardcode amd64 + jammy)
printf 'deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.gpg] https://mirrors.aliyun.com/docker-ce/linux/ubuntu jammy stable\n' > /etc/apt/sources.list.d/docker.list

# Install Docker
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Enable Docker
systemctl enable --now docker
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

> Note: Mirror availability changes frequently. If builds fail with timeout,
> search "docker mirror 2026" for latest working mirrors.

## Step 4: Server Initialization

```bash
# Run the setup script (firewall, swap, timezone, cron)
bash deploy/aliyun-setup.sh
```

This configures:

- UFW firewall (22/80/443 only)
- 2GB swap (important for 8GB RAM with 5 containers)
- Timezone Asia/Shanghai
- Weekly Docker prune cron job
- Docker log rotation

## Step 5: Configure Environment

```bash
cd /opt/crm-sales-platform

# Auto-generate .env with random secrets
# (deploy.sh does this automatically, but you can do it manually)
cp deploy/.env.production.template .env
```

deploy.sh will auto-replace all `CHANGE_ME_*` placeholders with random secrets via `openssl rand`.

**Important**: Review `.env` after generation:

- `CORS_ORIGINS` should match your domain/IP
- AI keys (optional) for AI features

## Step 6: Build & Deploy

```bash
bash deploy/deploy.sh
```

This runs: preflight checks -> build images -> start services -> wait healthy -> migrate -> status.

### Known Issues During Build

**pnpm install timeout**: Both Dockerfiles already use `registry.npmmirror.com`. If you see timeout errors, the mirror may be temporarily slow — just retry.

**Image pull timeout**: If `node:20-alpine` or `nginx:1.25-alpine` pull fails, verify registry mirrors in Step 3 are still working.

## Step 7: Database Migration (if deploy.sh migration fails)

The deploy.sh migration step may fail due to shell escaping. Use this manual approach:

```bash
# Load env vars
source .env

# Create migration script
cat > /tmp/migrate.js << 'MIGEOF'
const { AppDataSource } = require('./dist/database/data-source');
AppDataSource.initialize()
  .then(ds => ds.runMigrations())
  .then(() => { console.log('Migrations OK'); process.exit(0); })
  .catch(e => { console.error('Migration failed:', e); process.exit(1); });
MIGEOF

# Run migration with root credentials (crm_migrator password may mismatch)
docker run --rm \
  --network crm-network \
  -v /tmp/migrate.js:/app/packages/server/migrate.js \
  -e DB_HOST=mysql \
  -e DB_PORT=3306 \
  -e DB_USERNAME=root \
  -e DB_PASSWORD="$DB_ROOT_PASSWORD" \
  -e DB_DATABASE=crm_sales \
  -e NODE_ENV=production \
  -w /app/packages/server \
  crm-sales-platform-server \
  node migrate.js
```

> **Why root?** The auto-generated .env password for crm_migrator doesn't match
> the password set in `docker/mysql/init/00-init.sql`. Fix: after first deploy,
> manually set crm_migrator password in MySQL to match .env, or always use root for migrations.

## Step 8: Verify

```bash
# All 5 services should be healthy
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps

# Health check
curl http://localhost/api/v1/health
# Expected: {"code":0,"message":"success","data":{"status":"ok","info":{"database":{"status":"up"},"redis":{"status":"up","message":"PONG"}}}}

# Browser access
# http://<ECS_IP>
# Login: admin / admin123
```

## Step 9: Security Group (Alibaba Cloud Console)

In ECS console -> Security Group -> Inbound Rules, ensure:

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
bash deploy/deploy.sh --build
```

### Backup

```bash
bash deploy/backup.sh
# Cron (daily 3AM):
# 0 3 * * * cd /opt/crm-sales-platform && bash deploy/backup.sh >> /var/log/crm-backup.log 2>&1
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
# Use proxy
git remote set-url origin https://ghproxy.net/https://github.com/<org>/repo.git
git config --global http.version HTTP/1.1
git pull
```

### Server container keeps restarting

```bash
# Check logs
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs server --tail=50
# Common cause: missing migrations (Table doesn't exist)
# Fix: run Step 7 manual migration
```

### Cannot access from browser

1. Check security group: port 80 must be open (inbound, 0.0.0.0/0)
2. Check UFW: `ufw status` should show 80/tcp ALLOW
3. Check Nginx: `curl http://localhost` from ECS
4. Check container: `docker compose ps` — web should be healthy

### Login returns "Internal Server Error"

```bash
# Check server logs for the error
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs server --tail=100
```

---

## Architecture

```
Internet -> :80 (Nginx/Web container)
                 |-- /          -> Vue SPA (static)
                 |-- /api/      -> NestJS :3000 (reverse proxy)
                 |-- /ws/       -> WebSocket (upgrade)

Internal (crm-network):
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
