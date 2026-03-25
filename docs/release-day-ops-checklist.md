# CRM Sales Platform — Release Day Operational Readiness Checklist

> Companion to [go-live-checklist.md](./go-live-checklist.md). This document covers
> people, processes, and incident response — the things that **cannot** be automated.

---

## 1. Staffing & Roles

### 1.1 War Room Roster (Required On-Call, Release Window + 4 h)

| Role                  | Responsibility                                    | Name   | Phone / IM | Backup |
| --------------------- | ------------------------------------------------- | ------ | ---------- | ------ |
| **Release Commander** | Go/no-go call, coordinates all parties            | **\_** | **\_**     | **\_** |
| **Backend Lead**      | NestJS, TypeORM, migrations, Bull queues          | **\_** | **\_**     | **\_** |
| **Frontend Lead**     | Vue 3 PC + miniapp builds, CDN                    | **\_** | **\_**     | **\_** |
| **DBA**               | MySQL migrations, backup/restore, replication lag | **\_** | **\_**     | **\_** |
| **Ops / SRE**         | Docker, Redis, MinIO, networking, monitoring      | **\_** | **\_**     | **\_** |
| **QA Lead**           | Smoke tests, E2E Playwright, manual spot checks   | **\_** | **\_**     | **\_** |
| **Product Owner**     | Business acceptance, user communication           | **\_** | **\_**     | **\_** |

**Rules:**

- [ ] Every role has a named primary **and** a named backup
- [ ] All contacts verified (responded to ping) within 24 h of release
- [ ] War room (physical or virtual) confirmed and shared: link/room: **\_**
- [ ] Agreed release window: **\_** to **\_** (prefer low-traffic hours, e.g. 22:00–02:00 CST)

### 1.2 Extended Support (On-Call, First 24 h Post-Release)

| Area                           | Contact | Escalation             |
| ------------------------------ | ------- | ---------------------- |
| Cloud provider (ACR, OSS, VPC) | **\_**  | Provider ticket portal |
| WeChat Mini Program review     | **\_**  | MP admin console       |
| SMS / Push vendor              | **\_**  | Vendor dashboard       |
| AI API (DashScope)             | **\_**  | Alibaba Cloud ticket   |

---

## 2. Communication Channels

### 2.1 Incident Channels (Create Before Release)

| Channel                 | Purpose                         | Members              |
| ----------------------- | ------------------------------- | -------------------- |
| `#crm-release-war-room` | Live coordination during deploy | War room roster only |
| `#crm-release-status`   | Read-only status broadcasts     | All stakeholders     |
| `#crm-incidents`        | Post-release incident triage    | Eng + SRE + QA       |

- [ ] All channels created and membership verified
- [ ] Status channel topic set to: "Release vX.Y.Z — Status: PREPARING"
- [ ] Channel notification settings: **all messages** for war room, **mentions only** for status

### 2.2 Status Update Cadence

| Phase                      | Frequency                | Who Posts         | Where                   |
| -------------------------- | ------------------------ | ----------------- | ----------------------- |
| Pre-deploy (T-2h to T-0)   | Every 30 min             | Release Commander | `#crm-release-status`   |
| Deploy in progress         | Every 5 min              | Ops/SRE           | `#crm-release-war-room` |
| Post-deploy (T+0 to T+1h)  | Every 15 min             | QA Lead           | `#crm-release-status`   |
| Monitoring (T+1h to T+24h) | Every 2 h or on incident | On-call           | `#crm-release-status`   |

### 2.3 Escalation Path

```
L0  Monitoring alert fires
    → On-call SRE acknowledges (5 min SLA)

L1  SRE cannot resolve in 15 min
    → Page Backend Lead or Frontend Lead (component owner)

L2  Service degraded > 30 min OR data integrity risk
    → Page Release Commander + DBA
    → Release Commander decides: fix-forward OR rollback

L3  Full outage > 30 min OR rollback fails
    → Page CTO / VP Engineering
    → External vendor escalation if dependency-related
```

### 2.4 User-Facing Communication

| Trigger                    | Action                                                         | Owner             |
| -------------------------- | -------------------------------------------------------------- | ----------------- |
| Planned maintenance window | Announcement banner 48h + 2h before                            | Product Owner     |
| Deploy started             | In-app banner: "System upgrading, brief interruption possible" | Frontend Lead     |
| Deploy complete, healthy   | Remove banner, post in company channel                         | Product Owner     |
| Rollback triggered         | "Maintenance extended, ETA: \_\_\_"                            | Product Owner     |
| Incident resolved          | Post-mortem link shared within 48h                             | Release Commander |

---

## 3. Runbooks

### 3.1 Pre-Deploy Runbook (T-2h)

