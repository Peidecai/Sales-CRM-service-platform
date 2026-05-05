# Release Operations

## Current Status

Release flow has not been freshly verified during takeover. Treat deployment
docs as useful references, not proof that production release is currently safe.

## Known Release Inputs

- Root Docker Compose files.
- `deploy/` documentation and templates.
- `PRODUCTION-DEPLOYMENT.md`.
- Package build scripts in `package.json`.

## Pre-Release Verification

Run from repository root unless a package command states otherwise:

```powershell
pnpm --filter @crm/shared exec tsc -p tsconfig.json --noEmit
pnpm --filter @crm/server exec tsc -p tsconfig.json --noEmit
pnpm --filter @crm/web type-check
pnpm --filter @crm/miniapp type-check
pnpm --filter @crm/server test -- --runInBand
pnpm --filter @crm/web test
pnpm --filter @crm/miniapp test
pnpm build
```

E2E and smoke checks should be added based on the release target.

## Release Claim Rule

Do not claim a release is ready unless build output, environment assumptions,
database migration status, and smoke evidence are all fresh and recorded.
