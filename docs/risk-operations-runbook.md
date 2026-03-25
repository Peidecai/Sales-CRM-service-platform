# Risk Operations Runbook

> CRM Sales Platform — Detection, Triage, Ownership Handoff & Executive Escalation

**Owner:** Tech Lead
**Review cadence:** Monthly (or after every P1/P2 incident)
**Last updated:** 2026-03-24
**Companion docs:** [risk-review-template.md](./risk-review-template.md) · [release-day-ops-checklist.md](./release-day-ops-checklist.md) · [governance-charter-addendum-automation.md](./governance-charter-addendum-automation.md)

---

## 1. Risk Severity Levels

| Level  | Label    | Description                                                             | Response SLA      | Update Cadence | Examples                                                   |
| ------ | -------- | ----------------------------------------------------------------------- | ----------------- | -------------- | ---------------------------------------------------------- |
| **P1** | Critical | Full outage, data breach, or security exploit in progress               | 15 min            | Every 15 min   | DB down, auth bypass, data leak, ransomware                |
| **P2** | High     | Major feature broken, data integrity at risk, performance degraded >50% | 30 min            | Every 30 min   | Payment tracking failure, Redis cluster down, API p99 >10s |
| **P3** | Medium   | Partial degradation, workaround exists, non-critical data issue         | 2 hours           | Every 2 hours  | AI analysis timeouts, CSV export errors, MinIO slow        |
| **P4** | Low      | Cosmetic, minor UX, non-urgent tech debt                                | Next business day | Daily standup  | UI misalignment, stale cache, non-critical log noise       |

---

## 2. Detection Sources

### 2.1 Automated Detection

| Source                                      | What It Catches                                                       | Alert Channel                            | Owner             |
| ------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------- | ----------------- |
| **Health endpoint** (`/api/v1/health`)      | DB/Redis/MinIO connectivity                                           | Uptime monitor → `#crm-incidents`        | Ops/SRE           |
| **CI/CD pipeline** (GitHub Actions)         | Test failures, lint errors, build breaks, security audit              | PR status checks + `#crm-release-status` | Tech Lead         |
| **Go/No-Go script** (`scripts/go-no-go.sh`) | Pre-deploy quality/security/perf/ops gate failures                    | CLI output + JSON report                 | Release Commander |
| **Rate limiter** (`@nestjs/throttler`)      | Brute-force, abuse patterns (>60 req/min global, >5/min login)        | Server logs (Winston)                    | Backend Lead      |
| **Audit log** (`AuditLogInterceptor`)       | Unexpected admin actions, bulk deletes, privilege escalation attempts | Audit viewer (admin-only)                | Security Champion |
| **TypeORM query logger**                    | Slow queries (>1s), failed transactions                               | Server logs                              | DBA               |
| **Bull queue monitoring**                   | Stuck/failed jobs (call-summary, embedding)                           | Bull dashboard / logs                    | Backend Lead      |
| **Dependency audit** (`pnpm audit`)         | Known CVEs in dependencies                                            | CI security job                          | Tech Lead         |

### 2.2 Manual Detection

| Source                                                            | What It Catches                                  | Escalation Path                          |
| ----------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------- |
| **User reports** (support tickets, WeChat)                        | Functional bugs, UX issues, data discrepancies   | Support → Product Owner → Triage         |
| **Bi-weekly risk review** ([template](./risk-review-template.md)) | Trending security/quality debt, unresolved risks | Review meeting → Action items            |
| **Code review**                                                   | Architecture violations, security anti-patterns  | PR comments → Tech Lead                  |
| **Penetration test**                                              | Exploitable vulnerabilities                      | Security Champion → P1/P2 triage         |
| **Customer escalation**                                           | Business-critical issues not caught internally   | Account Manager → Product Owner → Triage |

### 2.3 Detection Checklist (Daily)

```
□ Health endpoint returns 200 on all environments
□ CI pipeline green on develop branch
□ No P1/P2 alerts in #crm-incidents
□ Bull queue: no stuck jobs > 30 min
□ Audit log: no unexpected admin operations in last 24h
□ Error rate in server logs < 1%
□ Redis memory usage < 80%
□ MySQL connection pool utilization < 70%
```

---

## 3. Triage Process

### 3.1 Triage Flow

