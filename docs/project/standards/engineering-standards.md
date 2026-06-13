# Engineering Standards

## General

- Keep changes scoped to the requested task and affected modules.
- Prefer existing package and module patterns over new abstractions.
- Reuse `@crm/shared` types and enums where available.
- Do not expose secrets or sensitive fields in responses, logs, docs, or tests.
- Treat generated files as generated; only commit changes to them when the task
  explicitly requires regeneration.

## Backend

- Controllers adapt HTTP; services own business logic.
- DTOs should use `class-validator` decorators for request validation.
- Protected controllers should use JWT and role guards according to existing
  module practice.
- Write operations that should be audited must preserve audit behavior.
- Redis reads should degrade safely where the local Redis helper supports it.
- Database structure changes require migrations. Do not use TypeORM
  `synchronize`.

## Frontend

- API calls go through the local API layer and request wrapper.
- Permission-dependent UI should use shared role definitions and existing
  permission helpers.
- Keep operational pages compact, scan-friendly, and consistent with Element
  Plus patterns.

## Verification

- Run targeted checks first, then broaden based on risk.
- Do not use package lint scripts as read-only checks because they use `--fix`.
- Report skipped checks explicitly.
