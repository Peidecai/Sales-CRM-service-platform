# CRM Sales Platform — Repair Cycle Quality Standards

> Non-negotiable gates for every PR and every release during the repair cycle.
> Owner: Tech Lead. Effective: 2026-03-24. Supersedes ad-hoc review until repair cycle closure.

---

## 1. Test Determinism

Every test **must** produce the same result on every run, regardless of execution order, wall-clock time, network state, or prior test state.

### 1.1 Non-Negotiable Rules

| Rule                                      | Rationale                               | Enforcement                                                                                                         |
| ----------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **No shared mutable state** between tests | Ordering dependence → false green       | Jest `--randomize` flag in CI (`jest --ci --randomize`)                                                             |
| **No real clocks**                        | `Date.now()`, `setTimeout` cause drift  | Use `jest.useFakeTimers()` or inject clock; Vitest: `vi.useFakeTimers()`                                            |
| **No real I/O in unit tests**             | FS/network/DB creates external coupling | MockRepository, MockRedisService (from `test-utils.ts`); if a test needs a real DB, it belongs in integration suite |
| **No `Math.random()` without seed**       | Non-reproducible state                  | Use `faker.seed(12345)` or deterministic factory fixtures                                                           |
| **Idempotent setup/teardown**             | `beforeEach` must not accumulate state  | Assert clean state in `afterEach`; never rely on test execution count                                               |
| **Explicit assertion count**              | Missing assertion = silent pass         | Use `expect.assertions(n)` for async tests with catch blocks                                                        |

### 1.2 Determinism Verification

```bash
# Run full suite 3x with randomized order — CI must do this on the `main` branch nightly
for i in 1 2 3; do pnpm --filter @crm/server test -- --ci --randomize; done
```

If any run produces a different result, the suite is **non-deterministic** and the offending test must be quarantined (see §5).

---

## 2. Security Gate Policy

No PR merges and no release ships if any security gate is RED.

### 2.1 Gate Definitions

| Gate                              | Tool                                                                                                | Blocking Threshold                                | Applies To                    |
| --------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ----------------------------- |
| **G-SEC-1: Dependency Audit**     | `pnpm audit --audit-level high`                                                                     | ≥ 1 high/critical finding                         | Every PR                      |
| **G-SEC-2: License Policy**       | `pnpm dlx license-checker --failOn 'GPL-2.0;GPL-3.0;AGPL-3.0'`                                      | Any copyleft match                                | Every PR                      |
| **G-SEC-3: Snyk Scan**            | `snyk test` (if token configured)                                                                   | ≥ 1 high severity                                 | Release only                  |
| **G-SEC-4: Container Non-Root**   | CI docker-validate job                                                                              | Server or web runs as root                        | Every PR                      |
| **G-SEC-5: No Hardcoded Secrets** | `grep -rn 'password\|secret\|api_key' --include='*.ts' \| grep -v '.spec.ts\|test-utils\|.example'` | Any match outside `.env.example` or test fixtures | Every PR                      |
| **G-SEC-6: RBAC Coverage**        | Manual review: every business controller has `@UseGuards(JwtAuthGuard, RolesGuard)` at class level  | Missing guard on any business endpoint            | Every PR touching controllers |
| **G-SEC-7: Input Validation**     | Every new endpoint has DTO with `class-validator` decorators                                        | Endpoint accepts raw body without validation      | Every PR adding endpoints     |
| **G-SEC-8: SQL Injection**        | No raw SQL without parameterization; `SqlInjectionMiddleware` active                                | Any unparameterized `query()` call                | Every PR                      |

### 2.2 Escalation Path

| Severity                               | Response Time                       | Who Decides                 |
| -------------------------------------- | ----------------------------------- | --------------------------- |
| Critical (G-SEC-1 high, G-SEC-5 match) | Block PR immediately; fix within 4h | Any reviewer can block      |
| High (G-SEC-3, G-SEC-6 gap)            | Fix before next release             | Tech Lead sign-off required |
| Medium (G-SEC-7 partial)               | Fix within current sprint           | Author self-service         |