```
Detection
  │
  ▼
┌──────────────────────┐
│ 1. Acknowledge        │  ← First responder posts in #crm-incidents within SLA
│    (assign severity)  │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ 2. Classify           │  ← Category + blast radius + data impact
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ 3. Contain            │  ← Kill switch / rollback / block user / rotate secret
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ 4. Assign owner       │  ← See §4 Ownership Handoff
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ 5. Investigate & Fix  │  ← Root cause analysis + patch
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ 6. Verify & Close     │  ← Tests pass, monitoring confirms resolution
└──────────────────────┘
```

### 3.2 Triage Classification

**Category** — assign exactly one:

| Category           | Scope                                    | Examples                                                  |
| ------------------ | ---------------------------------------- | --------------------------------------------------------- |
| **Security**       | Auth, data access, encryption, injection | JWT bypass, SQL injection, RBAC misconfiguration          |
| **Data Integrity** | Incorrect/missing/corrupt data           | Duplicate records, wrong ownership, migration failure     |
| **Availability**   | Service down or severely degraded        | DB crash, Redis OOM, container restart loop               |
| **Performance**    | Response times or throughput degraded    | Slow queries, memory leak, queue backlog                  |
| **Functional**     | Feature not working as designed          | CRUD failure, export broken, AI analysis incorrect        |
| **Compliance**     | Regulatory or policy violation           | PII exposure in logs, missing audit trail, data retention |

**Blast Radius** — estimate scope:

| Scope               | Definition                               |
| ------------------- | ---------------------------------------- |
| **All users**       | Platform-wide outage or degradation      |
| **Role-specific**   | Affects one role (e.g., all Sales users) |
| **Tenant-specific** | Affects specific data subset / customer  |
| **Single user**     | Isolated to one account                  |
| **Internal only**   | CI/CD, dev tooling, no user impact       |

**Data Impact** — classify data risk:

| Level        | Definition                                      | Action                                  |
| ------------ | ----------------------------------------------- | --------------------------------------- |
| **Breach**   | Unauthorized data access confirmed              | P1 — invoke security incident procedure |
| **At risk**  | Vulnerability exists, no confirmed exploitation | P2 — patch within 24h                   |
| **Degraded** | Data may be stale/incomplete but not exposed    | P3 — fix in next sprint                 |
| **None**     | No data impact                                  | No special handling                     |

### 3.3 Triage Decision Matrix

| Blast Radius \ Data Impact | Breach | At Risk | Degraded | None |
| -------------------------- | ------ | ------- | -------- | ---- |
| **All users**              | P1     | P1      | P2       | P2   |
| **Role-specific**          | P1     | P2      | P2       | P3   |
| **Tenant-specific**        | P1     | P2      | P3       | P3   |
| **Single user**            | P2     | P3      | P3       | P4   |
| **Internal only**          | P2     | P3      | P4       | P4   |

---

## 4. Ownership Handoff

### 4.1 RACI Matrix

| Activity                 | Release Commander | Backend Lead | Frontend Lead |  DBA  | Ops/SRE | Security Champion | Product Owner |
| ------------------------ | :---------------: | :----------: | :-----------: | :---: | :-----: | :---------------: | :-----------: |
| Detection & alerting     |         I         |      C       |       C       |   C   |  **R**  |         C         |       I       |
| Initial triage           |       **R**       |      C       |       C       |   C   |    C    |         C         |       I       |
| Security incidents       |         I         |      C       |       —       |   C   |    C    |       **R**       |       I       |
| Database incidents       |         I         |      C       |       —       | **R** |    C    |         —         |       I       |
| Backend bugs             |         I         |    **R**     |       —       |   C   |    —    |         —         |       I       |
| Frontend bugs            |         I         |      —       |     **R**     |   —   |    —    |         —         |       I       |
| Infrastructure issues    |         I         |      —       |       —       |   C   |  **R**  |         —         |       I       |
| Executive escalation     |       **R**       |      I       |       I       |   I   |    I    |         C         |     **A**     |
| Post-mortem facilitation |       **R**       |      C       |       C       |   C   |    C    |         C         |       A       |
| User communication       |         I         |      —       |       —       |   —   |    —    |         —         |     **R**     |

**R** = Responsible, **A** = Accountable, **C** = Consulted, **I** = Informed

### 4.2 Handoff Protocol

**When handing off ownership:**

