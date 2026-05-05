# CRM Repo State Audit Template

## Date

Use current date in `YYYY-MM-DD`.

## Scope

Repo, branch, package, module, or active thread being audited.

## Roots

- Git repo root: `D:/Develop/Sales CRM service platform/crm-sales-platform`
- Project root: `D:/Develop/Sales CRM service platform/crm-sales-platform`
- Command root: repository root for workspace commands; package root for
  package-local commands

## Git State

```powershell
git branch --show-current
git status --short --untracked-files=all
```

Record:

- Branch:
- Modified files:
- Deleted files:
- Untracked files:
- Nested repositories or template sources:
- Files that appear unrelated to this audit:

## Template Source Ownership

- Project docs: `docs/project/**`
- External template source: ignored `docs/superpowers/**`,
  `docs/codex-skills/**`, and `docs/.git.local-template-source/**`
- Strategy: `control-only`

## Verified Commands

Run only commands relevant to the audit. Avoid mutating lint commands unless
intended.

```powershell
pnpm --filter @crm/shared exec tsc -p tsconfig.json --noEmit
pnpm --filter @crm/server exec tsc -p tsconfig.json --noEmit
pnpm --filter @crm/server test -- --runInBand
pnpm --filter @crm/web type-check
pnpm --filter @crm/web test
pnpm --filter @crm/miniapp type-check
pnpm --filter @crm/miniapp test
```

## Findings

- Verified:
- Unverified:
- Unknown:
- Stale docs:
- Protected areas:

## Next Safe Action

Smallest action that can proceed without touching unrelated dirty files.
