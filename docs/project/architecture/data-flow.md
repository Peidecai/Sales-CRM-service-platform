# Data Flow

## Primary Inputs

- Web frontend requests from `packages/web` through the axios request wrapper.
- Miniapp requests from `packages/miniapp` through the uni-app request wrapper.
- Authenticated CRM user actions for customers, opportunities, calls, records,
  follow-ups, reports, notifications, and admin workflows.
- MySQL data persisted through TypeORM entities and repositories.
- Redis data for cache, queue, blacklist, and realtime support paths.
- AI provider inputs such as call notes, knowledge articles, and analysis
  prompts when provider keys are configured.

## Primary Transformations

- NestJS controllers adapt HTTP requests to DTOs and service calls.
- Services perform CRM business logic, permission-sensitive operations, cache
  invalidation, audit logging, and background job dispatch.
- TypeORM maps entity properties to database tables and columns.
- Bull processors handle background work such as AI summaries and embeddings.
- Frontend stores and views transform API responses into role-aware UI state.
- Miniapp utilities add cache, offline queue, and mobile runtime behavior.

## Primary Outputs

- JSON API responses in the project response envelope.
- MySQL rows for CRM business entities and audit logs.
- Redis cache entries and queued jobs.
- Web UI and miniapp screens.
- AI summaries, embeddings, reports, and analysis artifacts where configured.
- Deployment build outputs under package-specific `dist` directories.

## Side Effects And Boundaries

- Write operations may need audit logs and cache invalidation.
- Database schema changes require migrations.
- AI and telephony behavior may depend on environment variables and external
  provider availability.
- Miniapp offline queue behavior can delay or retry writes.

## Unknowns

- Production data flow and external provider topology are not freshly verified.
- E2E coverage of the complete web/backend/miniapp data flow is not freshly
  verified in this takeover layer.
