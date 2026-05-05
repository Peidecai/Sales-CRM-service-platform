# CRM Feature Or Change Spec Template

## Title

CRM change: `<module or workflow> - <short outcome>`

## Context

Use this section to describe the current CRM behavior from evidence. Prefer
links to source paths, tests, API modules, DTOs, entities, routes, or package
docs. Call out stale docs separately instead of treating them as proof.

Suggested evidence:

- backend module: `packages/server/src/modules/<module>/`
- backend tests: `packages/server/test/<module>/`
- web API/view/store: `packages/web/src/`
- miniapp API/page/store: `packages/miniapp/src/`
- shared contract: `packages/shared/src/`
- migration, Docker, or deploy file if relevant

## Goal

State what should be true for CRM users, APIs, or maintainers after the change.
Use observable outcomes, not implementation wishes.

## Non-Goals

List boundaries. For example:

- no schema migration
- no API contract change
- no role/permission behavior change
- no production deployment
- no unrelated UI redesign

## Affected Users And Roles

- Admin:
- Manager:
- Sales:
- Miniapp/mobile user:
- System/background job:

Remove roles that are not affected.

## Requirements

- Functional:
- Permission/security:
- API contract:
- Data persistence:
- Audit/cache/queue:
- Frontend or miniapp behavior:
- Backward compatibility:

## Affected Paths

- `packages/server/src/modules/...`
- `packages/server/test/...`
- `packages/web/src/...`
- `packages/miniapp/src/...`
- `packages/shared/src/...`
- `docs/project/...`

Keep only paths owned by this spec.

## Verification

Run from repository root unless noted:

```powershell
pnpm --filter @crm/server exec tsc -p tsconfig.json --noEmit
pnpm --filter @crm/server test -- --runInBand
pnpm --filter @crm/web type-check
pnpm --filter @crm/web test
pnpm --filter @crm/miniapp type-check
pnpm --filter @crm/miniapp test
```

Select the relevant subset and add any targeted manual workflow or E2E check.

## Risks And Unknowns

- Stale docs:
- Dirty worktree overlap:
- Migration/data risk:
- Permission/audit/security risk:
- Generated file risk:
- External provider or environment dependency:

## Delivery State

Use the narrowest accurate state:

- implemented
- verified
- reviewed
- accepted
