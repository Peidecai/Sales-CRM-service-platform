# Module Boundaries

## Monorepo Packages

- `@crm/shared`: shared enums, types, and utilities. Other packages should reuse
  shared definitions instead of duplicating them.
- `@crm/server`: NestJS backend. Keep HTTP adaptation in controllers, business
  logic in services, validation in DTOs, and persistence in entities/repositories.
- `@crm/web`: Vue 3 PC frontend. API calls go through `src/api/request.ts`.
- `@crm/miniapp`: uni-app mobile client. API calls go through the uni request
  wrapper, not axios.

## Backend Modules

Backend modules live under `packages/server/src/modules/`. The codebase contains
many modules; only a subset has module-level `CLAUDE.md` documentation. Before
editing a module, inspect its controller, service, entity, DTOs, tests, and
imports.

## Contract Rules

- Public API changes usually require coordinated server/client updates.
- Role checks should use shared `UserRole` definitions where available.
- DTO validation should use `class-validator`.
- Database changes require migrations.
- Cache writes must invalidate relevant Redis keys.

## Known Documentation Gaps

- Root module index in `CLAUDE.md` uses stale `server/src/...` paths for module
  docs. The real path is `packages/server/src/...`.
- README test counts are stale. Use current test command output.