1. **Notify** — Tag the new owner in `#crm-incidents` with a structured handoff message:

   ```
   🔄 HANDOFF: [RISK-YYYY-NNN]
   From: @current-owner
   To: @new-owner
   Severity: P2
   Status: Contained — kill switch active on AI analysis
   Context: AI service returning 500s since 14:30 UTC, DashScope API key quota exceeded
   Next steps: Rotate API key, verify quota, re-enable kill switch
   Open questions: Is this a permanent quota increase or do we need a second key?
   ```

2. **Acknowledge** — New owner replies with explicit acceptance within:
   - P1: 5 minutes
   - P2: 15 minutes
   - P3: 1 hour
   - P4: Next business day

3. **Transfer context** — Ensure the new owner has:
   - [ ] Access to relevant logs / dashboards
   - [ ] Current investigation findings
   - [ ] List of actions already taken
   - [ ] Any temporary mitigations in place

4. **Update tracker** — Log handoff in the incident thread with timestamp.

### 4.3 Ownership by Component

| Component                 | Primary Owner | Backup            | Kill Switch                            |
| ------------------------- | ------------- | ----------------- | -------------------------------------- |
| Auth / JWT / RBAC         | Backend Lead  | Security Champion | Disable via JWT secret rotation        |
| Database / Migrations     | DBA           | Backend Lead      | Read-only mode via DB user permissions |
| Redis / Cache             | Ops/SRE       | Backend Lead      | `safeGet()` fail-open already active   |
| Bull Queues               | Backend Lead  | Ops/SRE           | Pause queue via Bull dashboard         |
| AI Analysis (DashScope)   | Backend Lead  | Tech Lead         | `FEATURE_AI_ENABLED=false`             |
| WebSocket / Notifications | Backend Lead  | Frontend Lead     | `FEATURE_WEBSOCKET_ENABLED=false`      |
| CSV Export                | Backend Lead  | Frontend Lead     | `FEATURE_EXPORT_ENABLED=false`         |
| Prospect / External APIs  | Backend Lead  | Tech Lead         | `FEATURE_PROSPECT_ENABLED=false`       |
| Cloud Recording (OSS)     | Backend Lead  | Ops/SRE           | `FEATURE_RECORDING_ENABLED=false`      |
| PC Web UI                 | Frontend Lead | Tech Lead         | Rollback to previous Docker image      |
| Miniapp / APP             | Frontend Lead | Tech Lead         | Publish previous version               |
| CI/CD Pipeline            | Tech Lead     | Ops/SRE           | Manual deploy fallback                 |
| Docker / Infrastructure   | Ops/SRE       | Tech Lead         | `scripts/deploy.sh` rollback           |

---

## 5. Containment Playbooks

### 5.1 Security Incident

```bash
# 1. Block active exploit (if applicable)
#    - Rotate compromised secrets
#    - Revoke affected sessions
#    - Block IP/user at WAF/application level

# 2. Preserve evidence
docker logs crm-server --since "2h" > /tmp/incident-$(date +%s).log
# Export audit logs for affected time range via admin UI

# 3. Assess data exposure
# Query audit log for affected resources and users
# Check if PII masking interceptor was active

# 4. Notify Security Champion — they lead from here
```

### 5.2 Database Incident

```bash
# 1. Assess: is it corruption, connectivity, or performance?
docker exec crm-mysql mysqladmin -u root -p status

# 2. If migration failure — rollback
cd packages/server
DB_USERNAME=crm_migrator DB_PASSWORD=<pwd> pnpm migration:revert

# 3. If corruption — restore from backup
bash scripts/db-backup.sh  # Take fresh backup of current state first
# Then restore from last known good backup

# 4. If connectivity — check Docker networking
docker compose ps
docker compose logs mysql --tail 100
```

### 5.3 Performance Degradation

```bash
# 1. Identify bottleneck
# Check API response times in logs
# Check Redis memory: docker exec crm-redis redis-cli INFO memory
# Check MySQL slow query log
# Check Bull queue depth

# 2. Quick mitigations
# - Scale horizontally if containerized
# - Clear Redis cache: FLUSHDB (caution — confirm with team)
# - Kill long-running queries
# - Pause non-critical Bull queues

# 3. If external dependency (DashScope, OSS)
# Activate kill switch for affected feature
```

---

## 6. Executive Escalation

### 6.1 When to Escalate

Escalate to executive leadership when **any** of these conditions are true:

| Trigger         | Threshold                                               | Escalation Target        |
| --------------- | ------------------------------------------------------- | ------------------------ |
| Duration        | P1 unresolved > 1 hour, P2 unresolved > 4 hours         | CTO / VP Engineering     |
| Data breach     | Any confirmed unauthorized data access                  | CTO + Legal + DPO        |
| Customer impact | > 20% of active users affected for > 30 min             | CTO + VP Product         |
| Financial risk  | Revenue-impacting system down (payment tracking, deals) | CTO + CFO                |
| Compliance      | Regulatory reporting obligation triggered               | CTO + Legal + Compliance |
| Reputation      | Public-facing issue or customer executive complaint     | CTO + VP Product + Comms |
| Resource        | On-call team exhausted, need additional headcount       | Engineering Manager      |

### 6.2 Escalation Message Template

```
🚨 EXECUTIVE ESCALATION: [RISK-YYYY-NNN]

Severity: P1 / P2
Duration: X hours Y minutes (since HH:MM UTC)
Status: Active / Contained / Mitigated

IMPACT:
- Users affected: [count / percentage / role]
- Business impact: [revenue / data / compliance]
- Customer communication: [sent / pending / not needed]

ROOT CAUSE (current understanding):
[1-2 sentences — what we know, what we don't]

ACTIONS TAKEN:
1. [Containment action + timestamp]
2. [Investigation action + timestamp]
3. [Communication action + timestamp]

CURRENT BLOCKER:
[What is preventing resolution — needs decision / resource / vendor]

ASK:
[Specific decision or resource needed from executive]

NEXT UPDATE: [timestamp — within 30 min for P1, 1h for P2]

Incident Lead: @name
War Room: #crm-incidents
```

### 6.3 Escalation Path

```
         ┌─────────────────────────┐
         │  On-Call / First Responder │
         └──────────┬──────────────┘
                    │ cannot resolve in SLA
                    ▼
         ┌─────────────────────────┐
         │  Release Commander       │  ← coordinates response
         │  (calls in specialists)  │
         └──────────┬──────────────┘
                    │ P1 > 1h or P2 > 4h or breach/compliance
                    ▼
         ┌─────────────────────────┐
         │  Tech Lead / Eng Manager │  ← resource + priority decisions
         └──────────┬──────────────┘
                    │ customer-facing / financial / legal
                    ▼
         ┌─────────────────────────┐
         │  CTO / VP Engineering    │  ← go/no-go on major actions
         │  + Legal/Compliance      │    (e.g., public disclosure,
         │    (if data breach)      │     regulatory notification)
         └─────────────────────────┘
```

### 6.4 Executive Decision Points

| Decision                              | Who Decides                     | Input Required                               |
| ------------------------------------- | ------------------------------- | -------------------------------------------- |
| Activate full rollback in production  | CTO or Release Commander        | Impact assessment + rollback plan            |
| Public incident disclosure            | CTO + Comms                     | Legal review + customer impact scope         |
| Regulatory notification (data breach) | Legal + DPO                     | Forensic evidence + affected data inventory  |
| Emergency maintenance window          | CTO + Product Owner             | User communication plan + estimated duration |
| Engage external security firm         | CTO + Security Champion         | Scope of compromise + budget approval        |
| Pause all deployments (freeze)        | Tech Lead (P3+), CTO (org-wide) | Root cause confidence level                  |

---

## 7. Incident Lifecycle

### 7.1 Tracking

Each risk/incident gets a unique ID: **RISK-YYYY-NNN** (e.g., RISK-2026-017).

Track in `#crm-incidents` Slack channel with these status labels:

| Status         | Meaning                                     |
| -------------- | ------------------------------------------- |
| 🔴 `ACTIVE`    | Incident in progress, actively being worked |
| 🟡 `CONTAINED` | Bleeding stopped, root cause not yet fixed  |
| 🟢 `RESOLVED`  | Fix deployed and verified                   |
| ⚪ `CLOSED`    | Post-mortem complete, action items tracked  |

### 7.2 Post-Incident Review

**Required for:** All P1 and P2 incidents. Optional for P3.

**Timeline:** Complete within 48 hours of resolution.

**Template** (from [release-day-ops-checklist.md](./release-day-ops-checklist.md)):

