# Delivery Contract

## Delivery States

- `implemented`: files were changed, but relevant verification is incomplete.
- `verified`: relevant checks passed with fresh evidence.
- `reviewed`: the result was reviewed against project rules and risk areas.
- `accepted`: the user or project owner accepted the result.

Do not claim `accepted` without user confirmation.

## Evidence Requirements

For code changes, include:

- changed paths
- verification commands and results
- any skipped checks and why
- known residual risks

For documentation changes, include:

- source facts used
- files created or updated
- areas intentionally left unknown

For release or deployment work, include:

- build output path
- deployment target
- smoke test evidence
- rollback notes where applicable

## Canonical Commands

Run from repository root unless noted.

```powershell
pnpm --filter @crm/shared exec tsc -p tsconfig.json --noEmit
pnpm --filter @crm/server exec tsc -p tsconfig.json --noEmit
pnpm --filter @crm/web type-check
pnpm --filter @crm/miniapp type-check
pnpm --filter @crm/server test -- --runInBand
pnpm --filter @crm/web test
pnpm --filter @crm/miniapp test
```

Avoid running `pnpm lint` as an inspection command because package lint scripts
use `--fix`.

## Template Rollout Output Contract

When changing the harness layer, report:

- selected profile and embedding strategy
- repo, project, and command roots
- created or updated files
- template source ownership decision
- verification commands and results
- files changed by verification commands
- unresolved questions
- next recommended action
