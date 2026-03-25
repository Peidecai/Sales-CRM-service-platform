# Release Scorecard — CRM Sales Platform

> Go/No-Go decision framework for production releases.
> Every release candidate **must** fill this scorecard before merge to `main`.

---

## 1. Scorecard Template

| #   | Gate                       | Metric                                           | PASS Threshold                    | WARN Threshold                       | FAIL Threshold                               | Weight | Evidence Link                                                  |
| --- | -------------------------- | ------------------------------------------------ | --------------------------------- | ------------------------------------ | -------------------------------------------- | ------ | -------------------------------------------------------------- |
| G1  | **Backend Unit Tests**     | Pass rate (Jest, `@crm/server`)                  | 100% pass, 0 skip                 | 100% pass, ≤3 skip                   | Any failure                                  | Hard   | CI run → `test-server` job → `server-coverage` artifact        |
| G2  | **Frontend Unit Tests**    | Pass rate (Vitest, `@crm/web`)                   | 100% pass, 0 skip                 | 100% pass, ≤2 skip                   | Any failure                                  | Hard   | CI run → `build-web` job → web-test-output.txt                 |
| G3  | **E2E Tests**              | Pass rate (Playwright, 46 specs)                 | 100% pass (incl. retries)         | ≥95% pass, retried ≤2                | <95% pass or >2 retried                      | Hard   | CI run → `test-e2e` job → `playwright-report` artifact         |
| G4  | **Code Coverage (Server)** | Line coverage %                                  | ≥80%                              | ≥70%                                 | <70%                                         | Soft   | `server-coverage` artifact → `lcov-report/index.html`          |
| G5  | **Lint / Type Check**      | ESLint + vue-tsc + tsc (all packages)            | 0 errors, 0 warnings              | 0 errors, ≤5 warnings                | Any error                                    | Hard   | CI run → `lint` + `typecheck` jobs                             |
| G6  | **Dependency Audit**       | `pnpm audit --audit-level high`                  | 0 high/critical                   | ≤2 high (known, mitigated)           | Any critical unpatched                       | Hard   | CI run → `security` job → audit step                           |
| G7  | **License Compliance**     | `license-checker --failOn GPL-2.0;GPL-3.0;AGPL`  | 0 violations                      | —                                    | Any violation                                | Hard   | CI run → `security` job → license step                         |
| G8  | **Snyk / SAST**            | Snyk severity ≥ high                             | 0 findings                        | ≤1 high (accepted risk)              | Any critical                                 | Soft   | CI run → `security` job → Snyk step (skipped if no token)      |
| G9  | **Docker Build**           | Images build + non-root validation               | Both pass                         | —                                    | Any failure                                  | Hard   | CI run → `docker-validate` job                                 |
| G10 | **Flaky Test Trend**       | Tests that passed only after retry (last 5 runs) | 0 flaky across 5 runs             | ≤2 unique flaky tests                | ≥3 unique flaky or same test flaky ≥3 times  | Soft   | Playwright retry traces + Jest `--verbose` logs over 5 CI runs |
| G11 | **API Contract Health**    | Swagger schema breaking changes                  | 0 breaking changes                | ≤1 additive-only change              | Any removed/renamed endpoint or field        | Hard   | `GET /api/v1/docs-json` diff vs. previous release tag          |
| G12 | **Migration Safety**       | Pending migrations, destructive DDL check        | All migrations run, 0 destructive | Additive-only (new columns nullable) | DROP TABLE/COLUMN without deprecation period | Hard   | `pnpm migration:run --dry-run` output                          |
| G13 | **Build Artifact Size**    | Web dist bundle size                             | ≤5 MB gzipped                     | ≤7 MB gzipped                        | >7 MB gzipped                                | Soft   | CI run → `build-web` job → build output size                   |

---

## 2. Weight Definitions

| Weight   | Meaning                                                                                                |
| -------- | ------------------------------------------------------------------------------------------------------ |
| **Hard** | **Mandatory**. A single FAIL on any Hard gate → release is **NO-GO**. No override without VP sign-off. |
| **Soft** | **Advisory**. FAIL triggers review meeting. Release may proceed with documented risk acceptance.       |

---

## 3. Go / No-Go Decision Rule

```
IF   (all Hard gates = PASS or WARN)
AND  (no more than 2 Soft gates = FAIL with documented risk acceptance)
THEN → GO

IF   (any Hard gate = FAIL)
OR   (≥3 Soft gates = FAIL)
THEN → NO-GO
```

### WARN Escalation

