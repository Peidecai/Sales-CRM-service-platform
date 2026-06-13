# CRM Implementation Plan Template

## Objective

Implement or repair `<CRM module/workflow>` so that `<observable outcome>` is
true.

## Current Evidence

- Source files reviewed:
- Tests reviewed:
- Docs reviewed:
- Stale or lower-authority docs:
- Unknowns:

## Owned Paths

- `packages/server/src/modules/...`
- `packages/server/test/...`
- `packages/web/src/...`
- `packages/miniapp/src/...`
- `packages/shared/src/...`
- `docs/project/...`

Only include paths that this plan owns. If the worktree has unrelated dirty
files, list them under "Do Not Touch".

## Do Not Touch

- unrelated dirty files:
- generated files:
- deployment or secret files:

## Steps

1. Confirm current behavior and the smallest safe change.
2. Update shared contracts first if required.
3. Update backend DTO/entity/service/controller/migration as needed.
4. Update web or miniapp API and UI flows as needed.
5. Add or update targeted tests.
6. Run the verification commands listed below.
7. Update docs or memory only for durable project facts.

Remove steps that are not relevant; do not leave this as a generic checklist.

## Verification

Run from repository root. Select the relevant subset:

```powershell
pnpm --filter @crm/shared exec tsc -p tsconfig.json --noEmit
pnpm --filter @crm/server exec tsc -p tsconfig.json --noEmit
pnpm --filter @crm/server test -- --runInBand
pnpm --filter @crm/web type-check
pnpm --filter @crm/web test
pnpm --filter @crm/miniapp type-check
pnpm --filter @crm/miniapp test
```

Manual or E2E check:

```text
Role:
Entry:
Steps:
Expected:
```

## Rollback Or Containment

- Code containment:
- Migration rollback or forward-fix:
- Feature flag or config fallback:
- Docs/memory update if behavior remains unverified:
