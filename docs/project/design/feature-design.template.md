# CRM Feature Design Template

## Feature

`<CRM workflow or module> - <user-facing outcome>`

## Users And Jobs

- Admin:
- Manager:
- Sales:
- Miniapp/mobile user:
- Background/system actor:

Remove actors that are not affected.

## Current Flow

Describe how the CRM works today, with evidence from:

- web route/view/component
- miniapp page/store/API
- backend controller/service/entity/DTO
- shared enum/type
- current tests
- screenshots or manual reproduction if applicable

## Proposed Flow

Describe the target user journey. Keep CRM interfaces operational and
scan-friendly:

- no marketing page for internal workflows
- role-aware controls
- clear status and validation feedback
- efficient repeated actions
- mobile flows optimized for short field-sales interactions

## UI States

- Empty:
- Loading:
- Error:
- Permission denied:
- Validation failed:
- Success:
- Offline or retry state, if miniapp:

## API / Data Dependencies

- backend endpoint:
- DTO/entity:
- shared type/enum:
- web API/store:
- miniapp API/store:
- migration:
- cache/queue/audit:

## Acceptance Criteria

- user-visible outcome:
- role/permission behavior:
- data persistence:
- audit/cache behavior:
- mobile/offline behavior:
- AI/provider behavior, if applicable:

## Verification

Run from repository root as relevant:

```powershell
pnpm --filter @crm/server test -- --runInBand
pnpm --filter @crm/web type-check
pnpm --filter @crm/web test
pnpm --filter @crm/miniapp type-check
pnpm --filter @crm/miniapp test
```

Manual scenario:

```text
Role:
Entry:
Steps:
Expected:
```