- Any gate at WARN **must** have a linked issue/ticket for remediation within 1 sprint.
- If the same gate is WARN for 2 consecutive releases, it auto-escalates to a blocking issue.

---

## 4. Flaky Test Tracking Protocol

Flaky tests are tests that **fail on first attempt but pass on retry** (Playwright `retries: 2` in CI).

### Measurement

1. After each CI run, extract retry data from `playwright-report/`:
   ```bash
   # Parse Playwright JSON report for retried tests
   jq '[.suites[].suites[]?.specs[]? | select(.tests[].results | length > 1) | .title]' \
     playwright-report/results.json
   ```
2. Maintain a rolling window of the **last 5 CI runs on `develop`**.
3. Track unique test titles that required retries.

### Scoring

| Scenario                                     | Verdict |
| -------------------------------------------- | ------- |
| 0 flaky tests across all 5 runs              | PASS    |
| ≤2 unique flaky tests, none repeated ≥3×     | WARN    |
| ≥3 unique flaky tests OR same test flaky ≥3× | FAIL    |

---

## 5. API Contract Health Check Protocol

### Process

1. Before release, export current Swagger schema:
   ```bash
   curl -s http://localhost:3000/api/v1/docs-json > api-schema-current.json
   ```
2. Compare against the schema from the last release tag:
   ```bash
   git show v<last-release>:api-schema.json > api-schema-previous.json
   npx openapi-diff api-schema-previous.json api-schema-current.json
   ```
3. Classify changes:

| Change Type                                   | Classification |
| --------------------------------------------- | -------------- |
| New endpoint added                            | Compatible     |
| New optional field in response                | Compatible     |
| New required field in request DTO             | **Breaking**   |
| Removed endpoint                              | **Breaking**   |
| Renamed field in response                     | **Breaking**   |
| Changed field type                            | **Breaking**   |
| Changed status code for existing success path | **Breaking**   |
| Deprecated endpoint (still functional)        | Compatible     |

### Schema Versioning

- Store `api-schema.json` at repo root, updated on each release tag.
- CI can automate diff via `openapi-diff` in a future enhancement.

---

## 6. Evidence Collection

Each scorecard entry must link to **auditable evidence**:

| Evidence Type            | Where to Find                                                        |
| ------------------------ | -------------------------------------------------------------------- |
| CI run summary           | `https://github.com/<org>/crm-sales-platform/actions/runs/<run-id>`  |
| Test output logs         | CI job step logs (expandable in GitHub Actions)                      |
| Coverage report          | `server-coverage` artifact → download → `lcov-report/index.html`     |
| Playwright report        | `playwright-report` artifact → download → `index.html`               |
| Security audit           | `security` job logs → `pnpm audit` output                            |
| Swagger schema diff      | Manual or CI-generated `openapi-diff` output                         |
| Docker image metadata    | `docker-validate` job → image sizes in step summary                  |
| Flaky test history       | Spreadsheet/issue tracking 5-run window (manual until automated)     |
| Migration dry-run        | `pnpm migration:run --dry-run` terminal output (screenshot or paste) |
| Risk acceptance (if any) | Linked Jira/GitHub issue with `risk-accepted` label                  |

---

## 7. Sample Filled Scorecard

### Release: `v1.8.0` | Date: 2026-03-25 | Branch: `release/1.8.0` | CI Run: [#247](https://github.com/example/crm-sales-platform/actions/runs/247)

