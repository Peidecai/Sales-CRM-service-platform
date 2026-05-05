# Testing

## Verified Baseline

As of 2026-04-30 during takeover, the following commands were run from the
repository root:

```powershell
pnpm --filter @crm/shared exec tsc -p tsconfig.json --noEmit
pnpm --filter @crm/server exec tsc -p tsconfig.json --noEmit
pnpm --filter @crm/web type-check
pnpm --filter @crm/miniapp type-check
pnpm --filter @crm/web test
pnpm --filter @crm/miniapp test
```

The initial server test baseline had two stale expectation failures in audit-log
and forum sorting tests. Those expectations were updated during takeover, and
the server Jest suite passed afterward: 97 suites, 1183 tests.

## Type Checks

These are read-only checks for normal use.

**Run From:** repository root

```powershell
pnpm --filter @crm/shared exec tsc -p tsconfig.json --noEmit
pnpm --filter @crm/server exec tsc -p tsconfig.json --noEmit
pnpm --filter @crm/web type-check
pnpm --filter @crm/miniapp type-check
```

## Unit Tests

These should be read-only for source files. Some tests intentionally write temp
files or local caches outside source paths.

**Run From:** repository root

```powershell
pnpm --filter @crm/server test -- --runInBand
pnpm --filter @crm/web test
pnpm --filter @crm/miniapp test
```

## E2E Tests

**Run From:** repository root

```powershell
pnpm test:e2e
```

E2E coverage was not part of the initial takeover verification and should be run
before release claims or broad workflow acceptance.

## Lint Caveat

## Mutating Checks

These commands may modify files and should not be used as read-only inspection:

**Run From:** repository root

```powershell
pnpm lint
pnpm --filter @crm/server lint
pnpm --filter @crm/web lint
```

Package lint scripts use `--fix`, so they may edit files. Use them only when
automatic formatting/fixing is intended.

## Generated Files

Known generated or tool-managed paths include:

- `packages/web/src/components.d.ts`
- package `dist/` directories
- coverage directories
- Playwright reports and `test-results/`
- TypeScript `*.tsbuildinfo`
- server vector data under `packages/server/data/`

If a verification command modifies generated files, review the diff before
including it in a commit.