### 2.3 Exception Process

A security gate may be temporarily bypassed **only** if:

1. A written justification is added to the PR description under `## Security Exception`
2. Tech Lead approves with explicit comment
3. A follow-up issue is filed with `priority: critical` and linked in the PR
4. Exception expires after 5 business days — if not resolved, the PR is reverted

---

## 3. API Contract Compatibility

### 3.1 Non-Breaking Contract Rules

The API prefix is `/api/v1`. All responses follow `{ code: 0, message: 'success', data: T }`.

| Change Type                                   | Allowed in v1? | Evidence Required                              |
| --------------------------------------------- | -------------- | ---------------------------------------------- |
| **Add new endpoint**                          | ✅ Yes         | Swagger annotation + E2E test                  |
| **Add optional field to response**            | ✅ Yes         | Update DTO + Swagger `@ApiProperty`            |
| **Add optional query param**                  | ✅ Yes         | DTO with `@IsOptional()`                       |
| **Remove response field**                     | ❌ No          | Requires v2 or deprecation cycle               |
| **Rename response field**                     | ❌ No          | Requires v2 or deprecation cycle               |
| **Change field type** (e.g., string → number) | ❌ No          | Requires v2 or deprecation cycle               |
| **Remove endpoint**                           | ❌ No          | Requires 2-sprint deprecation notice           |
| **Change error code semantics**               | ❌ No          | Error codes (400xx–500xx) are stable contracts |
| **Add required field to request body**        | ⚠️ Conditional | Only if all consumers are updated in same PR   |
| **Change pagination structure**               | ❌ No          | `{ list, total, page, pageSize }` is frozen    |

### 3.2 Contract Verification Workflow

For every PR that touches a controller or DTO:

1. **Before**: Export current Swagger JSON (`curl localhost:3000/api/docs-json > before.json`)
2. **After**: Build and export again
3. **Diff**: Use `oasdiff` or manual review to confirm only additive changes
4. **Evidence**: Include the diff summary in PR description under `## API Changes`

### 3.3 Deprecation Protocol

When a field or endpoint must be removed:

1. Sprint N: Add `@ApiProperty({ deprecated: true, description: 'Use X instead. Removal: Sprint N+2' })`
2. Sprint N: Add `console.warn()` log when deprecated field is accessed
3. Sprint N+1: Verify zero usage in access logs
4. Sprint N+2: Remove field, bump version if needed

---

## 4. Evidence Archiving

Every repair action must leave an auditable trail.

### 4.1 What Constitutes Evidence

| Artifact                  | Format                                | Retention                                                   | Storage                                |
| ------------------------- | ------------------------------------- | ----------------------------------------------------------- | -------------------------------------- |
| **CI pipeline result**    | GitHub Actions summary                | 90 days (GitHub default)                                    | GitHub                                 |
| **Test coverage report**  | `coverage/lcov-report/` HTML          | 7 days as CI artifact; latest committed to `docs/coverage/` | GitHub Artifacts + repo                |
| **Playwright traces**     | `.zip` trace files                    | 7 days as CI artifact                                       | GitHub Artifacts                       |
| **Security scan results** | `pnpm audit` JSON output              | Per-release snapshot                                        | `docs/security-audits/YYYY-MM-DD.json` |
| **API contract diff**     | `oasdiff` or manual Swagger JSON diff | Permanent in PR description                                 | GitHub PR                              |
| **Migration SQL**         | TypeORM migration `.ts` file          | Permanent                                                   | `database/migrations/`                 |
| **Performance baseline**  | k6 HTML report + bundle size metrics  | Per-release                                                 | `docs/perf-baselines/`                 |
| **Risk review**           | Filled `risk-review-template.md`      | Permanent                                                   | `docs/risk-reviews/YYYY-MM-DD.md`      |

### 4.2 Archiving Rules