| #   | Gate                   | Result  | Actual Value                                                       | Verdict  | Evidence                                                                                                                                      | Notes                                       |
| --- | ---------------------- | ------- | ------------------------------------------------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| G1  | Backend Unit Tests     | 156/156 | 156 passed, 0 failed, 0 skipped                                    | **PASS** | [CI #247 test-server](https://github.com/example/crm/actions/runs/247#test-server)                                                            |                                             |
| G2  | Frontend Unit Tests    | 71/71   | 71 passed, 0 failed, 0 skipped                                     | **PASS** | [CI #247 build-web](https://github.com/example/crm/actions/runs/247#build-web)                                                                |                                             |
| G3  | E2E Tests              | 46/46   | 46 passed, 0 failed, 1 retried (navigation.spec:sidebar)           | **WARN** | [playwright-report artifact](https://github.com/example/crm/actions/runs/247/artifacts)                                                       | Retried test: sidebar collapse timing       |
| G4  | Code Coverage (Server) | 82.3%   | Lines: 82.3%, Branches: 74.1%, Functions: 85.7%                    | **PASS** | [server-coverage artifact](https://github.com/example/crm/actions/runs/247/artifacts)                                                         |                                             |
| G5  | Lint / Type Check      | Clean   | 0 errors, 0 warnings across server/web/miniapp                     | **PASS** | [CI #247 lint](https://github.com/example/crm/actions/runs/247#lint) + [typecheck](https://github.com/example/crm/actions/runs/247#typecheck) |                                             |
| G6  | Dependency Audit       | 0 high  | 0 critical, 0 high, 3 moderate                                     | **PASS** | [CI #247 security](https://github.com/example/crm/actions/runs/247#security)                                                                  | 3 moderate = dev-only deps, no runtime risk |
| G7  | License Compliance     | Clean   | 0 GPL/AGPL violations                                              | **PASS** | [CI #247 security → license step](https://github.com/example/crm/actions/runs/247#security)                                                   |                                             |
| G8  | Snyk / SAST            | 1 high  | 1 high (prototype pollution in lodash, dev-only transitive)        | **WARN** | [CI #247 security → Snyk step](https://github.com/example/crm/actions/runs/247#security)                                                      | [RISK-042](https://jira/RISK-042) accepted  |
| G9  | Docker Build           | Pass    | Both images built, non-root verified, server=187M web=42M          | **PASS** | [CI #247 docker-validate](https://github.com/example/crm/actions/runs/247#docker-validate)                                                    |                                             |
| G10 | Flaky Test Trend       | 1 flaky | 1 unique flaky test in 5 runs (`sidebar collapse`)                 | **WARN** | [Flaky tracker spreadsheet row 12](https://docs.google.com/spreadsheets/d/xxx)                                                                | [BUG-318](https://jira/BUG-318) created     |
| G11 | API Contract Health    | 0 break | +2 new endpoints (leader-review), 0 removed, 0 renamed             | **PASS** | [openapi-diff output](https://github.com/example/crm/pull/189#issuecomment-xxx)                                                               | Additive only                               |
| G12 | Migration Safety       | Safe    | 3 new migrations, all additive (CREATE TABLE, ADD COLUMN nullable) | **PASS** | [migration:run --dry-run log](https://github.com/example/crm/pull/189#issuecomment-xxx)                                                       |                                             |
| G13 | Build Artifact Size    | 3.8 MB  | dist/ = 3.8 MB gzipped (↑0.2 MB from v1.7.0)                       | **PASS** | [CI #247 build-web → size output](https://github.com/example/crm/actions/runs/247#build-web)                                                  |                                             |

### Decision

```
Hard gates:  G1=PASS  G2=PASS  G3=WARN  G5=PASS  G6=PASS  G7=PASS  G9=PASS  G11=PASS  G12=PASS  → ALL PASS/WARN ✅
Soft gates:  G4=PASS  G8=WARN  G10=WARN  G13=PASS  → 0 FAIL ✅

VERDICT: ✅ GO — Release v1.8.0 approved
```

**Signed off by:** Release Manager — 2026-03-25
**WARN remediation tickets:** [BUG-318](https://jira/BUG-318) (flaky sidebar test), [RISK-042](https://jira/RISK-042) (lodash high — dev-only)

---

## 8. Process Checklist

Before filling the scorecard:

- [ ] CI pipeline on `release/*` branch is fully green (all 8 jobs)
- [ ] `pnpm migration:run --dry-run` executed against staging DB
- [ ] Swagger JSON exported and diffed against last release tag
- [ ] Flaky test tracker updated with latest 5 CI runs
- [ ] Bundle size compared with previous release
- [ ] Security scan results reviewed (audit + Snyk)
- [ ] All WARN items have linked remediation tickets
- [ ] All FAIL Soft items have documented risk acceptance (if proceeding)
- [ ] Scorecard reviewed by at least 1 engineer + release manager
- [ ] Scorecard committed to `docs/release-scorecards/v<version>.md`

---

## 9. Automation Roadmap

| Priority | Enhancement                                                 | Status   |
| -------- | ----------------------------------------------------------- | -------- |
| P0       | CI pipeline already automates G1-G3, G5-G7, G9              | **Done** |
| P1       | Auto-export Swagger JSON on release tag, run `openapi-diff` | Planned  |
| P1       | Parse Playwright JSON report for flaky test extraction      | Planned  |
| P2       | GitHub Action step to generate scorecard markdown from CI   | Planned  |
| P2       | Coverage threshold enforcement in Jest config (80%)         | Planned  |
| P3       | Slack/DingTalk notification with scorecard summary          | Planned  |
