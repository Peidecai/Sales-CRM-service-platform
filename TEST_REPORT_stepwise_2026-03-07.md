# CRM Sales Platform Stepwise Test Report (2026-03-07)

## Scope

This round executed and closed the following items:

1. Fix `follow-up` read authorization issue (high priority).
2. Add follow-up API boundary test cases.
3. Run full regression and build/deploy acceptance.
4. Update report and release-readiness conclusion.

## Summary

- `P1` authorization issue is fixed:
  - `SALES` can no longer read follow-ups of non-owned customers.
  - `SALES` can no longer create follow-ups for non-owned customers (fixed in previous step, re-verified).
- Follow-up module tests expanded and passing.
- Full backend/frontend tests, builds, and container deployment checks all passed.
- Health checks and end-to-end API smoke checks passed.

## Code Changes

### 1) Authorization fix in follow-up service

Updated:

- `packages/server/src/modules/follow-up/follow-up.service.ts`

Key change:

- Added `ensureCustomerAccessible(customerId, user)` and reused it in:
  - `create()`
  - `findByCustomer()`

Effect:

- When customer is missing or deleted -> `404 NotFound`.
- When user is `SALES` and customer is not owned by current user -> `403 Forbidden`.
- Read and write permissions now use the same ownership policy.

### 2) Follow-up test coverage extension

Updated:

- `packages/server/test/follow-up/follow-up.service.spec.ts`
- `packages/server/test/follow-up/follow-up.controller.spec.ts`

Added/covered cases:

- `sales + non-owned customer` read -> `403`.
- `admin/manager` read allowed -> `200`.
- Invalid customer id -> `404`.
- Deleted customer (query uses `deleted=false`) -> `404`.
- Empty paged result handling.
- Cache hit/miss paths.
- Query pagination passthrough in controller.

### 3) Frontend build typing stability

Updated:

- `packages/web/src/views/customer/detail.vue`
- `packages/web/src/composables/useNotification.spec.ts`
- `packages/web/src/directives/permission.spec.ts`

Purpose:

- Fix `ElTag` type mismatch in detail view.
- Fix test typing so `vue-tsc` passes during `pnpm --filter @crm/web build`.

## Verification Results

### A. Targeted follow-up tests

Command:

```bash
pnpm --filter @crm/server test --runInBand test/follow-up
```

Result:

- `2` suites passed
- `23` tests passed

### B. Backend full tests with coverage

Command:

```bash
pnpm --filter @crm/server test --coverage --runInBand
```

Result:

- `36` suites passed
- `340` tests passed

Coverage highlights:

- All files: `Stmts 98.96%`, `Branch 97.76%`, `Funcs 99.61%`, `Lines 98.87%`
- `modules/follow-up`:
  - `follow-up.controller.ts`: `96.42%` statements
  - `follow-up.service.ts`: `100%` statements

### C. Frontend tests and build

Commands:

```bash
pnpm --filter @crm/web test
pnpm --filter @crm/web build
```

Result:

- Web tests: `6` files passed, `71` tests passed
- Web build: passed

### D. One-command container rebuild and startup

Command:

```bash
set DB_PASSWORD=crm_password_123 && docker compose up -d --build server web
```

Result:

- `crm-server` healthy
- `crm-web` up
- `crm-mysql` healthy
- `crm-redis` healthy

### E. Health and E2E API smoke

Health endpoints:

- `GET /api/v1/health` -> `code=0`, `status=ok`
- `GET /api/v1/health/ready` -> `code=0`, `status=ok`

API chain checks passed:

- login
- create customer
- allocate customer
- follow-up create/list/update/delete
- permission checks:
  - `sales create follow-up on non-owned customer` -> `403`
  - `sales read follow-ups on non-owned customer` -> `403`
  - `admin read same customer follow-ups` -> `200`

## Release Readiness

Current status: **Ready for release** for the tested scope.

Reason:

- High-priority authorization gap is fixed and regression-tested.
- Follow-up module now has practical controller/service coverage.
- Backend + frontend test/build + dockerized deployment + API smoke are all green.
