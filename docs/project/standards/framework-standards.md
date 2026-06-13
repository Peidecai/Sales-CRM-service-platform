# Framework Standards

## NestJS Backend

- Follow module structure already used under `packages/server/src/modules`.
- Keep entity definitions, DTOs, service logic, and controllers separated.
- Use TypeORM repositories and query builders consistently with existing code.
- Use migrations for schema changes.
- Keep test doubles in line with `packages/server/test/test-utils.ts`.

## Vue Web

- Use Vue 3 `<script setup lang="ts">`.
- Use Pinia for state.
- Use Element Plus and existing components; do not introduce a new UI library.
- API modules should call the shared request wrapper.
- Route access should use route meta and shared role enums.

## Uni-App Miniapp

- Use `uni.request` through the local request wrapper.
- Preserve offline queue and cache behavior when touching mobile write flows.
- Use miniapp storage helpers rather than browser-only APIs.

## Testing

- Backend: Jest.
- Web: Vitest plus Vue type checking.
- Miniapp: Vitest / TypeScript checks.
- E2E: Playwright from repository root when release or end-to-end workflow
  confidence is required.
