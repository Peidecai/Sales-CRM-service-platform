## 13. 部署与运维设计

### 13.1 部署架构图

#### 13.1.1 生产环境部署架构总览

```
                              ┌─────────────┐
                              │   DNS解析    │
                              │ (阿里云DNS)  │
                              └──────┬───────┘
                                     │
                              ┌──────▼───────┐
                              │  阿里云CDN   │
                              │ 静态资源加速  │
                              │ *.js *.css   │
                              │ *.png *.jpg  │
                              └──────┬───────┘
                                     │
                              ┌──────▼───────┐
                              │   阿里云SLB   │
                              │  (负载均衡)   │
                              │  HTTPS:443   │
                              │  HTTP→HTTPS  │
                              └──────┬───────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                                  │
             ┌──────▼───────┐                  ┌──────▼───────┐
             │   ECS-01     │                  │   ECS-02     │
             │  4核8G       │                  │  4核8G       │
             │  ──────────  │                  │  ──────────  │
             │ ┌──────────┐ │                  │ ┌──────────┐ │
             │ │  Nginx   │ │                  │ │  Nginx   │ │
             │ │ :80/:443 │ │                  │ │ :80/:443 │ │
             │ └────┬─────┘ │                  │ └────┬─────┘ │
             │      │       │                  │      │       │
             │ ┌────▼─────┐ │                  │ ┌────▼─────┐ │
             │ │ Frontend │ │                  │ │ Frontend │ │
             │ │ (静态文件)│ │                  │ │ (静态文件)│ │
             │ └──────────┘ │                  │ └──────────┘ │
             │ ┌──────────┐ │                  │ ┌──────────┐ │
             │ │ Backend  │ │                  │ │ Backend  │ │
             │ │ (Docker) │ │                  │ │ (Docker) │ │
             │ │  :3000   │ │                  │ │  :3000   │ │
             │ └──────────┘ │                  │ └──────────┘ │
             │ ┌──────────┐ │                  │ ┌──────────┐ │
             │ │ Node-    │ │                  │ │ Node-    │ │
             │ │ Exporter │ │                  │ │ Exporter │ │
             │ │  :9100   │ │                  │ │  :9100   │ │
             │ └──────────┘ │                  │ └──────────┘ │
             └──────┬───────┘                  └──────┬───────┘
                    │                                  │
        ┌───────────┴──────────────────────────────────┘
        │
        │        ┌──────────────────┐     ┌──────────────────┐
        ├───────►│  RDS MySQL       │     │  阿里云Redis     │
        │        │  4核8G (主从)     │     │  2G              │
        │        │  :3306           │     │  :6379           │
        │        │  ┌────┐ ┌────┐  │     │                  │
        │        │  │主库│→│从库│  │     │  会话缓存/数据缓存 │
        │        │  └────┘ └────┘  │     └──────────────────┘
        │        └──────────────────┘
        │
        │        ┌──────────────────┐
        └───────►│  阿里云OSS       │
                 │  文件存储         │
                 │  头像/附件/合同   │
                 └──────────────────┘
```

#### 13.1.2 网络拓扑与安全域划分

```
┌─────────────────────────────────────────────────────────────┐
│                     VPC: 172.16.0.0/12                      │
│                                                             │
│  ┌───────────────────────────────────┐                      │
│  │    公网子网 172.16.0.0/24         │                      │
│  │  ┌─────┐  ┌────────┐ ┌────────┐  │                      │
│  │  │ SLB │  │ ECS-01 │ │ ECS-02 │  │                      │
│  │  └─────┘  └────────┘ └────────┘  │                      │
│  └───────────────┬───────────────────┘                      │
│                  │ 安全组: sg-app                            │
│                  │ 入站: 80,443 (SLB)                       │
│                  │ 出站: 3306,6379 (内网)                    │
│  ┌───────────────▼───────────────────┐                      │
│  │    内网子网 172.16.1.0/24         │                      │
│  │  ┌───────────┐  ┌─────────────┐  │                      │
│  │  │ RDS MySQL │  │ Redis       │  │                      │
│  │  │ :3306     │  │ :6379       │  │                      │
│  │  └───────────┘  └─────────────┘  │                      │
│  │  安全组: sg-db                    │                      │
│  │  入站: 仅 sg-app 可访问           │                      │
│  │  出站: 禁止外网                   │                      │
│  └───────────────────────────────────┘                      │
│                                                             │
│  ┌───────────────────────────────────┐                      │
│  │  OSS (VPC内网端点)                │                      │
│  │  oss-cn-hangzhou-internal         │                      │
│  └───────────────────────────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

---

### 13.2 环境规划

#### 13.2.1 多环境体系

| 维度         | 开发环境 (dev) | 测试环境 (test)     | 预发布环境 (staging)   | 生产环境 (prod)  |
| ------------ | -------------- | ------------------- | ---------------------- | ---------------- |
| **用途**     | 本地开发调试   | 功能验证/集成测试   | 上线前验证             | 正式对外服务     |
| **部署方式** | docker-compose | docker-compose      | Docker单节点           | Docker多节点+SLB |
| **ECS规格**  | 本地机器       | 2核4G × 1           | 2核4G × 1              | 4核8G × 2        |
| **数据库**   | MySQL容器      | RDS 2核4G(单机)     | RDS 2核4G(单机)        | RDS 4核8G(主从)  |
| **Redis**    | Redis容器      | Redis 1G            | Redis 1G               | Redis 2G         |
| **域名**     | localhost      | test.crm.company.cn | staging.crm.company.cn | crm.company.cn   |
| **HTTPS**    | 否             | 自签名证书          | 阿里云证书             | 阿里云证书       |
| **CDN**      | 否             | 否                  | 否                     | 是               |
| **日志级别** | debug          | debug               | info                   | warn             |
| **触发方式** | 手动           | push到develop分支   | push到release分支      | 手动审批         |
| **数据**     | Mock/种子数据  | 脱敏测试数据        | 生产数据子集(脱敏)     | 真实数据         |

#### 13.2.2 环境配置管理

每个环境使用独立的 `.env` 文件，敏感信息通过 GitHub Secrets 或阿里云 KMS 管理。

```bash
# .env.production 示例（敏感值由CI/CD注入，此处仅为模板）
# ============================================
# 应用配置
# ============================================
NODE_ENV=production
APP_PORT=3000
APP_NAME=ai-crm

# ============================================
# 数据库配置
# ============================================
DB_HOST=${PROD_DB_HOST}
DB_PORT=3306
DB_NAME=ai_crm_prod
DB_USER=${PROD_DB_USER}
DB_PASSWORD=${PROD_DB_PASSWORD}
DB_POOL_MIN=5
DB_POOL_MAX=30
DB_SSL=true

# ============================================
# Redis配置
# ============================================
REDIS_HOST=${PROD_REDIS_HOST}
REDIS_PORT=6379
REDIS_PASSWORD=${PROD_REDIS_PASSWORD}
REDIS_DB=0

# ============================================
# OSS配置
# ============================================
OSS_REGION=oss-cn-hangzhou
OSS_BUCKET=ai-crm-prod
OSS_ACCESS_KEY_ID=${OSS_AK_ID}
OSS_ACCESS_KEY_SECRET=${OSS_AK_SECRET}
OSS_INTERNAL=true

# ============================================
# JWT配置
# ============================================
JWT_SECRET=${PROD_JWT_SECRET}
JWT_EXPIRES_IN=7d

# ============================================
# AI服务配置
# ============================================
AI_API_KEY=${PROD_AI_API_KEY}
AI_API_BASE_URL=https://dashscope.aliyuncs.com/api/v1
AI_MODEL=qwen-max
AI_REQUEST_TIMEOUT=30000

# ============================================
# 日志配置
# ============================================
LOG_LEVEL=warn
LOG_DIR=/var/log/ai-crm
```

#### 13.2.3 环境隔离策略

```
┌─────────────────────────────────────────────────────────┐
│                    隔离策略矩阵                          │
├──────────┬──────────────────────────────────────────────┤
│ 网络隔离  │ 各环境位于独立VPC或独立子网                    │
│          │ 安全组严格限制跨环境访问                        │
│          │ 生产环境禁止从开发/测试环境直接访问              │
├──────────┼──────────────────────────────────────────────┤
│ 数据隔离  │ 各环境使用独立数据库实例                       │
│          │ 禁止生产数据直接导入开发/测试环境                │
│          │ 测试数据必须经过脱敏处理                        │
├──────────┼──────────────────────────────────────────────┤
│ 账号隔离  │ 各环境使用独立的RAM子账号                      │
│          │ 最小权限原则：开发人员无生产环境写权限           │
│          │ 生产操作需通过堡垒机并留存审计日志               │
├──────────┼──────────────────────────────────────────────┤
│ 配置隔离  │ 敏感配置通过GitHub Secrets分环境管理            │
│          │ 禁止配置文件提交到代码仓库                      │
│          │ 各环境密钥/证书独立签发、定期轮转               │
└──────────┴──────────────────────────────────────────────┘
```

---

### 13.3 Docker容器化

#### 13.3.1 前端 Dockerfile（多阶段构建）

```dockerfile
# =============================================
# 前端 Dockerfile - 多阶段构建
# 文件位置: frontend/Dockerfile
# =============================================

# ------ 阶段1: 依赖安装 ------
FROM node:20-alpine AS deps
WORKDIR /app

# 仅复制依赖声明文件，最大化利用Docker缓存层
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile

# ------ 阶段2: 构建 ------
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 构建参数（由CI/CD注入）
ARG VITE_API_BASE_URL
ARG VITE_APP_TITLE="AI智能CRM系统"

# 执行生产构建
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm build

# ------ 阶段3: 生产运行 ------
FROM nginx:1.25-alpine AS production

# 安装时区数据
RUN apk add --no-cache tzdata \
    && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && echo "Asia/Shanghai" > /etc/timezone \
    && apk del tzdata

# 移除默认配置
RUN rm -rf /etc/nginx/conf.d/default.conf

# 复制自定义Nginx配置
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 安全加固：以非root用户运行
RUN chown -R nginx:nginx /usr/share/nginx/html \
    && chown -R nginx:nginx /var/cache/nginx \
    && chown -R nginx:nginx /var/log/nginx \
    && touch /var/run/nginx.pid \
    && chown nginx:nginx /var/run/nginx.pid

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost/health || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### 13.3.2 后端 Dockerfile（多阶段构建）

```dockerfile
# =============================================
# 后端 Dockerfile - 多阶段构建
# 文件位置: backend/Dockerfile
# =============================================

# ------ 阶段1: 依赖安装 ------
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@latest --activate

# 仅安装生产依赖（用于最终镜像）
RUN pnpm install --frozen-lockfile --prod --ignore-scripts \
    && cp -R node_modules prod_node_modules

# 安装全部依赖（用于构建阶段）
RUN pnpm install --frozen-lockfile

# ------ 阶段2: 构建 ------
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN corepack enable && corepack prepare pnpm@latest --activate

# TypeScript编译
RUN pnpm build

# Prisma客户端生成
RUN npx prisma generate

# ------ 阶段3: 生产运行 ------
FROM node:20-alpine AS production
WORKDIR /app

# 安装必要的运行时依赖
RUN apk add --no-cache \
    tini \
    tzdata \
    curl \
    && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && echo "Asia/Shanghai" > /etc/timezone

# 创建非root用户
RUN addgroup -g 1001 -S appgroup \
    && adduser -u 1001 -S appuser -G appgroup

# 复制生产依赖和构建产物
COPY --from=deps /app/prod_node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
COPY package.json ./

# 创建日志目录
RUN mkdir -p /var/log/ai-crm && chown -R appuser:appgroup /var/log/ai-crm
RUN mkdir -p /app/uploads && chown -R appuser:appgroup /app/uploads

# 切换用户
USER appuser

# 使用tini作为PID 1进程，正确处理信号
ENTRYPOINT ["/sbin/tini", "--"]

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

EXPOSE 3000

# 数据库迁移后启动应用
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
```

#### 13.3.3 docker-compose.yml（开发环境完整配置）

