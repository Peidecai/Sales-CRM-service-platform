# Skill Routing

## Workflow Core

Use the project documents in `docs/project/` as the workflow core. The local
`docs/superpowers/` directory is a template source only; do not treat it as
project policy unless a project-owned file references it.

## Default Routing

- Plain-language request: use task intake before implementation.
- Bugfix: reproduce or identify failing evidence, patch narrowly, run targeted
  tests, then broader checks if risk warrants.
- New feature: intake, spec or short design, plan, implementation, verification.
- Refactor: define owned paths, current behavior, verification path, and rollback
  expectations before changing code.
- Release or deployment: use `delivery-contract.md`, `release` notes, and fresh
  smoke evidence.
- Takeover or unclear state: write repo-state, brownfield, or takeover readiness
  evidence before implementation.

## Domain Skill Guidance

- Backend work: follow NestJS module/service/controller/DTO patterns already in
  `packages/server`.
- Frontend work: follow Vue 3 `<script setup>`, Pinia, Element Plus, and
  `src/api/request.ts` API conventions.
- Miniapp work: follow uni-app request/storage/offline queue patterns.
- Database work: use migrations and verify rollback implications.
- Security-sensitive work: inspect guards, DTO validation, sensitive fields,
  audit logging, and response shapes.

## Fallback

If a named local skill is unavailable or not applicable, use the project
workflow files here and document the fallback in the final delivery note.
