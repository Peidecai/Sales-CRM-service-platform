# CRM Sales Platform — Deployment Guide

## Prerequisites

- Alibaba Cloud ECS (4vCPU / 8GB recommended)
- Ubuntu 22.04
- Public IP assigned

## Quick Start (3 steps)

### 1. Initialize Server

SSH into ECS and run:

```bash
ssh root@120.26.108.226

# Clone repo
git clone <your-repo-url> /opt/crm-sales-platform
cd /opt/crm-sales-platform

# Initialize server (install Docker, firewall, swap)
sudo bash deploy/aliyun-setup.sh
```

### 2. Configure Environment

```bash
# Copy template
cp deploy/.env.production.template .env

# Edit: review CORS_ORIGINS, add AI keys if needed
vim .env
```

> `deploy.sh` will auto-generate random secrets for passwords/JWT/encryption if placeholders are detected.

### 3. Deploy

```bash
bash deploy/deploy.sh
```

This will:

1. Validate `.env` configuration
2. Build Docker images (NestJS server + Nginx frontend)
3. Start all 5 services (MySQL, Redis, MinIO, Server, Web)
4. Wait for health checks
5. Run database migrations
6. Print access URLs

Access: `http://120.26.108.226`
Login: `admin` / `admin123`

---

## Service Architecture

```
Internet → :80 (Nginx)
                ├── /          → Vue SPA (static files)
                ├── /api/      → NestJS :3000 (reverse proxy)
                └── /ws/       → WebSocket (upgrade)

Internal (crm-network):
  ├── MySQL  :3306  (512MB, utf8mb4)
  ├── Redis  :6379  (256MB, AOF + password)
  └── MinIO  :9000  (S3-compatible storage)
```

## Common Operations

### View logs

```bash
cd /opt/crm-sales-platform

# All services
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f server
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f mysql
```

### Restart services

```bash
# Restart all
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart

# Restart single service
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart server
```

### Update deployment

```bash
cd /opt/crm-sales-platform
git pull
bash deploy/deploy.sh --build
```

### Run migrations only

```bash
bash deploy/deploy.sh --migrate-only
```

### Check status

```bash
bash deploy/deploy.sh --status
```

### Manual health check

```bash
curl http://localhost/api/v1/health
# Expected: {"database":{"status":"up"},"redis":{"status":"up"}}
```

## Backup

### Manual backup

```bash
bash deploy/backup.sh
```

### Automatic daily backup (cron)

```bash
crontab -e
# Add:
0 3 * * * cd /opt/crm-sales-platform && bash deploy/backup.sh >> /var/log/crm-backup.log 2>&1
```

Backups stored in `/opt/crm-backups/`, 7-day retention.

### Restore from backup

```bash
# MySQL
gunzip < /opt/crm-backups/mysql_crm_sales_YYYYMMDD_HHMMSS.sql.gz \
  | docker compose exec -T mysql mysql -ucrm_user -p<password> crm_sales

# Redis
docker compose cp /opt/crm-backups/redis_dump_YYYYMMDD_HHMMSS.rdb redis:/data/dump.rdb
docker compose restart redis
```

## Security Checklist

### Alibaba Cloud Console — Security Group

| Port | Protocol | Source       | Description |
| ---- | -------- | ------------ | ----------- |
| 22   | TCP      | Your IP only | SSH         |
| 80   | TCP      | 0.0.0.0/0    | HTTP        |
| 443  | TCP      | 0.0.0.0/0    | HTTPS       |

> MySQL (3306), Redis (6379), MinIO (9000) must NOT be exposed.

### Server Security

- [x] Redis password enabled (docker-compose.prod.yml)
- [x] DB root password isolated from app container
- [x] Swagger disabled in production
- [x] CORS restricted to specific origin
- [x] UFW firewall (only 22/80/443)
- [x] Non-root Docker containers
- [ ] Change default admin password after first login
- [ ] Set up SSH key authentication (disable password)

### SSH key-only auth (recommended)

```bash
# On your local machine
ssh-copy-id root@120.26.108.226

# On ECS: disable password auth
sed -i 's/^#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd
```

## Disk Management (40GB)

Monitor disk usage:

```bash
# Overall
df -h /

# Docker usage
docker system df

# Find large directories
ncdu /var/lib/docker
```

Automatic cleanup:

- Docker log rotation: 50MB x 3 per container
- Weekly `docker system prune` (cron, via aliyun-setup.sh)
- MySQL binlog expiration: 3 days

Manual cleanup:

```bash
# Remove unused images
docker image prune -af

# Remove build cache
docker builder prune -af
```

## Troubleshooting

### Service won't start

```bash
# Check logs
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs <service>

# Common: MySQL needs time to initialize on first run
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs mysql
```

### Migration fails

```bash
# Check server can reach MySQL
docker compose exec server sh -c "wget -qO- http://mysql:3306 || echo 'MySQL port reachable'"

# Run migration manually
docker compose exec server sh -c \
  "DB_USERNAME=crm_migrator DB_PASSWORD=<pwd> node -e \"
    const {AppDataSource}=require('./dist/src/data-source');
    AppDataSource.initialize().then(d=>d.runMigrations()).then(()=>process.exit(0))
  \""
```

### Out of disk space

```bash
# Check what's using space
ncdu /
docker system df -v

# Emergency cleanup
docker system prune -af
find /opt/crm-backups -mtime +3 -delete
```

### Access MinIO console

MinIO console is not exposed externally. Use SSH tunnel:

```bash
# On your local machine
ssh -L 9001:localhost:9001 root@120.26.108.226

# Then open: http://localhost:9001
# Login with OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET from .env
```

## File Reference

| File                              | Purpose                                    |
| --------------------------------- | ------------------------------------------ |
| `deploy/aliyun-setup.sh`          | Server init (Docker, firewall, swap)       |
| `deploy/.env.production.template` | Environment variable template              |
| `deploy/deploy.sh`                | One-click deploy (build + start + migrate) |
| `deploy/backup.sh`                | MySQL + Redis daily backup                 |
| `docker-compose.yml`              | Base service definitions                   |
| `docker-compose.prod.yml`         | Production overrides (security)            |
| `docker/server/Dockerfile`        | NestJS backend image                       |
| `docker/web/Dockerfile`           | Nginx frontend image                       |
| `docker/web/nginx.conf`           | Nginx config (proxy, security)             |
| `docker/mysql/init/00-init.sql`   | DB init (users + permissions)              |