```yaml
# =============================================
# docker-compose.yml - 开发环境
# 一键启动完整开发环境
# 使用方式: docker-compose up -d
# =============================================

version: "3.9"

services:
  # ==========================================
  # 前端服务（开发模式热更新）
  # ==========================================
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    container_name: crm-frontend
    ports:
      - "5173:5173"
    volumes:
      - ./frontend/src:/app/src
      - ./frontend/public:/app/public
      - ./frontend/index.html:/app/index.html
      - ./frontend/vite.config.ts:/app/vite.config.ts
    environment:
      - VITE_API_BASE_URL=http://localhost:3000
    depends_on:
      backend:
        condition: service_healthy
    networks:
      - crm-network

  # ==========================================
  # 后端服务
  # ==========================================
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    container_name: crm-backend
    ports:
      - "3000:3000"
      - "9229:9229" # Node.js调试端口
    volumes:
      - ./backend/src:/app/src
      - ./backend/prisma:/app/prisma
      - ./backend/uploads:/app/uploads
    env_file:
      - ./backend/.env.development
    environment:
      - NODE_ENV=development
      - DB_HOST=mysql
      - DB_PORT=3306
      - DB_NAME=ai_crm_dev
      - DB_USER=root
      - DB_PASSWORD=dev_password_123
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    networks:
      - crm-network

  # ==========================================
  # MySQL数据库
  # ==========================================
  mysql:
    image: mysql:8.0
    container_name: crm-mysql
    ports:
      - "3306:3306"
    environment:
      MYSQL_ROOT_PASSWORD: dev_password_123
      MYSQL_DATABASE: ai_crm_dev
      MYSQL_CHARSET: utf8mb4
      MYSQL_COLLATION: utf8mb4_unicode_ci
    volumes:
      - mysql-data:/var/lib/mysql
      - ./docker/mysql/init:/docker-entrypoint-initdb.d # 初始化脚本
      - ./docker/mysql/conf.d:/etc/mysql/conf.d # 自定义配置
    command: >
      --default-authentication-plugin=caching_sha2_password
      --character-set-server=utf8mb4
      --collation-server=utf8mb4_unicode_ci
      --max-connections=200
      --innodb-buffer-pool-size=256M
      --slow-query-log=ON
      --slow-query-log-file=/var/lib/mysql/slow.log
      --long-query-time=1
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    networks:
      - crm-network

  # ==========================================
  # Redis缓存
  # ==========================================
  redis:
    image: redis:7-alpine
    container_name: crm-redis
    ports:
      - "6379:6379"
    command: >
      redis-server
      --maxmemory 256mb
      --maxmemory-policy allkeys-lru
      --appendonly yes
      --appendfsync everysec
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    networks:
      - crm-network

  # ==========================================
  # phpMyAdmin（可选，数据库管理）
  # ==========================================
  phpmyadmin:
    image: phpmyadmin:5
    container_name: crm-phpmyadmin
    ports:
      - "8080:80"
    environment:
      PMA_HOST: mysql
      PMA_PORT: 3306
    depends_on:
      mysql:
        condition: service_healthy
    profiles:
      - tools
    networks:
      - crm-network

  # ==========================================
  # Redis Commander（可选，Redis管理）
  # ==========================================
  redis-commander:
    image: rediscommander/redis-commander:latest
    container_name: crm-redis-commander
    ports:
      - "8081:8081"
    environment:
      REDIS_HOSTS: local:redis:6379
    depends_on:
      redis:
        condition: service_healthy
    profiles:
      - tools
    networks:
      - crm-network

# ==========================================
# 数据卷
# ==========================================
volumes:
  mysql-data:
    driver: local
  redis-data:
    driver: local

# ==========================================
# 网络
# ==========================================
networks:
  crm-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/24
```

#### 13.3.4 镜像管理策略

```
┌─────────────────────────────────────────────────────────────┐
│                    镜像标签规范                               │
├──────────────────┬──────────────────────────────────────────┤
│ 格式              │ registry.cn-hangzhou.aliyuncs.com/       │
│                  │   ai-crm/{服务名}:{标签}                  │
├──────────────────┼──────────────────────────────────────────┤
│ 开发镜像          │ ai-crm/backend:dev-{short-sha}          │
│                  │ ai-crm/frontend:dev-{short-sha}         │
├──────────────────┼──────────────────────────────────────────┤
│ 测试镜像          │ ai-crm/backend:test-{short-sha}         │
├──────────────────┼──────────────────────────────────────────┤
│ 预发布镜像        │ ai-crm/backend:rc-{version}             │
├──────────────────┼──────────────────────────────────────────┤
│ 生产镜像          │ ai-crm/backend:v{major}.{minor}.{patch} │
│                  │ ai-crm/backend:latest (最新稳定版)        │
├──────────────────┼──────────────────────────────────────────┤
│ 示例              │ ai-crm/backend:v1.2.3                   │
│                  │ ai-crm/backend:dev-a1b2c3d              │
└──────────────────┴──────────────────────────────────────────┘
```

**镜像清理策略脚本：**

```bash
#!/bin/bash
# =============================================
# scripts/cleanup-images.sh
# 镜像清理策略
# =============================================

REGISTRY="registry.cn-hangzhou.aliyuncs.com"
NAMESPACE="ai-crm"
KEEP_LATEST=10          # 保留最近10个生产版本
KEEP_DEV_DAYS=7         # 开发镜像保留7天
KEEP_RC_COUNT=3         # 保留最近3个RC版本

echo "=========================================="
echo "  开始清理过期镜像"
echo "  时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

# 清理本地无标签镜像
echo "[1/3] 清理无标签悬空镜像..."
docker image prune -f

# 清理超过7天的开发镜像
echo "[2/3] 清理过期开发镜像..."
docker images "${REGISTRY}/${NAMESPACE}/*" --format '{{.Repository}}:{{.Tag}} {{.CreatedAt}}' \
  | grep ':dev-' \
  | while read -r image date rest; do
      created=$(date -d "$date" +%s 2>/dev/null)
      cutoff=$(date -d "${KEEP_DEV_DAYS} days ago" +%s 2>/dev/null)
      if [ -n "$created" ] && [ "$created" -lt "$cutoff" ]; then
          echo "  删除: $image"
          docker rmi "$image" 2>/dev/null
      fi
  done

# 清理早期的生产版本（保留最近N个）
echo "[3/3] 清理早期生产镜像（保留最近${KEEP_LATEST}个）..."
for service in backend frontend; do
    docker images "${REGISTRY}/${NAMESPACE}/${service}" \
      --format '{{.Tag}}' \
      | grep '^v' \
      | sort -V \
      | head -n -${KEEP_LATEST} \
      | while read -r tag; do
          echo "  删除: ${REGISTRY}/${NAMESPACE}/${service}:${tag}"
          docker rmi "${REGISTRY}/${NAMESPACE}/${service}:${tag}" 2>/dev/null
      done
done

echo "=========================================="
echo "  清理完成"
echo "=========================================="
```

---

### 13.4 CI/CD 流水线

#### 13.4.1 流水线总体设计

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  代码提交  │───►│ 质量检查  │───►│ 构建打包  │───►│ 镜像推送  │───►│ 自动部署  │
│  (Push)   │    │ Lint+Test│    │ Build    │    │ Registry │    │ Deploy   │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
                     │               │               │               │
                     ▼               ▼               ▼               ▼
                ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────────┐
                │ ESLint  │    │ Docker  │    │ 阿里云   │    │ dev: 自动   │
                │ TypeCheck│    │ 多阶段  │    │ 容器镜像 │    │ test: 自动  │
                │ Vitest  │    │ 构建    │    │ 服务ACR  │    │ staging:手动│
                │ Coverage│    │         │    │         │    │ prod: 审批  │
                └─────────┘    └─────────┘    └─────────┘    └─────────────┘
```

**分支与环境映射：**

```
main ──────────────► 生产环境 (需审批)
  │
