# Governance Charter Addendum: Automation Boundaries, Controls & Auditability

**Document ID**: GOV-AUTO-001
**Version**: 1.0
**Effective Date**: 2026-03-24
**Owner**: Engineering & Security
**Review Cycle**: Quarterly (next review: 2026-06-24)
**Applies to**: CRM Sales Platform (`crm-sales-platform` monorepo)

---

## 1. Purpose & Scope

This addendum defines the boundaries, controls, and auditability requirements for all automated processes within the CRM Sales Platform. It covers:

- CI/CD pipelines and deployment automation
- AI-assisted code generation and review
- Scheduled jobs and background workers (Bull queues, cron)
- Automated data processing (AI call analysis, embedding, scoring)
- Bot/script access to production APIs

It does **not** cover manual human operations, which are governed by the main Governance Charter and the [Go-Live Checklist](./go-live-checklist.md).

---

## 2. Definitions

| Term                | Definition                                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| **Automated Agent** | Any non-human actor executing actions: CI runner, cron job, Bull worker, AI model, bot script      |
| **Blast Radius**    | The scope of systems, data, or users affected if an automated action fails or behaves unexpectedly |
| **Human Gate**      | A mandatory manual approval step before an automated process may proceed                           |
| **Fail-Open**       | Behavior where a control failure permits the action (used only for non-critical caches)            |
| **Fail-Closed**     | Behavior where a control failure blocks the action (default for security controls)                 |

---

## 3. Automation Boundary Classification

All automated processes are classified into three tiers based on blast radius and reversibility.

### 3.1 Tier 1 — Low Risk (Self-Governing)

Automated processes that are local, reversible, and affect no shared state.

| Process                   | Examples                                | Controls Required                          |
| ------------------------- | --------------------------------------- | ------------------------------------------ |
| Code linting & formatting | ESLint, Prettier                        | Runs on every commit; failures block merge |
| Unit & integration tests  | Jest (156 backend, 71 frontend tests)   | Must pass before merge; no manual gate     |
| Type checking             | `tsc --noEmit`, `vue-tsc`               | Blocking in CI; no manual gate             |
| Local development builds  | `pnpm dev:server`, `pnpm dev:web`       | None (developer workstation only)          |
| Cache invalidation        | Redis TTL expiry, `safeGet()` fail-open | Logged; no approval needed                 |

**Governance**: Fully automated. No human gate required. Failures are self-reporting via CI status checks.

### 3.2 Tier 2 — Medium Risk (Gated)

Automated processes that affect shared environments or produce artifacts consumed by others.

| Process              | Examples                              | Controls Required                                              |
| -------------------- | ------------------------------------- | -------------------------------------------------------------- |
| Docker image builds  | `docker-validate` CI job              | Non-root verification, size limits (<500MB server, <100MB web) |
| E2E test execution   | Playwright (46 tests)                 | Runs against isolated Vite dev server; no production data      |
| Database migrations  | TypeORM migrations via `crm_migrator` | Separate DDL account; reviewed in PR; executed by CI           |
| Dependency updates   | `pnpm audit`, license checks          | High-severity vulnerabilities block merge                      |
| Security scanning    | Snyk, license-checker                 | Blocking for production deployments                            |
| Bull queue workers   | `call-summary`, `embedding`           | Rate-limited; dead-letter queue for failures                   |
| AI model invocations | Call analysis, RAG embedding          | Token budget limits; timeout (30s); fallback paths             |

**Governance**: Automated with CI gates. Failures block the pipeline. Changes to Tier 2 process definitions require PR review by at least one engineer.

### 3.3 Tier 3 — High Risk (Human-Gated)

Automated processes that affect production systems, user data, or external integrations.

