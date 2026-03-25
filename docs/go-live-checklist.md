# CRM Sales Platform — Go-Live Verification Checklist

> Pre-deployment verification combining E2E smoke, API health checks, and security scan status.

---

## 1. Health Checks

| Check            | Command / URL                        | Expected                                  |
| ---------------- | ------------------------------------ | ----------------------------------------- |
| API health       | `curl /api/v1/health`                | `{ status: 'ok', db: 'ok', redis: 'ok' }` |
| API readiness    | `curl /api/v1/health/ready`          | 200 OK                                    |
| Docker health    | `docker compose ps`                  | All services "healthy"                    |
| MySQL            | `mysqladmin ping -h db`              | "mysqld is alive"                         |
| Redis            | `redis-cli PING`                     | PONG                                      |
| MinIO            | `mc ready minio`                     | Ready                                     |
| Server container | Healthcheck: 15s interval, 3 retries | Auto-restart on failure                   |
| Web container    | Healthcheck: 30s interval, 3 retries | Returns 200 at `/`                        |

**Verification steps:**

- [ ] Start fresh: `docker compose down -v && docker compose up -d`
- [ ] Wait 60s, confirm all healthy: `docker compose ps`
- [ ] Test restart resilience: `docker compose kill server` → auto-restarts
- [ ] Monitor resources: `docker stats --no-stream`
- [ ] Verify persistent volumes: `docker volume ls | grep crm`

---

## 2. Test Suites

### 2.1 Backend (156 tests)

| Suite                 | Count | Scope                            |
| --------------------- | ----- | -------------------------------- |
| UserService           | 17    | CRUD, roles, pagination          |
| AuthService           | 18    | Login, JWT, refresh, blacklist   |
| CustomerService       | 18    | CRUD, ownership, export          |
| OpportunityService    | 20    | CRUD, stages, assignment         |
| CallRecordService     | 22    | CRUD, AI summary, CSV            |
| AiService             | 11    | Chat, embedding, init            |
| KnowledgeService      | 21    | CRUD, cache, RAG pipeline        |
| ProspectConfigService | 48    | Data sources, templates, filters |
| AuditLogService       | 8     | Query, filtering                 |

- [ ] `cd packages/server && pnpm test` — all 156 pass
- [ ] Coverage report: `pnpm test -- --coverage` — core services ≥ 80%

### 2.2 Frontend (71 tests)

| Suite                 | Count |
| --------------------- | ----- |
| format.spec.ts        | 17    |
| tag-helpers.spec.ts   | 28    |
| usePermission.spec.ts | 7     |
| user.spec.ts          | 13    |
| permission.spec.ts    | 6     |

- [ ] `cd packages/web && pnpm test` — all 71 pass

### 2.3 E2E (46 Playwright tests)

| Suite              | Count | Scope                               |
| ------------------ | ----- | ----------------------------------- |
| auth.spec.ts       | 7     | Login, redirects, validation        |
| dashboard.spec.ts  | 8     | Stats, charts, quick actions        |
| customer.spec.ts   | 11    | CRUD, search, pagination            |
| navigation.spec.ts | 12    | Sidebar, roles, breadcrumbs         |
| modules.spec.ts    | 8     | Opportunity, call record, knowledge |

- [ ] `npx playwright test` — all 46 pass
- [ ] Traces collected on failure (playwright-report artifact)

### 2.4 Load Test

- [ ] `k6 run .tmp/perf/k6-health.js` (10 VUs, 15s)
- [ ] Error rate < 1%, p95 response < 500ms

---

## 3. Security Scan

### 3.1 Authentication & Authorization

- [ ] JWT secrets are 64+ chars, generated via `crypto.randomBytes(32).toString('hex')`
- [ ] Access token TTL = 2h, refresh token TTL = 7d
- [ ] Token blacklist operational (Redis-backed)
- [ ] Family replay detection enabled
- [ ] All business controllers have `@UseGuards(JwtAuthGuard, RolesGuard)`
- [ ] Unauthenticated request to `/api/v1/customer` returns 401
- [ ] Sales user cannot access admin routes (returns 403)

### 3.2 Rate Limiting