release/* ─────────► 预发布环境 (手动触发)
  │
develop ───────────► 测试环境 (自动)
  │
feature/* ─────────► 仅CI检查 (不部署)
hotfix/* ──────────► 生产环境 (加速审批)
```

#### 13.4.2 完整的 GitHub Actions 工作流

```yaml
# =============================================
# .github/workflows/ci.yml
# 持续集成：代码质量检查
# =============================================
name: CI - Code Quality

on:
  pull_request:
    branches: [develop, main]
  push:
    branches: [develop, feature/*, hotfix/*]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # ==========================================
  # 代码质量检查
  # ==========================================
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    strategy:
      matrix:
        project: [frontend, backend]
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
          cache-dependency-path: ${{ matrix.project }}/pnpm-lock.yaml

      - name: Install Dependencies
        working-directory: ${{ matrix.project }}
        run: pnpm install --frozen-lockfile

      - name: ESLint Check
        working-directory: ${{ matrix.project }}
        run: pnpm lint

      - name: TypeScript Type Check
        working-directory: ${{ matrix.project }}
        run: pnpm type-check

  # ==========================================
  # 单元测试
  # ==========================================
  test:
    name: Unit Tests
    runs-on: ubuntu-latest
    needs: lint
    strategy:
      matrix:
        project: [frontend, backend]
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: test_password
          MYSQL_DATABASE: ai_crm_test
        ports:
          - 3306:3306
        options: >-
          --health-cmd="mysqladmin ping -h localhost"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=5
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd="redis-cli ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=5
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
          cache-dependency-path: ${{ matrix.project }}/pnpm-lock.yaml

      - name: Install Dependencies
        working-directory: ${{ matrix.project }}
        run: pnpm install --frozen-lockfile

      - name: Run Tests with Coverage
        working-directory: ${{ matrix.project }}
        env:
          DB_HOST: localhost
          DB_PORT: 3306
          DB_NAME: ai_crm_test
          DB_USER: root
          DB_PASSWORD: test_password
          REDIS_HOST: localhost
          REDIS_PORT: 6379
        run: pnpm test:coverage

      - name: Upload Coverage to Codecov
        if: matrix.project == 'backend'
        uses: codecov/codecov-action@v4
        with:
          file: ${{ matrix.project }}/coverage/lcov.info
          flags: ${{ matrix.project }}
          token: ${{ secrets.CODECOV_TOKEN }}
```

```yaml
# =============================================
# .github/workflows/deploy.yml
# 持续部署：构建、推送、部署
# =============================================
name: CD - Build & Deploy

on:
  push:
    branches:
      - develop # 自动部署到测试环境
      - release/* # 部署到预发布环境
      - main # 部署到生产环境（需审批）
    tags:
      - "v*" # 版本标签触发生产发布

env:
  REGISTRY: registry.cn-hangzhou.aliyuncs.com
  NAMESPACE: ai-crm
  REGION: cn-hangzhou

jobs:
  # ==========================================
  # 构建与推送镜像
  # ==========================================
  build:
    name: Build & Push Images
    runs-on: ubuntu-latest
    outputs:
      image_tag: ${{ steps.meta.outputs.image_tag }}
      deploy_env: ${{ steps.meta.outputs.deploy_env }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      # 确定镜像标签与部署环境
      - name: Determine Metadata
        id: meta
        run: |
          if [[ "${{ github.ref }}" == refs/tags/v* ]]; then
            echo "image_tag=${{ github.ref_name }}" >> $GITHUB_OUTPUT
            echo "deploy_env=production" >> $GITHUB_OUTPUT
          elif [[ "${{ github.ref }}" == refs/heads/main ]]; then
            echo "image_tag=main-$(echo ${{ github.sha }} | cut -c1-7)" >> $GITHUB_OUTPUT
            echo "deploy_env=production" >> $GITHUB_OUTPUT
          elif [[ "${{ github.ref }}" == refs/heads/release/* ]]; then
            BRANCH_NAME=$(echo "${{ github.ref }}" | sed 's|refs/heads/release/||')
            echo "image_tag=rc-${BRANCH_NAME}-$(echo ${{ github.sha }} | cut -c1-7)" >> $GITHUB_OUTPUT
            echo "deploy_env=staging" >> $GITHUB_OUTPUT
          else
            echo "image_tag=dev-$(echo ${{ github.sha }} | cut -c1-7)" >> $GITHUB_OUTPUT
            echo "deploy_env=test" >> $GITHUB_OUTPUT
          fi

      # 登录阿里云容器镜像服务
      - name: Login to Alibaba Cloud ACR
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ secrets.ACR_USERNAME }}
          password: ${{ secrets.ACR_PASSWORD }}

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      # 构建并推送后端镜像
      - name: Build & Push Backend Image
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          file: ./backend/Dockerfile
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.NAMESPACE }}/backend:${{ steps.meta.outputs.image_tag }}
            ${{ env.REGISTRY }}/${{ env.NAMESPACE }}/backend:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
          build-args: |
            NODE_ENV=production

      # 构建并推送前端镜像
      - name: Build & Push Frontend Image
        uses: docker/build-push-action@v5
        with:
          context: ./frontend
          file: ./frontend/Dockerfile
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.NAMESPACE }}/frontend:${{ steps.meta.outputs.image_tag }}
            ${{ env.REGISTRY }}/${{ env.NAMESPACE }}/frontend:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
          build-args: |
            VITE_API_BASE_URL=${{ secrets[format('{0}_API_URL', steps.meta.outputs.deploy_env)] }}
            VITE_APP_TITLE=AI智能CRM系统

  # ==========================================
  # 部署到测试环境（自动）
  # ==========================================
  deploy-test:
    name: Deploy to Test
    needs: build
    if: needs.build.outputs.deploy_env == 'test'
    runs-on: ubuntu-latest
    environment: test
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Deploy to Test Server
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.TEST_SERVER_HOST }}
          username: ${{ secrets.TEST_SERVER_USER }}
          key: ${{ secrets.TEST_SERVER_SSH_KEY }}
          script: |
            set -e

            export IMAGE_TAG=${{ needs.build.outputs.image_tag }}
            export REGISTRY=${{ env.REGISTRY }}
            export NAMESPACE=${{ env.NAMESPACE }}

            echo "=========================================="
            echo "  部署到测试环境"
            echo "  镜像标签: ${IMAGE_TAG}"
            echo "  时间: $(date '+%Y-%m-%d %H:%M:%S')"
            echo "=========================================="

            cd /opt/ai-crm

            # 登录镜像仓库
            docker login ${REGISTRY} \
              -u ${{ secrets.ACR_USERNAME }} \
              -p ${{ secrets.ACR_PASSWORD }}

            # 拉取最新镜像
            docker pull ${REGISTRY}/${NAMESPACE}/backend:${IMAGE_TAG}
            docker pull ${REGISTRY}/${NAMESPACE}/frontend:${IMAGE_TAG}

            # 更新环境变量文件中的镜像标签
            sed -i "s|IMAGE_TAG=.*|IMAGE_TAG=${IMAGE_TAG}|" .env

            # 滚动更新
            docker-compose up -d --no-deps --remove-orphans backend frontend

            # 等待健康检查通过
            echo "等待服务启动..."
            sleep 10

            # 验证健康检查
            for i in {1..12}; do
              if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
                echo "后端服务健康检查通过"
                break
              fi
              if [ $i -eq 12 ]; then
                echo "错误: 健康检查超时，执行回滚"
                docker-compose rollback 2>/dev/null || true
                exit 1
              fi
              echo "等待健康检查... ($i/12)"
              sleep 5
            done

            echo "=========================================="
            echo "  测试环境部署完成"
            echo "=========================================="

  # ==========================================
  # 部署到预发布环境（手动确认）
  # ==========================================
  deploy-staging:
    name: Deploy to Staging
    needs: build
    if: needs.build.outputs.deploy_env == 'staging'
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.crm.company.cn
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Deploy to Staging Server
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.STAGING_SERVER_HOST }}
          username: ${{ secrets.STAGING_SERVER_USER }}
          key: ${{ secrets.STAGING_SERVER_SSH_KEY }}
          script: |
            set -e
            export IMAGE_TAG=${{ needs.build.outputs.image_tag }}
            cd /opt/ai-crm
            docker login ${{ env.REGISTRY }} \
              -u ${{ secrets.ACR_USERNAME }} \
              -p ${{ secrets.ACR_PASSWORD }}
            docker pull ${{ env.REGISTRY }}/${{ env.NAMESPACE }}/backend:${IMAGE_TAG}
            docker pull ${{ env.REGISTRY }}/${{ env.NAMESPACE }}/frontend:${IMAGE_TAG}
            sed -i "s|IMAGE_TAG=.*|IMAGE_TAG=${IMAGE_TAG}|" .env
            docker-compose up -d --no-deps backend frontend
            sleep 15
            curl -sf http://localhost:3000/api/health || exit 1
            echo "预发布环境部署完成"

  # ==========================================
  # 部署到生产环境（需审批）
  # ==========================================
  deploy-production:
    name: Deploy to Production
    needs: build
    if: needs.build.outputs.deploy_env == 'production'
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://crm.company.cn
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      # 生产部署 - ECS-01
      - name: Deploy to ECS-01
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.PROD_ECS01_HOST }}
          username: ${{ secrets.PROD_SERVER_USER }}
          key: ${{ secrets.PROD_SERVER_SSH_KEY }}
          script: |
            set -e
            export IMAGE_TAG=${{ needs.build.outputs.image_tag }}
            cd /opt/ai-crm
            bash scripts/deploy.sh ${IMAGE_TAG}

      # 验证ECS-01健康后再部署ECS-02（滚动更新）
      - name: Verify ECS-01 Health
        run: |
          for i in {1..15}; do
            STATUS=$(curl -sf -o /dev/null -w '%{http_code}' \
              "https://crm.company.cn/api/health" 2>/dev/null || echo "000")
            if [ "$STATUS" = "200" ]; then
              echo "ECS-01 健康检查通过"
              exit 0
            fi
            echo "等待 ECS-01... ($i/15)"
            sleep 10
          done
          echo "ECS-01 健康检查失败"
          exit 1

      # 生产部署 - ECS-02
      - name: Deploy to ECS-02
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.PROD_ECS02_HOST }}
          username: ${{ secrets.PROD_SERVER_USER }}
          key: ${{ secrets.PROD_SERVER_SSH_KEY }}
          script: |
            set -e
            export IMAGE_TAG=${{ needs.build.outputs.image_tag }}
            cd /opt/ai-crm
            bash scripts/deploy.sh ${IMAGE_TAG}

      # 部署后通知
      - name: Notify Deployment
        if: always()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "${{ job.status == 'success' && '✅' || '❌' }} 生产环境部署${{ job.status == 'success' && '成功' || '失败' }}\n版本: ${{ needs.build.outputs.image_tag }}\n操作人: ${{ github.actor }}\n提交: ${{ github.event.head_commit.message }}"
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}

      # 创建GitHub Release
      - name: Create Release
        if: startsWith(github.ref, 'refs/tags/v')
        uses: softprops/action-gh-release@v2
        with:
          generate_release_notes: true
```

**生产部署脚本（每台ECS上执行）：**

```bash
#!/bin/bash
# =============================================
# scripts/deploy.sh
# 生产环境单节点部署脚本
# 用法: bash deploy.sh <image_tag>
# =============================================
set -euo pipefail

IMAGE_TAG=${1:?"请提供镜像标签"}
REGISTRY="registry.cn-hangzhou.aliyuncs.com"
NAMESPACE="ai-crm"
DEPLOY_DIR="/opt/ai-crm"
BACKUP_DIR="/opt/ai-crm/backups"
LOG_FILE="/var/log/ai-crm/deploy.log"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

rollback() {
    log "错误: 部署失败，开始回滚..."
    if [ -f "${BACKUP_DIR}/docker-compose.env.bak" ]; then
        cp "${BACKUP_DIR}/docker-compose.env.bak" "${DEPLOY_DIR}/.env"
        cd "${DEPLOY_DIR}"
        docker-compose up -d --no-deps backend frontend
        log "回滚完成"
    else
        log "警告: 未找到备份文件，无法回滚"
    fi
    exit 1
}

trap rollback ERR

log "=========================================="
log "开始部署 - 镜像标签: ${IMAGE_TAG}"
log "=========================================="

cd "${DEPLOY_DIR}"

# 1. 备份当前配置
mkdir -p "${BACKUP_DIR}"
cp .env "${BACKUP_DIR}/docker-compose.env.bak"
docker-compose ps > "${BACKUP_DIR}/services_${TIMESTAMP}.txt"
log "[1/6] 当前配置已备份"

# 2. 拉取新镜像
log "[2/6] 拉取新镜像..."
docker pull "${REGISTRY}/${NAMESPACE}/backend:${IMAGE_TAG}"
docker pull "${REGISTRY}/${NAMESPACE}/frontend:${IMAGE_TAG}"

# 3. 更新配置
sed -i "s|IMAGE_TAG=.*|IMAGE_TAG=${IMAGE_TAG}|" .env
log "[3/6] 配置已更新"

# 4. 从SLB摘除当前节点（优雅下线）
log "[4/6] 从SLB摘除节点..."
# 通过阿里云CLI从SLB移除后端服务器
# aliyun slb RemoveBackendServers \
#   --LoadBalancerId ${SLB_ID} \
#   --BackendServers "[{\"ServerId\":\"${ECS_ID}\",\"Weight\":0}]"
sleep 5  # 等待已有请求处理完毕

# 5. 滚动更新容器
log "[5/6] 更新容器..."
docker-compose up -d --no-deps --remove-orphans backend frontend

# 等待健康检查
log "等待健康检查..."
for i in $(seq 1 20); do
    if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
        log "健康检查通过"
        break
    fi
    if [ "$i" -eq 20 ]; then
        log "健康检查超时"
        rollback
    fi
    sleep 3
done

# 6. 重新加入SLB
log "[6/6] 重新加入SLB..."
# aliyun slb AddBackendServers \
#   --LoadBalancerId ${SLB_ID} \
#   --BackendServers "[{\"ServerId\":\"${ECS_ID}\",\"Weight\":100}]"

# 清理旧镜像
docker image prune -f

log "=========================================="
log "部署完成 - ${IMAGE_TAG}"
log "=========================================="
```

---

### 13.5 Nginx 配置

#### 13.5.1 完整的 nginx.conf 示例

```nginx
# =============================================
# /etc/nginx/nginx.conf
# AI智能CRM系统 - Nginx主配置
# =============================================

user  nginx;
worker_processes  auto;                    # 自动匹配CPU核心数
worker_rlimit_nofile 65535;

error_log  /var/log/nginx/error.log warn;
pid        /var/run/nginx.pid;

events {
    worker_connections  4096;
    multi_accept on;
    use epoll;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # ==========================================
    # 日志格式
    # ==========================================
    log_format main  '$remote_addr - $remote_user [$time_local] '
                     '"$request" $status $body_bytes_sent '
                     '"$http_referer" "$http_user_agent" '
                     '$request_time $upstream_response_time';

    log_format json escape=json '{'
        '"time":"$time_iso8601",'
        '"remote_addr":"$remote_addr",'
        '"request_method":"$request_method",'
        '"request_uri":"$request_uri",'
        '"status":$status,'
        '"body_bytes_sent":$body_bytes_sent,'
        '"request_time":$request_time,'
        '"upstream_response_time":"$upstream_response_time",'
        '"http_user_agent":"$http_user_agent",'
        '"http_referer":"$http_referer"'
    '}';

    access_log  /var/log/nginx/access.log json;

    # ==========================================
    # 基础优化
    # ==========================================
    sendfile           on;
    tcp_nopush         on;
    tcp_nodelay        on;
    keepalive_timeout  65;
    keepalive_requests 1000;
    types_hash_max_size 2048;
    server_tokens      off;                # 隐藏Nginx版本号

    # ==========================================
    # 客户端请求限制
    # ==========================================
    client_max_body_size       50m;        # 文件上传最大50MB
    client_body_buffer_size    128k;
    client_header_buffer_size  4k;
    large_client_header_buffers 4 16k;

    # ==========================================
    # Gzip压缩配置
    # ==========================================
    gzip               on;
    gzip_vary          on;
    gzip_proxied       any;
    gzip_comp_level    6;
    gzip_min_length    1024;
    gzip_buffers       16 8k;
    gzip_http_version  1.1;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml
        application/rss+xml
        application/atom+xml
        image/svg+xml
        font/woff2;

    # ==========================================
    # Brotli压缩（如已安装模块）
    # ==========================================
    # brotli             on;
    # brotli_comp_level  6;
    # brotli_types       text/plain text/css application/json
    #                    application/javascript text/xml
    #                    application/xml image/svg+xml;

    # ==========================================
    # 速率限制（防DDoS/暴力破解）
    # ==========================================
    # API全局限流: 每个IP每秒20个请求
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=20r/s;

    # 登录接口限流: 每个IP每分钟10次
    limit_req_zone $binary_remote_addr zone=login_limit:10m rate=10r/m;

    # 文件上传限流: 每个IP每分钟30次
    limit_req_zone $binary_remote_addr zone=upload_limit:10m rate=30r/m;

    # ==========================================
    # 上游后端服务
    # ==========================================
    upstream backend_servers {
        least_conn;                        # 最少连接调度算法
        server 127.0.0.1:3000 max_fails=3 fail_timeout=30s;
        keepalive 32;                      # 上游保持连接数
    }

    # ==========================================
    # HTTP -> HTTPS 重定向
    # ==========================================
    server {
        listen       80;
        server_name  crm.company.cn;

        # Let's Encrypt / 阿里云证书验证
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$server_name$request_uri;
        }
    }

    # ==========================================
    # HTTPS主站配置
    # ==========================================
    server {
        listen       443 ssl http2;
        server_name  crm.company.cn;

        # ======================================
        # SSL/TLS 配置
        # ======================================
        ssl_certificate      /etc/nginx/ssl/crm.company.cn.pem;
        ssl_certificate_key  /etc/nginx/ssl/crm.company.cn.key;

        # TLS协议版本（仅允许TLS 1.2和1.3）
        ssl_protocols TLSv1.2 TLSv1.3;

        # 加密套件（优先服务器端配置）
        ssl_prefer_server_ciphers on;
        ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';

        # SSL会话缓存
        ssl_session_cache    shared:SSL:10m;
        ssl_session_timeout  1d;
        ssl_session_tickets  off;

        # OCSP Stapling
        ssl_stapling         on;
        ssl_stapling_verify  on;
        resolver             223.5.5.5 223.6.6.6 valid=300s;
        resolver_timeout     5s;

        # ======================================
        # 安全头
        # ======================================
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
        add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.aliyuncs.com; connect-src 'self' wss://$server_name https://*.aliyuncs.com;" always;

        # ======================================
        # 健康检查端点（SLB使用）
        # ======================================
        location /health {
            access_log off;
            return 200 '{"status":"ok","server":"nginx"}';
            add_header Content-Type application/json;
        }

        # ======================================
        # 前端静态资源
        # ======================================
        root /usr/share/nginx/html;
        index index.html;

        # 带hash的静态资源 - 强缓存1年
        location ~* \.([0-9a-f]{8,})\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|ico|webp)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            access_log off;
        }

        # 其他静态资源 - 协商缓存
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|ttf|eot|webp)$ {
            expires 7d;
            add_header Cache-Control "public, must-revalidate";
            access_log off;
        }

        # SPA路由 - index.html 不缓存
        location / {
            try_files $uri $uri/ /index.html;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
            add_header Pragma "no-cache";
            add_header Expires "0";
        }

        # ======================================
        # API反向代理
        # ======================================
        location /api/ {
            # 速率限制
            limit_req zone=api_limit burst=40 nodelay;
            limit_req_status 429;

            proxy_pass http://backend_servers;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header Connection "";

            # 超时设置
            proxy_connect_timeout 10s;
            proxy_send_timeout    30s;
            proxy_read_timeout    30s;

            # 缓冲区
            proxy_buffering on;
            proxy_buffer_size 4k;
            proxy_buffers 8 16k;
        }

        # 登录接口 - 严格限流
        location /api/auth/login {
            limit_req zone=login_limit burst=5 nodelay;
            limit_req_status 429;

            proxy_pass http://backend_servers;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # 文件上传接口
        location /api/upload {
            limit_req zone=upload_limit burst=10 nodelay;

            client_max_body_size 50m;
            proxy_pass http://backend_servers;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            proxy_connect_timeout 60s;
            proxy_send_timeout    120s;
            proxy_read_timeout    120s;
        }

        # ======================================
        # WebSocket代理（实时通知/消息推送）
        # ======================================
        location /ws/ {
            proxy_pass http://backend_servers;
            proxy_http_version 1.1;

            # WebSocket必须的头部
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # WebSocket长连接超时（1小时）
            proxy_read_timeout    3600s;
            proxy_send_timeout    3600s;
        }

        # ======================================
        # AI流式响应（SSE）
        # ======================================
        location /api/ai/ {
            limit_req zone=api_limit burst=10 nodelay;

            proxy_pass http://backend_servers;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header Connection "";

            # SSE关键配置：禁用缓冲
            proxy_buffering off;
            proxy_cache off;
            chunked_transfer_encoding on;

            # SSE超时（AI生成可能较慢）
            proxy_read_timeout 120s;
            proxy_send_timeout 120s;
        }

        # ======================================
        # 禁止访问敏感文件
        # ======================================
        location ~ /\.(git|env|htaccess|htpasswd) {
            deny all;
            return 404;
        }

        location ~ \.(sql|bak|log|conf)$ {
            deny all;
            return 404;
        }
    }
}
```

---

### 13.6 数据库运维

#### 13.6.1 RDS MySQL 配置优化

```sql
-- =============================================
-- RDS MySQL 参数组优化配置
-- 规格: 4核8G 主从架构
-- 通过阿里云RDS控制台 -> 参数设置 修改
-- =============================================

-- ==========================================
-- InnoDB引擎优化
-- ==========================================
-- 缓冲池：物理内存的60-70%（8G实例建议5G）
innodb_buffer_pool_size = 5368709120         -- 5GB
innodb_buffer_pool_instances = 4             -- 多实例并发访问
innodb_log_file_size = 1073741824            -- 1GB, redo log大小
innodb_log_buffer_size = 67108864            -- 64MB
innodb_flush_log_at_trx_commit = 1           -- 事务提交时刷盘（主库保证数据安全）
innodb_flush_method = O_DIRECT               -- 绕过OS缓存
innodb_io_capacity = 2000                    -- SSD磁盘IO能力
innodb_io_capacity_max = 4000
innodb_read_io_threads = 4
innodb_write_io_threads = 4
innodb_file_per_table = ON                   -- 独立表空间

-- ==========================================
-- 连接管理
-- ==========================================
max_connections = 500                        -- 最大连接数
max_user_connections = 450                   -- 单用户最大连接数
wait_timeout = 600                           -- 空闲连接超时（10分钟）
interactive_timeout = 1800
thread_cache_size = 64                       -- 线程缓存

-- ==========================================
-- 查询优化
-- ==========================================
sort_buffer_size = 4194304                   -- 4MB
join_buffer_size = 4194304                   -- 4MB
read_buffer_size = 2097152                   -- 2MB
read_rnd_buffer_size = 4194304               -- 4MB
tmp_table_size = 67108864                    -- 64MB
max_heap_table_size = 67108864               -- 64MB

-- ==========================================
-- 慢查询日志
-- ==========================================
slow_query_log = ON
long_query_time = 1                          -- 超过1秒记录
log_queries_not_using_indexes = ON           -- 记录未使用索引的查询
min_examined_row_limit = 100                 -- 扫描行数超过100才记录

-- ==========================================
-- 二进制日志（主从复制）
-- ==========================================
binlog_format = ROW                          -- 行级复制
binlog_row_image = FULL
expire_logs_days = 7                         -- binlog保留7天
sync_binlog = 1                              -- 每次提交同步binlog

-- ==========================================
-- 字符集
-- ==========================================
character_set_server = utf8mb4
collation_server = utf8mb4_unicode_ci
```

**应用层连接池配置（Prisma/TypeORM）：**

```typescript
// backend/src/config/database.config.ts
// Prisma连接池配置
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: buildDatabaseUrl(),
    },
  },
  log:
    process.env.NODE_ENV === "production"
      ? ["error", "warn"]
      : ["query", "info", "warn", "error"],
});

function buildDatabaseUrl(): string {
  const {
    DB_HOST,
    DB_PORT,
    DB_NAME,
    DB_USER,
    DB_PASSWORD,
    DB_POOL_MIN = "5",
    DB_POOL_MAX = "30",
  } = process.env;

  // Prisma连接池参数
  const params = new URLSearchParams({
    connection_limit: DB_POOL_MAX,
    pool_timeout: "10", // 连接获取超时10秒
    connect_timeout: "5", // 建立连接超时5秒
    socket_timeout: "30", // 读写超时30秒
  });

  return `mysql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?${params.toString()}`;
}

export default prisma;
```

#### 13.6.2 数据库备份策略

```
┌─────────────────────────────────────────────────────────────┐
│                    备份策略矩阵                               │
├──────────┬──────────────────────────────────────────────────┤
│ 全量备份  │ 频率: 每天凌晨02:00                               │
│          │ 方式: RDS自动快照备份                               │
│          │ 保留: 30天                                         │
│          │ 存储: 阿里云RDS备份存储                             │
├──────────┼──────────────────────────────────────────────────┤
│ 增量备份  │ 频率: 实时 (基于binlog)                            │
│          │ 方式: RDS日志备份                                  │
│          │ 保留: 7天                                          │
│          │ 恢复粒度: 任意时间点 (5秒级别)                      │
├──────────┼──────────────────────────────────────────────────┤
│ 逻辑备份  │ 频率: 每周日凌晨03:00                              │
│          │ 方式: mysqldump → OSS                             │
│          │ 保留: 90天                                         │
│          │ 用途: 跨实例恢复/数据迁移                           │
├──────────┼──────────────────────────────────────────────────┤
│ 跨区备份  │ 频率: 每天                                        │
│          │ 方式: RDS跨地域备份                                │
│          │ 目标: 上海地域                                     │
│          │ 用途: 灾备恢复                                    │
└──────────┴──────────────────────────────────────────────────┘
```

**逻辑备份脚本：**

```bash
#!/bin/bash
# =============================================
# scripts/db-backup.sh
# 数据库逻辑备份 → 压缩 → 上传OSS
# Cron: 0 3 * * 0  (每周日03:00)
# =============================================
set -euo pipefail

DB_HOST="${DB_HOST}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_BACKUP_USER}"
DB_PASSWORD="${DB_BACKUP_PASSWORD}"
DB_NAME="ai_crm_prod"
BACKUP_DIR="/tmp/db-backups"
OSS_BUCKET="ai-crm-backups"
OSS_PATH="mysql/weekly"
DATE=$(date '+%Y%m%d_%H%M%S')
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${DATE}.sql.gz"
KEEP_LOCAL_DAYS=3
KEEP_OSS_DAYS=90

mkdir -p "${BACKUP_DIR}"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "开始数据库备份: ${DB_NAME}"

# 执行mysqldump并压缩
mysqldump \
    -h "${DB_HOST}" \
    -P "${DB_PORT}" \
    -u "${DB_USER}" \
    -p"${DB_PASSWORD}" \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    --set-gtid-purged=OFF \
    --quick \
    --lock-tables=false \
    "${DB_NAME}" | gzip > "${BACKUP_FILE}"

FILESIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
log "备份完成: ${BACKUP_FILE} (${FILESIZE})"

# 上传到OSS
log "上传到OSS..."
ossutil64 cp "${BACKUP_FILE}" \
    "oss://${OSS_BUCKET}/${OSS_PATH}/$(basename ${BACKUP_FILE})" \
    --endpoint oss-cn-hangzhou-internal.aliyuncs.com

log "OSS上传完成"

# 清理本地旧备份
find "${BACKUP_DIR}" -name "*.sql.gz" -mtime +${KEEP_LOCAL_DAYS} -delete
log "本地旧备份已清理 (保留${KEEP_LOCAL_DAYS}天)"

# 清理OSS旧备份
ossutil64 ls "oss://${OSS_BUCKET}/${OSS_PATH}/" \
    --endpoint oss-cn-hangzhou-internal.aliyuncs.com \
    | grep "\.sql\.gz" \
    | while read -r line; do
        FILE_DATE=$(echo "$line" | grep -oP '\d{8}(?=_)')
        if [ -n "$FILE_DATE" ]; then
            FILE_EPOCH=$(date -d "$FILE_DATE" +%s 2>/dev/null || echo 0)
            CUTOFF_EPOCH=$(date -d "${KEEP_OSS_DAYS} days ago" +%s)
            if [ "$FILE_EPOCH" -lt "$CUTOFF_EPOCH" ]; then
                OSS_FILE=$(echo "$line" | awk '{print $NF}')
                ossutil64 rm "$OSS_FILE" \
                    --endpoint oss-cn-hangzhou-internal.aliyuncs.com -f
                log "已删除OSS旧备份: $OSS_FILE"
            fi
        fi
    done

log "备份流程完成"
```

#### 13.6.3 主从架构与故障切换

```
┌─────────────────────────────────────────────────────────────┐
│              RDS MySQL 主从架构                               │
│                                                             │
│   ┌─────────────┐    半同步复制     ┌─────────────┐         │
│   │   主实例     │ ───────────────► │   从实例     │         │
│   │ (读写)      │                  │ (只读)      │         │
│   │ 4核8G       │                  │ 4核8G       │         │
│   └──────┬──────┘                  └──────┬──────┘         │
│          │                                │                │
│     ┌────▼────┐                     ┌────▼────┐           │
│     │ 应用写  │                     │ 应用读  │           │
│     │ 操作    │                     │ 操作    │           │
│     └─────────┘                     └─────────┘           │
│                                                             │
│   故障切换（阿里云RDS自动完成）：                               │
│   1. 主实例故障 → 检测时间 < 30秒                             │
│   2. 自动Failover至从实例                                    │
│   3. DNS自动切换（连接串不变）                                 │
│   4. 原主实例恢复后变为新从实例                                │
│   5. RTO < 30秒, RPO ≈ 0（半同步复制）                       │
└─────────────────────────────────────────────────────────────┘
```

**读写分离配置：**

```typescript
// backend/src/config/database-rw.config.ts
// 读写分离配置

export const databaseConfig = {
  // 写库（主库）
  write: {
    host: process.env.DB_WRITE_HOST,
    port: parseInt(process.env.DB_PORT || "3306"),
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    pool: { min: 5, max: 20 },
  },
  // 读库（从库 / RDS只读地址）
  read: {
    host: process.env.DB_READ_HOST || process.env.DB_WRITE_HOST,
    port: parseInt(process.env.DB_PORT || "3306"),
    database: process.env.DB_NAME,
    username: process.env.DB_READ_USER || process.env.DB_USER,
    password: process.env.DB_READ_PASSWORD || process.env.DB_PASSWORD,
    pool: { min: 5, max: 30 },
  },
};
```

#### 13.6.4 慢查询监控与优化

```bash
#!/bin/bash
# =============================================
# scripts/slow-query-report.sh
# 慢查询日志分析 - 每日执行
# Cron: 0 8 * * *  (每天08:00)
# =============================================

# 通过阿里云RDS API获取慢查询日志
# 以下为本地分析示例

SLOW_LOG="/var/log/mysql/slow.log"
REPORT_FILE="/tmp/slow_query_report_$(date '+%Y%m%d').txt"

echo "====================================" > "${REPORT_FILE}"
echo "  慢查询日志分析报告" >> "${REPORT_FILE}"
echo "  日期: $(date '+%Y-%m-%d')" >> "${REPORT_FILE}"
echo "====================================" >> "${REPORT_FILE}"
echo "" >> "${REPORT_FILE}"

# 使用pt-query-digest分析（Percona Toolkit）
if command -v pt-query-digest &> /dev/null; then
    pt-query-digest \
        --limit=20 \
        --order-by=Query_time:sum \
        --since "$(date -d 'yesterday' '+%Y-%m-%d')" \
        "${SLOW_LOG}" >> "${REPORT_FILE}" 2>/dev/null
else
    echo "警告: 未安装pt-query-digest，使用mysqldumpslow替代" >> "${REPORT_FILE}"
    mysqldumpslow -s t -t 20 "${SLOW_LOG}" >> "${REPORT_FILE}" 2>/dev/null
fi

echo "" >> "${REPORT_FILE}"
echo "====================================" >> "${REPORT_FILE}"
echo "  优化建议" >> "${REPORT_FILE}"
echo "====================================" >> "${REPORT_FILE}"
echo "" >> "${REPORT_FILE}"
echo "1. 执行次数最多的TOP 5 SQL - 考虑添加缓存" >> "${REPORT_FILE}"
echo "2. 执行时间最长的TOP 5 SQL - 检查执行计划(EXPLAIN)" >> "${REPORT_FILE}"
echo "3. 扫描行数最多的TOP 5 SQL - 考虑添加索引" >> "${REPORT_FILE}"

# 发送报告（通过钉钉/企业微信机器人）
# curl -X POST "https://oapi.dingtalk.com/robot/send?access_token=xxx" \
#   -H 'Content-Type: application/json' \
#   -d "{\"msgtype\":\"text\",\"text\":{\"content\":\"$(cat ${REPORT_FILE})\"}}"
```

---

### 13.7 Redis 运维

#### 13.7.1 Redis 配置优化

```
# =============================================
# 阿里云Redis 2G实例 - 关键参数配置
# 通过阿里云Redis控制台 -> 参数设置 修改
# =============================================

# ==========================================
# 内存管理
# ==========================================
maxmemory               2gb
maxmemory-policy        allkeys-lru        # 所有key中淘汰最近最少使用的
maxmemory-samples       10                 # LRU采样精度

# ==========================================
# 持久化 - RDB快照
# ==========================================
save 900 1                                 # 900秒内至少1次修改则快照
save 300 10                                # 300秒内至少10次修改则快照
save 60 10000                              # 60秒内至少10000次修改则快照
rdbcompression yes
rdbchecksum yes

# ==========================================
# 持久化 - AOF日志
# ==========================================
appendonly yes
appendfsync everysec                       # 每秒同步（性能与安全的平衡）
no-appendfsync-on-rewrite yes              # AOF重写时不同步（避免IO竞争）
auto-aof-rewrite-percentage 100            # AOF文件增长100%时重写
auto-aof-rewrite-min-size 64mb

# ==========================================
# 连接管理
# ==========================================
timeout 300                                # 空闲连接超时5分钟
tcp-keepalive 60                           # TCP keepalive间隔
maxclients 10000

# ==========================================
# 性能优化
# ==========================================
hz 10                                      # 后台任务执行频率
lazyfree-lazy-eviction yes                 # 异步淘汰（避免阻塞）
lazyfree-lazy-expire yes                   # 异步过期删除
lazyfree-lazy-server-del yes               # 异步DEL
```

#### 13.7.2 缓存策略设计

```typescript
// backend/src/config/redis.config.ts
// Redis缓存策略配置

export const cacheConfig = {
  // ==========================================
  // 缓存Key命名规范: {业务}:{模块}:{标识}
  // ==========================================
  keyPrefix: "crm:",

  // ==========================================
  // 各业务缓存TTL策略
  // ==========================================
  ttl: {
    // 会话管理
    session: 7 * 24 * 3600, // 7天
    refreshToken: 30 * 24 * 3600, // 30天

    // 用户相关
    userInfo: 1800, // 30分钟
    userPermissions: 3600, // 1小时

    // 业务数据
    customerDetail: 600, // 10分钟
    customerList: 300, // 5分钟
    dashboardStats: 120, // 2分钟（频繁变化）
    reportData: 3600, // 1小时

    // 配置数据（变化少）
    systemConfig: 86400, // 24小时
    dictData: 86400, // 24小时
    menuTree: 3600, // 1小时

    // 临时数据
    verifyCode: 300, // 5分钟
    rateLimitCounter: 60, // 1分钟
    lockKey: 30, // 30秒（分布式锁）
  },

  // ==========================================
  // Key模板
  // ==========================================
  keys: {
    session: (userId: string) => `session:${userId}`,
    userInfo: (userId: string) => `user:info:${userId}`,
    userPerms: (userId: string) => `user:perms:${userId}`,
    customerDetail: (id: string) => `customer:detail:${id}`,
    customerList: (query: string) => `customer:list:${query}`,
    dashboard: (userId: string) => `dashboard:${userId}`,
    verifyCode: (key: string) => `verify:${key}`,
    rateLimit: (ip: string, api: string) => `rate:${ip}:${api}`,
    lock: (resource: string) => `lock:${resource}`,
  },
};
```

#### 13.7.3 监控指标

```
┌─────────────────────────────────────────────────────────────┐
│                   Redis监控指标                               │
├──────────────┬──────────────────┬───────────────────────────┤
│ 指标分类      │ 指标名称          │ 告警阈值                   │
├──────────────┼──────────────────┼───────────────────────────┤
│ 内存         │ used_memory       │ > 80% maxmemory (1.6GB) │
│              │ mem_fragmentation │ > 1.5                    │
│              │ evicted_keys      │ > 0（出现淘汰需关注）      │
├──────────────┼──────────────────┼───────────────────────────┤
│ 连接         │ connected_clients │ > 5000                   │
│              │ rejected_conns    │ > 0                      │
│              │ blocked_clients   │ > 10                     │
├──────────────┼──────────────────┼───────────────────────────┤
│ 性能         │ ops_per_sec       │ 监控基线                  │
│              │ hit_rate          │ < 90%（命中率过低）        │
│              │ latency           │ > 5ms                    │
├──────────────┼──────────────────┼───────────────────────────┤
│ 持久化       │ rdb_last_status   │ 非ok                     │
│              │ aof_last_status   │ 非ok                     │
│              │ rdb_changes_since │ 持续增长无快照             │
├──────────────┼──────────────────┼───────────────────────────┤
│ 复制         │ repl_offset_diff  │ 主从偏移量差 > 10MB       │
│              │ master_link_status│ 非up                     │
└──────────────┴──────────────────┴───────────────────────────┘
```

---

### 13.8 监控与告警

#### 13.8.1 监控体系设计

```
┌──────────────────────────────────────────────────────────────┐
│                       监控体系架构                             │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ 应用监控  │  │ 基础设施  │  │ 业务监控  │  │ 链路追踪  │    │
│  │          │  │ 监控     │  │          │  │          │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
│       │             │             │             │           │
│  ┌────▼─────┐  ┌────▼─────┐  ┌────▼─────┐  ┌────▼─────┐   │
│  │ API响应  │  │ CPU/内存 │  │ 订单转化  │  │ 请求链路  │   │
│  │ 错误率   │  │ 磁盘/网络│  │ 客户活跃  │  │ 慢调用    │   │
│  │ QPS     │  │ ECS状态  │  │ 收入统计  │  │ 异常定位  │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │             │             │           │
│       └─────────────┼─────────────┼─────────────┘           │
│                     │             │                          │
│              ┌──────▼─────────────▼──────┐                  │
│              │     阿里云 云监控 (CMS)     │                  │
│              │  + 自建 Prometheus/Grafana │                  │
│              └──────────────┬─────────────┘                  │
│                             │                                │
│                    ┌────────▼────────┐                       │
│                    │    告警通知      │                       │
│                    │ 钉钉/短信/电话  │                       │
│                    └─────────────────┘                       │
└──────────────────────────────────────────────────────────────┘
```

#### 13.8.2 告警规则配置

```yaml
# =============================================
# monitoring/alert-rules.yml
# 告警规则定义
# =============================================

# ==========================================
# 基础设施告警
# ==========================================
infrastructure:
  - name: "ECS_CPU使用率过高"
    metric: cpu_utilization
    condition: "> 85%"
    duration: "5m"
    severity: warning
    action: "钉钉通知"
    description: "ECS CPU使用率持续5分钟超过85%"

  - name: "ECS_CPU使用率危急"
    metric: cpu_utilization
    condition: "> 95%"
    duration: "2m"
    severity: critical
    action: "钉钉+短信+电话"
    description: "ECS CPU使用率持续2分钟超过95%"

  - name: "ECS_内存使用率过高"
    metric: memory_utilization
    condition: "> 85%"
    duration: "5m"
    severity: warning
    action: "钉钉通知"

  - name: "ECS_磁盘使用率过高"
    metric: disk_utilization
    condition: "> 85%"
    duration: "1m"
    severity: warning
    action: "钉钉通知"

  - name: "ECS_磁盘使用率危急"
    metric: disk_utilization
    condition: "> 95%"
    duration: "1m"
    severity: critical
    action: "钉钉+短信"
    description: "磁盘空间不足，需立即清理"

# ==========================================
# 应用层告警
# ==========================================
application:
  - name: "API_响应时间过长"
    metric: api_response_time_p99
    condition: "> 3000ms"
    duration: "5m"
    severity: warning
    action: "钉钉通知"
    description: "P99响应时间超过3秒"

  - name: "API_错误率过高"
    metric: api_error_rate_5xx
    condition: "> 5%"
    duration: "3m"
    severity: critical
    action: "钉钉+短信"
    description: "5xx错误率超过5%"

  - name: "API_错误率异常"
    metric: api_error_rate_5xx
    condition: "> 1%"
    duration: "5m"
    severity: warning
    action: "钉钉通知"

  - name: "健康检查失败"
    metric: health_check
    condition: "== fail"
    duration: "1m"
    severity: critical
    action: "钉钉+短信+电话"
    description: "应用健康检查连续失败"

  - name: "容器重启"
    metric: container_restart_count
    condition: "> 3"
    duration: "10m"
    severity: warning
    action: "钉钉通知"
    description: "容器10分钟内重启超过3次"

# ==========================================
# 数据库告警
# ==========================================
database:
  - name: "RDS_CPU使用率过高"
    metric: rds_cpu_utilization
    condition: "> 80%"
    duration: "5m"
    severity: warning

  - name: "RDS_连接数过高"
    metric: rds_connections
    condition: "> 400"
    duration: "3m"
    severity: warning
    description: "接近最大连接数500"

  - name: "RDS_慢查询激增"
    metric: rds_slow_queries
    condition: "> 50/min"
    duration: "5m"
    severity: warning

  - name: "RDS_主从延迟"
    metric: rds_replication_lag
    condition: "> 5s"
    duration: "2m"
    severity: critical

# ==========================================
# Redis告警
# ==========================================
redis:
  - name: "Redis_内存使用率过高"
    metric: redis_memory_utilization
    condition: "> 80%"
    duration: "5m"
    severity: warning

  - name: "Redis_连接数过高"
    metric: redis_connections
    condition: "> 5000"
    duration: "3m"
    severity: warning

  - name: "Redis_缓存命中率过低"
    metric: redis_hit_rate
    condition: "< 85%"
    duration: "10m"
    severity: warning
    description: "缓存命中率下降，可能存在缓存穿透"

# ==========================================
# 业务告警
# ==========================================
business:
  - name: "订单创建失败率异常"
    metric: order_create_fail_rate
    condition: "> 10%"
    duration: "5m"
    severity: critical

  - name: "AI接口调用失败"
    metric: ai_api_error_count
    condition: "> 10"
    duration: "5m"
    severity: warning

  - name: "登录失败激增"
    metric: login_fail_count
    condition: "> 50/min"
    duration: "3m"
    severity: warning
    description: "可能存在暴力破解攻击"
```

#### 13.8.3 日志收集与分析

```
┌─────────────────────────────────────────────────────────────┐
│                    日志体系架构                                │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │ 应用日志  │  │ Nginx    │  │ 系统日志  │                  │
│  │ (JSON)   │  │ 访问日志  │  │ syslog   │                  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                  │
│       │             │             │                          │
│       └──────┬──────┴──────┬──────┘                         │
│              │             │                                │
│       ┌──────▼──────┐      │                                │
│       │  Filebeat   │      │                                │
│       │  (日志采集)  │      │                                │
│       └──────┬──────┘      │                                │
│              │             │                                │
│       ┌──────▼──────┐      │                                │
│       │ 阿里云SLS   │◄─────┘                                │
│       │ (日志服务)   │                                       │
│       │             │                                       │
│       │ ┌─────────┐ │                                       │
│       │ │ 全文检索 │ │                                       │
│       │ │ 聚合分析 │ │                                       │
│       │ │ 告警配置 │ │                                       │
│       │ │ 可视化   │ │                                       │
│       │ └─────────┘ │                                       │
│       └─────────────┘                                       │
└─────────────────────────────────────────────────────────────┘
```

**应用日志格式标准化：**

```typescript
// backend/src/common/logger.ts
// 统一日志格式（JSON结构化日志）

import { createLogger, format, transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

const logFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  format.errors({ stack: true }),
  format.json(),
);

const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: logFormat,
  defaultMeta: {
    service: "ai-crm-backend",
    hostname: process.env.HOSTNAME,
    version: process.env.APP_VERSION || "unknown",
  },
  transports: [
    // 控制台输出（开发环境可读格式）
    new transports.Console({
      format:
        process.env.NODE_ENV === "development"
          ? format.combine(format.colorize(), format.simple())
          : logFormat,
    }),

    // 应用日志文件（按天轮转）
    new DailyRotateFile({
      filename: "/var/log/ai-crm/app-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "100m",
      maxFiles: "30d",
      zippedArchive: true,
    }),

    // 错误日志单独记录
    new DailyRotateFile({
      level: "error",
      filename: "/var/log/ai-crm/error-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "50m",
      maxFiles: "90d",
      zippedArchive: true,
    }),
  ],
});

export default logger;

/*
 * 日志输出示例:
 * {
 *   "timestamp": "2026-03-03 14:30:45.123",
 *   "level": "info",
 *   "service": "ai-crm-backend",
 *   "hostname": "ecs-01",
 *   "version": "1.2.3",
 *   "message": "客户创建成功",
 *   "requestId": "req_abc123",
 *   "userId": "user_001",
 *   "customerId": "cust_456",
 *   "duration": 45
 * }
 */