```
STEP  ACTION                                         OWNER            DONE
─────────────────────────────────────────────────────────────────────────────
 1    Confirm Go/No-Go gate PASS                      Release Cmd       [ ]
        bash scripts/go-no-go.sh --env production
        OR: gh workflow run go-no-go.yml

 2    Database backup                                 DBA               [ ]
        bash scripts/db-backup.sh
        Verify: ls -lh /data/backups/mysql/

 3    Redis snapshot                                  Ops/SRE           [ ]
        redis-cli BGSAVE
        Verify: redis-cli LASTSAVE

 4    Record current running versions                 Ops/SRE           [ ]
        docker compose ps > /tmp/pre-deploy-state.txt
        docker images --format "{{.Repository}}:{{.Tag}}" | grep crm

 5    Verify rollback image available                 Ops/SRE           [ ]
        docker pull <registry>/crm-server:<previous-tag>
        docker pull <registry>/crm-web:<previous-tag>

 6    Confirm all war room members online             Release Cmd       [ ]

 7    Set status channel topic: "DEPLOYING"           Release Cmd       [ ]

 8    Enable maintenance banner (if applicable)       Frontend Lead     [ ]
```

### 3.2 Deploy Runbook

```
STEP  ACTION                                         OWNER            DONE
─────────────────────────────────────────────────────────────────────────────
 1    Tag release                                     Backend Lead      [ ]
        git tag v<X.Y.Z> && git push --tags

 2    Run database migration                          DBA               [ ]
        DB_USERNAME=crm_migrator DB_PASSWORD=<pwd> pnpm migration:run
        Verify: SELECT * FROM migrations ORDER BY timestamp DESC LIMIT 5;

 3    Deploy server container                         Ops/SRE           [ ]
        export IMAGE_TAG=v<X.Y.Z>
        docker compose pull server
        docker compose up -d server
        Watch: docker compose logs -f server --tail=50

 4    Verify server health (wait up to 120s)          Ops/SRE           [ ]
        for i in $(seq 1 24); do
          curl -sf http://localhost:3000/api/v1/health && break
          sleep 5
        done

 5    Deploy web container                            Ops/SRE           [ ]
        docker compose pull web
        docker compose up -d web

 6    Verify web health                               Ops/SRE           [ ]
        curl -sf http://localhost/ > /dev/null && echo "Web OK"

 7    Deploy miniapp (if changed)                     Frontend Lead     [ ]
        Upload via WeChat DevTools / uni-app CLI
        Submit for review

 8    Post to status channel: "Deploy complete,       Release Cmd       [ ]
       starting smoke tests"
```

### 3.3 Post-Deploy Smoke Test Runbook

```
STEP  TEST                                           OWNER            PASS
─────────────────────────────────────────────────────────────────────────────
 1    Health endpoints                                QA Lead           [ ]
        curl /api/v1/health        → { status: 'ok', db: 'ok', redis: 'ok' }
        curl /api/v1/health/ready  → 200

 2    Login flow                                      QA Lead           [ ]
        POST /api/v1/auth/login    → 200 + tokens
        GET  /api/v1/auth/profile  → 200 + user info

 3    Core CRUD (customer)                            QA Lead           [ ]
        POST   /api/v1/customer    → 201 (create)
        GET    /api/v1/customer    → 200 (list with pagination)
        PUT    /api/v1/customer/:id → 200 (update)
        DELETE /api/v1/customer/:id → 200 (soft delete)

 4    WebSocket notifications                         QA Lead           [ ]
        Connect WS, verify heartbeat

 5    File upload (MinIO)                             QA Lead           [ ]
        Upload test file → verify OSS URL accessible

 6    CSV export                                      QA Lead           [ ]
        GET /api/v1/customer/export → 200 + file download

 7    AI features (if DashScope configured)           QA Lead           [ ]
        POST /api/v1/ai/chat       → 200 + response

 8    Rate limiting                                   QA Lead           [ ]
        Burst 6x POST /auth/login  → 429 on 6th

 9    PC web UI walkthrough                           QA Lead           [ ]
        Login → Dashboard → Customer list → Detail → Logout

10    Mini program (if updated)                       QA Lead           [ ]
        Open → Login → Home tab → Customer tab

--- ALL PASS → set status: "RELEASE COMPLETE — MONITORING"
--- ANY FAIL → escalate to Release Commander
```

### 3.4 Rollback Runbook

**Trigger criteria** (any one of these):

- Health check fails after 3 min post-deploy
- Error rate > 5% in first 15 min (from logs/monitoring)
- Data corruption detected
- Release Commander calls rollback