1. **No silent fixes**: Every change must reference an issue/task ID in the commit message (e.g., `fix(T03): ...`)
2. **Failing test evidence**: When fixing a test, the PR must include the failure output (screenshot or log paste) proving the issue existed
3. **Quarantine log**: `jest.phase2.config.ts` IGNORED_TESTS array is the quarantine ledger — every entry requires a linked issue explaining why it was quarantined and the target fix date
4. **Release notes**: Each release must produce a `CHANGELOG` entry listing: features added, bugs fixed, security patches applied, known issues remaining

### 4.3 Evidence Completeness Check

Before merging any repair PR, reviewers must verify:

- [ ] CI pipeline completed (all 8 jobs green)
- [ ] Coverage artifact uploaded and shows no regression
- [ ] If API changed: contract diff in PR description
- [ ] If migration added: migration file committed, tested with `migration:run` + `migration:revert`
- [ ] If security fix: scan results before and after

---

## 5. Flaky Test Handling

A test is **flaky** if it produces different results across 3 consecutive CI runs with no code change.

### 5.1 Classification

| Category     | Symptom                      | Root Cause                        | Fix Strategy                                                         |
| ------------ | ---------------------------- | --------------------------------- | -------------------------------------------------------------------- |
| **Timing**   | Intermittent timeout         | Real timers, race conditions      | Fake timers, explicit `waitFor()`, remove `setTimeout`               |
| **Ordering** | Passes alone, fails in suite | Shared mutable state              | Isolate state in `beforeEach`/`afterEach`                            |
| **External** | Fails on CI, passes locally  | Network/FS/env differences        | Mock all I/O; use `happy-dom` (frontend), `MockRepository` (backend) |
| **Data**     | Non-deterministic assertions | `Math.random()`, unsorted results | Seed RNG, sort before assert, use `expect.arrayContaining()`         |
| **Resource** | OOM or process crash         | Memory leak in test setup         | Limit concurrent tests, add `--maxWorkers=50%`                       |

### 5.2 Quarantine Protocol

```
Detected flaky → Quarantine (≤ 24h) → Root-cause (≤ 3 days) → Fix or Delete (≤ 5 days)
```

1. **Detect**: CI run fails; re-run passes (or vice versa)
2. **Quarantine** (within 24 hours):
   - Add the test file path to `jest.phase2.config.ts` IGNORED_TESTS
   - File an issue: `[FLAKY] {test name} — {symptom}`
   - Label: `flaky-test`, `priority: high`
   - Comment the quarantine reason in the test file with `// QUARANTINED: <issue-link> — <date>`
3. **Root-cause** (within 3 business days):
   - Reproduce locally with `--randomize` and `--runInBand`
   - Identify category from §5.1
   - Document root cause in the issue
4. **Fix or Delete** (within 5 business days):
   - Fix: Remove from IGNORED_TESTS, remove quarantine comment, close issue
   - Delete: If test has no value (duplicate, testing implementation detail), remove it entirely with justification in issue
5. **Escalation**: If quarantine exceeds 5 days, Tech Lead reviews in next standup. If exceeded 10 days, the test is deleted and a new test covering the same behavior is written from scratch.

### 5.3 Flaky Test Budget

| Metric                      | Threshold                  | Action                                        |
| --------------------------- | -------------------------- | --------------------------------------------- |
| Total quarantined tests     | ≤ 5 at any time            | If > 5, stop feature work until reduced       |
| Quarantine age (oldest)     | ≤ 10 business days         | Escalate to Tech Lead                         |
| Flaky rate per sprint       | ≤ 2% of total test count   | If > 2%, dedicate a sprint day to test health |
| Current IGNORED_TESTS count | 44 files (historical debt) | Reduce by ≥ 5 files per sprint until ≤ 5      |

---

## 6. PR Checklist Template

Copy this checklist into every PR description. All items must be checked before merge.