```

#### 13.8.4 健康检查端点设计

```typescript
// backend/src/modules/health/health.controller.ts
// 健康检查端点 - 多维度检测

import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

interface HealthStatus {
  status: "ok" | "degraded" | "down";
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: ComponentHealth;
    redis: ComponentHealth;
    disk: ComponentHealth;
    memory: ComponentHealth;
  };
}

interface ComponentHealth {
  status: "ok" | "down";
  responseTime?: number;
  detail?: string;
}

@Controller("api/health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * 简单健康检查（SLB使用）
   * 仅检查应用是否存活，不检查依赖
   */
  @Get()
  async liveness() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 就绪检查（完整依赖检查）
   * 用于判断是否可以接收流量
   */
  @Get("ready")
  async readiness(): Promise<HealthStatus> {
    const startTime = Date.now();
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkDisk(),
      this.checkMemory(),
    ]);

    const [dbResult, redisResult, diskResult, memResult] = checks;

    const database =
      dbResult.status === "fulfilled"
        ? dbResult.value
        : {
            status: "down" as const,
            detail: String((dbResult as PromiseRejectedResult).reason),
          };

    const redis =
      redisResult.status === "fulfilled"
        ? redisResult.value
        : {
            status: "down" as const,
            detail: String((redisResult as PromiseRejectedResult).reason),
          };

    const disk =
      diskResult.status === "fulfilled"
        ? diskResult.value
        : { status: "down" as const, detail: "check failed" };

    const memory =
      memResult.status === "fulfilled"
        ? memResult.value
        : { status: "down" as const, detail: "check failed" };

    // 判断整体状态
    const allOk = [database, redis, disk, memory].every(
      (c) => c.status === "ok",
    );
    const anyDown = [database, redis].some((c) => c.status === "down");

    const status: HealthStatus = {
      status: anyDown ? "down" : allOk ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || "unknown",
      uptime: process.uptime(),
      checks: { database, redis, disk, memory },
    };

    return status;
  }

  private async checkDatabase(): Promise<ComponentHealth> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: "ok",
        responseTime: Date.now() - start,
      };
    } catch (error) {
      return {
        status: "down",
        responseTime: Date.now() - start,
        detail: error instanceof Error ? error.message : "unknown error",
      };
    }
  }

  private async checkRedis(): Promise<ComponentHealth> {
    const start = Date.now();
    try {
      const pong = await this.redis.ping();
      return {
        status: pong === "PONG" ? "ok" : "down",
        responseTime: Date.now() - start,
      };
    } catch (error) {
      return {
        status: "down",
        responseTime: Date.now() - start,
        detail: error instanceof Error ? error.message : "unknown error",
      };
    }
  }

  private async checkDisk(): Promise<ComponentHealth> {
    const { execSync } = require("child_process");
    try {
      const output = execSync("df -h / | tail -1 | awk '{print $5}'")
        .toString()
        .trim();
      const usagePercent = parseInt(output.replace("%", ""), 10);
      return {
        status: usagePercent < 90 ? "ok" : "down",
        detail: `使用率: ${usagePercent}%`,
      };
    } catch {
      return { status: "ok", detail: "check skipped" };
    }
  }

  private async checkMemory(): Promise<ComponentHealth> {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const usagePercent = Math.round(
      (memUsage.heapUsed / memUsage.heapTotal) * 100,
    );

    return {
      status: usagePercent < 90 ? "ok" : "down",
      detail: `Heap: ${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent}%)`,
    };
  }
}
```

---

### 13.9 扩容方案

#### 13.9.1 应用层水平扩展

```
┌─────────────────────────────────────────────────────────────┐
│              应用层弹性伸缩方案                                │
│                                                             │
│  阶段一（当前）: 2台ECS固定部署                                │
│  ┌─────┐  ┌─────┐                                          │
│  │ECS-1│  │ECS-2│  ← SLB轮询                               │
│  └─────┘  └─────┘                                          │
│                                                             │
│  阶段二: ESS弹性伸缩组（用户量增长时）                          │
│  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐                       │
│  │ECS-1│  │ECS-2│  │ECS-3│  │ECS-4│  ← 自动伸缩            │
│  └─────┘  └─────┘  └─────┘  └─────┘                       │
│  伸缩规则:                                                   │
│  - CPU > 70% 持续5分钟 → 扩容1台                             │
│  - CPU < 30% 持续15分钟 → 缩容1台                            │
│  - 最小实例数: 2                                             │
│  - 最大实例数: 8                                             │
│                                                             │
│  阶段三: 容器化编排（大规模时）                                 │
│  ┌──────────────────────────────────────────┐               │
│  │  ACK (阿里云容器服务Kubernetes)            │               │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │               │
│  │  │Pod-1│ │Pod-2│ │Pod-3│ │Pod-N│       │               │
│  │  └─────┘ └─────┘ └─────┘ └─────┘       │               │
│  │  HPA: 基于CPU/内存/自定义指标自动伸缩     │               │
│  └──────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

