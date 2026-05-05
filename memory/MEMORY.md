# Project Memory Index

## Purpose

Durable project memory for CRM Sales Platform. This file indexes stable facts and
handoff locations. Do not store secrets here.

## Current Baseline

- Project type: brownfield pnpm monorepo.
- Active mode: progressive.
- Governance docs live under `docs/project/`.
- Local `docs/superpowers/` is a template source and is ignored by the parent
  product repo.
- Initial takeover date: 2026-04-30.
- Standard takeover layer has been installed: operations, overview,
  architecture, specs, plans, audits, design, standards, reviews, prompts, and
  memory scaffolding.
- External template alignment on 2026-05-05 added data-flow, rollout acceptance,
  local memory notes, and raw memory JSONL scaffolding.
- CRM-specific template pass on 2026-05-05 replaced generic placeholders in
  spec, plan, audit, design, handoff, topic, ADR, and incident templates with
  project-specific roles, paths, risks, and verification commands.

## Verification Notes

- Use targeted package type checks and tests from `docs/project/operations/testing.md`.
- Avoid lint as an inspection command because package lint scripts use `--fix`.
- On 2026-04-30 the server Jest baseline was restored after updating two stale
  sorting expectations: 97 suites, 1183 tests passed.

## Known Documentation Corrections

- Root README testing count is stale.
- Root CLAUDE module doc paths omit `packages/server/` in several rows.
- Backend module-level docs exist only for a subset of modules.

## Handoffs

- Use `memory/session-handoffs/handoff.template.md` for interrupted work.

## Topic And Raw Memory Files

- `memory/learned-rules.md` - durable project rules.
- `memory/observations.jsonl` - evidence-backed observations.
- `memory/corrections.jsonl` - durable corrections.
- `memory/topics/` - recurring topic notes.