```markdown
## Post-Mortem: RISK-YYYY-NNN

**Date:** YYYY-MM-DD
**Severity:** P1/P2
**Duration:** X hours Y minutes
**Incident Lead:** @name

### Timeline

| Time (UTC) | Event                                        |
| ---------- | -------------------------------------------- |
| HH:MM      | Detection — [how it was found]               |
| HH:MM      | Triage — severity assigned, owner identified |
| HH:MM      | Containment — [action taken]                 |
| HH:MM      | Root cause identified                        |
| HH:MM      | Fix deployed                                 |
| HH:MM      | Resolution verified                          |

### Impact

- Users affected: [count]
- Data impact: [none / degraded / at risk / breach]
- Business impact: [revenue / reputation / compliance]

### Root Cause

[Clear technical explanation]

### What Went Well

- [Detection was fast because...]
- [Containment was effective because...]

### What Went Wrong

- [Detection was delayed because...]
- [Handoff was unclear because...]

### Action Items

| #   | Action                | Owner | Priority | Due Date   | Status |
| --- | --------------------- | ----- | -------- | ---------- | ------ |
| 1   | [Preventive action]   | @name | P1       | YYYY-MM-DD | Open   |
| 2   | [Detective action]    | @name | P2       | YYYY-MM-DD | Open   |
| 3   | [Process improvement] | @name | P3       | YYYY-MM-DD | Open   |
```

### 7.3 Metrics

Track these quarterly:

| Metric                          | Target                       | Measurement                          |
| ------------------------------- | ---------------------------- | ------------------------------------ |
| Mean Time to Detect (MTTD)      | < 5 min (P1), < 15 min (P2)  | Detection timestamp − incident start |
| Mean Time to Acknowledge (MTTA) | < 15 min (P1), < 30 min (P2) | Acknowledgment − detection           |
| Mean Time to Contain (MTTC)     | < 30 min (P1), < 2h (P2)     | Containment − detection              |
| Mean Time to Resolve (MTTR)     | < 4h (P1), < 24h (P2)        | Resolution − detection               |
| Escalation accuracy             | > 90% correct severity       | Post-mortem severity vs initial      |
| Post-mortem completion rate     | 100% for P1/P2               | Completed within 48h                 |
| Action item closure rate        | > 80% on time                | Closed by due date                   |

---

## 8. Quick Reference Card

```
┌──────────────────────────────────────────────────────┐
│                RISK RESPONSE QUICK REF                │
├──────────────────────────────────────────────────────┤
│                                                      │
│  1. DETECT    → Check #crm-incidents, health, logs   │
│  2. SEVERITY  → Use §3.3 decision matrix             │
│  3. ACKNOWLEDGE → Post in #crm-incidents within SLA  │
│  4. CONTAIN   → Kill switch (§5) or rollback         │
│  5. OWN       → Use §4.3 component table             │
│  6. FIX       → Root cause + patch + tests           │
│  7. VERIFY    → go-no-go.sh + monitoring             │
│  8. CLOSE     → Post-mortem within 48h (P1/P2)      │
│                                                      │
│  ESCALATE IF: P1>1h, P2>4h, breach, compliance,     │
│               >20% users, revenue impact             │
│                                                      │
│  CHANNELS:                                           │
│    #crm-incidents     — triage & coordination        │
│    #crm-release-war-room — active incident war room  │
│    #crm-release-status — broadcast updates           │
│                                                      │
│  KILL SWITCHES (env vars):                           │
│    FEATURE_AI_ENABLED=false                          │
│    FEATURE_WEBSOCKET_ENABLED=false                   │
│    FEATURE_EXPORT_ENABLED=false                      │
│    FEATURE_PROSPECT_ENABLED=false                    │
│    FEATURE_RECORDING_ENABLED=false                   │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## Appendix A: Incident Communication Templates

### Internal Status Update

```
📋 STATUS UPDATE: [RISK-YYYY-NNN] — [ACTIVE/CONTAINED/RESOLVED]
Time: HH:MM UTC
Severity: PX
Impact: [1 sentence]
Progress: [What changed since last update]
Next step: [What's happening now]
Next update: HH:MM UTC
```

### Customer-Facing (if needed)

```
We are aware of an issue affecting [feature]. Our team is actively
working on a resolution. [Feature] functionality may be limited
during this time.

We will provide an update by [time].

We apologize for the inconvenience.
```

### Resolution Notice

```
✅ RESOLVED: [RISK-YYYY-NNN]
The issue affecting [feature] has been resolved as of HH:MM UTC.
Duration: X hours Y minutes.
Root cause: [1 sentence — no internal details in customer-facing version]
Post-mortem scheduled: YYYY-MM-DD
```