**ESS弹性伸缩配置要点：**

```bash
# 阿里云ESS弹性伸缩组配置（通过控制台或Terraform）

# 伸缩组
scaling_group:
  name: "ai-crm-app-group"
  min_size: 2
  max_size: 8
  default_cooldown: 300          # 冷却期5分钟
  removal_policy: "OldestInstance"
  vswitch_ids:
    - vsw-xxx-a
    - vsw-xxx-b                  # 多可用区
  load_balancer_ids:
    - lb-xxx                     # 绑定SLB

# 伸缩配置（实例模板）
scaling_configuration:
  instance_type: "ecs.c6.xlarge"  # 4核8G
  image_id: "ami-crm-app-latest"  # 包含Docker和应用预配置的镜像
  security_group_id: "sg-app"
  user_data: |
    #!/bin/bash
    cd /opt/ai-crm
    docker-compose pull
    docker-compose up -d

# 扩容规则
scale_out_rule:
  name: "cpu-scale-out"
  adjustment_type: "QuantityChangeInCapacity"
  adjustment_value: 1
  cooldown: 300
  alarm:
    metric: "CpuUtilization"
    threshold: 70
    comparison: ">="
    period: 60
    evaluation_count: 5            # 连续5个周期

# 缩容规则
scale_in_rule:
  name: "cpu-scale-in"
  adjustment_type: "QuantityChangeInCapacity"
  adjustment_value: -1
  cooldown: 900                    # 缩容冷却15分钟
  alarm:
    metric: "CpuUtilization"
    threshold: 30
    comparison: "<="
    period: 60
    evaluation_count: 15           # 连续15个周期
```