| Endpoint            | Limit                | Verify                   |
| ------------------- | -------------------- | ------------------------ |
| Global              | 200 req/min per user | Burst 201 requests → 429 |
| `POST /auth/login`  | 5/min                | 6th attempt → 429        |
| `GET /*/export`     | 3/min                | 4th attempt → 429        |
| `POST /sms/*`       | 1/min                | 2nd attempt → 429        |
| Nginx `/api/*`      | 10 req/s             | Burst → 503              |
| Nginx `/auth/login` | 5 req/min            | Burst → 503              |

- [ ] Test each limit, confirm 429/503 response

### 3.3 HTTP Security Headers

- [ ] `X-Frame-Options: SAMEORIGIN`
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-XSS-Protection: 1; mode=block`
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Strict-Transport-Security: max-age=...` (HSTS)
- [ ] `Content-Security-Policy` set

Verify: `curl -I https://<domain>/api/v1/health | grep -iE "x-frame|x-content|x-xss|referrer|strict-transport|content-security"`

### 3.4 Input Validation & Sanitization

- [ ] `ValidationPipe` active (class-validator decorators on all DTOs)
- [ ] `SanitizeHtmlPipe` strips XSS payloads
- [ ] `SqlInjectionMiddleware` blocks injection patterns
- [ ] `CsrfMiddleware` validates double-submit cookies
- [ ] `DataMaskInterceptor` redacts PII in logs

### 3.5 Dependency Audit

- [ ] `pnpm audit` — no critical/high vulnerabilities
- [ ] CI `security` job passes (license-checker, optional snyk)

### 3.6 Container Security

- [ ] Server runs as `nestjs` (UID 1001), not root
- [ ] Web runs as `nginx` (UID 101), not root
- [ ] `DB_ROOT_PASSWORD` not exposed to app container
- [ ] `ENCRYPTION_KEY` set (AES-256-GCM for sensitive fields)

---

## 4. Environment Configuration

### 4.1 Required Variables

| Variable                | Description                       | Status  |
| ----------------------- | --------------------------------- | ------- |
| `DB_HOST`               | MySQL host                        | [ ] Set |
| `DB_PORT`               | MySQL port (3306)                 | [ ] Set |
| `DB_USERNAME`           | `crm_user` for runtime            | [ ] Set |
| `DB_PASSWORD`           | DML account password              | [ ] Set |
| `DB_ROOT_PASSWORD`      | Init only, shadow in app          | [ ] Set |
| `REDIS_HOST`            | Redis host                        | [ ] Set |
| `REDIS_PORT`            | Redis port (6379)                 | [ ] Set |
| `JWT_SECRET`            | Access token signing (64+ chars)  | [ ] Set |
| `JWT_REFRESH_SECRET`    | Refresh token signing (64+ chars) | [ ] Set |
| `ENCRYPTION_KEY`        | 32-byte hex for AES-256-GCM       | [ ] Set |
| `CORS_ORIGINS`          | Production domains (no localhost) | [ ] Set |
| `OSS_ENDPOINT`          | Object storage endpoint           | [ ] Set |
| `OSS_BUCKET`            | Object storage bucket             | [ ] Set |
| `OSS_ACCESS_KEY_ID`     | OSS credentials                   | [ ] Set |
| `OSS_ACCESS_KEY_SECRET` | OSS credentials                   | [ ] Set |

### 4.2 Optional (HA)

| Variable                  | Description                 | Status        |
| ------------------------- | --------------------------- | ------------- |
| `REDIS_SENTINELS`         | `host1:port,host2:port,...` | [ ] Set if HA |
| `REDIS_SENTINEL_NAME`     | Master name                 | [ ] Set if HA |
| `REDIS_SENTINEL_PASSWORD` | Sentinel auth               | [ ] Set if HA |

- [ ] All secrets stored in vault (not on disk)
- [ ] `.env` in `.gitignore`
- [ ] No secrets in Docker image layers

---

## 5. Database

### 5.1 Migrations

- [ ] Run migrations: `DB_USERNAME=crm_migrator DB_PASSWORD=<pwd> pnpm migration:run`
- [ ] Verify table count matches expected schema
- [ ] `TypeORM synchronize: false` confirmed in production config

