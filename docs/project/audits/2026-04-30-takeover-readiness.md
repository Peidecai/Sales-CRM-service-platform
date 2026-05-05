# CRM Sales Platform Takeover Readiness

**Date:** 2026-04-30

**Owner:** Codex

**Status:** Active

**Takeover State:** ready-with-boundaries

## Purpose

Record the first takeover decision after introducing the local Codex harness
templates into the CRM monorepo.

## Evidence Reviewed

- `README.md`
- `CLAUDE.md`
- `packages/server/CLAUDE.md`
- `packages/web/CLAUDE.md`
- `packages/miniapp/CLAUDE.md`
- `package.json`
- `pnpm-workspace.yaml`
- backend module directory listing
- current Git state
- fresh type-check and unit-test commands from the repository root
- standard takeover layer files under `docs/project/`, `.codex/prompts/`, and
  `memory/`
- external template profile manifest and team rollout references from
  `D:/Develop/codex-AI-Agent-docs`

## Current Takeover Decision

- **Allowed Lanes:** docs-only, bounded implementation, checkpoint first
- **Blocked Lanes:** broad implementation, release claim, production deployment
- **Reason:** the codebase is legible, the standard takeover layer now exists,
  and the main type/test baseline is green. Broad work still requires
  task-specific planning because module-level documentation coverage remains
  uneven and release/E2E evidence is not fresh.

## Active Checkpoint Or Continuation Thread

- **Active Objective:** takeover control layer landed and server test baseline
  restored; next work should enter through normal task intake.
- **Owned Paths:** `AGENTS.md`, `PROJECT_OPERATING_MODE.md`, `docs/project/`,
  `memory/`, `.codex/prompts/`, `.gitignore`, targeted backend tests.
- **Do Not Touch Casually:** `.env` files, deployment secrets, generated output,
  database migrations, unrelated feature modules.
- **Required Before Broad Code Work:** relevant package type checks and tests
  should pass with fresh evidence for the target task.

## Verified, Unverified, Unknown

### Verified

- Repository root is `D:/Develop/Sales CRM service platform/crm-sales-platform`.
- The workspace is a pnpm monorepo with server, web, miniapp, and shared
  packages.
- Type checks passed for shared, server, web, and miniapp during takeover.
- Server Jest suite passed after repairing stale expectations: 97 suites, 1183
  tests.
- Web unit tests passed during takeover.
- Miniapp unit tests passed during takeover.
- `docs/project/architecture/data-flow.md` and rollout acceptance checklist now
  exist in the project-side harness.

### Unverified

- E2E test health.
- Production deployment health.
- Full parity between README/CLAUDE docs and the actual module set.
- Current dirty business-code changes are not reviewed as part of the harness
  rollout.

### Unknown

- Current production environment topology and secret configuration.
- Whether all backend modules have complete user-facing coverage.

## Superseded Or Lower-Authority Docs

- Root `README.md` is useful but has stale testing-count information.
- Root `CLAUDE.md` is useful but has stale module doc path examples.
- Local `docs/superpowers/` is a template source, not CRM project policy.

## Release Or User-Test Path

- **Canonical Release Directory:** not verified
- **Build Output Directory:** `packages/web/dist`, `packages/server/dist`,
  `packages/miniapp/dist` depending on package
- **User Test Entry:** local web app, backend Swagger, miniapp dev output
- **Release Smoke Evidence:** not verified

## Next Safe Action

Use this control layer for the next bounded CRM development task. If the task is
broad, security-sensitive, cross-package, release-related, or user-facing with
ambiguous behavior, create a spec or plan first.

## Handoff Note

Read `AGENTS.md`, `PROJECT_OPERATING_MODE.md`, this takeover readiness note, and
`docs/project/operations/testing.md` before the next implementation task.