#### 13.9.2 数据库扩展路线

```
┌──────────────────────────────────────────────────────────────┐
│                数据库扩展路线图                                 │
│                                                              │
│  阶段一（当前）: 主从架构 + 读写分离                             │
│  ┌────┐     ┌────┐                                          │
│  │主库 │────►│从库 │  读写分离, 主库写/从库读                    │
│  └────┘     └────┘                                          │
│  容量: 约50万客户, 500万业务记录                                │
│                                                              │
│  阶段二: 增加只读副本                                          │
│  ┌────┐     ┌────┐                                          │
│  │主库 │──┬─►│从库1│  2个只读副本                               │
│  └────┘  └─►│从库2│  读能力×3                                  │
│             └────┘                                           │
│  容量: 约200万客户, 2000万业务记录                              │
│                                                              │
│  阶段三: 垂直分库                                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                     │
│  │用户库    │  │客户/商机库│  │报表库    │                     │
│  │(主从)    │  │(主从)    │  │(只读)    │                     │
│  └─────────┘  └─────────┘  └─────────┘                     │
│  按业务域拆分数据库                                            │
│                                                              │
│  阶段四: 水平分表                                              │
│  ┌───┬───┬───┬───┐                                          │
│  │t_0│t_1│t_2│t_3│  客户表按ID hash分4张表                    │
│  └───┴───┴───┴───┘  使用ShardingSphere中间件                  │
│                                                              │
│  阶段五: 云原生数据库                                          │
│  ┌────────────────────────┐                                  │
│  │  PolarDB MySQL         │  自动弹性扩展                     │
│  │  计算与存储分离          │  最大支持128TB                    │
│  │  秒级弹性伸缩           │  读节点按需增减                    │
│  └────────────────────────┘                                  │
└──────────────────────────────────────────────────────────────┘
```

#### 13.9.3 Redis扩展路线

```
┌──────────────────────────────────────────────────────────────┐
│                Redis扩展路线图                                 │
│                                                              │
│  阶段一（当前）: 单节点 2G                                     │
│  ┌───────────┐                                               │
│  │ Redis 2G  │  会话 + 缓存 + 限流                            │
│  └───────────┘                                               │
│                                                              │
│  阶段二: 主从 + 读写分离                                       │
│  ┌───────────┐     ┌───────────┐                             │
│  │ Master 4G │────►│ Slave 4G  │                             │
│  │ (写)      │     │ (读)      │                             │
│  └───────────┘     └───────────┘                             │
│                                                              │
│  阶段三: 集群模式                                              │
│  ┌─────┐ ┌─────┐ ┌─────┐                                    │
│  │节点1 │ │节点2 │ │节点3 │  3主3从集群                        │
│  │(主)  │ │(主)  │ │(主)  │  总容量: 24G                      │
│  │ ↕   │ │ ↕   │ │ ↕   │  自动分片                          │
│  │(从)  │ │(从)  │ │(从)  │                                   │
│  └─────┘ └─────┘ └─────┘                                    │
│                                                              │
│  阶段四: Tair（阿里云增强型Redis）                              │
│  ┌────────────────────────┐                                  │
│  │ Tair 持久内存版         │  数据持久化+高性能                  │
│  │ 多模型数据结构          │  支持搜索/时序/文档                  │
│  └────────────────────────┘                                  │
└──────────────────────────────────────────────────────────────┘
```

#### 13.9.4 CDN与前端构建优化

```typescript
// frontend/vite.config.ts
// Vite构建配置优化 - 配合CDN使用

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import viteCompression from "vite-plugin-compression";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),

    // Gzip预压缩（Nginx直接使用预压缩文件）
    viteCompression({
      algorithm: "gzip",
      ext: ".gz",
      threshold: 1024, // 1KB以上才压缩
    }),

    // Brotli预压缩
    viteCompression({
      algorithm: "brotliCompress",
      ext: ".br",
      threshold: 1024,
    }),

    // 构建分析（仅analyze模式）
    mode === "analyze" &&
      visualizer({
        open: true,
        gzipSize: true,
        brotliSize: true,
        filename: "dist/stats.html",
      }),
  ].filter(Boolean),

  build: {
    target: "es2015",
    minify: "terser",
    sourcemap: false,

    terserOptions: {
      compress: {
        drop_console: true, // 生产环境移除console
        drop_debugger: true,
        pure_funcs: ["console.log", "console.info"],
      },
    },

    rollupOptions: {
      output: {
        // 分包策略 - 最大化CDN缓存效果
        manualChunks: {
          // React核心（很少更新，长期缓存）
          "vendor-react": ["react", "react-dom", "react-router-dom"],

          // UI框架
          "vendor-antd": ["antd", "@ant-design/icons"],

          // 图表库（按需加载）
          "vendor-charts": ["echarts", "echarts-for-react"],

          // 工具库
          "vendor-utils": ["axios", "dayjs", "lodash-es"],

          // 状态管理
          "vendor-state": ["zustand", "@tanstack/react-query"],
        },

        // 文件名包含内容hash（CDN长期缓存）
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: "assets/[ext]/[name]-[hash].[ext]",
      },
    },

    // 分包大小警告阈值
    chunkSizeWarningLimit: 500, // 500KB
  },

  // CDN资源路径（生产环境使用CDN域名）
  base: mode === "production" ? "https://cdn.crm.company.cn/" : "/",
}));
```

---

### 13.10 运维手册

#### 13.10.1 日常运维检查清单

