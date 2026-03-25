# Fix Batch Evidence Template

> **Document ID**: TMPL-EVID-001
> **Version**: 1.0
> **Effective Date**: 2026-03-24
> **Owner**: Tech Lead / QA Lead
> **Review Cycle**: Per fix batch (minimum bi-weekly)
> **Governance Ref**: [Governance Charter Addendum](./governance-charter-addendum-automation.md) §6, [Repair Cycle QS](./repair-cycle-quality-standards.md) §1–§5

---

## Purpose

Every fix batch (a group of related remediation tasks executed together) **must** produce
a completed evidence record before the batch is considered "closed". This template
ensures four standards are met:

| Standard                            | Section | What It Proves                                                 |
| ----------------------------------- | ------- | -------------------------------------------------------------- |
| **(a) Command Evidence**            | §2      | Exact commands run, verbatim output, timestamps                |
| **(b) Before / After Metrics**      | §3      | Quantified improvement (tests, coverage, audit findings, etc.) |
| **(c) Risk Closure Proof**          | §4      | Each risk item is verifiably resolved or downgraded            |
| **(d) Traceability to Backlog IDs** | §5      | Every change maps to a tracked backlog item                    |

---

## §1 — Batch Metadata

| Field                   | Value                                          |
| ----------------------- | ---------------------------------------------- |
| **Batch ID**            | `FB-YYYY-NNN` (e.g. `FB-2026-001`)             |
| **Backlog IDs Covered** | _Comma-separated: P0-1, T03, S-C2, etc._       |
| **Priority Tier**       | P0 / P1 / P2                                   |
| **Executor**            | _Name or automation agent_                     |
| **Execution Date**      | YYYY-MM-DD                                     |
| **Execution Duration**  | _Total wall-clock time_                        |
| **Environment**         | _Node version, OS, Docker version if relevant_ |
| **Branch**              | _Git branch name_                              |
| **Commit Range**        | `<start-sha>..<end-sha>`                       |
| **Reviewer / Sign-off** | _Name + date_                                  |

---

## §2 — Command Evidence (Standard a)

> Paste exact commands run and their **verbatim** output (truncated with `[…]` if
> extremely long, but never omit error lines). Each entry must include a timestamp.

### 2.1 Pre-Fix Baseline Capture

_Run these **before** applying any fix to establish the "before" state._

```
### [TIMESTAMP] — Baseline: Unit Tests
$ cd packages/server && pnpm test -- --ci 2>&1 | tail -20

[PASTE VERBATIM OUTPUT]
```

```
### [TIMESTAMP] — Baseline: Build
$ pnpm build 2>&1 | tail -10

[PASTE VERBATIM OUTPUT]
```

```
### [TIMESTAMP] — Baseline: Security Audit
$ pnpm audit --audit-level high 2>&1

[PASTE VERBATIM OUTPUT]
```

```
### [TIMESTAMP] — Baseline: Lint
$ pnpm lint 2>&1 | tail -10

[PASTE VERBATIM OUTPUT]
```

### 2.2 Fix Execution Commands

_Record each distinct fix step. Reference the backlog ID._

```
### [TIMESTAMP] — Fix [BACKLOG-ID]: [Short Description]
$ [EXACT COMMAND]

[PASTE VERBATIM OUTPUT]
```

_Repeat for each fix step._

### 2.3 Post-Fix Verification

_Run the **same** baseline commands after all fixes are applied._

```
### [TIMESTAMP] — Post-Fix: Unit Tests
$ cd packages/server && pnpm test -- --ci 2>&1 | tail -20

[PASTE VERBATIM OUTPUT]
```

```
### [TIMESTAMP] — Post-Fix: Build
$ pnpm build 2>&1 | tail -10

[PASTE VERBATIM OUTPUT]
```

```
### [TIMESTAMP] — Post-Fix: Security Audit
$ pnpm audit --audit-level high 2>&1

[PASTE VERBATIM OUTPUT]
```

```
### [TIMESTAMP] — Post-Fix: Lint
$ pnpm lint 2>&1 | tail -10

[PASTE VERBATIM OUTPUT]
```

### 2.4 Regression Check

_Confirm no existing functionality broke._

```
### [TIMESTAMP] — E2E Tests
$ pnpm test:e2e 2>&1 | tail -20

[PASTE VERBATIM OUTPUT]
```

```
### [TIMESTAMP] — Frontend Tests
$ cd packages/web && pnpm test 2>&1 | tail -20

[PASTE VERBATIM OUTPUT]
```

---

## §3 — Before / After Metrics (Standard b)

> Fill in both columns. Δ column shows the change. Green (✅) = improved or met target;
> Yellow (⚠️) = no change; Red (❌) = regressed.

| Metric                          | Before  | After   | Δ     | Target      | Status   |
| ------------------------------- | ------- | ------- | ----- | ----------- | -------- |
| **Backend unit tests passing**  | _N / M_ | _N / M_ | _+X_  | All pass    | ✅/⚠️/❌ |
| **Backend test suites**         | _N_     | _N_     | _+X_  | ≥ previous  | ✅/⚠️/❌ |
| **IGNORED_TESTS count**         | _N_     | _N_     | _-X_  | ≤ 18 (−40%) | ✅/⚠️/❌ |
| **Frontend unit tests passing** | _N / M_ | _N / M_ | _+X_  | All pass    | ✅/⚠️/❌ |
| **E2E tests passing**           | _N / M_ | _N / M_ | _+X_  | All pass    | ✅/⚠️/❌ |
| **`pnpm build` exit code**      | _0 / 1_ | _0 / 1_ | —     | 0           | ✅/⚠️/❌ |
| **`pnpm audit` high/critical**  | _N_     | _N_     | _-X_  | 0           | ✅/⚠️/❌ |
| **`pnpm lint` errors**          | _N_     | _N_     | _-X_  | 0           | ✅/⚠️/❌ |
| **Code coverage (lines)**       | _X%_    | _X%_    | _+X%_ | ≥ 80%       | ✅/⚠️/❌ |