| Process                        | Examples                                        | Controls Required                                                      |
| ------------------------------ | ----------------------------------------------- | ---------------------------------------------------------------------- |
| Production deployment          | CD pipeline (`cd.yml`)                          | Manual approval at staging and production gates                        |
| Schema migrations (production) | `migration:run` against production DB           | DBA review + manual trigger; rollback script required                  |
| Data deletion / purge          | Soft-delete cascade, audit log archival         | Admin-only; logged; no automated bulk hard-delete permitted            |
| External API calls (write)     | Push notifications, SMS, cloud call initiation  | Rate-limited; audit-logged; per-action authorization                   |
| User account operations        | Bulk import, role changes, account deactivation | Admin-only; audit-logged; confirmation dialog required                 |
| Secret rotation                | JWT secrets, encryption keys, DB passwords      | Manual process; documented in runbook; zero-downtime rotation required |
| Go/No-Go decision override     | Overriding a NO-GO gate result                  | Requires written justification from Tech Lead + Security sign-off      |

**Governance**: Requires explicit human approval before execution. All actions are audit-logged with operator identity.

---

## 4. Automation Controls

### 4.1 Identity & Authentication

| Control                                                        | Implementation                                        | Status  |
| -------------------------------------------------------------- | ----------------------------------------------------- | ------- |
| CI runners authenticate via short-lived tokens                 | GitHub Actions OIDC / repository secrets              | Active  |
| No shared service accounts for production access               | Individual credentials for manual operations          | Active  |
| Bot/script API access uses dedicated JWT with restricted scope | `ServiceAccountGuard` (proposed)                      | Planned |
| AI model API keys stored in vault, never in code               | Environment variables; `.env` in `.gitignore`         | Active  |
| Database accounts separated by privilege                       | `root` (init), `crm_migrator` (DDL), `crm_user` (DML) | Active  |

### 4.2 Rate Limiting & Resource Bounds

| Boundary               | Limit                               | Enforcement                                       |
| ---------------------- | ----------------------------------- | ------------------------------------------------- |
| API global rate limit  | 200 req/min per user                | `CustomThrottlerGuard` (keyed on `user.id` or IP) |
| Login attempts         | 5/min                               | `@Throttle` decorator                             |
| Export operations      | 3/min                               | `@Throttle` decorator                             |
| SMS/verification codes | 1/min                               | `@Throttle` decorator                             |
| Bull queue concurrency | Configurable per queue (default: 5) | Bull processor options                            |
| AI model timeout       | 30s per request                     | `TimeoutInterceptor`                              |
| Docker image size      | Server <500MB, Web <100MB           | Go/No-Go performance gate                         |
| JS bundle size         | <2MB                                | Go/No-Go performance gate                         |

### 4.3 Fail-Safe Defaults

| System                 | Failure Mode                         | Rationale                                             |
| ---------------------- | ------------------------------------ | ----------------------------------------------------- |
| JWT validation         | Fail-closed (deny access)            | Security-critical                                     |
| Role/permission checks | Fail-closed (deny access)            | Security-critical                                     |
| Rate limiting          | Fail-closed (block request)          | Prevents abuse                                        |
| Redis cache reads      | Fail-open (`safeGet()` returns null) | Availability over consistency for caches              |
| Token blacklist check  | Fail-open (allow if Redis down)      | Prevents lockout during Redis outage; documented risk |
| Audit log writes       | Fail-open (non-blocking)             | Audit failure must not break business operations      |
| AI model calls         | Fail-open (skip enrichment)          | Degraded experience preferable to hard failure        |
| CI pipeline            | Fail-closed (block merge/deploy)     | Quality gate integrity                                |

### 4.4 Change Control for Automation Definitions

Changes to the following files require **two reviewer approvals** and must not be self-merged:

| File / Path                                 | Governs                               |
| ------------------------------------------- | ------------------------------------- |
| `.github/workflows/*.yml`                   | CI/CD pipeline behavior               |
| `docker-compose*.yml`                       | Infrastructure topology               |
| `packages/server/src/common/guards/*`       | Authentication & authorization        |
| `packages/server/src/common/interceptors/*` | Audit logging, timeouts, data masking |
| `packages/server/src/common/middleware/*`   | SQL injection, CSRF, sanitization     |
| `packages/server/database/migrations/*`     | Schema changes                        |
| `scripts/go-no-go.sh`                       | Release gate logic                    |
| `Dockerfile*`                               | Container security posture            |

---

## 5. Auditability Requirements

### 5.1 What Must Be Audited

| Category                   | Events                                                           | Retention                                           |
| -------------------------- | ---------------------------------------------------------------- | --------------------------------------------------- |
| **Data mutations**         | All CREATE, UPDATE, DELETE via API                               | 2 years (hot: 90 days, warm: 1 year, cold: archive) |
| **Authentication**         | Login success/failure, token refresh, logout, session revocation | 1 year                                              |
| **Authorization failures** | Forbidden access attempts (403)                                  | 1 year                                              |
| **Deployment**             | Pipeline runs, gate decisions, manual approvals                  | 1 year (GitHub Actions logs)                        |
| **Schema changes**         | Migration execution (who, when, what)                            | Permanent (git history + migration table)           |
| **Configuration changes**  | Environment variable updates, secret rotation                    | 1 year (ops log)                                    |
| **AI model invocations**   | Input/output summaries (PII-masked), token usage, latency        | 90 days                                             |
| **Bulk operations**        | Import, export, batch delete                                     | 2 years                                             |
| **External API calls**     | Cloud call initiation, push notifications, SMS                   | 1 year                                              |

### 5.2 Audit Record Schema

Every audit record must contain, at minimum:

```
timestamp    — ISO 8601, UTC
actor        — userId + username (or "system:<process-name>" for automated agents)
action       — CREATE | UPDATE | DELETE | LOGIN | EXPORT | IMPORT | DEPLOY | ...
resource     — entity type (e.g., "customer", "opportunity", "pipeline")
resourceId   — primary key of affected record (if applicable)
ip           — source IP address
before       — prior state (PII-masked, JSON)
after        — new state (PII-masked, JSON)
outcome      — success | failure | partial
metadata     — additional context (e.g., migration name, pipeline run ID)
```

### 5.3 Sensitive Field Masking

The following 24 field patterns are automatically masked to `***MASKED***` before audit persistence:

```
password, token, accessToken, refreshToken, secret, privateKey,
phone, mobile, idCard, idNumber, bankCard, bankAccount,
creditCard, cvv, ssn, email, address, dateOfBirth,
encryptionKey, apiKey, apiSecret, clientSecret, webhook, signature
```

Masking is applied by `AuditLogService` before database write. Raw values are never persisted.

### 5.4 Audit Integrity

| Requirement                              | Implementation                                                                          |
| ---------------------------------------- | --------------------------------------------------------------------------------------- |
| Audit records are append-only            | No UPDATE or DELETE on `audit_logs` table; `crm_user` has no DELETE grant on this table |
| Audit writes are non-blocking            | `AuditLogInterceptor` uses fire-and-forget pattern                                      |
| Audit failures are logged                | Winston warning on write failure; does not interrupt business transaction               |
| Audit records include before/after state | Captured by interceptor via entity snapshot                                             |
| Audit access is admin-only               | `GET /api/v1/audit-logs` restricted to `UserRole.ADMIN`                                 |
| Audit log viewer shows masked data only  | Frontend renders pre-masked `before`/`after` JSON                                       |

### 5.5 Audit Log Tiered Storage

| Tier     | Age         | Storage                          | Query Performance                    |
| -------- | ----------- | -------------------------------- | ------------------------------------ |
| **Hot**  | 0–90 days   | Primary MySQL table              | Full-speed indexed queries           |
| **Warm** | 91–365 days | Partitioned or archived table    | Slightly slower; available on demand |
| **Cold** | 366+ days   | Object storage (S3/MinIO export) | Restored on request within 24h       |

Transitions between tiers are automated via scheduled jobs. The `archiveStatus` column tracks current tier.

---

## 6. AI-Specific Automation Controls

### 6.1 AI Agent Boundaries