```
┌─────────────────────────────────────────────────────────────┐
│                  日常巡检清单 (每日)                           │
├────┬──────────────────────────────┬───────────┬─────────────┤
│ 序号│ 检查项                       │ 检查频率   │ 责任人       │
├────┼──────────────────────────────┼───────────┼─────────────┤
│  1 │ ECS服务器状态（运行/停止）     │ 每日09:00 │ 运维工程师   │
│  2 │ 应用健康检查 /api/health/ready│ 每日09:00 │ 运维工程师   │
│  3 │ CPU/内存/磁盘使用率           │ 每日09:00 │ 运维工程师   │
│  4 │ Nginx错误日志检查             │ 每日09:00 │ 运维工程师   │
│  5 │ 应用错误日志检查              │ 每日09:00 │ 后端开发    │
│  6 │ RDS数据库状态与慢查询         │ 每日09:00 │ DBA        │
│  7 │ Redis内存使用与命中率         │ 每日09:00 │ 运维工程师   │
│  8 │ SSL证书到期检查               │ 每周一     │ 运维工程师   │
│  9 │ 备份任务执行状态              │ 每日09:00 │ DBA        │
│ 10 │ 安全组规则审查                │ 每月1日    │ 安全工程师   │
│ 11 │ 系统补丁更新检查              │ 每月1日    │ 运维工程师   │
│ 12 │ 依赖包安全漏洞扫描            │ 每周一     │ 后端开发    │
└────┴──────────────────────────────┴───────────┴─────────────┘
```

#### 13.10.2 常用运维命令

````bash
# =============================================
# 常用运维命令速查手册
# =============================================

# ==========================================
# 一、应用管理
# ==========================================

# 查看所有容器状态
docker-compose ps

# 查看容器日志（实时跟踪）
docker-compose logs -f --tail=100 backend
docker-compose logs -f --tail=100 frontend

# 重启指定服务
docker-compose restart backend

# 更新单个服务（不影响其他服务）
docker-compose up -d --no-deps backend

# 进入容器调试
docker exec -it crm-backend sh

# 查看容器资源占用
docker stats --no-stream

# 查看容器详细信息
docker inspect crm-backend

# ==========================================
# 二、Nginx管理
# ==========================================

# 测试Nginx配置语法
nginx -t

# 平滑重载配置（不断开连接）
nginx -s reload

# 查看Nginx连接状态
curl http://localhost/nginx_status

# 查看实时访问日志
tail -f /var/log/nginx/access.log | jq .

# 统计当前活跃连接数
ss -an | grep ':443' | grep ESTABLISHED | wc -l

# 查看HTTP状态码分布（最近1000行）
tail -1000 /var/log/nginx/access.log \
  | jq -r '.status' | sort | uniq -c | sort -rn

# ==========================================
# 三、数据库运维
# ==========================================

# 查看当前连接数
mysql -h $DB_HOST -u $DB_USER -p -e "SHOW STATUS LIKE 'Threads_connected';"

# 查看进程列表（排查慢查询/锁）
mysql -h $DB_HOST -u $DB_USER -p -e "SHOW FULL PROCESSLIST;"

# 杀死长时间运行的查询
mysql -h $DB_HOST -u $DB_USER -p -e "KILL <process_id>;"

# 查看InnoDB引擎状态
mysql -h $DB_HOST -u $DB_USER -p -e "SHOW ENGINE INNODB STATUS\G"

# 查看表大小排行
mysql -h $DB_HOST -u $DB_USER -p ai_crm_prod -e "
SELECT
    TABLE_NAME,
    ROUND(DATA_LENGTH / 1024 / 1024, 2) AS data_mb,
    ROUND(INDEX_LENGTH / 1024 / 1024, 2) AS index_mb,
    TABLE_ROWS
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'ai_crm_prod'
ORDER BY DATA_LENGTH DESC
LIMIT 20;"

# Prisma数据库迁移
docker exec crm-backend npx prisma migrate deploy

# ==========================================
# 四、Redis运维
# ==========================================

# 连接Redis CLI
redis-cli -h $REDIS_HOST -a $REDIS_PASSWORD

# 查看Redis信息
redis-cli -h $REDIS_HOST -a $REDIS_PASSWORD INFO

# 查看内存使用
redis-cli -h $REDIS_HOST -a $REDIS_PASSWORD INFO memory

# 查看Key数量
redis-cli -h $REDIS_HOST -a $REDIS_PASSWORD DBSIZE

# 查找大Key（生产环境慎用，建议在从库执行）
redis-cli -h $REDIS_HOST -a $REDIS_PASSWORD --bigkeys

# 监控实时命令（调试用，生产环境限时使用）
redis-cli -h $REDIS_HOST -a $REDIS_PASSWORD MONITOR

# 清除指定前缀的缓存
redis-cli -h $REDIS_HOST -a $REDIS_PASSWORD --scan --pattern "crm:customer:*" \
  | xargs -L 100 redis-cli -h $REDIS_HOST -a $REDIS_PASSWORD DEL

# ==========================================
# 五、系统诊断
# ==========================================

# 查看磁盘使用
df -h