```markdown
## PR Quality Checklist

### Code Quality

- [ ] TypeScript strict mode — no `any` (use `unknown`)
- [ ] No `console.log` left in production code
- [ ] File names are kebab-case, classes PascalCase, variables/functions camelCase
- [ ] All async functions have error handling (try/catch or .catch())
- [ ] Shared types use `@crm/shared` — no duplicate type definitions

### Tests

- [ ] New/modified code has corresponding unit tests
- [ ] All tests pass locally: `pnpm test` (server) + `pnpm test` (web)
- [ ] Tests are deterministic: no real timers, no real I/O, no shared state
- [ ] Coverage does not decrease (branches ≥ 40%, lines ≥ 50%)
- [ ] If fixing a bug: regression test added that fails without the fix

### Security Gates

- [ ] G-SEC-1: `pnpm audit --audit-level high` — 0 high/critical
- [ ] G-SEC-2: No copyleft licenses introduced
- [ ] G-SEC-4: Docker containers run as non-root
- [ ] G-SEC-5: No hardcoded secrets (passwords, API keys, tokens)
- [ ] G-SEC-6: New controllers have `@UseGuards(JwtAuthGuard, RolesGuard)` at class level
- [ ] G-SEC-7: New endpoints have DTO validation (`class-validator` decorators)
- [ ] G-SEC-8: No raw SQL without parameterization

### API Compatibility

- [ ] No response fields removed or renamed
- [ ] No request fields changed from optional to required (unless all consumers updated)
- [ ] New endpoints have Swagger annotations (`@ApiOperation`, `@ApiResponse`, `@ApiParam`)
- [ ] Pagination response format unchanged: `{ list, total, page, pageSize }`
- [ ] Error codes follow existing ranges (400xx–500xx)

### Database

- [ ] Schema changes use migrations (never `synchronize: true`)
- [ ] Migration file uses incremental timestamp naming: `{UNIX_TS}-{PascalCaseDescription}.ts`
- [ ] Migration is idempotent (`INSERT IGNORE`, check before `ADD COLUMN`)
- [ ] Migration tested: `migration:run` + `migration:revert` both succeed
- [ ] Uses `crm_migrator` account for DDL operations

### Evidence

- [ ] CI pipeline passes (all 8+ jobs green)
- [ ] Coverage artifact uploaded (no regression)
- [ ] If API changed: contract diff summary in this PR description
- [ ] If security fix: before/after scan results attached
- [ ] Commit message follows convention: `feat:|fix:|chore:` + descriptive message
```

---

## 7. Release Checklist Template

Apply before every release tag (`v*`) push.

```markdown
## Release Quality Gate — v{VERSION} ({DATE})

### Pre-Release Verification

#### 1. Test Suites (all must pass)

- [ ] Backend unit tests: `pnpm --filter @crm/server test -- --ci` — {COUNT} tests pass
- [ ] Frontend unit tests: `pnpm --filter @crm/web test` — {COUNT} tests pass
- [ ] E2E tests: `npx playwright test` — {COUNT} tests pass
- [ ] Flaky quarantine: ≤ 5 tests in IGNORED_TESTS
- [ ] Determinism check: 3x `--randomize` runs — all identical results

#### 2. Security Scan

- [ ] `pnpm audit --audit-level high` — 0 critical/high
- [ ] License check — no GPL-2.0/GPL-3.0/AGPL-3.0
- [ ] Snyk scan (if configured) — 0 high severity
- [ ] Docker non-root verification — both containers pass
- [ ] Secrets scan — no hardcoded credentials in codebase
- [ ] OWASP Top 10 spot-check on new endpoints

#### 3. API Contract

- [ ] Swagger JSON exported and diffed against previous release
- [ ] No breaking changes (field removal, type change, endpoint removal)
- [ ] All new endpoints documented with Swagger annotations
- [ ] Response format compliance: `{ code, message, data }` on all endpoints

#### 4. Build & Infrastructure

- [ ] `pnpm --filter @crm/web build` — succeeds, bundle < 2048 KB JS total
- [ ] `nest build` — succeeds, no TypeScript errors
- [ ] `vue-tsc --noEmit` — succeeds
- [ ] `docker compose config --quiet` — valid
- [ ] Docker build: server image < 500 MB, web image < 100 MB
- [ ] Health endpoint responds: `GET /api/v1/health` → `{ status: 'ok' }`

#### 5. Database

- [ ] All pending migrations applied to staging: `migration:run`
- [ ] Migration rollback tested: `migration:revert` succeeds
- [ ] No `synchronize: true` in any TypeORM config
- [ ] Backup script exists and tested: `scripts/db-backup.sh`

#### 6. Performance Baseline

- [ ] k6 load test: error rate < 1%, p95 < 500ms (10 VUs, 15s)
- [ ] Bundle size recorded in `docs/perf-baselines/`
- [ ] No N+1 queries introduced (check TypeORM query log in dev mode)

#### 7. Evidence Archive

- [ ] CI summary screenshot/link saved
- [ ] Coverage report committed or archived
- [ ] Security scan snapshot: `docs/security-audits/{DATE}.json`
- [ ] Risk review completed: `docs/risk-reviews/{DATE}.md`
- [ ] CHANGELOG entry written with: features, fixes, security patches, known issues

#### 8. Go/No-Go Decision

- [ ] All gates above are GREEN
- [ ] Tech Lead sign-off: ********\_******** Date: ****\_****
- [ ] QA sign-off (if applicable): ********\_******** Date: ****\_****

### Post-Release Verification

- [ ] Health check passes on production
- [ ] Smoke test: login → dashboard → create customer → verify
- [ ] Monitor error rates for 30 minutes post-deploy
- [ ] Rollback plan documented and tested
```

