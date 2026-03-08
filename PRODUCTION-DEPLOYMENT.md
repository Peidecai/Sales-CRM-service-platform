# 生产部署与安全加固规范 (Production Deployment)

## 现状分析

| 项目                       | 状态        | 说明                                                                  |
| -------------------------- | ----------- | --------------------------------------------------------------------- |
| `docker-compose.yml`       | ✅ 存在     | 包含 mysql/redis/server/web 四个服务                                  |
| `docker/server/Dockerfile` | ✅ 存在     | 多阶段构建，Node 20 Alpine                                            |
| `docker/web/Dockerfile`    | ✅ 存在     | 多阶段构建，Vue build → nginx:1.25-alpine                             |
| `docker/web/nginx.conf`    | ⚠️ 不完整   | **缺少 WebSocket 代理配置**（Socket.IO `/ws/notifications` 无法穿透） |
| `.env.example`             | ⚠️ 安全隐患 | `DB_PASSWORD=crm_password_123` 是真实密码，不应提交                   |
| `docker-compose.yml`       | ⚠️ 安全隐患 | `DB_PASSWORD: crm_password_123` 硬编码在文件中                        |
| CORS 配置                  | ⚠️ 开发默认 | WebSocket Gateway `origin: '*'`，HTTP 未见 CORS 限制                  |
| CI/CD                      | ❌ 缺失     | 无 `.github/workflows/`，无自动化测试流水线                           |

---

## 修复 1：nginx.conf 添加 WebSocket 代理

**文件**: `docker/web/nginx.conf`

**问题**: 当前 nginx 仅代理 `/api/` 前缀，Socket.IO 连接到 `/ws/notifications` 但 nginx 未配置 WebSocket upgrade，导致生产环境实时通知无法工作。

**修复方案**: 在 `/api/` location 之后添加 WebSocket 代理 location：

```nginx
# Proxy WebSocket (Socket.IO) to backend
location /ws/ {
    proxy_pass http://crm-server:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 3600s;   # 1 hour — keep WS alive
    proxy_send_timeout 3600s;
}
```