```
STEP  ACTION                                         OWNER            DONE
─────────────────────────────────────────────────────────────────────────────
 1    Announce: "Initiating rollback"                 Release Cmd       [ ]
        Post in #crm-release-war-room AND #crm-release-status

 2    Stop current server                             Ops/SRE           [ ]
        docker compose stop server

 3    Revert to previous image                        Ops/SRE           [ ]
        export IMAGE_TAG=<previous-tag>
        docker compose up -d server

 4    Verify health                                   Ops/SRE           [ ]
        curl /api/v1/health (retry up to 120s)

 5    Rollback migration (ONLY if migration was       DBA               [ ]
      applied AND is reversible)
        DB_USERNAME=crm_migrator DB_PASSWORD=<pwd> \
          pnpm migration:revert
        ⚠ If migration is NOT reversible:
          mysql -u root -p crm_sales < /data/backups/mysql/<backup>.sql

 6    Rollback web container                          Ops/SRE           [ ]
        export IMAGE_TAG=<previous-tag>
        docker compose up -d web

 7    Run smoke tests on rolled-back version          QA Lead           [ ]
        (Runbook 3.3, steps 1-6 minimum)

 8    Update status: "Rolled back to v<prev>.         Release Cmd       [ ]
       Service restored. Post-mortem to follow."

 9    Miniapp: revert to previous version in          Frontend Lead     [ ]
      WeChat admin (if miniapp was updated)
```

---

## 4. Fallback Plans

### 4.1 Infrastructure Fallback Matrix

| Component           | Failure Scenario        | Detection                                | Fallback Action                                                    | RTO              |
| ------------------- | ----------------------- | ---------------------------------------- | ------------------------------------------------------------------ | ---------------- |
| **MySQL**           | Primary down            | Health check fails, server logs          | Restore from backup; if replication: promote replica               | 30 min           |
| **MySQL**           | Migration breaks schema | Server startup errors                    | `pnpm migration:revert` or restore backup                          | 15 min           |
| **Redis**           | Standalone down         | Health check, `safeGet` warnings in logs | Services degrade gracefully (cache miss → DB); restart Redis       | 5 min            |
| **Redis Sentinel**  | Master failover         | Sentinel auto-promotes replica           | Automatic (no action needed)                                       | < 30s            |
| **Redis**           | Complete cluster loss   | All `safeGet` returning null             | Auth continues (fail-open on blacklist); cache cold-starts from DB | 5 min            |
| **MinIO/OSS**       | Storage unreachable     | Upload/download 500s                     | Switch `OSS_ENDPOINT` to backup region or cloud OSS                | 15 min           |
| **Server (NestJS)** | OOM / crash loop        | Docker healthcheck, restart count        | `docker compose restart server`; if persists: rollback image       | 2 min            |
| **Web (Nginx)**     | Container crash         | Health check 503                         | `docker compose restart web`; if persists: serve from CDN cache    | 1 min            |
| **DashScope AI**    | API timeout / quota     | 500/429 from AI endpoints                | AI features show "temporarily unavailable"; core CRM unaffected    | 0 (graceful)     |
| **WeChat API**      | Auth/payment failure    | Login errors in miniapp                  | Display retry prompt; escalate to WeChat support                   | Vendor-dependent |
| **Bull Queue**      | Worker stuck            | Queue dashboard shows stalled jobs       | `bull.clean('failed')`, restart server                             | 5 min            |
| **DNS / CDN**       | Domain unreachable      | External uptime monitor                  | Switch DNS to backup IP; flush CDN cache                           | 10 min           |

### 4.2 Data Recovery Procedures

| Scenario                | Procedure                                                      | Owner   |
| ----------------------- | -------------------------------------------------------------- | ------- |
| Accidental bulk delete  | Soft-delete: query `deletedAt IS NOT NULL`, restore via UPDATE | DBA     |
| Migration corrupts data | Restore from pre-deploy backup (Section 3.1 Step 2)            | DBA     |
| Redis data loss         | No action needed — cache rebuilds on demand from MySQL         | Ops/SRE |
| OSS file loss           | Restore from OSS versioning or backup bucket                   | Ops/SRE |

### 4.3 Feature Flags / Kill Switches

If critical features cause issues post-release, disable them without a full rollback:

| Feature                      | Kill Switch                                | Effect                                          |
| ---------------------------- | ------------------------------------------ | ----------------------------------------------- |
| AI analysis                  | Set `DASHSCOPE_API_KEY=` (empty)           | AI endpoints return 503; rest of CRM works      |
| WebSocket notifications      | Stop notification module                   | Users fall back to polling/manual refresh       |
| CSV export                   | Add rate limit `0/min` on export endpoints | Blocks exports without affecting other features |
| Prospect (internet sourcing) | Disable data source in admin UI            | Stops external API calls                        |
| Cloud call recording         | Set recording webhook to no-op             | Calls work, recordings not saved                |

---

## 5. Monitoring & Alerting (Release Day)

### 5.1 Key Metrics to Watch

