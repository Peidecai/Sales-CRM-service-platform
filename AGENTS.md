# CRM Sales Platform Agent Guide

## Project Reality

This is a brownfield CRM sales platform monorepo. Treat source code, package
configuration, migrations, and fresh verification commands as higher authority
than stale prose documentation.

Primary packages:

- `packages/server` - NestJS 10 backend with TypeORM, MySQL, Redis, Bull, AI,
  audit, notification, and CRM business modules.
- `packages/web` - Vue 3 PC frontend with Vite, Element Plus, Pinia, and Vue
  Router.
- `packages/miniapp` - uni-app WeChat mini program / app frontend.
- `packages/shared` - shared enums, types, and utilities used by all packages.

Important existing docs:

- `README.md` - useful overview, but some testing counts and module status are
  stale.
- `CLAUDE.md` - useful global conventions, but some module paths are stale.
- `packages/*/CLAUDE.md` - package-level guidance.
- `packages/server/src/modules/*/CLAUDE.md` - module-level guidance where it
  exists. Only a subset of backend modules has module-level coverage.

## Operating Rules

- Default mode is `progressive`: start with bounded single-agent work, escalate
  planning rigor when risk or scope requires it.
- Do not treat template files under the local `docs/` template source as project
  truth. Project-owned governance lives under `docs/project/`.
- Do not modify generated or unrelated files unless required for the current
  task.
- Do not run repo lint scripts blindly for inspection because package lint
  scripts use `--fix` and can modify files.
- Prefer targeted type checks and tests before broader verification.
- Database structure changes must use TypeORM migrations. Do not rely on
  `synchronize`.
- For frontend and miniapp changes, use existing UI and API patterns. Do not
  introduce a new UI library.

## Protected Areas

Treat these as high-risk and require explicit planning before broad changes:

- authentication, JWT refresh, passive logout, and role guards
- audit logging and sensitive-data masking
- database migrations and production deployment files
- Redis cache invalidation and background queues
- AI integration, embeddings, vector storage, and provider configuration
- payment, contract, approval, and customer ownership flows
- generated files such as `components.d.ts`, build outputs, and coverage

## Verification Baseline

Run commands from the repository root unless a command says otherwise.

- Shared type check: `pnpm --filter @crm/shared exec tsc -p tsconfig.json --noEmit`
- Server type check: `pnpm --filter @crm/server exec tsc -p tsconfig.json --noEmit`
- Web type check: `pnpm --filter @crm/web type-check`
- Miniapp type check: `pnpm --filter @crm/miniapp type-check`
- Server tests: `pnpm --filter @crm/server test -- --runInBand`
- Web tests: `pnpm --filter @crm/web test`
- Miniapp tests: `pnpm --filter @crm/miniapp test`

Verification evidence must be fresh for the current task. Passing yesterday is
not enough for a delivery claim today.

## Delivery Language

Use these states precisely:

- `implemented` - code or docs were changed, but verification is incomplete.
- `verified` - relevant checks passed with fresh evidence.
- `reviewed` - code or docs were reviewed against project rules.
- `accepted` - the user or project owner accepted the result.
