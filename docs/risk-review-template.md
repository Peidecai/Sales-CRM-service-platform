# Risk Review Template — Quality & Security Debt

> Run bi-weekly (or after each release). Owner: Tech Lead / Security Champion.

---

## Review Metadata

| Field          | Value      |
| -------------- | ---------- |
| Review Date    | YYYY-MM-DD |
| Reviewer(s)    |            |
| Sprint/Release |            |
| Next Review    | YYYY-MM-DD |

---

## 1. Risk Register

Score each item: **Likelihood (1-5)** × **Impact (1-5)** = **Risk Score (1-25)**

| ID    | Category | Risk Description                                 | Likelihood | Impact | Score | Trend | Owner | Mitigation                      | Target Date | Status |
| ----- | -------- | ------------------------------------------------ | ---------- | ------ | ----- | ----- | ----- | ------------------------------- | ----------- | ------ |
| R-001 | Security | Example: JWT secret rotation not automated       | 3          | 5      | 15    | ↑     | @dev  | Add rotation job via Bull queue | 2026-04-15  | Open   |
| R-002 | Quality  | Example: No integration tests for Redis failover | 4          | 4      | 16    | →     | @dev  | Add Sentinel failover E2E test  | 2026-04-01  | Open   |
| R-003 | Security |                                                  |            |        |       |       |       |                                 |             |        |
| R-004 | Quality  |                                                  |            |        |       |       |       |                                 |             |        |

### Scoring Guide

| Value | Likelihood                           | Impact                                                    |
| ----- | ------------------------------------ | --------------------------------------------------------- |
| 1     | Rare — unlikely in next 6 months     | Negligible — cosmetic, no user impact                     |
| 2     | Unlikely — possible but improbable   | Minor — workaround exists, single user affected           |
| 3     | Possible — could happen this quarter | Moderate — feature degraded, multiple users affected      |
| 4     | Likely — expected this sprint        | Major — feature unavailable, data integrity risk          |
| 5     | Almost certain — actively occurring  | Critical — data breach, system down, compliance violation |

### Trend Legend

| Symbol | Meaning                                             |
| ------ | --------------------------------------------------- |
| ↑      | Worsening — score increased or new exposure found   |
| →      | Stable — no change since last review                |
| ↓      | Improving — mitigation in progress, score decreased |

### Risk Thresholds

| Score Range | Severity | Required Action                            |
| ----------- | -------- | ------------------------------------------ |
| 20-25       | Critical | Immediate fix, block release if unresolved |
| 12-19       | High     | Schedule fix within current sprint         |
| 6-11        | Medium   | Plan fix within next 2 sprints             |
| 1-5         | Low      | Track, address opportunistically           |

---

## 2. Category Breakdown

### 2a. Security Debt

| Area             | Check                                        | Status        | Notes |
| ---------------- | -------------------------------------------- | ------------- | ----- |
| Dependencies     | `pnpm audit` — 0 critical/high?              | ☐ Pass ☐ Fail |       |
| Secrets          | No hardcoded secrets in repo?                | ☐ Pass ☐ Fail |       |
| Auth             | JWT rotation, token blacklist working?       | ☐ Pass ☐ Fail |       |
| Input validation | All endpoints use DTOs with class-validator? | ☐ Pass ☐ Fail |       |
| SQL injection    | No raw queries without parameterization?     | ☐ Pass ☐ Fail |       |
| XSS              | CSP headers, output encoding in place?       | ☐ Pass ☐ Fail |       |
| RBAC             | All business endpoints have RolesGuard?      | ☐ Pass ☐ Fail |       |
| Data ownership   | Sales users restricted to own records?       | ☐ Pass ☐ Fail |       |
| Encryption       | AES-256-GCM for sensitive fields (API keys)? | ☐ Pass ☐ Fail |       |
| Rate limiting    | Throttle on auth + public endpoints?         | ☐ Pass ☐ Fail |       |

### 2b. Quality Debt

| Area              | Check                                              | Status        | Notes |
| ----------------- | -------------------------------------------------- | ------------- | ----- |
| Test coverage     | Backend ≥ 80%? Frontend ≥ 60%?                     | ☐ Pass ☐ Fail |       |
| E2E tests         | All critical paths covered?                        | ☐ Pass ☐ Fail |       |
| TypeScript strict | No `any` types, strict mode enabled?               | ☐ Pass ☐ Fail |       |
| Migration hygiene | No `synchronize: true`, all schema via migrations? | ☐ Pass ☐ Fail |       |
| Error handling    | All async functions have try/catch?                | ☐ Pass ☐ Fail |       |
| Dead code         | No unused imports, modules, or routes?             | ☐ Pass ☐ Fail |       |
| Build health      | `pnpm build` clean (0 warnings target)?            | ☐ Pass ☐ Fail |       |
| Lint              | `pnpm lint` passes with 0 errors?                  | ☐ Pass ☐ Fail |       |
| Docker            | Health checks passing, images rebuild clean?       | ☐ Pass ☐ Fail |       |
| Documentation     | CLAUDE.md files current with code?                 | ☐ Pass ☐ Fail |       |

---

## 3. Trend Dashboard

Track aggregate scores across reviews to spot systemic drift.

| Review Date | Critical (20-25) | High (12-19) | Medium (6-11) | Low (1-5) | Total Open | Closed Since Last |
| ----------- | ---------------- | ------------ | ------------- | --------- | ---------- | ----------------- |
| YYYY-MM-DD  | 0                | 0            | 0             | 0         | 0          | —                 |
| YYYY-MM-DD  |                  |              |               |           |            |                   |
| YYYY-MM-DD  |                  |              |               |           |            |                   |

### Trend Indicators

- **Debt velocity**: Items opened vs. closed per review cycle
- **Mean time to mitigate**: Average days from identification to resolution
- **Recurrence rate**: Items that reopen after being marked resolved

---

## 4. Action Items from This Review

| #   | Action | Owner | Priority | Due Date |
| --- | ------ | ----- | -------- | -------- |
| 1   |        |       |          |          |
| 2   |        |       |          |          |
| 3   |        |       |          |          |

---

## 5. Decisions & Exceptions

Document any accepted risks or deferred mitigations with rationale.

| Risk ID | Decision | Rationale | Accepted By | Expiry |
| ------- | -------- | --------- | ----------- | ------ |
|         |          |           |             |        |

---

## 6. Review Sign-off

| Role              | Name | Date | Signature      |
| ----------------- | ---- | ---- | -------------- |
| Tech Lead         |      |      | ☐ Approved     |
| Security Champion |      |      | ☐ Approved     |
| Product Owner     |      |      | ☐ Acknowledged |