| Boundary                                               | Rule                                                                    |
| ------------------------------------------------------ | ----------------------------------------------------------------------- |
| AI agents do not make production data changes directly | AI outputs are suggestions; human or validated pipeline applies changes |
| AI-generated code requires human review                | PRs from AI agents follow standard review process                       |
| AI model outputs are logged                            | Input prompts (masked) and output summaries retained for 90 days        |
| AI model selection is explicit                         | Model routing is configured, not auto-escalated; cost budgets enforced  |
| AI cannot access secrets                               | Model invocations receive only the data needed for the task             |

### 6.2 AI-Assisted Development (Claude Code / Codex)

| Control                                           | Requirement                                                       |
| ------------------------------------------------- | ----------------------------------------------------------------- |
| Code changes are committed to feature branches    | Never direct-push to `main` or `develop`                          |
| All CI gates must pass before merge               | No bypass of lint, test, security, or type-check gates            |
| AI-generated migrations require DBA review        | Schema changes have higher scrutiny regardless of author          |
| Batch automation scripts (`claude-dev.ps1`, etc.) | Must be run by authorized operators; output logs retained         |
| AI agent task files                               | Stored in repo (`ai-phase*-tasks.txt`); auditable via git history |

---

## 7. Incident Response for Automation Failures

### 7.1 Severity Classification

| Severity          | Definition                                                         | Examples                                                        | Response Time             |
| ----------------- | ------------------------------------------------------------------ | --------------------------------------------------------------- | ------------------------- |
| **P1 — Critical** | Automation causes data loss, security breach, or production outage | Runaway migration, leaked secrets, infinite loop in Bull worker | Immediate (within 15 min) |
| **P2 — High**     | Automation produces incorrect results affecting users              | Wrong AI scoring, failed deployment stuck in partial state      | Within 1 hour             |
| **P3 — Medium**   | Automation degraded but not impacting users                        | CI flaky tests, cache miss spike, audit write failures          | Within 4 hours            |
| **P4 — Low**      | Cosmetic or non-impacting automation issue                         | Log format inconsistency, non-critical job delay                | Next business day         |

### 7.2 Automated Circuit Breakers

| Trigger                                   | Action                                      |
| ----------------------------------------- | ------------------------------------------- |
| Bull queue failure rate >50% in 5 minutes | Pause queue; alert on-call                  |
| AI model error rate >20% in 10 minutes    | Fallback to non-AI path; alert              |
| Migration failure                         | Halt pipeline; do not proceed to deployment |
| Health check failure post-deploy          | Automatic rollback (CD pipeline)            |
| Rate limit exhaustion (sustained)         | Log + alert; do not auto-increase limits    |

### 7.3 Post-Incident Review

Every P1/P2 incident involving automation must produce a post-incident review within 5 business days that addresses:

1. What automated process failed and why
2. What controls existed and whether they functioned as designed
3. What the blast radius was (systems, users, data affected)
4. What corrective actions will prevent recurrence
5. Whether this addendum needs updating

---

## 8. Compliance Mapping

| Requirement               | This Platform's Control                                                      | Section Reference |
| ------------------------- | ---------------------------------------------------------------------------- | ----------------- |
| **Separation of Duties**  | 3-tier DB accounts; CI gates cannot be bypassed by code author alone         | §4.1, §4.4        |
| **Least Privilege**       | Role-based access (Admin/Manager/Sales); service accounts scoped             | §3.3, §4.1        |
| **Audit Trail**           | Immutable append-only audit logs with PII masking                            | §5.1–§5.4         |
| **Change Management**     | Two-reviewer approval for automation definitions; human gates for production | §4.4, §3.3        |
| **Data Minimization**     | Sensitive field masking; AI receives only necessary data                     | §5.3, §6.1        |
| **Availability**          | Fail-open for caches; fail-closed for security; circuit breakers             | §4.3, §7.2        |
| **Encryption at Rest**    | AES-256-GCM for sensitive fields; DB encryption (configurable)               | §4.1              |
| **Encryption in Transit** | HTTPS enforced (HSTS header); TLS for Redis Sentinel                         | Nginx config      |
| **Retention**             | Tiered audit storage (hot/warm/cold) with defined schedules                  | §5.5              |
| **Access Review**         | Admin-only audit viewer; role changes audit-logged                           | §5.4, §5.1        |

---

## 9. Review & Amendment Process

| Action                | Trigger                                                                  | Approvers                                                                     |
| --------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Quarterly review      | Calendar (every 3 months)                                                | Tech Lead + Security Lead                                                     |
| Ad-hoc amendment      | P1/P2 incident; new automation type introduced; compliance audit finding | Tech Lead + Security Lead + affected module owner                             |
| Tier reclassification | Change in blast radius or reversibility of a process                     | Engineering Lead                                                              |
| Exception request     | Temporary deviation from this addendum                                   | Tech Lead + Security Lead (written justification required; max 30-day expiry) |

All amendments are tracked via git history of this document. The `Effective Date` and `Version` fields at the top must be updated with each change.

---

## Appendix A: Automation Inventory

Current automated processes and their tier classification:

| Process                  | Tier | Owner          | Schedule                 | Monitoring                                |
| ------------------------ | ---- | -------------- | ------------------------ | ----------------------------------------- |
| CI lint + typecheck      | 1    | Engineering    | Every push/PR            | GitHub Actions status                     |
| CI test-server           | 1    | Engineering    | Every push/PR            | GitHub Actions status                     |
| CI build-web             | 1    | Engineering    | Every push/PR            | GitHub Actions status                     |
| CI test-e2e              | 2    | Engineering    | Every push/PR            | GitHub Actions + Playwright report        |
| CI docker-validate       | 2    | Engineering    | Every push/PR            | GitHub Actions status                     |
| CI security scan         | 2    | Security       | Every push/PR            | GitHub Actions + Snyk dashboard           |
| Go/No-Go gate            | 2    | Engineering    | Pre-release              | GitHub Actions + gate summary             |
| CD test deployment       | 2    | DevOps         | On merge to `main`       | Health check                              |
| CD staging deployment    | 3    | DevOps         | On version tag           | Manual approval + health check            |
| CD production deployment | 3    | DevOps         | Post-staging             | Manual approval + health check + rollback |
| Bull: call-summary       | 2    | Backend        | On-demand (event-driven) | Bull dashboard / logs                     |
| Bull: embedding          | 2    | Backend        | On-demand (event-driven) | Bull dashboard / logs                     |
| Cron: quota reset        | 2    | Backend        | Daily 00:00              | Application logs                          |
| Audit log archival       | 2    | Backend        | Scheduled                | Application logs                          |
| Redis cache TTL          | 1    | Infrastructure | Continuous               | Redis metrics                             |
| AI call analysis         | 2    | AI/Backend     | On-demand                | Token usage + error rate                  |
| Database migration       | 3    | DBA/Backend    | Manual trigger           | Migration table + CI logs                 |

---

## Appendix B: Approval Matrix

| Action                      | Sales | Manager | Admin | Tech Lead | Security Lead | DBA |
| --------------------------- | ----- | ------- | ----- | --------- | ------------- | --- |
| View audit logs             | -     | -       | Yes   | Yes       | Yes           | -   |
| Trigger test deployment     | -     | -       | -     | Yes       | -             | -   |
| Approve staging deploy      | -     | -       | -     | Yes       | Yes           | -   |
| Approve production deploy   | -     | -       | -     | Yes       | Yes           | Yes |
| Run production migration    | -     | -       | -     | -         | -             | Yes |
| Override Go/No-Go gate      | -     | -       | -     | Yes       | Yes           | -   |
| Add new automation (Tier 1) | -     | -       | -     | Yes       | -             | -   |
| Add new automation (Tier 2) | -     | -       | -     | Yes       | Yes           | -   |
| Add new automation (Tier 3) | -     | -       | -     | Yes       | Yes           | Yes |
| Amend this document         | -     | -       | -     | Yes       | Yes           | -   |
| Grant exception             | -     | -       | -     | Yes       | Yes           | -   |

---

_End of addendum._