**完整修复后的 nginx.conf**:

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1024;
    gzip_vary on;
    gzip_comp_level 6;

    # Hashed static assets — long-term immutable cache
    location ~* \.(js|css)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # Images / fonts — 7 day cache
    location ~* \.(png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 7d;
        add_header Cache-Control "public";
        try_files $uri =404;
    }

    # HTML — no cache (always get latest index.html)
    location / {
        add_header Cache-Control "no-cache";
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://crm-server:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        proxy_connect_timeout 10s;
        proxy_buffering on;
        proxy_buffer_size 8k;
        proxy_buffers 4 16k;
    }

    # Proxy WebSocket (Socket.IO) to backend  ← 新增
    location /ws/ {
        proxy_pass http://crm-server:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```

---

## 修复 2：.env.example 安全问题

**文件**: `packages/server/.env.example`

**问题**: `DB_PASSWORD=crm_password_123` 是真实密码，不应作为示例值提交到代码仓库。

**修复**: 替换为占位符提示：

```env
# ================================
# Database (MySQL 8.0)
# ================================
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=<your-database-password>   # 修改此处为实际密码
DB_DATABASE=crm_sales
```

---

## 修复 3：docker-compose.yml 硬编码密码

**问题**: `docker-compose.yml` 中 `DB_PASSWORD: crm_password_123` 硬编码，生产环境应从环境变量或 `.env` 文件读取。

**修复**: 使用环境变量替换，并创建 `.env` 文件（加入 `.gitignore`）：

```yaml
# docker-compose.yml 修改
mysql:
  environment:
    MYSQL_ROOT_PASSWORD: ${DB_PASSWORD:-please-change-in-production}
    MYSQL_DATABASE: crm_sales
    MYSQL_USER: crm_user
    MYSQL_PASSWORD: ${DB_PASSWORD:-please-change-in-production}

server:
  environment:
    DB_PASSWORD: ${DB_PASSWORD:-please-change-in-production}
```

**根目录 `.env` 文件**（加入 `.gitignore`）：

```env
DB_PASSWORD=your_real_production_password
JWT_SECRET=your-64-char-random-string
JWT_REFRESH_SECRET=your-64-char-random-refresh-string
DASHSCOPE_API_KEY=sk-your-real-key
CORS_ORIGINS=https://your-production-domain.com
```

**生成随机 Secret**:

```bash
# 生成 64 字节 base64 字符串
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
# 或
openssl rand -base64 64
```

---

## 修复 4：CORS 生产环境配置

### 后端 NestJS HTTP CORS

**文件**: `packages/server/src/main.ts`

检查 CORS 配置是否支持环境变量控制：

```typescript
// 期望配置方式（通过 CORS_ORIGINS 环境变量）
app.enableCors({
  origin: process.env.CORS_ORIGINS?.split(",") ?? ["http://localhost:5173"],
  credentials: true,
});
```

### WebSocket Gateway CORS

**文件**: `packages/server/src/modules/notification/notification.gateway.ts`

当前：`@WebSocketGateway({ cors: { origin: '*' }, namespace: '/ws/notifications' })`

生产环境应通过 ConfigService 动态读取：

```typescript
// 修改方案：在 afterInit() 中动态配置，或通过工厂函数
// 更简单方案：利用 nginx 统一处理 CORS，Gateway 保持 origin: '*'
// 因为 Socket.IO 请求已被 nginx 代理到内网，实际上不会暴露给外部
```

**推荐**: 由于 nginx 代理在前，Socket.IO Gateway 的 `origin: '*'` 只对内网有效，生产部署安全。但如果直接暴露 3000 端口，则需要限制。

---

## CI/CD 流水线规范（GitHub Actions）

**目录**: `.github/workflows/`

### workflow 1: `ci.yml` — 持续集成（PR/push 触发）

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint

  test-server:
    name: Server Unit Tests
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: test_password
          MYSQL_DATABASE: crm_sales_test
        ports: ["3306:3306"]
        options: --health-cmd="mysqladmin ping" --health-interval=10s --health-timeout=5s --health-retries=5
      redis:
        image: redis:7-alpine
        ports: ["6379:6379"]
        options: --health-cmd="redis-cli ping" --health-interval=10s --health-timeout=5s --health-retries=5
    env:
      NODE_ENV: test
      DB_HOST: localhost
      DB_PORT: 3306
      DB_USERNAME: root
      DB_PASSWORD: test_password
      DB_DATABASE: crm_sales_test
      REDIS_HOST: localhost
      REDIS_PORT: 6379
      JWT_SECRET: test-secret
      JWT_REFRESH_SECRET: test-refresh-secret
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: cd packages/shared && pnpm build
      - run: cd packages/server && pnpm test -- --runInBand --coverage
      - uses: actions/upload-artifact@v4
        with:
          name: server-coverage
          path: packages/server/coverage/

  test-web:
    name: Web Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: cd packages/shared && pnpm build
      - run: cd packages/web && pnpm test

  build:
    name: Build Docker Images
    runs-on: ubuntu-latest
    needs: [lint, test-server, test-web]
    steps:
      - uses: actions/checkout@v4
      - name: Build server image
        run: docker build -f docker/server/Dockerfile -t crm-server:test .
      - name: Build web image
        run: docker build -f docker/web/Dockerfile -t crm-web:test .
```

### workflow 2: `deploy.yml` — 生产部署（仅 main 分支 push 触发）

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: registry.cn-hangzhou.aliyuncs.com
          username: ${{ secrets.REGISTRY_USERNAME }}
          password: ${{ secrets.REGISTRY_PASSWORD }}

      - name: Build and push server
        uses: docker/build-push-action@v5
        with:
          context: .
          file: docker/server/Dockerfile
          push: true
          tags: registry.cn-hangzhou.aliyuncs.com/your-namespace/crm-server:${{ github.sha }},registry.cn-hangzhou.aliyuncs.com/your-namespace/crm-server:latest

      - name: Build and push web
        uses: docker/build-push-action@v5
        with:
          context: .
          file: docker/web/Dockerfile
          push: true
          tags: registry.cn-hangzhou.aliyuncs.com/your-namespace/crm-web:${{ github.sha }},registry.cn-hangzhou.aliyuncs.com/your-namespace/crm-web:latest

      - name: Deploy to server via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          script: |
            cd /opt/crm
            export TAG=${{ github.sha }}
            docker compose pull
            docker compose up -d --no-deps server web
            docker compose exec server node dist/src/main migrate  # 自动执行迁移
```

### GitHub Secrets 配置清单

| Secret Key          | 说明                     |
| ------------------- | ------------------------ |
| `REGISTRY_USERNAME` | 阿里云容器镜像仓库用户名 |
| `REGISTRY_PASSWORD` | 容器镜像仓库密码         |
| `DEPLOY_HOST`       | 生产服务器 IP            |
| `DEPLOY_USER`       | SSH 用户名               |
| `DEPLOY_SSH_KEY`    | SSH 私钥                 |
| `DB_PASSWORD`       | 生产数据库密码           |
| `JWT_SECRET`        | 生产 JWT Secret          |
| `DASHSCOPE_API_KEY` | DashScope AI API Key     |

---

## 生产部署检查清单

```bash
# 1. 环境变量安全检查
# [ ] .env 文件已加入 .gitignore
# [ ] docker-compose.yml 中无硬编码密码
# [ ] JWT_SECRET 使用 64+ 字节随机字符串
# [ ] DB_PASSWORD 使用强密码

# 2. 网络配置
# [ ] nginx.conf 已添加 /ws/ WebSocket 代理
# [ ] CORS_ORIGINS 设置为实际域名（非 *）
# [ ] HTTPS 已配置（生产环境必须）

# 3. 数据库迁移（首次部署）
docker compose exec server sh -c "cd /app/packages/server && node -e \"require('./dist/src/database/migrate').runMigrations()\""
# 或直接：
docker compose exec server node dist/src/main

# 4. 验证服务健康
curl https://your-domain.com/api/v1/health
# 期望: { "code": 0, "data": { "status": "ok" } }

# 5. 验证 WebSocket 可达性
# 浏览器控制台执行：
# import { io } from 'socket.io-client'
# const s = io('/ws/notifications', { auth: { token: 'your-jwt-token' } })
# s.on('connect', () => console.log('WS connected'))

# 6. 安全扫描
docker run --rm -v $(pwd):/app aquasec/trivy fs /app --severity HIGH,CRITICAL
```

---

## 测试验证

### 验证 nginx WebSocket 代理修复

```bash
# 1. 构建并启动
docker-compose up --build -d

# 2. 登录获取 token
TOKEN=$(curl -s -X POST http://localhost/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.data.accessToken')

# 3. 验证 WebSocket 升级（通过 nginx）
# 检查 HTTP 101 Switching Protocols
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: $(openssl rand -base64 16)" \
  http://localhost/ws/notifications/

# 期望响应包含: HTTP/1.1 101 Switching Protocols
```
