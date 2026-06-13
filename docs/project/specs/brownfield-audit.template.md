# CRM Brownfield Audit Template

## Date

Use current date in `YYYY-MM-DD`.

## Area

CRM area being audited, for example:

- `packages/server/src/modules/call-record`
- `packages/web/src/views/customer`
- `packages/miniapp/src/pages-sub/call`
- cross-package workflow: native outbound call transcription

## What Exists

- Source files:
- Tests:
- Migrations:
- API routes:
- UI routes/pages:
- Docs:

## What Is Verified

Record fresh evidence only:

```powershell
# Run from repository root unless noted
<command>
```

Examples:

- type-check passed
- targeted Jest/Vitest test passed
- manual workflow checked for Admin/Manager/Sales

## What Is Only Claimed

List facts that appear in README, CLAUDE docs, comments, or old plans but have
not been freshly verified.

## Risks

- dirty worktree overlap:
- migration/data risk:
- auth/RBAC/audit risk:
- frontend/backend contract risk:
- miniapp offline/runtime risk:
- external provider or env risk:
- generated file risk:

## Takeover Decision

- Allowed lanes:
- Blocked lanes:
- Reason:

## Recommended Next Slice

Smallest bounded task that can proceed safely. Include owned paths and
verification commands.