> **Custom metrics**: Add rows for batch-specific KPIs (e.g., "Newman pass rate",
> "API response time p99", "concurrent write conflict rate").

---

## §4 — Risk Closure Proof (Standard c)

> For each risk addressed in this batch, document the closure evidence.

| Backlog ID | Risk Description              | Risk Score (L×I) Before | Mitigation Applied            | Verification Method   | Verification Result | Risk Score After | Closure Status |
| ---------- | ----------------------------- | ----------------------- | ----------------------------- | --------------------- | ------------------- | ---------------- | -------------- |
| _P0-1_     | _e.g., Unit tests not stable_ | _4×4 = 16_              | _Fixed N flaky tests_         | _3× randomized runs_  | _3/3 pass_          | _1×4 = 4_        | ✅ Closed      |
| _P0-2_     | _e.g., Auth chain gap_        | _3×5 = 15_              | _Added auth regression tests_ | _Test suite + Newman_ | _All pass_          | _1×5 = 5_        | ✅ Closed      |

### Risk Scoring Reference

_Per [Risk Review Template](./risk-review-template.md):_

| Score Range | Severity | Action             |
| ----------- | -------- | ------------------ |
| 20–25       | Critical | Block release      |
| 12–19       | High     | Fix this sprint    |
| 6–11        | Medium   | Fix next 2 sprints |
| 1–5         | Low      | Track only         |

### Residual Risks

_List any risks that were **partially** mitigated or deferred._

| Backlog ID   | Residual Risk                                     | Residual Score | Escalation / Follow-up   |
| ------------ | ------------------------------------------------- | -------------- | ------------------------ |
| _e.g., P1-2_ | _Concurrent write race under 100+ TPS not tested_ | _3×4 = 12_     | _Scheduled for P1 batch_ |

---

## §5 — Traceability Matrix (Standard d)

> Every file changed must map to a backlog ID. Every backlog ID must map to at least
> one changed file. This enables audit trail from requirement → code.

### 5.1 Backlog → Files

| Backlog ID | Source                        | Description  | Files Changed       | Migration ID (if any) |
| ---------- | ----------------------------- | ------------ | ------------------- | --------------------- |
| _P0-1_     | `phase2-final-fix-backlog.md` | _Short desc_ | `a.ts`, `b.spec.ts` | —                     |
| _T03_      | `fix-tasks.txt`               | _Short desc_ | `c.module.ts`       | `1709000106000-*`     |
| _S-C1_     | MEMORY.md audit               | _Short desc_ | `d.controller.ts`   | —                     |

### 5.2 Files → Backlog (Reverse Check)

_Auto-generated from `git diff --name-only <start-sha>..<end-sha>`. Verify no orphan files._

| File                                                  | Backlog ID(s) | Justified? |
| ----------------------------------------------------- | ------------- | ---------- |
| `packages/server/src/modules/foo/foo.service.ts`      | P0-1          | ✅         |
| `packages/server/src/modules/foo/foo.service.spec.ts` | P0-1          | ✅         |

> **Orphan file** = changed file with no backlog ID → requires justification or revert.

### 5.3 Cross-Reference to Logs

| Backlog ID | Fix Log File                       | Session Log                            |
| ---------- | ---------------------------------- | -------------------------------------- |
| _P0-1_     | `fix-logs/T01-20260324-HHMMSS.txt` | `fix-logs/session-20260324-HHMMSS.txt` |
| _T03_      | `fix-logs/T03-20260324-HHMMSS.txt` | _(same session)_                       |

---

## §6 — Sign-off

| Role          | Name | Date | Decision                                             |
| ------------- | ---- | ---- | ---------------------------------------------------- |
| **Executor**  |      |      | Certify: all commands and outputs above are accurate |
| **Reviewer**  |      |      | Certify: evidence is complete, metrics meet targets  |
| **Tech Lead** |      |      | Approve: batch closed, risks acceptable              |

### Approval Criteria

- [ ] All §2 command outputs are present and unedited
- [ ] All §3 "After" metrics meet or exceed targets (no ❌ rows)
- [ ] All §4 risks are ✅ Closed or have documented residual risk with follow-up
- [ ] All §5 files are traced to backlog IDs (no orphans)
- [ ] Build (`pnpm build`) passes
- [ ] Full test suite passes 3× with `--randomize` (per [Repair Cycle QS §1.2](./repair-cycle-quality-standards.md))

---

## §7 — Appendix: Quick-Start Checklist

Use this checklist when filling out the template:

```
1. [ ] Create branch: fix/FB-YYYY-NNN
2. [ ] Run baseline captures (§2.1) — SAVE OUTPUT
3. [ ] Execute fixes, recording each command (§2.2)
4. [ ] Run post-fix verification (§2.3) — SAVE OUTPUT
5. [ ] Run regression check (§2.4) — SAVE OUTPUT
6. [ ] Fill metrics table (§3) with before/after values
7. [ ] Score risk closure (§4) — re-evaluate L×I
8. [ ] Build traceability matrix (§5) from git diff
9. [ ] Verify no orphan files (§5.2)
10. [ ] Cross-reference fix-logs (§5.3)
11. [ ] Submit for review and sign-off (§6)
```

---

_Template version 1.0 — Created 2026-03-24_