# 查看大文件（日志清理参考）
du -sh /var/log/* | sort -rh | head -20

# API Error: Claude's response exceeded the 32000 output token maximum. To configure this behavior, set the CLAUDE_CODE_MAX_OUTPUT_TOKENS environment variable.继续从 13.10.2 常用运维命令的"五、系统诊断"部分接续输出。

```bash
# ==========================================
# 五、系统诊断
# ==========================================

# 查看磁盘使用
df -h

# 查看大文件（日志清理参考）
du -sh /var/log/* | sort -rh | head -20

# 查看系统负载
uptime

# 查看内存使用
free -h

# 查看CPU使用Top进程
top -bn1 | head -20

# 查看网络连接状态统计
ss -s

# 查看TCP连接分布
ss -ant | awk '{print $1}' | sort | uniq -c | sort -rn

# 查看端口监听
ss -tlnp

# 查看IO状态
iostat -x 1 5

# DNS解析测试
nslookup crm.company.cn
dig crm.company.cn

# 检查SSL证书到期时间
echo | openssl s_client -connect crm.company.cn:443 -servername crm.company.cn 2>/dev/null \
  | openssl x509 -noout -dates

# ==========================================
# 六、日志清理
# ==========================================

# 清理30天前的应用日志
find /var/log/ai-crm -name "*.log" -mtime +30 -delete

# 清理Docker容器日志（单个容器日志超过100MB时）
truncate -s 0 $(docker inspect --format='{{.LogPath}}' crm-backend)

# 清理无用的Docker资源
docker system prune -f                    # 清理停止的容器、无用网络、悬空镜像
docker volume prune -f                    # 清理无用数据卷（慎用）
````

#### 13.10.3 故障排查流程

```
┌──────────────────────────────────────────────────────────────┐
│                    故障排查流程图                               │
│                                                              │
│                   ┌──────────────┐                           │
│                   │  收到告警通知  │                           │
│                   └──────┬───────┘                           │
│                          │                                   │
│                   ┌──────▼───────┐                           │
│                   │ 确认故障现象  │                           │
│                   │ (用户反馈/    │                           │
│                   │  监控告警)    │                           │
│                   └──────┬───────┘                           │
│                          │                                   │
│              ┌───────────┼───────────┐                       │
│              │           │           │                       │
│       ┌──────▼─────┐ ┌──▼────┐ ┌───▼──────┐               │
│       │ 页面无法访问 │ │API报错│ │ 响应缓慢  │               │
│       └──────┬─────┘ └──┬────┘ └───┬──────┘               │
│              │          │          │                        │
│       ┌──────▼──────────▼──────────▼──────┐                │
│       │  Step 1: 快速定位故障层级          │                │
│       │  ① curl https://crm.company.cn    │                │
│       │  ② curl SLB内网IP                 │                │
│       │  ③ curl ECS本机Nginx              │                │
│       │  ④ curl ECS本机Backend :3000      │                │
│       │  ⑤ 检查数据库/Redis连通性          │                │
│       └──────────────┬────────────────────┘                │
│                      │                                      │
│       ┌──────────────▼────────────────────┐                │
│       │  Step 2: 根据层级深入排查          │                │
│       └──────────────┬────────────────────┘                │
│                      │                                      │
│    ┌─────────┬───────┼───────┬──────────┐                  │
│    │         │       │       │          │                   │
│  ┌─▼──┐  ┌──▼──┐ ┌──▼──┐ ┌─▼───┐ ┌───▼──┐               │
│  │DNS │  │SLB  │ │Nginx│ │App  │ │DB/   │               │
│  │/CDN│  │问题 │ │问题 │ │问题 │ │Redis │               │
│  └─┬──┘  └──┬──┘ └──┬──┘ └─┬───┘ └───┬──┘               │
│    │        │       │      │         │                    │
│    ▼        ▼       ▼      ▼         ▼                    │
│  检查DNS  检查SLB  检查   查看应用   检查连接数            │
│  解析记录 健康检查  配置   错误日志   检查慢查询            │
│  检查CDN  检查后端  语法   检查容器   检查内存              │
│  回源配置 服务器权重 错误日志 资源占用  检查主从同步          │
│                                                            │
│       ┌──────────────────────────────────┐                 │
│       │  Step 3: 执行修复操作             │                 │
│       │  - 重启服务 / 回滚版本            │                 │
│       │  - 修复配置 / 扩容资源            │                 │
│       │  - 清理日志 / 杀死慢查询          │                 │
│       └──────────────┬───────────────────┘                 │
│                      │                                      │
│       ┌──────────────▼───────────────────┐                 │
│       │  Step 4: 验证恢复                 │                 │
│       │  - 健康检查恢复正常               │                 │
│       │  - 监控指标回归基线               │                 │
│       │  - 用户确认问题解决               │                 │
│       └──────────────┬───────────────────┘                 │
│                      │                                      │
│       ┌──────────────▼───────────────────┐                 │
│       │  Step 5: 编写故障复盘报告         │                 │
│       │  - 故障时间线                     │                 │
│       │  - 根因分析                       │                 │
│       │  - 改进措施                       │                 │
│       └──────────────────────────────────┘                 │
└──────────────────────────────────────────────────────────────┘
```

**快速诊断脚本：**

```bash
#!/bin/bash
# =============================================
# scripts/diagnose.sh
# 一键诊断脚本 - 快速收集系统状态信息
# 用法: bash diagnose.sh
# =============================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "  AI-CRM 系统诊断报告"
echo "  时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "  主机: $(hostname)"
echo "=========================================="

# ---- 系统资源 ----
echo ""
echo "【1. 系统资源】"
echo "-------------------------------------------"
echo "负载: $(uptime | awk -F'average:' '{print $2}')"
echo ""
echo "内存使用:"
free -h | head -2
echo ""
echo "磁盘使用:"
df -h | grep -E '^/dev|Filesystem'
echo ""

# ---- CPU使用率 ----
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
if (( $(echo "$CPU_USAGE > 85" | bc -l 2>/dev/null || echo 0) )); then
    echo -e "CPU使用率: ${RED}${CPU_USAGE}%${NC} [异常]"
else
    echo -e "CPU使用率: ${GREEN}${CPU_USAGE}%${NC} [正常]"
fi

# ---- Docker容器状态 ----
echo ""
echo "【2. 容器状态】"
echo "-------------------------------------------"
docker-compose ps 2>/dev/null || docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "容器资源占用:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" 2>/dev/null

# ---- 应用健康检查 ----
echo ""
echo "【3. 应用健康检查】"
echo "-------------------------------------------"
HEALTH_RESPONSE=$(curl -sf -w "\nHTTP_CODE:%{http_code}\nTIME:%{time_total}" \
    http://localhost:3000/api/health/ready 2>/dev/null || echo "FAILED")

if echo "$HEALTH_RESPONSE" | grep -q "HTTP_CODE:200"; then
    echo -e "健康检查: ${GREEN}通过${NC}"
    echo "$HEALTH_RESPONSE" | grep -v "HTTP_CODE\|TIME" | python3 -m json.tool 2>/dev/null || true
    RESPONSE_TIME=$(echo "$HEALTH_RESPONSE" | grep "TIME:" | cut -d: -f2)
    echo "响应时间: ${RESPONSE_TIME}s"
else
    echo -e "健康检查: ${RED}失败${NC}"
    echo "$HEALTH_RESPONSE"
fi

# ---- Nginx状态 ----
echo ""
echo "【4. Nginx状态】"
echo "-------------------------------------------"
if nginx -t 2>&1 | grep -q "successful"; then
    echo -e "配置语法: ${GREEN}正确${NC}"
else
    echo -e "配置语法: ${RED}错误${NC}"
    nginx -t 2>&1
fi

NGINX_ERRORS=$(tail -20 /var/log/nginx/error.log 2>/dev/null | grep -c "error\|crit\|alert" || echo 0)
if [ "$NGINX_ERRORS" -gt 0 ]; then
    echo -e "最近错误数: ${YELLOW}${NGINX_ERRORS}${NC}"
    echo "最近错误日志:"
    tail -5 /var/log/nginx/error.log 2>/dev/null
else
    echo -e "最近错误数: ${GREEN}0${NC}"
fi

# ---- 数据库连通性 ----
echo ""
echo "【5. 数据库连通性】"
echo "-------------------------------------------"
if docker exec crm-backend sh -c 'npx prisma db execute --stdin <<< "SELECT 1"' > /dev/null 2>&1; then
    echo -e "MySQL连接: ${GREEN}正常${NC}"
else
    echo -e "MySQL连接: ${RED}异常${NC}"
fi

# ---- Redis连通性 ----
echo ""
echo "【6. Redis连通性】"
echo "-------------------------------------------"
REDIS_PING=$(redis-cli -h "${REDIS_HOST:-localhost}" -a "${REDIS_PASSWORD:-}" ping 2>/dev/null || echo "FAILED")
if [ "$REDIS_PING" = "PONG" ]; then
    echo -e "Redis连接: ${GREEN}正常${NC}"
    REDIS_MEM=$(redis-cli -h "${REDIS_HOST:-localhost}" -a "${REDIS_PASSWORD:-}" INFO memory 2>/dev/null \
        | grep "used_memory_human" | cut -d: -f2 | tr -d '\r')
    echo "内存使用: ${REDIS_MEM}"
else
    echo -e "Redis连接: ${RED}异常${NC}"
fi

# ---- 最近错误日志 ----
echo ""
echo "【7. 最近应用错误（最近10条）】"
echo "-------------------------------------------"
docker logs --tail=200 crm-backend 2>&1 | grep -i "error\|fatal\|exception" | tail -10 || echo "无错误日志"

echo ""
echo "=========================================="
echo "  诊断完成"
echo "=========================================="
```

#### 13.10.4 版本回滚操作步骤

```bash
#!/bin/bash
# =============================================
# scripts/rollback.sh
# 版本回滚脚本
# 用法: bash rollback.sh [target_version]
# 示例: bash rollback.sh v1.2.2
# =============================================
set -euo pipefail

REGISTRY="registry.cn-hangzhou.aliyuncs.com"
NAMESPACE="ai-crm"
DEPLOY_DIR="/opt/ai-crm"
LOG_FILE="/var/log/ai-crm/rollback.log"

TARGET_TAG=${1:-""}

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# ==========================================
# Step 1: 确定回滚目标版本
# ==========================================
if [ -z "$TARGET_TAG" ]; then
    log "可用的历史版本:"
    docker images "${REGISTRY}/${NAMESPACE}/backend" \
        --format "{{.Tag}}\t{{.CreatedAt}}" \
        | grep "^v" \
        | sort -Vr \
        | head -10

    echo ""
    read -rp "请输入目标版本号 (例: v1.2.2): " TARGET_TAG
fi

if [ -z "$TARGET_TAG" ]; then
    log "错误: 未指定目标版本"
    exit 1
fi

log "=========================================="
log "开始回滚操作"
log "目标版本: ${TARGET_TAG}"
log "=========================================="

# ==========================================
# Step 2: 确认回滚
# ==========================================
CURRENT_TAG=$(grep "IMAGE_TAG=" "${DEPLOY_DIR}/.env" | cut -d= -f2)
log "当前版本: ${CURRENT_TAG}"
log "目标版本: ${TARGET_TAG}"

read -rp "确认执行回滚? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    log "回滚已取消"
    exit 0
fi

# ==========================================
# Step 3: 验证目标镜像存在
# ==========================================
log "[1/5] 验证目标镜像..."
docker pull "${REGISTRY}/${NAMESPACE}/backend:${TARGET_TAG}" || {
    log "错误: 后端镜像 ${TARGET_TAG} 不存在"
    exit 1
}
docker pull "${REGISTRY}/${NAMESPACE}/frontend:${TARGET_TAG}" || {
    log "错误: 前端镜像 ${TARGET_TAG} 不存在"
    exit 1
}
log "镜像拉取完成"

# ==========================================
# Step 4: 备份当前状态
# ==========================================
log "[2/5] 备份当前状态..."
BACKUP_DIR="${DEPLOY_DIR}/backups/rollback_$(date '+%Y%m%d_%H%M%S')"
mkdir -p "$BACKUP_DIR"
cp "${DEPLOY_DIR}/.env" "${BACKUP_DIR}/.env.bak"
docker-compose -f "${DEPLOY_DIR}/docker-compose.yml" ps > "${BACKUP_DIR}/services.txt"
log "备份完成: ${BACKUP_DIR}"

# ==========================================
# Step 5: 执行回滚
# ==========================================
log "[3/5] 更新配置..."
cd "${DEPLOY_DIR}"
sed -i "s|IMAGE_TAG=.*|IMAGE_TAG=${TARGET_TAG}|" .env

log "[4/5] 重启服务..."
docker-compose up -d --no-deps backend frontend

# ==========================================
# Step 6: 验证回滚结果
# ==========================================
log "[5/5] 等待健康检查..."
for i in $(seq 1 20); do
    RESPONSE=$(curl -sf http://localhost:3000/api/health 2>/dev/null || echo "")
    if echo "$RESPONSE" | grep -q '"status":"ok"'; then
        log "健康检查通过"
        break
    fi
    if [ "$i" -eq 20 ]; then
        log "错误: 回滚后健康检查失败"
        log "尝试恢复原版本: ${CURRENT_TAG}"
        sed -i "s|IMAGE_TAG=.*|IMAGE_TAG=${CURRENT_TAG}|" .env
        docker-compose up -d --no-deps backend frontend
        exit 1
    fi
    log "等待健康检查... ($i/20)"
    sleep 3
done

log "=========================================="
log "回滚完成"
log "当前运行版本: ${TARGET_TAG}"
log "=========================================="
```

**数据库回滚注意事项：**

```
┌──────────────────────────────────────────────────────────────┐
│              数据库迁移回滚策略                                 │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  原则: 每次数据库迁移必须提供对应的回滚脚本                      │
│                                                              │
│  方式一: Prisma迁移回滚（推荐用于简单场景）                      │
│  $ npx prisma migrate resolve --rolled-back <migration_name> │
│                                                              │
│  方式二: 手动SQL回滚脚本                                       │
│  每个迁移文件对应一个回滚SQL:                                   │
│  prisma/migrations/                                          │
│  ├── 20260301_add_customer_tag/                              │
│  │   ├── migration.sql          # 正向迁移                   │
│  │   └── rollback.sql           # 回滚脚本                   │
│  └── 20260302_add_order_status/                              │
│      ├── migration.sql                                       │
│      └── rollback.sql                                        │
│                                                              │
│  方式三: RDS时间点恢复（严重故障时使用）                         │
│  通过阿里云RDS控制台 → 备份恢复 → 按时间点恢复                  │
│  恢复到新实例 → 验证数据 → 切换连接串                           │
│                                                              │
│  注意事项:                                                    │
│  1. 涉及删除列/表的迁移必须先软删除，观察一周后再物理删除         │
│  2. 大表DDL操作使用pt-online-schema-change避免锁表             │
│  3. 回滚前确认是否有依赖新结构的业务数据需要处理                 │
└──────────────────────────────────────────────────────────────┘
```

#### 13.10.5 应急预案

```
┌──────────────────────────────────────────────────────────────┐
│                    应急预案总览                                │
├───────┬──────────────────────────────────────────────────────┤
│ 等级   │ 定义                                                │
├───────┼──────────────────────────────────────────────────────┤
│ P0    │ 系统完全不可用，所有用户受影响                          │
│ P1    │ 核心功能不可用（如登录、创建订单），部分用户受影响        │
│ P2    │ 非核心功能异常（如报表、通知），体验降级                 │
│ P3    │ 轻微问题（如页面样式异常），不影响业务                  │
├───────┼──────────────────────────────────────────────────────┤
│ 响应   │ P0: 5分钟内响应, 30分钟内恢复                        │
│ 时效   │ P1: 15分钟内响应, 1小时内恢复                        │
│       │ P2: 1小时内响应, 4小时内恢复                          │
│       │ P3: 下一个工作日处理                                  │
└───────┴──────────────────────────────────────────────────────┘
```

**预案一：应用服务宕机**

```
触发条件: 健康检查连续失败 / 容器异常退出

处理步骤:
1. 确认故障范围
   $ docker-compose ps
   $ docker logs --tail=50 crm-backend

2. 尝试重启服务
   $ docker-compose restart backend
   $ sleep 10
   $ curl -sf http://localhost:3000/api/health

3. 若重启无效，检查资源
   $ docker stats --no-stream
   $ df -h
   $ free -h

4. 若资源耗尽，清理后重启
   $ docker system prune -f
   $ docker-compose down && docker-compose up -d

5. 若仍无法恢复，执行版本回滚
   $ bash scripts/rollback.sh <上一个稳定版本>

6. 若单节点故障，SLB自动摘除故障节点
   另一节点继续提供服务，同时排查故障节点
```

**预案二：数据库故障**

```
触发条件: RDS主实例不可用 / 连接超时

处理步骤:
1. 确认故障类型
   - 登录阿里云RDS控制台查看实例状态
   - 检查是否触发自动主从切换

2. 若RDS已自动切换
   - 连接串不变，应用自动重连
   - 检查主从延迟，确认数据一致性
   - 监控新主库性能

3. 若连接池耗尽
   $ 查看当前连接: SHOW STATUS LIKE 'Threads_connected';
   $ 杀死空闲连接: KILL <idle_process_id>;
   $ 重启应用重建连接池: docker-compose restart backend

4. 若需要数据恢复
   - RDS控制台 → 备份恢复 → 克隆实例（恢复到指定时间点）
   - 在克隆实例上验证数据完整性
   - 确认后切换应用连接到新实例

5. 降级措施
   - 开启应用只读模式（禁止写操作）
   - 关闭非核心功能（报表生成、批量导入）
   - 通知用户系统维护中
```

**预案三：Redis故障**

```
触发条件: Redis不可用 / 内存溢出

处理步骤:
1. 确认故障类型
   $ redis-cli -h $REDIS_HOST -a $REDIS_PASSWORD ping
   $ redis-cli -h $REDIS_HOST -a $REDIS_PASSWORD INFO memory

2. 若Redis不可达
   - 检查阿里云Redis控制台实例状态
   - 检查网络安全组规则
   - 等待阿里云自动恢复（通常30秒内）

3. 若内存溢出
   $ redis-cli -h $REDIS_HOST -a $REDIS_PASSWORD INFO memory
   $ redis-cli -h $REDIS_HOST -a $REDIS_PASSWORD --bigkeys
   - 清理过期Key或大Key
   - 考虑升级内存规格

4. 应用降级策略（Redis不可用时）
   - 会话管理: 降级为JWT无状态认证（不依赖Redis存储）
   - 数据缓存: 穿透到数据库查询（需关注DB压力）
   - 分布式锁: 降级为数据库行锁
   - 限流: 降级为本地内存限流
```

**预案四：突发流量（被攻击或流量暴增）**

```
触发条件: QPS突增 / CPU告警 / 大量429/503状态码

处理步骤:
1. 快速判断是否为攻击
   $ tail -1000 /var/log/nginx/access.log \
     | jq -r '.remote_addr' | sort | uniq -c | sort -rn | head -20
   - 单IP请求量异常 → DDoS/CC攻击
   - 请求分布均匀 → 正常流量暴增

2. 若为攻击
   a. 启用阿里云DDoS防护 / WAF
   b. Nginx层封禁恶意IP:
      $ echo "deny 1.2.3.4;" >> /etc/nginx/conf.d/blocklist.conf
      $ nginx -s reload
   c. 启用更严格的限流规则

3. 若为正常流量暴增
   a. 紧急扩容ECS（通过ESS或手动添加）
   b. 开启CDN回源缓存
   c. 数据库开启只读副本分流查询
   d. Redis缓存预热热点数据

4. 长期优化
   - 接入阿里云CDN + WAF
   - 配置弹性伸缩组ESS自动应对
   - 优化慢接口，添加缓存
   - 静态资源完全走CDN
```

**预案五：数据泄露/安全事件**

```
触发条件: 异常数据访问 / 安全漏洞通报 / 用户反馈数据泄露

处理步骤:
1. 立即响应（黄金30分钟）
   - 评估影响范围
   - 收集证据（保留日志，不要清除）
   - 通知安全负责人和管理层

2. 阻断措施
   - 阻断攻击来源IP
   - 临时关闭受影响的API接口
   - 重置可能泄露的密钥/Token
   $ 强制所有用户重新登录:
     redis-cli -h $REDIS_HOST FLUSHDB    # 清空会话

3. 排查分析
   - 审查Nginx访问日志，定位异常请求
   - 审查应用日志，确认数据访问范围
   - 审查数据库审计日志

4. 修复加固
   - 修复安全漏洞
   - 更新所有密钥和证书
   - 加强访问控制策略
   - 启用阿里云WAF高级防护

5. 善后处理
   - 编写安全事件报告
   - 必要时通知受影响用户
   - 合规要求下报备监管机构
   - 安全复盘及改进
```

---

以上为第13章"部署与运维设计"的全部内容。文档覆盖了从部署架构、环境规划、容器化、CI/CD流水线、Nginx配置、数据库与Redis运维、监控告警、扩容方案到运维操作手册的完整方案设计。所有配置文件和脚本均基于阿里云ECS(4核8G x 2)、RDS MySQL(4核8G主从)、Redis(2G)、OSS、SLB、CDN的资源规格进行了针对性调优。