---

## 8. Repair Cycle Exit Criteria

The repair cycle is considered complete when **all** of the following are true:

| Criterion                | Measurement                                 | Target                              |
| ------------------------ | ------------------------------------------- | ----------------------------------- |
| Quarantined tests        | `jest.phase2.config.ts` IGNORED_TESTS count | ≤ 5                                 |
| Backend test coverage    | Jest `--coverage` branches/lines            | ≥ 50% / ≥ 60%                       |
| Frontend test coverage   | Vitest `--coverage`                         | ≥ 60% lines                         |
| CI pipeline              | All 8 jobs pass on `main`                   | 100% green for 5 consecutive pushes |
| Security gates           | G-SEC-1 through G-SEC-8                     | All pass                            |
| Flaky test rate          | Failures on `--randomize` 3x run            | 0%                                  |
| API contract             | Swagger diff vs last stable release         | Zero breaking changes               |
| Open security exceptions | Exception count                             | 0                                   |
| Risk review              | Latest `risk-review-template.md`            | All Critical/High items resolved    |

Once all criteria are met, Tech Lead declares repair cycle closure and `jest.phase2.config.ts` is deleted (all tests run from `jest.config.ts`).

---

## Appendix A: Quick Reference — CI Job Dependencies

```
lint ──────────┐
typecheck ─────┤
security ──────┤
test-server ───┼──→ build-web ──→ test-e2e ──→ docker-validate ──→ ci-summary
               └──→ build-server ──────────────↗
```

## Appendix B: File Locations

| Document                        | Path                                        |
| ------------------------------- | ------------------------------------------- |
| This standards doc              | `docs/repair-cycle-quality-standards.md`    |
| Jest base config                | `packages/server/jest.config.ts`            |
| Jest phase2 config (quarantine) | `packages/server/jest.phase2.config.ts`     |
| Vitest config                   | `packages/web/vite.config.ts`               |
| Playwright config               | `playwright.config.ts`                      |
| CI workflow                     | `.github/workflows/ci.yml`                  |
| CD workflow                     | `.github/workflows/cd.yml`                  |
| Go/No-Go workflow               | `.github/workflows/go-no-go.yml`            |
| Go-live checklist               | `docs/go-live-checklist.md`                 |
| Risk review template            | `docs/risk-review-template.md`              |
| Test plan (manual)              | `docs/TEST_PLAN.md`                         |
| Test utilities                  | `packages/server/test/common/test-utils.ts` |