| Metric                  | Normal Range | Alert Threshold          | Dashboard                |
| ----------------------- | ------------ | ------------------------ | ------------------------ |
| API error rate (5xx)    | < 0.1%       | > 1% for 2 min           | Grafana / CloudWatch     |
| API p95 latency         | < 500ms      | > 2s for 5 min           | Grafana / CloudWatch     |
| Health check            | 200 OK       | Any non-200              | Docker healthcheck       |
| MySQL connections       | < 15 active  | > 18 (of 20 limit)       | `SHOW PROCESSLIST`       |
| MySQL replication lag   | 0s           | > 10s                    | `SHOW SLAVE STATUS`      |
| Redis memory            | < 200MB      | > 230MB (of 256MB limit) | `redis-cli INFO memory`  |
| Redis connected clients | < 50         | > 100                    | `redis-cli INFO clients` |
| Bull queue: failed jobs | 0            | > 5 in 10 min            | Bull dashboard           |
| Container restarts      | 0            | > 2 in 10 min            | `docker events`          |
| Disk usage              | < 80%        | > 90%                    | `df -h`                  |

### 5.2 Quick Diagnostic Commands

```bash
# Overall system status
docker compose ps
docker stats --no-stream

# Server error count (last 100 lines)
docker compose logs --tail=100 server 2>&1 | grep -c -iE "error|exception|fatal"

# MySQL connections
docker exec crm-mysql mysql -u root -p"$DB_ROOT_PASSWORD" -e "SHOW PROCESSLIST;"

# Redis status
docker exec crm-redis redis-cli INFO server | grep uptime
docker exec crm-redis redis-cli INFO memory | grep used_memory_human
docker exec crm-redis redis-cli INFO keyspace

# Bull queue status
docker exec crm-server node -e "
  const Queue = require('bull');
  const q = new Queue('call-summary', { redis: { host: 'redis' } });
  q.getJobCounts().then(c => { console.log(c); process.exit(0); });
"

# Disk usage
docker system df
df -h /data
```

---

## 6. Post-Release Governance

### 6.1 Immediate (T+0 to T+4h)

- [ ] War room remains staffed until Release Commander calls "all clear"
- [ ] Monitor all alert channels continuously
- [ ] No non-critical changes to production
- [ ] Log any anomalies in `#crm-incidents` even if self-resolving

### 6.2 First 24 Hours

- [ ] On-call rotation active with 5-min response SLA
- [ ] Daily standup at T+24h to review release health
- [ ] Collect user feedback from support channels
- [ ] Track and triage any new error patterns in logs

### 6.3 Post-Mortem (Within 48h if Incident Occurred)

| Section         | Content                                              |
| --------------- | ---------------------------------------------------- |
| Timeline        | Minute-by-minute events from detection to resolution |
| Impact          | Users affected, duration, data impact                |
| Root cause      | Technical root cause + contributing factors          |
| What went well  | Things that helped during response                   |
| What went wrong | Gaps in process, tooling, or communication           |
| Action items    | Concrete follow-ups with owners and deadlines        |

Template:

```
## Post-Mortem: [Incident Title]
**Date:** YYYY-MM-DD  |  **Severity:** P1/P2/P3  |  **Duration:** Xh Ym

### Timeline
- HH:MM — [Event]

### Impact
[Users affected, data impact, revenue impact]

### Root Cause
[Technical explanation]

### Action Items
- [ ] [Action] — Owner — Due: YYYY-MM-DD
```

---

## 7. Go / No-Go Decision Checklist (Release Day)

This is the **final human sign-off** before initiating deploy. All items must be checked.

### Technical Readiness

- [ ] `scripts/go-no-go.sh --env production` exits 0 (GO)
- [ ] CI pipeline green on release commit
- [ ] Database backup completed and verified (test restore)
- [ ] Redis snapshot taken
- [ ] Previous version images pulled and available for rollback

### Operational Readiness

- [ ] War room roster filled — all roles have primary + backup
- [ ] All war room members confirmed online and responsive
- [ ] Incident channels created and tested
- [ ] Escalation path reviewed and agreed
- [ ] Rollback runbook printed / pinned in war room channel

### Business Readiness

- [ ] User-facing maintenance announcement sent (48h and 2h prior)
- [ ] Support team briefed on new features and known issues
- [ ] Customer-facing release notes prepared
- [ ] No conflicting business events (end-of-quarter, major campaign)

### External Dependencies

- [ ] Cloud provider status page: no ongoing incidents
- [ ] WeChat platform status: normal
- [ ] AI API (DashScope) quota sufficient for expected load
- [ ] SMS/Push vendor: operational

**Go / No-Go Decision:** [ ] GO / [ ] NO-GO

**Decided by:** ******\_\_\_****** **Time:** ******\_\_\_******

**If NO-GO, reason and next target window:** ****************\_\_\_****************
