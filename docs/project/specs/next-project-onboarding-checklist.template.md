# CRM Next Session Onboarding Checklist Template

## Context

CRM package/module/thread being handed to the next session.

## Must Read First

- `AGENTS.md`
- `PROJECT_OPERATING_MODE.md`
- latest file under `docs/project/audits/`
- `docs/project/operations/testing.md`
- `docs/project/operations/delivery-contract.md`
- relevant package `CLAUDE.md`
- relevant module source and tests
- relevant handoff under `memory/session-handoffs/`, if any

## Current State

- Implemented:
- Verified:
- Reviewed:
- Accepted:
- Unverified:
- Unknown:

## Dirty Worktree Separation

- Files owned by this thread:
- Files to avoid:
- Generated files:
- Template/source docs:

## Next Safe Task

Smallest safe next slice, with owned paths and expected delivery state.

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

Keep only commands relevant to the thread.