### 5.2 Accounts

| Account        | Privileges                     | Purpose                               |
| -------------- | ------------------------------ | ------------------------------------- |
| `root`         | ALL                            | Init only (docker-compose entrypoint) |
| `crm_user`     | SELECT, INSERT, UPDATE, DELETE | Application runtime                   |
| `crm_migrator` | ALTER, CREATE, DROP, INDEX     | Schema migrations                     |

- [ ] Verify `crm_user` cannot ALTER tables
- [ ] Verify `crm_migrator` cannot SELECT business data (optional)

### 5.3 Backup

- [ ] Run backup: `bash scripts/db-backup.sh`
- [ ] Verify backup file created in `/data/backups/mysql/`
- [ ] Test restore to separate database
- [ ] Schedule crontab: `0 2 * * * /bin/bash /opt/crm/scripts/db-backup.sh`
- [ ] Binary logging enabled for point-in-time recovery

---

## 6. CI/CD Pipeline

### 6.1 GitHub Actions Jobs

| Job             | Depends On             | Status   |
| --------------- | ---------------------- | -------- |
| lint            | —                      | [ ] Pass |
| test-server     | —                      | [ ] Pass |
| build-web       | test-server            | [ ] Pass |
| build-server    | test-server            | [ ] Pass |
| test-e2e        | test-server, build-web | [ ] Pass |
| security        | —                      | [ ] Pass |
| docker-validate | test-e2e               | [ ] Pass |
| typecheck       | —                      | [ ] Pass |

- [ ] All 8 CI jobs green on latest main commit

### 6.2 Deployment Pipeline (CD)

| Stage      | Trigger       | Approval  |
| ---------- | ------------- | --------- |
| Test       | Push to main  | Automatic |
| Staging    | v\* tag       | Manual    |
| Production | After staging | Manual    |

- [ ] GitHub secrets configured: `ACR_REGISTRY`, `ACR_USERNAME`, `ACR_PASSWORD`, SSH keys
- [ ] Test deploy to test environment
- [ ] Test deploy to staging
- [ ] Test rollback procedure
- [ ] Health check polling (120s max) → auto-rollback on failure

---

## 7. Docker Resources

| Service | CPU Limit | Memory Limit |
| ------- | --------- | ------------ |
| Server  | 1.0       | 512M         |
| Web     | 0.5       | 128M         |
| MySQL   | —         | 512M         |
| Redis   | —         | 256M         |

- [ ] Verify limits applied: `docker compose config | grep -A2 resources`
- [ ] Under peak load, no OOM kills: `docker events --filter event=oom`

---

## 8. Logging & Monitoring

### 8.1 Logging

- [ ] Winston logs in `/app/packages/server/logs/`
- [ ] Log rotation: daily + 20MB max per file
- [ ] Retention: 30 days
- [ ] Structured JSON output

### 8.2 Interceptors

| Interceptor         | Purpose                     | Active       |
| ------------------- | --------------------------- | ------------ |
| TimeoutInterceptor  | 30s global timeout → 408    | [ ] Verified |
| LoggingInterceptor  | Request/response logging    | [ ] Verified |
| DataMaskInterceptor | PII masking in logs         | [ ] Verified |
| AuditLogInterceptor | POST/PUT/DELETE audit trail | [ ] Verified |

### 8.3 External Monitoring (recommended)

- [ ] Log aggregation platform configured (ELK / Datadog / CloudWatch)
- [ ] Alert rules for: error rate > 1%, p95 > 1s, health check failures
- [ ] On-call rotation established
- [ ] Operations dashboard created

---

## 9. Deployment Day Runbook

### Pre-Deploy

```bash
# 1. Backup database
bash scripts/db-backup.sh

# 2. Run full test suite
pnpm test && cd packages/web && pnpm test && cd ../..
npx playwright test

# 3. Verify CI/CD pipeline green
gh run list --limit 5

# 4. Confirm environment variables
docker compose config | grep -c "CHANGE_ME"  # should be 0
```

### Deploy

```bash
# 5. Trigger deployment (via tag or manual dispatch)
git tag v1.0.0 && git push --tags

# 6. Monitor deployment
gh run watch
docker compose ps
curl https://<domain>/api/v1/health
```

### Post-Deploy (First Hour)

```bash
# 7. Verify health
curl https://<domain>/api/v1/health
docker compose ps
docker stats --no-stream

# 8. Check logs for errors
docker compose logs --tail=100 server | grep -i error

# 9. Smoke test core workflows
# - Login as admin
# - Create a customer
# - View dashboard
# - Export CSV
```

### Rollback (if needed)

```bash
# Stop current deployment
docker compose down

# Restore previous version
export IMAGE_TAG=<previous-tag>
docker compose up -d

# Verify rollback
curl https://<domain>/api/v1/health

# Restore database if migration was applied
mysql -u root -p crm_sales < /data/backups/mysql/<latest-backup>.sql
```

---

## 10. Final Sign-Off

| Area                                  | Owner         | Sign-Off |
| ------------------------------------- | ------------- | -------- |
| Infrastructure (DB, Redis, Docker)    | DevOps        | [ ]      |
| Security (auth, rate limits, headers) | Security      | [ ]      |
| Backend tests (156 + coverage)        | Backend Lead  | [ ]      |
| Frontend tests (71 + build)           | Frontend Lead | [ ]      |
| E2E tests (46 + smoke)                | QA Lead       | [ ]      |
| CI/CD pipeline (8 jobs green)         | DevOps        | [ ]      |
| Environment variables (vault)         | DevOps        | [ ]      |
| Monitoring & alerting                 | SRE           | [ ]      |
| Backup & recovery tested              | DBA           | [ ]      |
| Documentation & runbooks              | Tech Lead     | [ ]      |

**Go / No-Go Decision:** [ ] Approved by ******\_\_\_****** Date: ******\_\_\_******

---

## Automated Go / No-Go Framework

The manual checklist above is supplemented by an automated decision framework
that evaluates four gates and produces a single GO / NO-GO verdict.

### Running Locally

```bash
# Full check (production thresholds)
bash scripts/go-no-go.sh --env production

# Skip performance gate (faster)
bash scripts/go-no-go.sh --env staging --skip-perf

# JSON output (for CI integration)
bash scripts/go-no-go.sh --env production --json
```

Exit code 0 = GO, 1 = NO-GO, 2 = script error.

### Running in CI

Trigger the **Go/No-Go Gate** workflow manually from GitHub Actions,
or integrate it as a `workflow_call` pre-gate before CD:

```yaml
# In cd.yml, add before deploy jobs:
pre-deploy-gate:
  uses: ./.github/workflows/go-no-go.yml
  with:
    environment: production
```

### Gate Definitions

| Gate            | Checks                                                                            | Blocking? |
| --------------- | --------------------------------------------------------------------------------- | --------- |
| **Quality**     | Backend tests, frontend tests, server type check, web type check, lint, web build | Always    |
| **Security**    | Dependency audit (prod-only), license policy, container non-root, env secrets     | Always    |
| **Performance** | JS bundle size (< 2MB), Docker image sizes (server < 500MB, web < 100MB)          | Always    |
| **Operations**  | Docker Compose validity, deploy/backup scripts, health endpoint, K8s manifests    | Always    |

### Decision Matrix

All four gates must PASS for a GO verdict:

| Quality | Security | Performance | Operations | **Decision** |
| ------- | -------- | ----------- | ---------- | ------------ |
| PASS    | PASS     | PASS        | PASS       | **GO**       |
| FAIL    | _any_    | _any_       | _any_      | **NO-GO**    |
| _any_   | FAIL     | _any_       | _any_      | **NO-GO**    |
| _any_   | _any_    | FAIL        | _any_      | **NO-GO**    |
| _any_   | _any_    | _any_       | FAIL       | **NO-GO**    |

### Environment-Specific Behavior

| Check               | test  | staging | production |
| ------------------- | ----- | ------- | ---------- |
| Dependency audit    | warn  | warn    | **block**  |
| Missing env secrets | skip  | skip    | **block**  |
| Pending migrations  | warn  | warn    | **block**  |
| Bundle size         | check | check   | check      |
| Container non-root  | check | check   | check      |
